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

	return { lat: coords[nearestIdx][1], lon: coords[nearestIdx][0], index: nearestIdx };
}

// Cached cumulative distances along the full trail (metres from index 0).
let _cumDists: Float64Array | null = null;

function getCumDists(): Float64Array {
	if (_cumDists) return _cumDists;
	const coords = getTrailCoords();
	const cum = new Float64Array(coords.length);
	cum[0] = 0;
	for (let i = 0; i < coords.length - 1; i++) {
		cum[i + 1] =
			cum[i] +
			haversineM(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
	}
	_cumDists = cum;
	return _cumDists;
}

// Calibration table: [GeoJSON cumulative miles, official PCT miles].
// Only landmarks that snap within ~3km of the GeoJSON trail are included.
// Sources: Halfmile PCT maps, PCTA mile markers.
const MI = 1609.34;
const CALIBRATION: [number, number][] = [
	[0.0, 0],
	[17.8, 20],
	[38.7, 43],
	[100.1, 109.5],
	[134.5, 151.8],
	[254.1, 266.3],
	[282.6, 291],
	[310.1, 342],
	[332.7, 369.5],
	[415.4, 454.5],
	[654.4, 702],
	[696.6, 745],
	[731.5, 789],
	[797.2, 854],
	[876.3, 942],
	[946.1, 1017],
	[1016.1, 1092],
	[1072.9, 1153],
	[1116.1, 1195],
	[1193.3, 1284],
	[1325.8, 1419],
	[1407.3, 1501],
	[1555.1, 1655],
	[1604.5, 1718.9],
	[1710.5, 1823],
	[1765.2, 1906],
	[1881.8, 1993],
	[1975.0, 2095],
	[2021.5, 2147],
	[2161.6, 2292],
	[2250.2, 2393],
	[2318.9, 2464],
	[2464.4, 2620],
	[2492.5, 2652],
];

// Piecewise linear interpolation from GeoJSON miles to official PCT miles.
function calibrateToOfficialMi(geojsonMi: number): number {
	if (geojsonMi <= CALIBRATION[0][0]) return CALIBRATION[0][1];
	if (geojsonMi >= CALIBRATION[CALIBRATION.length - 1][0])
		return CALIBRATION[CALIBRATION.length - 1][1];

	// Binary search for the enclosing segment
	let lo = 0;
	let hi = CALIBRATION.length - 1;
	while (lo < hi - 1) {
		const mid = (lo + hi) >> 1;
		if (CALIBRATION[mid][0] <= geojsonMi) lo = mid;
		else hi = mid;
	}

	const [geoLo, offLo] = CALIBRATION[lo];
	const [geoHi, offHi] = CALIBRATION[hi];
	const t = (geojsonMi - geoLo) / (geoHi - geoLo);
	return offLo + t * (offHi - offLo);
}

// Returns metres hiked along the full PCT trail from the start
// (NOBO: from Campo; SOBO: from Manning Park) to the given snapped position.
// Pass trailIndex from snapToTrail() to skip the redundant nearest-point scan.
export function distAlongTrailM(
	snapLat: number,
	snapLon: number,
	direction: "NOBO" | "SOBO",
	trailIndex?: number,
): number {
	const coords = getTrailCoords();
	const cumDists = getCumDists();

	let nearestIdx: number;
	if (trailIndex !== undefined) {
		nearestIdx = trailIndex;
	} else {
		let minDist = Infinity;
		nearestIdx = 0;
		for (let i = 0; i < coords.length; i++) {
			const dist = haversineM(snapLat, snapLon, coords[i][1], coords[i][0]);
			if (dist < minDist) {
				minDist = dist;
				nearestIdx = i;
			}
		}
	}

	const rawMi = cumDists[nearestIdx] / MI;
	const officialMi = calibrateToOfficialMi(rawMi);
	const officialM = officialMi * MI;

	if (direction === "NOBO") return officialM;
	const totalOfficialM = CALIBRATION[CALIBRATION.length - 1][1] * MI;
	return totalOfficialM - officialM;
}
