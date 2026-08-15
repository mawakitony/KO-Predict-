import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import { LearningHistoryError } from "@/lib/admin/learning-history/service";
import {
  isManifestlyInvalidLearnWorldsUserId,
  LEARNER_HISTORY_TEMPORARY_MESSAGE,
  LEARNER_HISTORY_UNAVAILABLE_MESSAGE,
} from "@/lib/learning/lw-id";

export type SessionStudentGate =
  | {
      ok: true;
      userId: string;
      studentId: string;
      learnworldsUserId: string;
    }
  | { ok: false; response: NextResponse };

function invalidLwResponse(code: "NO_LW_ID" | "INVALID_LW_ID" = "INVALID_LW_ID") {
  return NextResponse.json(
    {
      ok: false,
      code,
      message: LEARNER_HISTORY_UNAVAILABLE_MESSAGE,
      error: LEARNER_HISTORY_UNAVAILABLE_MESSAGE,
    },
    { status: 422 },
  );
}

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
          code: "UNAVAILABLE",
          message: LEARNER_HISTORY_TEMPORARY_MESSAGE,
          error: LEARNER_HISTORY_TEMPORARY_MESSAGE,
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
        { ok: false, error: "Non authentifié.", message: "Non authentifié." },
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
        { ok: false, error: "Accès refusé.", message: "Accès refusé." },
        { status: 403 },
      ),
    };
  }

  if (profile.account_status === "PENDING_ACTIVATION") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Compte non finalisé.",
          message: "Compte non finalisé.",
        },
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
          code: "UNAVAILABLE",
          message: LEARNER_HISTORY_TEMPORARY_MESSAGE,
          error: LEARNER_HISTORY_TEMPORARY_MESSAGE,
        },
        { status: 503 },
      ),
    };
  }

  if (!student) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Aucun profil apprenant associé à ce compte.",
          message: "Aucun profil apprenant associé à ce compte.",
        },
        { status: 403 },
      ),
    };
  }

  const lwId = student.learnworlds_user_id?.trim();
  if (!lwId) {
    return { ok: false, response: invalidLwResponse("NO_LW_ID") };
  }
  if (isManifestlyInvalidLearnWorldsUserId(lwId)) {
    return { ok: false, response: invalidLwResponse("INVALID_LW_ID") };
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
    if (error.code === "NO_LW_ID" || error.code === "INVALID_LW_ID") {
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          message: LEARNER_HISTORY_UNAVAILABLE_MESSAGE,
          error: LEARNER_HISTORY_UNAVAILABLE_MESSAGE,
        },
        { status: 422 },
      );
    }
    const message = LEARNER_HISTORY_TEMPORARY_MESSAGE;
    return NextResponse.json(
      { ok: false, error: message, message, code: error.code },
      { status: error.status },
    );
  }
  return NextResponse.json(
    {
      ok: false,
      code: "UNAVAILABLE",
      error: LEARNER_HISTORY_TEMPORARY_MESSAGE,
      message: LEARNER_HISTORY_TEMPORARY_MESSAGE,
    },
    { status: 500 },
  );
}
