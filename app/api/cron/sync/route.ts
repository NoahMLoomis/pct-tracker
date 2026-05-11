import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/sync";
import { withLogging } from "@/lib/with-logging";

export const GET = withLogging(async (request: NextRequest) => {
	const authHeader = request.headers.get("authorization");
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const supabase = createServiceClient();

	// Only sync users that have a Strava connection
	const { data: stravaUsers } = await supabase
		.from("users")
		.select("id")
		.not("strava_athlete_id", "is", null);

	if (!stravaUsers?.length) {
		return NextResponse.json({ synced: 0 });
	}

	// Skip users whose last sync ended in error (token revoked / expired)
	const { data: errorStates } = await supabase
		.from("sync_state")
		.select("user_id")
		.eq("status", "error");

	const errorUserIds = new Set((errorStates || []).map((s) => s.user_id));
	const users = stravaUsers.filter((u) => !errorUserIds.has(u.id));

	const results: { userId: string; added?: number; error?: string; skippedReason?: string }[] = [];

	for (const id of errorUserIds) {
		results.push({ userId: id, skippedReason: "sync_state is error" });
	}

	for (const user of users) {
		try {
			const result = await syncUser(user.id);
			results.push({ userId: user.id, added: result.added });
		} catch (err) {
			results.push({
				userId: user.id,
				error: err instanceof Error ? err.message : "Unknown error",
			});
		}
		await new Promise((r) => setTimeout(r, 2000));
	}

	return NextResponse.json({ synced: results.length, results });
});
