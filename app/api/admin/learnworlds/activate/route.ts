import { NextResponse } from "next/server";
import { activateLearnWorldsLearner } from "@/lib/admin/activate-learner";
import { invalidateLearnWorldsRosterCache } from "@/lib/admin/learnworlds-roster";
import {
  requirePermissionApi,
  requireLearnWorldsApi,
} from "@/lib/admin/require-admin-api";
import { canActivateStudents } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/learnworlds/activate
 * Body: { learnworldsUserId: string }
 * Réponse : activationCode (clair une seule fois) + activationExpiresAt
 */
export async function POST(request: Request) {
  const gate = await requirePermissionApi(
    canActivateStudents,
    "Activation réservée aux administrateurs.",
  );
  if (!gate.ok) return gate.response;

  const lwGate = requireLearnWorldsApi();
  if (lwGate) return lwGate;

  const body = (await request.json().catch(() => null)) as {
    learnworldsUserId?: string;
  } | null;

  const learnworldsUserId = body?.learnworldsUserId?.trim();
  if (!learnworldsUserId) {
    return NextResponse.json(
      { ok: false, error: "learnworldsUserId requis." },
      { status: 400 },
    );
  }

  const result = await activateLearnWorldsLearner(learnworldsUserId, {
    actorId: gate.userId,
  });

  if (result.ok) invalidateLearnWorldsRosterCache();

  // Ne jamais logger result.activationCode
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
