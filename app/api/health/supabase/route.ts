import { NextResponse } from "next/server";
import {
  isSupabaseAdminConfigured,
  isSupabasePublicConfigured,
} from "@/lib/supabase/env";

/**
 * Diagnostic de configuration Supabase (sans exposer de secrets).
 * GET /api/health/supabase
 */
export async function GET() {
  const publicConfigured = isSupabasePublicConfigured();
  const adminConfigured = isSupabaseAdminConfigured();

  let reachable: boolean | null = null;
  let message = "Variables publiques manquantes. Remplissez .env.local.";

  if (publicConfigured) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    try {
      const response = await fetch(`${url}/auth/v1/health`, {
        method: "GET",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        },
        cache: "no-store",
      });
      reachable = response.ok;
      message = response.ok
        ? "Supabase joignable avec les variables publiques."
        : `Supabase a répondu HTTP ${response.status}. Vérifiez l'URL et la clé publishable.`;
    } catch {
      reachable = false;
      message =
        "Impossible de joindre Supabase. Vérifiez NEXT_PUBLIC_SUPABASE_URL et votre réseau.";
    }
  }

  const status = publicConfigured && reachable ? 200 : 503;

  return NextResponse.json(
    {
      ok: Boolean(publicConfigured && reachable),
      publicConfigured,
      adminConfigured,
      reachable,
      message,
      phase: 2,
    },
    { status },
  );
}
