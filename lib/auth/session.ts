import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { homePathForRole, parseUserRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types/student";
import type { ProfileAccountStatusDb } from "@/lib/admin/types";

export interface AuthProfile {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  accountStatus: ProfileAccountStatusDb;
}

export async function getSessionUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const full = await supabase
    .from("profiles")
    .select(
      "id, email, first_name, last_name, display_name, avatar_url, role, account_status",
    )
    .eq("id", user.id)
    .maybeSingle();

  // Compat : migration avatar/pseudo pas encore appliquée
  const legacy =
    full.error != null
      ? await supabase
          .from("profiles")
          .select("id, email, first_name, last_name, role, account_status")
          .eq("id", user.id)
          .maybeSingle()
      : null;

  const profile = full.data ?? legacy?.data ?? null;

  if (!profile) {
    return {
      id: user.id,
      email: user.email ?? null,
      firstName: null,
      lastName: null,
      displayName: null,
      avatarUrl: null,
      role: "student",
      accountStatus: "ACTIVE",
    };
  }

  const row = profile as {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    role: string;
    account_status: string | null;
  };

  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    role: parseUserRole(row.role),
    accountStatus:
      row.account_status === "DISABLED"
        ? "DISABLED"
        : row.account_status === "PENDING_ACTIVATION"
          ? "PENDING_ACTIVATION"
          : "ACTIVE",
  };
}

/** Compte authentifié actif (ni désactivé, ni en attente d’activation). */
export async function requireActiveAccount(options?: {
  next?: string;
}): Promise<AuthProfile> {
  const profile = await requireAuth(options);
  if (profile.accountStatus === "DISABLED") {
    redirect("/access-disabled");
  }
  if (profile.accountStatus === "PENDING_ACTIVATION") {
    redirect("/first-access");
  }
  return profile;
}

export async function requireAuth(options?: {
  next?: string;
}): Promise<AuthProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    const next = options?.next
      ? `?next=${encodeURIComponent(options.next)}`
      : "";
    redirect(`/login${next}`);
  }
  return profile;
}

/** Accès espace admin (coach / admin / super_admin ACTIVE). */
export async function requireAdmin(): Promise<AuthProfile> {
  const profile = await requireAuth({ next: "/admin" });
  if (profile.accountStatus === "DISABLED") {
    redirect("/access-disabled");
  }
  if (profile.accountStatus === "PENDING_ACTIVATION") {
    redirect("/first-access");
  }
  if (!canAccessAdmin(profile.role)) {
    redirect(homePathForRole(profile.role));
  }
  return profile;
}

export async function requireSuperAdmin(): Promise<AuthProfile> {
  const profile = await requireAdmin();
  if (profile.role !== "super_admin") {
    redirect("/admin");
  }
  return profile;
}

export async function requireStudentArea(): Promise<AuthProfile> {
  const profile = await requireAuth({ next: "/dashboard" });
  if (profile.accountStatus === "DISABLED") {
    redirect("/access-disabled");
  }
  if (profile.accountStatus === "PENDING_ACTIVATION") {
    redirect("/first-access");
  }
  return profile;
}
