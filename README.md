# 21 Days of Power

> **Thirsty Soul, Living Waters** · with Pastor Shola Okodugha
> Streaming on YouTube — The New Church

A mobile-first check-in and accountability app for **The New Church**'s 21 Days of Power
programme. Members check in for each session in under 30 seconds, team leads see who
showed up, and admins get a programme-wide view.

Three sessions run each programme day, **Monday to Friday**:

| Session | Time |
| --- | --- |
| Whirlwind of Testimonies | 7:00 AM |
| Uncut Series | 1:00 PM |
| Evening Session | 7:00 PM |

The programme window is **10 – 30 August 2026**. Saturdays and Sundays are not check-in
days at all, which leaves **15 check-in days**, ending Friday 28 August. Weekends never
count against a member's attendance or streak, and the app shows a rest-day screen on them.

"21 Days of Power" is the campaign name; 15 is the number of days that carry sessions.

Each session tracks three accountability items, stored separately: **checked in**,
**shared the link**, and **liked the YouTube page**. A member can check in without having
shared or liked, and can tick those off later.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app seeds itself with demo data on first load, anchored to
the real programme dates, so the day number always matches the actual calendar.

The whole schedule lives in one place, `src/lib/program.ts`: the start and end dates,
session names and times, theme, minister, and the YouTube channel. The number of days is
derived from that window rather than hardcoded, so moving the end date is a one-line
change. Set `RUNS_ON_WEEKENDS = true` to include Saturdays and Sundays, or
`YOUTUBE_CHANNEL_URL` to turn on the "watch and like" links.

Day numbers are read from the generated schedule, never calculated as "days since the
start" — with weekends skipped, those two disagree (Monday 17 August is Day 6, not Day 8).

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

## Brand

The palette follows The New's brand guide and lives in `src/app/globals.css`:

| Token | Hex | Used for |
| --- | --- | --- |
| `gold` | `#FFC533` | Primary actions, live sessions, progress |
| `ink` | `#000000` | App background |
| `text` | `#FFFFFF` | Body text |
| `navy` | `#1F3D7B` | Background wash, avatars |
| `magenta` | `#E82D88` | Secondary accent (shares, lead badges) |
| `cream` / `peach` | `#FFF3BF` / `#FDD9B9` | Gradient highlights, confetti |

Gold is a light surface, so anything on it uses `text-ink` rather than white. `mint` and
`rose` are kept outside the brand set for their one job each: success and destructive.

## Roles and screens

**Member** — Home (today's sessions), My Progress, Profile.
**Team Lead** — Home, Team Dashboard, My Team, Profile.
**Admin** — Home, Dashboard, Teams, Members, Reports (Sessions is linked from the
dashboard).

Everyone checks in from the same Home screen, the admin included — an admin takes part in
the programme like anyone else, counts in the programme totals, and can join a service
team to appear on its roster. Members cannot reach team or admin screens; `RoleGuard`
redirects them to their own home.

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
    seed.ts           Deterministic demo data (14 teams, every day and session)
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
computed, so reminders ("the Evening Session starts in 30 minutes") only need a delivery
channel.
