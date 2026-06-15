export interface ChangePasswordModalProps {
  visible: boolean;
}

export interface ChangePasswordModalEmits {
  (e: "update:visible", value: boolean): void;
}
