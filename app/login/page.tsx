import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginPageView } from "@/components/auth/LoginPageView";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";
import { getCurrentProfile } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";

interface PageProps {
  searchParams: Promise<{ next?: string; reset?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const profile = await getCurrentProfile();
  const params = await searchParams;

  if (profile) {
    redirect(homePathForRole(profile.role));
  }

  return (
    <HeroBackdrop variant="auth">
      <LoginPageView next={params.next} reset={params.reset} />
    </HeroBackdrop>
  );
}
