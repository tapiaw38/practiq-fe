import type { Exercise, Topic } from "@/types";

export interface ExercisesListProps {
  topics: Topic[];
  selectedTopicId: string;
  exercises: Exercise[];
}

export interface ExercisesListEmits {
  (e: "update:selectedTopicId", value: string): void;
  (e: "create"): void;
  (e: "create-ai"): void;
  (e: "edit", exercise: Exercise): void;
  (e: "delete", exerciseId: string): void;
  (e: "export-json"): void;
  (e: "import-json", file: File): void;
}
