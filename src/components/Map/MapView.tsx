"use client";

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import useSupercluster from 'use-supercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix for default marker icons in Next.js
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapPoint {
    id: string;
    lat: number;
    lng: number;
    name: string;
    kind: 'unit' | 'asset' | 'suggested' | 'selected' | 'ibge' | 'competitor' | 'poi';
    address?: string;
    intensity?: number;
    meta?: any;
}

interface MapViewProps {
    points: MapPoint[];
    center?: [number, number];
    zoom?: number;
    activePointId?: string;
    radiusKm?: number;
    centerOnPoints?: boolean;
    onPointClick?: (point: MapPoint) => void;
}

function FitBounds({ points }: { points: MapPoint[] }) {
    const map = useMap();
    useEffect(() => {
        const validPoints = points.filter(p => 
            p.lat != null && 
            p.lng != null && 
            !isNaN(Number(p.lat)) && 
            !isNaN(Number(p.lng)) &&
            p.lat !== 0 && 
            p.lng !== 0 &&
            Math.abs(p.lat) <= 90 &&
            Math.abs(p.lng) <= 180
        );

        if (validPoints.length > 0) {
            try {
                const bounds = L.latLngBounds(validPoints.map(p => [Number(p.lat), Number(p.lng)]));
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
                }
            } catch (e) {
                console.error("[FitBounds] Erro ao calcular bounds:", e);
            }
        } else {
            // Brazil center as fallback when no points
            map.setView([-15.7801, -47.9292], 4, { animate: false });
        }
    }, [points, map]);
    return null;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        if (center && !isNaN(center[0]) && !isNaN(center[1]) && Math.abs(center[0]) <= 90 && Math.abs(center[1]) <= 180) {
            map.setView(center, zoom, { animate: true });
        }
    }, [center, zoom, map]);
    return null;
}

function HeatmapLayer({ points }: { points: MapPoint[] }) {
    const map = useMap();
    useEffect(() => {
        if (!points || points.length === 0) return;
        
        // @ts-ignore - leaflet.heat is not in global types
        if (!L.heatLayer) return;

        const heatData = points.map(p => [p.lat, p.lng, p.intensity || 0.5]);
        // @ts-ignore
        const heatLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
        }).addTo(map);

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [points, map]);
    return null;
}

function ClusterGroup({ points, iconRenderer, popupRenderer, onPointClick }: any) {
    const map = useMap();
    const [bounds, setBounds] = useState<any>(null);
    const [zoom, setZoom] = useState<number>(map.getZoom());

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const updateState = () => {
            if (!map) return;
            
            try {
                // Ensure map is actually attached to a container and ready
                const container = map.getContainer();
                if (!container || !container.offsetHeight) return;

                const b = map.getBounds();
                if (b) {
                    setBounds([b.getSouthWest().lng, b.getSouthWest().lat, b.getNorthEast().lng, b.getNorthEast().lat]);
                }
                setZoom(map.getZoom());
            } catch (e) {
                console.warn("[ClusterGroup] Failed to get map bounds, likely not ready yet:", e);
            }
        };

        // Timeout to ensure Leaflet has fully initialized its container size
        timeoutId = setTimeout(updateState, 50);

        map.on('moveend', updateState);
        map.on('zoomend', updateState);
        return () => {
            clearTimeout(timeoutId);
            map.off('moveend', updateState);
            map.off('zoomend', updateState);
        }
    }, [map]);

    const geoPoints = points.map((p: any) => ({
        type: 'Feature',
        properties: { cluster: false, point: p },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
    }));

    const { clusters, supercluster } = useSupercluster({
        points: geoPoints,
        bounds,
        zoom,
        options: { radius: 75, maxZoom: 20 }
    });

    if (!bounds) return null;

    return (
        <>
            {clusters.map((cluster: any) => {
                const [lng, lat] = cluster.geometry.coordinates;
                const { cluster: isCluster, point_count: pointCount, point } = cluster.properties;

                if (isCluster) {
                    const size = 30 + Math.min((pointCount / points.length) * 30, 30);

                    const clusterIcon = L.divIcon({
                        // Using a simple HTML structure string mapped to L.divIcon
                        html: `<div style="background-color: #3b82f6; color: white; border-radius: 50%; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);">${pointCount}</div>`,
                        className: 'cluster-icon',
                        iconSize: [size, size],
                        iconAnchor: [size / 2, size / 2]
                    });

                    return (
                        <Marker
                            key={`cluster-${cluster.id}`}
                            position={[lat, lng]}
                            icon={clusterIcon}
                            eventHandlers={{
                                click: () => {
                                    const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(cluster.id), 20);
                                    map.setView([lat, lng], expansionZoom, { animate: true });
                                }
                            }}
                        />
                    );
                }

                return (
                    <Marker
                        key={point.id}
                        position={[lat, lng]}
                        icon={iconRenderer(point)}
                        eventHandlers={{ click: () => onPointClick && onPointClick(point) }}
                    >
                        <Popup>{popupRenderer(point)}</Popup>
                    </Marker>
                );
            })}
        </>
    );
}

function ResizeListener() {
    const map = useMap();
    useEffect(() => {
        // Immediate + delayed invalidateSize to handle CSS transitions / flex layout
        const invalidate = () => map.invalidateSize({ pan: false });
        invalidate();
        const t1 = setTimeout(invalidate, 100);
        const t2 = setTimeout(invalidate, 350);
        const t3 = setTimeout(invalidate, 700);

        const container = map.getContainer();
        const ro = new ResizeObserver(invalidate);
        ro.observe(container);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            ro.unobserve(container);
            ro.disconnect();
        };
    }, [map]);
    return null;
}

export default function MapView({
    points,
    center = [-15.7801, -47.9292],
    zoom = 5,
    activePointId,
    radiusKm,
    centerOnPoints = true,
    onPointClick
}: MapViewProps) {
    const mapRef = useRef<L.Map | null>(null);

    const getIcon = (kind: string, isActive: boolean) => {
        let color = '#3b82f6';
        let size = 12;
        if (kind === 'unit') { color = '#0f172a'; size = 14; }
        if (kind === 'asset') color = '#94a3b8';
        if (kind === 'suggested') color = '#f59e0b';
        if (kind === 'selected') color = '#10b981';
        if (kind === 'poi') color = '#0d9488';
        if (kind === 'dominance') { color = '#6366f1'; size = 16; }
        if (kind === 'competitor') { color = '#ef4444'; size = 16; }

        return L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); ${isActive ? 'transform: scale(1.5); border-color: #3b82f6;' : ''}"></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
        });
    };

    const formatPrice = (price: number | undefined) => {
        if (!price) return '—';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
    };

    const renderPopupContent = (point: MapPoint) => {
        const meta = point.meta || {};
        return (
            <div className="p-1 min-w-[200px]">
                <p className="font-bold text-slate-900 text-sm">{point.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{point.address}</p>

                {(meta.type || meta.vendor_name || meta.base_price || meta.distance_km != null || meta.status) && (
                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-xs">
                        {meta.type && (
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-semibold">Tipo</span>
                                <span className="font-bold text-slate-700">{meta.type}</span>
                            </div>
                        )}
                        {meta.vendor_name && (
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-semibold">Fornecedor</span>
                                <span className="font-bold text-slate-700">{meta.vendor_name}</span>
                            </div>
                        )}
                        {(meta.base_price > 0 || meta.unit_price > 0) && (
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-semibold">Preço</span>
                                <span className="font-black text-emerald-600">{formatPrice(meta.unit_price || meta.base_price)}</span>
                            </div>
                        )}
                        {meta.distance_km != null && (
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-semibold">Distância</span>
                                <span className="font-bold text-slate-700">{meta.distance_km.toFixed(1)} km</span>
                            </div>
                        )}
                        {meta.status && (
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-semibold">Status</span>
                                <span className="font-bold text-primary-600 uppercase text-[10px]">{meta.status}</span>
                            </div>
                        )}
                    </div>
                )}

                {point.kind === 'unit' && radiusKm && (
                    <div className="mt-2 pt-2 border-t border-slate-100 italic text-[10px] text-primary-600 font-bold">
                        Raio de influência: {radiusKm}km
                    </div>
                )}
            </div>
        );
    };

    const unitPoints = points.filter(p => p.kind === 'unit');
    const assetPoints = points.filter(p => p.kind === 'asset');
    const suggestedPoints = points.filter(p => p.kind === 'suggested');
    const selectedPoints = points.filter(p => p.kind === 'selected');
    const poiPoints = points.filter(p => p.kind === 'poi');
    const ibgePoints = points.filter(p => p.kind === 'ibge');
    const competitorPoints = points.filter(p => p.kind === 'competitor');

    const renderMarkers = (pts: MapPoint[]) => pts.map((point) => (
        <Marker
            key={point.id}
            position={[point.lat, point.lng]}
            icon={getIcon(point.kind, point.id === activePointId)}
            eventHandlers={{
                click: () => onPointClick && onPointClick(point)
            }}
        >
            <Popup>{renderPopupContent(point)}</Popup>
        </Marker>
    ));

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
            <MapContainer
                center={center}
                zoom={zoom}
                minZoom={3}
                maxBoundsViscosity={1.0}
                worldCopyJump={false}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
                ref={mapRef}
                whenReady={() => {
                    // whenReady fires after the map is fully initialized
                    // but we still need to wait one tick for CSS to settle
                    setTimeout(() => mapRef.current?.invalidateSize({ pan: false }), 0);
                    setTimeout(() => mapRef.current?.invalidateSize({ pan: false }), 200);
                }}
            >
                <ChangeView center={center} zoom={zoom} />
                <ResizeListener />
                {centerOnPoints && <FitBounds points={points.filter(p => p.kind !== 'ibge' && p.kind !== 'competitor')} />}

                <HeatmapLayer points={ibgePoints} />

                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="OpenStreetMap">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            noWrap={true}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Google Maps (Padrão)">
                        <TileLayer
                            attribution='&copy; Google Maps'
                            url="https://mt1.google.com/vt/lyrs=m&hl=pt-BR&x={x}&y={y}&z={z}"
                            noWrap={true}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Google Maps (Satélite)">
                        <TileLayer
                            attribution='&copy; Google Maps'
                            url="https://mt1.google.com/vt/lyrs=s&hl=pt-BR&x={x}&y={y}&z={z}"
                            noWrap={true}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.Overlay checked name="🏫 Unidades Escolares">
                        <>{unitPoints.map(point => (
                            <Marker
                                key={point.id}
                                position={[point.lat, point.lng]}
                                icon={getIcon(point.kind, point.id === activePointId)}
                                eventHandlers={{ click: () => onPointClick && onPointClick(point) }}
                            >
                                <Popup>{renderPopupContent(point)}</Popup>
                            </Marker>
                        ))}</>
                    </LayersControl.Overlay>

                    <LayersControl.Overlay checked name="📍 Inventário Geral">
                        <ClusterGroup
                            points={assetPoints}
                            iconRenderer={(p: any) => getIcon(p.kind, p.id === activePointId)}
                            popupRenderer={renderPopupContent}
                            onPointClick={onPointClick}
                        />
                    </LayersControl.Overlay>

                    <LayersControl.Overlay checked name="🎯 Hotspots de Ativação">
                        <ClusterGroup
                            points={poiPoints}
                            iconRenderer={(p: any) => getIcon(p.kind, p.id === activePointId)}
                            popupRenderer={renderPopupContent}
                            onPointClick={onPointClick}
                        />
                    </LayersControl.Overlay>

                    <LayersControl.Overlay checked name="💡 Sugestão da IA">
                        <ClusterGroup
                            points={suggestedPoints}
                            iconRenderer={(p: any) => getIcon(p.kind, p.id === activePointId)}
                            popupRenderer={renderPopupContent}
                            onPointClick={onPointClick}
                        />
                    </LayersControl.Overlay>

                    <LayersControl.Overlay checked name="✅ Selecionados">
                        <ClusterGroup
                            points={selectedPoints}
                            iconRenderer={(p: any) => getIcon(p.kind, p.id === activePointId)}
                            popupRenderer={renderPopupContent}
                            onPointClick={onPointClick}
                        />
                    </LayersControl.Overlay>

                    <LayersControl.Overlay checked name="🚩 Concorrentes">
                        <>{competitorPoints.map(point => (
                            <Marker
                                key={point.id}
                                position={[point.lat, point.lng]}
                                icon={getIcon(point.kind, point.id === activePointId)}
                                eventHandlers={{ click: () => onPointClick && onPointClick(point) }}
                            >
                                <Popup>{renderPopupContent(point)}</Popup>
                            </Marker>
                        ))}</>
                    </LayersControl.Overlay>
                </LayersControl>

                {/* Radius circles for units */}
                {unitPoints.map(unit => radiusKm && (
                    <Circle
                        key={`radius-${unit.id}`}
                        center={[unit.lat, unit.lng]}
                        radius={radiusKm * 1000}
                        pathOptions={{
                            color: '#3b82f6',
                            fillColor: '#3b82f6',
                            fillOpacity: 0.05,
                            weight: 1,
                            dashArray: '5, 10'
                        }}
                    />
                ))}
            </MapContainer>
        </div>
    );
}
