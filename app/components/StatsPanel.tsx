"use client";

import type { TrailStats } from "@/lib/types";

const MI_PER_M = 0.000621371;
const KM_PER_M = 0.001;
const FT_PER_M = 3.28084;

function fmtNumber(n: number, digits = 1) {
	if (!Number.isFinite(n)) return "\u2014";
	return n.toLocaleString(undefined, {
		maximumFractionDigits: digits,
		minimumFractionDigits: digits,
	});
}
function fmtInt(n: number) {
	if (!Number.isFinite(n)) return "\u2014";
	return Math.round(n).toLocaleString();
}
function fmtDuration(sec: number) {
	if (!Number.isFinite(sec) || sec <= 0) return "\u2014";
	const s = Math.floor(sec);
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	const parts: string[] = [];
	if (d > 0) parts.push(`${d} Day${d === 1 ? "" : "s"}`);
	if (h > 0) parts.push(`${h} h`);
	parts.push(`${m} min`);
	return parts.join(" ");
}

interface StatsPanelProps {
	stats: TrailStats | null;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
	if (!stats) return null;

	const isPosition = stats.statsSource === "position";
	const totalKm = stats.totalDistanceM * KM_PER_M;
	const totalMi = stats.totalDistanceM * MI_PER_M;
	const hours = stats.totalMovingTimeS / 3600;

	const elevMain =
		stats.totalElevationGainM > 0
			? `${fmtInt(stats.totalElevationGainM)} m`
			: "\u2014";
	const elevSub =
		stats.totalElevationGainM > 0
			? `${fmtInt(stats.totalElevationGainM * FT_PER_M)} ft`
			: "";

	// Position-based: avg distance per day; Strava: avg distance per activity
	const avgDistKm = isPosition
		? stats.daysOnTrail && stats.daysOnTrail > 0
			? totalKm / stats.daysOnTrail
			: null
		: stats.activityCount
			? totalKm / stats.activityCount
			: null;
	const avgDistMi = isPosition
		? stats.daysOnTrail && stats.daysOnTrail > 0
			? totalMi / stats.daysOnTrail
			: null
		: stats.activityCount
			? totalMi / stats.activityCount
			: null;

	const avgKmh = !isPosition && hours > 0 ? totalKm / hours : null;
	const avgMph = !isPosition && hours > 0 ? totalMi / hours : null;

	return (
		<div className="bg-card border border-line rounded-2xl p-[18px]">
			<div className="font-bold mb-1">Stats</div>
			<div className="grid gap-2.5">
				<div className="bg-hero border border-hero-border rounded-2xl p-3.5">
					<div className="text-xs tracking-[0.2px] text-stat-label mb-1.5">
						Total Distance
					</div>
					<div className="flex flex-wrap items-baseline gap-2.5">
						<div className="text-[26px] font-black text-stat-primary leading-none">
							{fmtNumber(totalKm, 1)} km
						</div>
						<div className="text-sm text-stat-secondary font-bold">
							{fmtNumber(totalMi, 1)} mi
						</div>
					</div>
					{isPosition && (
						<div className="text-xs text-stat-label mt-1">
							Estimated from trail position
						</div>
					)}
				</div>

				<div className="grid grid-cols-2 max-[680px]:grid-cols-1 gap-2.5">
					<div className="bg-chip border border-chip-border rounded-2xl p-3">
						<div className="text-xs text-stat-label mb-1.5 flex items-center gap-2">
							Total Elevation
						</div>
						<div className="text-base font-black text-stat-value leading-none">
							{elevMain}
						</div>
						<div className="mt-1 text-[13px] text-stat-sub font-bold">
							{elevSub}
						</div>
					</div>

					<div className="bg-chip border border-chip-border rounded-2xl p-3">
						<div className="text-xs text-stat-label mb-1.5 flex items-center gap-2">
							{isPosition ? "Days on Trail" : "Total Time"}
						</div>
						<div className="text-base font-black text-stat-value leading-none">
							{isPosition
								? stats.daysOnTrail != null
									? `${stats.daysOnTrail} day${stats.daysOnTrail === 1 ? "" : "s"}`
									: "\u2014"
								: fmtDuration(stats.totalMovingTimeS)}
						</div>
						<div className="mt-1 text-[13px] text-stat-sub font-bold">
							{!isPosition && stats.activityCount
								? `${stats.activityCount} activities`
								: ""}
						</div>
					</div>

					<div className="bg-chip border border-chip-border rounded-2xl p-3">
						<div className="text-xs text-stat-label mb-1.5 flex items-center gap-2">
							{isPosition ? "Avg Distance / Day" : "Avg Distance / Activity"}
						</div>
						<div className="text-base font-black text-stat-value leading-none">
							{avgDistKm != null ? `${fmtNumber(avgDistKm, 1)} km` : "\u2014"}
						</div>
						<div className="mt-1 text-[13px] text-stat-sub font-bold">
							{avgDistMi != null ? `${fmtNumber(avgDistMi, 1)} mi` : ""}
						</div>
					</div>

					<div className="bg-chip border border-chip-border rounded-2xl p-3">
						<div className="text-xs text-stat-label mb-1.5 flex items-center gap-2">
							Avg Speed
						</div>
						<div className="text-base font-black text-stat-value leading-none">
							{avgKmh != null ? `${fmtNumber(avgKmh, 1)} km/h` : "\u2014"}
						</div>
						<div className="mt-1 text-[13px] text-stat-sub font-bold">
							{avgMph != null ? `${fmtNumber(avgMph, 1)} mi/h` : ""}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
