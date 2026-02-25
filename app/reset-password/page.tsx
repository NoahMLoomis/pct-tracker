"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const inputCls =
	"block w-full mt-1 px-2.5 py-2 rounded-[10px] border border-line bg-card text-text";

function ResetPasswordForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [done, setDone] = useState(false);

	if (!token) {
		return (
			<p className="text-sm text-danger">
				Invalid reset link.{" "}
				<Link href="/forgot-password" className="text-accent">
					Request a new one.
				</Link>
			</p>
		);
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (password !== confirm) {
			setError("Passwords do not match.");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch("/api/auth/email/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, newPassword: password }),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Reset failed.");
			} else {
				setDone(true);
				setTimeout(() => router.push("/login"), 2000);
			}
		} catch {
			setError("Something went wrong. Please try again.");
		}
		setLoading(false);
	};

	if (done) {
		return (
			<p className="text-sm">Password updated. Redirecting to sign in...</p>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="grid gap-3">
			<label>
				<span className="text-muted text-xs">New password</span>
				<input
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					minLength={8}
					autoComplete="new-password"
					className={inputCls}
				/>
				<p className="text-muted text-xs mt-1">Minimum 8 characters.</p>
			</label>
			<label>
				<span className="text-muted text-xs">Confirm new password</span>
				<input
					type="password"
					value={confirm}
					onChange={(e) => setConfirm(e.target.value)}
					required
					autoComplete="new-password"
					className={inputCls}
				/>
			</label>
			{error && <p className="text-sm text-danger">{error}</p>}
			<button
				type="submit"
				disabled={loading}
				className="inline-block no-underline px-5 py-2.5 rounded-full border border-[rgba(126,231,135,0.35)] text-text bg-[rgba(126,231,135,0.1)] hover:bg-[rgba(126,231,135,0.18)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? "Updating..." : "Set new password"}
			</button>
		</form>
	);
}

export default function ResetPasswordPage() {
	return (
		<>
			<header className="sticky top-0 z-[1000] backdrop-blur-md bg-[rgba(11,14,17,0.75)] border-b border-line">
				<div className="max-w-[980px] mx-auto px-4 flex items-center justify-between gap-3 py-3.5">
					<Link
						href="/"
						className="font-[750] tracking-tight no-underline text-text"
					>
						PCT Tracker
					</Link>
				</div>
			</header>

			<main className="max-w-[980px] mx-auto px-4 pt-12 pb-15">
				<div className="max-w-[420px] mx-auto">
					<h1 className="text-2xl font-black mb-6 text-center">
						Set new password
					</h1>
					<div className="bg-card border border-line rounded-2xl p-[18px]">
						<Suspense
							fallback={<p className="text-muted text-sm">Loading...</p>}
						>
							<ResetPasswordForm />
						</Suspense>
					</div>
				</div>
			</main>
		</>
	);
}
