import { requireStudentArea } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStudentArea();
  return children;
}
