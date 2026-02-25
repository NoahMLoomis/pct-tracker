import { readFileSync } from "node:fs";
import { join } from "node:path";

const R = 6_371_000;
const PCT_PROXIMITY_M = 30_000;

function haversineM(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const phi1 = (lat1 * Math.PI) / 180;
	const phi2 = (lat2 * Math.PI) / 180;
	const dphi = ((lat2 - lat1) * Math.PI) / 180;
	const dl = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dphi / 2) ** 2 +
		Math.cos(phi1) * Math.cos(phi2) * Math.sin(dl / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}

const W: [number, number][] = [
	[32.59, -116.47],
	[32.87, -116.51],
	[33.28, -116.64],
	[33.74, -116.69],
	[33.93, -116.83],
	[34.24, -116.87],
	[34.32, -117.44],
	[34.36, -117.63],
	[34.37, -117.99],
	[34.49, -118.32],
	[34.82, -118.72],
	[35.13, -118.45],
	[35.67, -118.23],
	[36.07, -118.11],
	[36.58, -118.29],
	[36.77, -118.42],
	[37.08, -118.66],
	[37.38, -118.8],
	[37.65, -119.04],
	[37.87, -119.34],
	[38.33, -119.64],
	[38.72, -119.93],
	[38.94, -120.04],
	[39.32, -120.33],
	[39.57, -120.64],
	[39.96, -121.25],
	[40.49, -121.51],
	[41.01, -121.65],
	[41.17, -122.32],
	[41.31, -122.31],
	[41.46, -122.89],
	[41.84, -123.23],
	[42.19, -122.71],
	[42.87, -122.17],
	[43.35, -122.04],
	[43.83, -121.76],
	[44.42, -121.87],
	[45.33, -121.71],
	[45.67, -121.9],
	[46.65, -121.39],
	[47.39, -121.41],
	[47.75, -121.09],
	[48.33, -120.69],
	[48.52, -120.74],
	[49.06, -121.05],
];

function pointToSegmentM(
	lat: number,
	lon: number,
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const midLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
	const cosLat = Math.cos(midLat);
	const dx = (lon2 - lon1) * cosLat;
	const dy = lat2 - lat1;
	const segLenSq = dx * dx + dy * dy;
	if (segLenSq === 0) return haversineM(lat, lon, lat1, lon1);
	const px = (lon - lon1) * cosLat;
	const py = lat - lat1;
	const t = Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));
	return haversineM(
		lat,
		lon,
		lat1 + t * (lat2 - lat1),
		lon1 + t * (lon2 - lon1),
	);
}

export function isNearPct(lat: number, lon: number): boolean {
	for (let i = 0; i < W.length - 1; i++) {
		if (
			pointToSegmentM(lat, lon, W[i][0], W[i][1], W[i + 1][0], W[i + 1][1]) <=
			PCT_PROXIMITY_M
		) {
			return true;
		}
	}
	return false;
}

// Full trail coordinates cached at module level — [lon, lat] GeoJSON order
let _trailCoords: [number, number][] | null = null;

function getTrailCoords(): [number, number][] {
	if (_trailCoords) return _trailCoords;
	try {
		const raw = readFileSync(join(process.cwd(), "public/pct-trail.geojson"), "utf8");
		const geojson = JSON.parse(raw);
		_trailCoords = geojson.features[0].geometry.coordinates as [number, number][];
	} catch {
		// Fallback to simplified waypoints if file unavailable
		_trailCoords = W.map(([lat, lon]) => [lon, lat] as [number, number]);
	}
	return _trailCoords!;
}

// Snap a coordinate to the nearest point on the full PCT trail.
export function snapToTrail(lat: number, lon: number): { lat: number; lon: number } {
	const coords = getTrailCoords();
	let minDist = Infinity;
	let nearestLat = coords[0][1];
	let nearestLon = coords[0][0];

	for (const [clon, clat] of coords) {
		const dist = haversineM(lat, lon, clat, clon);
		if (dist < minDist) {
			minDist = dist;
			nearestLat = clat;
			nearestLon = clon;
		}
	}

	return { lat: nearestLat, lon: nearestLon };
}

// Returns metres hiked along the simplified PCT trail from the start
// (NOBO: from Campo; SOBO: from Manning Park) to the given snapped position.
export function distAlongTrailM(
	snapLat: number,
	snapLon: number,
	direction: "NOBO" | "SOBO",
): number {
	// Build cumulative distances from W[0]
	const cumDists: number[] = [0];
	for (let i = 0; i < W.length - 1; i++) {
		cumDists.push(
			cumDists[i] + haversineM(W[i][0], W[i][1], W[i + 1][0], W[i + 1][1]),
		);
	}
	const totalLen = cumDists[W.length - 1];

	// Find which segment the snap point is closest to
	let minDist = Infinity;
	let bestI = 0;
	let bestT = 0;
	for (let i = 0; i < W.length - 1; i++) {
		const lat1 = W[i][0];
		const lon1 = W[i][1];
		const lat2 = W[i + 1][0];
		const lon2 = W[i + 1][1];
		const midLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
		const cosLat = Math.cos(midLat);
		const dx = (lon2 - lon1) * cosLat;
		const dy = lat2 - lat1;
		const segLenSq = dx * dx + dy * dy;
		let t = 0;
		if (segLenSq > 0) {
			const px = (snapLon - lon1) * cosLat;
			const py = snapLat - lat1;
			t = Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));
		}
		const pLat = lat1 + t * (lat2 - lat1);
		const pLon = lon1 + t * (lon2 - lon1);
		const dist = haversineM(snapLat, snapLon, pLat, pLon);
		if (dist < minDist) {
			minDist = dist;
			bestI = i;
			bestT = t;
		}
	}

	const segLen = haversineM(
		W[bestI][0],
		W[bestI][1],
		W[bestI + 1][0],
		W[bestI + 1][1],
	);
	const distFromStart = cumDists[bestI] + bestT * segLen;

	return direction === "NOBO" ? distFromStart : totalLen - distFromStart;
}
