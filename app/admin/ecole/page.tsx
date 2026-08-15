import { SchoolInterventionSummary } from "@/components/admin/SchoolInterventionSummary";
import { AdminLearnersKoCountSync } from "@/components/admin/AdminLearnersHeaderTabs";
import { SchoolOverviewBoard } from "@/components/dashboard/SchoolOverviewBoard";
import {
  getAdminDashboardData,
  getSchoolTrendSeries,
} from "@/lib/admin/students";
import { computeSchoolOverview } from "@/lib/admin/school-overview";

export const dynamic = "force-dynamic";

export default async function AdminSchoolPage() {
  const [adminData, trends] = await Promise.all([
    getAdminDashboardData(),
    getSchoolTrendSeries(),
  ]);
  const overview = computeSchoolOverview(adminData.rows);

  return (
    <div className="space-y-4 sm:space-y-5">
      <AdminLearnersKoCountSync count={adminData.rows.length} />
      <SchoolInterventionSummary cards={adminData.interventionCards} />
      <SchoolOverviewBoard overview={overview} trends={trends} />
    </div>
  );
}
