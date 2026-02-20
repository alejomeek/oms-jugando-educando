import { useEffect } from 'react';
import { MapContainer, TileLayer, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

import type { GeoStats } from '@/hooks/useAnalytics';

// Heatmap Layer component
function HeatmapLayer({ points }: { points: Array<[number, number, number]> }) {
    const map = useMap();

    useEffect(() => {
        if (!map || points.length === 0) return;

        // We cast to any because leaflet.heat extends L globally but TS might complain depending on versions
        const heat = (L as any).heatLayer(points, {
            radius: 20,
            blur: 15,
            maxZoom: 12,
            minOpacity: 0.3,
            gradient: {
                0.4: 'rgb(59, 130, 246)', // blue-500
                0.6: 'cyan',
                0.7: 'lime',
                0.8: 'yellow',
                1.0: 'red'
            }
        }).addTo(map);

        return () => {
            map.removeLayer(heat);
        };
    }, [map, points]);

    return null;
}

// Controller to fly to clicked city
function MapController({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 11, { animate: true, duration: 1 });
        }
    }, [center, map]);
    return null;
}

export function GeoMap({
    heatmapData,
    topCities,
    selectedLocation
}: {
    heatmapData: Array<[number, number, number]>,
    topCities: GeoStats[],
    selectedLocation: [number, number] | null
}) {
    const defaultCenter: [number, number] = [4.5709, -74.2973]; // Centro de Colombia aproximado
    const defaultZoom = 5;

    return (
        <div className="h-full min-h-[400px] w-full z-0 relative rounded-md overflow-hidden bg-muted/20">
            <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {heatmapData.length > 0 && <HeatmapLayer points={heatmapData} />}

                {/* Usamos CircleMarker en lugar de Marker normal para evitar problemas de íconos rotos */}
                {topCities.map(city => city.lat && city.lng ? (
                    <CircleMarker
                        key={city.city}
                        center={[city.lat, city.lng]}
                        radius={6}
                        pathOptions={{ color: 'transparent', fillColor: 'transparent' }}
                    >
                        <Popup className="rounded-lg shadow-md border-0">
                            <div className="text-center min-w-[120px]">
                                <strong className="block text-sm overflow-hidden text-ellipsis">{city.city}</strong>
                                <span className="text-muted-foreground text-xs">{city.state}</span>
                                <div className="my-2 border-t" />
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="block text-muted-foreground">Pedidos</span>
                                        <strong className="text-primary">{city.orderCount}</strong>
                                    </div>
                                    <div>
                                        <span className="block text-muted-foreground">Ingresos</span>
                                        <strong className="text-primary">${(city.revenue / 1000).toFixed(0)}k</strong>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ) : null)}

                <MapController center={selectedLocation} />
            </MapContainer>
        </div>
    );
}
