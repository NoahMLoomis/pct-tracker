#!/usr/bin/env npx tsx
/**
 * Usage:
 *   npx tsx scripts/test-strava.ts <label:refresh_token> [<label:refresh_token> ...]
 *
 * Example:
 *   npx tsx scripts/test-strava.ts "alice:abc123token" "bob:def456token"
 *
 * Reads STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET from .env
 * Tests: token refresh → /athlete profile → /athlete/activities (first page)
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually (no dotenv dependency needed)
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
  } catch {
    // .env not found — rely on existing env vars
  }
}

loadEnv();

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const TOKEN_URL = "https://www.strava.com/oauth/token";
const API_BASE = "https://www.strava.com/api/v3";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET in env");
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error(
    "Usage: npx tsx scripts/test-strava.ts <label:refresh_token> [...]"
  );
  process.exit(1);
}

interface AthleteArg {
  label: string;
  refreshToken: string;
}

function parseArg(arg: string): AthleteArg {
  const colonIdx = arg.indexOf(":");
  if (colonIdx === -1) {
    return { label: arg.slice(0, 8) + "…", refreshToken: arg };
  }
  return { label: arg.slice(0, colonIdx), refreshToken: arg.slice(colonIdx + 1) };
}

async function refreshToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${body}`);
  }

  const tok = await res.json();
  return tok.access_token as string;
}

async function getProfile(accessToken: string): Promise<{ id: number; firstname: string; lastname: string }> {
  const res = await fetch(`${API_BASE}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`/athlete failed (${res.status})`);
  return res.json();
}

async function getRecentActivities(accessToken: string): Promise<number> {
  const res = await fetch(`${API_BASE}/athlete/activities?per_page=5&page=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`/athlete/activities failed (${res.status})`);
  const activities = await res.json();
  return activities.length;
}

async function testAthlete({ label, refreshToken: rt }: AthleteArg) {
  console.log(`\n── ${label} ──`);

  let accessToken: string;
  try {
    accessToken = await refreshToken(rt);
    console.log("  ✓ Token refresh");
  } catch (err) {
    console.error(`  ✗ Token refresh: ${(err as Error).message}`);
    return;
  }

  try {
    const profile = await getProfile(accessToken);
    console.log(`  ✓ Profile: ${profile.firstname} ${profile.lastname} (id ${profile.id})`);
  } catch (err) {
    console.error(`  ✗ Profile: ${(err as Error).message}`);
    return;
  }

  try {
    const count = await getRecentActivities(accessToken);
    console.log(`  ✓ Activities: ${count} returned in first page`);
  } catch (err) {
    console.error(`  ✗ Activities: ${(err as Error).message}`);
  }
}

(async () => {
  const athletes = args.map(parseArg);
  console.log(`Testing ${athletes.length} athlete(s) against Strava API...`);
  for (const athlete of athletes) {
    await testAthlete(athlete);
  }
  console.log("\nDone.");
})();
