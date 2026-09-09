# Free Time

Propose a group activity, have everyone in the party mark when they're free across a date
range, and get the best overlapping time scheduled straight to Google Calendar with invites
sent to the whole group. Movie-night activities also get a simple suggest-and-vote list for
picking what to watch (via TMDB search).

## Stack

Next.js (App Router) + TypeScript, Prisma + PostgreSQL, Auth.js (Google sign-in, reused for
Calendar OAuth), Tailwind + shadcn/ui, Zod, date-fns / date-fns-tz, Vitest.

## Prerequisites

- Node.js 20+, pnpm (`npm install -g pnpm` if you don't have it)
- Docker, for a local Postgres instance (or point `DATABASE_URL` at a hosted Postgres like
  [Neon](https://neon.tech) instead)
- A Google Cloud project with the Calendar API enabled (see below)
- A free [TMDB](https://www.themoviedb.org/settings/api) API key, for movie search/posters

## Google Cloud setup (one-time, manual)

1. Create a Google Cloud project and enable the **Google Calendar API**
   (APIs & Services → Library).
2. Configure the **OAuth consent screen**: External user type, add these scopes:
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.freebusy`

   While the app is unverified ("Testing" mode), only up to 100 explicitly-added **test users**
   (by Google account email) can sign in — add yourself and any friends you want to try it with
   under "Test users." This is fine for a friend group; going past 100 users or wanting a
   smoother consent screen requires Google's verification review.
3. Create **OAuth 2.0 Client ID** credentials (Web application). Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://<your-deployed-domain>/api/auth/callback/google` (once deployed)
4. Copy the Client ID / Client Secret into `.env.local` (see below).

## Local setup

```bash
pnpm install

# Start a local Postgres in Docker (only needed once; it persists across restarts)
docker run -d --name movie-night-postgres \
  -e POSTGRES_USER=movienight -e POSTGRES_PASSWORD=movienight -e POSTGRES_DB=movienight \
  -p 5433:5432 postgres:16-alpine

# Next time you come back to the project, if the container isn't running:
docker start movie-night-postgres
```

Fill in `.env.local` (already created with a working `DATABASE_URL` for the container above and
a generated `AUTH_SECRET`) with your own values:

```
AUTH_GOOGLE_ID="..."       # from Google Cloud Console
AUTH_GOOGLE_SECRET="..."
TMDB_API_KEY="..."         # from themoviedb.org
```

Then apply the schema and start the app:

```bash
pnpm prisma migrate dev   # applies prisma/migrations, safe to re-run
pnpm dev                  # http://localhost:3000
```

### Seeding sample data

```bash
pnpm prisma db seed
```

This creates a party ("Seed Test Party") with three fake members and one activity that already
has availability responses and a movie suggestion, so you can look at the Results page without
manually filling in the grid every time. The seeded members aren't real Google accounts, so to
see it in the app: sign in with your real Google account, then visit `/invite/seed-party` to
join that party — your own availability then combines with the three seeded responses.

### Avoiding real Calendar invites while testing

Confirming a time in the Results tab calls the Google Calendar API and — by default —
emails every party member a real invite (`sendUpdates: 'all'`). `.env.local` ships with
`SKIP_CALENDAR_SEND="true"`, which uses `sendUpdates: 'none'` instead, so you can exercise the
whole scheduling flow without notifying anyone. Only test with `SKIP_CALENDAR_SEND` unset (or
`false`) against Google accounts you control (your own + a throwaway account), never against
real friends, until you're confident the flow works.

## Testing

```bash
pnpm test    # vitest — currently covers the best-time overlap algorithm
pnpm lint
pnpm build   # also runs the TypeScript check
```

## Deploying

Swap `DATABASE_URL` for a hosted Postgres connection string (e.g. a [Neon](https://neon.tech)
project — the same Postgres dialect as local dev, no schema changes needed), add the same env
vars to your host (e.g. Vercel), and add the deployed domain's callback URL to the Google OAuth
client's Authorized redirect URIs.

## Project structure

- `prisma/schema.prisma` — data model
- `src/lib/auth.ts` — Auth.js config (Google provider, JWT session + refresh)
- `src/lib/scheduling/` — the availability grid + best-time overlap algorithm (pure, unit tested)
- `src/lib/google/calendar.ts` — Calendar event creation / freebusy
- `src/lib/actions/` — Server Actions (parties, activities, movies)
- `src/app/` — routes: `/`, `/parties/[partyId]`, `/invite/[code]`,
  `/activities/[activityId]/{availability,results,movies}`

## Known v1 limitations / not-yet-built

- No Google Calendar freebusy pre-fill on the availability grid (deferred; `queryFreeBusy` in
  `lib/google/calendar.ts` is there but unused for now).
- Access/refresh tokens are stored the way Auth.js's Prisma adapter does by default (not
  separately encrypted at rest) — a reasonable trade-off for a small trusted friend group, but
  worth hardening if this ever handles a larger or less-trusted user base.
- Only a contiguous date range is supported per activity (not a set of specific candidate
  dates).
