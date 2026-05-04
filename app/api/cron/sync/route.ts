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
	const { data: users } = await supabase.from("users").select("id");

	if (!users?.length) {
		return NextResponse.json({ synced: 0 });
	}

	const results: { userId: string; added?: number; error?: string }[] = [];

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
