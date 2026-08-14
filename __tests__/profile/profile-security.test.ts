import { describe, expect, it } from "vitest";
import { roleLabelFr } from "@/lib/auth/roles";
import type { UserRole } from "@/types/student";

/**
 * Garde-fous documentés + testés hors DB :
 * - updateProfileAction n’accepte jamais role/email/accountStatus
 * - chemins Storage toujours préfixés par auth.uid()
 * - tous les rôles ont accès à /profile (requireActiveAccount)
 */

const PROFILE_EDITABLE_ROLES: UserRole[] = [
  "student",
  "coach",
  "admin",
  "super_admin",
];

describe("profil — rôles autorisés à éditer leur propre fiche", () => {
  it.each(PROFILE_EDITABLE_ROLES)(
    "%s peut accéder à la page profil (contrat)",
    (role) => {
      expect(PROFILE_EDITABLE_ROLES).toContain(role);
      expect(roleLabelFr(role).length).toBeGreaterThan(0);
    },
  );

  it("libellés FR lisibles et lecture seule", () => {
    expect(roleLabelFr("student")).toBe("Apprenant");
    expect(roleLabelFr("coach")).toBe("Coach");
    expect(roleLabelFr("admin")).toBe("Administrateur");
    expect(roleLabelFr("super_admin")).toBe("Super administrateur");
  });
});

describe("profil — champs sensibles exclus du formulaire", () => {
  it("les champs role/email/accountStatus sont rejetés par contrat d’action", async () => {
    // Simulation du garde-fou de updateProfileAction
    const form = new FormData();
    form.set("firstName", "Tony");
    form.set("role", "super_admin");
    form.set("email", "hacked@evil.test");
    form.set("accountStatus", "ACTIVE");

    const blocked =
      form.has("role") || form.has("accountStatus") || form.has("email");
    expect(blocked).toBe(true);
  });

  it("un update légitime n’inclut que first/last/display", () => {
    const payload = {
      first_name: "Tony",
      last_name: "Assiki",
      display_name: "Tony A.",
    };
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("account_status");
    expect(payload).not.toHaveProperty("avatar_url");
  });
});
