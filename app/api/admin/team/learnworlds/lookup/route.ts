import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupLearnWorldsCoachByEmail } from "@/lib/admin/learnworlds-coach-lookup";
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
 * POST /api/admin/team/learnworlds/lookup
 * Super admin + AAL2. Lookup LW uniquement — aucune création / mutation de rôle KO.
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
      { ok: false, error: "Adresse email invalide." },
      { status: 400 },
    );
  }

  const result = await lookupLearnWorldsCoachByEmail(parsed.data.email);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
