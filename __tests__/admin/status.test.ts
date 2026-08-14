import { describe, expect, it } from "vitest";
import {
  certificationFromTags,
  deriveAccountStatus,
  derivePredictionStatus,
  isFullyLinkedAccount,
  normalizeEmail,
} from "@/lib/admin/status";
import { adminStudentDetailHref } from "@/lib/admin/types";

describe("admin status helpers", () => {
  it("normalise email", () => {
    expect(normalizeEmail("  A@B.com ")).toBe("a@b.com");
  });

  it("ACTIVE uniquement si lien complet", () => {
    expect(
      isFullyLinkedAccount({
        authUserId: "u1",
        profileId: "u1",
        studentId: "s1",
        learnworldsUserIdOnStudent: "lw1",
        expectedLearnworldsUserId: "lw1",
      }),
    ).toBe(true);

    expect(
      isFullyLinkedAccount({
        authUserId: "u1",
        profileId: "u1",
        studentId: "s1",
        learnworldsUserIdOnStudent: null,
        expectedLearnworldsUserId: "lw1",
      }),
    ).toBe(false);
  });

  it("dérive les statuts UI (parcours code)", () => {
    expect(
      deriveAccountStatus({
        isFullyLinked: true,
        profileAccountStatus: "PENDING_ACTIVATION",
      }),
    ).toBe("PENDING_ACTIVATION");
    expect(
      deriveAccountStatus({
        isFullyLinked: true,
        profileAccountStatus: "ACTIVE",
      }),
    ).toBe("ACTIVE");
    expect(
      deriveAccountStatus({
        isFullyLinked: true,
        profileAccountStatus: "DISABLED",
      }),
    ).toBe("DISABLED");
    expect(
      deriveAccountStatus({
        isFullyLinked: false,
        invitationStatus: "PENDING",
      }),
    ).toBe("PENDING_ACTIVATION");
    expect(
      deriveAccountStatus({ isFullyLinked: false, invitationStatus: "FAILED" }),
    ).toBe("ERROR");
    expect(
      deriveAccountStatus({ isFullyLinked: false, invitationStatus: null }),
    ).toBe("NOT_ACTIVATED");
  });

  it("lien dossier pour PENDING_ACTIVATION", () => {
    expect(adminStudentDetailHref("PENDING_ACTIVATION", "s1")).toBe(
      "/admin/students/s1",
    );
    expect(adminStudentDetailHref("NOT_ACTIVATED", "s1")).toBeNull();
  });

  it("predictionStatus séparé du compte", () => {
    expect(derivePredictionStatus(null)).toBe("NONE");
    expect(
      derivePredictionStatus({
        progressPercent: 10,
        remainingActivities: 90,
        currentPace: 4,
        requiredPace: null,
        readinessScore: null,
        readinessProbability: null,
        predictedCompletionDate: null,
        predictedReadinessDate: null,
        riskLevel: null,
        paceStatus: null,
        recommendedAction: "x",
        issues: ["MISSING_TARGET_DATE"],
        calculatedAt: new Date().toISOString(),
      }),
    ).toBe("INSUFFICIENT_DATA");
  });

  it("certification depuis tags", () => {
    expect(certificationFromTags(["CAPM 0826"])).toBe("CAPM");
    expect(certificationFromTags(["PMP Prep"])).toBe("PMP");
  });
});
