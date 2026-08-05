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
		const raw = readFileSync(
			join(process.cwd(), "public/pct-trail.geojson"),
			"utf8",
		);
		const geojson = JSON.parse(raw);
		_trailCoords = geojson.features[0].geometry.coordinates as [
			number,
			number,
		][];
	} catch {
		// Fallback to simplified waypoints if file unavailable
		_trailCoords = W.map(([lat, lon]) => [lon, lat] as [number, number]);
	}
	return _trailCoords!;
}

// Snap a coordinate to the nearest point on the full PCT trail.
export function snapToTrail(
	lat: number,
	lon: number,
): { lat: number; lon: number; index: number } {
	const coords = getTrailCoords();
	let minDist = Infinity;
	let nearestIdx = 0;

	for (let i = 0; i < coords.length; i++) {
		const dist = haversineM(lat, lon, coords[i][1], coords[i][0]);
		if (dist < minDist) {
			minDist = dist;
			nearestIdx = i;
		}
	}

	return {
		lat: coords[nearestIdx][1],
		lon: coords[nearestIdx][0],
		index: nearestIdx,
	};
}

const MI = 1609.34;

// Official mile markers (every 5mi, south → north) generated from a
// high-precision GPX measuring the real ~2650mi PCT length — the same file
// the mile-marker LocationPicker shows users when they pick a spot. Using it
// here too keeps "the mile you picked" and "the mile we compute" in sync;
// pct-trail.geojson (used by snapToTrail for visual placement) is a coarser
// digitization that runs ~6% short of the real trail length, so it can't be
// used as the basis for official mileage.
let _mileMarkers: { lon: number; lat: number; mile: number }[] | null = null;

function getMileMarkers(): { lon: number; lat: number; mile: number }[] {
	if (_mileMarkers) return _mileMarkers;
	const raw = readFileSync(
		join(process.cwd(), "public/pct-miles.geojson"),
		"utf8",
	);
	const geojson = JSON.parse(raw) as {
		features: {
			geometry: { coordinates: [number, number] };
			properties: { mile: number };
		}[];
	};
	_mileMarkers = geojson.features.map((f) => ({
		lon: f.geometry.coordinates[0],
		lat: f.geometry.coordinates[1],
		mile: f.properties.mile,
	}));
	return _mileMarkers!;
}

// Returns metres hiked along the full PCT trail from the start
// (NOBO: from Campo; SOBO: from Manning Park) to the given position, found
// by projecting onto the nearest segment between two official mile markers
// and interpolating the mile value along it.
export function distAlongTrailM(
	lat: number,
	lon: number,
	direction: "NOBO" | "SOBO",
): number {
	const markers = getMileMarkers();

	let bestDist = Infinity;
	let bestMi = 0;
	for (let i = 0; i < markers.length - 1; i++) {
		const a = markers[i];
		const b = markers[i + 1];
		const midLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
		const cosLat = Math.cos(midLat);
		const dx = (b.lon - a.lon) * cosLat;
		const dy = b.lat - a.lat;
		const segLenSq = dx * dx + dy * dy;
		const px = (lon - a.lon) * cosLat;
		const py = lat - a.lat;
		const t =
			segLenSq === 0
				? 0
				: Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));
		const projLat = a.lat + t * (b.lat - a.lat);
		const projLon = a.lon + t * (b.lon - a.lon);
		const dist = haversineM(lat, lon, projLat, projLon);
		if (dist < bestDist) {
			bestDist = dist;
			bestMi = a.mile + t * (b.mile - a.mile);
		}
	}

	const officialM = bestMi * MI;

	if (direction === "NOBO") return officialM;
	const totalOfficialM = markers[markers.length - 1].mile * MI;
	return totalOfficialM - officialM;
}
