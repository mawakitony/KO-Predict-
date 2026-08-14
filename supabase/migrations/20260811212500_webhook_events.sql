-- Phase 11 : journal d'événements LearnWorlds (idempotence)

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  delivery_key text not null unique,
  event_type text,
  trigger_name text,
  learnworlds_user_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'failed')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index webhook_events_created_at_idx on public.webhook_events (created_at desc);
create index webhook_events_lw_user_idx on public.webhook_events (learnworlds_user_id);
create index webhook_events_status_idx on public.webhook_events (status);

alter table public.webhook_events enable row level security;

create policy "webhook_events_select_admin"
  on public.webhook_events
  for select
  to authenticated
  using (private.is_admin());

revoke all on table public.webhook_events from anon;
grant select on table public.webhook_events to authenticated;
grant all on table public.webhook_events to service_role;
