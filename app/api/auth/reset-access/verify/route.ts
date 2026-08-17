import { NextResponse } from "next/server";
import { z } from "zod";
import {
  PASSWORD_RESET_CODE_GENERIC_ERROR,
  PASSWORD_RESET_TOKEN_TTL_MINUTES,
} from "@/lib/auth/password-reset-constants";
import { verifyPasswordResetCode } from "@/lib/auth/password-reset-codes";
import {
  PASSWORD_RESET_COOKIE_NAME,
  createPasswordResetToken,
} from "@/lib/auth/password-reset-token";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(32),
});

/**
 * POST /api/auth/reset-access/verify
 * Body: { email, code }
 * Vérifie le code reset ; pose un cookie signé court.
 * Ne marque PAS le code USED et ne change pas le mot de passe.
 */
export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: PASSWORD_RESET_CODE_GENERIC_ERROR },
      { status: 400 },
    );
  }

  const result = await verifyPasswordResetCode({
    email: parsed.data.email,
    code: parsed.data.code,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: PASSWORD_RESET_CODE_GENERIC_ERROR },
      { status: 400 },
    );
  }

  const token = createPasswordResetToken({
    passwordResetCodeId: result.passwordResetCodeId,
    studentId: result.studentId,
    authUserId: result.authUserId,
    email: result.email,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(PASSWORD_RESET_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PASSWORD_RESET_TOKEN_TTL_MINUTES * 60,
  });
  return response;
}
