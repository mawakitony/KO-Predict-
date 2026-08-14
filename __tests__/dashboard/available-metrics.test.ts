import { describe, expect, it } from "vitest";
import { buildAvailableMetrics } from "@/lib/dashboard/available-metrics";

describe("buildAvailableMetrics — null ≠ 0", () => {
  it("progressPercent = 0 → affiche 0 %", () => {
    const items = buildAvailableMetrics({
      progressPercent: 0,
      completedActivities: 0,
      totalActivities: 100,
      studyTimeMinutes: 0,
      qcmAverage: null,
      inactiveDays: 0,
    });
    const progress = items.find((i) => i.key === "progress");
    expect(progress?.value).toBe("0 %");
  });

  it("progressPercent = null → ne produit pas de faux 0", () => {
    const items = buildAvailableMetrics({
      progressPercent: null,
      completedActivities: 10,
      totalActivities: 100,
      studyTimeMinutes: 60,
      qcmAverage: 75,
      inactiveDays: 1,
    });
    expect(items.some((i) => i.key === "progress")).toBe(false);
    expect(items.map((i) => i.value).join(" ")).not.toMatch(/^0 %| 0 %/);
  });

  it("qcmAverage = 0 → affiche 0 %", () => {
    const items = buildAvailableMetrics({
      progressPercent: 18,
      completedActivities: 98,
      totalActivities: 539,
      studyTimeMinutes: 2874,
      qcmAverage: 0,
      inactiveDays: 1,
    });
    expect(items.find((i) => i.key === "qcm")?.value).toBe("0 %");
  });

  it("qcmAverage = null → ne produit pas de faux 0", () => {
    const items = buildAvailableMetrics({
      progressPercent: 18,
      completedActivities: 98,
      totalActivities: 539,
      studyTimeMinutes: 2874,
      qcmAverage: null,
      inactiveDays: 1,
    });
    expect(items.some((i) => i.key === "qcm")).toBe(false);
  });

  it("affiche les métriques utiles avec valeurs réelles", () => {
    const items = buildAvailableMetrics({
      progressPercent: 18,
      completedActivities: 98,
      totalActivities: 539,
      studyTimeMinutes: 2874,
      qcmAverage: 75,
      inactiveDays: 1,
    });
    expect(items.find((i) => i.key === "progress")?.value).toBe("18 %");
    expect(items.find((i) => i.key === "activities")?.value).toBe("98 / 539");
    expect(items.find((i) => i.key === "study")?.value).toBe("47 h 54 min");
    expect(items.find((i) => i.key === "qcm")?.value).toBe("75 %");
    expect(items.find((i) => i.key === "inactive")?.label).toBe(
      "Dernière activité",
    );
    expect(items.find((i) => i.key === "inactive")?.value).toBe(
      "il y a 1 jour",
    );
  });

  it("conserve les vrais zéros (progression / activités / temps)", () => {
    const items = buildAvailableMetrics({
      progressPercent: 0,
      completedActivities: 0,
      totalActivities: 263,
      studyTimeMinutes: 0,
      qcmAverage: null,
      inactiveDays: 1,
    });
    expect(items.find((i) => i.key === "progress")?.value).toBe("0 %");
    expect(items.find((i) => i.key === "activities")?.value).toBe("0 / 263");
    expect(items.find((i) => i.key === "study")?.value).toBe("0 min");
    expect(items.map((i) => i.value).join(" ")).not.toContain(
      "insuffisant",
    );
  });
});
