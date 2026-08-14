import { NextResponse } from "next/server";
import { z } from "zod";
import { enableTeamMember } from "@/lib/admin/team";
import { requirePermissionApi } from "@/lib/admin/require-admin-api";
import { canManageTeam } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  profileId: z.string().uuid(),
});

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
      { ok: false, error: "profileId requis." },
      { status: 400 },
    );
  }

  const result = await enableTeamMember(parsed.data.profileId, gate.userId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
