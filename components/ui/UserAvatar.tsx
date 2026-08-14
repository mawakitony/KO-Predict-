import { resolveInitials, type ProfileDisplayInput } from "@/lib/profile/display";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-28 w-28 text-2xl sm:h-32 sm:w-32 sm:text-3xl",
};

interface UserAvatarProps extends ProfileDisplayInput {
  imageUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}

/** Avatar global KO Predict™ — photo ou initiales. */
export function UserAvatar({
  imageUrl,
  size = "md",
  className = "",
  ...identity
}: UserAvatarProps) {
  const dim = SIZE_CLASS[size];
  const initials = resolveInitials(identity);

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL Storage dynamique + cache-bust
      <img
        src={imageUrl}
        alt=""
        className={`inline-block shrink-0 rounded-full object-cover ring-2 ring-white ${dim} ${className}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--admin-blue-soft,#dbeafe)] font-semibold text-[var(--admin-blue-hover,#1d4ed8)] ring-2 ring-white ${dim} ${className}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}
