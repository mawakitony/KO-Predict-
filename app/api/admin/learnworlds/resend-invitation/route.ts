import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/admin/require-admin-api";
import { canRegenerateActivationCode } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * Ancien parcours « renvoyer invitation email » — OBSOLÈTE (V1 code d’activation).
 * Utiliser POST /api/admin/students/regenerate-activation-code
 */
export async function POST() {
  const gate = await requirePermissionApi(
    canRegenerateActivationCode,
    "Accès réservé aux administrateurs.",
  );
  if (!gate.ok) return gate.response;

  return NextResponse.json(
    {
      ok: false,
      error:
        "Les invitations email sont obsolètes. Utilisez « Régénérer le code » (PENDING_ACTIVATION).",
    },
    { status: 410 },
  );
}
