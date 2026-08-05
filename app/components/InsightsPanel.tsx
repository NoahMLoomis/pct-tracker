"use client";

import type { TrailStats } from "@/lib/types";

const MI_PER_M = 0.000621371;
const KM_PER_M = 0.001;
const PCT_TOTAL_MI = 2650;
const PCT_TOTAL_KM = PCT_TOTAL_MI * 1.609344;

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
	if (d) parts.push(`${d} Day${d === 1 ? "" : "s"}`);
	if (h) parts.push(`${h} h`);
	parts.push(`${m} min`);
	return parts.join(" ");
}
function fmtDateShort(ts: string) {
	try {
		return new Date(ts).toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "2-digit",
		});
	} catch {
		return "\u2014";
	}
}

interface DayItem {
	distM: number;
	timeS: number | null;
	dateLabel: string;
}

function computeInsights(stats: TrailStats) {
	const totalKm = stats.totalDistanceM * KM_PER_M;
	const totalMi = stats.totalDistanceM * MI_PER_M;
	// Progress % always tracks the furthest point reached along the trail
	// (same value driving the map's green line), not total miles walked.
	const positionM = stats.positionM ?? stats.totalDistanceM;
	const positionMi = positionM * MI_PER_M;
	const pctCompleted = (positionMi / PCT_TOTAL_MI) * 100;
	const remainingMi = Math.max(0, PCT_TOTAL_MI - positionMi);
	const remainingKm = remainingMi * 1.609344;

	const days = new Set<string>();
	let firstTs: number | null = null;
	let lastTs: number | null = null;
	let longest: DayItem | null = null;
	let shortest: DayItem | null = null;

	for (const a of stats.activities) {
		const sd = a.start_date || "";
		if (sd) {
			days.add(sd.slice(0, 10));
			const ts = Date.parse(sd);
			if (Number.isFinite(ts)) {
				if (firstTs === null || ts < firstTs) firstTs = ts;
				if (lastTs === null || ts > lastTs) lastTs = ts;
			}
		}

		const d = a.distance_m;
		if (Number.isFinite(d) && d > 0) {
			const item: DayItem = {
				distM: d,
				timeS: Number.isFinite(a.moving_time_s) ? a.moving_time_s : null,
				dateLabel: sd ? fmtDateShort(sd) : "\u2014",
			};
			if (!longest || d > longest.distM) longest = item;
			if (!shortest || d < shortest.distM) shortest = item;
		}
	}

	const activeDays = days.size;
	let restDays: number | null = null;
	if (firstTs !== null && lastTs !== null) {
		const span = Math.floor((lastTs - firstTs) / 86400000) + 1;
		restDays = Math.max(0, span - activeDays);
	}

	return {
		totalKm,
		totalMi,
		pctCompleted,
		remainingKm,
		remainingMi,
		firstTs,
		lastTs,
		activeDays,
		restDays,
		longest,
		shortest,
	};
}

function DayChip({ label, item }: { label: string; item: DayItem | null }) {
	if (!item) {
		return (
			<div className="bg-chip border border-chip-border rounded-2xl p-3">
				<div className="text-xs text-stat-label mb-1.5 flex items-center gap-2">
					{label}
				</div>
				<div className="text-base font-black text-stat-value leading-none">
					{"\u2014"}
				</div>
			</div>
		);
	}
	const km = item.distM * KM_PER_M;
	const mi = item.distM * MI_PER_M;
	return (
		<div className="bg-chip border border-chip-border rounded-2xl p-3">
			<div className="text-xs text-stat-label mb-1.5 flex items-center gap-2">
				{label}
			</div>
			<div className="text-base font-black text-stat-value leading-none">
				{fmtNumber(km, 1)} km
			</div>
			<div className="mt-1.5 text-xs text-day-meta font-bold">
				{fmtNumber(mi, 1)} mi &middot;{" "}
				{item.timeS != null ? fmtDuration(item.timeS) : "\u2014"}
			</div>
			<div className="mt-1.5 text-xs text-day-date font-semibold">
				{item.dateLabel}
			</div>
		</div>
	);
}

interface InsightsPanelProps {
	stats: TrailStats | null;
}

export default function InsightsPanel({ stats }: InsightsPanelProps) {
	if (!stats) return null;
	const s = computeInsights(stats);

	const pctTxt = Number.isFinite(s.pctCompleted)
		? `${fmtNumber(s.pctCompleted, 1)}%`
		: "\u2014%";
	const pctWidth = Math.max(
		0,
		Math.min(100, Number.isFinite(s.pctCompleted) ? s.pctCompleted : 0),
	);

	return (
		<div className="bg-card border border-line rounded-2xl p-[18px]">
			<div className="font-bold mb-1">Insights</div>
			<div className="grid gap-2.5">
				<div className="bg-chip border border-chip-border rounded-2xl px-3 py-2.5">
					<div className="font-black text-[13px] tracking-[0.2px] text-[rgba(245,248,255,0.9)] mb-2">
						Progress
					</div>
					<div className="grid gap-1.5">
						<div className="grid grid-cols-[1fr_auto] gap-2.5 text-[13px] text-stat-row">
							<span>PCT completed</span>
							<b className="text-stat-row-bold font-extrabold">
								{pctTxt} &middot; {fmtNumber(s.totalKm, 1)} km of{" "}
								{fmtInt(PCT_TOTAL_KM)} km &middot; {fmtNumber(s.totalMi, 1)} mi
								of {fmtInt(PCT_TOTAL_MI)} mi
							</b>
						</div>
						<div
							className="h-2 rounded-full bg-progress-track border border-progress-border overflow-hidden mt-2"
							aria-label="PCT progress"
						>
							<div
								className="pct-progressfill"
								style={{ width: `${pctWidth}%` }}
							/>
						</div>
						<div className="grid grid-cols-[1fr_auto] gap-2.5 text-[13px] text-stat-row mt-1.5">
							<span>Remaining</span>
							<b className="text-stat-row-bold font-extrabold">
								{fmtNumber(s.remainingKm, 1)} km / {fmtNumber(s.remainingMi, 1)}{" "}
								mi
							</b>
						</div>
					</div>

					<div className="bg-chip border border-chip-border rounded-2xl px-3 py-2.5 mt-2.5">
						<div className="font-black text-[13px] tracking-[0.2px] text-[rgba(245,248,255,0.9)] mb-2">
							Timeline
						</div>
						<div className="grid gap-1.5">
							<div className="grid grid-cols-[1fr_auto] gap-2.5 text-[13px] text-stat-row">
								<span>First activity</span>
								<b className="text-stat-row-bold font-extrabold">
									{s.firstTs != null
										? new Date(s.firstTs).toLocaleDateString()
										: "\u2014"}
								</b>
							</div>
							<div className="grid grid-cols-[1fr_auto] gap-2.5 text-[13px] text-stat-row">
								<span>Last activity</span>
								<b className="text-stat-row-bold font-extrabold">
									{s.lastTs != null
										? new Date(s.lastTs).toLocaleDateString()
										: "\u2014"}
								</b>
							</div>
							<div className="grid grid-cols-[1fr_auto] gap-2.5 text-[13px] text-stat-row">
								<span>Days</span>
								<b className="text-stat-row-bold font-extrabold">
									{s.activeDays || 0} active days
									{s.restDays != null ? ` \u00B7 ${s.restDays} rest days` : ""}
								</b>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-2 max-[680px]:grid-cols-1 gap-2.5 mt-2.5">
						<DayChip label="Longest Day" item={s.longest} />
						<DayChip label="Shortest Day" item={s.shortest} />
					</div>
				</div>
			</div>
		</div>
	);
}
