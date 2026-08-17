import { ResetAccessPageView } from "@/components/auth/ResetAccessPageView";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";

export const dynamic = "force-dynamic";

export default function ResetAccessPage() {
  return (
    <HeroBackdrop variant="auth">
      <ResetAccessPageView />
    </HeroBackdrop>
  );
}
