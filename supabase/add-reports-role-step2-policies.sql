-- STEP 2 of 2 — run after step 1 succeeds (add-reports-role-step1-enum.sql).

create or replace function is_reports() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(my_role() = 'reports', false);
$$;

drop policy if exists "read yourself, your team, or everyone if admin" on profiles;
create policy "read yourself, your team, or everyone if admin"
  on profiles for select to authenticated using (
    id = auth.uid()
    or is_admin()
    or is_reports()
    or (team_id is not null and team_id = my_team())
  );

drop policy if exists "read check-ins for your team, or all if admin" on check_ins;
create policy "read check-ins for your team, or all if admin"
  on check_ins for select to authenticated using (
    is_admin()
    or is_reports()
    or exists (
      select 1 from profiles p
      where p.id = check_ins.user_id
        and p.team_id is not null
        and p.team_id = my_team()
    )
  );

-- Promote someone (e.g. your CEM contact) after they have signed up:
-- update profiles set role = 'reports' where lower(email) = lower('their@email.com');
