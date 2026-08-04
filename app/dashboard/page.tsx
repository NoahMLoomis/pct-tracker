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

	const showBanner = new Date() < new Date("2026-08-13");

	return (
		<main className="max-w-[980px] mx-auto px-4 pt-8">
			{showBanner && (
				<div className="max-w-[600px] mb-5 px-4 py-3 rounded-xl bg-[rgba(126,231,135,0.12)] border border-[rgba(126,231,135,0.3)] text-sm leading-relaxed">
					Someone messaged me on reddit to tell me the Strava integration has been broken! Strava updated their API and the solution I had wasn&apos;t working. It should be fixed now. <br/><br/>If it still isn&apos;t working, or if there&apos;s any other bugs,{" "}
					<a href="mailto:noah.loomis@me.com" className="text-[rgba(126,231,135,0.9)] hover:text-[rgba(126,231,135,1)] transition-colors">
						let me know!
					</a>
          <br/><br/>This banner will be removed on 2026-08-13, but you can always report a bug using the "Report a bug" link<br/><br/>Happy Hiking<br/>- Coach
				</div>
			)}
			<div className="flex items-center justify-between mb-5 max-w-[600px]">
				<h1 className="text-2xl font-black">Dashboard</h1>
				<a
					href="mailto:noah.loomis@me.com"
					className="no-underline text-sm text-[rgba(232,238,245,0.4)] hover:text-[rgba(232,238,245,0.65)] transition-colors"
				>
					Report a bug
				</a>
			</div>
			<DashboardClient
				user={user}
				syncState={formattedSyncState}
				initialUpdates={normalizedUpdates}
			/>
		</main>
	);
}
