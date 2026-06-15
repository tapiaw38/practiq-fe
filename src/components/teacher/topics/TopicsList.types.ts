import type { Topic } from "@/types";

export interface TopicsListProps {
  topics: Topic[];
  editingTopicId: string | null;
  editTopicTitle: string;
}

export interface TopicsListEmits {
  (e: "create"): void;
  (e: "edit", topic: Topic): void;
  (e: "delete", topicId: string): void;
  (e: "save", topic: Topic): void;
  (e: "cancelEdit"): void;
  (e: "update:editTopicTitle", value: string): void;
}
