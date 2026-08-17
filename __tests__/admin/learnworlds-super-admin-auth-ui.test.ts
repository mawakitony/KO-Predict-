import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("server-only", () => ({}));

import { MFA_AAL2_REQUIRED } from "@/lib/auth/mfa-aal";
import {
  LW_SA_AUTH_NOT_PROMOTION_NOTICE,
  LW_SA_AUTH_REVOKE_NOTICE,
  LW_SA_AUTH_SECTION_ID,
  mapLwSuperAdminAuthApiError,
  resolveAdminPromoteLwAuthUiState,
} from "@/lib/admin/learnworlds-super-admin-auth-ui";
import { lookupLearnWorldsSuperAdminAuthCandidate } from "@/lib/admin/learnworlds-super-admin-auth-lookup";
import type { LearnWorldsUser } from "@/types/learnworlds";

function lwUser(overrides: Partial<LearnWorldsUser> = {}): LearnWorldsUser {
  return {
    id: "lw_1",
    email: "person@woloyem.com",
    username: "p",
    firstName: "Pat",
    lastName: "Lee",
    tags: [],
    customFields: {},
    role: {
      level: "admin",
      name: "Admin",
      isAdmin: true,
      isInstructor: false,
    },
    createdAt: null,
    lastLoginAt: null,
    ...overrides,
  };
}

describe("resolveAdminPromoteLwAuthUiState", () => {
  it("can_promote / auth_required / auth_revoked", () => {
    expect(
      resolveAdminPromoteLwAuthUiState({
        memberEmail: "Admin@Example.com",
        authorizations: [
          { email: "admin@example.com", status: "ACTIVE" },
        ],
      }),
    ).toBe("can_promote");
    expect(
      resolveAdminPromoteLwAuthUiState({
        memberEmail: "admin@example.com",
        authorizations: [],
      }),
    ).toBe("auth_required");
    expect(
      resolveAdminPromoteLwAuthUiState({
        memberEmail: "admin@example.com",
        authorizations: [
          { email: "admin@example.com", status: "REVOKED" },
        ],
      }),
    ).toBe("auth_revoked");
  });
});

describe("mapLwSuperAdminAuthApiError", () => {
  it("MFA_AAL2_REQUIRED", () => {
    const r = mapLwSuperAdminAuthApiError({
      status: 403,
      body: { reasonCode: MFA_AAL2_REQUIRED },
    });
    expect(r.needsMfaChallenge).toBe(true);
  });

  it("messages métier", () => {
    expect(
      mapLwSuperAdminAuthApiError({
        status: 400,
        body: { reasonCode: "DUPLICATE_ACTIVE" },
      }).message,
    ).toMatch(/ACTIVE/);
    expect(
      mapLwSuperAdminAuthApiError({
        status: 400,
        body: { reasonCode: "LW_NOT_FOUND" },
      }).message,
    ).toMatch(/LearnWorlds/);
    expect(
      mapLwSuperAdminAuthApiError({
        status: 400,
        body: { reasonCode: "LW_ID_MISMATCH" },
      }).message,
    ).toMatch(/identité/i);
  });
});

describe("lookupLearnWorldsSuperAdminAuthCandidate", () => {
  it("normalise email + found", async () => {
    const r = await lookupLearnWorldsSuperAdminAuthCandidate(
      "  Person@WOLOYEM.COM ",
      { getUserByEmail: async () => lwUser() },
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.found) {
      expect(r.email).toBe("person@woloyem.com");
      expect(r.identity.roleLevel).toBe("admin");
    }
  });

  it("not found", async () => {
    const r = await lookupLearnWorldsSuperAdminAuthCandidate("x@y.com", {
      getUserByEmail: async () => null,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.found).toBe(false);
  });
});

describe("UI / routes Phase B — source", () => {
  it("messages sécurité présents", () => {
    expect(LW_SA_AUTH_NOT_PROMOTION_NOTICE).toMatch(/ne donne pas encore/);
    expect(LW_SA_AUTH_REVOKE_NOTICE).toMatch(/ne modifie pas automatiquement/);
  });

  it("panel + modal sans promotion / Auth", () => {
    const panel = readFileSync(
      join(
        process.cwd(),
        "components/admin/LearnWorldsSuperAdminAuthorizationsPanel.tsx",
      ),
      "utf8",
    );
    const modal = readFileSync(
      join(
        process.cwd(),
        "components/admin/AuthorizeLearnWorldsSuperAdminModal.tsx",
      ),
      "utf8",
    );
    expect(panel).toMatch(/admin\.team\.lwAuthTitle/);
    expect(panel).toMatch(/admin\.team\.lwRevokeNotice/);
    expect(panel).not.toMatch(/promoteToSuperAdmin|changeTeamRole|createUser/);
    expect(modal).toMatch(/admin\.team\.lwNotPromotion/);
    expect(modal).toMatch(/expectedLearnWorldsUserId/);
    expect(modal).not.toMatch(/promoteToSuperAdmin|createTeamMember/);
  });

  it("page team charge la section sans brancher promote", () => {
    const src = readFileSync(
      join(process.cwd(), "app/admin/team/page.tsx"),
      "utf8",
    );
    expect(src).toMatch(/LearnWorldsSuperAdminAuthorizationsPanel/);
    expect(src).toMatch(/listLearnWorldsSuperAdminAuthorizations/);
    expect(src).toMatch(/lwSuperAdminAuthorizations/);
  });

  it("TeamBoard gate promotion via autorisation LW", () => {
    const src = readFileSync(
      join(process.cwd(), "components/admin/TeamBoard.tsx"),
      "utf8",
    );
    expect(src).toMatch(/resolveAdminPromoteLwAuthUiState/);
    expect(src).toMatch(/LW_SA_AUTH_SECTION_ID/);
    expect(src).toMatch(/admin\.team\.lwAuthRequired/);
    expect(LW_SA_AUTH_SECTION_ID).toBe("lw-sa-authorizations");
  });

  it("lookup route : SA + AAL2, lecture seule", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "app/api/admin/team/learnworlds/super-admin-auth/lookup/route.ts",
      ),
      "utf8",
    );
    expect(src).toMatch(/requirePermissionApi/);
    expect(src).toMatch(/canManageTeam/);
    expect(src).toMatch(/lookupLearnWorldsSuperAdminAuthCandidate/);
    expect(src).not.toMatch(/createLearnWorldsSuperAdminAuthorization/);
    expect(src).not.toMatch(/promoteToSuperAdmin/);
  });
});
