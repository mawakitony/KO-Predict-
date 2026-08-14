import { NextResponse } from "next/server";
import { z } from "zod";
import { changeTeamRole } from "@/lib/admin/team";
import { requirePermissionApi } from "@/lib/admin/require-admin-api";
import { canChangeTeamRoles } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  profileId: z.string().uuid(),
  newRole: z.enum(["coach", "admin"]),
});

export async function POST(request: Request) {
  const gate = await requirePermissionApi(
    canChangeTeamRoles,
    "Changement de rôle réservé au super_admin.",
  );
  if (!gate.ok) return gate.response;

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "profileId et newRole (coach|admin) requis." },
      { status: 400 },
    );
  }

  const result = await changeTeamRole({
    profileId: parsed.data.profileId,
    newRole: parsed.data.newRole,
    actorId: gate.userId,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
