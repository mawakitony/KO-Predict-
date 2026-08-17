import type { ReactNode } from "react";
import Link from "next/link";

type ActionTone = "neutral" | "primary" | "danger" | "success" | "violet";

type SharedProps = {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  tone?: ActionTone;
  /** Affiche le libellé à côté de l’icône (CTA unique : Activer, Réactiver). */
  labeled?: boolean;
};

type ButtonActionProps = SharedProps & {
  href?: undefined;
  onClick: () => void;
};

type LinkActionProps = SharedProps & {
  href: string;
  onClick?: undefined;
};

export function AdminRowActions({ children }: { children: ReactNode }) {
  return <div className="ko-admin-row-actions">{children}</div>;
}

export function AdminRowAction(props: ButtonActionProps | LinkActionProps) {
  const {
    label,
    icon,
    disabled = false,
    tone = "neutral",
    labeled = false,
  } = props;
  const className = labeled
    ? "ko-admin-text-action"
    : "ko-admin-icon-action";

  const content = (
    <>
      {icon}
      {labeled ? <span>{label}</span> : null}
    </>
  );

  if (props.href) {
    return (
      <Link
        href={props.href}
        className={className}
        data-tone={tone}
        title={label}
        aria-label={label}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      data-tone={tone}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={props.onClick}
    >
      {content}
    </button>
  );
}
