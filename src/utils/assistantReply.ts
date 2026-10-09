export interface AssistantReply {
    text: string;

    audioUrl: string;
}

export function parseAssistantReply(raw: string, messageAudioUrl?: unknown): AssistantReply {
    const text = (raw ?? '').trim();
    const directAudioUrl = typeof messageAudioUrl === 'string' ? messageAudioUrl : '';
    if (!text) return { text: '', audioUrl: directAudioUrl };

    try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
            const content = typeof parsed.content === 'string' ? parsed.content : '';
            const audioUrl = typeof parsed.audio_url === 'string' ? parsed.audio_url : '';
            if (content || audioUrl) {
                return { text: content || '', audioUrl: directAudioUrl || audioUrl };
            }
        }
    } catch {}

    const match = text.match(/"audio_url"\s*:\s*"([^"]+)"/);
    if (!match) return { text, audioUrl: directAudioUrl };

    const contentMatch = text.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);

    const content = contentMatch
        ? contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
        : '';

    return { text: content || text, audioUrl: directAudioUrl || match[1] };
}
