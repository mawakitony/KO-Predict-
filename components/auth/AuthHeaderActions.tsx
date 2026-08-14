import { SignOutButton } from "@/components/auth/SignOutButton";

interface AuthHeaderActionsProps {
  email?: string | null;
  variant?: "light" | "dark";
}

export function AuthHeaderActions({
  email,
  variant = "light",
}: AuthHeaderActionsProps) {
  const textClass = variant === "light" ? "text-white/70" : "text-slate-500";

  return (
    <div className={`flex items-center gap-3 text-sm ${textClass}`}>
      {email ? <span className="hidden sm:inline">{email}</span> : null}
      <SignOutButton variant={variant} />
    </div>
  );
}
