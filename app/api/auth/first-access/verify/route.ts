import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ACTIVATION_CODE_EXPIRED_MESSAGE,
  ACTIVATION_CODE_GENERIC_ERROR,
  FIRST_ACCESS_TOKEN_TTL_MINUTES,
} from "@/lib/auth/activation-constants";
import { verifyActivationEmailAndCode } from "@/lib/auth/activation-codes";
import { verifyTeamActivationEmailAndCode } from "@/lib/auth/team-activation-codes";
import {
  FIRST_ACCESS_COOKIE_NAME,
  createFirstAccessToken,
} from "@/lib/auth/first-access-token";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email(),
  activationCode: z.string().min(4).max(32),
});

/**
 * POST /api/auth/first-access/verify
 * Body: { email, activationCode }
 * Essaie d’abord code apprenant, puis code équipe.
 */
export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: ACTIVATION_CODE_GENERIC_ERROR },
      { status: 400 },
    );
  }

  const studentResult = await verifyActivationEmailAndCode({
    email: parsed.data.email,
    activationCode: parsed.data.activationCode,
  });

  if (studentResult.ok) {
    const token = createFirstAccessToken({
      activationCodeId: studentResult.activationCodeId,
      authUserId: studentResult.authUserId,
      email: studentResult.email,
      kind: "student",
    });
    const response = NextResponse.json({ ok: true, kind: "student" });
    response.cookies.set(FIRST_ACCESS_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: FIRST_ACCESS_TOKEN_TTL_MINUTES * 60,
    });
    return response;
  }

  const teamResult = await verifyTeamActivationEmailAndCode({
    email: parsed.data.email,
    activationCode: parsed.data.activationCode,
  });

  if (teamResult.ok) {
    const token = createFirstAccessToken({
      activationCodeId: teamResult.activationCodeId,
      authUserId: teamResult.authUserId,
      email: teamResult.email,
      kind: "team",
    });
    const response = NextResponse.json({ ok: true, kind: "team" });
    response.cookies.set(FIRST_ACCESS_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: FIRST_ACCESS_TOKEN_TTL_MINUTES * 60,
    });
    return response;
  }

  const expired =
    studentResult.reason === "expired" || teamResult.reason === "expired";

  return NextResponse.json(
    {
      ok: false,
      error: expired
        ? ACTIVATION_CODE_EXPIRED_MESSAGE
        : ACTIVATION_CODE_GENERIC_ERROR,
    },
    { status: 400 },
  );
}
