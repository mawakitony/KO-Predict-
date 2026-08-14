-- Statut d'accès KO Predict™ (indépendant des invitations / du rôle)

alter table public.profiles
  add column if not exists account_status text not null default 'ACTIVE'
    check (account_status in ('ACTIVE', 'DISABLED'));

update public.profiles
set account_status = 'ACTIVE'
where account_status is null;

create index if not exists profiles_account_status_idx
  on public.profiles (account_status);
