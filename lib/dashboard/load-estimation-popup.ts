import "server-only";

import {
  buildEstimationPopupContent,
  type EstimationPopupContent,
} from "@/lib/dashboard/estimation-popup";
import {
  DashboardDataError,
  getStudentDashboardData,
} from "@/lib/dashboard/get-student-dashboard";

export async function loadOwnEstimationPopup(): Promise<{
  content: EstimationPopupContent | null;
  error: "UNAUTHENTICATED" | "NO_STUDENT" | "UNAVAILABLE" | null;
}> {
  try {
    const data = await getStudentDashboardData();
    return {
      content: buildEstimationPopupContent(data.prediction),
      error: null,
    };
  } catch (err) {
    if (err instanceof DashboardDataError) {
      if (err.code === "UNAUTHORIZED") {
        return { content: null, error: "UNAUTHENTICATED" };
      }
      if (err.code === "NO_STUDENT") {
        return { content: null, error: "NO_STUDENT" };
      }
      // NO_METRICS → pas encore d’estimation : popup pédagogique générique
      if (err.code === "NO_METRICS") {
        return {
          content: buildEstimationPopupContent({
            readinessScore: null,
            riskLevel: null,
            issues: ["INCOMPLETE_METRICS"],
            recommendedAction: null,
          }),
          error: null,
        };
      }
    }
    return { content: null, error: "UNAVAILABLE" };
  }
}
