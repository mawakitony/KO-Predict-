import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  hasMinimumActiveSuperAdmins,
  isLastActiveSuperAdminCount,
} from "@/lib/admin/super-admin-guards";

describe("super-admin-guards (pure)", () => {
  it("hasMinimumActiveSuperAdmins", () => {
    expect(hasMinimumActiveSuperAdmins(0, 2)).toBe(false);
    expect(hasMinimumActiveSuperAdmins(1, 2)).toBe(false);
    expect(hasMinimumActiveSuperAdmins(2, 2)).toBe(true);
    expect(hasMinimumActiveSuperAdmins(3, 2)).toBe(true);
  });

  it("isLastActiveSuperAdminCount", () => {
    expect(isLastActiveSuperAdminCount(0)).toBe(false);
    expect(isLastActiveSuperAdminCount(1)).toBe(true);
    expect(isLastActiveSuperAdminCount(2)).toBe(false);
  });
});
