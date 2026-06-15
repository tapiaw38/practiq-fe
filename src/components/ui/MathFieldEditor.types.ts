export type MathVirtualKeyboardMode = "manual" | "onfocus" | "off";

export interface MathFieldEditorProps {
  modelValue: string;
  virtualKeyboardMode?: MathVirtualKeyboardMode;
  placeholder?: string;
  showLatexToggle?: boolean;
}

export interface MathFieldEditorEmits {
  (e: "update:modelValue", value: string): void;
}
