-- KO Predict™ — schéma initial + RLS
-- Phase 3

create extension if not exists "pgcrypto";

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (lié à auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- role toujours 'student' à l'inscription (jamais depuis user_metadata, éditable).
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', null),
    coalesce(new.raw_user_meta_data ->> 'last_name', null),
    'student'
  );
  return new;
end;
$$;

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
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_admin() to service_role;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.role is distinct from new.role
    and auth.uid() is not null
    and not private.is_admin() then
    raise exception 'Modification du rôle non autorisée';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row
execute function public.prevent_profile_role_escalation();

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  learnworlds_user_id text unique,
  certification text not null,
  target_exam_date date,
  enrollment_date date,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index students_profile_id_idx on public.students (profile_id);
create index students_learnworlds_user_id_idx on public.students (learnworlds_user_id);
create index students_certification_idx on public.students (certification);

create trigger students_set_updated_at
before update on public.students
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- learning_metrics
-- ---------------------------------------------------------------------------

create table public.learning_metrics (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  progress_percent numeric not null check (progress_percent >= 0 and progress_percent <= 100),
  completed_activities integer not null check (completed_activities >= 0),
  total_activities integer not null check (total_activities >= 0),
  study_time_minutes integer not null default 0 check (study_time_minutes >= 0),
  qcm_average numeric check (qcm_average is null or (qcm_average >= 0 and qcm_average <= 100)),
  recent_qcm_average numeric check (
    recent_qcm_average is null or (recent_qcm_average >= 0 and recent_qcm_average <= 100)
  ),
  last_activity_date timestamptz,
  inactive_days integer not null default 0 check (inactive_days >= 0),
  study_sessions integer check (study_sessions is null or study_sessions >= 0),
  recorded_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual', 'learnworlds')),
  created_at timestamptz not null default now()
);

create index learning_metrics_student_id_idx on public.learning_metrics (student_id);
create index learning_metrics_recorded_at_idx on public.learning_metrics (recorded_at desc);

-- ---------------------------------------------------------------------------
-- predictions (1 ligne courante par apprenant)
-- ---------------------------------------------------------------------------

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students (id) on delete cascade,
  current_pace numeric,
  required_pace numeric,
  remaining_activities integer,
  readiness_score numeric check (
    readiness_score is null or (readiness_score >= 0 and readiness_score <= 100)
  ),
  readiness_probability numeric check (
    readiness_probability is null
    or (readiness_probability >= 0 and readiness_probability <= 100)
  ),
  predicted_completion_date date,
  predicted_readiness_date date,
  risk_level text check (risk_level in ('GREEN', 'AMBER', 'RED', 'CRITICAL')),
  recommended_action text,
  pace_status text check (
    pace_status in ('ON_TRACK', 'SLIGHTLY_BEHIND', 'BEHIND', 'AHEAD', 'NO_ACTIVITY')
  ),
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index predictions_student_id_idx on public.predictions (student_id);
create index predictions_risk_level_idx on public.predictions (risk_level);

-- ---------------------------------------------------------------------------
-- prediction_history
-- ---------------------------------------------------------------------------

create table public.prediction_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  progress_percent numeric,
  qcm_average numeric,
  current_pace numeric,
  required_pace numeric,
  readiness_score numeric,
  readiness_probability numeric,
  predicted_completion_date date,
  predicted_readiness_date date,
  risk_level text,
  created_at timestamptz not null default now()
);

create index prediction_history_student_created_idx
  on public.prediction_history (student_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.learning_metrics enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_history enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or private.is_admin());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_admin_update"
  on public.profiles
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "students_select_own_or_admin"
  on public.students
  for select
  to authenticated
  using (profile_id = auth.uid() or private.is_admin());

create policy "students_update_own_or_admin"
  on public.students
  for update
  to authenticated
  using (profile_id = auth.uid() or private.is_admin())
  with check (profile_id = auth.uid() or private.is_admin());

create policy "students_insert_admin"
  on public.students
  for insert
  to authenticated
  with check (private.is_admin() or profile_id = auth.uid());

create policy "learning_metrics_select_own_or_admin"
  on public.learning_metrics
  for select
  to authenticated
  using (
    private.is_admin()
    or exists (
      select 1
      from public.students s
      where s.id = learning_metrics.student_id
        and s.profile_id = auth.uid()
    )
  );

create policy "learning_metrics_insert_admin"
  on public.learning_metrics
  for insert
  to authenticated
  with check (private.is_admin());

create policy "learning_metrics_update_admin"
  on public.learning_metrics
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "predictions_select_own_or_admin"
  on public.predictions
  for select
  to authenticated
  using (
    private.is_admin()
    or exists (
      select 1
      from public.students s
      where s.id = predictions.student_id
        and s.profile_id = auth.uid()
    )
  );

create policy "predictions_insert_admin"
  on public.predictions
  for insert
  to authenticated
  with check (private.is_admin());

create policy "predictions_update_admin"
  on public.predictions
  for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "prediction_history_select_own_or_admin"
  on public.prediction_history
  for select
  to authenticated
  using (
    private.is_admin()
    or exists (
      select 1
      from public.students s
      where s.id = prediction_history.student_id
        and s.profile_id = auth.uid()
    )
  );

create policy "prediction_history_insert_admin"
  on public.prediction_history
  for insert
  to authenticated
  with check (private.is_admin());

-- Durcissement : les triggers SECURITY DEFINER ne doivent pas être appelables via RPC.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

revoke all on function public.prevent_profile_role_escalation() from public;
revoke all on function public.prevent_profile_role_escalation() from anon;
revoke all on function public.prevent_profile_role_escalation() from authenticated;

revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_at() from anon;
revoke all on function public.set_updated_at() from authenticated;
