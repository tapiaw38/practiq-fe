export interface SetPasswordModalProps {
  visible: boolean;
}

export interface SetPasswordModalEmits {
  (e: "update:visible", value: boolean): void;
}
