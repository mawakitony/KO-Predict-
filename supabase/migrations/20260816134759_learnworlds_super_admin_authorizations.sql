-- Phase A : autorisations LearnWorlds → éligibilité super_admin KO (pas de promotion auto).
-- Writes : service_role uniquement. Lecture authenticated : super_admin seulement.

create table if not exists public.learnworlds_super_admin_authorizations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  learnworlds_user_id text null,
  status text not null
    check (status in ('ACTIVE', 'REVOKED')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  revoked_by uuid null references public.profiles (id),
  revoked_at timestamptz null,
  note text null,
  constraint learnworlds_sa_auth_email_normalized
    check (email = lower(trim(email))),
  constraint learnworlds_sa_auth_status_revoke_coherence
    check (
      (status = 'ACTIVE' and revoked_by is null and revoked_at is null)
      or (status = 'REVOKED' and revoked_at is not null and revoked_by is not null)
    )
);

comment on table public.learnworlds_super_admin_authorizations is
  'Éligibilité explicite SA KO liée à une identité LearnWorlds. INSERT ≠ promotion de rôle.';

create unique index if not exists learnworlds_sa_auth_one_active_email_idx
  on public.learnworlds_super_admin_authorizations (email)
  where status = 'ACTIVE';

create unique index if not exists learnworlds_sa_auth_one_active_lw_id_idx
  on public.learnworlds_super_admin_authorizations (learnworlds_user_id)
  where status = 'ACTIVE' and learnworlds_user_id is not null;

create index if not exists learnworlds_sa_auth_created_at_idx
  on public.learnworlds_super_admin_authorizations (created_at desc);

create index if not exists learnworlds_sa_auth_status_idx
  on public.learnworlds_super_admin_authorizations (status);

alter table public.learnworlds_super_admin_authorizations enable row level security;

drop policy if exists "learnworlds_sa_auth_select_super_admin"
  on public.learnworlds_super_admin_authorizations;
create policy "learnworlds_sa_auth_select_super_admin"
  on public.learnworlds_super_admin_authorizations
  for select
  to authenticated
  using (private.is_super_admin());

-- Aucune écriture authenticated : service_role uniquement (API admin).
revoke all on table public.learnworlds_super_admin_authorizations from anon;
revoke all on table public.learnworlds_super_admin_authorizations from authenticated;
grant select on table public.learnworlds_super_admin_authorizations to authenticated;
grant all on table public.learnworlds_super_admin_authorizations to service_role;
