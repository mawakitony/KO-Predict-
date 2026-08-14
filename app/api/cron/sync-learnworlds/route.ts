import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { syncActiveLearnWorldsStudents } from "@/lib/cron/sync-learnworlds";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { isLearnWorldsConfigured } from "@/lib/learnworlds/config";

export const dynamic = "force-dynamic";
/** Hobby Vercel ≈ 60s ; volume V1 faible (ACTIVE only, séquentiel). */
export const maxDuration = 60;

/**
 * GET|POST /api/cron/sync-learnworlds
 * Resync LearnWorlds pour apprenants ACTIVE uniquement.
 * Auth : Authorization Bearer CRON_SECRET ou x-cron-secret.
 */
async function handle(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET non configuré." },
      { status: 503 },
    );
  }

  if (!isAuthorizedCron(request)) {
    return NextResponse.json(
      { ok: false, error: "Non autorisé." },
      { status: 401 },
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "SUPABASE_SERVICE_ROLE_KEY manquant — requis pour la sync.",
      },
      { status: 503 },
    );
  }

  if (!isLearnWorldsConfigured()) {
    return NextResponse.json(
      { ok: false, error: "LearnWorlds non configuré." },
      { status: 503 },
    );
  }

  try {
    const result = await syncActiveLearnWorldsStudents();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Échec sync LearnWorlds.";
    console.error("[cron/sync-learnworlds]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
