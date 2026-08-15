import { requireStudentArea } from "@/lib/auth/session";

export default async function PlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStudentArea();
  return children;
}
