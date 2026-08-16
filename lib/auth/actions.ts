"use server";

import { redirect } from "next/navigation";
import { countActiveSuperAdmins } from "@/lib/admin/super-admin-guards";
import { canAccessAdmin } from "@/lib/auth/permissions";
import {
  resolveSuperAdminPostLoginMfaPath,
  sanitizeInternalNextPath,
} from "@/lib/auth/mfa-aal";
import { homePathForRole, parseUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error: string | null;
};

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Identifiants invalides. Vérifiez votre email et mot de passe." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connexion impossible. Réessayez." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_status === "DISABLED") {
    await supabase.auth.signOut();
    return {
      error:
        "Votre accès KO Predict™ a été désactivé. Contactez WOLOYEM.",
    };
  }

  if (profile?.account_status === "PENDING_ACTIVATION") {
    await supabase.auth.signOut();
    return {
      error:
        "Votre compte n’est pas encore finalisé. Utilisez Première connexion avec votre code d’activation.",
    };
  }

  const role = parseUserRole(profile?.role);
  const fallback = homePathForRole(role);
  const destination = sanitizeInternalNextPath(next) ?? fallback;

  // Un student ne doit pas être renvoyé vers /admin via ?next=
  if (!canAccessAdmin(role) && destination.startsWith("/admin")) {
    redirect("/dashboard");
  }

  // MFA post-login : super_admin uniquement (Phase C). Pas d’enforcement /admin ici.
  if (role === "super_admin") {
    const activeCount = await countActiveSuperAdmins();
    const [aal, factors] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    const verifiedTotpFactorCount = (factors.data?.totp ?? []).filter(
      (f) => f.status === "verified",
    ).length;

    const mfaPath = resolveSuperAdminPostLoginMfaPath({
      activeSuperAdminCount: activeCount,
      currentLevel: aal.data?.currentLevel ?? null,
      verifiedTotpFactorCount,
      intendedDestination: destination,
    });

    if (mfaPath) {
      redirect(mfaPath);
    }
  }

  redirect(destination);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
