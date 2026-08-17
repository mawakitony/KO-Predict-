import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { completePasswordResetAccess } from "@/lib/auth/complete-password-reset";
import { PASSWORD_RESET_COOKIE_NAME } from "@/lib/auth/password-reset-token";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  password: z.string().min(1).max(128),
  confirmPassword: z.string().min(1).max(128),
});

/**
 * POST /api/auth/reset-access/complete
 * Body: { password, confirmPassword }
 * Requiert cookie ko_password_reset. Pas d’auto-login.
 *
 * Sessions : pas d’invalidation globale admin par userId dans GoTrueAdminApi
 * actuel (signOut admin exige un JWT). Limitation documentée — pas de workaround.
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

  const jar = await cookies();
  const token = jar.get(PASSWORD_RESET_COOKIE_NAME)?.value;

  const result = await completePasswordResetAccess({
    password: parsed.data.password,
    confirmPassword: parsed.data.confirmPassword,
    token,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status },
    );
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: "/login?reset=1",
  });
  response.cookies.set(PASSWORD_RESET_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
