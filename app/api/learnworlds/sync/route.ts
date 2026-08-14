import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { syncLearnWorldsLearner } from "@/lib/learnworlds/sync";
import { isLearnWorldsConfigured } from "@/lib/learnworlds/config";
import {
  LearnWorldsApiError,
  LearnWorldsConfigError,
  LearnWorldsEndpointPendingError,
} from "@/lib/learnworlds/errors";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv, isSupabaseAdminConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/**
 * POST /api/learnworlds/sync
 * Auth : session admin cookie, OU Bearer access_token Supabase admin, OU x-cron-secret
 */
export async function POST(request: Request) {
  try {
    if (!isLearnWorldsConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error: "LearnWorlds non configuré (variables d'environnement).",
        },
        { status: 503 },
      );
    }

    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = request.headers.get("x-cron-secret");
    const isCron =
      Boolean(cronSecret) &&
      Boolean(providedSecret) &&
      providedSecret === cronSecret;

    let db: SupabaseClient | undefined;

    if (!isCron) {
      const authHeader = request.headers.get("authorization");
      const bearer = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

      if (bearer) {
        const { url, publishableKey } = getSupabasePublicEnv();
        const tokenClient = createSupabaseJsClient(url, publishableKey, {
          global: { headers: { Authorization: `Bearer ${bearer}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const {
          data: { user },
          error,
        } = await tokenClient.auth.getUser(bearer);
        if (error || !user) {
          return NextResponse.json(
            { ok: false, error: "Jeton Supabase invalide." },
            { status: 401 },
          );
        }
        const { data: profile } = await tokenClient
          .from("profiles")
          .select("role, account_status")
          .eq("id", user.id)
          .maybeSingle();
        const { canSyncStudents } = await import("@/lib/auth/permissions");
        const { parseUserRole } = await import("@/lib/auth/roles");
        if (
          profile?.account_status === "DISABLED" ||
          profile?.account_status === "PENDING_ACTIVATION" ||
          !canSyncStudents(parseUserRole(profile?.role))
        ) {
          return NextResponse.json(
            { ok: false, error: "Accès réservé aux administrateurs." },
            { status: 403 },
          );
        }
        db = tokenClient;
      } else {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          return NextResponse.json(
            { ok: false, error: "Non authentifié." },
            { status: 401 },
          );
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, account_status")
          .eq("id", user.id)
          .maybeSingle();
        const { canSyncStudents } = await import("@/lib/auth/permissions");
        const { parseUserRole } = await import("@/lib/auth/roles");
        if (
          profile?.account_status === "DISABLED" ||
          profile?.account_status === "PENDING_ACTIVATION" ||
          !canSyncStudents(parseUserRole(profile?.role))
        ) {
          return NextResponse.json(
            { ok: false, error: "Accès réservé aux administrateurs." },
            { status: 403 },
          );
        }
      }
    } else if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "CRON_SECRET OK mais SUPABASE_SERVICE_ROLE_KEY manquant pour écrire en base.",
        },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      learnworldsUserIdOrEmail?: string;
      email?: string;
      learnworldsUserId?: string;
      currentPace?: number;
      certificationFallback?: string;
    } | null;

    const learnworldsUserIdOrEmail =
      body?.learnworldsUserIdOrEmail?.trim() ||
      body?.learnworldsUserId?.trim() ||
      body?.email?.trim();

    if (!learnworldsUserIdOrEmail) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Paramètre requis : learnworldsUserIdOrEmail (ou email / learnworldsUserId).",
        },
        { status: 400 },
      );
    }

    const result = await syncLearnWorldsLearner(
      {
        learnworldsUserIdOrEmail,
        currentPace: body?.currentPace,
        certificationFallback: body?.certificationFallback,
      },
      db,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LearnWorldsConfigError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 503 },
      );
    }
    if (error instanceof LearnWorldsEndpointPendingError) {
      return NextResponse.json(
        { ok: false, error: error.message, pending: true },
        { status: 501 },
      );
    }
    if (error instanceof LearnWorldsApiError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          status: error.status,
          details: error.body,
        },
        { status: error.status && error.status < 500 ? error.status : 502 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Erreur de synchronisation.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
