-- Password reset codes V1 (étudiants ACTIVE — distinct de first-access / activation_codes)

create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
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

-- Un seul code PENDING actif par apprenant
create unique index if not exists password_reset_codes_one_pending_per_student
  on public.password_reset_codes (student_id)
  where (status = 'PENDING');

create index if not exists password_reset_codes_email_idx
  on public.password_reset_codes (lower(email));

create index if not exists password_reset_codes_student_idx
  on public.password_reset_codes (student_id);

create index if not exists password_reset_codes_status_idx
  on public.password_reset_codes (status);

drop trigger if exists password_reset_codes_set_updated_at on public.password_reset_codes;
create trigger password_reset_codes_set_updated_at
before update on public.password_reset_codes
for each row
execute function public.set_updated_at();

alter table public.password_reset_codes enable row level security;

-- Lecture admin/SA uniquement — jamais de hash exposé aux rôles anon/public
drop policy if exists "password_reset_codes_select_admin" on public.password_reset_codes;
create policy "password_reset_codes_select_admin"
  on public.password_reset_codes
  for select
  to authenticated
  using (private.is_admin_or_above());

revoke all on table public.password_reset_codes from anon;
revoke all on table public.password_reset_codes from authenticated;
grant select on table public.password_reset_codes to authenticated;
grant all on table public.password_reset_codes to service_role;
