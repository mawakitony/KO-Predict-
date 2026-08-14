import Link from "next/link";

interface BrandMarkProps {
  /** `null` = marque sans lien (ex. héros landing). */
  href?: string | null;
  tone?: "light" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClass = {
  sm: "text-xl",
  md: "text-[1.65rem]",
  lg: "text-3xl sm:text-4xl",
  xl: "text-[3.25rem] sm:text-[4.75rem]",
} as const;

export function BrandMark({
  href = "/",
  tone = "dark",
  size = "md",
  className = "",
}: BrandMarkProps) {
  const toneColor = tone === "light" ? "text-white" : "text-slate-900";

  const content = (
    <span
      data-tone={tone}
      data-size={size}
      className={`ko-brand inline-flex flex-col items-start ${className}`}
      aria-label="KO Predict™"
    >
      <span
        className={`inline-flex items-baseline ${sizeClass[size]} ${toneColor}`}
      >
        <span className="ko-brand-ko">KO</span>
        <span className="ko-brand-predict">
          &nbsp;Predict
          <sup className="ko-brand-tm">™</sup>
        </span>
      </span>
      {size === "xl" ? <span className="ko-brand-underline" aria-hidden /> : null}
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
