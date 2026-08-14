import { describe, expect, it } from "vitest";
import { matchesRosterSearch } from "@/lib/admin/roster-search";

describe("matchesRosterSearch", () => {
  const marieDupont = {
    fullName: "Marie Dupont",
    firstName: "Marie",
    lastName: "Dupont",
    email: "marie.dupont@example.com",
    tags: ["KO"],
  };

  const marieMartin = {
    fullName: "Marie Martin",
    firstName: "Marie",
    lastName: "Martin",
    email: "marie.martin@example.com",
    tags: [],
  };

  it("trouve tous les homonymes sur un prénom", () => {
    expect(matchesRosterSearch(marieDupont, "Marie")).toBe(true);
    expect(matchesRosterSearch(marieMartin, "Marie")).toBe(true);
  });

  it("trouve par nom de famille seul", () => {
    expect(matchesRosterSearch(marieDupont, "Dupont")).toBe(true);
    expect(matchesRosterSearch(marieMartin, "Dupont")).toBe(false);
  });

  it("exige tous les tokens pour un nom complet", () => {
    expect(matchesRosterSearch(marieDupont, "Marie Dupont")).toBe(true);
    expect(matchesRosterSearch(marieMartin, "Marie Dupont")).toBe(false);
  });

  it("ignore les accents", () => {
    expect(
      matchesRosterSearch(
        { fullName: "Éliane Biémi", firstName: "Éliane", lastName: "Biémi" },
        "eliane",
      ),
    ).toBe(true);
  });

  it("matche aussi l’email et les tags", () => {
    expect(matchesRosterSearch(marieDupont, "marie.dupont@")).toBe(true);
    expect(matchesRosterSearch(marieDupont, "KO")).toBe(true);
  });
});
