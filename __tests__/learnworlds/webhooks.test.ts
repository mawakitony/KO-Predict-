import { describe, expect, it } from "vitest";
import {
  buildWebhookDeliveryKey,
  parseLearnWorldsWebhookPayload,
} from "@/lib/learnworlds/webhooks/parse";
import {
  computeLearnWorldsWebhookSignature,
  extractLearnWorldsSignature,
  verifyLearnWorldsWebhookSignature,
} from "@/lib/learnworlds/webhooks/signature";

describe("LearnWorlds webhook signature", () => {
  const secret = "test-webhook-secret";
  const rawBody = JSON.stringify({
    version: 2,
    type: "courseCompleted",
    trigger: "course_completed",
    data: { user: { id: "abc123", email: "a@b.com" } },
  });

  it("accepte v1=<hex> valide", () => {
    const hex = computeLearnWorldsWebhookSignature(rawBody, secret);
    expect(
      verifyLearnWorldsWebhookSignature({
        rawBody,
        signatureHeader: `v1=${hex}`,
        secret,
      }),
    ).toBe(true);
  });

  it("rejette une signature altérée", () => {
    expect(
      verifyLearnWorldsWebhookSignature({
        rawBody,
        signatureHeader: "v1=deadbeef",
        secret,
      }),
    ).toBe(false);
  });

  it("extrait v1 depuis le header", () => {
    expect(extractLearnWorldsSignature("v1=abcdef")).toBe("abcdef");
  });
});

describe("parseLearnWorldsWebhookPayload", () => {
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

  it("ignore un événement non sync", () => {
    const parsed = parseLearnWorldsWebhookPayload({
      type: "userTagAdded",
      trigger: "user_tag_added",
      data: { user: { id: "abc" } },
    });
    expect(parsed.shouldSync).toBe(false);
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
