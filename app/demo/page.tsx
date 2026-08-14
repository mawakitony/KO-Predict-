import { ConnectionGuideDemo } from "@/components/auth/ConnectionGuideDemo";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";

export const metadata = {
  title: "Comment se connecter · KO Predict™",
  description:
    "Démo apprenant : comment accéder au tableau de bord avec le code secret WOLOYEM.",
};

export default function DemoPage() {
  return (
    <HeroBackdrop variant="auth">
      <ConnectionGuideDemo />
    </HeroBackdrop>
  );
}
