import { requireStudentArea } from "@/lib/auth/session";

export default async function LearningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStudentArea();
  return children;
}
