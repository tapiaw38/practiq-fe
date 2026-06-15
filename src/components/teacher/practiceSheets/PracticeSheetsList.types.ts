import type { PracticeSheet } from "@/types";

export interface PracticeSheetsListProps {
  sheets: PracticeSheet[];
}

export interface PracticeSheetsListEmits {
  (e: "create"): void;
  (e: "edit", sheet: PracticeSheet): void;
  (e: "delete", sheetId: string): void;
}
