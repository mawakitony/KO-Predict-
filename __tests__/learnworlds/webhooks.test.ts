import { describe, expect, it } from "vitest";
import {
  buildWebhookDeliveryKey,
  isLearnWorldsAutomationUserPayload,
  parseLearnWorldsWebhookPayload,
} from "@/lib/learnworlds/webhooks/parse";
import {
  computeLearnWorldsWebhookSignature,
  extractLearnWorldsSignature,
  verifyLearnWorldsWebhookSignature,
} from "@/lib/learnworlds/webhooks/signature";

describe("LearnWorlds webhook signature", () => {
  // Jeton pré-partagé LearnWorlds (forme observée : hex).
  const sharedToken =
    "e8fad5b079d0977f61bc2d21fc5f461719e6478df7de56";
  const rawBody = JSON.stringify({
    version: 2,
    type: "courseCompleted",
    trigger: "course_completed",
    data: { user: { id: "abc123", email: "a@b.com" } },
  });

  it("accepte v1=<WEBHOOK SIGNATURE> (jeton pré-partagé Settings/Automation)", () => {
    expect(
      verifyLearnWorldsWebhookSignature({
        rawBody,
        signatureHeader: `v1=${sharedToken}`,
        secret: sharedToken,
      }),
    ).toBe(true);
  });

  it("accepte le jeton même si le body change (pas un HMAC du body)", () => {
    expect(
      verifyLearnWorldsWebhookSignature({
        rawBody: JSON.stringify({ other: true }),
        signatureHeader: `v1=${sharedToken}`,
        secret: sharedToken,
      }),
    ).toBe(true);
  });

  it("accepte encore un HMAC-SHA256 hex complet (compat Settings historique)", () => {
    const signingSecret = "legacy-hmac-signing-secret";
    const hex = computeLearnWorldsWebhookSignature(rawBody, signingSecret);
    expect(hex).toHaveLength(64);
    expect(
      verifyLearnWorldsWebhookSignature({
        rawBody,
        signatureHeader: `v1=${hex}`,
        secret: signingSecret,
      }),
    ).toBe(true);
  });

  it("rejette un HMAC tronqué à 46 caractères", () => {
    const signingSecret = "legacy-hmac-signing-secret";
    const full = computeLearnWorldsWebhookSignature(rawBody, signingSecret);
    const truncated = full.slice(0, 46);
    expect(truncated).toHaveLength(46);
    expect(
      verifyLearnWorldsWebhookSignature({
        rawBody,
        signatureHeader: `v1=${truncated}`,
        secret: signingSecret,
      }),
    ).toBe(false);
  });

  it("rejette une signature altérée → équivalent 401", () => {
    expect(
      verifyLearnWorldsWebhookSignature({
        rawBody,
        signatureHeader: "v1=deadbeef",
        secret: sharedToken,
      }),
    ).toBe(false);
  });

  it("rejette l'absence de signature", () => {
    expect(
      verifyLearnWorldsWebhookSignature({
        rawBody,
        signatureHeader: null,
        secret: sharedToken,
      }),
    ).toBe(false);
  });

  it("Automation : v1=<jeton> accepté", () => {
    const automationBody = JSON.stringify({
      user: {
        id: "6a7c52613e28030887049ae7",
        email: "loyuoky@gmail.com",
        username: "loyuoky",
      },
      automation_name: "KO Predict sync",
      school: "woloyem",
    });
    expect(
      verifyLearnWorldsWebhookSignature({
        rawBody: automationBody,
        signatureHeader: `v1=${sharedToken}`,
        secret: sharedToken,
      }),
    ).toBe(true);
  });

  it("extrait v1 depuis le header", () => {
    expect(extractLearnWorldsSignature("v1=abcdef")).toBe("abcdef");
  });
});

describe("parseLearnWorldsWebhookPayload", () => {
  it("webhook Settings existant toujours accepté", () => {
    const parsed = parseLearnWorldsWebhookPayload({
      version: 2,
      type: "userUpdated",
      trigger: "user_updated",
      data: {
        user: { id: "lw_settings_1", email: "settings@example.com" },
      },
    });
    expect(parsed.shouldSync).toBe(true);
    expect(parsed.isAutomationPayload).toBe(false);
    expect(parsed.learnworldsUserId).toBe("lw_settings_1");
    expect(parsed.type).toBe("userUpdated");
  });

  it("détecte courseCompleted + user id", () => {
    const parsed = parseLearnWorldsWebhookPayload({
      version: 2,
      type: "courseCompleted",
      trigger: "course_completed",
      data: {
        user: { id: "6a70cfa4a1a033ad030f6fc5", email: "antoine@x.com" },
      },
    });
    expect(parsed.shouldSync).toBe(true);
    expect(parsed.learnworldsUserId).toBe("6a70cfa4a1a033ad030f6fc5");
  });

  it("ignore un événement Settings non sync", () => {
    const parsed = parseLearnWorldsWebhookPayload({
      type: "userTagAdded",
      trigger: "user_tag_added",
      data: { user: { id: "abc" } },
    });
    expect(parsed.shouldSync).toBe(false);
  });

  it("Automation user à la racine sans type → sync (équivalent userUpdated)", () => {
    const payload = {
      user: {
        id: "6a7c52613e28030887049ae7",
        email: "loyuoky@gmail.com",
        username: "loyuoky",
      },
      automation_name: "KO Predict sync",
      school: "woloyem",
    };
    expect(isLearnWorldsAutomationUserPayload(payload)).toBe(true);
    const parsed = parseLearnWorldsWebhookPayload(payload);
    expect(parsed.shouldSync).toBe(true);
    expect(parsed.isAutomationPayload).toBe(true);
    expect(parsed.type).toBeNull();
    expect(parsed.learnworldsUserId).toBe("6a7c52613e28030887049ae7");
    expect(parsed.email).toBe("loyuoky@gmail.com");
    expect(parsed.trigger).toBe("KO Predict sync");
  });

  it("Automation sans user → ignoré proprement", () => {
    const parsed = parseLearnWorldsWebhookPayload({
      automation_name: "KO Predict sync",
      school: "woloyem",
    });
    expect(parsed.shouldSync).toBe(false);
    expect(parsed.isAutomationPayload).toBe(false);
    expect(parsed.learnworldsUserId).toBeNull();
  });

  it("delivery_key stable = pas de doublon pour le même body", () => {
    const body = JSON.stringify({
      user: { id: "u1", email: "a@b.com" },
      automation_name: "x",
    });
    expect(buildWebhookDeliveryKey(body)).toBe(buildWebhookDeliveryKey(body));
  });
});

describe("buildWebhookDeliveryKey", () => {
  it("est stable pour le même body", () => {
    const body = '{"a":1}';
    expect(buildWebhookDeliveryKey(body)).toBe(buildWebhookDeliveryKey(body));
    expect(buildWebhookDeliveryKey(body)).toHaveLength(64);
  });

  it("diffère si le body change", () => {
    expect(buildWebhookDeliveryKey('{"a":1}')).not.toBe(
      buildWebhookDeliveryKey('{"a":2}'),
    );
  });

  it("est un hex sha256 de 64 caractères", () => {
    expect(buildWebhookDeliveryKey("hello")).toMatch(/^[a-f0-9]{64}$/);
  });
});
