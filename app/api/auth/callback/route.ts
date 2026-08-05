import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createSession, sessionCookieOptions } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { withLogging } from "@/lib/with-logging";

const SECRET = new TextEncoder().encode(
	process.env.SESSION_SECRET || "dev-secret-change-me",
);

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export const GET = withLogging(async (request: NextRequest) => {
	const code = request.nextUrl.searchParams.get("code");
	const stateParam = request.nextUrl.searchParams.get("state");

	if (!code) {
		return NextResponse.redirect(new URL("/", request.nextUrl.origin));
	}

	const tokenRes = await fetch("https://www.strava.com/oauth/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: process.env.STRAVA_CLIENT_ID!,
			client_secret: process.env.STRAVA_CLIENT_SECRET!,
			code,
			grant_type: "authorization_code",
		}),
	});

	if (!tokenRes.ok) {
		return NextResponse.json(
			{ error: "Token exchange failed" },
			{ status: 500 },
		);
	}

	const tok = await tokenRes.json();
	const athlete = tok.athlete;
	const supabase = createServiceClient();

	// Check if this is a link flow (logged-in user linking Strava to their account)
	if (stateParam) {
		try {
			const { payload } = await jwtVerify(stateParam, SECRET);
			const state = payload as unknown as { type: string; userId: string };

			if (state.type === "link" && state.userId) {
				// Ensure this Strava account isn't already claimed
				const { data: claimed } = await supabase
					.from("users")
					.select("id")
					.eq("strava_athlete_id", athlete.id)
					.single();

				if (claimed && claimed.id !== state.userId) {
					return NextResponse.redirect(
						new URL(
							"/dashboard?error=strava_already_linked",
							request.nextUrl.origin,
						),
					);
				}

				await supabase
					.from("users")
					.update({
						strava_athlete_id: athlete.id,
						strava_access_token: tok.access_token,
						strava_refresh_token: tok.refresh_token,
						strava_token_expires_at: new Date(
							tok.expires_at * 1000,
						).toISOString(),
						updated_at: new Date().toISOString(),
					})
					.eq("id", state.userId);

				// Ensure sync_state row exists and clear any prior error, so a
				// user stuck in "error" (e.g. revoked token) is picked up by the
				// cron job again after relinking.
				await supabase
					.from("sync_state")
					.upsert(
						{ user_id: state.userId, status: "idle", error_message: null },
						{ onConflict: "user_id" },
					);

				return NextResponse.redirect(
					new URL("/dashboard", request.nextUrl.origin),
				);
			}
		} catch {
			// Invalid/expired state — fall through to normal login flow
		}
	}

	// Normal Strava login flow
	const displayName =
		`${athlete.firstname || ""} ${athlete.lastname || ""}`.trim() || "Hiker";
	const baseSlug = slugify(displayName);

	const { data: existingUser } = await supabase
		.from("users")
		.select("id, slug")
		.eq("strava_athlete_id", athlete.id)
		.single();

	let userId: string;

	if (existingUser) {
		await supabase
			.from("users")
			.update({
				strava_access_token: tok.access_token,
				strava_refresh_token: tok.refresh_token,
				strava_token_expires_at: new Date(tok.expires_at * 1000).toISOString(),
				display_name: displayName,
				updated_at: new Date().toISOString(),
			})
			.eq("id", existingUser.id);

		// Reset sync_state so the cron picks this user up again
		await supabase
			.from("sync_state")
			.upsert(
				{ user_id: existingUser.id, status: "idle", error_message: null },
				{ onConflict: "user_id" },
			);

		userId = existingUser.id;
	} else {
		let slug = baseSlug;
		let attempt = 0;
		while (true) {
			const { data: conflict } = await supabase
				.from("users")
				.select("id")
				.eq("slug", slug)
				.single();

			if (!conflict) break;
			attempt++;
			slug = `${baseSlug}-${attempt}`;
		}

		const { data: newUser, error } = await supabase
			.from("users")
			.insert({
				strava_athlete_id: athlete.id,
				display_name: displayName,
				slug,
				hike_start_date: new Date().toISOString().slice(0, 10),
				strava_access_token: tok.access_token,
				strava_refresh_token: tok.refresh_token,
				strava_token_expires_at: new Date(tok.expires_at * 1000).toISOString(),
			})
			.select("id")
			.single();

		if (error || !newUser) {
			logger.error("strava user creation failed", { error: error?.message });
			return NextResponse.json(
				{ error: "Failed to create user" },
				{ status: 500 },
			);
		}

		userId = newUser.id;
		await supabase.from("sync_state").insert({ user_id: userId });
	}

	const token = await createSession(userId);
	const response = NextResponse.redirect(
		new URL("/dashboard", request.nextUrl.origin),
	);
	response.cookies.set(sessionCookieOptions(token));

	return response;
});
