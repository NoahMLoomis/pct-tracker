"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputCls =
  "block w-full mt-1 px-2.5 py-2 rounded-[10px] border border-line bg-card text-text";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
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
          <Link
            href="/"
            className="font-[750] tracking-tight no-underline text-text"
          >
            PCT Tracker
          </Link>
          <nav className="flex gap-2 shrink-0">
            <Link
              href="/faq"
              className="no-underline text-muted px-2.5 py-2 rounded-full border border-line bg-[rgba(17,22,28,0.35)]"
            >
              FAQ
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-[980px] mx-auto px-4 pt-12 pb-15">
        <div className="max-w-[420px] mx-auto">
          <h1 className="text-2xl font-black mb-6 text-center">Sign in</h1>

          <div className="bg-card border border-line w-full rounded-2xl p-[18px] mb-3.5">
            <div className="font-bold mb-3">Continue with Strava</div>
            <a
              href="/api/auth/strava"
              className="inline-block text-center no-underline w-full px-5 py-2.5 rounded-full border border-[rgba(126,231,135,0.35)] text-white bg-[rgba(126,231,135,0.1)] hover:bg-[rgba(126,231,135,0.18)] cursor-pointer no-underline"
            >
              Connect Strava
            </a>
          </div>

          <div className="flex items-center gap-3 my-3.5">
            <div className="flex-1 border-t border-line" />
            <span className="text-muted text-xs">or</span>
            <div className="flex-1 border-t border-line" />
          </div>

          <div className="bg-card border border-line rounded-2xl p-[18px]">
            <div className="font-bold mb-3">Sign in with email</div>
            <form onSubmit={handleSubmit} className="grid gap-3">
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
              <label>
                <span className="text-muted text-xs">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={inputCls}
                />
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="inline-block no-underline px-5 py-2.5 rounded-full border border-[rgba(126,231,135,0.35)] text-text bg-[rgba(126,231,135,0.1)] hover:bg-[rgba(126,231,135,0.18)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
            <div className="flex justify-between mt-4 text-xs text-muted">
              <Link href="/register" className="text-accent">
                Create account
              </Link>
              <Link href="/forgot-password" className="text-accent">
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
