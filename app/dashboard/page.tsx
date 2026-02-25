import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export const metadata = {
	title: "Dashboard - PCT Tracker",
};

export default async function DashboardPage() {
	const session = await getSession();
	if (!session) redirect("/login");

	const supabase = createServiceClient();

	const { data: user } = await supabase
		.from("users")
		.select("*")
		.eq("id", session.userId)
		.single();

	if (!user) redirect("/login");

	const { data: syncState } = await supabase
		.from("sync_state")
		.select("*")
		.eq("user_id", session.userId)
		.single();

	const { data: updates } = await supabase
		.from("trail_updates")
		.select("id, user_id, title, body, lat, lon, photo_url, created_at")
		.eq("user_id", session.userId)
		.order("created_at", { ascending: false });

	const normalizedUpdates = (updates || []).map((u) => ({
		...u,
		photo_url: u.photo_url ?? null,
		created_at: new Date(u.created_at).toISOString(),
	}));

	const formattedSyncState = syncState
		? {
				...syncState,
				last_sync_at: syncState.last_sync_at
					? new Date(syncState.last_sync_at)
							.toISOString()
							.replace("T", " ")
							.slice(0, 19) + " UTC"
					: null,
			}
		: null;

	return (
		<main className="max-w-[980px] mx-auto px-4 pt-8">
			<h1 className="text-2xl font-black mb-5">Dashboard</h1>
			<DashboardClient
				user={user}
				syncState={formattedSyncState}
				initialUpdates={normalizedUpdates}
			/>
		</main>
	);
}
