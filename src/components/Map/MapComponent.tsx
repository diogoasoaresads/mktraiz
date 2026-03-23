"use client";

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Unit {
    id: string;
    unit_name: string;
    brand_name: string;
    lat: number;
    lng: number;
    address_raw: string;
    city: string;
    state: string;
}

interface InventoryItem {
    id: string;
    type: string;
    vendor_name: string;
    lat: number;
    lng: number;
    address_raw: string;
    base_price?: number;
}

interface MapComponentProps {
    units: Unit[];
    inventory?: InventoryItem[];
    center?: [number, number];
}

export default function MapComponent({ units, inventory = [], center = [-22.9068, -43.1729] }: MapComponentProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMap = useRef<L.Map | null>(null);
    const unitsLayer = useRef<L.LayerGroup | null>(null);
    const inventoryLayer = useRef<L.LayerGroup | null>(null);

    useEffect(() => {
        if (!mapRef.current || leafletMap.current) return;

        // Initialize Map
        leafletMap.current = L.map(mapRef.current, {
            center: center,
            zoom: 12,
            zoomControl: false
        });

        // Add Tile Layer - Google Maps
        L.tileLayer('https://mt1.google.com/vt/lyrs=m&hl=pt-BR&x={x}&y={y}&z={z}', {
            attribution: '&copy; Google Maps'
        }).addTo(leafletMap.current);

        // Add Zoom Control
        L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current);

        // Add Layer Groups
        unitsLayer.current = L.layerGroup().addTo(leafletMap.current);
        inventoryLayer.current = L.layerGroup().addTo(leafletMap.current);

        // Fix Icons
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        return () => {
            if (leafletMap.current) {
                leafletMap.current.remove();
                leafletMap.current = null;
            }
        };
    }, []);

    // Update center
    useEffect(() => {
        if (leafletMap.current && center) {
            leafletMap.current.setView(center, leafletMap.current.getZoom());
        }
    }, [center]);

    // Update unit markers
    useEffect(() => {
        if (!leafletMap.current || !unitsLayer.current) return;

        unitsLayer.current.clearLayers();

        units.forEach(unit => {
            if (unit.lat && unit.lng) {
                const unitIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: #0f172a; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7],
                });

                const marker = L.marker([unit.lat, unit.lng], { icon: unitIcon });

                const popupContent = `
                    <div style="min-width: 150px; font-family: sans-serif;">
                        <p style="margin: 0; font-size: 10px; font-weight: 900; color: #2563eb; text-transform: uppercase; letter-spacing: 0.05em;">${unit.brand_name}</p>
                        <h4 style="margin: 2px 0; font-size: 14px; font-weight: 900; color: #0f172a;">${unit.unit_name}</h4>
                        <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.2;">
                            ${unit.address_raw}<br/>
                            <span style="color: #94a3b8;">${unit.city} - ${unit.state}</span>
                        </p>
                    </div>
                `;

                marker.bindPopup(popupContent);
                unitsLayer.current?.addLayer(marker);
            }
        });
    }, [units]);

    // Update inventory markers
    useEffect(() => {
        if (!leafletMap.current || !inventoryLayer.current) return;

        inventoryLayer.current.clearLayers();

        inventory.forEach(item => {
            if (item.lat && item.lng) {
                const invIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: #f59e0b; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.2);"></div>`,
                    iconSize: [10, 10],
                    iconAnchor: [5, 5],
                });

                const marker = L.marker([item.lat, item.lng], { icon: invIcon });

                const formatPrice = (price: number | undefined) => {
                    if (!price) return '—';
                    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
                };

                const popupContent = `
                    <div style="min-width: 160px; font-family: sans-serif;">
                        <p style="margin: 0; font-size: 10px; font-weight: 900; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.05em;">📍 Mídia OOH</p>
                        <h4 style="margin: 2px 0; font-size: 13px; font-weight: 900; color: #0f172a;">${item.type}</h4>
                        <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">
                            <strong>Fornecedor:</strong> ${item.vendor_name}<br/>
                            <strong>Preço:</strong> ${formatPrice(item.base_price)}<br/>
                            ${item.address_raw}
                        </p>
                    </div>
                `;

                marker.bindPopup(popupContent);
                inventoryLayer.current?.addLayer(marker);
            }
        });
    }, [inventory]);

    return (
        <div ref={mapRef} className="w-full h-full rounded-3xl z-0 bg-slate-100 shadow-inner overflow-hidden" />
    );
}
