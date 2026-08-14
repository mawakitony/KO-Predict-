import { describe, expect, it } from "vitest";
import { adminStudentDetailHref } from "@/lib/admin/types";

describe("adminStudentDetailHref", () => {
  const studentId = "228c2031-a22a-4917-834d-f61e991bd242";

  it("ACTIVE + studentId → /admin/students/{students.id}", () => {
    expect(adminStudentDetailHref("ACTIVE", studentId)).toBe(
      `/admin/students/${studentId}`,
    );
  });

  it("DISABLED + studentId → dossier toujours accessible", () => {
    expect(adminStudentDetailHref("DISABLED", studentId)).toBe(
      `/admin/students/${studentId}`,
    );
  });

  it("ACTIVE sans studentId → pas de lien Voir le dossier", () => {
    expect(adminStudentDetailHref("ACTIVE", null)).toBeNull();
  });

  it("NOT_ACTIVATED → pas de lien dossier", () => {
    expect(adminStudentDetailHref("NOT_ACTIVATED", studentId)).toBeNull();
  });
});
