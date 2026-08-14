"use client";

import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export function AuthUserIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2.25c-3.6 0-6.75 1.8-6.75 4.05V20h13.5v-1.7c0-2.25-3.15-4.05-6.75-4.05Z" />
    </svg>
  );
}

export function AuthEmailIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M4 6.5h16v11H4z" strokeLinejoin="round" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AuthLockIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" strokeLinecap="round" />
    </svg>
  );
}

export function AuthKeyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <circle cx="8" cy="14" r="3.2" />
      <path
        d="M11 14h9l-2 2.2M18 14l-1.6 2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AuthEyeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function AuthEyeOffIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.7 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-2.2 3.1" />
      <path d="M6.7 6.7C4.1 8.5 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.3-1" />
      <path d="M14.1 14.1A3 3 0 0 1 9.9 9.9" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode;
  label: string;
}

/** Champ underline style glass (référence login). */
export function AuthField({
  icon,
  label,
  className = "",
  id,
  type = "text",
  ...props
}: AuthFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? props.name ?? generatedId;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);
  const inputType = isPassword ? (visible ? "text" : "password") : type;

  return (
    <label className="ko-auth-field" htmlFor={fieldId}>
      <span className="ko-auth-field-icon">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <input
          id={fieldId}
          className={`ko-auth-input ${className}`}
          placeholder={props.placeholder ?? label}
          type={inputType}
          {...props}
        />
      </span>
      {isPassword ? (
        <button
          type="button"
          className="ko-auth-eye"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          tabIndex={0}
        >
          {visible ? <AuthEyeOffIcon /> : <AuthEyeIcon />}
        </button>
      ) : null}
    </label>
  );
}
