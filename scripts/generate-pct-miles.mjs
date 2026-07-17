import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MI = 1609.34;
const R = 6_371_000;
const SPACING_MI = 5;

// Source GPX: closest measurement to the official ~2650 mi PCT length.
const GPX_PATH = join(
	process.cwd(),
	"mapsGPX",
	"Entire PCT - size 8 - 954532 points - 2650.48 miles.gpx",
);
const OUT_PATH = join(process.cwd(), "public/pct-miles.geojson");

function haversineM(lat1, lon1, lat2, lon2) {
	const phi1 = (lat1 * Math.PI) / 180;
	const phi2 = (lat2 * Math.PI) / 180;
	const dphi = ((lat2 - lat1) * Math.PI) / 180;
	const dl = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dphi / 2) ** 2 +
		Math.cos(phi1) * Math.cos(phi2) * Math.sin(dl / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}

console.log(`Reading ${GPX_PATH}`);
const gpx = readFileSync(GPX_PATH, "utf8");

// Track order in the GPX is south → north (CA Section A first). Concatenate
// all <trkpt> in document order to form a single polyline.
const trkptRe = /<trkpt\s+lat="([\-\d.]+)"\s+lon="([\-\d.]+)"/g;
const coords = [];
let m;
while ((m = trkptRe.exec(gpx)) !== null) {
	coords.push([parseFloat(m[2]), parseFloat(m[1])]); // [lon, lat]
}
console.log(`Parsed ${coords.length.toLocaleString()} track points`);

let totalM = 0;
let nextTargetMi = 0;
const features = [];

for (let i = 1; i < coords.length; i++) {
	const [lon1, lat1] = coords[i - 1];
	const [lon2, lat2] = coords[i];
	const segM = haversineM(lat1, lon1, lat2, lon2);
	const nextTotal = totalM + segM;

	while (nextTargetMi * MI <= nextTotal) {
		const t = segM > 0 ? (nextTargetMi * MI - totalM) / segM : 0;
		features.push({
			type: "Feature",
			geometry: {
				type: "Point",
				coordinates: [lon1 + t * (lon2 - lon1), lat1 + t * (lat2 - lat1)],
			},
			properties: { mile: nextTargetMi },
		});
		nextTargetMi += SPACING_MI;
	}

	totalM = nextTotal;
}

const totalMi = totalM / MI;
console.log(`Trail length: ${totalMi.toFixed(2)} mi`);
console.log(`Emitted ${features.length} markers (last: mile ${features[features.length - 1].properties.mile})`);

writeFileSync(
	OUT_PATH,
	JSON.stringify({ type: "FeatureCollection", features }),
);
console.log(`Wrote ${OUT_PATH}`);
