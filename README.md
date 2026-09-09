# Free Time

Propose a group activity, have everyone in the party mark when they're free across a date
range, and get the best overlapping time — then everyone adds it to their own Google Calendar
with one click. Movie-night activities also get a simple suggest-and-vote list for picking what
to watch (via TMDB search). Activities can also repeat weekly/monthly, spawning a fresh round
automatically and emailing the party a reminder each time.

## Stack

Next.js (App Router) + TypeScript, Prisma + PostgreSQL (Neon in production, via its serverless
driver), Auth.js (Google sign-in), Tailwind + shadcn/ui, Zod, date-fns / date-fns-tz, Resend
(reminder emails), Vercel Cron (recurrence), Vitest.

## Prerequisites

- Node.js 20+, pnpm (`npm install -g pnpm` if you don't have it)
- Docker, for a local Postgres instance (or point `DATABASE_URL` at a hosted Postgres like
  [Neon](https://neon.tech) instead)
- A Google Cloud project for Google sign-in (see below)
- A free [TMDB](https://www.themoviedb.org/settings/api) API key, for movie search/posters
- A free [Resend](https://resend.com) account + verified sending domain, for recurring-activity
  reminder emails (optional — everything else works without it; reminders just get skipped and
  logged instead of sent until this is configured)

## Google Cloud setup (one-time, manual)

1. Configure the **OAuth consent screen**: External user type, with just the default
   `openid`, `email`, `profile` scopes. The app never requests Calendar access — confirming a
   time generates a pre-filled "Add to Google Calendar" link that each party member clicks to
   add the event to their own calendar (see `src/lib/google/calendar.ts`), so there's no
   sensitive scope and no Google verification review needed even once you publish the app to
   production ("Audience" page → "Publish app") and let anyone sign in.
2. Create **OAuth 2.0 Client ID** credentials (Web application). Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://<your-deployed-domain>/api/auth/callback/google` (once deployed)
3. Copy the Client ID / Client Secret into `.env.local` (see below).

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
RESEND_API_KEY="..."       # from resend.com — optional, see Prerequisites
FROM_EMAIL="..."           # an address on a Resend-verified domain
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

### Testing recurring activities locally

A `vercel.json` cron hits `/api/cron/activity-series` once a day in production — that doesn't
fire in `next dev`, so exercise the same route directly instead:

```bash
curl http://localhost:3000/api/cron/activity-series -H "Authorization: Bearer $CRON_SECRET"
```

(`CRON_SECRET` in `.env.local` can be any value for local testing.) To test a series without
waiting a week/month, create an activity with "Repeat" set, then backdate its `ActivitySeries`
row's `nextRunAt` to the past via `pnpm prisma studio` before running the curl command above.
A due series gets a fresh `Activity` occurrence, its `nextRunAt` advances by one interval, and
every party member gets emailed (or, if `RESEND_API_KEY`/`FROM_EMAIL` aren't set, the send is
skipped and logged instead of failing).

## Testing

```bash
pnpm test    # vitest — currently covers the best-time overlap algorithm
pnpm lint
pnpm build   # also runs the TypeScript check
```

## Deploying

Swap `DATABASE_URL` for a hosted Postgres connection string (e.g. a [Neon](https://neon.tech)
project — the same Postgres dialect as local dev, no schema changes needed), add the same env
vars to your host (e.g. Vercel) plus `CRON_SECRET` (any random string — Vercel sends it
automatically as a bearer token for its own cron calls once it's set as a project env var) and
`RESEND_API_KEY`/`FROM_EMAIL`, and add the deployed domain's callback URL to the Google OAuth
client's Authorized redirect URIs. Also check that the Vercel project's serverless function
region matches your Postgres provider's region (Project Settings → Functions → Region) —
cross-region DB round-trips are a common source of slow page loads.

## Project structure

- `prisma/schema.prisma` — data model
- `src/lib/auth.ts` — Auth.js config (Google provider, JWT session)
- `src/lib/prisma-adapter.ts` — picks the Neon serverless driver or generic `pg`, based on
  whether `DATABASE_URL` points at Neon or a plain Postgres (e.g. local Docker)
- `src/lib/scheduling/` — the availability grid + best-time overlap algorithm (pure, unit tested)
- `src/lib/google/calendar.ts` — builds the pre-filled "Add to Google Calendar" link used once
  a time is confirmed
- `src/lib/email/resend.ts` — recurring-activity reminder emails
- `src/lib/actions/` — Server Actions (parties, activities, movies)
- `src/app/api/cron/activity-series/route.ts` — the daily recurrence check (see `vercel.json`)
- `src/app/` — routes: `/`, `/parties/[partyId]`, `/invite/[code]`,
  `/activities/[activityId]/{availability,results,movies}`

## Known v1 limitations / not-yet-built

- No Google Calendar freebusy pre-fill on the availability grid, and no automatic event
  creation on anyone's calendar — scheduling produces an "Add to Google Calendar" link per
  person instead, since the app never requests Calendar OAuth access at all.
- Only a contiguous date range is supported per activity (not a set of specific candidate
  dates).
- Recurring activities only repeat weekly or monthly on a fixed cadence from creation — no
  custom rules (e.g. "first Friday of the month"), and the daily cron means a new round can
  land up to ~24h later than its exact anniversary.
- No nudge emails for people who haven't responded yet on an already-open round — reminders
  only go out when a *new* recurring round is created.
