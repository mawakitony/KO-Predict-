import { describe, expect, it } from "vitest";
import {
  parseTargetExamDateFromCustomFields,
  mapLearnWorldsUserToStudentFields,
} from "@/lib/learnworlds/mappers";
import {
  aggregateCourseProgress,
  summarizeAssessmentScores,
  calculateInactiveDays,
  extractAssessmentScoresFromProgress,
} from "@/lib/learnworlds/aggregations";
import {
  LEARNWORLDS_TARGET_EXAM_FIELD_KEY,
  LW_CUSTOM_FIELD_TARGET_EXAM_DATE,
} from "@/types/learnworlds";

describe("LearnWorlds mappers", () => {
  it("clé principale = cf_ko_target_exam_date", () => {
    expect(LEARNWORLDS_TARGET_EXAM_FIELD_KEY).toBe("cf_ko_target_exam_date");
  });

  it("parse cf_ko_target_exam_date ISO (clé API live)", () => {
    expect(
      parseTargetExamDateFromCustomFields({
        [LEARNWORLDS_TARGET_EXAM_FIELD_KEY]: "2026-09-26",
      }),
    ).toBe("2026-09-26");
  });

  it("parse cf_ko_target_exam_date format FR", () => {
    expect(
      parseTargetExamDateFromCustomFields({
        cf_ko_target_exam_date: "25/09/2026",
      }),
    ).toBe("2026-09-25");
  });

  it("fallback ko_target_exam_date", () => {
    expect(
      parseTargetExamDateFromCustomFields({
        [LW_CUSTOM_FIELD_TARGET_EXAM_DATE]: "2026-09-25",
      }),
    ).toBe("2026-09-25");
  });

  it("mappe user → champs student", () => {
    const mapped = mapLearnWorldsUserToStudentFields({
      id: "lw_123",
      email: "tony@example.com",
      username: "tony",
      firstName: "Tony",
      lastName: "Test",
      tags: ["PMP"],
      customFields: { [LEARNWORLDS_TARGET_EXAM_FIELD_KEY]: "2026-09-26" },
      createdAt: null,
      lastLoginAt: null,
    });
    expect(mapped.learnworldsUserId).toBe("lw_123");
    expect(mapped.targetExamDate).toBe("2026-09-26");
  });
});

describe("LearnWorlds aggregations", () => {
  it("agrège progression multi-cours", () => {
    const agg = aggregateCourseProgress([
      {
        userId: "u",
        courseId: "c1",
        progressPercent: 50,
        completedActivities: 10,
        totalActivities: 20,
        studyTimeMinutes: 100,
        status: null,
      },
      {
        userId: "u",
        courseId: "c2",
        progressPercent: 100,
        completedActivities: 5,
        totalActivities: 5,
        studyTimeMinutes: 50,
        status: null,
      },
    ]);
    expect(agg.completedActivities).toBe(15);
    expect(agg.totalActivities).toBe(25);
    expect(agg.studyTimeMinutes).toBe(150);
    expect(agg.progressPercent).toBe(60);
  });

  it("résume les scores QCM", () => {
    const summary = summarizeAssessmentScores([
      {
        userId: "u",
        assessmentId: "a1",
        courseId: null,
        title: null,
        scorePercent: 80,
        completedAt: "2026-08-01T00:00:00.000Z",
      },
      {
        userId: "u",
        assessmentId: "a2",
        courseId: null,
        title: null,
        scorePercent: 70,
        completedAt: "2026-08-10T00:00:00.000Z",
      },
    ]);
    expect(summary.qcmAverage).toBe(75);
    expect(summary.recentQcmAverage).toBe(75);
  });

  it("sans date : recent = N derniers dans l’ordre fourni", () => {
    const summary = summarizeAssessmentScores(
      [
        { userId: "u", assessmentId: "a1", courseId: null, title: null, scorePercent: 50, completedAt: null },
        { userId: "u", assessmentId: "a2", courseId: null, title: null, scorePercent: 60, completedAt: null },
        { userId: "u", assessmentId: "a3", courseId: null, title: null, scorePercent: 70, completedAt: null },
        { userId: "u", assessmentId: "a4", courseId: null, title: null, scorePercent: 80, completedAt: null },
        { userId: "u", assessmentId: "a5", courseId: null, title: null, scorePercent: 90, completedAt: null },
        { userId: "u", assessmentId: "a6", courseId: null, title: null, scorePercent: 100, completedAt: null },
      ],
      3,
    );
    expect(summary.qcmAverage).toBe(75);
    expect(summary.recentQcmAverage).toBe(90);
  });

  it("conserve score 0 réel et ignore null", () => {
    const summary = summarizeAssessmentScores([
      { userId: "u", assessmentId: "a1", courseId: null, title: null, scorePercent: 0, completedAt: null },
      { userId: "u", assessmentId: "a2", courseId: null, title: null, scorePercent: null, completedAt: null },
      { userId: "u", assessmentId: "a3", courseId: null, title: null, scorePercent: 100, completedAt: null },
    ]);
    expect(summary.qcmAverage).toBe(50);
    expect(summary.recentQcmAverage).toBe(50);
  });

  it("extrait assessmentV2 + score_on_unit depuis progress raw", () => {
    const scores = extractAssessmentScoresFromProgress(
      [
        {
          userId: "u1",
          courseId: "c1",
          progressPercent: 37,
          completedActivities: 10,
          totalActivities: 20,
          studyTimeMinutes: 100,
          status: "not_completed",
          raw: {
            course_id: "c1",
            average_score_rate: 80,
            progress_per_section_unit: [
              {
                section_id: "s1",
                units: [
                  {
                    unit_id: "v1",
                    unit_type: "video",
                    unit_name: "Intro",
                    score_on_unit: null,
                    unit_status: "completed",
                  },
                  {
                    unit_id: "q1",
                    unit_type: "assessmentV2",
                    unit_name: "5 Questions",
                    score_on_unit: 80,
                    unit_status: "completed",
                  },
                  {
                    unit_id: "q2",
                    unit_type: "assessmentV2",
                    unit_name: "Mini",
                    score_on_unit: 0,
                    unit_status: "not_completed",
                  },
                  {
                    unit_id: "q3",
                    unit_type: "assessmentV2",
                    unit_name: "Présentation",
                    score_on_unit: null,
                    unit_status: "completed",
                  },
                ],
              },
            ],
          },
        },
      ],
      "u1",
    );
    expect(scores).toHaveLength(2);
    expect(scores[0]?.scorePercent).toBe(80);
    expect(scores[1]?.scorePercent).toBe(0);
    const summary = summarizeAssessmentScores(scores);
    expect(summary.qcmAverage).toBe(40);
  });

  it("calcule inactive days", () => {
    const days = calculateInactiveDays(
      "2026-08-10T12:00:00.000Z",
      new Date("2026-08-11T12:00:00.000Z"),
    );
    expect(days).toBe(1);
  });
});
