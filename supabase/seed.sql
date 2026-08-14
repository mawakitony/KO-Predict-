-- KO Predict™ — seed Phase 4 : Tony Test
-- Idempotent : réexécutable (supprime puis recrée le jeu de démo).

do $$
declare
  v_user_id uuid := 'a1111111-1111-4111-8111-111111111111';
  v_student_id uuid := 'a2222222-2222-4222-8222-222222222222';
  v_email text := 'tony.test@kopredict.dev';
  v_password text := 'TonyTest123!';
begin
  -- Nettoyage éventuel (ordre FK)
  delete from public.prediction_history where student_id = v_student_id;
  delete from public.predictions where student_id = v_student_id;
  delete from public.learning_metrics where student_id = v_student_id;
  delete from public.students where id = v_student_id;
  delete from auth.identities where user_id = v_user_id;
  delete from auth.users where id = v_user_id;
  -- profiles part via cascade auth.users → profiles

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Tony","last_name":"Test"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  -- Le trigger handle_new_user crée déjà profiles ; on complète.
  update public.profiles
  set
    first_name = 'Tony',
    last_name = 'Test',
    email = v_email,
    role = 'student',
    updated_at = now()
  where id = v_user_id;

  insert into public.students (
    id,
    profile_id,
    learnworlds_user_id,
    certification,
    target_exam_date,
    enrollment_date,
    timezone
  ) values (
    v_student_id,
    v_user_id,
    'lw_tony_test_demo',
    'PMP',
    date '2026-09-25',
    date '2026-06-01',
    'Europe/Paris'
  );

  insert into public.learning_metrics (
    student_id,
    progress_percent,
    completed_activities,
    total_activities,
    study_time_minutes,
    qcm_average,
    recent_qcm_average,
    last_activity_date,
    inactive_days,
    study_sessions,
    recorded_at,
    source
  ) values (
    v_student_id,
    62,
    62,
    100,
    720,
    78,
    81,
    now() - interval '1 day',
    1,
    24,
    now(),
    'manual'
  );

  -- Historique fictif (évolution readiness) pour graphiques futurs
  insert into public.prediction_history (
    student_id,
    progress_percent,
    qcm_average,
    current_pace,
    required_pace,
    readiness_score,
    readiness_probability,
    predicted_completion_date,
    predicted_readiness_date,
    risk_level,
    created_at
  ) values
    (v_student_id, 42, 70, 3.5, 8.0, 42, 48, date '2026-10-05', date '2026-10-12', 'RED', timestamptz '2026-08-01 10:00:00+00'),
    (v_student_id, 51, 74, 4.0, 7.5, 51, 58, date '2026-09-28', date '2026-10-05', 'RED', timestamptz '2026-08-05 10:00:00+00'),
    (v_student_id, 58, 76, 4.5, 7.2, 60, 66, date '2026-09-22', date '2026-09-29', 'AMBER', timestamptz '2026-08-10 10:00:00+00');
end;
$$;
