export type AssistantMode = "escrita" | "oral" | "pizarron";

export type PizarronState =
  | "idle"
  | "generating"
  | "drawing"
  | "evaluating"
  | "feedback";

export interface AssistantMessage {
  id: number;
  sender: "user" | "assistant";
  content: string;
  html: boolean;
  isAudio?: boolean;
  audioSrc?: string;
}
