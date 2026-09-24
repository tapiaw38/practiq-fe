export interface AssistantReply {
  /** Text to render. Never the raw JSON envelope. */
  text: string;
  /** Playable URL when the assistant was asked to speak, empty otherwise. */
  audioUrl: string;
}

/**
 * With `has_text_to_voice=activate` the assistant answers with a JSON envelope
 * `{ content, audio_url }` instead of plain text. Anything that renders a
 * reply has to go through here, or the student sees raw JSON in the bubble.
 *
 * The regex fallback exists because the model sometimes wraps the envelope in
 * prose, which makes `JSON.parse` fail on an otherwise usable reply.
 */
export function parseAssistantReply(
  raw: string,
  messageAudioUrl?: unknown,
): AssistantReply {
  const text = (raw ?? "").trim();
  const directAudioUrl =
    typeof messageAudioUrl === "string" ? messageAudioUrl : "";
  if (!text) return { text: "", audioUrl: directAudioUrl };

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      const content = typeof parsed.content === "string" ? parsed.content : "";
      const audioUrl =
        typeof parsed.audio_url === "string" ? parsed.audio_url : "";
      if (content || audioUrl) {
        return { text: content || "", audioUrl: directAudioUrl || audioUrl };
      }
    }
  } catch {
    /* not an envelope, fall through to the regex */
  }

  const match = text.match(/"audio_url"\s*:\s*"([^"]+)"/);
  if (!match) return { text, audioUrl: directAudioUrl };

  const contentMatch = text.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  // Unescape only what JSON string escaping would have added.
  const content = contentMatch
    ? contentMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
    : "";

  return { text: content || text, audioUrl: directAudioUrl || match[1] };
}
