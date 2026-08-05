import { distAlongTrailM, snapToTrail } from "./pct-filter";
import type { createServiceClient } from "./supabase/server";

type SupabaseClient = ReturnType<typeof createServiceClient>;

export interface FurthestPosition {
	lat: number;
	lon: number;
	distM: number;
	ts: string | null;
}

// Finds the furthest point a hiker has reached along the trail, considering
// both their Strava-derived latest_position and every manual trail_update
// with a location — whichever is furthest along wins, regardless of which
// source is more recent.
export async function getFurthestPosition(
	supabase: SupabaseClient,
	userId: string,
	direction: "NOBO" | "SOBO",
): Promise<FurthestPosition | null> {
	const candidates: { lat: number; lon: number; ts: string | null }[] = [];

	const { data: pos } = await supabase
		.from("latest_position")
		.select("lat, lon, activity_date")
		.eq("user_id", userId)
		.single();

	if (pos) {
		candidates.push({ lat: pos.lat, lon: pos.lon, ts: pos.activity_date });
	}

	const { data: updates } = await supabase
		.from("trail_updates")
		.select("lat, lon, created_at")
		.eq("user_id", userId)
		.not("lat", "is", null)
		.not("lon", "is", null);

	for (const u of updates || []) {
		candidates.push({
			lat: u.lat as number,
			lon: u.lon as number,
			ts: u.created_at,
		});
	}

	let best: FurthestPosition | null = null;

	for (const c of candidates) {
		const distM = distAlongTrailM(c.lat, c.lon, direction);
		if (!best || distM > best.distM) {
			const snapped = snapToTrail(c.lat, c.lon);
			best = { lat: snapped.lat, lon: snapped.lon, distM, ts: c.ts };
		}
	}

	return best;
}
