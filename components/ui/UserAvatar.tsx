import type { ProfileDisplayInput } from "@/lib/profile/display";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-20 w-20",
  xl: "h-28 w-28 sm:h-32 sm:w-32",
};

interface UserAvatarProps extends ProfileDisplayInput {
  imageUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}

/**
 * Silhouette par défaut — buste collé au bord bas du cercle.
 */
function DefaultAvatarGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      aria-hidden
      focusable="false"
    >
      <circle cx="40" cy="40" r="40" fill="#c4c8cd" />
      <circle cx="40" cy="28" r="13" fill="#ffffff" />
      <path
        d="M2 80c1.5-18 14.5-28 38-28s36.5 10 38 28H2Z"
        fill="#ffffff"
      />
    </svg>
  );
}

/** Avatar global KO Predict™ — photo ou silhouette, avec bordure double. */
export function UserAvatar({
  imageUrl,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const dim = SIZE_CLASS[size];
  const hasPhoto = Boolean(imageUrl?.trim());
  const frame = `ko-user-avatar ${dim}${className ? ` ${className}` : ""}`;

  if (hasPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL Storage dynamique + cache-bust
      <img
        src={imageUrl!}
        alt=""
        width={128}
        height={128}
        decoding="async"
        className={`${frame} object-cover object-center`}
      />
    );
  }

  return (
    <span className={`${frame} ko-user-avatar-default`} aria-hidden>
      <DefaultAvatarGlyph className="block h-full w-full" />
    </span>
  );
}
