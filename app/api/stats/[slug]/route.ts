import { type NextRequest, NextResponse } from "next/server";
import { getFurthestPosition } from "@/lib/progress";
import { createServiceClient } from "@/lib/supabase/server";
import { withLogging } from "@/lib/with-logging";

export const GET = withLogging(
	async (
		_request: NextRequest,
		{ params }: { params: Promise<{ slug: string }> },
	) => {
		const { slug } = await params;
		const supabase = createServiceClient();

		const { data: user } = await supabase
			.from("users")
			.select(
				"id, strava_athlete_id, direction, hike_start_date, hike_end_date",
			)
			.eq("slug", slug)
			.single();

		if (!user) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const direction = (user.direction as "NOBO" | "SOBO") || "NOBO";

		// Strava users: compute stats from synced activities
		if (user.strava_athlete_id != null) {
			const { data: activities } = await supabase
				.from("activity_stats")
				.select("start_date, distance_m, moving_time_s, elevation_gain_m")
				.eq("user_id", user.id)
				.order("start_date", { ascending: true });

			const rows = activities || [];

			let totalDistanceM = 0;
			let totalMovingTimeS = 0;
			let totalElevationGainM = 0;
			let firstDate: string | null = null;
			let lastDate: string | null = null;

			for (const r of rows) {
				totalDistanceM += r.distance_m || 0;
				totalMovingTimeS += r.moving_time_s || 0;
				totalElevationGainM += r.elevation_gain_m || 0;
				if (!firstDate) firstDate = r.start_date;
				lastDate = r.start_date;
			}

			// Furthest position along trail (Strava activities or manual posts,
			// whichever is further). Strava sync can stall (token expiry, an
			// outage, etc.) while a hiker keeps posting manual updates, so the
			// summed odometer distance above can under-report real progress —
			// never show a "Total Distance" behind the furthest known position.
			const furthest = await getFurthestPosition(supabase, user.id, direction);
			const positionM = furthest?.distM ?? null;

			return NextResponse.json(
				{
					totalDistanceM: Math.max(totalDistanceM, positionM ?? 0),
					totalMovingTimeS,
					totalElevationGainM,
					activityCount: rows.length,
					firstDate,
					lastDate,
					daysOnTrail: null,
					statsSource: "strava",
					activities: rows,
					positionM,
				},
				{
					headers: {
						"Cache-Control": "s-maxage=300, stale-while-revalidate=60",
					},
				},
			);
		}

		// Non-Strava users: estimate stats from the furthest posted location
		const furthest = await getFurthestPosition(supabase, user.id, direction);

		const { data: latestUpdate } = await supabase
			.from("trail_updates")
			.select("created_at")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false })
			.limit(1)
			.single();

		const today = new Date().toISOString().slice(0, 10);
		const startDate = user.hike_start_date;
		const inactivityCap = latestUpdate?.created_at
			? latestUpdate.created_at.slice(0, 10)
			: startDate;
		const activeThrough = user.hike_end_date ?? inactivityCap;
		const endDate =
			activeThrough && activeThrough < today ? activeThrough : today;
		const daysOnTrail = startDate
			? Math.max(
					1,
					Math.floor(
						(new Date(endDate).getTime() - new Date(startDate).getTime()) /
							86400000,
					),
				)
			: null;

		if (!furthest) {
			return NextResponse.json(
				{
					totalDistanceM: 0,
					totalMovingTimeS: 0,
					totalElevationGainM: 0,
					activityCount: 0,
					firstDate: startDate || null,
					lastDate: today,
					daysOnTrail,
					statsSource: "position",
					activities: [],
					positionM: null,
				},
				{
					headers: {
						"Cache-Control": "s-maxage=300, stale-while-revalidate=60",
					},
				},
			);
		}

		return NextResponse.json(
			{
				totalDistanceM: furthest.distM,
				totalMovingTimeS: 0,
				totalElevationGainM: 0,
				activityCount: 0,
				firstDate: startDate || null,
				lastDate: today,
				daysOnTrail,
				statsSource: "position",
				activities: [],
				positionM: furthest.distM,
			},
			{
				headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
			},
		);
	},
);
