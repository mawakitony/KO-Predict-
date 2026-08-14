import { describe, expect, it } from "vitest";
import {
  canTransitionInterventionStatus,
  compareInterventionRows,
  decideEnsureAction,
  deriveInterventionReasons,
  riskNeedsIntervention,
} from "@/lib/admin/interventions/logic";
import type { AdminStudentRow } from "@/lib/admin/types";
import type { CoachInterventionRecord } from "@/lib/admin/interventions/types";
import {
  canManageInterventions,
  canManageStudents,
} from "@/lib/auth/permissions";

function row(overrides: Partial<AdminStudentRow> = {}): AdminStudentRow {
  return {
    student: {
      firstName: "Paul",
      lastName: "Mensah",
      fullName: "Paul Mensah",
      certification: "PMP",
      targetExamDate: "2026-08-26",
      timezone: "Europe/Paris",
      studentId: "stu-1",
    },
    metrics: {
      progressPercent: 40,
      completedActivities: 40,
      totalActivities: 100,
      studyTimeMinutes: 100,
      qcmAverage: 55,
      recentQcmAverage: 50,
      lastActivityDate: null,
      inactiveDays: 9,
      recordedAt: new Date().toISOString(),
      currentPace: 3,
    },
    prediction: {
      progressPercent: 40,
      remainingActivities: 60,
      currentPace: 3,
      requiredPace: 8,
      readinessScore: 41,
      readinessProbability: 35,
      predictedCompletionDate: null,
      predictedReadinessDate: null,
      riskLevel: "RED",
      paceStatus: "BEHIND",
      recommendedAction: null,
      issues: [],
      calculatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

function active(
  overrides: Partial<CoachInterventionRecord> = {},
): CoachInterventionRecord {
  return {
    id: "int-1",
    studentId: "stu-1",
    status: "OPEN",
    priority: 1,
    assignedTo: null,
    reasons: ["RISK_RED"],
    riskLevel: "RED",
    createdAt: "2026-08-12T10:00:00.000Z",
    contactedAt: null,
    resolvedAt: null,
    createdBy: null,
    updatedAt: "2026-08-12T10:00:00.000Z",
    updatedBy: null,
    ...overrides,
  };
}

describe("interventions logic", () => {
  it("RED crée un insert si aucun cycle actif", () => {
    const decision = decideEnsureAction({
      riskLevel: "RED",
      reasons: ["RISK_RED", "PACE_BEHIND"],
      active: null,
    });
    expect(decision).toEqual({
      action: "insert",
      reasons: ["RISK_RED", "PACE_BEHIND"],
      priority: 1,
    });
  });

  it("intervention active existante → pas de doublon (noop si inchangé)", () => {
    const existing = active({
      reasons: ["RISK_RED", "PACE_BEHIND"],
      priority: 1,
      riskLevel: "RED",
    });
    const decision = decideEnsureAction({
      riskLevel: "RED",
      reasons: ["RISK_RED", "PACE_BEHIND"],
      active: existing,
    });
    expect(decision.action).toBe("noop");
  });

  it("RESOLVED + nouveau risque → nouveau cycle insert", () => {
    const decision = decideEnsureAction({
      riskLevel: "CRITICAL",
      reasons: ["RISK_CRITICAL"],
      active: null, // cycle résolu = plus d'actif
    });
    expect(decision.action).toBe("insert");
    if (decision.action === "insert") {
      expect(decision.priority).toBe(0);
    }
  });

  it("GREEN / null sans raisons → noop si pas d'actif", () => {
    expect(riskNeedsIntervention("GREEN")).toBe(false);
    expect(
      decideEnsureAction({
        riskLevel: "GREEN",
        reasons: [],
        active: null,
      }).action,
    ).toBe("noop");
    expect(
      decideEnsureAction({
        riskLevel: null,
        reasons: [],
        active: null,
      }).action,
    ).toBe("noop");
  });

  it("date absente + plus de RISK_* → auto_resolve de l'ancienne intervention RED", () => {
    const decision = decideEnsureAction({
      riskLevel: null,
      reasons: [],
      active: active({ reasons: ["RISK_RED"], riskLevel: "RED" }),
    });
    expect(decision.action).toBe("auto_resolve");
  });

  it("sans date / risque null mais INACTIVE_7_DAYS → cycle maintenu (pas tout fermer)", () => {
    const decision = decideEnsureAction({
      riskLevel: null,
      reasons: ["INACTIVE_7_DAYS"],
      active: active({
        reasons: ["RISK_RED", "INACTIVE_7_DAYS"],
        riskLevel: "RED",
      }),
    });
    expect(decision.action).toBe("update");
    if (decision.action === "update") {
      expect(decision.reasons).toEqual(["INACTIVE_7_DAYS"]);
      expect(decision.riskLevel).toBeNull();
    }
  });

  it("RED avec date cible → insert / raisons RISK_RED", () => {
    const withDate = row({
      student: {
        firstName: "Paul",
        lastName: "Mensah",
        fullName: "Paul Mensah",
        certification: "PMP",
        targetExamDate: "2026-09-26",
        timezone: "Europe/Paris",
        studentId: "stu-1",
      },
      prediction: {
        progressPercent: 40,
        remainingActivities: 60,
        currentPace: 3,
        requiredPace: 8,
        readinessScore: 41,
        readinessProbability: 35,
        predictedCompletionDate: null,
        predictedReadinessDate: null,
        riskLevel: "RED",
        paceStatus: "BEHIND",
        recommendedAction: null,
        issues: [],
        calculatedAt: new Date().toISOString(),
      },
      metrics: {
        progressPercent: 40,
        completedActivities: 40,
        totalActivities: 100,
        studyTimeMinutes: 100,
        qcmAverage: 55,
        recentQcmAverage: 50,
        lastActivityDate: null,
        inactiveDays: 2,
        recordedAt: new Date().toISOString(),
        currentPace: 3,
      },
    });
    const reasons = deriveInterventionReasons(
      withDate,
      new Date("2026-08-14T12:00:00.000Z"),
    );
    expect(reasons).toContain("RISK_RED");
    expect(
      decideEnsureAction({
        riskLevel: "RED",
        reasons,
        active: null,
      }).action,
    ).toBe("insert");
  });

  it("MISSING_TARGET_DATE / risk null → pas de RISK_RED inventé", () => {
    const missingDate = row({
      student: {
        firstName: "Eliane",
        lastName: "Biemi",
        fullName: "Eliane Biemi",
        certification: "PMP",
        targetExamDate: null,
        timezone: "Europe/Paris",
        studentId: "stu-eliane",
      },
      prediction: {
        progressPercent: 18,
        remainingActivities: 441,
        currentPace: 4,
        requiredPace: null,
        readinessScore: 54,
        readinessProbability: 52,
        predictedCompletionDate: null,
        predictedReadinessDate: null,
        riskLevel: null,
        paceStatus: null,
        recommendedAction: null,
        issues: ["MISSING_TARGET_DATE"],
        calculatedAt: new Date().toISOString(),
      },
      metrics: {
        progressPercent: 18,
        completedActivities: 98,
        totalActivities: 539,
        studyTimeMinutes: 2874,
        qcmAverage: 75,
        recentQcmAverage: 66,
        lastActivityDate: null,
        inactiveDays: 3,
        recordedAt: new Date().toISOString(),
        currentPace: 4,
      },
    });
    const reasons = deriveInterventionReasons(missingDate);
    expect(reasons).not.toContain("RISK_RED");
    expect(reasons).not.toContain("RISK_AMBER");
    expect(reasons).not.toContain("RISK_CRITICAL");
  });

  it("derive des raisons structurées", () => {
    const reasons = deriveInterventionReasons(
      row(),
      new Date("2026-08-14T12:00:00.000Z"),
    );
    expect(reasons).toContain("RISK_RED");
    expect(reasons).toContain("INACTIVE_7_DAYS");
    expect(reasons).toContain("PACE_BEHIND");
    expect(reasons).toContain("EXAM_SOON");
  });

  it("tri : CRITICAL avant RED, puis date examen, puis inactivité", () => {
    const cmp = compareInterventionRows(
      { priority: 0, targetExamDate: "2026-09-01", inactiveDays: 2 },
      { priority: 1, targetExamDate: "2026-08-20", inactiveDays: 10 },
    );
    expect(cmp).toBeLessThan(0);
  });

  it("transitions coach autorisées / résolue bloquée", () => {
    expect(canTransitionInterventionStatus("OPEN", "CONTACTED")).toBe(true);
    expect(canTransitionInterventionStatus("CONTACTED", "FOLLOW_UP")).toBe(
      true,
    );
    expect(canTransitionInterventionStatus("FOLLOW_UP", "RESOLVED")).toBe(
      true,
    );
    expect(canTransitionInterventionStatus("RESOLVED", "OPEN")).toBe(false);
    expect(canTransitionInterventionStatus("OPEN", "OPEN")).toBe(false);
  });
});

describe("permissions interventions", () => {
  it("coach peut gérer interventions mais pas les comptes", () => {
    expect(canManageInterventions("coach")).toBe(true);
    expect(canManageStudents("coach")).toBe(false);
  });

  it("admin et super_admin OK", () => {
    expect(canManageInterventions("admin")).toBe(true);
    expect(canManageInterventions("super_admin")).toBe(true);
  });

  it("student interdit", () => {
    expect(canManageInterventions("student")).toBe(false);
  });
});
