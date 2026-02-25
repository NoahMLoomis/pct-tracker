"use client";

import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { TrailUpdate } from "@/lib/types";

function createBlinkMarkerEl(): HTMLDivElement {
	const el = document.createElement("div");
	el.style.width = "16px";
	el.style.height = "16px";
	el.style.borderRadius = "999px";
	el.style.border = "2px solid rgba(232,238,245,.95)";
	el.style.boxShadow = "0 10px 26px rgba(0,0,0,.45)";
	el.style.background = "#2bff88";
	el.style.position = "relative";

	const ring = document.createElement("div");
	ring.style.position = "absolute";
	ring.style.left = "-10px";
	ring.style.top = "-10px";
	ring.style.width = "36px";
	ring.style.height = "36px";
	ring.style.borderRadius = "999px";
	ring.style.border = "2px solid rgba(43,255,136,.55)";
	ring.style.boxShadow = "0 0 22px rgba(43,255,136,.40)";
	ring.style.animation = "pctPulse 1.6s ease-out infinite";
	el.appendChild(ring);

	return el;
}

function createUpdateMarkerEl(): HTMLDivElement {
	const el = document.createElement("div");
	el.style.width = "12px";
	el.style.height = "12px";
	el.style.borderRadius = "999px";
	el.style.border = "2px solid rgba(232,238,245,.85)";
	el.style.background = "#f0883e";
	el.style.cursor = "pointer";
	el.style.boxShadow = "0 2px 8px rgba(0,0,0,.4)";
	return el;
}

function findNearestIndex(
	coords: [number, number][],
	lon: number,
	lat: number,
): number {
	let bestIdx = 0;
	let bestDist = Infinity;
	for (let i = 0; i < coords.length; i++) {
		const dx = coords[i][0] - lon;
		const dy = coords[i][1] - lat;
		const d = dx * dx + dy * dy;
		if (d < bestDist) {
			bestDist = d;
			bestIdx = i;
		}
	}
	return bestIdx;
}

interface MapProps {
	slug: string;
	updates?: TrailUpdate[];
}

export default function MapView({ slug, updates }: MapProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	const markerRef = useRef<maplibregl.Marker | null>(null);
	const updateMarkersRef = useRef<maplibregl.Marker[]>([]);
	const trailCoordsRef = useRef<[number, number][] | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		const style: maplibregl.StyleSpecification = {
			version: 8,
			sources: {
				sat: {
					type: "raster",
					tiles: [
						"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
					],
					tileSize: 256,
					attribution:
						"Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
				},
				topo: {
					type: "raster",
					tiles: [
						"https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
						"https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
						"https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
					],
					tileSize: 256,
					attribution:
						"&copy; OpenTopoMap (CC-BY-SA) / &copy; OpenStreetMap contributors",
				},
			},
			layers: [
				{
					id: "sat-layer",
					type: "raster",
					source: "sat",
					layout: { visibility: "visible" },
				},
				{
					id: "topo-layer",
					type: "raster",
					source: "topo",
					layout: { visibility: "none" },
				},
			],
		};

		const map = new maplibregl.Map({
			container: containerRef.current,
			style,
			center: [-117.5, 41],
			zoom: 3.8,
		});

		mapRef.current = map;

		map.addControl(
			new maplibregl.NavigationControl({ visualizePitch: true }),
			"top-right",
		);

		class BasemapToggle implements maplibregl.IControl {
			_container?: HTMLDivElement;
			_map?: maplibregl.Map;

			onAdd(m: maplibregl.Map) {
				this._map = m;
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "pct-toggle-btn";
				btn.title = "Toggle basemap";
				btn.setAttribute("aria-label", "Toggle basemap");

				const setIcon = () => {
					const satVis =
						m.getLayoutProperty("sat-layer", "visibility") !== "none";
					btn.textContent = satVis ? "\u{1F5FA}\u{FE0F}" : "\u{1F6F0}\u{FE0F}";
				};

				btn.addEventListener("click", () => {
					const satVis =
						m.getLayoutProperty("sat-layer", "visibility") !== "none";
					m.setLayoutProperty(
						"sat-layer",
						"visibility",
						satVis ? "none" : "visible",
					);
					m.setLayoutProperty(
						"topo-layer",
						"visibility",
						satVis ? "visible" : "none",
					);
					setIcon();
				});

				const wrap = document.createElement("div");
				wrap.className = "maplibregl-ctrl maplibregl-ctrl-group";
				wrap.style.marginTop = "6px";
				wrap.style.overflow = "hidden";
				wrap.appendChild(btn);

				m.on("idle", setIcon);
				this._container = wrap;
				setIcon();
				return this._container;
			}

			onRemove() {
				this._container?.parentNode?.removeChild(this._container);
				this._map = undefined;
			}
		}

		const splitTrail = (splitIdx: number, direction: "NOBO" | "SOBO") => {
			const coords = trailCoordsRef.current;
			if (!coords || coords.length === 0) return;

			let completedCoords: [number, number][];
			let remainingCoords: [number, number][];

			if (direction === "NOBO") {
				completedCoords = coords.slice(0, splitIdx + 1);
				remainingCoords = coords.slice(splitIdx);
			} else {
				completedCoords = coords.slice(splitIdx);
				remainingCoords = coords.slice(0, splitIdx + 1);
			}

			const completedGeoJSON = {
				type: "Feature" as const,
				properties: {},
				geometry: { type: "LineString" as const, coordinates: completedCoords },
			};
			const remainingGeoJSON = {
				type: "Feature" as const,
				properties: {},
				geometry: { type: "LineString" as const, coordinates: remainingCoords },
			};

			if (map.getSource("pct-completed")) {
				(map.getSource("pct-completed") as maplibregl.GeoJSONSource).setData(
					completedGeoJSON,
				);
				(map.getSource("pct-remaining") as maplibregl.GeoJSONSource).setData(
					remainingGeoJSON,
				);
			}
		};

		const updateMarker = async () => {
			const res = await fetch(`/api/latest/${slug}`, { cache: "no-store" });
			if (!res.ok) return;
			const pos = await res.json();
			if (!pos.lat && !pos.lon) return;

			const lngLat: [number, number] = [pos.lon, pos.lat];
			if (!markerRef.current) {
				markerRef.current = new maplibregl.Marker({
					element: createBlinkMarkerEl(),
				})
					.setLngLat(lngLat)
					.addTo(map);
			} else {
				markerRef.current.setLngLat(lngLat);
			}

			const coords = trailCoordsRef.current;
			if (coords) {
				const splitIdx = findNearestIndex(coords, pos.lon, pos.lat);
				splitTrail(splitIdx, pos.direction || "NOBO");
			}
		};

		map.on("load", async () => {
			map.addControl(new BasemapToggle(), "top-right");

			// Add all sources and layers immediately so the base trail renders right away
			map.addSource("pct-trail", {
				type: "geojson",
				data: "/pct-trail.geojson",
			});

			map.addLayer({
				id: "pct-bg",
				type: "line",
				source: "pct-trail",
				paint: {
					"line-color": "rgba(255,255,255,0.45)",
					"line-width": 2,
					"line-opacity": 1,
				},
			});

			const emptyLine = {
				type: "Feature" as const,
				properties: {},
				geometry: {
					type: "LineString" as const,
					coordinates: [] as [number, number][],
				},
			};

			map.addSource("pct-completed", { type: "geojson", data: emptyLine });
			map.addLayer({
				id: "pct-completed-glow",
				type: "line",
				source: "pct-completed",
				paint: {
					"line-color": "#7ee787",
					"line-width": 12,
					"line-opacity": 0.25,
					"line-blur": 6,
				},
			});
			map.addLayer({
				id: "pct-completed-main",
				type: "line",
				source: "pct-completed",
				paint: {
					"line-color": "#7ee787",
					"line-width": 3.5,
					"line-opacity": 0.9,
				},
			});

			map.addSource("pct-remaining", { type: "geojson", data: emptyLine });
			map.addLayer({
				id: "pct-remaining-glow",
				type: "line",
				source: "pct-remaining",
				paint: {
					"line-color": "#ff6b6b",
					"line-width": 10,
					"line-opacity": 0.3,
					"line-blur": 5,
				},
			});
			map.addLayer({
				id: "pct-remaining-main",
				type: "line",
				source: "pct-remaining",
				paint: {
					"line-color": "#ff6b6b",
					"line-width": 3,
					"line-opacity": 0.92,
				},
			});

			// Fetch trail coords and current position in parallel
			const [coordsResult, posResult] = await Promise.allSettled([
				fetch("/pct-trail.geojson")
					.then((r) => r.json())
					.then(
						(d) => d.features?.[0]?.geometry?.coordinates as [number, number][],
					),
				fetch(`/api/latest/${slug}`, { cache: "no-store" }).then((r) =>
					r.json(),
				),
			]);

			if (coordsResult.status === "fulfilled" && coordsResult.value) {
				trailCoordsRef.current = coordsResult.value;
			}

			if (posResult.status === "fulfilled") {
				const pos = posResult.value;
				if (pos.lat || pos.lon) {
					const lngLat: [number, number] = [pos.lon, pos.lat];
					markerRef.current = new maplibregl.Marker({
						element: createBlinkMarkerEl(),
					})
						.setLngLat(lngLat)
						.addTo(map);
					if (trailCoordsRef.current) {
						const splitIdx = findNearestIndex(
							trailCoordsRef.current,
							pos.lon,
							pos.lat,
						);
						splitTrail(splitIdx, pos.direction || "NOBO");
					}
				}
			}

			const interval = setInterval(updateMarker, 60_000);
			map.on("remove", () => clearInterval(interval));
		});

		return () => {
			map.remove();
			mapRef.current = null;
		};
	}, [slug]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map || !updates) return;

		for (const m of updateMarkersRef.current) m.remove();
		updateMarkersRef.current = [];

		for (const u of updates) {
			if (u.lat == null || u.lon == null) continue;

			const snippet = u.body.length > 20 ? u.body.slice(0, 20) + "..." : u.body;
			const popup = new maplibregl.Popup({
				closeButton: true,
				closeOnClick: true,
				maxWidth: "280px",
			}).setHTML(
				`<div class="pct-popup">
            <div class="pct-popup-title">${u.title}</div>
            <div style="margin-top:6px;font-size:13px;color:rgba(255,255,255,.7)">${snippet}</div>
            <a href="/tracker/${slug}/updates#${u.id}" style="display:inline-block;margin-top:8px;font-size:13px;color:#7ee787">Read more</a>
          </div>`,
			);

			const marker = new maplibregl.Marker({ element: createUpdateMarkerEl() })
				.setLngLat([u.lon, u.lat])
				.setPopup(popup)
				.addTo(map);

			updateMarkersRef.current.push(marker);
		}
	}, [updates, slug]);

	return (
		<div
			ref={containerRef}
			className="h-[56vh] min-h-[380px] rounded-2xl overflow-hidden border border-line shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
		/>
	);
}
