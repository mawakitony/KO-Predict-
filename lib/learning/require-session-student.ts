import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { LearningHistoryError } from "@/lib/admin/learning-history/service";

export type SessionStudentGate =
  | {
      ok: true;
      userId: string;
      studentId: string;
      learnworldsUserId: string;
    }
  | { ok: false; response: NextResponse };

/**
 * Identifie l’apprenant UNIQUEMENT via la session Supabase.
 * Aucun studentId client n’est accepté.
 */
export async function requireSessionStudentApi(): Promise<SessionStudentGate> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Vos données LearnWorlds sont temporairement indisponibles.",
        },
        { status: 503 },
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Non authentifié." },
        { status: 401 },
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.account_status === "DISABLED") {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Accès refusé." },
        { status: 403 },
      ),
    };
  }

  if (profile.account_status === "PENDING_ACTIVATION") {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Compte non finalisé." },
        { status: 403 },
      ),
    };
  }

  const { data: student, error } = await supabase
    .from("students")
    .select("id, learnworlds_user_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Vos données LearnWorlds sont temporairement indisponibles.",
        },
        { status: 503 },
      ),
    };
  }

  if (!student) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Aucun profil apprenant associé à ce compte." },
        { status: 403 },
      ),
    };
  }

  const lwId = student.learnworlds_user_id?.trim();
  if (!lwId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Vos données LearnWorlds sont temporairement indisponibles.",
          code: "NO_LW_ID",
        },
        { status: 422 },
      ),
    };
  }

  return {
    ok: true,
    userId: user.id,
    studentId: student.id,
    learnworldsUserId: lwId,
  };
}

export function learningHistoryErrorResponse(error: unknown): NextResponse {
  if (error instanceof LearningHistoryError) {
    const message =
      error.code === "NO_LW_ID"
        ? "Vos données LearnWorlds sont temporairement indisponibles."
        : error.message.includes("tentatives")
          ? "Vos données LearnWorlds sont temporairement indisponibles."
          : "Vos données LearnWorlds sont temporairement indisponibles.";
    return NextResponse.json(
      { ok: false, error: message, code: error.code },
      { status: error.status },
    );
  }
  return NextResponse.json(
    {
      ok: false,
      error: "Vos données LearnWorlds sont temporairement indisponibles.",
    },
    { status: 500 },
  );
}
