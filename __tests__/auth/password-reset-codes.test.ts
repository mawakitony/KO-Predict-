import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRecordAudit = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/auth/access-audit", () => ({
  recordAccessAudit: (...args: unknown[]) => mockRecordAudit(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import {
  generateActivationCodePlaintext,
  hashActivationCode,
} from "@/lib/auth/activation-code-crypto";
import {
  PASSWORD_RESET_CLAIM_TIMEOUT_MINUTES,
  PASSWORD_RESET_CODE_LOCK_MINUTES,
  PASSWORD_RESET_CODE_MAX_ATTEMPTS,
  PASSWORD_RESET_CODE_TTL_MINUTES,
} from "@/lib/auth/password-reset-constants";
import {
  claimPasswordResetCode,
  finalizePasswordResetCodeUsed,
  incrementResetAttempt,
  isPasswordResetClaimExpired,
  isPasswordResetCodeLocked,
  issuePasswordResetCode,
  markPasswordResetCodeUsed,
  revokePendingPasswordResetCodes,
  revertPasswordResetCodeClaim,
  verifyPasswordResetCode,
} from "@/lib/auth/password-reset-codes";

const STUDENT_ID = "stu-1";
const PROFILE_ID = "prof-1";
const CODE_ID = "prc-1";

function studentWithProfile(profile: {
  id: string;
  email: string | null;
  role: string | null;
  account_status: string | null;
} | null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: profile
            ? {
                id: STUDENT_ID,
                profile_id: profile.id,
                profiles: profile,
              }
            : null,
          error: null,
        }),
      }),
    }),
  };
}

describe("password-reset constants", () => {
  it("TTL 60 min — distinct du first-access 72 h ; claim 3 min", () => {
    expect(PASSWORD_RESET_CODE_TTL_MINUTES).toBe(60);
    expect(PASSWORD_RESET_CODE_MAX_ATTEMPTS).toBe(8);
    expect(PASSWORD_RESET_CODE_LOCK_MINUTES).toBe(15);
    expect(PASSWORD_RESET_CLAIM_TIMEOUT_MINUTES).toBe(3);
  });
});

describe("isPasswordResetCodeLocked", () => {
  it("détecte le verrouillage futur", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isPasswordResetCodeLocked(future)).toBe(true);
    expect(isPasswordResetCodeLocked(null)).toBe(false);
    expect(
      isPasswordResetCodeLocked(new Date(Date.now() - 1000).toISOString()),
    ).toBe(false);
  });
});

describe("issuePasswordResetCode", () => {
  const prevPepper = process.env.ACTIVATION_CODE_PEPPER;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ACTIVATION_CODE_PEPPER = "test-pepper-activation-32chars!!";
    mockRecordAudit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.ACTIVATION_CODE_PEPPER = prevPepper;
  });

  it("ACTIVE student → code créé, TTL ~60 min, hash seul en insert", async () => {
    const revokeUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const insertSelect = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: CODE_ID }, error: null }),
    });
    const insert = vi.fn().mockReturnValue({ select: insertSelect });

    mockFrom.mockImplementation((table: string) => {
      if (table === "students") {
        return studentWithProfile({
          id: PROFILE_ID,
          email: "Learner@Example.com",
          role: "student",
          account_status: "ACTIVE",
        });
      }
      if (table === "password_reset_codes") {
        return { update: revokeUpdate, insert };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const before = Date.now();
    const result = await issuePasswordResetCode({
      studentId: STUDENT_ID,
      createdBy: "admin-1",
    });
    const after = Date.now();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.email).toBe("learner@example.com");
    expect(result.issued.codePlaintext).toMatch(
      /^KP-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/,
    );
    expect(result.issued.passwordResetCodeId).toBe(CODE_ID);

    const expiresMs = new Date(result.issued.expiresAt).getTime();
    expect(expiresMs).toBeGreaterThanOrEqual(before + 59 * 60_000);
    expect(expiresMs).toBeLessThanOrEqual(after + 61 * 60_000);

    const insertArg = insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertArg).toMatchObject({
      student_id: STUDENT_ID,
      auth_user_id: PROFILE_ID,
      email: "learner@example.com",
      status: "PENDING",
    });
    expect(insertArg.code_hash).toBeTruthy();
    expect(String(insertArg.code_hash)).not.toContain("KP-");
    expect(JSON.stringify(insertArg)).not.toContain(result.issued.codePlaintext);

    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "password_reset_code_issued",
        studentId: STUDENT_ID,
        authUserId: PROFILE_ID,
        actorId: "admin-1",
      }),
    );
    const auditJson = JSON.stringify(mockRecordAudit.mock.calls[0]?.[0]);
    expect(auditJson).not.toContain(result.issued.codePlaintext);
    expect(auditJson).not.toMatch(/code_hash/);
  });

  it("révoque l’ancien PENDING avant insert", async () => {
    const inStatus = vi.fn().mockResolvedValue({ error: null });
    const eqStudent = vi.fn().mockReturnValue({ in: inStatus });
    const revokeUpdate = vi.fn().mockReturnValue({ eq: eqStudent });

    mockFrom.mockImplementation((table: string) => {
      if (table === "students") {
        return studentWithProfile({
          id: PROFILE_ID,
          email: "a@example.com",
          role: "student",
          account_status: "ACTIVE",
        });
      }
      return {
        update: revokeUpdate,
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { id: CODE_ID }, error: null }),
          }),
        }),
      };
    });

    await issuePasswordResetCode({ studentId: STUDENT_ID });
    expect(revokeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "REVOKED" }),
    );
    expect(eqStudent).toHaveBeenCalledWith("student_id", STUDENT_ID);
    expect(inStatus).toHaveBeenCalledWith("status", ["PENDING", "PROCESSING"]);
  });

  it("PENDING_ACTIVATION → refus", async () => {
    mockFrom.mockReturnValue(
      studentWithProfile({
        id: PROFILE_ID,
        email: "a@example.com",
        role: "student",
        account_status: "PENDING_ACTIVATION",
      }),
    );
    const result = await issuePasswordResetCode({ studentId: STUDENT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Régénérer/i);
  });

  it("DISABLED → refus", async () => {
    mockFrom.mockReturnValue(
      studentWithProfile({
        id: PROFILE_ID,
        email: "a@example.com",
        role: "student",
        account_status: "DISABLED",
      }),
    );
    const result = await issuePasswordResetCode({ studentId: STUDENT_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Réactivez/i);
  });

  it("non-student → refus", async () => {
    for (const role of ["coach", "admin", "super_admin"] as const) {
      mockFrom.mockReturnValue(
        studentWithProfile({
          id: PROFILE_ID,
          email: "a@example.com",
          role,
          account_status: "ACTIVE",
        }),
      );
      const result = await issuePasswordResetCode({ studentId: STUDENT_ID });
      expect(result.ok).toBe(false);
    }
  });
});

describe("verifyPasswordResetCode", () => {
  const prevPepper = process.env.ACTIVATION_CODE_PEPPER;
  let plaintext: string;
  let codeHash: string;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ACTIVATION_CODE_PEPPER = "test-pepper-activation-32chars!!";
    plaintext = generateActivationCodePlaintext();
    codeHash = hashActivationCode(plaintext);
    mockRecordAudit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.ACTIVATION_CODE_PEPPER = prevPepper;
  });

  function mockVerifyChain(options: {
    profile?: {
      id: string;
      email: string;
      role: string;
      account_status: string;
    } | null;
    studentId?: string | null;
    codeRow?: Record<string, unknown> | null;
  }) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: options.profile ?? null,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: options.studentId
                  ? { id: options.studentId }
                  : null,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "password_reset_codes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: options.codeRow ?? null,
                  error: null,
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected ${table}`);
    });
  }

  it("code valide → ok, sans USED", async () => {
    const update = vi.fn();
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: PROFILE_ID,
                  email: "a@example.com",
                  role: "student",
                  account_status: "ACTIVE",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: STUDENT_ID },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: CODE_ID,
                  auth_user_id: PROFILE_ID,
                  code_hash: codeHash,
                  status: "PENDING",
                  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
                  attempt_count: 0,
                  locked_until: null,
                  email: "a@example.com",
                },
                error: null,
              }),
            }),
          }),
        }),
        update,
      };
    });

    const result = await verifyPasswordResetCode({
      email: "a@example.com",
      code: plaintext,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.passwordResetCodeId).toBe(CODE_ID);
      expect(result.authUserId).toBe(PROFILE_ID);
      expect(result.studentId).toBe(STUDENT_ID);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("mauvais code → generic + increment attempt", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: PROFILE_ID,
                  email: "a@example.com",
                  role: "student",
                  account_status: "ACTIVE",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: STUDENT_ID },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: CODE_ID,
                  auth_user_id: PROFILE_ID,
                  code_hash: codeHash,
                  status: "PENDING",
                  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
                  attempt_count: 2,
                  locked_until: null,
                  email: "a@example.com",
                },
                error: null,
              }),
            }),
          }),
        }),
        update,
      };
    });

    const result = await verifyPasswordResetCode({
      email: "a@example.com",
      code: "KP-AAAA-BBBB",
    });
    expect(result).toEqual({ ok: false, reason: "generic" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ attempt_count: 3 }),
    );
  });

  it("expiré → expired + status EXPIRED", async () => {
    const updateInStatus = vi.fn().mockResolvedValue({ error: null });
    const updateEqId = vi.fn().mockReturnValue({ in: updateInStatus });
    const update = vi.fn().mockReturnValue({ eq: updateEqId });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: PROFILE_ID,
                  email: "a@example.com",
                  role: "student",
                  account_status: "ACTIVE",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: STUDENT_ID },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: CODE_ID,
                  auth_user_id: PROFILE_ID,
                  code_hash: codeHash,
                  status: "PENDING",
                  expires_at: new Date(Date.now() - 1000).toISOString(),
                  attempt_count: 0,
                  locked_until: null,
                  email: "a@example.com",
                },
                error: null,
              }),
            }),
          }),
        }),
        update,
      };
    });

    const result = await verifyPasswordResetCode({
      email: "a@example.com",
      code: plaintext,
    });
    expect(result).toEqual({ ok: false, reason: "expired" });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "EXPIRED" }),
    );
  });

  it("pas de PENDING (revoked/used) → generic", async () => {
    mockVerifyChain({
      profile: {
        id: PROFILE_ID,
        email: "a@example.com",
        role: "student",
        account_status: "ACTIVE",
      },
      studentId: STUDENT_ID,
      codeRow: null,
    });
    const result = await verifyPasswordResetCode({
      email: "a@example.com",
      code: plaintext,
    });
    expect(result).toEqual({ ok: false, reason: "generic" });
  });

  it("code locked → generic", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: PROFILE_ID,
                  email: "a@example.com",
                  role: "student",
                  account_status: "ACTIVE",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "students") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: STUDENT_ID },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: CODE_ID,
                  auth_user_id: PROFILE_ID,
                  code_hash: codeHash,
                  status: "PENDING",
                  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
                  attempt_count: 0,
                  locked_until: new Date(Date.now() + 600_000).toISOString(),
                  email: "a@example.com",
                },
                error: null,
              }),
            }),
          }),
        }),
        update: vi.fn(),
      };
    });

    const result = await verifyPasswordResetCode({
      email: "a@example.com",
      code: plaintext,
    });
    expect(result).toEqual({ ok: false, reason: "generic" });
  });
});

describe("incrementResetAttempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passe attempt_count à 8 → lock 15 min et reset compteur", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ update });

    await incrementResetAttempt({ codeId: CODE_ID, attemptCount: 7 });

    const patch = update.mock.calls[0]?.[0] as {
      attempt_count: number;
      locked_until: string;
    };
    expect(patch.attempt_count).toBe(0);
    expect(patch.locked_until).toBeTruthy();
    const lockMs = new Date(patch.locked_until).getTime() - Date.now();
    expect(lockMs).toBeGreaterThan(14 * 60_000);
    expect(lockMs).toBeLessThan(16 * 60_000);
  });
});

describe("isPasswordResetClaimExpired", () => {
  it("claim frais non expiré ; claim > 3 min expiré", () => {
    const now = Date.now();
    expect(
      isPasswordResetClaimExpired(
        new Date(now - 60_000).toISOString(),
        now,
      ),
    ).toBe(false);
    expect(
      isPasswordResetClaimExpired(
        new Date(now - 4 * 60_000).toISOString(),
        now,
      ),
    ).toBe(true);
    expect(isPasswordResetClaimExpired(null, now)).toBe(true);
  });
});

describe("claim / finalize / revert PROCESSING", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordAudit.mockResolvedValue(undefined);
  });

  it("PENDING → PROCESSING (pas USED)", async () => {
    const selectClaim = vi.fn().mockResolvedValue({
      data: [{ id: CODE_ID }],
      error: null,
    });
    const eqPending = vi.fn().mockReturnValue({ select: selectClaim });
    const eqStudent = vi.fn().mockReturnValue({ eq: eqPending });
    const eqId = vi.fn().mockReturnValue({ eq: eqStudent });
    const update = vi.fn().mockReturnValue({ eq: eqId });
    mockFrom.mockReturnValue({ update });

    const ok = await claimPasswordResetCode({
      passwordResetCodeId: CODE_ID,
      studentId: STUDENT_ID,
    });
    expect(ok).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PROCESSING",
        claimed_at: expect.any(String),
      }),
    );
    expect(JSON.stringify(update.mock.calls[0]?.[0])).not.toMatch(
      /"status":"USED"/,
    );
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it("PROCESSING non expiré → refus reclaim", async () => {
    const selectEmpty = vi.fn().mockResolvedValue({ data: [], error: null });
    // First PENDING→PROCESSING fails
    const chainPending = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ select: selectEmpty }),
        }),
      }),
    };
    // Release PROCESSING fails (fresh claim)
    const chainRelease = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ select: selectEmpty }),
          }),
        }),
      }),
    };
    let n = 0;
    mockFrom.mockImplementation(() => {
      n += 1;
      return { update: vi.fn().mockReturnValue(n === 1 ? chainPending : chainRelease) };
    });

    const ok = await claimPasswordResetCode({
      passwordResetCodeId: CODE_ID,
      studentId: STUDENT_ID,
    });
    expect(ok).toBe(false);
  });

  it("PROCESSING expiré → reclaim OK", async () => {
    const selectEmpty = vi.fn().mockResolvedValue({ data: [], error: null });
    const selectOk = vi.fn().mockResolvedValue({
      data: [{ id: CODE_ID }],
      error: null,
    });

    const failPending = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ select: selectEmpty }),
        }),
      }),
    };
    const releaseOk = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({ select: selectOk }),
          }),
        }),
      }),
    };
    const claimAgain = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ select: selectOk }),
        }),
      }),
    };

    let n = 0;
    mockFrom.mockImplementation(() => {
      n += 1;
      if (n === 1) return { update: vi.fn().mockReturnValue(failPending) };
      if (n === 2) return { update: vi.fn().mockReturnValue(releaseOk) };
      return { update: vi.fn().mockReturnValue(claimAgain) };
    });

    const ok = await claimPasswordResetCode({
      passwordResetCodeId: CODE_ID,
      studentId: STUDENT_ID,
    });
    expect(ok).toBe(true);
  });

  it("Auth KO path : revert PROCESSING → PENDING", async () => {
    const eqProcessing = vi.fn().mockResolvedValue({ error: null });
    const eqId = vi.fn().mockReturnValue({ eq: eqProcessing });
    const update = vi.fn().mockReturnValue({ eq: eqId });
    mockFrom.mockReturnValue({ update });

    await revertPasswordResetCodeClaim({ passwordResetCodeId: CODE_ID });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PENDING",
        claimed_at: null,
      }),
    );
    expect(eqProcessing).toHaveBeenCalledWith("status", "PROCESSING");
  });

  it("Auth OK : PROCESSING → USED + audit ; jamais avant", async () => {
    const selectUsed = vi.fn().mockResolvedValue({
      data: [{ id: CODE_ID }],
      error: null,
    });
    const eqProcessing = vi.fn().mockReturnValue({ select: selectUsed });
    const eqId = vi.fn().mockReturnValue({ eq: eqProcessing });
    const updateUsed = vi.fn().mockReturnValue({ eq: eqId });

    const revokeNeq = vi.fn().mockResolvedValue({ error: null });
    const revokeIn = vi.fn().mockReturnValue({ neq: revokeNeq });
    const revokeStudent = vi.fn().mockReturnValue({ in: revokeIn });
    const updateRevoke = vi.fn().mockReturnValue({ eq: revokeStudent });

    let updateCalls = 0;
    mockFrom.mockImplementation(() => {
      updateCalls += 1;
      if (updateCalls === 1) return { update: updateUsed };
      return { update: updateRevoke };
    });

    const ok = await finalizePasswordResetCodeUsed({
      passwordResetCodeId: CODE_ID,
      studentId: STUDENT_ID,
      authUserId: PROFILE_ID,
    });
    expect(ok).toBe(true);
    expect(updateUsed).toHaveBeenCalledWith(
      expect.objectContaining({ status: "USED", used_at: expect.any(String) }),
    );
    expect(eqProcessing).toHaveBeenCalledWith("status", "PROCESSING");
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "password_reset_completed" }),
    );
    const auditJson = JSON.stringify(mockRecordAudit.mock.calls[0]?.[0]);
    expect(auditJson).not.toMatch(/code_hash|KP-[2-9A-HJ-NP-Z]|"password":/i);
  });

  it("double submit : second claim refuse", async () => {
    const selectEmpty = vi.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: selectEmpty,
              lt: vi.fn().mockReturnValue({ select: selectEmpty }),
            }),
          }),
        }),
      }),
    });

    const first = await claimPasswordResetCode({
      passwordResetCodeId: CODE_ID,
      studentId: STUDENT_ID,
    });
    expect(first).toBe(false);
  });

  it("markPasswordResetCodeUsed = claim + finalize", async () => {
    const selectOk = vi.fn().mockResolvedValue({
      data: [{ id: CODE_ID }],
      error: null,
    });
    // claim PENDING→PROCESSING
    const claimChain = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ select: selectOk }),
        }),
      }),
    };
    // finalize PROCESSING→USED
    const finalizeChain = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ select: selectOk }),
      }),
    };
    const revokeChain = {
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    let n = 0;
    mockFrom.mockImplementation(() => {
      n += 1;
      if (n === 1) return { update: vi.fn().mockReturnValue(claimChain) };
      if (n === 2) return { update: vi.fn().mockReturnValue(finalizeChain) };
      return { update: vi.fn().mockReturnValue(revokeChain) };
    });

    const ok = await markPasswordResetCodeUsed({
      passwordResetCodeId: CODE_ID,
      studentId: STUDENT_ID,
      authUserId: PROFILE_ID,
    });
    expect(ok).toBe(true);
    expect(mockRecordAudit).toHaveBeenCalled();
  });
});

describe("revokePendingPasswordResetCodes", () => {
  it("révoque PENDING + PROCESSING du student", async () => {
    const inStatus = vi.fn().mockResolvedValue({ error: null });
    const eqStudent = vi.fn().mockReturnValue({ in: inStatus });
    const update = vi.fn().mockReturnValue({ eq: eqStudent });
    mockFrom.mockReturnValue({ update });

    await revokePendingPasswordResetCodes(STUDENT_ID);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "REVOKED", claimed_at: null }),
    );
    expect(eqStudent).toHaveBeenCalledWith("student_id", STUDENT_ID);
    expect(inStatus).toHaveBeenCalledWith("status", ["PENDING", "PROCESSING"]);
  });
});

describe("séparation first-access", () => {
  it("domaine reset n’importe pas activation_codes table dans le source", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("lib/auth/password-reset-codes.ts", "utf8");
    expect(src).toMatch(/password_reset_codes/);
    expect(src).not.toMatch(/from\("activation_codes"\)/);
    expect(src).toMatch(/PASSWORD_RESET_CODE_TTL_MINUTES/);
    expect(src).not.toMatch(/ACTIVATION_CODE_TTL_HOURS/);
  });

  it("Phase B/C : first-access intact ; émission admin sans update password", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    expect(fs.existsSync("app/first-access")).toBe(true);
    expect(fs.existsSync("app/auth/reset-access")).toBe(true);
    const route = fs.readFileSync(
      path.join(
        "app",
        "api",
        "admin",
        "students",
        "issue-password-reset-code",
        "route.ts",
      ),
      "utf8",
    );
    expect(route).toMatch(/canIssueStudentPasswordResetCode/);
    expect(route).not.toMatch(/updateUser|resetPasswordForEmail|password:/i);
  });
});
