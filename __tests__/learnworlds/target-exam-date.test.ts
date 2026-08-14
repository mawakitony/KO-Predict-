import { describe, expect, it } from "vitest";
import {
  parseTargetExamDateFromCustomFields,
  resolvePersistedTargetExamDate,
  mapLearnWorldsUserToStudentFields,
} from "@/lib/learnworlds/mappers";
import { calculatePrediction } from "@/lib/prediction/engine";
import { cockpitDaysUntil } from "@/lib/dashboard/cockpit-copy";
import { formatDateFr } from "@/lib/dashboard/format";
import { LEARNWORLDS_TARGET_EXAM_FIELD_KEY } from "@/types/learnworlds";

describe("target_exam_date — LearnWorlds source de vérité", () => {
  it("date LW présente → écrite telle quelle", () => {
    expect(
      parseTargetExamDateFromCustomFields({
        [LEARNWORLDS_TARGET_EXAM_FIELD_KEY]: "2026-09-24",
      }),
    ).toBe("2026-09-24");
    expect(resolvePersistedTargetExamDate("2026-09-24", "2026-09-26")).toBe(
      "2026-09-24",
    );
  });

  it("date LW modifiée → remplace l'ancienne valeur Supabase", () => {
    const previous = "2026-09-26";
    const mapped = parseTargetExamDateFromCustomFields({
      [LEARNWORLDS_TARGET_EXAM_FIELD_KEY]: "2026-10-01",
    });
    expect(mapped).toBe("2026-10-01");
    expect(resolvePersistedTargetExamDate(mapped, previous)).toBe("2026-10-01");
    expect(resolvePersistedTargetExamDate(mapped, previous)).not.toBe(previous);
  });

  it("date LW supprimée (null) → persist null", () => {
    expect(
      parseTargetExamDateFromCustomFields({
        [LEARNWORLDS_TARGET_EXAM_FIELD_KEY]: null,
      }),
    ).toBeNull();
    expect(resolvePersistedTargetExamDate(null, "2026-09-26")).toBeNull();
  });

  it("date LW vide / absente → persist null", () => {
    expect(
      parseTargetExamDateFromCustomFields({
        [LEARNWORLDS_TARGET_EXAM_FIELD_KEY]: "",
      }),
    ).toBeNull();
    expect(parseTargetExamDateFromCustomFields({})).toBeNull();
    expect(parseTargetExamDateFromCustomFields(null)).toBeNull();
    expect(parseTargetExamDateFromCustomFields(undefined)).toBeNull();
  });

  it("ancienne date Supabase + LW null → devient null (null ≠ ancienne valeur)", () => {
    const stale = "2026-09-26";
    const mapped = mapLearnWorldsUserToStudentFields({
      id: "lw_eliane",
      email: "elianebiemi@gmail.com",
      username: null,
      firstName: "biemi",
      lastName: "eliane",
      tags: [],
      customFields: { [LEARNWORLDS_TARGET_EXAM_FIELD_KEY]: null },
      createdAt: null,
      lastLoginAt: null,
    });
    expect(mapped.targetExamDate).toBeNull();
    const persisted = resolvePersistedTargetExamDate(
      mapped.targetExamDate,
      stale,
    );
    expect(persisted).toBeNull();
    expect(persisted).not.toBe(stale);
  });

  it("moteur → MISSING_TARGET_DATE, requiredPace null, risk non évalué", () => {
    const result = calculatePrediction({
      completedActivities: 10,
      totalActivities: 100,
      qcmAverage: 70,
      inactiveDays: 1,
      targetExamDate: null,
      currentPace: 4,
      asOf: new Date("2026-08-14T12:00:00.000Z"),
    });
    expect(result.issues).toContain("MISSING_TARGET_DATE");
    expect(result.requiredPace).toBeNull();
    expect(result.riskLevel).toBeNull();
    expect(result.readinessScore).not.toBeNull();
    expect(result.readinessProbability).not.toBeNull();
    expect(result.readinessScore).not.toBe(0);
  });

  it("UI → pas de J-n inventé si date absente", () => {
    expect(cockpitDaysUntil(null)).toBeNull();
    expect(formatDateFr(null)).toBe("Donnée insuffisante");
  });
});
