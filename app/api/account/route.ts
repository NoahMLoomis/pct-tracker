import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { withLogging } from "@/lib/with-logging";

export const DELETE = withLogging(async (_req: NextRequest) => {
	const session = await getSession();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const supabase = createServiceClient();

	const { error } = await supabase
		.from("users")
		.delete()
		.eq("id", session.userId);

	if (error) {
		return NextResponse.json(
			{ error: "Failed to delete account." },
			{ status: 500 },
		);
	}

	const cookieStore = await cookies();
	cookieStore.delete("pct_session");

	return NextResponse.json({ ok: true });
});
