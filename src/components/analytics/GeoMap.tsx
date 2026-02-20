import { useEffect } from 'react';
import { MapContainer, TileLayer, Popup, useMap, Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix missing default marker icon in Leaflet + Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import type { GeoStats } from '@/hooks/useAnalytics';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Controller to fly to clicked city from the table
function MapController({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 12, { animate: true, duration: 1.5 });
        }
    }, [center, map]);
    return null;
}

export function GeoMap({
    heatmapData,
    selectedLocation
}: {
    // heatmapData is now a list of raw order points [lat, lng, weight]
    heatmapData: Array<[number, number, number]>,
    topCities?: GeoStats[],
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
                maxZoom={18}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

                {/* Marker Clustering Replaces the Heatmap */}
                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={40}
                    spiderfyOnMaxZoom={true}
                >
                    {heatmapData.map((pt, i) => (
                        <Marker key={i} position={[pt[0], pt[1]]}>
                            <Popup className="text-xs text-center min-w-[100px]">
                                <strong>1 Pedido</strong><br />
                                <span className="text-muted-foreground">Ubicación aproximada</span>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>

                <MapController center={selectedLocation} />
            </MapContainer>
        </div>
    );
}
