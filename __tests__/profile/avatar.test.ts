import { describe, expect, it } from "vitest";
import {
  AVATAR_MAX_BYTES,
  avatarStoragePath,
  isOwnAvatarPath,
  validateAvatarFile,
} from "@/lib/profile/avatar";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

describe("validateAvatarFile", () => {
  it("accepte JPG / PNG / WebP sous 5 Mo", () => {
    expect(
      validateAvatarFile({ type: "image/jpeg", size: 1024 }),
    ).toMatchObject({ ok: true, ext: "jpg" });
    expect(
      validateAvatarFile({ type: "image/png", size: 2048 }),
    ).toMatchObject({ ok: true, ext: "png" });
    expect(
      validateAvatarFile({ type: "image/webp", size: 4096 }),
    ).toMatchObject({ ok: true, ext: "webp" });
  });

  it("refuse GIF et types invalides", () => {
    expect(validateAvatarFile({ type: "image/gif", size: 100 })).toEqual({
      ok: false,
      error: "Formats acceptés : JPG, JPEG, PNG ou WebP.",
    });
    expect(
      validateAvatarFile({ type: "application/pdf", size: 100 }),
    ).toMatchObject({ ok: false });
  });

  it("refuse fichier trop volumineux", () => {
    expect(
      validateAvatarFile({
        type: "image/jpeg",
        size: AVATAR_MAX_BYTES + 1,
      }),
    ).toEqual({
      ok: false,
      error: "Image trop lourde (max 5 Mo).",
    });
  });

  it("refuse fichier vide", () => {
    expect(validateAvatarFile({ type: "image/png", size: 0 })).toMatchObject({
      ok: false,
    });
  });
});

describe("avatarStoragePath / isolation utilisateurs", () => {
  it("lie le chemin à l’ID Auth", () => {
    expect(avatarStoragePath(USER_A, "jpg")).toBe(`${USER_A}/avatar.jpg`);
  });

  it("refuse un userId non UUID", () => {
    expect(() => avatarStoragePath("../etc", "jpg")).toThrow();
  });

  it("utilisateur A ne peut pas cibler le path de B", () => {
    expect(isOwnAvatarPath(USER_A, `${USER_B}/avatar.jpg`)).toBe(false);
    expect(isOwnAvatarPath(USER_A, `${USER_A}/avatar.png`)).toBe(true);
    expect(isOwnAvatarPath(USER_A, `${USER_A}/../${USER_B}/avatar.jpg`)).toBe(
      false,
    );
  });
});
