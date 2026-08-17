-- États des guides contextuels apprenant (auto-affichage + futur bouton Aide).
-- Lecture / écriture : l’apprenant uniquement sur SES lignes.
-- service_role : logique serveur si nécessaire (bypass RLS).

create table if not exists public.learner_guide_states (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  guide_key text not null,
  shown_at timestamptz null,
  dismissed_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_guide_states_student_key unique (student_id, guide_key)
);

comment on table public.learner_guide_states is
  'Guides contextuels apprenant. dismissed/completed bloquent l’auto-affichage ; shown_at seul ne bloque pas.';

create index if not exists learner_guide_states_student_idx
  on public.learner_guide_states (student_id);

drop trigger if exists learner_guide_states_set_updated_at on public.learner_guide_states;
create trigger learner_guide_states_set_updated_at
  before update on public.learner_guide_states
  for each row
  execute function public.set_updated_at();

alter table public.learner_guide_states enable row level security;

revoke all on table public.learner_guide_states from anon;
revoke all on table public.learner_guide_states from authenticated;
grant select, insert, update on table public.learner_guide_states to authenticated;
grant all on table public.learner_guide_states to service_role;

drop policy if exists "learner_guide_states_select_own" on public.learner_guide_states;
create policy "learner_guide_states_select_own"
  on public.learner_guide_states
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = learner_guide_states.student_id
        and s.profile_id = auth.uid()
    )
  );

drop policy if exists "learner_guide_states_insert_own" on public.learner_guide_states;
create policy "learner_guide_states_insert_own"
  on public.learner_guide_states
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.students s
      where s.id = learner_guide_states.student_id
        and s.profile_id = auth.uid()
    )
  );

drop policy if exists "learner_guide_states_update_own" on public.learner_guide_states;
create policy "learner_guide_states_update_own"
  on public.learner_guide_states
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = learner_guide_states.student_id
        and s.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.students s
      where s.id = learner_guide_states.student_id
        and s.profile_id = auth.uid()
    )
  );
