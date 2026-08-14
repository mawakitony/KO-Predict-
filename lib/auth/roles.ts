import type { UserRole } from "@/types/student";

export type { UserRole };

export const USER_ROLES = [
  "student",
  "coach",
  "admin",
  "super_admin",
] as const satisfies readonly UserRole[];

export const STAFF_ROLES = [
  "coach",
  "admin",
  "super_admin",
] as const satisfies readonly UserRole[];

export const TEAM_CREATABLE_ROLES = [
  "coach",
  "admin",
] as const satisfies readonly UserRole[];

export type TeamCreatableRole = (typeof TEAM_CREATABLE_ROLES)[number];

export function parseUserRole(value: unknown): UserRole {
  if (
    value === "student" ||
    value === "coach" ||
    value === "admin" ||
    value === "super_admin"
  ) {
    return value;
  }
  return "student";
}

/** Rôle exact `admin` (pas super_admin). */
export function isAdmin(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function isStudent(role: UserRole | null | undefined): boolean {
  return role === "student";
}

export function isCoach(role: UserRole | null | undefined): boolean {
  return role === "coach";
}

export function isSuperAdmin(role: UserRole | null | undefined): boolean {
  return role === "super_admin";
}

export function isStaff(role: UserRole | null | undefined): boolean {
  return role === "coach" || role === "admin" || role === "super_admin";
}

export function isAdminOrAbove(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function homePathForRole(role: UserRole | null | undefined): string {
  if (isStaff(role)) return "/admin";
  return "/dashboard";
}

export function roleLabelFr(role: UserRole): string {
  switch (role) {
    case "student":
      return "Apprenant";
    case "coach":
      return "Coach";
    case "admin":
      return "Administrateur";
    case "super_admin":
      return "Super administrateur";
    default:
      return role;
  }
}
