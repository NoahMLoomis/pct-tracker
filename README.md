# PCT Tracker

A multi-user Pacific Crest Trail tracker built with Next.js, Supabase, and MapLibre. Sign up with email/password or connect your Strava account to get a live map of your PCT progress with stats, trail updates, email subscriptions for followers, and a shareable public tracker page.

Most of this app was built in a weekend with Claude Code.

## Prerequisites

- Node.js 18+
- pnpm (`npm i -g pnpm`)
- A [Supabase](https://supabase.com) project
- A [Strava API application](https://www.strava.com/settings/api) *(optional — for Strava sync)*
- A [Resend](https://resend.com) account with a verified domain *(for password reset and subscriber emails)*

## Getting Started

1. **Clone the repo**

   ```bash
   git clone git@github.com:NoahMLoomis/pct-tracker.git 
   cd pct-tracker
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Copy the env.example file and fill in your values:

   ```bash
   cp .env.example .env
   ```

   | Variable | Description |
   |----------|-------------|
   | `SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
   | `SESSION_SECRET` | Random string (32+ chars) for signing session JWTs |
   | `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` for local dev, production URL for deployment |
   | `RESEND_API_KEY` | From your [Resend](https://resend.com) dashboard |
   | `RESEND_FROM_EMAIL` | Sender address on your verified Resend domain (e.g. `noreply@mail.yourdomain.com`) |
   | `STRAVA_CLIENT_ID` | From your Strava API application *(optional)* |
   | `STRAVA_CLIENT_SECRET` | From your Strava API application *(optional)* |
   | `CRON_SECRET` | Protects the `/api/cron/sync` endpoint *(optional, required if using Strava sync)* |

4. **Run database migrations**

   Apply the Supabase migrations in `supabase/migrations/` to your project:

   ```bash
   npx supabase db push
   ```

5. **Start the dev server**

   ```bash
   pnpm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deployment

The app is designed to deploy on [Vercel](https://vercel.com). Set the same environment variables from `.env.example` in your Vercel project settings, with `NEXT_PUBLIC_BASE_URL` set to your production URL.

The cron sync endpoint (`/api/cron/sync`) can be triggered by Vercel Cron or any external scheduler using the `CRON_SECRET` for auth.

## Notes

The develop branch exists because vercel automatically re-deploys any pushes on main. So when deployment is ready, merge develop into main and vercel should auto deploy

## Shoutouts
This project would not have happended without the reddit user r/Fickle_Bed8196 [post](https://www.reddit.com/r/PacificCrestTrail/comments/1r24p0x) or work on [his app](https://www.reddit.com/r/PacificCrestTrail/comments/1r24p0x).

[Derek Carr's](https://www.dcarr.com/) 2025 PCT GPX file also made my job much easier 
