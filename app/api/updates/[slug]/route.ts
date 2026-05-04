import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { withLogging } from "@/lib/with-logging";

export const GET = withLogging(async (
	_request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) => {
	const { slug } = await params;
	const supabase = createServiceClient();

	const { data: user } = await supabase
		.from("users")
		.select("id")
		.eq("slug", slug)
		.single();

	if (!user) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const { data: updates } = await supabase
		.from("trail_updates")
		.select("id, user_id, title, body, lat, lon, photo_url, created_at")
		.eq("user_id", user.id)
		.order("created_at", { ascending: false });

	return NextResponse.json(updates || [], {
		headers: {
			"Cache-Control": "s-maxage=300, stale-while-revalidate=60",
		},
	});
});
