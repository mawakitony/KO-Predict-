"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export type FinalizeActionState = { error: string | null };

export async function setPasswordAction(
  formData: FormData,
): Promise<FinalizeActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
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
        "Session d'invitation invalide ou expirée. Rouvrez le lien reçu par email.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function markInvitationAcceptedAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSupabaseAdminConfigured()) return;

  const admin = createAdminClient();
  const acceptedAt = new Date().toISOString();

  await admin
    .from("invitations")
    .update({
      status: "ACCEPTED",
      accepted_at: acceptedAt,
      error_message: null,
      auth_user_id: user.id,
    })
    .eq("status", "PENDING")
    .or(
      user.email
        ? `auth_user_id.eq.${user.id},email.ilike.${user.email}`
        : `auth_user_id.eq.${user.id}`,
    );

  // Idempotent : repasse ACTIVE après finalisation (désactivation = autre flux).
  await admin
    .from("profiles")
    .update({ account_status: "ACTIVE" })
    .eq("id", user.id);
}
