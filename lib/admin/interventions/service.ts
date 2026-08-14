import "server-only";

import {
  compareInterventionRows,
  decideEnsureAction,
  deriveInterventionReasons,
  riskNeedsIntervention,
} from "@/lib/admin/interventions/logic";
import {
  ACTIVE_INTERVENTION_STATUSES,
  riskToPriority,
  type CoachInterventionCard,
  type CoachInterventionRecord,
  type InterventionReasonCode,
  type InterventionStatus,
} from "@/lib/admin/interventions/types";
import type { AdminStudentRow } from "@/lib/admin/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import type { RiskLevel } from "@/types/prediction";

export type { CoachInterventionCard };

function mapRow(raw: Record<string, unknown>): CoachInterventionRecord {
  const reasons = Array.isArray(raw.reasons)
    ? (raw.reasons as string[]).filter(Boolean) as InterventionReasonCode[]
    : [];
  return {
    id: String(raw.id),
    studentId: String(raw.student_id),
    status: raw.status as InterventionStatus,
    priority: Number(raw.priority ?? 3),
    assignedTo: (raw.assigned_to as string | null) ?? null,
    reasons,
    riskLevel: (raw.risk_level as RiskLevel | null) ?? null,
    createdAt: String(raw.created_at),
    contactedAt: (raw.contacted_at as string | null) ?? null,
    resolvedAt: (raw.resolved_at as string | null) ?? null,
    createdBy: (raw.created_by as string | null) ?? null,
    updatedAt: String(raw.updated_at),
    updatedBy: (raw.updated_by as string | null) ?? null,
  };
}

function syntheticId(studentId: string): string {
  return `demo-intervention-${studentId}`;
}

/** Interventions démo (pas de persistance). */
export function buildDemoInterventionCards(
  rows: AdminStudentRow[],
): CoachInterventionCard[] {
  const cards: CoachInterventionCard[] = [];
  const now = new Date().toISOString();
  for (const row of rows) {
    if (!riskNeedsIntervention(row.prediction.riskLevel)) continue;
    const reasons = deriveInterventionReasons(row);
    const priority = riskToPriority(row.prediction.riskLevel);
    cards.push({
      row,
      intervention: {
        id: syntheticId(row.student.studentId),
        studentId: row.student.studentId,
        status: "OPEN",
        priority,
        assignedTo: null,
        reasons,
        riskLevel: row.prediction.riskLevel,
        createdAt: now,
        contactedAt: null,
        resolvedAt: null,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
      },
    });
  }
  return cards.sort((a, b) =>
    compareInterventionRows(
      {
        priority: a.intervention.priority,
        targetExamDate: a.row.student.targetExamDate,
        inactiveDays: a.row.metrics.inactiveDays,
      },
      {
        priority: b.intervention.priority,
        targetExamDate: b.row.student.targetExamDate,
        inactiveDays: b.row.metrics.inactiveDays,
      },
    ),
  );
}

/**
 * Option A : assure les cycles actifs à la lecture (idempotent),
 * puis retourne les cartes jointes aux rows admin.
 */
export async function ensureAndLoadInterventionCards(
  rows: AdminStudentRow[],
  dataSource: "demo" | "database",
): Promise<CoachInterventionCard[]> {
  if (dataSource === "demo" || !isSupabaseAdminConfigured()) {
    return buildDemoInterventionCards(rows);
  }

  const byStudent = new Map(rows.map((r) => [r.student.studentId, r]));
  const admin = createAdminClient();

  const { data: existing, error } = await admin
    .from("coach_interventions")
    .select("*")
    .in("status", [...ACTIVE_INTERVENTION_STATUSES]);

  if (error) {
    console.error("[interventions] load active", error.message);
    return buildDemoInterventionCards(rows);
  }

  const activeByStudent = new Map<string, CoachInterventionRecord>();
  for (const raw of existing ?? []) {
    const rec = mapRow(raw as Record<string, unknown>);
    activeByStudent.set(rec.studentId, rec);
  }

  for (const row of rows) {
    const studentId = row.student.studentId;
    const reasons = deriveInterventionReasons(row);
    const decision = decideEnsureAction({
      riskLevel: row.prediction.riskLevel,
      reasons,
      active: activeByStudent.get(studentId) ?? null,
    });

    if (decision.action === "insert") {
      const { data: inserted, error: insertError } = await admin
        .from("coach_interventions")
        .insert({
          student_id: studentId,
          status: "OPEN",
          priority: decision.priority,
          reasons: decision.reasons,
          risk_level: row.prediction.riskLevel,
        })
        .select("*")
        .maybeSingle();

      if (insertError) {
        // Course unique index : recharger
        if (insertError.code === "23505") {
          const { data: again } = await admin
            .from("coach_interventions")
            .select("*")
            .eq("student_id", studentId)
            .in("status", [...ACTIVE_INTERVENTION_STATUSES])
            .maybeSingle();
          if (again) {
            activeByStudent.set(
              studentId,
              mapRow(again as Record<string, unknown>),
            );
          }
        } else {
          console.error("[interventions] insert", insertError.message);
        }
      } else if (inserted) {
        activeByStudent.set(
          studentId,
          mapRow(inserted as Record<string, unknown>),
        );
      }
    } else if (decision.action === "update") {
      const active = activeByStudent.get(studentId);
      if (!active) continue;
      const { data: updated, error: updateError } = await admin
        .from("coach_interventions")
        .update({
          reasons: decision.reasons,
          priority: decision.priority,
          risk_level: decision.riskLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", active.id)
        .select("*")
        .maybeSingle();
      if (updateError) {
        console.error("[interventions] update", updateError.message);
      } else if (updated) {
        activeByStudent.set(
          studentId,
          mapRow(updated as Record<string, unknown>),
        );
      }
    }
  }

  // Charger aussi RESOLVED pour filtres éventuels ? Pour la file principale : actifs.
  const { data: allRelevant } = await admin
    .from("coach_interventions")
    .select("*")
    .in("student_id", [...byStudent.keys()]);

  const cards: CoachInterventionCard[] = [];
  for (const raw of allRelevant ?? []) {
    const intervention = mapRow(raw as Record<string, unknown>);
    const row = byStudent.get(intervention.studentId);
    if (!row) continue;
    cards.push({ intervention, row });
  }

  return cards.sort((a, b) =>
    compareInterventionRows(
      {
        priority: a.intervention.priority,
        targetExamDate: a.row.student.targetExamDate,
        inactiveDays: a.row.metrics.inactiveDays,
      },
      {
        priority: b.intervention.priority,
        targetExamDate: b.row.student.targetExamDate,
        inactiveDays: b.row.metrics.inactiveDays,
      },
    ),
  );
}

export async function listStudentInterventions(
  studentId: string,
): Promise<CoachInterventionRecord[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coach_interventions")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[interventions] list student", error.message);
    return [];
  }
  return (data ?? []).map((raw) => mapRow(raw as Record<string, unknown>));
}

export async function updateInterventionStatus(options: {
  interventionId: string;
  status: InterventionStatus;
  actorId: string;
}): Promise<{ ok: true; intervention: CoachInterventionRecord } | { ok: false; error: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: "Base non configurée." };
  }

  const admin = createAdminClient();
  const { data: current, error: loadError } = await admin
    .from("coach_interventions")
    .select("*")
    .eq("id", options.interventionId)
    .maybeSingle();

  if (loadError || !current) {
    return { ok: false, error: "Intervention introuvable." };
  }

  const from = current.status as InterventionStatus;
  if (from === "RESOLVED") {
    return { ok: false, error: "Intervention déjà terminée." };
  }

  const patch: Record<string, unknown> = {
    status: options.status,
    updated_at: new Date().toISOString(),
    updated_by: options.actorId,
  };

  if (options.status === "CONTACTED" || options.status === "FOLLOW_UP") {
    patch.contacted_at = current.contacted_at ?? new Date().toISOString();
  }
  if (options.status === "RESOLVED") {
    patch.resolved_at = new Date().toISOString();
  }

  const { data: updated, error } = await admin
    .from("coach_interventions")
    .update(patch)
    .eq("id", options.interventionId)
    .select("*")
    .maybeSingle();

  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Mise à jour impossible." };
  }

  return {
    ok: true,
    intervention: mapRow(updated as Record<string, unknown>),
  };
}
