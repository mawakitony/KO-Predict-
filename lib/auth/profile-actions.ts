"use server";

import { revalidatePath } from "next/cache";
import {
  avatarStoragePath,
  validateAvatarFile,
} from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/server";

export type ProfileActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
};

function cleanName(value: FormDataEntryValue | null, max = 80): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function revalidateProfilePaths() {
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Session expirée. Reconnectez-vous." };
  }

  // Refuse toute tentative de changer rôle / email / statut via le formulaire
  if (formData.has("role") || formData.has("accountStatus") || formData.has("email")) {
    return { ok: false, error: "Modification non autorisée." };
  }

  const firstName = cleanName(formData.get("firstName"));
  const lastName = cleanName(formData.get("lastName"));
  const displayName = cleanName(formData.get("displayName"), 40);

  if (!firstName) {
    return { ok: false, error: "Le prénom est obligatoire." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
    })
    .eq("id", user.id);

  if (error) {
    return {
      ok: false,
      error: "Impossible d’enregistrer le profil. Réessayez.",
    };
  }

  revalidateProfilePaths();
  return {
    ok: true,
    message: "Profil mis à jour.",
    firstName,
    lastName,
    displayName,
  };
}

export async function uploadAvatarAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Session expirée. Reconnectez-vous." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return { ok: false, error: "Choisissez une image." };
  }

  const validated = validateAvatarFile({ type: file.type, size: file.size });
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  const path = avatarStoragePath(user.id, validated.ext);
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Nettoie les anciennes extensions éventuelles dans le dossier user
  const { data: existing } = await supabase.storage.from("avatars").list(user.id);
  if (existing?.length) {
    const toRemove = existing
      .map((f) => `${user.id}/${f.name}`)
      .filter((p) => p !== path);
    if (toRemove.length) {
      await supabase.storage.from("avatars").remove(toRemove);
    }
  }

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, {
      contentType: validated.contentType,
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    return {
      ok: false,
      error: "Upload impossible. Réessayez dans un instant.",
    };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (updateError) {
    return { ok: false, error: "Photo envoyée, mais profil non mis à jour." };
  }

  revalidateProfilePaths();
  return {
    ok: true,
    message: "Photo de profil mise à jour.",
    avatarUrl,
  };
}

export async function removeAvatarAction(): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Session expirée. Reconnectez-vous." };
  }

  const { data: files } = await supabase.storage.from("avatars").list(user.id);

  if (files?.length) {
    await supabase.storage
      .from("avatars")
      .remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "Impossible de retirer la photo." };
  }

  revalidateProfilePaths();
  return { ok: true, message: "Photo retirée.", avatarUrl: null };
}
