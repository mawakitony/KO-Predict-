-- Profil utilisateur : pseudo (display_name) + photo (avatar_url)
-- + protection account_status/email + bucket storage avatars
-- Préférences KO Predict™ : display_name / avatar_url ne doivent PAS être
-- écrasés par la sync LearnWorlds (géré côté application).

alter table public.profiles
  add column if not exists display_name text;

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.display_name is 'Pseudo KO Predict™ (modifiable par l’utilisateur, jamais écrasé par LearnWorlds).';
comment on column public.profiles.avatar_url is 'URL photo de profil KO Predict™ (bucket avatars, jamais écrasée par LearnWorlds).';

-- Empêche un utilisateur de modifier statut / e-mail / rôle hors chemins autorisés
create or replace function public.prevent_profile_sensitive_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and auth.uid() is not null then
    if old.role is distinct from new.role
      and not private.is_super_admin() then
      raise exception 'Modification du rôle non autorisée';
    end if;

    if old.account_status is distinct from new.account_status
      and not private.is_admin_or_above() then
      raise exception 'Modification du statut de compte non autorisée';
    end if;

    if old.email is distinct from new.email
      and not private.is_super_admin() then
      raise exception 'Modification de l’e-mail non autorisée';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_sensitive_escalation on public.profiles;
create trigger profiles_prevent_sensitive_escalation
before update on public.profiles
for each row
execute function public.prevent_profile_sensitive_escalation();

-- S’assurer que l’utilisateur peut mettre à jour son propre profil
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Storage : bucket public pour les avatars (max 5 Mo, JPG/PNG/WebP)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
