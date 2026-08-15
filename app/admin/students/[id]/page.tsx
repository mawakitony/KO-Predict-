import { notFound } from "next/navigation";
import { StudentDetailTabs } from "@/components/admin/StudentDetailTabs";
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
    <StudentDetailTabs detail={detail} interventions={interventions} />
  );
}
