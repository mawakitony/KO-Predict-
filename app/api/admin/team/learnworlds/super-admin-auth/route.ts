import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createLearnWorldsSuperAdminAuthorization,
  listLearnWorldsSuperAdminAuthorizations,
} from "@/lib/admin/learnworlds-super-admin-authorizations";
import {
  requireLearnWorldsApi,
  requirePermissionApi,
} from "@/lib/admin/require-admin-api";
import { canManageTeam } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const createBodySchema = z.object({
  email: z.string().min(3).max(254),
  note: z.string().max(500).optional().nullable(),
  expectedLearnWorldsUserId: z.string().min(1).max(128).optional().nullable(),
});

/**
 * GET — liste des autorisations SA LearnWorlds.
 * POST — crée une autorisation ACTIVE (éligibilité seulement, pas de promotion).
 * Super admin + AAL2.
 */
export async function GET() {
  const gate = await requirePermissionApi(
    canManageTeam,
    "Gestion d’équipe réservée au super_admin.",
  );
  if (!gate.ok) return gate.response;

  try {
    const authorizations = await listLearnWorldsSuperAdminAuthorizations();
    return NextResponse.json({ ok: true, authorizations });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Lecture impossible.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gate = await requirePermissionApi(
    canManageTeam,
    "Gestion d’équipe réservée au super_admin.",
  );
  if (!gate.ok) return gate.response;

  const lwGate = requireLearnWorldsApi();
  if (lwGate) return lwGate;

  const raw = await request.json().catch(() => null);
  const parsed = createBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Adresse email invalide.", reasonCode: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const result = await createLearnWorldsSuperAdminAuthorization({
    email: parsed.data.email,
    actorId: gate.userId,
    note: parsed.data.note,
    expectedLearnWorldsUserId: parsed.data.expectedLearnWorldsUserId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
