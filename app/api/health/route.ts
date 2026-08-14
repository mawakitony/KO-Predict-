import { NextResponse } from "next/server";
import { isLearnWorldsConfigured } from "@/lib/learnworlds/config";
import {
  isSupabaseAdminConfigured,
  isSupabasePublicConfigured,
} from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/**
 * Santé globale MVP — sans exposer de secrets.
 * GET /api/health
 */
export async function GET() {
  const checks = {
    supabasePublic: isSupabasePublicConfigured(),
    supabaseAdmin: isSupabaseAdminConfigured(),
    learnworlds: isLearnWorldsConfigured(),
    webhookSecret: Boolean(process.env.LEARNWORLDS_WEBHOOK_SECRET),
    cronSecret: Boolean(process.env.CRON_SECRET),
  };

  const readyForAuth = checks.supabasePublic;
  const readyForSync = checks.supabaseAdmin && checks.learnworlds;
  const readyForWebhooks = readyForSync && checks.webhookSecret;
  const readyForCron = checks.supabaseAdmin && checks.cronSecret;

  const productionReady =
    readyForAuth && readyForSync && readyForWebhooks && readyForCron;

  return NextResponse.json({
    ok: productionReady,
    app: "KO Predict™",
    phase: 13,
    checks,
    readiness: {
      auth: readyForAuth,
      sync: readyForSync,
      webhooks: readyForWebhooks,
      cron: readyForCron,
      production: productionReady,
    },
  });
}
