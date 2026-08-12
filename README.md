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

## Connecting Supabase

The app has no data of its own — Supabase holds everything. Setting up a fresh project
takes about ten minutes.

**1. Create the project.** At [supabase.com/dashboard](https://supabase.com/dashboard),
create a project. Pick the region closest to your congregation.

**2. Create the tables.** Open the SQL Editor, paste the whole of
[`supabase/schema.sql`](supabase/schema.sql), and run it. That creates the three tables,
the fifteen service teams, the sign-up trigger and every security policy. It also marks
`thedevoluwashina@gmail.com` as the admin — change that line first if you want a
different address.

**3. Copy your keys.** Project Settings → API. Copy `.env.example` to `.env.local` and
fill in the project URL and the **anon** key. The anon key is meant to be public; the
`service_role` key must never appear in this app.

**4. Set up email and password sign-in.** Authentication → Sign In / Providers → Email:

- **Enable email provider**: on
- **Confirm email**: **off** — people can then sign up and start checking in immediately,
  with no email to wait for. Turn it on if you'd rather verify addresses, at the cost of
  every new person needing a working inbox before their first check-in.
- **Minimum password length**: 8, to match the sign-up form.

**5. Allow the links to come back to the app.** Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000` while developing, your real domain in production.
- **Redirect URLs**: add both landing pages, for each domain you use.

```
http://localhost:3000/confirm
http://localhost:3000/reset
https://your-domain.com/confirm
https://your-domain.com/reset
```

An address that isn't on this list is ignored, and the link silently drops people on the
Site URL instead — that is nearly always why a reset or confirmation link "does nothing".

**6. Rewrite the emails.** Authentication → Emails → Templates. Supabase's defaults are
plain and unbranded; ready-made replacements are in
[`supabase/email-templates/`](supabase/email-templates). For each one, set the **Subject
heading** and paste the file's contents into the message body:

| Template | Subject | Body |
| --- | --- | --- |
| Confirm signup | `Confirm your email for 21 Days of Power` | `confirm-signup.html` |
| Reset password | `Reset your 21 Days of Power password` | `reset-password.html` |

The templates use `{{ .ConfirmationURL }}`, which already points at `/confirm` and
`/reset` — the app asks for those when it sends the email, so you never hard-code a URL
in the template. `{{ .Data.name }}` is the name the person typed at sign-up, so the
confirmation email can greet them properly.

Both links are single-use. Tapping the confirmation link signs them straight in rather
than dropping them back at the sign-in screen.

**7. Run it.**

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up with your admin email, and you'll land on the admin
dashboard.

Email is only sent for password resets, so Supabase's built-in mail (a few messages an
hour) is enough to start. If people begin reporting missing reset emails, add your own
sender under Authentication → Emails → SMTP Settings — Resend, Postmark, or your church's
Google Workspace.

### How people get in

Everyone signs themselves up: name, email, password, phone (optional) and service team.
Nothing for you to create by hand.

**Team leads are promoted, not invited.** Ask the person to sign up like everyone else,
then either open **Teams**, pick their team, and choose them as lead, or open **Members**,
find them, and switch their role. Promoting someone to lead also moves them onto that
team and steps the previous lead back down to member.

That means there's no lead-only sign-up link to leak, and knowing a lead's email address
gets you nothing without their password.

You keep three controls over everyone: their **service team**, their **role**, and an
**Active** switch that stops a person signing in without deleting their history.

### Where the service teams come from

The sign-up dropdown reads the `teams` table live, and `schema.sql` seeds all fifteen
teams when you run it. To check they landed:

```sql
select name from teams order by name;
```

If that returns nothing, the schema hasn't been run against this project yet. If it
returns rows but the dropdown is still empty, the public read policy is missing — teams
are the one table `anon` can read, because the sign-up screen needs it before anyone has
an account:

```sql
select policyname, roles from pg_policies where tablename = 'teams';
```

To add or rename a team later, use **Admin → Teams** in the app rather than SQL, so the
new team is picked up everywhere at once.

### The programme schedule

The whole schedule lives in one place, `src/lib/program.ts`: the start and end dates,
session names and times, theme, minister, and the YouTube channel. It is *not* in the
database — check-ins point at a session by a stable id like `2026-08-10_whirlwind`, so
moving a date is a code change rather than a migration.

The number of days is derived from the window rather than hardcoded. Set
`RUNS_ON_WEEKENDS = true` to include Saturdays and Sundays, or `YOUTUBE_CHANNEL_URL` to
turn on the "watch and like" links.

Day numbers are read from the generated schedule, never calculated as "days since the
start" — with weekends skipped, those two disagree (Monday 17 August is Day 6, not Day 8).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify` | Headless check of the schedule and every roll-up |

`npm run verify` builds the schedule and a small fixture in memory, then asserts the parts
that decide who counts as present: session ids match the database constraint, no day lands
on a weekend, a check-in stands alone without a share or a like, streaks break on a missed
day, deactivated people drop out of the totals, and CSV export escapes correctly. It needs
no database, so it runs in CI.

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
**Reports** — Home, Reports (programme-wide, read-only), Profile. For people who need
exports and breakdowns without admin controls.
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
    program.ts        Programme constants, dates, schedule, session status
    stats.ts          All selectors and roll-ups used by dashboards
    store.tsx         React context: auth, current data, mutations
    supabase/         The browser client
    data/             DataAdapter interface + the Supabase implementation
supabase/schema.sql   Tables, policies, triggers — run once, by hand
```

Session status (**upcoming / live / completed**) is always derived from the clock, never
stored. A session is "live" from its start time until 90 minutes after.

Every read and write goes through the `DataAdapter` interface in
`src/lib/data/adapter.ts`, so no screen talks to Supabase directly. Mutations return only
the rows they touched and the store patches its copy, rather than refetching everything
after each tap.

## Who can see what

Security is enforced by Postgres, not by the app — hiding a button is not a permission.
Row-level security means:

- You can read **yourself and your own team**. Admins read everyone.
- You can write **only your own check-ins**.
- You can change **your own name and phone**, nothing else. Role, team and active status
  are admin-only, enforced by a trigger, so a member cannot make themselves an admin by
  calling the API directly.
- **Team names** are the one public table, so the sign-up screen can list them.

The table of admin emails has row-level security on and no policy at all: nothing can read
or write it through the API. To add another admin, either promote them from the dashboard
or insert a row in the SQL editor before they sign up.

## Not built (deliberately)

No chat, payments, CRM, sermon management, ticketing, social feed or messaging. The app
does one thing: show up, check in, stay accountable.

Notifications are future-ready but not wired up — session times and statuses are already
computed, so reminders ("the Evening Session starts in 30 minutes") only need a delivery
channel.
