import { notFound } from "next/navigation";
import { StudentCoachFollowUp } from "@/components/admin/StudentCoachFollowUp";
import { StudentProfileBoard } from "@/components/admin/StudentProfileBoard";
import { listStudentInterventions } from "@/lib/admin/interventions/service";
import { getAdminStudentDetail } from "@/lib/admin/students";

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

  const interventions = await listStudentInterventions(id);

  return (
    <div className="space-y-4 sm:space-y-5">
      <StudentProfileBoard detail={detail} email={detail.email} />
      <StudentCoachFollowUp interventions={interventions} />
    </div>
  );
}
