"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputCls =
	"block w-full mt-1 px-2.5 py-2 rounded-[10px] border border-line bg-card text-text";

export default function RegisterPage() {
	const router = useRouter();
	const [displayName, setDisplayName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (password !== confirm) {
			setError("Passwords do not match.");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch("/api/auth/email/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password, displayName }),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Registration failed.");
			} else {
				router.push("/dashboard");
			}
		} catch {
			setError("Something went wrong. Please try again.");
		}
		setLoading(false);
	};

	return (
		<>
			<header className="sticky top-0 z-[1000] backdrop-blur-md bg-[rgba(11,14,17,0.75)] border-b border-line">
				<div className="max-w-[980px] mx-auto px-4 flex items-center justify-between gap-3 py-3.5">
					<Link href="/" className="font-[750] tracking-tight no-underline text-text">
						PCT Tracker
					</Link>
				</div>
			</header>

			<main className="max-w-[980px] mx-auto px-4 pt-12 pb-15">
				<div className="max-w-[420px] mx-auto">
					<h1 className="text-2xl font-black mb-6 text-center">Create account</h1>

					<div className="bg-card border border-line rounded-2xl p-[18px]">
						<form onSubmit={handleSubmit} className="grid gap-3">
							<label>
								<span className="text-muted text-xs">Display name *</span>
								<input
									type="text"
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
									required
									placeholder="Jane Doe"
									autoComplete="name"
									className={inputCls}
								/>
								<p className="text-muted text-xs mt-1">
									Used on your public tracker page and to generate your URL.
								</p>
							</label>
							<label>
								<span className="text-muted text-xs">Email *</span>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									autoComplete="email"
									className={inputCls}
								/>
							</label>
							<label>
								<span className="text-muted text-xs">Password *</span>
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
								<span className="text-muted text-xs">Confirm password *</span>
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
								{loading ? "Creating account..." : "Create account"}
							</button>
						</form>
						<p className="text-xs text-muted mt-4">
							Already have an account?{" "}
							<Link href="/login" className="text-accent">
								Sign in
							</Link>
						</p>
					</div>
				</div>
			</main>
		</>
	);
}
