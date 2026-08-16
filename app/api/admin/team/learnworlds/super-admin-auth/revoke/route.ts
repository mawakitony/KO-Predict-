import { NextResponse } from "next/server";
import { z } from "zod";
import { revokeLearnWorldsSuperAdminAuthorization } from "@/lib/admin/learnworlds-super-admin-authorizations";
import { requirePermissionApi } from "@/lib/admin/require-admin-api";
import { canManageTeam } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  authorizationId: z.string().uuid(),
});

/**
 * POST — révoque une autorisation ACTIVE.
 * Ne modifie jamais profiles.role. Super admin + AAL2.
 */
export async function POST(request: Request) {
  const gate = await requirePermissionApi(
    canManageTeam,
    "Gestion d’équipe réservée au super_admin.",
  );
  if (!gate.ok) return gate.response;

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "authorizationId requis.",
        reasonCode: "INVALID_BODY",
      },
      { status: 400 },
    );
  }

  const result = await revokeLearnWorldsSuperAdminAuthorization({
    authorizationId: parsed.data.authorizationId,
    actorId: gate.userId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
