import { TeamBoard } from "@/components/admin/TeamBoard";
import { listTeamMembers } from "@/lib/admin/team";
import { requireSuperAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const profile = await requireSuperAdmin();
  const members = await listTeamMembers();

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.25)] sm:p-6">
      <div className="mb-5">
        <h1 className="ko-display text-xl font-semibold text-slate-900">
          Équipe WOLOYEM
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Comptes coach et admin — réservé super_admin
        </p>
      </div>
      <TeamBoard initialMembers={members} currentUserId={profile.id} />
    </section>
  );
}
