export interface ConfirmModalProps {
  show: boolean;
  message: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}

export interface ConfirmModalEmits {
  (e: "confirm"): void;
  (e: "cancel"): void;
}
