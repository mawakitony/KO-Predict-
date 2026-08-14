import { describe, expect, it } from "vitest";
import {
  AUTH_BAN_DURATION_DISABLED,
  AUTH_BAN_DURATION_NONE,
  resolveUiAccountStatus,
  shouldApplyDisable,
  shouldApplyEnable,
} from "@/lib/admin/account-access-constants";
import { deriveAccountStatus } from "@/lib/admin/status";
import { adminStudentDetailHref } from "@/lib/admin/types";

describe("account access constants", () => {
  it("centralise ban_duration", () => {
    expect(AUTH_BAN_DURATION_DISABLED).toBe("876000h");
    expect(AUTH_BAN_DURATION_NONE).toBe("none");
  });

  it("ACTIVE → DISABLED : shouldApplyDisable", () => {
    expect(shouldApplyDisable("ACTIVE")).toBe(true);
    expect(shouldApplyDisable("DISABLED")).toBe(false);
  });

  it("DISABLED → ACTIVE : shouldApplyEnable", () => {
    expect(shouldApplyEnable("DISABLED")).toBe(true);
    expect(shouldApplyEnable("ACTIVE")).toBe(false);
  });

  it("double disable / enable idempotents", () => {
    expect(shouldApplyDisable("DISABLED")).toBe(false);
    expect(shouldApplyEnable("ACTIVE")).toBe(false);
  });
});

describe("UI status DISABLED", () => {
  it("profile DISABLED prime sur le lien", () => {
    expect(
      resolveUiAccountStatus({
        profileAccountStatus: "DISABLED",
        isFullyLinked: true,
      }),
    ).toBe("DISABLED");

    expect(
      deriveAccountStatus({
        isFullyLinked: true,
        invitationStatus: "ACCEPTED",
        profileAccountStatus: "DISABLED",
      }),
    ).toBe("DISABLED");
  });

  it("PENDING_ACTIVATION depuis le profil", () => {
    expect(
      resolveUiAccountStatus({
        profileAccountStatus: "PENDING_ACTIVATION",
        isFullyLinked: true,
      }),
    ).toBe("PENDING_ACTIVATION");
  });

  it("DISABLED conserve le lien Voir le dossier", () => {
    const id = "228c2031-a22a-4917-834d-f61e991bd242";
    expect(adminStudentDetailHref("DISABLED", id)).toBe(
      `/admin/students/${id}`,
    );
  });
});
