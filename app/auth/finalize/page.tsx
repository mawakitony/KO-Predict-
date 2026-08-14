import { redirect } from "next/navigation";

/**
 * Ancien parcours finalisation invitation email — OBSOLÈTE en V1.
 * Redirige vers /first-access (email + code d’activation).
 */
export default function FinalizeAccountPage() {
  redirect("/first-access");
}
