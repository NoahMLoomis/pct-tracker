"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { TrailUpdate } from "@/lib/types";

function fmtDate(ts: string) {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "\u2014";
  }
}

function SubscribeForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to subscribe.");
        setStatus("error");
      } else {
        setStatus("done");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="bg-card border border-line rounded-2xl p-[18px]">
        <p className="text-sm">
          You're subscribed! You'll get an email when new updates are posted.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-line rounded-2xl p-[18px]">
      <div className="font-bold mb-1">Get email updates</div>
      <p className="text-muted text-xs mb-3">
        Enter your email to be notified when new trail updates are posted.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="flex-1 min-w-[160px] px-2.5 py-2 rounded-[10px] border border-line bg-[rgba(255,255,255,0.04)] text-text text-sm"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-4 py-2 rounded-[10px] border border-[rgba(126,231,135,0.35)] text-text bg-[rgba(126,231,135,0.1)] hover:bg-[rgba(126,231,135,0.18)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm shrink-0"
        >
          {status === "loading" ? "..." : "Subscribe"}
        </button>
      </form>
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </div>
  );
}

export default function UpdatesPage() {
  const { slug } = useParams<{ slug: string }>();
  const [updates, setUpdates] = useState<TrailUpdate[] | null>(null);

  useEffect(() => {
    fetch(`/api/updates/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        setUpdates(data);
        requestAnimationFrame(() => {
          const hash = window.location.hash.slice(1);
          if (hash) {
            document
              .getElementById(hash)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      })
      .catch(() => setUpdates([]));
  }, [slug]);

  if (updates === null) {
    return (
      <div className="max-w-[760px] mx-auto px-4 py-4">
        <div className="mb-3.5 bg-card border border-line rounded-2xl px-4 py-3.5 text-[22px] font-[850] tracking-[0.2px]">
          Trail Updates
        </div>
        <div className="bg-card border border-line rounded-2xl p-[18px]">
          <div className="text-muted">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-4 py-4">
      <div className="flex flex-col lg:flex-row gap-3.5 items-start">
        <div className="flex-1 w-full min-w-0 grid gap-3.5">
          <div className="bg-card border border-line rounded-2xl px-4 py-3.5 text-[22px] font-[850] tracking-[0.2px]">
            Trail Updates
          </div>
          {updates.length === 0 ? (
            <div className="bg-card border border-line rounded-2xl p-[18px]">
              <div className="text-muted">
                No trail updates yet. Check back soon!
              </div>
            </div>
          ) : (
            updates.map((u) => (
              <div
                key={u.id}
                id={u.id}
                className="bg-card-light border border-line rounded-2xl px-4 py-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)] overflow-hidden min-w-0"
              >
                <div className="text-lg font-black text-[rgba(232,238,245,0.95)] mb-1.5">
                  {fmtDate(u.created_at)}
                </div>
                <div className="font-bold text-lg mt-1">{u.title}</div>
                <div className="text-[rgba(232,238,245,0.88)] leading-relaxed mt-2.5 whitespace-pre-wrap break-words">
                  {u.body}
                </div>
                {u.photo_url && (
                  <div className="relative mt-3.5 w-full max-w-lg mx-auto aspect-[4/3]">
                    <Image
                      src={u.photo_url}
                      alt={u.title}
                      fill
                      className="rounded-xl border border-line object-cover"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="w-full lg:w-[340px] lg:sticky lg:top-4 shrink-0 order-first lg:order-last">
          <SubscribeForm slug={slug} />
        </div>
      </div>
    </div>
  );
}
