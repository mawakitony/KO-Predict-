import type { ProfileAccountStatus } from "@/lib/admin/account-access-constants";
import type { UserRole } from "@/types/student";

export interface TeamMemberRow {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  accountStatus: ProfileAccountStatus;
  createdAt: string;
  lastSignInAt: string | null;
}
