import type { Notebook } from "@/types";

export interface NotebooksListProps {
  notebooks: Notebook[];
}

export interface NotebooksListEmits {
  (e: "create"): void;
  (e: "open", notebookId: string): void;
  (e: "edit", notebook: Notebook): void;
  (e: "delete", notebookId: string): void;
}
