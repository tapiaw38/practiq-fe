export type DrawingTool = "pen" | "eraser";

export interface DrawingCanvasProps {
  modelValue?: string;
  height?: number;
  tool?: DrawingTool;
  penSize?: number;
  penColor?: string;
}

export interface DrawingCanvasEmits {
  (e: "update:modelValue", value: string): void;
}
