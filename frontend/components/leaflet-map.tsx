"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

// Fix Leaflet icon issues
const fixLeafletIcon = () => {
	// Fix Leaflet's icon paths
	delete (L.Icon.Default.prototype as any)._getIconUrl;

	L.Icon.Default.mergeOptions({
		iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
		iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
		shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
	});
};

interface LeafletMapProps {
	height?: number;
	className?: string;
	center?: [number, number];
	zoom?: number;
	marker?: [number, number];
	onLocationSelect?: (lat: number, lng: number) => void;
}

export default function LeafletMap({
	height = 300,
	className,
	center = [51.505, -0.09], // Default to London
	zoom = 13,
	marker,
	onLocationSelect,
}: LeafletMapProps) {
	const mapRef = useRef<L.Map | null>(null);
	const markerRef = useRef<L.Marker | null>(null);
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const [mapReady, setMapReady] = useState(false);

	// Initialize map
	useEffect(() => {
		if (!mapContainerRef.current || mapRef.current) return;

		fixLeafletIcon();

		const map = L.map(mapContainerRef.current).setView(center, zoom);

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		}).addTo(map);

		if (onLocationSelect) {
			map.on("click", (e) => {
				const { lat, lng } = e.latlng;

				// Update marker position
				if (markerRef.current) {
					markerRef.current.setLatLng([lat, lng]);
				} else {
					markerRef.current = L.marker([lat, lng]).addTo(map);
				}

				onLocationSelect(lat, lng);
			});
		}

		mapRef.current = map;
		setMapReady(true);

		return () => {
			map.remove();
			mapRef.current = null;
			markerRef.current = null;
		};
	}, [center, zoom, onLocationSelect]);

	// Update center when prop changes
	useEffect(() => {
		if (mapRef.current && mapReady) {
			mapRef.current.setView(center, zoom);
		}
	}, [center, zoom, mapReady]);

	// Update marker when prop changes
	useEffect(() => {
		if (!mapRef.current || !mapReady) return;

		// Remove existing marker
		if (markerRef.current) {
			markerRef.current.remove();
			markerRef.current = null;
		}

		// Add new marker if coordinates provided
		if (marker) {
			markerRef.current = L.marker(marker).addTo(mapRef.current);
			mapRef.current.setView(marker, zoom);
		}
	}, [marker, zoom, mapReady]);

	return (
		<div
			ref={mapContainerRef}
			className={cn("rounded-md overflow-hidden", className)}
			style={{ height: `${height}px` }}
		/>
	);
}
