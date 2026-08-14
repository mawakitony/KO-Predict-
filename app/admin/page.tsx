import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminDashboardData } from "@/lib/admin/students";
import { staffPermissions } from "@/lib/auth/permissions";
import { getCurrentProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  const data = await getAdminDashboardData();
  const permissions = staffPermissions(profile?.role);

  return (
    <Suspense
      fallback={
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Chargement…
        </div>
      }
    >
      <AdminShell
        rows={data.rows}
        interventions={data.interventions}
        interventionCards={data.interventionCards}
        certifications={data.certifications}
        dataSource={data.dataSource}
        permissions={permissions}
        operatorEmail={profile?.email}
      />
    </Suspense>
  );
}
