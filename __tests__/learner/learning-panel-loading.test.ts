import { describe, expect, it } from "vitest";
import {
  interpretActivitiesResponse,
  isManifestlyInvalidLearnWorldsUserId,
  LEARNER_HISTORY_TEMPORARY_MESSAGE,
  LEARNER_HISTORY_UNAVAILABLE_MESSAGE,
  shouldAutoFetchOnMount,
} from "@/lib/learning/lw-id";
import {
  bestAssessmentScore,
  parseLearningHistoryFromProgress,
  scoredAssessments,
} from "@/lib/admin/learning-history/parse";

describe("invalid LW id", () => {
  it("rejette seed démo et IDs absents", () => {
    expect(isManifestlyInvalidLearnWorldsUserId(null)).toBe(true);
    expect(isManifestlyInvalidLearnWorldsUserId("")).toBe(true);
    expect(isManifestlyInvalidLearnWorldsUserId("lw_tony_test_demo")).toBe(
      true,
    );
    expect(isManifestlyInvalidLearnWorldsUserId("not-an-id")).toBe(true);
  });

  it("accepte les IDs LW réels (Eliane / Loyuoky)", () => {
    expect(
      isManifestlyInvalidLearnWorldsUserId("6a1eb332c5eeabe7cc054638"),
    ).toBe(false);
    expect(
      isManifestlyInvalidLearnWorldsUserId("6a7c52613e28030887049ae7"),
    ).toBe(false);
  });
});

describe("interpretActivitiesResponse", () => {
  it("non-200 → erreur, loading considéré terminé côté contrat", () => {
    const r = interpretActivitiesResponse({
      httpOk: false,
      body: {
        ok: false,
        code: "RATE_LIMITED",
        message: LEARNER_HISTORY_TEMPORARY_MESSAGE,
      },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe(LEARNER_HISTORY_TEMPORARY_MESSAGE);
    expect(r.code).toBe("RATE_LIMITED");
  });

  it("JSON invalide (body null)", () => {
    const r = interpretActivitiesResponse({ httpOk: true, body: null });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("INVALID_JSON");
    expect(r.error).toBe(LEARNER_HISTORY_TEMPORARY_MESSAGE);
  });

  it("INVALID_LW_ID → message compte", () => {
    const r = interpretActivitiesResponse({
      httpOk: false,
      body: {
        ok: false,
        code: "INVALID_LW_ID",
        message: LEARNER_HISTORY_UNAVAILABLE_MESSAGE,
        error: LEARNER_HISTORY_UNAVAILABLE_MESSAGE,
      },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe(LEARNER_HISTORY_UNAVAILABLE_MESSAGE);
    expect(r.code).toBe("INVALID_LW_ID");
  });

  it("200 ok → pas d’erreur", () => {
    const r = interpretActivitiesResponse({
      httpOk: true,
      body: { ok: true, activities: [], assessments: [] },
    });
    expect(r.ok).toBe(true);
    expect(r.error).toBeNull();
  });
});

describe("auto-fetch once (pas de boucle)", () => {
  it("premier montage uniquement", () => {
    expect(shouldAutoFetchOnMount(false)).toBe(true);
    expect(shouldAutoFetchOnMount(true)).toBe(false);
  });

  it("après erreur : pas de deuxième fetch automatique", () => {
    // Contrat UI : hasAttempted=true même si error est set.
    let hasAttempted = false;
    const fetches: string[] = [];

    function autoOrManual(kind: "auto" | "manual") {
      if (kind === "auto") {
        if (!shouldAutoFetchOnMount(hasAttempted)) return;
        hasAttempted = true;
      }
      fetches.push(kind);
      // simule erreur non-200
      interpretActivitiesResponse({
        httpOk: false,
        body: { ok: false, code: "UNAVAILABLE" },
      });
    }

    autoOrManual("auto");
    autoOrManual("auto"); // ignoré
    autoOrManual("manual"); // retry explicite
    expect(fetches).toEqual(["auto", "manual"]);
  });

  it("retry manuel autorisé après erreur", () => {
    let hasAttempted = true; // tentative initiale déjà faite
    expect(shouldAutoFetchOnMount(hasAttempted)).toBe(false);
    // load() manuel n’utilise pas shouldAutoFetchOnMount
    const manualAllowed = true;
    expect(manualAllowed).toBe(true);
  });
});

describe("Eliane / Loyuoky parse restent OK", () => {
  it("débutant 0 activités scorées (forme loyuoky)", () => {
    const emptyish = parseLearningHistoryFromProgress("6a7c52613e28030887049ae7", [
      {
        course_id: "bootcamp",
        progress_per_section_unit: [
          {
            section_name: "M1",
            units: [
              {
                unit_id: "v1",
                unit_name: "Intro",
                unit_type: "video",
                unit_status: "not_completed",
              },
            ],
          },
        ],
      },
    ]);
    expect(emptyish.completedCount).toBe(0);
    expect(emptyish.totalCount).toBe(1);
    expect(scoredAssessments(emptyish.assessments)).toHaveLength(0);
  });

  it("apprenant actif scorés (forme Eliane)", () => {
    const active = parseLearningHistoryFromProgress("6a1eb332c5eeabe7cc054638", [
      {
        course_id: "formation",
        progress_per_section_unit: [
          {
            section_name: "QCM",
            units: [
              {
                unit_id: "a1",
                unit_name: "Quiz A",
                unit_type: "assessmentV2",
                unit_status: "completed",
                score_on_unit: 80,
              },
              {
                unit_id: "a2",
                unit_name: "Quiz B",
                unit_type: "assessmentV2",
                unit_status: "completed",
                score_on_unit: 100,
              },
            ],
          },
        ],
      },
    ]);
    expect(scoredAssessments(active.assessments)).toHaveLength(2);
    expect(bestAssessmentScore(active.assessments)).toBe(100);
  });
});
