import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getSession } from "@/lib/session";
import { withLogging } from "@/lib/with-logging";

const SECRET = new TextEncoder().encode(
	process.env.SESSION_SECRET || "dev-secret-change-me",
);

export const GET = withLogging(async (request: NextRequest) => {
	const session = await getSession();
	if (!session) {
		return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
	}

	const state = await new SignJWT({
		type: "link",
		userId: session.userId,
	} as unknown as Record<string, unknown>)
		.setProtectedHeader({ alg: "HS256" })
		.setExpirationTime("10m")
		.sign(SECRET);

	const params = new URLSearchParams({
		client_id: process.env.STRAVA_CLIENT_ID!,
		response_type: "code",
		redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`,
		scope: "activity:read_all",
		approval_prompt: "auto",
		state,
	});

	return NextResponse.redirect(
		`https://www.strava.com/oauth/authorize?${params.toString()}`,
	);
});
