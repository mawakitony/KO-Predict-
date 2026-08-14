import { describe, expect, it } from "vitest";
import { resolveDisplayName, resolveInitials } from "@/lib/profile/display";

describe("resolveDisplayName", () => {
  it("priorise display_name", () => {
    expect(
      resolveDisplayName({
        displayName: "Tony A.",
        firstName: "Tony",
        lastName: "Assiki",
        email: "tony@test.dev",
      }),
    ).toBe("Tony A.");
  });

  it("utilise first_name + last_name sinon", () => {
    expect(
      resolveDisplayName({
        displayName: null,
        firstName: "Tony",
        lastName: "Assiki",
        email: "tony@test.dev",
      }),
    ).toBe("Tony Assiki");
  });

  it("utilise first_name seul si pas de nom", () => {
    expect(
      resolveDisplayName({
        firstName: "Tony",
        lastName: null,
        email: "tony@test.dev",
      }),
    ).toBe("Tony");
  });

  it("fallback email", () => {
    expect(
      resolveDisplayName({
        displayName: "  ",
        firstName: null,
        lastName: null,
        email: "tony@test.dev",
      }),
    ).toBe("tony@test.dev");
  });
});

describe("resolveInitials", () => {
  it("prend initiales prénom + nom (Assiki Tony → AT selon ordre first/last)", () => {
    expect(
      resolveInitials({ firstName: "Assiki", lastName: "Tony" }),
    ).toBe("AT");
    expect(
      resolveInitials({ firstName: "Tony", lastName: "Assiki" }),
    ).toBe("TA");
  });

  it("utilise le pseudo si présent", () => {
    expect(resolveInitials({ displayName: "Tony A." })).toBe("TA");
  });

  it("fallback email", () => {
    expect(resolveInitials({ email: "marie@woloyem.dev" })).toBe("MA");
  });
});
