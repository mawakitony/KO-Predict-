-- KO Predict™ — rôles équipe WOLOYEM (coach / admin / super_admin)
-- + team_activation_codes
-- + helpers RLS is_staff / is_admin_or_above / is_super_admin
--
-- Extension future (V2, non implémentée) :
--   create table public.coach_students (
--     coach_profile_id uuid not null references public.profiles (id) on delete cascade,
--     student_id uuid not null references public.students (id) on delete cascade,
--     created_at timestamptz not null default now(),
--     primary key (coach_profile_id, student_id)
--   );
-- En V1, les coachs voient tous les apprenants via private.is_staff().

-- ---------------------------------------------------------------------------
-- 1) profiles.role
-- ---------------------------------------------------------------------------

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'coach', 'admin', 'super_admin'));

-- ---------------------------------------------------------------------------
-- 2) Helpers RLS
-- ---------------------------------------------------------------------------

-- Conservé pour compatibilité : admin OU super_admin (gestion apprenants).
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
      and account_status = 'ACTIVE'
  );
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('coach', 'admin', 'super_admin')
      and account_status = 'ACTIVE'
  );
$$;

create or replace function private.is_admin_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.is_admin();
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and account_status = 'ACTIVE'
  );
$$;

revoke all on function private.is_staff() from public;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_staff() to service_role;

revoke all on function private.is_admin_or_above() from public;
grant execute on function private.is_admin_or_above() to authenticated;
grant execute on function private.is_admin_or_above() to service_role;

revoke all on function private.is_super_admin() from public;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.is_super_admin() to service_role;

-- Aucun changement de rôle via client authenticated (service_role uniquement).
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.role is distinct from new.role
    and auth.uid() is not null then
    raise exception 'Modification du rôle non autorisée';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Policies lecture : staff (coach+) ; écriture : admin+
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or private.is_staff());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
  on public.profiles
  for update
  to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

drop policy if exists "students_select_own_or_admin" on public.students;
create policy "students_select_own_or_admin"
  on public.students
  for select
  to authenticated
  using (profile_id = auth.uid() or private.is_staff());

drop policy if exists "students_update_own_or_admin" on public.students;
create policy "students_update_own_or_admin"
  on public.students
  for update
  to authenticated
  using (profile_id = auth.uid() or private.is_admin_or_above())
  with check (profile_id = auth.uid() or private.is_admin_or_above());

drop policy if exists "students_insert_admin" on public.students;
create policy "students_insert_admin"
  on public.students
  for insert
  to authenticated
  with check (private.is_admin_or_above() or profile_id = auth.uid());

drop policy if exists "learning_metrics_select_own_or_admin" on public.learning_metrics;
create policy "learning_metrics_select_own_or_admin"
  on public.learning_metrics
  for select
  to authenticated
  using (
    private.is_staff()
    or exists (
      select 1 from public.students s
      where s.id = learning_metrics.student_id
        and s.profile_id = auth.uid()
    )
  );

drop policy if exists "learning_metrics_insert_admin" on public.learning_metrics;
create policy "learning_metrics_insert_admin"
  on public.learning_metrics
  for insert
  to authenticated
  with check (private.is_admin_or_above());

drop policy if exists "learning_metrics_update_admin" on public.learning_metrics;
create policy "learning_metrics_update_admin"
  on public.learning_metrics
  for update
  to authenticated
  using (private.is_admin_or_above())
  with check (private.is_admin_or_above());

drop policy if exists "predictions_select_own_or_admin" on public.predictions;
create policy "predictions_select_own_or_admin"
  on public.predictions
  for select
  to authenticated
  using (
    private.is_staff()
    or exists (
      select 1 from public.students s
      where s.id = predictions.student_id
        and s.profile_id = auth.uid()
    )
  );

drop policy if exists "predictions_insert_admin" on public.predictions;
create policy "predictions_insert_admin"
  on public.predictions
  for insert
  to authenticated
  with check (private.is_admin_or_above());

drop policy if exists "predictions_update_admin" on public.predictions;
create policy "predictions_update_admin"
  on public.predictions
  for update
  to authenticated
  using (private.is_admin_or_above())
  with check (private.is_admin_or_above());

drop policy if exists "prediction_history_select_own_or_admin" on public.prediction_history;
create policy "prediction_history_select_own_or_admin"
  on public.prediction_history
  for select
  to authenticated
  using (
    private.is_staff()
    or exists (
      select 1 from public.students s
      where s.id = prediction_history.student_id
        and s.profile_id = auth.uid()
    )
  );

drop policy if exists "prediction_history_insert_admin" on public.prediction_history;
create policy "prediction_history_insert_admin"
  on public.prediction_history
  for insert
  to authenticated
  with check (private.is_admin_or_above());

-- invitations / webhooks : admin+
drop policy if exists "invitations_select_admin" on public.invitations;
create policy "invitations_select_admin"
  on public.invitations
  for select
  to authenticated
  using (private.is_admin_or_above());

drop policy if exists "webhook_events_select_admin" on public.webhook_events;
create policy "webhook_events_select_admin"
  on public.webhook_events
  for select
  to authenticated
  using (private.is_admin_or_above());

-- Codes apprenants : lecture admin+ (jamais coach)
drop policy if exists "activation_codes_select_admin" on public.activation_codes;
create policy "activation_codes_select_admin"
  on public.activation_codes
  for select
  to authenticated
  using (private.is_admin_or_above());

-- Audit : admin+ voit événements liés aux apprenants ; super_admin voit tout
drop policy if exists "access_audit_select_admin" on public.access_audit_events;
create policy "access_audit_select_admin"
  on public.access_audit_events
  for select
  to authenticated
  using (
    private.is_super_admin()
    or (
      private.is_admin_or_above()
      and student_id is not null
    )
  );

-- ---------------------------------------------------------------------------
-- 4) team_activation_codes (équipe WOLOYEM — séparé des codes apprenants)
-- ---------------------------------------------------------------------------

create table if not exists public.team_activation_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  auth_user_id uuid references auth.users (id) on delete set null,
  email text not null,
  code_hash text not null,
  status text not null
    check (status in ('PENDING', 'USED', 'EXPIRED', 'REVOKED')),
  expires_at timestamptz not null,
  used_at timestamptz,
  attempt_count integer not null default 0
    check (attempt_count >= 0),
  locked_until timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists team_activation_codes_one_pending_per_profile
  on public.team_activation_codes (profile_id)
  where (status = 'PENDING');

create index if not exists team_activation_codes_email_idx
  on public.team_activation_codes (lower(email));

create index if not exists team_activation_codes_profile_idx
  on public.team_activation_codes (profile_id);

create index if not exists team_activation_codes_status_idx
  on public.team_activation_codes (status);

drop trigger if exists team_activation_codes_set_updated_at on public.team_activation_codes;
create trigger team_activation_codes_set_updated_at
before update on public.team_activation_codes
for each row
execute function public.set_updated_at();

alter table public.team_activation_codes enable row level security;

drop policy if exists "team_activation_codes_select_super_admin"
  on public.team_activation_codes;
create policy "team_activation_codes_select_super_admin"
  on public.team_activation_codes
  for select
  to authenticated
  using (private.is_super_admin());

revoke all on table public.team_activation_codes from anon;
revoke all on table public.team_activation_codes from authenticated;
grant select on table public.team_activation_codes to authenticated;
grant all on table public.team_activation_codes to service_role;

comment on table public.team_activation_codes is
  'Codes première connexion pour coach/admin (pas LearnWorlds / pas students).';
