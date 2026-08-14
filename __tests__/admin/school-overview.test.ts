import { describe, expect, it } from "vitest";
import {
  aggregateSchoolTrends,
  computeSchoolOverview,
  schoolAlertReason,
} from "@/lib/admin/school-overview";
import type { AdminStudentRow } from "@/lib/admin/types";
import type { PredictionResult } from "@/types/prediction";
import type {
  DashboardMetricsView,
  DashboardStudentView,
} from "@/lib/dashboard/types";

function row(
  overrides: {
    student?: Partial<DashboardStudentView>;
    metrics?: Partial<DashboardMetricsView>;
    prediction?: Partial<PredictionResult>;
  } = {},
): AdminStudentRow {
  return {
    student: {
      firstName: "A",
      lastName: "B",
      fullName: "A B",
      certification: "PMP",
      targetExamDate: "2026-09-26",
      timezone: "Europe/Paris",
      studentId: overrides.student?.studentId ?? "student-default",
      ...overrides.student,
    },
    metrics: {
      progressPercent: 40,
      completedActivities: 40,
      totalActivities: 100,
      studyTimeMinutes: 120,
      qcmAverage: 70,
      recentQcmAverage: 70,
      lastActivityDate: new Date().toISOString(),
      inactiveDays: 1,
      recordedAt: new Date().toISOString(),
      currentPace: 3,
      ...overrides.metrics,
    },
    prediction: {
      progressPercent: 40,
      remainingActivities: 60,
      currentPace: 3,
      requiredPace: 5,
      readinessScore: 55,
      readinessProbability: 60,
      predictedCompletionDate: "2026-10-01",
      predictedReadinessDate: "2026-10-05",
      riskLevel: "AMBER",
      paceStatus: "SLIGHTLY_BEHIND",
      recommendedAction: "Réviser",
      issues: [],
      calculatedAt: new Date().toISOString(),
      ...overrides.prediction,
    },
  };
}

describe("computeSchoolOverview", () => {
  it("agrège taux global, alertes et buckets", () => {
    const rows = [
      row({
        student: { studentId: "1", fullName: "Vert", certification: "PMP" },
        prediction: {
          riskLevel: "GREEN",
          readinessScore: 85,
          readinessProbability: 88,
          paceStatus: "ON_TRACK",
          progressPercent: 80,
        },
        metrics: { progressPercent: 80, inactiveDays: 0 },
      }),
      row({
        student: { studentId: "2", fullName: "Rouge", certification: "PMP" },
        prediction: {
          riskLevel: "RED",
          readinessScore: 40,
          readinessProbability: 35,
          paceStatus: "BEHIND",
          progressPercent: 30,
        },
        metrics: { progressPercent: 30, inactiveDays: 8 },
      }),
      row({
        student: {
          studentId: "3",
          fullName: "Collecte",
          certification: "CAPM",
        },
        prediction: {
          riskLevel: null,
          readinessScore: null,
          readinessProbability: null,
          paceStatus: "NO_ACTIVITY",
          progressPercent: 0,
        },
        metrics: { progressPercent: 0, inactiveDays: 2 },
      }),
    ];

    const overview = computeSchoolOverview(rows);
    expect(overview.totalStudents).toBe(3);
    expect(overview.withEstimation).toBe(2);
    expect(overview.collectingData).toBe(1);
    expect(overview.riskCounts.GREEN).toBe(1);
    expect(overview.riskCounts.RED).toBe(1);
    expect(overview.riskCounts.NONE).toBe(1);
    expect(overview.globalSuccessRate).toBe(50);
    expect(overview.alertCount).toBe(1);
    expect(overview.alerts[0]?.fullName).toBe("Rouge");
    expect(overview.avgSuccessProbability).toBe(61.5);
    expect(overview.progressBuckets["75-100"]).toBe(1);
    expect(overview.progressBuckets["25-49"]).toBe(1);
    expect(overview.progressBuckets["0-24"]).toBe(1);
    expect(overview.inactive7dCount).toBe(1);
    expect(overview.byCertification).toHaveLength(2);
    expect(overview.progressProfile).toHaveLength(4);
    expect(overview.cohortCurve.length).toBeGreaterThan(0);
    expect(overview.sparkProgress).toHaveLength(4);
  });

  it("null ≠ 0 : sans estimation, moyennes nulles", () => {
    const overview = computeSchoolOverview([
      row({
        student: { studentId: "null-case" },
        prediction: {
          readinessScore: null,
          readinessProbability: null,
          riskLevel: null,
          progressPercent: null,
        },
      }),
    ]);
    expect(overview.avgReadinessScore).toBeNull();
    expect(overview.avgSuccessProbability).toBeNull();
    expect(overview.globalSuccessRate).toBeNull();
    expect(overview.alertCount).toBe(0);
    expect(overview.collectingData).toBe(1);
  });

  it("schoolAlertReason pour RED / CRITICAL", () => {
    expect(
      schoolAlertReason(
        row({
          prediction: { riskLevel: "CRITICAL" },
          metrics: { inactiveDays: 10 },
        }),
      ),
    ).toMatch(/inactif|urgent/i);
    expect(
      schoolAlertReason(row({ prediction: { riskLevel: "RED" } })),
    ).toMatch(/Risque élevé/i);
  });

  it("aggregateSchoolTrends ignore les nulls (null ≠ 0)", () => {
    const trends = aggregateSchoolTrends([
      {
        createdAt: "2026-08-01T10:00:00.000Z",
        readinessScore: 50,
        readinessProbability: 55,
        progressPercent: 40,
      },
      {
        createdAt: "2026-08-01T12:00:00.000Z",
        readinessScore: null,
        readinessProbability: null,
        progressPercent: 44,
      },
      {
        createdAt: "2026-08-02T10:00:00.000Z",
        readinessScore: 60,
        readinessProbability: 62,
        progressPercent: null,
      },
    ]);
    expect(trends).toHaveLength(2);
    expect(trends[0]?.avgReadiness).toBe(50);
    expect(trends[0]?.avgProgress).toBe(42);
    expect(trends[1]?.avgProgress).toBeNull();
  });
});
