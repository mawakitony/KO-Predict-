-- Password reset codes: claim PROCESSING + reclaim timeout
-- PENDING → PROCESSING → USED (Auth success only)

alter table public.password_reset_codes
  drop constraint if exists password_reset_codes_status_check;

alter table public.password_reset_codes
  add constraint password_reset_codes_status_check
  check (
    status in (
      'PENDING',
      'PROCESSING',
      'USED',
      'EXPIRED',
      'REVOKED'
    )
  );

alter table public.password_reset_codes
  add column if not exists claimed_at timestamptz;

drop index if exists password_reset_codes_one_pending_per_student;

-- Un seul code « actif » (PENDING ou PROCESSING) par apprenant
create unique index if not exists password_reset_codes_one_active_per_student
  on public.password_reset_codes (student_id)
  where (status in ('PENDING', 'PROCESSING'));
