-- Centre d'intervention Coach — suivi workflow (Option A : ensure à la lecture).
-- La détection du risque reste sur public.predictions.risk_level.

create table if not exists public.coach_interventions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  status text not null
    check (status in ('OPEN', 'CONTACTED', 'FOLLOW_UP', 'RESOLVED')),
  -- 0 = CRITICAL, 1 = RED, 2 = AMBER (aligné RISK_SORT_ORDER)
  priority smallint not null default 2
    check (priority >= 0 and priority <= 3),
  assigned_to uuid null references auth.users (id) on delete set null,
  reasons text[] not null default '{}'::text[],
  risk_level text null
    check (
      risk_level is null
      or risk_level in ('GREEN', 'AMBER', 'RED', 'CRITICAL')
    ),
  created_at timestamptz not null default now(),
  contacted_at timestamptz null,
  resolved_at timestamptz null,
  created_by uuid null references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users (id) on delete set null
);

comment on table public.coach_interventions is
  'Cycles d''intervention coach. Un seul cycle actif (OPEN|CONTACTED|FOLLOW_UP) par apprenant.';

-- Idempotence : un seul cycle actif par student_id
create unique index if not exists coach_interventions_one_active_per_student
  on public.coach_interventions (student_id)
  where status in ('OPEN', 'CONTACTED', 'FOLLOW_UP');

create index if not exists coach_interventions_student_created_idx
  on public.coach_interventions (student_id, created_at desc);

create index if not exists coach_interventions_status_priority_idx
  on public.coach_interventions (status, priority, created_at desc);

alter table public.coach_interventions enable row level security;

revoke all on table public.coach_interventions from anon;
revoke all on table public.coach_interventions from authenticated;
grant select, insert, update on table public.coach_interventions to authenticated;
grant all on table public.coach_interventions to service_role;

-- Lecture staff (coach+)
drop policy if exists "coach_interventions_select_staff" on public.coach_interventions;
create policy "coach_interventions_select_staff"
  on public.coach_interventions
  for select
  to authenticated
  using (private.is_staff());

-- Insert staff (ensure côté app utilise souvent service_role ; policy de secours)
drop policy if exists "coach_interventions_insert_staff" on public.coach_interventions;
create policy "coach_interventions_insert_staff"
  on public.coach_interventions
  for insert
  to authenticated
  with check (private.is_staff());

-- Update staff (transitions de statut)
drop policy if exists "coach_interventions_update_staff" on public.coach_interventions;
create policy "coach_interventions_update_staff"
  on public.coach_interventions
  for update
  to authenticated
  using (private.is_staff())
  with check (private.is_staff());
