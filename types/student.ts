export type UserRole = "student" | "coach" | "admin" | "super_admin";

export type MetricsSource = "manual" | "learnworlds";

export interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: UserRole;
}

export interface Student {
  id: string;
  profileId: string;
  learnworldsUserId: string | null;
  certification: string;
  targetExamDate: string | null; // YYYY-MM-DD
  enrollmentDate: string | null;
  timezone: string | null;
}

export interface LearningMetrics {
  id?: string;
  studentId: string;
  progressPercent: number | null;
  completedActivities: number;
  totalActivities: number;
  studyTimeMinutes: number;
  qcmAverage: number | null;
  recentQcmAverage: number | null;
  lastActivityDate: string | null; // ISO timestamp
  inactiveDays: number;
  studySessions: number | null;
  recordedAt?: string;
  source: MetricsSource;
}
