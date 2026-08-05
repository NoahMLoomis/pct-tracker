# Cost-reduction plan: move off Supabase + Vercel to a single self-hosted VPS

## Context

The goal is to get ahead of future hosting costs before the app's usage grows,
rather than reacting once a bill shows up. Current stack: Supabase (Postgres +
file storage), Vercel (Next.js hosting + 1 daily cron job), Resend (transactional
email). Initial instinct: Supabase → PocketBase, Resend stays, Vercel replacement
undecided. Decision made: willing to take on VPS ops work to get the lowest
possible cost.

**Actual current usage (verified live via Supabase MCP against project 2026-08-05):**
- Supabase org plan: **Free** ($0/mo currently)
- Postgres DB size: **13 MB** (free limit: 500 MB)
- Storage (`update-photos` bucket): **25 MB across 95 files** (free limit: 1 GB)
- 54 users, 1,145 `activity_stats` rows, 116 `trail_updates`, 934 `error_logs` rows
- Free-tier "pause after 7 days idle" risk is already avoided — the daily
  `/api/cron/sync` job touches the DB every day, keeping the project warm.

**Runway before Supabase/Vercel would force a paid plan** (extrapolated from the
numbers above, not exact):
- **Storage (1 GB cap) is the tightest constraint.** 95 photos ≈ 263 KB avg. Many
  current users are still early in their hike and haven't posted much yet — a
  full season's worth of photos per user (~15-20) would be ~4-5 MB/user, so the
  1 GB cap is plausibly reached somewhere around **200-400 fully-active users**,
  well before the DB or egress caps bite.
- DB (500 MB cap): at ~240 KB/user currently, ~2,000+ users before hitting it.
- Egress (5 GB/mo free): usage-pattern dependent (repeat tracker-page viewers),
  hard to pin down, but Vercel's own Image Optimization caching at the edge
  keeps repeat-viewer egress from Supabase bounded to unique images.
- **Vercel Hobby** (100 GB transfer, 1M function invocations/mo) has far more
  headroom than Supabase storage at this app's traffic pattern — realistically
  not a near-term constraint. Its real limitation is a **non-commercial ToS
  clause**, not usage.
- **Bottom line: no forced cost is imminent** — likely a full hiking season or
  more of runway. This migration is proactive, not urgent, which means it's safe
  to do carefully rather than rushed.

## Recommended target stack

One VPS (**Hetzner CX23, ~$4.49/mo** — 4 vCPU, 4 GB RAM, 40 GB SSD, 20 TB
traffic — confirmed current pricing) running, via Docker Compose:
- **Next.js app** (same codebase, containerized)
- **PocketBase** (single Go binary) replacing *both* Supabase Postgres and
  Supabase Storage — PocketBase stores structured data in SQLite and can store
  uploaded files directly on collection records, so photos no longer need a
  separate S3/R2 bucket at all.
- **Caddy** as reverse proxy for automatic HTTPS (replaces Vercel's edge/TLS).
- **Resend stays unchanged** — it's accessed purely via HTTPS API calls from
  the app, independent of where the app is hosted; already cheap (3,000
  emails/mo free, 100/day cap) and plenty for this app's transactional volume.
- The existing daily sync cron becomes a Linux cron entry / systemd timer that
  hits an internal endpoint — no need to rewrite `syncUser`'s logic into
  PocketBase JS hooks.

This was chosen over two other viable options given the "self-host everything"
ops tolerance in exchange for the lowest cost:
- *Self-host Supabase itself* (Docker stack) would require **zero app code
  changes** but needs 4-8 GB RAM (~$10-20/mo VPS) to run its 10+ containers —
  more expensive and heavier to operate for what this app actually uses
  (no Realtime, no Supabase Auth, no Edge Functions — just Postgres + Storage).
- *Neon (managed Postgres) + Cloudflare R2 + keep Vercel* avoids VPS ops
  entirely and stays on generous free tiers, but requires the same database-
  layer rewrite as PocketBase anyway (Neon has no PostgREST, so the existing
  `supabase-js` query-builder calls would still all need rewriting to raw SQL)
  — so it has comparable code effort to PocketBase but costs more once paid
  tiers kick in and doesn't remove separate file-storage billing.

## Why the code-migration effort is smaller than it looks

The app **does not use Supabase Auth** — login/register/reset-password/sessions
are already fully custom (`bcryptjs` password hashing + `jose` JWTs in
`app/api/auth/email/*`, `app/lib/session.ts`). This is the part of a typical
Supabase migration that usually hurts most, and it's already a non-issue here:
PocketBase's built-in auth collection type isn't needed — the `users` table
just becomes a plain PocketBase collection, keeping today's auth flow untouched.

## Migration scope

**Files that call `createServiceClient()` / `supabase-js` and need their query
calls ported to the PocketBase JS SDK** (grep confirmed this is the full list):
`app/api/account/route.ts`, `app/api/auth/callback/route.ts`,
`app/api/auth/email/{forgot-password,login,register,reset-password}/route.ts`,
`app/api/cron/sync/route.ts`, `app/api/latest/[slug]/route.ts`,
`app/api/settings/route.ts`, `app/api/stats/[slug]/route.ts`,
`app/api/subscribe/route.ts`, `app/api/updates/route.ts`,
`app/api/updates/[slug]/route.ts`, `app/api/updates/upload/route.ts`,
`app/dashboard/page.tsx`, `app/lib/{logger,progress,strava,sync}.ts`,
`app/lib/supabase/{client,server}.ts` (becomes `app/lib/pocketbase/*`),
`app/tracker/[slug]/layout.tsx`. Every call follows the same
`.from("table").select(...).eq(...)` / `.upsert(...)` pattern, so this is
repetitive-but-mechanical work, not novel design per file.

**Schema**: `schema.sql`'s 9 tables (`users`, `sync_state`, `activity_stats`,
`latest_position`, `trail_updates`, `password_reset_tokens`, `subscriptions`,
`error_logs`, and the already-dead `activities` table — see security note
below) map to 8 PocketBase collections (drop `activities`, it's unused with 0
rows).

**Storage**: `app/api/updates/upload/route.ts` (`supabase.storage.from(...).upload/getPublicUrl`)
becomes a PocketBase file-field upload on the `trail_updates` record. Update
`next.config.ts`'s `images.remotePatterns` from the Supabase URL to the new
PocketBase file URL pattern (`/api/files/{collection}/{recordId}/{filename}`).

**One-time data migration**: 54 users / ~2,300 total rows and 95 photos (25 MB)
— small enough for a simple one-off script (export via SQL, re-insert through
the PocketBase admin API; re-upload photos from their current public Supabase
URLs).

**Deployment**: replace Vercel's git-push auto-deploy with a small GitHub
Actions workflow that SSHs into the VPS and runs `docker compose up -d --build`.

## Verification

- After porting each file, run `npx tsc --noEmit` and the existing Vitest suite
  (`npx vitest run`) — the trail-math logic in `app/lib/pct-filter.ts` is
  storage-agnostic and shouldn't need changes.
- Stand up the VPS stack in parallel with the live Supabase/Vercel deployment
  (different subdomain), migrate a copy of the data, and manually walk through:
  register, login, Strava OAuth link, post an update with a photo, dashboard
  stats, `/tracker/[slug]` map rendering, and the daily sync cron firing once
  via manual trigger — before cutting DNS over.
- Keep the Supabase project (still free) alive read-only for a week after
  cutover as a rollback safety net before deciding whether to delete it.

## Security note (found during this investigation, unrelated to the migration)

Supabase's advisor flagged that **`public.activities` has Row Level Security
disabled**, exposing it to anyone with the anon key. It appears to be an unused
legacy table (0 rows, not referenced anywhere in the current codebase per grep).
Recommend either dropping the table or running
`ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;` — not applied here
since this was a read-only planning session and it's outside this task's scope,
but should be fixed regardless of the migration decision.
