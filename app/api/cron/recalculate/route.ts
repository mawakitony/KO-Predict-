import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { recalculateAllActiveStudents } from "@/lib/cron/recalculate";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET|POST /api/cron/recalculate
 * Recalcule depuis Supabase (sans appel LearnWorlds).
 * Appelé par Vercel Cron — header Authorization: Bearer CRON_SECRET
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
        error: "SUPABASE_SERVICE_ROLE_KEY manquant — requis pour le recalcul.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await recalculateAllActiveStudents();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Échec du recalcul.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
