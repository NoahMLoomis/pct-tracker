import { NextRequest, NextResponse } from "next/server";
import { withLogging } from "@/lib/with-logging";

export const GET = withLogging(async (_req: NextRequest) => {
	const params = new URLSearchParams({
		client_id: process.env.STRAVA_CLIENT_ID!,
		response_type: "code",
		redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
		scope: "activity:read_all",
		approval_prompt: "auto",
	});

	return NextResponse.redirect(
		`https://www.strava.com/oauth/authorize?${params.toString()}`,
	);
});
