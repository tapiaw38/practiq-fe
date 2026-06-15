import type { Material } from "@/types";

export interface MaterialsListProps {
  materials: Material[];
}

export interface MaterialsListEmits {
  (e: "create"): void;
  (e: "delete", materialId: string): void;
}
