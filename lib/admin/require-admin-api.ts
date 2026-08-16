import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { isLearnWorldsConfigured } from "@/lib/learnworlds/config";
import { canManageStudents } from "@/lib/auth/permissions";
import { parseUserRole } from "@/lib/auth/roles";
import { assertSuperAdminAal2Api } from "@/lib/auth/require-super-admin-aal2";
import type { UserRole } from "@/types/student";

export type PermissionGate =
  | { ok: true; userId: string; role: UserRole }
  | { ok: false; response: NextResponse };

async function requireAuthenticatedApi(): Promise<PermissionGate> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "SUPABASE_SERVICE_ROLE_KEY manquant.",
        },
        { status: 503 },
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Non authentifié." },
        { status: 401 },
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.account_status === "DISABLED") {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Accès refusé." },
        { status: 403 },
      ),
    };
  }

  if (profile.account_status === "PENDING_ACTIVATION") {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Compte non finalisé." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    userId: user.id,
    role: parseUserRole(profile.role),
  };
}

export async function requirePermissionApi(
  check: (role: UserRole) => boolean,
  forbiddenMessage = "Permission insuffisante.",
): Promise<PermissionGate> {
  const gate = await requireAuthenticatedApi();
  if (!gate.ok) return gate;

  if (!check(gate.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: forbiddenMessage },
        { status: 403 },
      ),
    };
  }

  // Phase D : SA + enforcement → AAL2 obligatoire (toutes routes /api/admin via ce guard).
  const mfa = await assertSuperAdminAal2Api(gate.role);
  if (!mfa.ok) return mfa;

  return gate;
}

/** Alias historique → gestion apprenants (admin+). */
export async function requireAdminApi(): Promise<PermissionGate> {
  return requirePermissionApi(
    canManageStudents,
    "Accès réservé aux administrateurs.",
  );
}

export function requireLearnWorldsApi(): NextResponse | null {
  if (!isLearnWorldsConfigured()) {
    return NextResponse.json(
      { ok: false, error: "LearnWorlds non configuré." },
      { status: 503 },
    );
  }
  return null;
}
