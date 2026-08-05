import { type NextRequest, NextResponse } from "next/server";
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

	// Retry everyone every run, including users whose last sync ended in
	// error (token revoked / expired) — the cron only runs once a day, so
	// that cadence already keeps a permanently-broken token from being
	// retried more than once daily without needing extra backoff logic here.
	const results: { userId: string; added?: number; error?: string }[] = [];

	for (const user of stravaUsers) {
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
