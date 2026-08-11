# 21 Days of Power

A mobile-first check-in and accountability app for **The New Church**'s 21 Days of Power
programme. Members check in for each session in under 30 seconds, team leads see who
showed up, and admins get a programme-wide view.

Three sessions run every day for 21 days:

| Session | Time |
| --- | --- |
| Whirlwind of Testimonies | 7:00 AM |
| Uncut Series | 1:00 PM |
| The Power Night Series | 6:30 PM |

Each session tracks three accountability items, stored separately: **checked in**,
**shared the link**, and **liked the YouTube page**. A member can check in without having
shared or liked, and can tick those off later.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app seeds itself with demo data on first load, anchored so
that today is **Day 8 of 21**.

### Demo accounts

Sign in with any of these (the login screen also has one-tap buttons):

| Role | Email |
| --- | --- |
| Member | `john-doe@thenewchurch.org` |
| Team Lead | `lead.thenewmusic@thenewchurch.org` |
| Admin | `admin@thenewchurch.org` |

Sign-in is identifier-only for the MVP — enter an email or phone number and you stay
signed in on that device. **Profile → Reset demo data** wipes and re-seeds everything.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify` | Headless end-to-end check of the whole data flow |

`npm run verify` walks the full journey — admin creates a team, adds a member, promotes a
lead, the member checks in and later marks shared/liked, then asserts that team stats,
personal progress, attendance rates and CSV exports all update correctly.

## Roles and screens

**Member** — Home (today's sessions), My Progress, Profile.
**Team Lead** — Home, Team Dashboard, My Team, Profile.
**Admin** — Dashboard, Teams, Members, Sessions, Reports.

Members cannot reach team or admin screens; `RoleGuard` redirects them to their own home.

## Architecture

```
src/
  app/
    (app)/            Authenticated screens, wrapped in AppShell (nav + guards)
    login, register/  Unauthenticated screens
  components/         UI primitives and app-specific components
  lib/
    types.ts          Data model: users, teams, days, sessions, check_ins
    program.ts        Programme constants, dates, session-status-from-clock logic
    seed.ts           Deterministic demo data (10 teams, 21 days, 63 sessions)
    stats.ts          All selectors and roll-ups used by dashboards
    store.tsx         React context: auth, current data, mutations
    data/             The swap point for the backend
```

Session status (**upcoming / live / completed**) is always derived from the clock, never
stored. A session is "live" from its start time until 90 minutes after.

## Swapping the mock data for Supabase

Everything reads and writes through the `DataAdapter` interface in
`src/lib/data/adapter.ts`. The MVP ships `mock-adapter.ts`, which persists to
`localStorage`.

To move to Supabase:

1. Run `supabase/schema.sql` against your project. It mirrors the same tables and adds
   row-level security so members only see their own check-ins, leads see their team, and
   admins see everything.
2. Add `supabase-adapter.ts` implementing `DataAdapter`.
3. Return it from `getAdapter()` in `src/lib/data/index.ts`, e.g. when
   `NEXT_PUBLIC_SUPABASE_URL` is set.

No screen or component needs to change.

## Not built (deliberately)

No chat, payments, CRM, sermon management, ticketing, social feed or messaging. The app
does one thing: show up, check in, stay accountable.

Notifications are future-ready but not wired up — session times and statuses are already
computed, so reminders ("Power Night starts in 30 minutes") only need a delivery channel.
