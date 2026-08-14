import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Email de la session courante — pour la page finalize après bootstrap client. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return NextResponse.json({ email: user?.email ?? null });
}
