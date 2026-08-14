import { NextResponse, type NextRequest } from "next/server";

/**
 * Ancien parcours invitation email (token_hash / PKCE) — OBSOLÈTE en V1.
 * Redirige vers /first-access (activation par code).
 */
export async function GET(request: NextRequest) {
  const url = new URL("/first-access", request.url);
  return NextResponse.redirect(url);
}
