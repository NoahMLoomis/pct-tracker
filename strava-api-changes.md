# Strava API Changes — Action Plan

App launched ~April 2026, so API calls have been running before and after the June 1 and June 30 deadlines.

## Urgent: Subscription Required (deadline already passed)

The June 30, 2026 cutoff requiring existing Standard Tier developers to have a Strava subscription **has passed**. If the free trial from the email (code `583c9242fd`) was redeemed at June 1, it expires around September 1 — meaning there's roughly one month left before a paid subscription is required to keep API access active.

## Priority Checklist

| Priority | Action | Deadline |
|---|---|---|
| **Urgent** | Redeem free Strava subscription or subscribe | Already past June 30 |
| **September 2026** | Ensure subscription is active/renewed | ~Sept 1 (free trial ends) |
| **June 2027** | Update `API_BASE` URL in `app/lib/strava.ts:4` | June 1, 2027 |
| **June 2027** | Audit for any `oauth/deauthorize` calls | June 1, 2027 |

## Code Changes Required (June 1, 2027)

### 1. Update API base URL — `app/lib/strava.ts:4`

```ts
// Current
const API_BASE = "https://www.strava.com/api/v3";
// Must become
const API_BASE = "https://www.api-v3.strava.com";
```

### 2. Token-in-header — already compliant

`fetchActivities` already sends `Authorization: Bearer <token>` in request headers (`strava.ts:80`). No change needed.

### 3. Check for `oauth/deauthorize`

If any account-unlinking flow calls `oauth/deauthorize`, it must switch to `oauth/revoke` by June 1, 2027. (Not found in current codebase.)

## Not Affected

- **Club/Segments endpoint deprecations** (Sept 2026) — app only calls `/athlete/activities`
- **Intermediary platform restriction** — app calls Strava directly
