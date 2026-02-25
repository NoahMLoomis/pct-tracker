import { createServiceClient } from "./supabase/server";

const TOKEN_URL = "https://www.strava.com/oauth/token";
const API_BASE = "https://www.strava.com/api/v3";

export async function refreshAccessToken(userId: string): Promise<string> {
	const supabase = createServiceClient();

	const { data: user } = await supabase
		.from("users")
		.select(
			"strava_refresh_token, strava_access_token, strava_token_expires_at",
		)
		.eq("id", userId)
		.single();

	if (!user) throw new Error("User not found");

	if (user.strava_token_expires_at) {
		const expiresAt = new Date(user.strava_token_expires_at).getTime();
		if (Date.now() < expiresAt - 60_000) {
			return user.strava_access_token;
		}
	}

	const res = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: process.env.STRAVA_CLIENT_ID!,
			client_secret: process.env.STRAVA_CLIENT_SECRET!,
			grant_type: "refresh_token",
			refresh_token: user.strava_refresh_token,
		}),
	});

	if (!res.ok) {
		throw new Error(`Strava token refresh failed: ${res.status}`);
	}

	const tok = await res.json();

	await supabase
		.from("users")
		.update({
			strava_access_token: tok.access_token,
			strava_refresh_token: tok.refresh_token,
			strava_token_expires_at: new Date(tok.expires_at * 1000).toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq("id", userId);

	return tok.access_token;
}

export interface StravaActivity {
	id: number;
	name: string;
	start_date: string;
	distance: number;
	moving_time: number;
	type: string;
	total_elevation_gain: number;
	start_latlng: [number, number] | null;
	end_latlng: [number, number] | null;
}

export async function fetchActivities(
	accessToken: string,
	after?: number,
	before?: number,
): Promise<StravaActivity[]> {
	const all: StravaActivity[] = [];
	for (let page = 1; page <= 10; page++) {
		const params = new URLSearchParams({ per_page: "100", page: String(page) });
		if (after != null) params.set("after", String(after));
		if (before != null) params.set("before", String(before));
		const res = await fetch(
			`${API_BASE}/athlete/activities?${params.toString()}`,
			{ headers: { Authorization: `Bearer ${accessToken}` } },
		);
		if (!res.ok)
			throw new Error(`Strava activities fetch failed: ${res.status}`);
		const batch: StravaActivity[] = await res.json();
		if (!batch.length) break;
		all.push(...batch);
	}
	return all;
}
