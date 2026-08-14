import { NextResponse } from "next/server";
import { z } from "zod";
import { createTeamMember } from "@/lib/admin/team";
import { requirePermissionApi } from "@/lib/admin/require-admin-api";
import { canManageTeam } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  role: z.enum(["coach", "admin"]),
});

/**
 * POST /api/admin/team/create
 * Super admin uniquement. Retourne activationCode une seule fois.
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
      { ok: false, error: "Données invalides (prénom, nom, email, rôle)." },
      { status: 400 },
    );
  }

  const result = await createTeamMember({
    ...parsed.data,
    actorId: gate.userId,
  });

  // Ne jamais logger result.activationCode
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
