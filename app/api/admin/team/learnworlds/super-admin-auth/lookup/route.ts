import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupLearnWorldsSuperAdminAuthCandidate } from "@/lib/admin/learnworlds-super-admin-auth-lookup";
import {
  requireLearnWorldsApi,
  requirePermissionApi,
} from "@/lib/admin/require-admin-api";
import { canManageTeam } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().min(3).max(254),
});

/**
 * POST — lookup LW pour autorisation SA (lecture seule).
 * Aucune création d’autorisation, aucune promotion.
 */
export async function POST(request: Request) {
  const gate = await requirePermissionApi(
    canManageTeam,
    "Gestion d’équipe réservée au super_admin.",
  );
  if (!gate.ok) return gate.response;

  const lwGate = requireLearnWorldsApi();
  if (lwGate) return lwGate;

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Adresse email invalide.", reasonCode: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const result = await lookupLearnWorldsSuperAdminAuthCandidate(
    parsed.data.email,
  );
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
