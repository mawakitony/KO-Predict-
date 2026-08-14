import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lookup Auth user by email.
 *
 * Stratégie (supabase-js v2 — pas de getUserByEmail admin) :
 * 1. profiles.email (lowercase) → auth id
 * 2. sinon auth.admin.listUsers paginé jusqu'à trouver l'email
 */
export async function findAuthUserByEmail(
  email: string,
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .maybeSingle();

  if (profile?.id) {
    const { data, error } = await admin.auth.admin.getUserById(profile.id);
    if (!error && data.user) return data.user;
  }

  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`listUsers Auth: ${error.message}`);
    }
    const users = data.users ?? [];
    const found = users.find(
      (u) => (u.email ?? "").trim().toLowerCase() === normalized,
    );
    if (found) return found;
    if (users.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }

  return null;
}

export function isAuthUserConfirmed(user: User): boolean {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

export function getAppOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function getFinalizeRedirectUrl(): string {
  return `${getAppOrigin()}/auth/callback?next=/auth/finalize`;
}
