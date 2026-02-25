"use client";

import { useState } from "react";
import Link from "next/link";

const inputCls =
	"block w-full mt-1 px-2.5 py-2 rounded-[10px] border border-line bg-card text-text";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		const res = await fetch("/api/auth/email/forgot-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});
		if (!res.ok) {
			const data = await res.json();
			setError(data.error || "Something went wrong.");
		} else {
			setSubmitted(true);
		}
		setLoading(false);
	};

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
						Reset password
					</h1>

					<div className="bg-card border border-line rounded-2xl p-[18px]">
						{submitted ? (
							<div>
								<p className="text-sm leading-relaxed">
									If an account exists for <strong>{email}</strong>, you'll
									receive a reset link shortly. Check your inbox (and spam
									folder).
								</p>
								<Link
									href="/login"
									className="inline-block mt-4 text-accent text-sm"
								>
									Back to sign in
								</Link>
							</div>
						) : (
							<form onSubmit={handleSubmit} className="grid gap-3">
								<p className="text-muted text-sm">
									Enter your email and we'll send you a link to reset your
									password.
								</p>
								<label>
									<span className="text-muted text-xs">Email</span>
									<input
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										autoComplete="email"
										className={inputCls}
									/>
								</label>
								{error && (
									<p className="text-sm text-danger">
										{error}{" "}
										{error.includes("Strava") && (
											<a href="/login" className="text-accent underline">
												Go to login
											</a>
										)}
									</p>
								)}
								<button
									type="submit"
									disabled={loading}
									className="inline-block no-underline px-5 py-2.5 rounded-full border border-[rgba(126,231,135,0.35)] text-text bg-[rgba(126,231,135,0.1)] hover:bg-[rgba(126,231,135,0.18)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loading ? "Sending..." : "Send reset link"}
								</button>
								<Link href="/login" className="text-accent text-xs">
									Back to sign in
								</Link>
							</form>
						)}
					</div>
				</div>
			</main>
		</>
	);
}
