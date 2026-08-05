import { logger } from "./logger";
import { distAlongTrailM, isNearPct, snapToTrail } from "./pct-filter";
import { fetchActivities, refreshAccessToken } from "./strava";
import { createServiceClient } from "./supabase/server";

export async function syncUser(
	userId: string,
): Promise<{ added: number; skipped: number }> {
	const supabase = createServiceClient();

	logger.info("sync start", { userId });

	const { error: syncStartErr } = await supabase.from("sync_state").upsert({
		user_id: userId,
		status: "syncing",
		last_sync_at: new Date().toISOString(),
		error_message: null,
	});
	if (syncStartErr) {
		logger.error("sync_state upsert failed", {
			userId,
			error: syncStartErr.message,
		});
	}

	try {
		const { data: user } = await supabase
			.from("users")
			.select("hike_start_date, hike_end_date, direction")
			.eq("id", userId)
			.single();

		let after: number | undefined;
		let before: number | undefined;

		if (user?.hike_start_date) {
			const start = new Date(user.hike_start_date);
			after = Math.floor(start.getTime() / 1000);

			if (user.hike_end_date) {
				before = Math.floor(new Date(user.hike_end_date).getTime() / 1000);
			} else {
				const end = new Date(start);
				end.setMonth(end.getMonth() + 6);
				before = Math.floor(end.getTime() / 1000);
			}
		}

		if (after != null) {
			await supabase
				.from("activity_stats")
				.delete()
				.eq("user_id", userId)
				.lt("start_date", new Date(after * 1000).toISOString());
		}
		if (before != null) {
			await supabase
				.from("activity_stats")
				.delete()
				.eq("user_id", userId)
				.gt("start_date", new Date(before * 1000).toISOString());
		}

		const accessToken = await refreshAccessToken(userId);
		const activities = await fetchActivities(accessToken, after, before);
		activities.sort((a, b) => a.start_date.localeCompare(b.start_date));
		logger.info("sync fetched activities", {
			userId,
			count: activities.length,
		});

		const { data: existing } = await supabase
			.from("activity_stats")
			.select("strava_id")
			.eq("user_id", userId);

		const existingIds = new Set((existing || []).map((e) => e.strava_id));

		let added = 0;
		let skipped = 0;

		for (const act of activities) {
			if (existingIds.has(act.id)) {
				skipped++;
				continue;
			}

			if (act.start_latlng && act.start_latlng.length === 2) {
				if (!isNearPct(act.start_latlng[0], act.start_latlng[1])) {
					skipped++;
					continue;
				}
			}

			await supabase.from("activity_stats").upsert(
				{
					user_id: userId,
					strava_id: act.id,
					name: act.name,
					start_date: act.start_date,
					distance_m: act.distance || 0,
					moving_time_s: act.moving_time || 0,
					elevation_gain_m: act.total_elevation_gain || 0,
					activity_type: act.type,
				},
				{ onConflict: "user_id,strava_id" },
			);

			added++;
		}

		// Pick the activity that's furthest along the trail, not the most
		// recent one — a short local/recovery activity synced after a big
		// push shouldn't drag the tracked position backwards.
		const direction = (user?.direction as "NOBO" | "SOBO") || "NOBO";
		let furthest: {
			lat: number;
			lon: number;
			date: string;
			distM: number;
		} | null = null;
		for (const act of activities) {
			if (!act.end_latlng || act.end_latlng.length !== 2) continue;
			if (!isNearPct(act.end_latlng[0], act.end_latlng[1])) continue;
			const distM = distAlongTrailM(
				act.end_latlng[0],
				act.end_latlng[1],
				direction,
			);
			if (!furthest || distM > furthest.distM) {
				const snapped = snapToTrail(act.end_latlng[0], act.end_latlng[1]);
				furthest = {
					lat: snapped.lat,
					lon: snapped.lon,
					date: act.start_date,
					distM,
				};
			}
		}
		if (furthest) {
			await supabase.from("latest_position").upsert(
				{
					user_id: userId,
					lat: furthest.lat,
					lon: furthest.lon,
					activity_date: furthest.date,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "user_id" },
			);
		}

		await supabase.from("sync_state").upsert({
			user_id: userId,
			status: "idle",
			last_sync_at: new Date().toISOString(),
		});

		logger.info("sync complete", { userId, added, skipped });
		return { added, skipped };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		logger.error("sync failed", { userId, error: errorMessage });
		const { error: syncErrUpsertErr } = await supabase
			.from("sync_state")
			.upsert({
				user_id: userId,
				status: "error",
				last_sync_at: new Date().toISOString(),
				error_message: errorMessage,
			});
		if (syncErrUpsertErr) {
			logger.error("sync_state error upsert failed", {
				userId,
				error: syncErrUpsertErr.message,
			});
		}
		throw err;
	}
}
