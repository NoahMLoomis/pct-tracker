"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { SyncState, TrailUpdate, User } from "@/lib/types";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
	ssr: false,
});

const inputCls =
	"block w-full mt-1 px-2.5 py-2 rounded-[10px] border border-line bg-card text-text";

interface DashboardClientProps {
	user: User;
	syncState: SyncState | null;
	initialUpdates: TrailUpdate[];
}

export default function DashboardClient({
	user,
	syncState,
	initialUpdates,
}: DashboardClientProps) {
	const [direction, setDirection] = useState<"NOBO" | "SOBO">(
		user.direction || "NOBO",
	);
	const [hikeStartDate, setHikeStartDate] = useState(
		user.hike_start_date || new Date().toISOString().slice(0, 10),
	);
	const [hikeEndDate, setHikeEndDate] = useState(user.hike_end_date || "");
	const [lighterpackUrl, setLighterpackUrl] = useState(
		user.lighterpack_url || "",
	);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [syncResult, setSyncResult] = useState<string | null>(null);
	const [syncing, setSyncing] = useState(false);

	const [savedStartDate] = useState(user.hike_start_date || "");
	const [savedEndDate] = useState(user.hike_end_date || "");

	const [updates, setUpdates] = useState<TrailUpdate[]>(initialUpdates);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [addLocation, setAddLocation] = useState(false);
	const [lat, setLat] = useState<number | null>(null);
	const [lon, setLon] = useState<number | null>(null);
	const [updSaving, setUpdSaving] = useState(false);
	const [updError, setUpdError] = useState<string | null>(null);

	const [slug, setSlug] = useState(user.slug || "");

	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const handleSave = async () => {
		setSaveError(null);
		setSyncResult(null);
		if (hikeStartDate.length <= 0) {
			setSaveError("hike start date required.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/settings", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					direction,
					hike_start_date: hikeStartDate,
					hike_end_date: hikeEndDate || null,
					lighterpack_url: lighterpackUrl || null,
					slug: slug.trim() || undefined,
				}),
			});
			if (!res.ok) {
				const data = await res.json();
				setSaveError(data.error || "Save failed.");
				setSaving(false);
				return;
			}

			if (slug.trim() && slug.trim() !== user.slug) {
				window.location.reload();
				return;
			}

			const datesChanged =
				hikeStartDate !== savedStartDate ||
				(hikeEndDate || "") !== savedEndDate;
			if (datesChanged && user.strava_athlete_id != null) {
				setSyncResult("Syncing activities...");
				try {
					const syncRes = await fetch("/api/sync", { method: "POST" });
					const syncData = await syncRes.json();
					if (syncRes.ok) {
						setSyncResult(
							`Saved & synced! ${syncData.added} new activities added.`,
						);
					} else {
						setSyncResult(`Saved, but sync failed: ${syncData.error}`);
					}
				} catch {
					setSyncResult("Saved, but sync failed. Try again later.");
				}
			}
		} catch {
			setSaveError("Save failed. Please try again.");
		}
		setSaving(false);
	};

	const handleManualSync = async () => {
		setSyncing(true);
		setSyncResult(null);
		try {
			const syncRes = await fetch("/api/sync", { method: "POST" });
			const syncData = await syncRes.json();
			if (syncRes.ok) {
				setSyncResult(`Synced! ${syncData.added} new activities added.`);
			} else {
				setSyncResult(`Sync failed: ${syncData.error}`);
			}
		} catch {
			setSyncResult("Sync failed. Try again later.");
		}
		setSyncing(false);
	};

	const resetUpdateForm = () => {
		setEditingId(null);
		setTitle("");
		setBody("");
		setAddLocation(false);
		setLat(null);
		setLon(null);
		setUpdError(null);
	};

	const handleEditClick = (u: TrailUpdate) => {
		setEditingId(u.id);
		setTitle(u.title);
		setBody(u.body);
		if (u.lat != null && u.lon != null) {
			setAddLocation(true);
			setLat(u.lat);
			setLon(u.lon);
		} else {
			setAddLocation(false);
			setLat(null);
			setLon(null);
		}
		setUpdError(null);
	};

	const handleUpdateSubmit = async () => {
		if (!title.trim() || !body.trim()) {
			setUpdError("Title and body are required.");
			return;
		}
		setUpdSaving(true);
		setUpdError(null);
		try {
			const payload: Record<string, unknown> = {
				action: editingId ? "update" : "create",
				title: title.trim(),
				body: body.trim(),
				lat: addLocation ? lat : null,
				lon: addLocation ? lon : null,
			};
			if (editingId) payload.id = editingId;

			const res = await fetch("/api/updates", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const data = await res.json();
				setUpdError(data.error || "Save failed.");
			} else {
				if (editingId) {
					setUpdates((prev) =>
						prev.map((u) =>
							u.id === editingId
								? {
										...u,
										title: title.trim(),
										body: body.trim(),
										lat: addLocation ? lat : null,
										lon: addLocation ? lon : null,
									}
								: u,
						),
					);
				} else {
					const created = await res.json();
					setUpdates((prev) => [created, ...prev]);
				}
				resetUpdateForm();
			}
		} catch {
			setUpdError("Save failed. Please try again.");
		}
		setUpdSaving(false);
	};

	const handleDelete = async (id: string) => {
		if (!window.confirm("Delete this update?")) return;
		try {
			const res = await fetch("/api/updates", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "delete", id }),
			});
			if (res.ok) {
				setUpdates((prev) => prev.filter((u) => u.id !== id));
				if (editingId === id) resetUpdateForm();
			}
		} catch {}
	};

	const handleDeleteAccount = async () => {
		setDeleting(true);
		setDeleteError(null);
		try {
			const res = await fetch("/api/account", { method: "DELETE" });
			if (!res.ok) {
				const data = await res.json();
				setDeleteError(data.error || "Failed to delete account.");
				setDeleting(false);
				return;
			}
			window.location.href = "/";
		} catch {
			setDeleteError("Something went wrong. Please try again.");
			setDeleting(false);
		}
	};

	const dirBtnCls = (active: boolean) =>
		`inline-block no-underline px-5 py-2.5 rounded-full border cursor-pointer font-semibold ${
			active
				? "bg-accent text-[#0d1117] border-accent font-bold"
				: "bg-card text-text border-line"
		}`;

	return (
		<div className="grid gap-3.5 max-w-[600px]">
			<div className="bg-card border border-line rounded-2xl p-[18px]">
				<p className="mt-2">
					<strong>{user.display_name}</strong>
				</p>
				{user.email && <p className="text-muted text-xs mt-1">{user.email}</p>}
				<p className="mt-3">
					Public tracker url:{" "}
					<a
						href={`/tracker/${user.slug}`}
						target="_blank"
						className="text-accent"
					>
						{process.env.NEXT_PUBLIC_BASE_URL}/tracker/{user.slug}
					</a>
				</p>
			</div>

			<div className="bg-card border border-line rounded-2xl p-[18px]">
				<div className="font-bold mb-1.5">Settings</div>
				<div className="grid gap-3 mt-3">
					<div>
						<span className="text-muted text-xs">Direction *</span>
						<div className="flex gap-2 mt-1.5">
							<button
								type="button"
								onClick={() => setDirection("NOBO")}
								className={dirBtnCls(direction === "NOBO")}
							>
								NOBO
							</button>
							<button
								type="button"
								onClick={() => setDirection("SOBO")}
								className={dirBtnCls(direction === "SOBO")}
							>
								SOBO
							</button>
						</div>
					</div>
					<label>
						<span className="text-muted text-xs">Hike Start Date *</span>
						<input
							type="date"
							value={hikeStartDate}
							required
							onChange={(e) => setHikeStartDate(e.target.value)}
							className={inputCls}
						/>
						<p className="text-muted text-xs mt-1.5 leading-relaxed">
							Activities will be synced from this date until the end date (or 6
							months after if no end date is set).
						</p>
					</label>
					<label>
						<span className="text-muted text-xs">Hike End Date</span>
						<input
							type="date"
							value={hikeEndDate}
							onChange={(e) => setHikeEndDate(e.target.value)}
							className={inputCls}
						/>
						<p className="text-muted text-xs mt-1.5 leading-relaxed">
							Optional. Leave blank to default to 6 months after the start date.
						</p>
					</label>
					<div>
						<label>
							<span className="text-muted text-xs">Lighterpack code</span>
							<input
								type="text"
								value={lighterpackUrl}
								onChange={(e) => setLighterpackUrl(e.target.value)}
								placeholder="e52c1t"
								className={inputCls}
							/>
						</label>
						<p className="text-muted text-xs mt-1.5 leading-relaxed">
							To get your shareable link, open your list on lighterpack.com,
							hover over the <strong className="text-text">Share</strong> button
							in the top-right, and copy the code after the{" "}
							<code>&quot;id=&quot;</code>
							<br />
							Ex: <code>&quot;...div id=&quot;e52c1t&quot;</code>, e52c1t would
							be the code
						</p>
					</div>
					<div className="mt-1 grid gap-3">
						<label>
							<span className="text-muted text-xs">URL Slug</span>
							<input
								type="text"
								value={slug}
								onChange={(e) => {
									setSlug(e.target.value.toLowerCase());
								}}
								placeholder="your-slug"
								className={inputCls}
							/>
						</label>
						<p className="text-muted text-xs mt-1.5">
							Your public tracker URL: {process.env.NEXT_PUBLIC_BASE_URL}
							/tracker/
							<strong className="text-text">{slug || "your-slug"}</strong>
						</p>
					</div>

					<button
						type="button"
						onClick={handleSave}
						disabled={saving || hikeStartDate.length <= 0 || syncing}
						className="inline-block no-underline px-5 py-2.5 rounded-full border border-[rgba(126,231,135,0.35)] text-text bg-[rgba(126,231,135,0.1)] hover:bg-[rgba(126,231,135,0.18)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed justify-self-start"
					>
						{saving ? "Saving..." : "Save Settings"}
					</button>
					{saveError && <p className="text-sm text-danger">{saveError}</p>}
				</div>
			</div>

			<div className="bg-card border border-line rounded-2xl p-[18px]">
				<div className="font-bold mb-1.5">Strava</div>
				{user.strava_athlete_id != null ? (
					<div className="grid gap-3 mt-3">
						<p className="text-sm">
							<span className="inline-block px-2 py-0.5 rounded-full bg-[rgba(126,231,135,0.12)] border border-[rgba(126,231,135,0.3)] text-accent text-xs mr-2">
								Connected
							</span>
							Athlete ID: {user.strava_athlete_id}
						</p>
						<p className="text-muted text-xs leading-relaxed">
							Your Strava activities are synced automatically. You can also
							trigger a manual sync below.
						</p>
						<button
							type="button"
							onClick={handleManualSync}
							disabled={syncing || saving}
							className="inline-block no-underline px-5 py-2.5 rounded-full border border-[rgba(126,231,135,0.35)] text-text bg-[rgba(126,231,135,0.1)] hover:bg-[rgba(126,231,135,0.18)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed justify-self-start"
						>
							{syncing
								? "Syncing... this could take a few minutes"
								: "Sync Strava"}
						</button>
						{syncResult && <p className="text-sm">{syncResult}</p>}
						<p className="text-muted text-xs">
							Last sync: {syncState?.last_sync_at || "Never"}
							{syncState?.status && syncState.status !== "idle"
								? ` (${syncState.status})`
								: ""}
						</p>
					</div>
				) : (
					<div className="grid gap-3 mt-3">
						<p className="text-muted text-xs leading-relaxed">
							Link your Strava account to automatically sync PCT activities and
							get accurate distance, elevation, and speed stats.
						</p>
						<a
							href="/api/auth/strava/link"
							className="inline-block no-underline px-5 py-2.5 rounded-full border border-[rgba(252,76,2,0.4)] text-text bg-[rgba(252,76,2,0.1)] hover:bg-[rgba(252,76,2,0.18)] cursor-pointer justify-self-start"
						>
							Link Strava Account
						</a>
					</div>
				)}
			</div>

			<div className="bg-card border border-line rounded-2xl p-[18px]">
				<div className="font-bold mb-1.5">
					{editingId ? "Edit Update" : "New Trail Update"}
				</div>
				<div className="grid gap-3 mt-3">
					<label>
						<span className="text-muted text-xs">Title *</span>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className={inputCls}
						/>
					</label>
					<label>
						<span className="text-muted text-xs">
							Body *{" "}
							<span className={body.length > 500 ? "text-danger" : ""}>
								({body.length}/500)
							</span>
						</span>
						<textarea
							value={body}
							onChange={(e) => setBody(e.target.value)}
							rows={5}
							maxLength={500}
							className={`${inputCls} resize-y`}
						/>
					</label>
					<div>
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={addLocation}
								onChange={(e) => {
									setAddLocation(e.target.checked);
									if (!e.target.checked) {
										setLat(null);
										setLon(null);
									}
								}}
								className="accent-accent"
							/>
							<span className="text-muted text-xs">Add location</span>
						</label>
						{addLocation && (
							<>
								<p className="text-muted text-xs mt-1.5">
									Click the map to drop a pin.
								</p>
								<LocationPicker
									lat={lat}
									lon={lon}
									onChange={(la, lo) => {
										setLat(la);
										setLon(lo);
									}}
								/>
							</>
						)}
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleUpdateSubmit}
							disabled={updSaving || !title.trim() || !body.trim()}
							className="inline-block no-underline px-5 py-2.5 rounded-full border border-[rgba(126,231,135,0.35)] text-text bg-[rgba(126,231,135,0.1)] hover:bg-[rgba(126,231,135,0.18)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{updSaving
								? "Saving..."
								: editingId
									? "Save Changes"
									: "Post Update"}
						</button>
						{editingId && (
							<button
								type="button"
								onClick={resetUpdateForm}
								className="inline-block px-5 py-2.5 rounded-full bg-card border border-line cursor-pointer"
							>
								Cancel
							</button>
						)}
					</div>
					{updError && <p className="text-sm text-danger">{updError}</p>}
				</div>

				{updates.length > 0 && (
					<div className="mt-5 border-t border-line pt-4">
						<div className="text-muted text-xs mb-2.5">Your Updates</div>
						<div className="grid gap-2.5">
							{updates.map((u) => (
								<div
									key={u.id}
									className="px-3 py-2.5 rounded-[10px] bg-[rgba(255,255,255,0.03)] border border-line"
								>
									<div className="flex justify-between items-start gap-2">
										<div>
											<div className="font-bold">{u.title}</div>
											<div className="text-muted text-xs mt-0.5">
												{u.created_at.slice(0, 10)}
												{u.lat != null &&
													u.lon != null &&
													" \u00B7 Has location"}
											</div>
											<div className="text-muted text-xs mt-1">
												{u.body.length > 120
													? u.body.slice(0, 120) + "..."
													: u.body}
											</div>
										</div>
										<div className="flex gap-1.5 shrink-0">
											<button
												type="button"
												onClick={() => handleEditClick(u)}
												className="px-2.5 py-1 rounded-lg border border-line bg-card text-text cursor-pointer text-[13px]"
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() => handleDelete(u.id)}
												className="px-2.5 py-1 rounded-lg border border-line bg-card text-danger cursor-pointer text-[13px]"
											>
												Delete
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			<div className="bg-card border border-[rgba(248,81,73,0.3)] rounded-2xl p-[18px]">
				<div className="font-bold mb-1.5 text-danger">Danger Zone</div>
				{!confirmDelete ? (
					<div className="grid gap-3 mt-3">
						<p className="text-muted text-xs leading-relaxed">
							Permanently delete your account, all trail updates, stats, and
							subscriber data. This cannot be undone.
						</p>
						<button
							type="button"
							onClick={() => setConfirmDelete(true)}
							className="inline-block px-5 py-2.5 rounded-full border border-[rgba(248,81,73,0.4)] text-danger bg-[rgba(248,81,73,0.08)] hover:bg-[rgba(248,81,73,0.15)] cursor-pointer justify-self-start"
						>
							Delete Account
						</button>
					</div>
				) : (
					<div className="grid gap-3 mt-3">
						<p className="text-sm leading-relaxed">
							Are you sure? This will permanently delete your account and all
							associated data.
						</p>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={handleDeleteAccount}
								disabled={deleting}
								className="inline-block px-5 py-2.5 rounded-full border border-[rgba(248,81,73,0.4)] text-danger bg-[rgba(248,81,73,0.08)] hover:bg-[rgba(248,81,73,0.15)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{deleting ? "Deleting..." : "Yes, delete my account"}
							</button>
							<button
								type="button"
								onClick={() => {
									setConfirmDelete(false);
									setDeleteError(null);
								}}
								disabled={deleting}
								className="inline-block px-5 py-2.5 rounded-full bg-card border border-line cursor-pointer disabled:opacity-50"
							>
								Cancel
							</button>
						</div>
						{deleteError && (
							<p className="text-sm text-danger">{deleteError}</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
