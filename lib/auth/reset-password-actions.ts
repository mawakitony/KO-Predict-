"use server";

import { createClient } from "@/lib/supabase/server";

export type ResetPasswordActionState = { error: string | null; ok?: boolean };

/**
 * Définit un nouveau mot de passe après session recovery Supabase.
 * Ne modifie pas account_status, role, students, ni LearnWorlds.
 */
export async function setNewPasswordAfterRecoveryAction(
  _prev: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return {
      error: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }
  if (password !== confirm) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Lien de réinitialisation invalide ou expiré. Demandez un nouvel envoi à votre administrateur.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  await supabase.auth.signOut();

  return { error: null, ok: true };
}
