-- Admin roster LearnWorlds — invitations KO Predict™

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  learnworlds_user_id text not null,
  email text not null,
  status text not null
    check (status in ('PENDING', 'ACCEPTED', 'FAILED', 'EXPIRED')),
  auth_user_id uuid references auth.users (id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  last_sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_lw_user_unique unique (learnworlds_user_id)
);

create index invitations_email_idx on public.invitations (lower(email));
create index invitations_status_idx on public.invitations (status);
create index invitations_auth_user_idx on public.invitations (auth_user_id);

create trigger invitations_set_updated_at
before update on public.invitations
for each row
execute function public.set_updated_at();

alter table public.invitations enable row level security;

create policy "invitations_select_admin"
  on public.invitations
  for select
  to authenticated
  using (private.is_admin());

revoke all on table public.invitations from anon;
grant select on table public.invitations to authenticated;
grant all on table public.invitations to service_role;
