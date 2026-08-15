import { notFound } from "next/navigation";
import { StudentDetailTabs } from "@/components/admin/StudentDetailTabs";
import { listStudentInterventions } from "@/lib/admin/interventions/service";
import { getAdminStudentDetail } from "@/lib/admin/students";
import {
  getActiveWorkPlan,
  listPreviousWorkPlans,
} from "@/lib/planning/work-plan/persistence";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminStudentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAdminStudentDetail(id);

  if (!detail) {
    notFound();
  }

  const [interventions, activeWorkPlan, previousPlans] = await Promise.all([
    listStudentInterventions(id),
    getActiveWorkPlan(id).catch(() => null),
    listPreviousWorkPlans(id, 1).catch(() => []),
  ]);

  return (
    <StudentDetailTabs
      detail={detail}
      interventions={interventions}
      activeWorkPlan={activeWorkPlan}
      previousWorkPlan={previousPlans[0] ?? null}
    />
  );
}
