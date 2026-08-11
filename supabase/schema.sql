-- 21 Days of Power — Supabase schema
-- Run this once, in the Supabase SQL editor, on a fresh project.
--
-- Three tables only. The programme schedule (which days, which sessions, what
-- time) lives in src/lib/program.ts and is generated in the app, so moving a
-- date never needs a migration. A check-in points at a session by its stable
-- id, `<date>_<slot>`, e.g. `2026-08-10_whirlwind`.

create type user_role as enum ('member', 'team_lead', 'admin');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  team_lead_id uuid,
  created_at timestamptz not null default now()
);

-- One row per signed-up person, keyed by their Supabase Auth id.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null default '',
  phone text not null default '',
  role user_role not null default 'member',
  team_id uuid references teams (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table teams
  add constraint teams_team_lead_fk
  foreign key (team_lead_id) references profiles (id) on delete set null;

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  -- `<yyyy-mm-dd>_<slot>`; the app builds these, the constraint keeps junk out.
  session_id text not null check (
    session_id ~ '^\d{4}-\d{2}-\d{2}_(whirlwind|uncut|power_night)$'
  ),
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
create index profiles_team_idx on profiles (team_id);

-- Who gets the admin role on sign-up. Add a row here before that person
-- registers; existing people are promoted from the admin dashboard instead.
create table admin_emails (
  email text primary key
);

insert into admin_emails (email) values ('thedevoluwashina@gmail.com');

-- ---------------------------------------------------------------------------
-- Service teams
-- ---------------------------------------------------------------------------

insert into teams (name) values
  ('The New Music'),
  ('Amplified'),
  ('Treasureville'),
  ('Comms'),
  ('Heralds'),
  ('Templars'),
  ('Shutterbox'),
  ('Elites'),
  ('Marshalls'),
  ('Amiables'),
  ('Data'),
  ('Welcome and Integration'),
  ('Tribe Leaders'),
  ('CEM'),
  ('Tephilah');

-- ---------------------------------------------------------------------------
-- Helpers
--
-- security definer so they can read `profiles` without re-triggering the
-- policies that call them, which would recurse.
-- ---------------------------------------------------------------------------

create function my_role() returns user_role
  language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create function my_team() returns uuid
  language sql stable security definer set search_path = public as $$
  select team_id from profiles where id = auth.uid();
$$;

create function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(my_role() = 'admin', false);
$$;

-- ---------------------------------------------------------------------------
-- Sign-up: create the profile from the metadata sent with the one-time code
-- ---------------------------------------------------------------------------

create function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, email, phone, team_id, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'team_id', '')::uuid,
    case
      when exists (select 1 from admin_emails a where a.email = lower(new.email))
      then 'admin'::user_role
      else 'member'::user_role
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Guard rails: only an admin may change role, team, or active status
-- ---------------------------------------------------------------------------

create function enforce_profile_rules() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  bootstrap boolean := exists (
    select 1 from admin_emails a where a.email = lower(new.email)
  );
begin
  if is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A member can create their own profile (the sign-up trigger normally got
    -- there first) but never hand themselves a role.
    new.role := case when bootstrap then 'admin'::user_role else 'member'::user_role end;
    new.active := true;
    return new;
  end if;

  -- Updates: name and phone are yours, everything else is the admin's.
  new.role := old.role;
  new.team_id := old.team_id;
  new.active := old.active;
  new.email := old.email;
  return new;
end;
$$;

create trigger profiles_enforce_rules
  before insert or update on profiles
  for each row execute function enforce_profile_rules();

create function touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger check_ins_touch_updated_at
  before update on check_ins
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
--
-- You can see yourself, your team, and nothing else. Admins see everything.
-- Team names are public so the sign-up screen can list them.
-- ---------------------------------------------------------------------------

alter table teams enable row level security;
alter table profiles enable row level security;
alter table check_ins enable row level security;
alter table admin_emails enable row level security;

create policy "anyone can read team names"
  on teams for select to anon, authenticated using (true);

create policy "admins manage teams"
  on teams for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "read yourself, your team, or everyone if admin"
  on profiles for select to authenticated using (
    id = auth.uid()
    or is_admin()
    or (team_id is not null and team_id = my_team())
  );

create policy "create your own profile"
  on profiles for insert to authenticated with check (id = auth.uid());

create policy "update your own profile"
  on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "admins manage profiles"
  on profiles for all to authenticated
  using (is_admin()) with check (is_admin());

create policy "manage your own check-ins"
  on check_ins for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read check-ins for your team, or all if admin"
  on check_ins for select to authenticated using (
    is_admin()
    or exists (
      select 1 from profiles p
      where p.id = check_ins.user_id
        and p.team_id is not null
        and p.team_id = my_team()
    )
  );

create policy "admins manage check-ins"
  on check_ins for all to authenticated
  using (is_admin()) with check (is_admin());

-- admin_emails has RLS on and no policy: nobody can read or write it from the
-- API. It is only touched by the security-definer functions above and by you,
-- in the SQL editor.
