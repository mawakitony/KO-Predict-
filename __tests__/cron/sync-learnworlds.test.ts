import { describe, expect, it } from "vitest";
import {
  filterSyncableStudents,
  isSyncableActiveStudent,
  metricsFingerprintsEqual,
  predictionFingerprintsEqual,
} from "@/lib/cron/sync-learnworlds-helpers";

describe("sync-learnworlds helpers", () => {
  it("aucun student ACTIVE → liste vide", () => {
    expect(
      filterSyncableStudents([
        {
          accountStatus: "DISABLED",
          role: "student",
          learnworldsUserId: "lw1",
        },
        {
          accountStatus: "PENDING_ACTIVATION",
          role: "student",
          learnworldsUserId: "lw2",
        },
      ]),
    ).toEqual([]);
  });

  it("1 student ACTIVE syncable", () => {
    const rows = filterSyncableStudents([
      {
        accountStatus: "ACTIVE",
        role: "student",
        learnworldsUserId: "lw1",
      },
    ]);
    expect(rows).toHaveLength(1);
  });

  it("plusieurs ACTIVE, ignore DISABLED / PENDING / staff / lw null", () => {
    const rows = filterSyncableStudents([
      { accountStatus: "ACTIVE", role: "student", learnworldsUserId: "a" },
      { accountStatus: "ACTIVE", role: "student", learnworldsUserId: "b" },
      { accountStatus: "DISABLED", role: "student", learnworldsUserId: "c" },
      {
        accountStatus: "PENDING_ACTIVATION",
        role: "student",
        learnworldsUserId: "d",
      },
      { accountStatus: "ACTIVE", role: "coach", learnworldsUserId: "e" },
      { accountStatus: "ACTIVE", role: "admin", learnworldsUserId: "f" },
      {
        accountStatus: "ACTIVE",
        role: "super_admin",
        learnworldsUserId: "g",
      },
      { accountStatus: "ACTIVE", role: "student", learnworldsUserId: null },
      { accountStatus: "ACTIVE", role: "student", learnworldsUserId: "  " },
    ]);
    expect(rows.map((r) => r.learnworldsUserId)).toEqual(["a", "b"]);
  });

  it("isSyncableActiveStudent strict", () => {
    expect(
      isSyncableActiveStudent({
        accountStatus: "ACTIVE",
        role: "student",
        learnworldsUserId: "x",
      }),
    ).toBe(true);
    expect(
      isSyncableActiveStudent({
        accountStatus: "ACTIVE",
        role: "coach",
        learnworldsUserId: "x",
      }),
    ).toBe(false);
  });

  it("détecte métriques / prédictions inchangées", () => {
    const m = {
      progressPercent: 18.18,
      completedActivities: 98,
      totalActivities: 539,
      studyTimeMinutes: 2874,
      qcmAverage: 75.47,
      recentQcmAverage: 66.4,
    };
    expect(metricsFingerprintsEqual(m, { ...m, qcmAverage: 75.46 })).toBe(
      true,
    );
    expect(metricsFingerprintsEqual(m, { ...m, qcmAverage: 80 })).toBe(false);

    const p = {
      readinessScore: 46,
      readinessProbability: 0,
      riskLevel: "RED",
      currentPace: 4,
      requiredPace: 68.6,
      predictedCompletionDate: "2026-09-26",
      predictedReadinessDate: "2026-09-26",
    };
    expect(predictionFingerprintsEqual(p, { ...p })).toBe(true);
    expect(
      predictionFingerprintsEqual(p, { ...p, riskLevel: "AMBER" }),
    ).toBe(false);
  });
});
