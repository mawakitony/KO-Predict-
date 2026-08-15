import { describe, expect, it } from "vitest";
import {
  activityStatusLabelFr,
  activityTypeLabelFr,
  bestAssessmentScore,
  formatScorePercent,
  matchesActivityFilter,
  normalizeActivityStatus,
  normalizeActivityType,
  parseAssessmentAttempts,
  parseLearningHistoryFromProgress,
  parseScoreOnUnit,
  scoredAssessments,
  summarizeAttempts,
} from "@/lib/admin/learning-history/parse";
import {
  getCachedProgress,
  invalidateLearningHistoryCache,
  setCachedProgress,
} from "@/lib/admin/learning-history/cache";
import { canViewStudents } from "@/lib/auth/permissions";

describe("learning-history permissions", () => {
  it("student NON — coach/admin/super_admin OUI", () => {
    expect(canViewStudents("student")).toBe(false);
    expect(canViewStudents("coach")).toBe(true);
    expect(canViewStudents("admin")).toBe(true);
    expect(canViewStudents("super_admin")).toBe(true);
  });
});

describe("learning-history parse", () => {
  const progressPayload = [
    {
      course_id: "bootcamp",
      progress_per_section_unit: [
        {
          section_name: "Module 1",
          units: [
            {
              unit_id: "v1",
              unit_name: "Intro vidéo",
              unit_type: "video",
              unit_status: "completed",
              unit_section_name: "Module 1",
              time_on_unit: 120,
            },
            {
              unit_id: "a1",
              unit_name: "Quiz Process",
              unit_type: "assessmentV2",
              unit_status: "completed",
              unit_section_name: "Module 1",
              score_on_unit: 82,
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
            {
              unit_id: "p1",
              unit_name: "PDF guide",
              unit_type: "pdf",
              unit_status: "not_completed",
            },
            {
              unit_id: "x1",
              unit_name: "Type inconnu",
              unit_type: "somethingElse",
              unit_status: "weird",
            },
          ],
        },
      ],
    },
  ];

  it("parse progress : video completed + assessment scored", () => {
    const history = parseLearningHistoryFromProgress("lw1", progressPayload);
    expect(history.totalCount).toBe(6);
    expect(history.completedCount).toBe(3);
    const video = history.activities.find((a) => a.id === "v1");
    expect(video?.type).toBe("video");
    expect(video?.status).toBe("completed");
    expect(video?.score).toBeNull();
    const quiz = history.assessments.find((a) => a.id === "a1");
    expect(quiz?.score).toBe(82);
  });

  it("score 0 réel vs null", () => {
    expect(parseScoreOnUnit(0)).toBe(0);
    expect(parseScoreOnUnit(null)).toBeNull();
    expect(formatScorePercent(0)).toBe("0 %");
    expect(formatScorePercent(null)).toBe("—");
    const history = parseLearningHistoryFromProgress("lw1", progressPayload);
    expect(history.assessments.find((a) => a.id === "a0")?.score).toBe(0);
    expect(history.assessments.find((a) => a.id === "a-null")?.score).toBeNull();
  });

  it("filtres activités", () => {
    const history = parseLearningHistoryFromProgress("lw1", progressPayload);
    expect(
      history.activities.filter((a) => matchesActivityFilter(a, "videos")),
    ).toHaveLength(1);
    expect(
      history.activities.filter((a) => matchesActivityFilter(a, "quiz")),
    ).toHaveLength(3);
    expect(
      history.activities.filter((a) => matchesActivityFilter(a, "documents")),
    ).toHaveLength(1);
    expect(
      history.activities.filter((a) => matchesActivityFilter(a, "completed")),
    ).toHaveLength(3);
  });

  it("labels FR + type inconnu", () => {
    expect(activityTypeLabelFr(normalizeActivityType("video"))).toBe("Vidéo");
    expect(activityTypeLabelFr(normalizeActivityType("foo"))).toBe("Autre");
    expect(activityStatusLabelFr(normalizeActivityStatus("completed"))).toBe(
      "Terminé",
    );
    expect(
      activityStatusLabelFr(normalizeActivityStatus("not_completed")),
    ).toBe("À faire");
  });

  it("assessments scorés + meilleur score", () => {
    const history = parseLearningHistoryFromProgress("lw1", progressPayload);
    const scored = scoredAssessments(history.assessments);
    expect(scored).toHaveLength(2);
    expect(bestAssessmentScore(history.assessments)).toBe(82);
  });

  it("attempts : une et plusieurs + timestamps + passed", () => {
    const one = parseAssessmentAttempts([
      {
        id: "t1",
        grade: 82,
        passed: true,
        submittedTimestamp: 1785241891.9,
      },
    ]);
    expect(one).toHaveLength(1);
    expect(one[0]?.grade).toBe(82);
    expect(one[0]?.passed).toBe(true);
    expect(one[0]?.submittedAt).toMatch(/^2026-/);

    const many = parseAssessmentAttempts([
      { id: "t1", grade: 64, passed: false, submittedTimestamp: 1000 },
      { id: "t2", grade: 82, passed: true, submittedTimestamp: 2000 },
    ]);
    const summary = summarizeAttempts(many);
    expect(summary.bestGrade).toBe(82);
    expect(summary.lastGrade).toBe(82);
  });

  it("assessment sans score exclu des scorés", () => {
    const history = parseLearningHistoryFromProgress("lw1", progressPayload);
    expect(scoredAssessments(history.assessments).some((a) => a.id === "a-null"))
      .toBe(false);
  });
});

describe("learning-history cache", () => {
  it("deuxième lecture dans TTL ne nécessite pas de rewrite", () => {
    invalidateLearningHistoryCache();
    setCachedProgress("lw-cache", [{ course_id: "c1" }]);
    expect(getCachedProgress("lw-cache")).toEqual([{ course_id: "c1" }]);
    invalidateLearningHistoryCache("lw-cache");
    expect(getCachedProgress("lw-cache")).toBeNull();
  });
});
