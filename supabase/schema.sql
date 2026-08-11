-- 21 Days of Power — Supabase schema
-- Mirrors src/lib/types.ts so the mock adapter can be swapped for Supabase
-- without changing any screen code.

create type user_role as enum ('member', 'team_lead', 'admin');
create type session_slot as enum ('whirlwind', 'uncut', 'power_night');

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  team_lead_id uuid,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  phone text unique,
  role user_role not null default 'member',
  team_id uuid references teams (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint users_contact_present check (email is not null or phone is not null)
);

alter table teams
  add constraint teams_team_lead_fk foreign key (team_lead_id) references users (id) on delete set null;

create table days (
  id uuid primary key default gen_random_uuid(),
  day_number int not null unique check (day_number between 1 and 21),
  date date not null unique
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references days (id) on delete cascade,
  name text not null,
  time time not null,
  slot session_slot not null,
  unique (day_id, slot)
);

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  session_id uuid not null references sessions (id) on delete cascade,
  checked_in boolean not null default false,
  shared_link boolean not null default false,
  liked_youtube boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One row per person per session; check-ins are updated, never duplicated.
  unique (user_id, session_id)
);

create index check_ins_session_idx on check_ins (session_id);
create index check_ins_user_idx on check_ins (user_id);
create index users_team_idx on users (team_id);

-- Keep updated_at honest when a member ticks "shared" or "liked" later.
create function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger check_ins_touch_updated_at
  before update on check_ins
  for each row execute function touch_updated_at();

-- Row level security: members read/write only their own check-ins, leads read
-- their team, admins see everything.
alter table users enable row level security;
alter table teams enable row level security;
alter table days enable row level security;
alter table sessions enable row level security;
alter table check_ins enable row level security;

create function current_app_user() returns users as $$
  select * from users where id = auth.uid();
$$ language sql stable security definer;

create policy "days are readable by everyone signed in"
  on days for select to authenticated using (true);

create policy "sessions are readable by everyone signed in"
  on sessions for select to authenticated using (true);

create policy "teams are readable by everyone signed in"
  on teams for select to authenticated using (true);

create policy "members read themselves, leads read their team, admins read all"
  on users for select to authenticated using (
    id = auth.uid()
    or (select role from current_app_user()) = 'admin'
    or (
      (select role from current_app_user()) = 'team_lead'
      and team_id = (select team_id from current_app_user())
    )
  );

create policy "members manage their own check-ins"
  on check_ins for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "leads and admins read check-ins for their scope"
  on check_ins for select to authenticated using (
    (select role from current_app_user()) = 'admin'
    or (
      (select role from current_app_user()) = 'team_lead'
      and exists (
        select 1 from users u
        where u.id = check_ins.user_id
          and u.team_id = (select team_id from current_app_user())
      )
    )
  );

create policy "admins manage teams"
  on teams for all to authenticated
  using ((select role from current_app_user()) = 'admin')
  with check ((select role from current_app_user()) = 'admin');

create policy "admins manage users"
  on users for all to authenticated
  using ((select role from current_app_user()) = 'admin')
  with check ((select role from current_app_user()) = 'admin');
