/** Règles upload avatar KO Predict™ (partagées actions + tests). */

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const AVATAR_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AvatarValidationResult =
  | { ok: true; ext: "jpg" | "png" | "webp"; contentType: string }
  | { ok: false; error: string };

export function mimeToAvatarExt(
  mime: string,
): "jpg" | "png" | "webp" | null {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

/** Chemin Storage sécurisé, toujours sous {userId}/. */
export function avatarStoragePath(
  userId: string,
  ext: "jpg" | "png" | "webp",
): string {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new Error("userId invalide pour avatar");
  }
  return `${userId}/avatar.${ext}`;
}

export function validateAvatarFile(input: {
  type: string;
  size: number;
}): AvatarValidationResult {
  const ext = mimeToAvatarExt(input.type);
  if (!ext) {
    return {
      ok: false,
      error: "Formats acceptés : JPG, JPEG, PNG ou WebP.",
    };
  }

  if (!input.size || input.size <= 0) {
    return { ok: false, error: "Choisissez une image." };
  }

  if (input.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "Image trop lourde (max 5 Mo)." };
  }

  return {
    ok: true,
    ext,
    contentType: input.type,
  };
}

/** Vérifie qu’un chemin Storage appartient bien à userId. */
export function isOwnAvatarPath(userId: string, path: string): boolean {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return false;
  if (path.includes("..") || path.startsWith("/")) return false;
  return (
    path === `${userId}/avatar.jpg` ||
    path === `${userId}/avatar.png` ||
    path === `${userId}/avatar.webp` ||
    (path.startsWith(`${userId}/`) && !path.slice(userId.length + 1).includes("/"))
  );
}
