import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { AuthUserIcon } from "@/components/ui/AuthField";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="ko-auth-glass ko-fade-up px-5 py-8 sm:px-10 sm:py-11">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/85">
          <AuthUserIcon className="h-8 w-8" />
        </div>

        <div className="text-center">
          <BrandMark href="/" size="md" tone="light" className="items-center" />
          <h1 className="ko-display mt-4 text-2xl font-bold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/65">{subtitle}</p>
        </div>

        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-7 space-y-3">{footer}</div> : null}
      </div>
    </div>
  );
}
