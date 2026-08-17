import type { CourseSummary } from "@/services/dashboard/dashboardService";
import type { TopicProgress } from "@/types";

export interface StudentCoursesGridProps {
  /**
   * Already summarised by the API. The grid only ever showed counts, so it
   * used to receive whole sheet and notebook lists to call .length on them.
   */
  courses: CourseSummary[];
  dismissedReviewCards: Record<string, boolean>;
  topicsNeedingReview: (courseId: string) => TopicProgress[];
  getCourseProgressPercent: (courseId: string) => number;
}

export interface StudentCoursesGridEmits {
  (e: "openLevels", courseId: string): void;
  (e: "dismissReview", courseId: string): void;
}
