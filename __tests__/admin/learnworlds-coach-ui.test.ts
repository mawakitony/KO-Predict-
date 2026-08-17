import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LW_COACH_CREATE_SUCCESS_NOTE,
  LW_COACH_PASSWORD_NOTE,
  mapLwCoachApiError,
  mapLwCoachCreateConflictUiMessage,
  mapLwCoachEligibilityUiMessage,
} from "@/lib/admin/learnworlds-coach-ui";

describe("messages UI coach LearnWorlds", () => {
  it("lookup instructor / not found / non eligible / admin override", () => {
    expect(mapLwCoachEligibilityUiMessage("ELIGIBLE_INSTRUCTOR")).toMatch(
      /Instructor LearnWorlds reconnu/i,
    );
    expect(mapLwCoachEligibilityUiMessage("NOT_FOUND")).toMatch(
      /Aucun compte LearnWorlds trouvé/i,
    );
    expect(mapLwCoachEligibilityUiMessage("NOT_ELIGIBLE")).toMatch(
      /n’est pas éligible/i,
    );
    expect(mapLwCoachEligibilityUiMessage("ELIGIBLE_ADMIN_OVERRIDE")).toMatch(
      /administrateur LearnWorlds/i,
    );
    expect(mapLwCoachEligibilityUiMessage("ELIGIBLE_ADMIN_OVERRIDE")).toMatch(
      /V1/i,
    );
  });

  it("conflits create : student / staff / disabled / pending", () => {
    expect(mapLwCoachCreateConflictUiMessage("existing_student")).toMatch(
      /apprenant/i,
    );
    expect(mapLwCoachCreateConflictUiMessage("existing_admin")).toMatch(
      /rôle supérieur/i,
    );
    expect(mapLwCoachCreateConflictUiMessage("existing_super_admin")).toMatch(
      /rôle supérieur/i,
    );
    expect(mapLwCoachCreateConflictUiMessage("existing_disabled")).toMatch(
      /désactivé/i,
    );
    expect(mapLwCoachCreateConflictUiMessage("existing_pending")).toMatch(
      /attente d’activation/i,
    );
  });

  it("AAL2 requis → message + challenge", () => {
    const mapped = mapLwCoachApiError({
      status: 403,
      body: {
        error: "Vérification en deux étapes requise…",
        reasonCode: "MFA_AAL2_REQUIRED",
      },
    });
    expect(mapped.needsMfaChallenge).toBe(true);
    expect(mapped.message).toMatch(/deux étapes/i);
  });

  it("erreur LW générique", () => {
    expect(
      mapLwCoachApiError({
        status: 400,
        body: { error: "Impossible de vérifier LearnWorlds." },
      }).message,
    ).toMatch(/LearnWorlds/i);
  });

  it("notes password + succès", () => {
    expect(LW_COACH_PASSWORD_NOTE).toMatch(/mot de passe LearnWorlds/i);
    expect(LW_COACH_PASSWORD_NOTE).toMatch(/n’est pas réutilisé/i);
    expect(LW_COACH_CREATE_SUCCESS_NOTE).toMatch(/Coach KO Predict/i);
    expect(LW_COACH_CREATE_SUCCESS_NOTE).toMatch(/activation/i);
  });
});

describe("UI source — modal + TeamBoard", () => {
  it("modal : lookup puis create ; email seul ; pas de rôle LW client comme vérité", () => {
    const src = readFileSync(
      join(process.cwd(), "components/admin/AddLearnWorldsCoachModal.tsx"),
      "utf8",
    );
    expect(src).toMatch(/\/api\/admin\/team\/learnworlds\/lookup/);
    expect(src).toMatch(/\/api\/admin\/team\/learnworlds\/create-coach/);
    expect(src).toMatch(/ELIGIBLE_INSTRUCTOR/);
    expect(src).toMatch(/admin\.team\.createAsCoach/);
    expect(src).toMatch(/auth\/mfa\/challenge/);
    expect(src).toMatch(/body: JSON\.stringify\(\{ email/);
    expect(src).toMatch(/create-coach[\s\S]*JSON\.stringify\(\{\s*email: lookup\.email\s*\}\)/);
    expect(src).not.toMatch(/console\.(log|debug|info)/);
    expect(src).not.toMatch(/access_token|LEARNWORLDS_CLIENT_SECRET/);
    // create n'envoie jamais isInstructor / roleLevel comme payload
    const createBlock = src.slice(src.indexOf("function onCreate"));
    expect(createBlock).toMatch(/JSON\.stringify\(\{\s*email: lookup\.email\s*\}\)/);
    expect(createBlock).not.toMatch(/isInstructor:|roleLevel:/);
  });

  it("aucune création sur simple lookup (create seulement via bouton dédié)", () => {
    const src = readFileSync(
      join(process.cwd(), "components/admin/AddLearnWorldsCoachModal.tsx"),
      "utf8",
    );
    expect(src).toMatch(/function onVerify/);
    expect(src).toMatch(/function onCreate/);
    expect(src).toMatch(/lookupLearnWorlds|learnworlds\/lookup/);
    // onVerify n'appelle pas create-coach
    const verifyBlock = src.slice(
      src.indexOf("function onVerify"),
      src.indexOf("function onCreate"),
    );
    expect(verifyBlock).toMatch(/learnworlds\/lookup/);
    expect(verifyBlock).not.toMatch(/create-coach/);
  });

  it("TeamBoard : bouton séparé coach LW vs Ajouter un membre", () => {
    const src = readFileSync(
      join(process.cwd(), "components/admin/TeamBoard.tsx"),
      "utf8",
    );
    expect(src).toMatch(/admin\.team\.addLwCoach/);
    expect(src).toMatch(/admin\.team\.addMember/);
    expect(src).toMatch(/AddLearnWorldsCoachModal/);
    expect(src).toMatch(/ActivationCodeModal/);
  });

  it("loading / retry : états pending phase lookup|create", () => {
    const src = readFileSync(
      join(process.cwd(), "components/admin/AddLearnWorldsCoachModal.tsx"),
      "utf8",
    );
    expect(src).toMatch(/common\.verifying/);
    expect(src).toMatch(/admin\.team\.creating/);
    expect(src).toMatch(/phase === \"lookup\"/);
    expect(src).toMatch(/phase === \"create\"/);
  });
});
