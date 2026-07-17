"use client";

import { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface LocationPickerProps {
	lat?: number | null;
	lon?: number | null;
	onChange: (lat: number, lon: number) => void;
}

export default function LocationPicker({
	lat,
	lon,
	onChange,
}: LocationPickerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	const markerRef = useRef<maplibregl.Marker | null>(null);
	const [geoStatus, setGeoStatus] = useState<
		"prompting" | "denied" | "found" | null
	>(null);

	const placeMarker = (map: maplibregl.Map, lng: number, lat: number) => {
		if (!markerRef.current) {
			markerRef.current = new maplibregl.Marker({ color: "#7ee787" })
				.setLngLat([lng, lat])
				.addTo(map);
		} else {
			markerRef.current.setLngLat([lng, lat]);
		}
	};

	useEffect(() => {
		if (!containerRef.current) return;

		const map = new maplibregl.Map({
			container: containerRef.current,
			style: {
				version: 8,
				sources: {
					sat: {
						type: "raster",
						tiles: [
							"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
						],
						tileSize: 256,
					},
				},
				layers: [{ id: "sat-layer", type: "raster", source: "sat" }],
			},
			center: [lon ?? -119.5, lat ?? 37.5],
			zoom: lat != null ? 8 : 4,
		});

		mapRef.current = map;

		map.addControl(new maplibregl.NavigationControl(), "top-right");

		map.on("load", () => {
			map.addSource("pct-trail", {
				type: "geojson",
				data: "/pct-trail.geojson",
			});

			map.addLayer({
				id: "pct-glow",
				type: "line",
				source: "pct-trail",
				paint: {
					"line-color": "#7ee787",
					"line-width": 10,
					"line-opacity": 0.2,
					"line-blur": 5,
				},
			});

			map.addLayer({
				id: "pct-main",
				type: "line",
				source: "pct-trail",
				paint: {
					"line-color": "#7ee787",
					"line-width": 2.5,
					"line-opacity": 0.75,
				},
			});

			map.addSource("pct-miles", {
				type: "geojson",
				data: "/pct-miles.geojson",
			});

			map.addLayer({
				id: "pct-miles-dots",
				type: "circle",
				source: "pct-miles",
				minzoom: 7,
				paint: {
					"circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 2, 12, 4],
					"circle-color": "#7ee787",
					"circle-stroke-color": "#000",
					"circle-stroke-width": 1,
				},
			});

			map.addLayer({
				id: "pct-miles-labels",
				type: "symbol",
				source: "pct-miles",
				minzoom: 8,
				layout: {
					"text-field": ["to-string", ["get", "mile"]],
					"text-size": ["interpolate", ["linear"], ["zoom"], 8, 10, 14, 14],
					"text-offset": [0, -1.1],
					"text-anchor": "bottom",
					"text-allow-overlap": false,
					"symbol-sort-key": [
						"case",
						["==", ["%", ["get", "mile"], 100], 0],
						0,
						["==", ["%", ["get", "mile"], 50], 0],
						1,
						["==", ["%", ["get", "mile"], 25], 0],
						2,
						["==", ["%", ["get", "mile"], 10], 0],
						3,
						4,
					],
				},
				paint: {
					"text-color": "#7ee787",
					"text-halo-color": "#000",
					"text-halo-width": 1.5,
				},
			});
		});

		if (lat != null && lon != null) {
			placeMarker(map, lon, lat);
		} else {
			if ("geolocation" in navigator) {
				setGeoStatus("prompting");
				navigator.geolocation.getCurrentPosition(
					(pos) => {
						setGeoStatus("found");
						const { latitude, longitude } = pos.coords;
						placeMarker(map, longitude, latitude);
						map.flyTo({ center: [longitude, latitude], zoom: 10 });
						onChange(latitude, longitude);
					},
					() => {
						setGeoStatus("denied");
					},
					{ enableHighAccuracy: true, timeout: 10000 },
				);
			}
		}

		map.on("click", (e) => {
			const { lng, lat: clickLat } = e.lngLat;
			placeMarker(map, lng, clickLat);
			onChange(clickLat, lng);
			setGeoStatus(null);
		});

		return () => {
			map.remove();
			mapRef.current = null;
		};
	}, []);

	return (
		<div>
			{geoStatus === "prompting" && (
				<p className="text-muted text-xs my-1.5 !text-accent">
					Accept the location permission to auto-detect your position, or click
					the map to place a pin manually.
				</p>
			)}
			{geoStatus === "denied" && (
				<p className="text-muted text-xs my-1.5">
					Location access denied. Click the map to place a pin manually.
				</p>
			)}
			<div
				ref={containerRef}
				className="w-full h-[250px] rounded-[10px] overflow-hidden border border-line mt-2"
			/>
		</div>
	);
}
