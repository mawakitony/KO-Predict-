import { NextResponse } from "next/server";
import { z } from "zod";
import { promoteToSuperAdmin } from "@/lib/admin/promote-super-admin";
import { requirePermissionApi } from "@/lib/admin/require-admin-api";
import { canChangeTeamRoles } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  profileId: z.string().uuid(),
  confirmEmail: z.string().min(3).max(320),
  confirmAcknowledged: z.literal(true),
});

export async function POST(request: Request) {
  const gate = await requirePermissionApi(
    canChangeTeamRoles,
    "Promotion super_admin réservée au super_admin.",
  );
  if (!gate.ok) return gate.response;

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "profileId, confirmEmail et confirmation explicite (confirmAcknowledged: true) requis.",
        reasonCode: "INVALID_BODY",
      },
      { status: 400 },
    );
  }

  const result = await promoteToSuperAdmin({
    targetProfileId: parsed.data.profileId,
    actorId: gate.userId,
    confirmEmail: parsed.data.confirmEmail,
    confirmAcknowledged: parsed.data.confirmAcknowledged,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
