import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { snapToTrail } from "@/lib/pct-filter";

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	const { slug } = await params;
	const supabase = createServiceClient();

	const { data: user } = await supabase
		.from("users")
		.select("id, direction, strava_athlete_id")
		.eq("slug", slug)
		.single();

	if (!user) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const direction = user.direction || "NOBO";

	// Strava users: use latest_position table (populated by activity sync)
	if (user.strava_athlete_id != null) {
		const { data: pos } = await supabase
			.from("latest_position")
			.select("lat, lon, activity_date")
			.eq("user_id", user.id)
			.single();

		if (!pos) {
			return NextResponse.json({ lat: 0, lon: 0, ts: "", direction });
		}

		return NextResponse.json(
			{ lat: pos.lat, lon: pos.lon, ts: pos.activity_date || "", direction },
			{ headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } },
		);
	}

	// Non-Strava users: use latest trail update that has a location
	const { data: update } = await supabase
		.from("trail_updates")
		.select("lat, lon, created_at")
		.eq("user_id", user.id)
		.not("lat", "is", null)
		.not("lon", "is", null)
		.order("created_at", { ascending: false })
		.limit(1)
		.single();

	if (!update) {
		return NextResponse.json({ lat: 0, lon: 0, ts: "", direction });
	}

	const snapped = snapToTrail(update.lat as number, update.lon as number);

	return NextResponse.json(
		{ lat: snapped.lat, lon: snapped.lon, ts: update.created_at, direction },
		{ headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } },
	);
}
