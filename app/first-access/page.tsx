import { FirstAccessPageView } from "@/components/auth/FirstAccessPageView";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";

export const dynamic = "force-dynamic";

export default function FirstAccessPage() {
  return (
    <HeroBackdrop variant="auth">
      <FirstAccessPageView />
    </HeroBackdrop>
  );
}
