import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("vercel.json cron schedules", () => {
  const raw = readFileSync(resolve(process.cwd(), "vercel.json"), "utf8");
  const config = JSON.parse(raw) as {
    crons: Array<{ path: string; schedule: string }>;
  };

  it("définit 4 sync LearnWorlds quotidiennes (Hobby-compatible)", () => {
    const sync = config.crons.filter(
      (c) => c.path === "/api/cron/sync-learnworlds",
    );
    expect(sync.map((c) => c.schedule).sort()).toEqual([
      "0 0 * * *",
      "0 12 * * *",
      "0 18 * * *",
      "0 6 * * *",
    ]);
  });

  it("conserve recalculate quotidien à 02:00 UTC", () => {
    const recalc = config.crons.filter(
      (c) => c.path === "/api/cron/recalculate",
    );
    expect(recalc).toEqual([
      { path: "/api/cron/recalculate", schedule: "0 2 * * *" },
    ]);
  });

  it("chaque expression cron ne s'exécute qu'une fois par jour", () => {
    for (const cron of config.crons) {
      const [minute, hour, dayOfMonth, month, dayOfWeek] =
        cron.schedule.split(/\s+/);
      expect(minute).toBe("0");
      expect(hour).toMatch(/^\d{1,2}$/);
      expect(dayOfMonth).toBe("*");
      expect(month).toBe("*");
      expect(dayOfWeek).toBe("*");
    }
  });
});
