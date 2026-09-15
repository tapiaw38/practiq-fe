const VOICE_KEY = "practiq-assistant-voice-replies";
const VOICE_EVENT = "practiq:assistant:voice-preference-changed";

export function assistantVoiceEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(VOICE_KEY) !== "0";
}

export function setAssistantVoiceEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VOICE_KEY, enabled ? "1" : "0");
  window.dispatchEvent(
    new CustomEvent(VOICE_EVENT, { detail: { enabled } }),
  );
}

export const ASSISTANT_VOICE_EVENT = VOICE_EVENT;
