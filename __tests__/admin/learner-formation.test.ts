import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildLearnerFormationView,
  emptyLearnerFormation,
  formationNeverUsesCertificationFallback,
  NO_ACTIVE_FORMATION,
  UNKNOWN_FORMATION_TITLE,
} from "@/lib/admin/learner-formation";
import { isManifestlyInvalidLearnWorldsUserId } from "@/lib/learning/lw-id";
import type { LearnWorldsCourse } from "@/types/learnworlds";

const ITIL_ID = "itil-5-plan-implement-and-control-certification";
const ITIL_TITLE =
  "ITIL® 5 Plan, Implement and Control Certification Training";

const catalog: LearnWorldsCourse[] = [
  { id: ITIL_ID, title: ITIL_TITLE },
  { id: "pmp-prep", title: "PMP Prep Bootcamp" },
];

describe("formation fiche admin", () => {
  it("0 progress → Aucune formation active", () => {
    const view = buildLearnerFormationView([], catalog);
    expect(view).toEqual(emptyLearnerFormation());
    expect(view.compactLabel).toBe(NO_ACTIVE_FORMATION);
    expect(view.headerTitle).toBeNull();
    expect(view.compactLabel).not.toMatch(/PMP/i);
  });

  it("1 cours → titre catalogue réel (Prince / ITIL)", () => {
    const view = buildLearnerFormationView(
      [{ course_id: ITIL_ID, status: "not_started" }],
      catalog,
    );
    expect(view.courses).toHaveLength(1);
    expect(view.compactLabel).toBe(ITIL_TITLE);
    expect(view.headerTitle).toBe(ITIL_TITLE);
    expect(view.compactLabel).not.toBe("PMP");
  });

  it("plusieurs cours → premier titre + N autres et liste complète", () => {
    const view = buildLearnerFormationView(
      [{ course_id: ITIL_ID }, { course_id: "pmp-prep" }],
      catalog,
    );
    expect(view.courses.map((c) => c.title)).toEqual([
      ITIL_TITLE,
      "PMP Prep Bootcamp",
    ]);
    expect(view.compactLabel).toBe(`${ITIL_TITLE} +1 autre`);
    expect(view.headerTitle).toBeNull();
  });

  it("students.certification = PMP ne sert jamais de fallback", () => {
    const empty = buildLearnerFormationView([], catalog);
    expect(
      formationNeverUsesCertificationFallback(empty, "PMP"),
    ).toBe(true);
    const unknown = buildLearnerFormationView(
      [{ course_id: "unknown-course" }],
      catalog,
    );
    expect(
      formationNeverUsesCertificationFallback(unknown, "PMP"),
    ).toBe(true);
    expect(unknown.compactLabel).toBe(UNKNOWN_FORMATION_TITLE);
    expect(unknown.headerTitle).toBeNull();
  });

  it("LW id invalide/placeholder → aucune formation, jamais PMP", () => {
    expect(isManifestlyInvalidLearnWorldsUserId("lw_tony_test_demo")).toBe(
      true,
    );
    const view = buildLearnerFormationView([], catalog);
    expect(view.compactLabel).toBe(NO_ACTIVE_FORMATION);
    expect(view.compactLabel).not.toMatch(/PMP/i);
  });

  it("course_id inconnu du catalogue → fallback neutre, jamais PMP", () => {
    const view = buildLearnerFormationView(
      [{ course_id: "cours-absent-du-catalogue" }],
      catalog,
    );
    expect(view.compactLabel).toBe(UNKNOWN_FORMATION_TITLE);
    expect(view.headerTitle).toBeNull();
    expect(view.compactLabel).not.toMatch(/PMP/i);
    expect(view.compactLabel).not.toBe("cours-absent-du-catalogue");
  });

  it("le chargeur ne touche pas certificationFromTags ni students.certification", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/admin/load-learner-formation.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/certificationFromTags/);
    expect(src).not.toMatch(/\.from\("students"\)/);
    expect(src).not.toMatch(/\.update\(/);
    expect(src).toMatch(/listCourses/);
    expect(src).toMatch(/getCachedProgress/);
  });

  it("le mapper n’importe pas students.certification", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/admin/learner-formation.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/from\("students"\)/);
    expect(src).not.toMatch(/certificationFromTags/);
    expect(src).not.toMatch(/certificationFallback/);
  });

  it("la fiche admin n’affiche plus le libellé Certification", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "components/admin/StudentProfileBoard.tsx"),
      "utf8",
    );
    expect(src).toMatch(/admin\.file\.formation/);
    expect(src).not.toMatch(/label="Certification"/);
    expect(src).toMatch(/detail\.formation/);
    expect(src).not.toMatch(/student\.certification/);
  });
});
