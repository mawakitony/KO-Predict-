-- Plans de progression apprenant (cycle 7 jours).
-- Écriture : service_role uniquement. Lecture : own student + staff.

create table if not exists public.learner_work_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  plan_type text not null
    check (plan_type in ('STARTUP', 'CATCH_UP', 'CONSOLIDATION')),
  status text not null
    check (status in ('ACTIVE', 'COMPLETED', 'PARTIAL', 'EXPIRED', 'SUPERSEDED')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  snapshot jsonb not null default '{}'::jsonb,
  tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint learner_work_plans_ends_after_starts check (ends_at > starts_at)
);

comment on table public.learner_work_plans is
  'Plans de progression 7 jours. Un seul plan ACTIVE par apprenant.';

-- Anti-concurrence : un seul ACTIVE par student
create unique index if not exists learner_work_plans_one_active_per_student
  on public.learner_work_plans (student_id)
  where status = 'ACTIVE';

create index if not exists learner_work_plans_student_ends_idx
  on public.learner_work_plans (student_id, ends_at desc);

create index if not exists learner_work_plans_student_created_idx
  on public.learner_work_plans (student_id, created_at desc);

alter table public.learner_work_plans enable row level security;

revoke all on table public.learner_work_plans from anon;
revoke all on table public.learner_work_plans from authenticated;
-- Lecture seule pour clients authentifiés (policies ci-dessous).
grant select on table public.learner_work_plans to authenticated;
grant all on table public.learner_work_plans to service_role;

-- Student : lecture de ses propres plans uniquement
drop policy if exists "learner_work_plans_select_own" on public.learner_work_plans;
create policy "learner_work_plans_select_own"
  on public.learner_work_plans
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = learner_work_plans.student_id
        and s.profile_id = auth.uid()
    )
  );

-- Staff (coach / admin / super_admin) : lecture
drop policy if exists "learner_work_plans_select_staff" on public.learner_work_plans;
create policy "learner_work_plans_select_staff"
  on public.learner_work_plans
  for select
  to authenticated
  using (private.is_staff());

-- Aucune policy INSERT/UPDATE/DELETE pour authenticated
-- → écritures clients impossibles ; service_role bypass RLS.
