-- Activation codes V1 (sans email d'invitation Supabase)
-- + account_status PENDING_ACTIVATION
-- + audit minimal des accès

-- 1) profiles.account_status : ACTIVE | DISABLED | PENDING_ACTIVATION
alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('ACTIVE', 'DISABLED', 'PENDING_ACTIVATION'));

-- Comptes encore en invitation email PENDING → première connexion par code
update public.profiles p
set account_status = 'PENDING_ACTIVATION',
    updated_at = now()
from public.invitations i
where i.auth_user_id = p.id
  and i.status = 'PENDING'
  and p.account_status = 'ACTIVE';

-- 2) activation_codes
create table if not exists public.activation_codes (
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

create unique index if not exists activation_codes_one_pending_per_student
  on public.activation_codes (student_id)
  where (status = 'PENDING');

create index if not exists activation_codes_email_idx
  on public.activation_codes (lower(email));

create index if not exists activation_codes_student_idx
  on public.activation_codes (student_id);

create index if not exists activation_codes_status_idx
  on public.activation_codes (status);

drop trigger if exists activation_codes_set_updated_at on public.activation_codes;
create trigger activation_codes_set_updated_at
before update on public.activation_codes
for each row
execute function public.set_updated_at();

alter table public.activation_codes enable row level security;

drop policy if exists "activation_codes_select_admin" on public.activation_codes;
create policy "activation_codes_select_admin"
  on public.activation_codes
  for select
  to authenticated
  using (private.is_admin());

revoke all on table public.activation_codes from anon;
revoke all on table public.activation_codes from authenticated;
grant select on table public.activation_codes to authenticated;
grant all on table public.activation_codes to service_role;

-- 3) audit accès (sans secrets / codes / mots de passe)
create table if not exists public.access_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  student_id uuid references public.students (id) on delete set null,
  auth_user_id uuid references auth.users (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists access_audit_events_created_idx
  on public.access_audit_events (created_at desc);

create index if not exists access_audit_events_student_idx
  on public.access_audit_events (student_id);

alter table public.access_audit_events enable row level security;

drop policy if exists "access_audit_select_admin" on public.access_audit_events;
create policy "access_audit_select_admin"
  on public.access_audit_events
  for select
  to authenticated
  using (private.is_admin());

revoke all on table public.access_audit_events from anon;
revoke all on table public.access_audit_events from authenticated;
grant select on table public.access_audit_events to authenticated;
grant all on table public.access_audit_events to service_role;
