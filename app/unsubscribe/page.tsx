"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function UnsubscribeContent() {
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

	useEffect(() => {
		if (!token) {
			setStatus("error");
			return;
		}
		fetch(`/api/subscribe?token=${encodeURIComponent(token)}`, {
			method: "DELETE",
		})
			.then((r) => setStatus(r.ok ? "done" : "error"))
			.catch(() => setStatus("error"));
	}, [token]);

	return (
		<div className="bg-card border border-line rounded-2xl p-[18px]">
			{status === "loading" && (
				<p className="text-muted text-sm">Unsubscribing...</p>
			)}
			{status === "done" && (
				<p className="text-sm">
					You've been unsubscribed and won't receive any more emails.
				</p>
			)}
			{status === "error" && (
				<p className="text-sm text-danger">
					Something went wrong. The link may have already been used.
				</p>
			)}
		</div>
	);
}

export default function UnsubscribePage() {
	return (
		<main className="max-w-[980px] mx-auto px-4 pt-12 pb-15">
			<div className="max-w-[420px] mx-auto">
				<h1 className="text-2xl font-black mb-6 text-center">Unsubscribe</h1>
				<Suspense fallback={<p className="text-muted text-sm">Loading...</p>}>
					<UnsubscribeContent />
				</Suspense>
				<p className="text-center mt-4 text-xs text-muted">
					<Link href="/" className="text-accent">
						PCT Tracker
					</Link>
				</p>
			</div>
		</main>
	);
}
