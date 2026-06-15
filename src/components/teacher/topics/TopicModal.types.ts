export interface TopicForm {
  title: string;
  description: string;
  order_index: number;
}

export interface TopicModalProps {
  visible: boolean;
  topic: TopicForm;
}

export interface TopicModalEmits {
  (e: "submit"): void;
  (e: "close"): void;
  (e: "update:topic", value: TopicForm): void;
}
