## TODO 
- Add a feature request button -> Github "Feature: xxx"
- Would it be possible, instead of getting the activity stats, to use only the last position, then calculate the stats from that using the NOBO or SOBO to determine starting point? This could reduce even further the requests made to strava
- Add metadata for SEO
- Verify phone usability

## Possible blockers:

- Vercel / Supabase limiting - could pass by the free tier. Would have to look at using a VPS instead, and could always forgo supabase with an actual postgres server.

- ~~Strava API usage - 200 requests every 15 minutes, with up to 2,000 requests per day~~ Approved for 999 users!

## Roadmap

### Priority 1
- **Photo support** — Allow users to attach photos to updates
- **GPX file upload** — Allow users to upload their own GPX files instead of having to use strava.
- **Elevation profile chart** — Display an elevation chart of the PCT showing the hiker's current position
- **Multiple trail support** — Expand beyond the PCT to support other long-distance trails (AT, CDT, etc.)

### Completed
- **Email notifications** — Let followers subscribe to a hiker's tracker and receive email updates when new trail updates are posted
- **NOBO/SOBO direction support** — Users can select hiking direction, map shows completed vs remaining sections
- **Trail updates with map pins** — Hikers can post journal entries with optional locations that appear as clickable pins
- **Browser geolocation for updates** — Location picker auto-detects the user's position
- **Static PCT trail display** — Replaced per-activity GPS rendering with a static GeoJSON trail line
- **Lightweight Strava sync** — Switched from full GPS streams to lightweight activity summaries (~5 API calls vs ~255)
