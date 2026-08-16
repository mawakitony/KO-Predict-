import { NextResponse } from "next/server";
import { z } from "zod";
import { createLearnWorldsCoach } from "@/lib/admin/learnworlds-coach-create";
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
 * POST /api/admin/team/learnworlds/create-coach
 * Super admin + AAL2. Revalide LearnWorlds côté serveur avant création.
 * Body : { email } uniquement — aucun rôle LW client.
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

  const result = await createLearnWorldsCoach({
    email: parsed.data.email,
    actorId: gate.userId,
  });

  // Ne jamais logger activationCode.
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result, { status: 200 });
}
