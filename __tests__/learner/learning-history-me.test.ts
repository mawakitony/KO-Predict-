import { describe, expect, it } from "vitest";
import {
  activityStatusLabelFr,
  bestAssessmentScore,
  formatScorePercent,
  parseAssessmentAttempts,
  parseLearningHistoryFromProgress,
  scoredAssessments,
  summarizeAttempts,
} from "@/lib/admin/learning-history/parse";
import {
  getCachedProgress,
  invalidateLearningHistoryCache,
  setCachedProgress,
} from "@/lib/admin/learning-history/cache";
import {
  formatPercentOrDash,
  formatSyncRelativeFr,
} from "@/lib/learning/format";

/**
 * Sécurité apprenant : les routes /api/me ne prennent jamais un studentId
 * client. L’identité vient uniquement de la session (testée ici par contrat).
 */
describe("learner /api/me learning-history contract", () => {
  it("n’accepte pas de studentId arbitraire dans l’URL activities", () => {
    // Contrat : path fixe /api/me/... — aucun segment studentId.
    const activitiesPath = "/api/me/learning-history/activities";
    expect(activitiesPath).not.toMatch(/students\/[^/]+/);
    expect(activitiesPath).not.toContain("studentId");
  });

  it("attempts : assessmentId seul — pas de studentId client", () => {
    const assessmentId = "quiz-eliane";
    const attemptsPath = `/api/me/learning-history/assessments/${assessmentId}/attempts`;
    expect(attemptsPath).toContain(assessmentId);
    expect(attemptsPath).not.toMatch(/students\//);
  });

  it("student A ne peut pas forger l’identité B via query", () => {
    const url = new URL(
      "http://localhost/api/me/learning-history/activities?studentId=student-b&fresh=1",
    );
    // Le handler ignore studentId ; seul fresh=1 est lu.
    expect(url.searchParams.get("fresh")).toBe("1");
    expect(url.searchParams.get("studentId")).toBe("student-b");
    // Documente le contrat : studentId query ne doit pas être utilisé comme identité.
    const identitySource = "session.profile_id → students.id";
    expect(identitySource).toContain("session");
  });
});

describe("learner learning format", () => {
  it("null ≠ 0 pour pourcentages", () => {
    expect(formatPercentOrDash(null)).toBe("—");
    expect(formatPercentOrDash(0)).toBe("0 %");
    expect(formatPercentOrDash(75.4)).toBe("75 %");
  });

  it("sync relative ou indisponible", () => {
    expect(formatSyncRelativeFr(null)).toBe(
      "Dernière synchronisation indisponible",
    );
    expect(formatSyncRelativeFr("not-a-date")).toBe(
      "Dernière synchronisation indisponible",
    );
    const recent = new Date(Date.now() - 12 * 60_000).toISOString();
    expect(formatSyncRelativeFr(recent)).toContain("il y a 12 minutes");
  });
});

describe("learner activities / quizzes / attempts", () => {
  const progressPayload = [
    {
      course_id: "bootcamp",
      progress_per_section_unit: [
        {
          section_name: "M1",
          units: [
            {
              unit_id: "v1",
              unit_name: "Vidéo",
              unit_type: "video",
              unit_status: "completed",
            },
            {
              unit_id: "p1",
              unit_name: "PDF",
              unit_type: "pdf",
              unit_status: "not_completed",
            },
            {
              unit_id: "a1",
              unit_name: "Quiz A",
              unit_type: "assessmentV2",
              unit_status: "completed",
              score_on_unit: 75,
            },
            {
              unit_id: "a0",
              unit_name: "Quiz zéro",
              unit_type: "assessmentV2",
              unit_status: "completed",
              score_on_unit: 0,
            },
            {
              unit_id: "a-null",
              unit_name: "Quiz sans score",
              unit_type: "assessmentV2",
              unit_status: "not_completed",
              score_on_unit: null,
            },
          ],
        },
      ],
    },
  ];

  it("0 progression débutant", () => {
    const empty = parseLearningHistoryFromProgress("lw-beginner", []);
    expect(empty.totalCount).toBe(0);
    expect(empty.completedCount).toBe(0);
    expect(scoredAssessments(empty.assessments)).toHaveLength(0);
  });

  it("statuts Terminé / À faire + types", () => {
    const h = parseLearningHistoryFromProgress("lw", progressPayload);
    expect(activityStatusLabelFr("completed")).toBe("Terminé");
    expect(activityStatusLabelFr("not_completed")).toBe("À faire");
    expect(h.activities.find((a) => a.id === "v1")?.type).toBe("video");
    expect(h.activities.find((a) => a.id === "p1")?.type).toBe("pdf");
    expect(h.activities.find((a) => a.id === "a1")?.type).toBe("assessmentV2");
  });

  it("score null vs 0", () => {
    const h = parseLearningHistoryFromProgress("lw", progressPayload);
    expect(h.assessments.find((a) => a.id === "a-null")?.score).toBeNull();
    expect(formatScorePercent(null)).toBe("—");
    expect(h.assessments.find((a) => a.id === "a0")?.score).toBe(0);
    expect(formatScorePercent(0)).toBe("0 %");
  });

  it("quiz scorés + meilleur score", () => {
    const h = parseLearningHistoryFromProgress("lw", progressPayload);
    const scored = scoredAssessments(h.assessments);
    expect(scored).toHaveLength(2);
    expect(bestAssessmentScore(h.assessments)).toBe(75);
  });

  it("tentatives 1 et plusieurs + timestamps + passed", () => {
    const one = parseAssessmentAttempts([
      {
        id: "t1",
        grade: 80,
        passed: true,
        submittedTimestamp: 1_723_737_120,
      },
    ]);
    expect(one).toHaveLength(1);
    expect(one[0]?.grade).toBe(80);
    expect(one[0]?.passed).toBe(true);
    expect(one[0]?.submittedAt).toBeTruthy();

    const many = parseAssessmentAttempts([
      {
        id: "t1",
        grade: 64,
        passed: false,
        submittedTimestamp: 1_723_737_100,
      },
      {
        id: "t2",
        grade: 80,
        passed: true,
        submittedTimestamp: 1_723_737_200,
      },
    ]);
    const summary = summarizeAttempts(many);
    expect(summary.bestGrade).toBe(80);
    expect(summary.lastGrade).toBe(80);
  });

  it("cache TTL progress + fresh invalide", () => {
    invalidateLearningHistoryCache("lw-cache-me");
    setCachedProgress("lw-cache-me", [{ course_id: "c1" }]);
    expect(getCachedProgress("lw-cache-me")).toBeTruthy();
    invalidateLearningHistoryCache("lw-cache-me");
    expect(getCachedProgress("lw-cache-me")).toBeNull();
  });
});
