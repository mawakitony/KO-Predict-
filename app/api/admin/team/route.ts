import { NextResponse } from "next/server";
import { listTeamMembers } from "@/lib/admin/team";
import { requirePermissionApi } from "@/lib/admin/require-admin-api";
import { canManageTeam } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requirePermissionApi(
    canManageTeam,
    "Gestion d’équipe réservée au super_admin.",
  );
  if (!gate.ok) return gate.response;

  try {
    const members = await listTeamMembers();
    return NextResponse.json({ ok: true, members });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erreur liste équipe.",
      },
      { status: 500 },
    );
  }
}
