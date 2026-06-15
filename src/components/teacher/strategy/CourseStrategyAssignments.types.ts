import type { Course, CourseLearningStrategy, LearningStrategy } from "@/types";

export interface CourseStrategyAssignmentsProps {
  courses: Course[];
  strategies: LearningStrategy[];
  courseAssignments: Record<string, CourseLearningStrategy[]>;
  selectedStrategyForCourse: Record<string, string>;
  assigning: Record<string, boolean>;
}

export interface CourseStrategyAssignmentsEmits {
  (e: "update:selectedStrategyForCourse", value: Record<string, string>): void;
  (e: "assign", courseId: string): void;
  (e: "remove", courseId: string, assignmentId: string): void;
}
