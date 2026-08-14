import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { markActivationCodeUsed } from "@/lib/auth/activation-codes";
import { markTeamActivationCodeUsed } from "@/lib/auth/team-activation-codes";
import { recordAccessAudit } from "@/lib/auth/access-audit";
import {
  FIRST_ACCESS_COOKIE_NAME,
  verifyFirstAccessToken,
} from "@/lib/auth/first-access-token";
import { homePathForRole, parseUserRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  password: z.string().min(8).max(128),
  confirm: z.string().min(8).max(128),
});

/**
 * POST /api/auth/first-access/complete
 * Body: { password, confirm }
 * Requiert cookie ko_first_access (verify préalable).
 */
export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Mot de passe invalide (min. 8 caractères)." },
      { status: 400 },
    );
  }

  if (parsed.data.password !== parsed.data.confirm) {
    return NextResponse.json(
      { ok: false, error: "Les mots de passe ne correspondent pas." },
      { status: 400 },
    );
  }

  const jar = await cookies();
  const token = jar.get(FIRST_ACCESS_COOKIE_NAME)?.value;
  const payload = verifyFirstAccessToken(token);
  if (!payload) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Session de première connexion expirée. Recommencez avec email et code.",
      },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const kind = payload.kind;

  if (kind === "team") {
    const { data: codeRow } = await admin
      .from("team_activation_codes")
      .select("id, profile_id, status, auth_user_id")
      .eq("id", payload.activationCodeId)
      .maybeSingle();

    if (!codeRow || codeRow.status !== "PENDING") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Code d’activation invalide ou déjà utilisé. Demandez un nouveau code.",
        },
        { status: 400 },
      );
    }

    if (
      codeRow.auth_user_id &&
      codeRow.auth_user_id !== payload.authUserId
    ) {
      return NextResponse.json(
        { ok: false, error: "Session de première connexion invalide." },
        { status: 401 },
      );
    }

    const { error: pwdError } = await admin.auth.admin.updateUserById(
      payload.authUserId,
      { password: parsed.data.password },
    );
    if (pwdError) {
      return NextResponse.json(
        { ok: false, error: pwdError.message },
        { status: 500 },
      );
    }

    await markTeamActivationCodeUsed({
      activationCodeId: payload.activationCodeId,
      profileId: codeRow.profile_id,
      authUserId: payload.authUserId,
    });

    await admin
      .from("profiles")
      .update({
        account_status: "ACTIVE",
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.authUserId);

    await recordAccessAudit({
      eventType: "account_activated",
      authUserId: payload.authUserId,
      meta: { kind: "team" },
    });

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", payload.authUserId)
      .maybeSingle();

    const redirectTo = homePathForRole(parseUserRole(profile?.role));

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: parsed.data.password,
    });

    if (signInError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Compte activé, mais connexion automatique échouée. Connectez-vous via /login.",
          redirectTo: "/login",
        },
        { status: 200 },
      );
    }

    const response = NextResponse.json({ ok: true, redirectTo });
    response.cookies.set(FIRST_ACCESS_COOKIE_NAME, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const { data: codeRow } = await admin
    .from("activation_codes")
    .select("id, student_id, status, auth_user_id")
    .eq("id", payload.activationCodeId)
    .maybeSingle();

  if (!codeRow || codeRow.status !== "PENDING") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Code d’activation invalide ou déjà utilisé. Demandez un nouveau code.",
      },
      { status: 400 },
    );
  }

  if (
    codeRow.auth_user_id &&
    codeRow.auth_user_id !== payload.authUserId
  ) {
    return NextResponse.json(
      { ok: false, error: "Session de première connexion invalide." },
      { status: 401 },
    );
  }

  const { error: pwdError } = await admin.auth.admin.updateUserById(
    payload.authUserId,
    { password: parsed.data.password },
  );
  if (pwdError) {
    return NextResponse.json(
      { ok: false, error: pwdError.message },
      { status: 500 },
    );
  }

  await markActivationCodeUsed({
    activationCodeId: payload.activationCodeId,
    studentId: codeRow.student_id,
    authUserId: payload.authUserId,
  });

  await admin
    .from("profiles")
    .update({
      account_status: "ACTIVE",
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.authUserId);

  await recordAccessAudit({
    eventType: "account_activated",
    studentId: codeRow.student_id,
    authUserId: payload.authUserId,
  });

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: parsed.data.password,
  });

  if (signInError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Compte activé, mais connexion automatique échouée. Connectez-vous via /login.",
        redirectTo: "/login",
      },
      { status: 200 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: "/dashboard",
  });
  response.cookies.set(FIRST_ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
