export interface User {
	id: string;
	strava_athlete_id: number | null;
	email: string | null;
	display_name: string;
	slug: string;
	hike_start_date: string;
	hike_end_date: string | null;
	direction: "NOBO" | "SOBO";
	lighterpack_url: string | null;
	strava_access_token: string | null;
	strava_refresh_token: string | null;
	strava_token_expires_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface SyncState {
	user_id: string;
	last_sync_at: string | null;
	status: "idle" | "syncing" | "error";
}

export interface LatestPosition {
	lat: number;
	lon: number;
	ts: string;
}

export interface TrailStats {
	totalDistanceM: number;
	totalMovingTimeS: number;
	totalElevationGainM: number;
	activityCount: number;
	firstDate: string | null;
	lastDate: string | null;
	daysOnTrail: number | null;
	statsSource: "strava" | "position";
	positionM: number | null;
	activities: {
		start_date: string;
		distance_m: number;
		moving_time_s: number;
		elevation_gain_m: number;
	}[];
}

export interface TrailUpdate {
	id: string;
	user_id: string;
	title: string;
	body: string;
	lat: number | null;
	lon: number | null;
	photo_url: string | null;
	created_at: string;
}

export interface SessionPayload {
	userId: string;
	exp: number;
}
