import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatCurrency } from '@/lib/formatters';

export interface MLCityData {
  city: string;
  state: string;
  lat: number;
  lng: number;
  orderCount: number;
  revenue: number;
  avgTicket: number;
  topProducts: Array<{ title: string; qty: number }>;
}

// ── CSS for pulsing rings ─────────────────────────────────────────────────────

const PULSE_CSS_ID = 'ml-revenue-map-css';
const PULSE_CSS = `
@keyframes ml-ring {
  0%   { transform: scale(1); opacity: 0.75; }
  100% { transform: scale(2.1); opacity: 0; }
}
.ml-ring-1 { animation: ml-ring 2.6s ease-out infinite;       transform-origin: center; }
.ml-ring-2 { animation: ml-ring 2.6s ease-out infinite 0.87s; transform-origin: center; }
.ml-ring-3 { animation: ml-ring 2.6s ease-out infinite 1.73s; transform-origin: center; }
`;

// ── Color & size helpers ──────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function revenueToColor(revenue: number, min: number, max: number): string {
  if (max <= min) return '#FFD600';
  const t = Math.min(1, Math.max(0, (revenue - min) / (max - min)));
  // pale yellow → ML yellow → deep orange
  const stops = [
    [255, 249, 196],
    [255, 214, 0],
    [255, 109, 0],
  ];
  const seg = t < 0.5 ? 0 : 1;
  const st = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const r = Math.round(lerp(stops[seg][0], stops[seg + 1][0], st));
  const g = Math.round(lerp(stops[seg][1], stops[seg + 1][1], st));
  const b = Math.round(lerp(stops[seg][2], stops[seg + 1][2], st));
  return `rgb(${r},${g},${b})`;
}

function orderRadius(count: number, max: number): number {
  return 8 + 32 * Math.sqrt(count / Math.max(1, max));
}

// ── Pulsing rings layer (drawn below circle markers via custom pane) ───────────

function PulseLayer({ cities }: { cities: MLCityData[] }) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!document.getElementById(PULSE_CSS_ID)) {
      const el = document.createElement('style');
      el.id = PULSE_CSS_ID;
      el.textContent = PULSE_CSS;
      document.head.appendChild(el);
    }

    // Custom pane below overlay pane (z=400) so circles render on top
    if (!map.getPane('ml-pulse-pane')) {
      const pane = map.createPane('ml-pulse-pane');
      pane.style.zIndex = '350';
      pane.style.pointerEvents = 'none';
    }

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Show pulsing rings for top 5 cities by revenue
    cities.slice(0, 5).forEach(city => {
      const W = 100;  // container px (must fit animated ring at 2.1× scale)
      const S = 44;   // ring diameter px
      const off = (W - S) / 2;

      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:${W}px;height:${W}px;">
          <div class="ml-ring-1" style="position:absolute;top:${off}px;left:${off}px;width:${S}px;height:${S}px;border-radius:50%;border:2.5px solid #FFD600;box-sizing:border-box;"></div>
          <div class="ml-ring-2" style="position:absolute;top:${off}px;left:${off}px;width:${S}px;height:${S}px;border-radius:50%;border:2px solid #FFD600;box-sizing:border-box;"></div>
          <div class="ml-ring-3" style="position:absolute;top:${off}px;left:${off}px;width:${S}px;height:${S}px;border-radius:50%;border:1.5px solid #FFEA00;box-sizing:border-box;"></div>
        </div>`,
        iconSize: [W, W],
        iconAnchor: [W / 2, W / 2],
      });

      const m = L.marker([city.lat, city.lng], {
        icon,
        interactive: false,
        keyboard: false,
        pane: 'ml-pulse-pane',
      }).addTo(map);

      markersRef.current.push(m);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [map, cities]);

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function MLRevenueMap({ cities }: { cities: MLCityData[] }) {
  if (cities.length === 0) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-md bg-muted/20 text-sm text-muted-foreground">
        Sin datos geográficos de Mercado Libre para este período
      </div>
    );
  }

  const sorted = [...cities].sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = sorted[0].revenue;
  const minRevenue = sorted[sorted.length - 1].revenue;
  const maxOrders = Math.max(...cities.map(c => c.orderCount));
  const totalOrders = cities.reduce((s, c) => s + c.orderCount, 0);

  const center: [number, number] = [4.5709, -74.2973];

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-md">
      {/* Stats badge ─────────────────────────────────────────────────────── */}
      <div
        className="absolute left-3 top-3 z-[1000] space-y-0.5 rounded-md px-3 py-2 text-xs text-white"
        style={{
          background: 'rgba(8,8,8,0.78)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,214,0,0.3)',
        }}
      >
        <p className="font-semibold" style={{ color: '#FFD600' }}>
          Mercado Libre
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>
          {cities.length} ciudades · {totalOrders} pedidos
        </p>
      </div>

      {/* Color + size legend ─────────────────────────────────────────────── */}
      <div
        className="absolute bottom-8 right-3 z-[1000] rounded-md px-3 py-2 text-[10px] text-white"
        style={{
          background: 'rgba(8,8,8,0.78)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <p className="mb-1 font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Ingresos
        </p>
        <div
          className="h-2 w-20 rounded-sm"
          style={{ background: 'linear-gradient(to right, #FFF9C4, #FFD600, #FF6D00)' }}
        />
        <div className="mt-0.5 flex justify-between" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <span>menor</span>
          <span>mayor</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
          <svg width="22" height="12" viewBox="0 0 22 12">
            <circle cx="4" cy="6" r="3.5" fill="rgba(255,255,255,0.35)" />
            <circle cx="16" cy="6" r="5.5" fill="rgba(255,255,255,0.35)" />
          </svg>
          <span>= pedidos</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
          <div className="h-3 w-3 rounded-full" style={{ border: '1.5px solid #FFD600' }} />
          <span>= top 5 ingresos</span>
        </div>
      </div>

      {/* Map ─────────────────────────────────────────────────────────────── */}
      <MapContainer
        center={center}
        zoom={5}
        style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }}
        maxZoom={14}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Pulse rings behind the circles */}
        <PulseLayer cities={sorted} />

        {/* Revenue bubbles */}
        {sorted.map((city, i) => {
          const color = revenueToColor(city.revenue, minRevenue, maxRevenue);
          const radius = orderRadius(city.orderCount, maxOrders);

          return (
            <CircleMarker
              key={i}
              center={[city.lat, city.lng]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.88,
                color: 'rgba(0,0,0,0.55)',
                weight: 1.2,
              }}
            >
              <Popup maxWidth={230} className="ml-revenue-popup">
                <div style={{ minWidth: 190, fontFamily: 'inherit', fontSize: 13 }}>
                  {/* City header */}
                  <div
                    style={{
                      borderBottom: '2px solid #FFD600',
                      paddingBottom: 6,
                      marginBottom: 8,
                    }}
                  >
                    <strong style={{ fontSize: 15 }}>{city.city}</strong>
                    <br />
                    <span style={{ fontSize: 11, color: '#888' }}>{city.state}</span>
                  </div>

                  {/* Stats grid */}
                  <table
                    style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}
                  >
                    <tbody>
                      <tr>
                        <td style={{ color: '#888', paddingBottom: 3 }}>Pedidos</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {city.orderCount}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: '#888', paddingBottom: 3 }}>Ingresos</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatCurrency(city.revenue, 'COP')}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: '#888' }}>Ticket prom.</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          {formatCurrency(city.avgTicket, 'COP')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Top products */}
                  {city.topProducts.length > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        borderTop: '1px solid #eee',
                        paddingTop: 6,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#aaa',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: 4,
                        }}
                      >
                        Top productos
                      </p>
                      {city.topProducts.map((p, j) => (
                        <div
                          key={j}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: 11,
                            marginBottom: 3,
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              color: '#555',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 150,
                            }}
                          >
                            {p.title}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              flexShrink: 0,
                              color: '#333',
                            }}
                          >
                            ×{p.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
