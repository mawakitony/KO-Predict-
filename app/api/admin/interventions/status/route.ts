import { NextResponse } from "next/server";
import { canTransitionInterventionStatus } from "@/lib/admin/interventions/logic";
import { updateInterventionStatus } from "@/lib/admin/interventions/service";
import {
  INTERVENTION_STATUSES,
  type InterventionStatus,
} from "@/lib/admin/interventions/types";
import { requirePermissionApi } from "@/lib/admin/require-admin-api";
import { recordAccessAudit } from "@/lib/auth/access-audit";
import { canManageInterventions } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/interventions/status
 * Body: { interventionId: string, status: CONTACTED|FOLLOW_UP|RESOLVED }
 */
export async function POST(request: Request) {
  const gate = await requirePermissionApi(
    canManageInterventions,
    "Gestion des interventions réservée au staff.",
  );
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => null)) as {
    interventionId?: string;
    status?: string;
  } | null;

  const interventionId = body?.interventionId?.trim();
  const status = body?.status as InterventionStatus | undefined;

  if (!interventionId || !status) {
    return NextResponse.json(
      { ok: false, error: "interventionId et status requis." },
      { status: 400 },
    );
  }

  if (!INTERVENTION_STATUSES.includes(status) || status === "OPEN") {
    return NextResponse.json(
      { ok: false, error: "Statut invalide." },
      { status: 400 },
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Base non configurée." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("coach_interventions")
    .select("status")
    .eq("id", interventionId)
    .maybeSingle();

  if (!current) {
    return NextResponse.json(
      { ok: false, error: "Intervention introuvable." },
      { status: 404 },
    );
  }

  if (
    !canTransitionInterventionStatus(
      current.status as InterventionStatus,
      status,
    )
  ) {
    return NextResponse.json(
      { ok: false, error: "Transition de statut non autorisée." },
      { status: 400 },
    );
  }

  const result = await updateInterventionStatus({
    interventionId,
    status,
    actorId: gate.userId,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  const auditType =
    status === "CONTACTED"
      ? "INTERVENTION_CONTACTED"
      : status === "FOLLOW_UP"
        ? "INTERVENTION_FOLLOW_UP"
        : status === "RESOLVED"
          ? "INTERVENTION_RESOLVED"
          : null;

  if (auditType) {
    await recordAccessAudit({
      eventType: auditType,
      studentId: result.intervention.studentId,
      actorId: gate.userId,
      meta: {
        interventionId: result.intervention.id,
        status,
      },
    });
  }

  return NextResponse.json({ ok: true, intervention: result.intervention });
}
