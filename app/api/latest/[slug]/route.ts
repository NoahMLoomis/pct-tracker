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
			.select("id, direction, strava_athlete_id")
			.eq("slug", slug)
			.single();

		if (!user) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}

		const direction = user.direction || "NOBO";

		// Furthest point reached from any source — Strava-synced activities or
		// manual trail_update posts, whichever is further along the trail.
		const furthest = await getFurthestPosition(supabase, user.id, direction);

		if (!furthest) {
			return NextResponse.json({ lat: 0, lon: 0, ts: "", direction });
		}

		return NextResponse.json(
			{
				lat: furthest.lat,
				lon: furthest.lon,
				ts: furthest.ts || "",
				direction,
			},
			{
				headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
			},
		);
	},
);
