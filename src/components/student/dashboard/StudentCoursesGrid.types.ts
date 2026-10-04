import type { CourseSummary } from '@/types/dashboard';
import type { TopicProgress } from '@/types';

export interface StudentCoursesGridProps {
    courses: CourseSummary[];
    dismissedReviewCards: Record<string, boolean>;
    topicsNeedingReview: (courseId: string) => TopicProgress[];
    getCourseProgressPercent: (courseId: string) => number;
}

export interface StudentCoursesGridEmits {
    (e: 'openLevels', courseId: string): void;
    (e: 'dismissReview', courseId: string): void;
}
