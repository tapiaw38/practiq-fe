import { marked } from 'marked';
import katex from 'katex';

export type ChatPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface ChatTheme {
    primaryColor?: string;

    textColor?: string;

    backgroundColor?: string;

    userMessageBgColor?: string;

    userMessageTextColor?: string;

    assistantMessageBgColor?: string;

    assistantMessageTextColor?: string;

    inputBorderColor?: string;

    inputBgColor?: string;

    inputTextColor?: string;
}

export interface ChatOptions {
    title?: string;

    placeholder?: string;

    position?: ChatPosition;

    width?: number;

    height?: number;

    onSend?: (
        message: any,
    ) =>
        | Promise<string | { content: string; isHtml: boolean }>
        | string
        | { content: string; isHtml: boolean };

    initialMessage?: string;

    theme?: ChatTheme;

    isOpen?: boolean;

    showImagesOption?: boolean;

    audioAnswers?: boolean;

    audioInput?: boolean;

    quickActions?: Array<{ label: string; prompt: string; icon?: string }>;
    preferencesStorageKey?: string;
}

export class Chat {
    private container!: HTMLDivElement;
    private chatWindow!: HTMLDivElement;
    private messageList!: HTMLDivElement;
    private inputArea!: HTMLDivElement;
    private contextLabel?: HTMLSpanElement;
    private isOpen: boolean = false;
    private options: Required<Omit<ChatOptions, 'audioAnswers' | 'audioInput'>> & {
        showImagesOption?: boolean;
        audioAnswers?: boolean;
        audioInput?: boolean;
    };
    private onNewConversationCallback?: () => void;
    private newConvButton?: HTMLButtonElement;
    private mediaRecorder?: MediaRecorder;
    private audioChunks: Blob[] = [];
    private isRecording: boolean = false;
    private recordingTimer?: number;
    private mobileExpanded = false;

    private preferences = { audio: true, autoplay: true, speed: 1 };

    private getSendIconMarkup(): string {
        return `
      <svg class="ia-chat-btn-icon ia-chat-send-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.5L20 4l-4.8 16-3.6-5.1L4 11.5z"/>
      </svg>
    `;
    }

    private getRecordIconMarkup(recording: boolean = false): string {
        if (recording) {
            return `
        <svg class="ia-chat-btn-icon ia-chat-record-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="6.5" fill="currentColor"/>
        </svg>
      `;
        }

        return `
      <svg class="ia-chat-btn-icon ia-chat-record-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 14c1.66 0 3-1.34 3-3V6a3 3 0 10-6 0v5c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z"/>
      </svg>
    `;
    }

    constructor(options: ChatOptions = {}) {
        this.options = {
            title: options.title || 'IA Assistant',
            placeholder: options.placeholder || 'Write your message here...',
            position: options.position || 'bottom-right',
            width: options.width || 300,
            height: options.height || 400,
            onSend: options.onSend || (async (message) => `Received: ${message}`),
            initialMessage: options.initialMessage || 'Hello, how can I help you?',
            theme: {
                primaryColor: options.theme?.primaryColor || '#4a90e2',
                textColor: options.theme?.textColor || '#333333',
                backgroundColor: options.theme?.backgroundColor || '#ffffff',
                userMessageBgColor:
                    options.theme?.userMessageBgColor || options.theme?.primaryColor || '#4a90e2',
                userMessageTextColor: options.theme?.userMessageTextColor || '#ffffff',
                assistantMessageBgColor: options.theme?.assistantMessageBgColor || '#f1f1f1',
                assistantMessageTextColor:
                    options.theme?.assistantMessageTextColor ||
                    options.theme?.textColor ||
                    '#333333',
                inputBorderColor: options.theme?.inputBorderColor || '#e0e0e0',
                inputBgColor: options.theme?.inputBgColor || '#ffffff',
                inputTextColor:
                    options.theme?.inputTextColor || options.theme?.textColor || '#333333',
            },
            isOpen: options.isOpen || false,
            showImagesOption: !!options.showImagesOption,
            ...(typeof options.audioAnswers !== 'undefined'
                ? { audioAnswers: !!options.audioAnswers }
                : {}),
            ...(typeof options.audioInput !== 'undefined'
                ? { audioInput: !!options.audioInput }
                : {}),
            quickActions: options.quickActions || [],
            preferencesStorageKey: options.preferencesStorageKey || 'practiq-assistant:preferences',
        };
        try {
            const saved = JSON.parse(
                localStorage.getItem(this.options.preferencesStorageKey) || 'null',
            );
            this.preferences = {
                audio: saved?.audio ?? this.options.audioAnswers ?? true,
                autoplay: saved?.autoplay ?? true,
                speed: Number(saved?.speed) || 1,
            };
            this.options.audioAnswers = this.preferences.audio;
        } catch {
            this.preferences.audio = this.options.audioAnswers ?? true;
        }

        this.createChatElements();
        this.addEventListeners();
        this.loadStyles();
        this.injectKatexCss();
        this.addInitialMessage();

        if (this.options.isOpen) {
            this.open();
        }
    }

    private createChatElements(): void {
        this.container = document.createElement('div');
        this.container.className = 'ia-chat-container';
        this.container.style.display = 'none';

        this.chatWindow = document.createElement('div');
        this.chatWindow.className = `ia-chat-window ${this.options.position}`;

        const sheetHandle = document.createElement('button');
        sheetHandle.type = 'button';
        sheetHandle.className = 'ia-chat-sheet-handle';
        sheetHandle.setAttribute('aria-label', 'Expandir asistente');
        sheetHandle.innerHTML = '<span aria-hidden="true"></span>';
        let touchStartY = 0;
        let handledSwipe = false;
        sheetHandle.addEventListener('click', () => {
            if (handledSwipe) {
                handledSwipe = false;
                return;
            }
            this.toggleMobileExpanded();
        });
        sheetHandle.addEventListener(
            'touchstart',
            (event) => {
                touchStartY = event.touches[0]?.clientY || 0;
                handledSwipe = false;
            },
            { passive: true },
        );
        sheetHandle.addEventListener(
            'touchend',
            (event) => {
                const delta = (event.changedTouches[0]?.clientY || touchStartY) - touchStartY;
                if (Math.abs(delta) > 28) {
                    handledSwipe = true;
                    this.setMobileExpanded(delta < 0);
                }
            },
            { passive: true },
        );

        const header = document.createElement('div');
        header.className = 'ia-chat-header';

        const title = document.createElement('div');
        title.className = 'ia-chat-title';
        title.textContent = this.options.title;
        const contextLabel = document.createElement('span');
        contextLabel.className = 'ia-chat-context-label';
        contextLabel.style.cssText =
            'display:none;flex:0 0 auto;margin-left:6px;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.2);font-size:11px;font-weight:700;white-space:nowrap';
        this.contextLabel = contextLabel;

        const headerActions = document.createElement('div');
        headerActions.className = 'ia-chat-header-actions';

        const newConvButton = document.createElement('button');
        newConvButton.className = 'ia-chat-new-conv';
        newConvButton.innerHTML = `
      <svg class="ia-chat-btn-icon ia-chat-new-conv-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      <span class="ia-chat-new-conv-text">Nueva</span>
    `;
        newConvButton.title = 'Nueva conversación';
        newConvButton.setAttribute('aria-label', 'Nueva conversación');
        newConvButton.setAttribute('type', 'button');

        this.newConvButton = newConvButton;
        if (this.onNewConversationCallback) {
            newConvButton.onclick = this.onNewConversationCallback;
        }

        const closeButton = document.createElement('button');
        closeButton.className = 'ia-chat-close';
        closeButton.innerHTML = `
      <svg class="ia-chat-btn-icon ia-chat-close-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18"/>
      </svg>
    `;
        closeButton.setAttribute('aria-label', 'Close chat');
        closeButton.setAttribute('type', 'button');

        header.append(title, contextLabel);
        headerActions.appendChild(newConvButton);
        const settings = document.createElement('button');
        settings.type = 'button';
        settings.innerHTML = '<i class="pi pi-cog" aria-hidden="true"></i>';
        settings.title = 'Preferencias';
        settings.setAttribute('aria-label', 'Preferencias');
        settings.className = 'ia-chat-settings';
        settings.style.cssText =
            'border:0;background:transparent;color:inherit;cursor:pointer;font-size:16px;display:grid;place-items:center';
        settings.onclick = () => this.togglePreferences();
        headerActions.appendChild(settings);
        const expandButton = document.createElement('button');
        expandButton.type = 'button';
        expandButton.className = 'ia-chat-expand';
        expandButton.innerHTML = '<i class="pi pi-window-maximize" aria-hidden="true"></i>';
        expandButton.title = 'Expandir asistente';
        expandButton.setAttribute('aria-label', 'Expandir asistente');
        expandButton.onclick = () => this.toggleMobileExpanded();
        headerActions.appendChild(expandButton);
        headerActions.appendChild(closeButton);
        header.appendChild(headerActions);

        this.messageList = document.createElement('div');
        this.messageList.className = 'ia-chat-messages';

        this.inputArea = document.createElement('div');
        this.inputArea.className = 'ia-chat-input-area';

        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'ia-chat-checkbox-container';
        checkboxContainer.style.display = this.options.showImagesOption === false ? 'none' : 'flex';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'ia-show-images';
        checkbox.className = 'ia-chat-checkbox';
        checkbox.title = 'Al activar esta opción tu respuesta puede demorar más de lo esperado';

        const label = document.createElement('label');
        label.htmlFor = 'ia-show-images';
        label.className = 'ia-chat-checkbox-label';
        label.textContent = 'Mostrar imágenes en la respuesta';
        label.title = 'Al activar esta opción tu respuesta puede demorar más de lo esperado';

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);

        const textareaWrapper = document.createElement('div');
        textareaWrapper.className = 'ia-chat-input-wrapper';

        const textarea = document.createElement('textarea');
        textarea.className = 'ia-chat-input';
        textarea.placeholder = this.options.placeholder;
        textarea.rows = 1;

        textarea.style.height = '42px';
        textarea.style.minHeight = '42px';
        textarea.style.maxHeight = '120px';
        textarea.style.overflowY = 'hidden';
        textarea.style.resize = 'none';
        textarea.setAttribute('aria-label', 'Message');

        console.log('Creating buttons with audioInput:', this.options.audioInput);

        if (this.options.audioInput) {
            console.log('Creating both send and record buttons');

            const sendButton = document.createElement('button');
            sendButton.className = 'ia-chat-send';
            sendButton.innerHTML = this.getSendIconMarkup();
            sendButton.setAttribute('aria-label', 'Send message');
            sendButton.setAttribute('type', 'button');

            const recordButton = document.createElement('button');
            recordButton.className = 'ia-chat-record';
            recordButton.innerHTML = this.getRecordIconMarkup();
            recordButton.setAttribute('aria-label', 'Record audio message');
            recordButton.setAttribute('type', 'button');
            recordButton.title = 'Mantén presionado para grabar audio';

            sendButton.style.display = 'none';

            textareaWrapper.appendChild(textarea);
            this.inputArea.appendChild(textareaWrapper);
            this.inputArea.appendChild(sendButton);
            this.inputArea.appendChild(recordButton);
        } else {
            console.log('Creating only send button');

            const sendButton = document.createElement('button');
            sendButton.className = 'ia-chat-send';
            sendButton.innerHTML = this.getSendIconMarkup();
            sendButton.setAttribute('aria-label', 'Send message');
            sendButton.setAttribute('type', 'button');

            textareaWrapper.appendChild(textarea);
            this.inputArea.appendChild(textareaWrapper);
            this.inputArea.appendChild(sendButton);
        }

        this.chatWindow.appendChild(sheetHandle);
        this.chatWindow.appendChild(header);
        this.chatWindow.appendChild(this.messageList);
        if (this.options.quickActions.length) {
            const actions = document.createElement('div');
            actions.className = 'ia-chat-quick-actions';
            actions.style.cssText =
                'display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;border-top:1px solid rgba(0,0,0,.06)';
            for (const action of this.options.quickActions) {
                const button = document.createElement('button');
                button.type = 'button';
                if (action.icon) {
                    button.innerHTML = `<i class="pi ${action.icon}" aria-hidden="true"></i>`;
                }
                button.append(action.label);
                button.style.cssText =
                    'display:inline-flex;align-items:center;gap:6px;border:0;border-radius:999px;padding:6px 10px;cursor:pointer;background:rgba(99,102,241,.12);color:#4338ca;font-size:12px;font-weight:600';
                button.addEventListener('click', () => this.sendPrompt(action.prompt));
                actions.appendChild(button);
            }
            this.chatWindow.appendChild(actions);
        }
        this.chatWindow.appendChild(checkboxContainer);
        this.chatWindow.appendChild(this.inputArea);
        this.container.appendChild(this.chatWindow);
    }

    private addEventListeners(): void {
        const closeButton = this.chatWindow.querySelector('.ia-chat-close') as HTMLButtonElement;
        closeButton.addEventListener('click', () => {
            this.toggle();

            closeButton.blur();
        });

        if (this.options.audioInput) {
            const sendButton = this.chatWindow.querySelector('.ia-chat-send') as HTMLButtonElement;
            const recordButton = this.chatWindow.querySelector(
                '.ia-chat-record',
            ) as HTMLButtonElement;

            sendButton.addEventListener('click', () => {
                this.sendMessage();
                sendButton.blur();
            });

            this.setupAudioRecording(recordButton);
        } else {
            const sendButton = this.chatWindow.querySelector('.ia-chat-send') as HTMLButtonElement;
            sendButton.addEventListener('click', () => {
                this.sendMessage();
                sendButton.blur();
            });
        }

        const textarea = this.chatWindow.querySelector('.ia-chat-input') as HTMLTextAreaElement;

        textarea.style.height = '42px';

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            } else {
                setTimeout(() => this.autoResizeTextarea(textarea), 0);
            }
        });

        textarea.addEventListener('input', () => {
            this.autoResizeTextarea(textarea);
            if (this.options.audioInput) {
                const sendBtn = this.chatWindow.querySelector(
                    '.ia-chat-send',
                ) as HTMLButtonElement | null;
                const recBtn = this.chatWindow.querySelector(
                    '.ia-chat-record',
                ) as HTMLButtonElement | null;
                const hasText = textarea.value.trim().length > 0;
                if (sendBtn) sendBtn.style.display = hasText ? '' : 'none';
                if (recBtn) recBtn.style.display = hasText ? 'none' : '';
            }
        });

        textarea.addEventListener('focus', () => {
            this.autoResizeTextarea(textarea);
        });

        document.addEventListener('click', (e) => {
            if (
                this.isOpen &&
                !this.container.contains(e.target as Node) &&
                !(e.target as HTMLElement).closest('.floating-button')
            ) {
                this.toggle();
            }
        });
    }

    private setupAudioRecording(recordButton: HTMLButtonElement): void {
        recordButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startRecordingTimer();
        });

        recordButton.addEventListener('mouseup', () => {
            this.stopRecording();
        });

        recordButton.addEventListener('mouseleave', () => {
            this.stopRecording();
        });

        recordButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startRecordingTimer();
        });

        recordButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopRecording();
        });

        recordButton.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.stopRecording();
        });
    }

    private startRecordingTimer(): void {
        this.recordingTimer = setTimeout(async () => {
            await this.startAudioRecording();
        }, 200);
    }

    private async startAudioRecording(): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.isRecording = true;

            const recordButton = this.chatWindow.querySelector(
                '.ia-chat-record',
            ) as HTMLButtonElement;
            recordButton.classList.add('recording');
            recordButton.innerHTML = this.getRecordIconMarkup(true);

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.processRecordedAudio();
            };

            this.mediaRecorder.start();
        } catch (error) {
            console.error('Error starting audio recording:', error);
            this.addMessage('Error: No se pudo acceder al micrófono', 'error');
        }
    }

    private stopRecording(): void {
        if (this.recordingTimer) {
            clearTimeout(this.recordingTimer);
            this.recordingTimer = undefined;
        }

        if (this.isRecording && this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
            this.isRecording = false;

            const recordButton = this.chatWindow.querySelector(
                '.ia-chat-record',
            ) as HTMLButtonElement;
            recordButton.classList.remove('recording');
            recordButton.innerHTML = this.getRecordIconMarkup();
        }
    }

    private async processRecordedAudio(): Promise<void> {
        if (this.audioChunks.length === 0) return;

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

        try {
            const wavBlob = await this.convertToWav(audioBlob);

            const textarea = this.chatWindow.querySelector('.ia-chat-input') as HTMLTextAreaElement;
            const textMessage = textarea.value.trim();

            this.sendAudioMessage(textMessage, wavBlob);

            this.resetTextarea(textarea);
        } catch (error) {
            console.error('Error converting audio to WAV:', error);
            this.addMessage('Error al procesar el audio', 'error');
        }
    }

    private async convertToWav(audioBlob: Blob): Promise<Blob> {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        return this.audioBufferToWav(audioBuffer);
    }

    private audioBufferToWav(buffer: AudioBuffer): Blob {
        const length = buffer.length;
        const numberOfChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const bytesPerSample = 2;
        const blockAlign = numberOfChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = length * blockAlign;
        const bufferSize = 44 + dataSize;

        const arrayBuffer = new ArrayBuffer(bufferSize);
        const view = new DataView(arrayBuffer);

        const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, bufferSize - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);

        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
                view.setInt16(offset, intSample, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    private async sendAudioMessage(textContent: string, audioBlob: Blob): Promise<void> {
        const displayMessage = textContent || 'Mensaje de audio';
        this.addMessage(displayMessage, 'user');

        this.showTypingIndicator();

        const formData = new FormData();
        formData.append('content', textContent);
        formData.append('voice_content', audioBlob, 'audio.wav');
        formData.append('context', '');
        formData.append('contextHash', '');

        console.log('Sending FormData with audio:', {
            content: textContent,
            audioSize: audioBlob.size,
            audioType: audioBlob.type,
        });

        try {
            const response = await this.options.onSend(formData);

            this.hideTypingIndicator();

            if (typeof response === 'string') {
                this.addMessage(response, 'assistant');
            } else if (response && typeof response === 'object' && 'content' in response) {
                this.addMessage(response.content, 'assistant', response.isHtml || false);
            } else {
                this.addMessage('Invalid response format', 'error');
            }
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Audio message error details:', {
                error: error,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
                    key,
                    value:
                        value instanceof Blob ? `Blob(${value.size} bytes, ${value.type})` : value,
                })),
            });
            this.addMessage(
                `Error al procesar mensaje de audio: ${error instanceof Error ? error.message : String(error)}`,
                'error',
            );
        }

        this.scrollToBottom();
    }

    private autoResizeTextarea(textarea: HTMLTextAreaElement): void {
        const scrollPos = this.messageList.scrollTop;

        textarea.style.height = '42px';

        const newHeight = Math.min(textarea.scrollHeight, 120);

        textarea.style.height = `${newHeight}px`;

        if (newHeight > 42) {
            textarea.classList.add('multiline');
            textarea.style.overflowY = newHeight >= 120 ? 'auto' : 'hidden';
        } else {
            textarea.classList.remove('multiline');
            textarea.style.overflowY = 'hidden';
        }

        this.messageList.scrollTop = scrollPos;
    }

    private resetTextarea(textarea: HTMLTextAreaElement): void {
        textarea.value = '';
        textarea.classList.remove('multiline');
        textarea.style.height = '42px';
        textarea.style.minHeight = '42px';
        textarea.style.overflowY = 'hidden';

        if (this.options.audioInput) {
            const sendBtn = this.chatWindow.querySelector(
                '.ia-chat-send',
            ) as HTMLButtonElement | null;
            const recBtn = this.chatWindow.querySelector(
                '.ia-chat-record',
            ) as HTMLButtonElement | null;
            if (sendBtn) sendBtn.style.display = 'none';
            if (recBtn) recBtn.style.display = '';
        }
    }

    private async sendMessage(): Promise<void> {
        const textarea = this.chatWindow.querySelector('.ia-chat-input') as HTMLTextAreaElement;
        const message = textarea.value.trim();

        if (message) {
            this.addMessage(message, 'user');

            this.resetTextarea(textarea);

            this.showTypingIndicator();

            try {
                const formData = new FormData();
                formData.append('content', message);
                formData.append('context', '');

                const response = await this.options.onSend(formData);

                this.hideTypingIndicator();

                if (typeof response === 'string') {
                    this.addMessage(response, 'assistant');
                } else if (response && typeof response === 'object' && 'content' in response) {
                    this.addMessage(response.content, 'assistant', response.isHtml || false);
                } else {
                    this.addMessage('Invalid response format', 'error');
                }
            } catch (error) {
                this.hideTypingIndicator();
                this.addMessage('Sorry, an error occurred while processing your message.', 'error');
                console.error('Chat error:', error);
            }

            this.scrollToBottom();
        }
    }

    private injectKatexCss(): void {
        const ID = 'ia-katex-css';
        if (document.getElementById(ID)) return;

        const link = document.createElement('link');
        link.id = ID;
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
        document.head.appendChild(link);
    }

    private stripSystemLabels(text: string): string {
        return text
            .replace(
                /^(RESPONSE_CONTEXT|KEY_FINDINGS|TEXT_FOUND|EXTRACTED_TEXT|IMAGE_ANALYSIS)\s*:\s*/gim,
                '',
            )
            .replace(/^\[Attached image analysis\]\n?/gim, '')
            .trim();
    }

    private renderMarkdownAndMath(text: string): string {
        if (!text?.trim()) return '';
        text = this.stripSystemLabels(text);

        const fenced: string[] = [];
        let s = text.replace(/```[\s\S]*?```/g, (m) => {
            fenced.push(m);
            return `\x00FENCED${fenced.length - 1}\x00`;
        });

        const inlined: string[] = [];
        s = s.replace(/`[^`\n]+`/g, (m) => {
            inlined.push(m);
            return `\x00INLINED${inlined.length - 1}\x00`;
        });

        s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
            try {
                return katex.renderToString(math.trim(), {
                    displayMode: true,
                    throwOnError: false,
                    output: 'html',
                });
            } catch {
                return `<code>$$${math}$$</code>`;
            }
        });

        s = s.replace(/(?<!\$)\$(?!\$)([^\n$]+?)(?<!\$)\$(?!\$)/g, (_, math) => {
            try {
                return katex.renderToString(math.trim(), {
                    displayMode: false,
                    throwOnError: false,
                    output: 'html',
                });
            } catch {
                return `<code>$${math}$</code>`;
            }
        });

        inlined.forEach((v, i) => {
            s = s.replace(`\x00INLINED${i}\x00`, v);
        });
        fenced.forEach((v, i) => {
            s = s.replace(`\x00FENCED${i}\x00`, v);
        });

        marked.setOptions({ breaks: true, gfm: true } as any);
        return marked.parse(s) as string;
    }

    private addMessage(
        text: string,
        sender: 'user' | 'assistant' | 'error',
        isHtml: boolean = false,
    ): void {
        const messageElement = document.createElement('div');
        messageElement.className = `ia-chat-message ${sender}`;

        if (sender === 'assistant') {
            window.dispatchEvent(
                new CustomEvent('practiq:assistant:reply', {
                    detail: { text: plainAssistantText(text) },
                }),
            );
        }

        if (sender === 'assistant') {
            try {
                const payload = JSON.parse(text);
                if (Array.isArray(payload.copilot_blocks)) {
                    messageElement.classList.add('ia-copilot-cards');
                    for (const block of payload.copilot_blocks) {
                        const card = document.createElement('section');
                        card.style.cssText =
                            'margin:6px 0;padding:10px;border-radius:12px;background:#eef2ff;border:1px solid #c7d2fe';
                        const title = document.createElement('strong');
                        const blockLook = (
                            {
                                hint: { icon: 'pi-lightbulb', label: 'Pista' },
                                explanation: { icon: 'pi-book', label: 'Explicación' },
                                similar_example: { icon: 'pi-sparkles', label: 'Ejemplo' },
                                review_answer: { icon: 'pi-check-circle', label: 'Revisión' },
                            } as Record<string, { icon: string; label: string }>
                        )[block.type] || { icon: 'pi-comment', label: 'Ayudante' };
                        title.style.cssText = 'display:inline-flex;align-items:center;gap:6px';
                        title.innerHTML = `<i class="pi ${blockLook.icon}" aria-hidden="true"></i>`;
                        title.append(blockLook.label);
                        const content = document.createElement('p');
                        content.textContent = block.content || '';
                        content.style.margin = '6px 0 0';
                        card.append(title, content);
                        messageElement.appendChild(card);
                    }
                    if (Array.isArray(payload.suggested_actions)) {
                        const actions = document.createElement('div');
                        actions.style.cssText =
                            'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px';
                        for (const action of payload.suggested_actions) {
                            const legacyPrompt =
                                action === 'hint'
                                    ? 'Dame otra pista sin revelar la respuesta.'
                                    : action === 'explanation'
                                      ? 'Explicame paso a paso usando el ejercicio actual.'
                                      : 'Dame un ejemplo similar con números diferentes.';
                            const prompt =
                                typeof action === 'string'
                                    ? legacyPrompt
                                    : action?.type === 'prompt' && typeof action.prompt === 'string'
                                      ? action.prompt
                                      : '';
                            if (!prompt) continue;
                            const button = document.createElement('button');
                            button.type = 'button';
                            button.textContent =
                                typeof action === 'string'
                                    ? action === 'hint'
                                        ? 'Otra pista'
                                        : action === 'explanation'
                                          ? 'Explicame'
                                          : 'Ejemplo'
                                    : action.label || 'Continuar';
                            button.style.cssText =
                                'border:0;border-radius:999px;padding:5px 8px;cursor:pointer;background:#c7d2fe';
                            button.onclick = () => this.sendPrompt(prompt);
                            actions.appendChild(button);
                        }
                        messageElement.appendChild(actions);
                    }
                    this.messageList.appendChild(messageElement);
                    this.scrollToBottom();
                    return;
                }
            } catch {}
        }

        let displayText = text;

        if (this.options.audioAnswers && sender === 'assistant') {
            try {
                const jsonResponse = JSON.parse(text);
                if (jsonResponse.content && jsonResponse.audio_url) {
                    displayText = jsonResponse.content;
                }
            } catch (e) {}
        }

        if (sender === 'assistant') {
            messageElement.classList.add('ia-md');
            messageElement.innerHTML = this.renderMarkdownAndMath(displayText);
        } else {
            const sanitizedText = this.sanitizeText(displayText);
            const formattedText = this.formatText(sanitizedText);
            messageElement.innerHTML = formattedText;
        }

        if (this.options.audioAnswers && sender === 'assistant') {
            const audioUrlMatch = text.match(/"audio_url"\s*:\s*"([^"]+)"/s);
            if (audioUrlMatch) {
                const audioUrl = audioUrlMatch[1];

                const audioContainer = document.createElement('div');
                audioContainer.className = 'ia-audio-container';
                audioContainer.style.marginTop = '8px';

                const controls = document.createElement('div');
                controls.className = 'ia-audio-controls';
                const playButton = document.createElement('button');
                playButton.type = 'button';
                playButton.className = 'ia-audio-toggle';
                playButton.setAttribute('aria-label', 'Reproducir audio');
                playButton.innerHTML = '<i class="pi pi-play" aria-hidden="true"></i>';
                const time = document.createElement('span');
                time.className = 'ia-audio-time';
                time.textContent = '0:00 / 0:00';
                const progress = document.createElement('input');
                progress.className = 'ia-audio-progress';
                progress.type = 'range';
                progress.min = '0';
                progress.max = '100';
                progress.value = '0';
                progress.setAttribute('aria-label', 'Progreso de audio');

                const audioPlayer = document.createElement('audio');
                audioPlayer.className = 'ia-audio-player';
                audioPlayer.src = audioUrl;
                audioPlayer.playbackRate = this.preferences.speed;
                audioPlayer.preload = 'metadata';
                audioPlayer.style.display = 'none';

                const formatTime = (seconds: number) => {
                    const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
                    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
                };
                const sync = () => {
                    const duration = audioPlayer.duration || 0;
                    const current = audioPlayer.currentTime || 0;
                    time.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
                    progress.value = String(duration ? (current / duration) * 100 : 0);
                };
                const setPlaying = (playing: boolean) => {
                    playButton.innerHTML = playing
                        ? '<i class="pi pi-pause" aria-hidden="true"></i>'
                        : '<i class="pi pi-play" aria-hidden="true"></i>';
                    playButton.setAttribute(
                        'aria-label',
                        playing ? 'Pausar audio' : 'Reproducir audio',
                    );
                    audioContainer.classList.toggle('ia-audio-container--playing', playing);
                    window.dispatchEvent(
                        new CustomEvent('practiq:assistant:audio-state', { detail: { playing } }),
                    );
                };
                playButton.onclick = () => {
                    if (audioPlayer.paused) audioPlayer.play().catch(() => undefined);
                    else audioPlayer.pause();
                };
                progress.oninput = () => {
                    if (audioPlayer.duration)
                        audioPlayer.currentTime =
                            (Number(progress.value) / 100) * audioPlayer.duration;
                };
                audioPlayer.addEventListener('loadedmetadata', sync);
                audioPlayer.addEventListener('timeupdate', sync);
                audioPlayer.addEventListener('play', () => setPlaying(true));
                audioPlayer.addEventListener('pause', () => setPlaying(false));
                audioPlayer.addEventListener('ended', () => {
                    setPlaying(false);
                    sync();
                });

                controls.append(playButton, time, progress);
                audioContainer.append(controls, audioPlayer);
                if (this.preferences.autoplay) {
                    audioPlayer.play().catch(() => undefined);
                }
                messageElement.appendChild(audioContainer);
            }
        }

        this.messageList.appendChild(messageElement);
        this.scrollToBottom();
    }

    private sanitizeText(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private sanitizeHtml(html: string): string {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        const allowedTags = ['img', 'br', 'p', 'strong', 'em', 'b', 'i'];
        const allowedAttributes: { [key: string]: string[] } = {
            img: ['src', 'alt', 'style', 'width', 'height'],
            p: ['style'],
            strong: [],
            em: [],
            b: [],
            i: [],
            br: [],
        };

        this.cleanElement(temp, allowedTags, allowedAttributes);

        return temp.innerHTML;
    }

    private cleanElement(
        element: HTMLElement,
        allowedTags: string[],
        allowedAttributes: { [key: string]: string[] },
    ): void {
        const children = Array.from(element.children);

        children.forEach((child) => {
            const tagName = child.tagName.toLowerCase();

            if (!allowedTags.includes(tagName)) {
                element.removeChild(child);
            } else {
                const allowedAttrs = allowedAttributes[tagName] || [];
                const attributes = Array.from(child.attributes);

                attributes.forEach((attr) => {
                    if (!allowedAttrs.includes(attr.name)) {
                        child.removeAttribute(attr.name);
                    }
                });

                this.cleanElement(child as HTMLElement, allowedTags, allowedAttributes);
            }
        });
    }

    private formatText(text: string): string {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let formatted = text.replace(
            urlRegex,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
        );

        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<span class="ia-title">$1</span>');

        formatted = formatted.replace(
            /(^|\n)-\s+(.*?)(?=\n|$)/g,
            (match, p1, p2) => `${p1}<li>${p2}</li>`,
        );

        formatted = formatted.replace(
            /(<li>.*?<\/li>\s*)+/gs,
            (match) => `<ul>${match.replace(/\s*$/, '')}</ul>`,
        );

        return formatted;
    }

    private formatTextWithoutLinks(text: string): string {
        let formatted = text;

        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<span class="ia-title">$1</span>');

        formatted = formatted.replace(
            /(^|\n)-\s+(.*?)(?=\n|$)/g,
            (match, p1, p2) => `${p1}<li>${p2}</li>`,
        );

        formatted = formatted.replace(
            /(<li>.*?<\/li>\s*)+/gs,
            (match) => `<ul>${match.replace(/\s*$/, '')}</ul>`,
        );

        return formatted;
    }

    private showTypingIndicator(): void {
        const typingElement = document.createElement('div');
        typingElement.className = 'ia-chat-message assistant typing';
        typingElement.innerHTML =
            '<span class="ia-typing-dot"></span><span class="ia-typing-dot"></span><span class="ia-typing-dot"></span>';
        typingElement.id = 'ia-typing-indicator';
        this.messageList.appendChild(typingElement);
        this.scrollToBottom();
    }

    private hideTypingIndicator(): void {
        const typingElement = document.getElementById('ia-typing-indicator');
        if (typingElement) {
            typingElement.remove();
        }
    }

    private scrollToBottom(): void {
        this.messageList.scrollTop = this.messageList.scrollHeight;
    }

    private addInitialMessage(): void {
        if (this.options.initialMessage) {
            this.addMessage(this.options.initialMessage, 'assistant');
        }
    }

    private togglePreferences(): void {
        const existing = this.chatWindow.querySelector('.ia-chat-preferences');
        if (existing) {
            existing.remove();
            return;
        }

        const primaryColor = this.options.theme.primaryColor || '#4f46e5';
        const backgroundColor = this.options.theme.backgroundColor || '#ffffff';
        const textColor = this.options.theme.textColor || '#1f2937';

        const panel = document.createElement('div');
        panel.className = 'ia-chat-preferences';
        panel.style.cssText =
            `margin:8px 10px;padding:14px;border:1px solid ${primaryColor}33;border-radius:16px;` +
            `background:${backgroundColor};color:${textColor};font-size:13px;display:grid;gap:12px;` +
            `box-shadow:0 8px 24px ${primaryColor}1f`;

        const header = document.createElement('div');
        header.style.cssText =
            'display:flex;align-items:center;justify-content:space-between;gap:8px';
        const heading = document.createElement('strong');
        heading.style.cssText = `display:inline-flex;align-items:center;gap:7px;font-size:13px;color:${primaryColor}`;
        heading.innerHTML = '<i class="pi pi-volume-up" aria-hidden="true"></i>';
        heading.append('Audio');
        const closePanel = document.createElement('button');
        closePanel.type = 'button';
        closePanel.setAttribute('aria-label', 'Cerrar preferencias');
        closePanel.innerHTML = '<i class="pi pi-times" aria-hidden="true"></i>';
        closePanel.style.cssText =
            'border:0;background:transparent;color:inherit;opacity:.6;cursor:pointer;font-size:12px';
        closePanel.onclick = () => panel.remove();
        header.append(heading, closePanel);

        const audio = document.createElement('input');
        const autoplay = document.createElement('input');
        const speed = document.createElement('select');

        const row = (label: string, hint: string, control: HTMLElement): HTMLLabelElement => {
            const wrapper = document.createElement('label');
            wrapper.style.cssText =
                'display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer';
            const text = document.createElement('span');
            text.style.cssText = 'display:grid;gap:2px';
            const strong = document.createElement('span');
            strong.textContent = label;
            strong.style.fontWeight = '600';
            const small = document.createElement('small');
            small.textContent = hint;
            small.style.cssText = 'opacity:.65;font-size:11px;line-height:1.3';
            text.append(strong, small);
            wrapper.append(text, control);
            return wrapper;
        };

        const toggle = (input: HTMLInputElement, checked: boolean): HTMLSpanElement => {
            input.type = 'checkbox';

            input.checked = checked;
            input.style.cssText = 'position:absolute;opacity:0;pointer-events:none';
            const track = document.createElement('span');
            track.style.cssText =
                'position:relative;flex:0 0 auto;width:40px;height:23px;border-radius:999px;transition:background .18s ease';
            const knob = document.createElement('span');
            knob.style.cssText =
                'position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0003;transition:transform .18s ease';
            track.append(input, knob);
            const paint = () => {
                track.style.background = input.checked ? primaryColor : `${primaryColor}33`;
                knob.style.transform = input.checked ? 'translateX(17px)' : 'none';
            };
            input.addEventListener('change', paint);
            paint();
            return track;
        };

        for (const rate of ['0.75', '1', '1.25', '1.5']) {
            const option = document.createElement('option');
            option.value = rate;
            option.textContent = `${rate}x`;
            speed.appendChild(option);
        }
        speed.style.cssText = `border:1px solid ${primaryColor}44;border-radius:9px;padding:5px 8px;background:transparent;color:inherit`;

        panel.append(
            header,
            row(
                'Responder con voz',
                'Quanty lee su respuesta en voz alta',
                toggle(audio, this.preferences.audio),
            ),
            row(
                'Reproducir al recibir',
                'Sin tener que apretar play',
                toggle(autoplay, this.preferences.autoplay),
            ),
            row('Velocidad', 'De la voz de Quanty', speed),
        );

        speed.value = String(this.preferences.speed);

        const syncAutoplay = () => {
            autoplay.disabled = !audio.checked;
            const parent = autoplay.closest('label') as HTMLLabelElement | null;
            if (parent) {
                parent.style.opacity = audio.checked ? '1' : '.45';
                parent.style.cursor = audio.checked ? 'pointer' : 'not-allowed';
            }
        };

        const save = () => {
            this.preferences = {
                audio: audio.checked,
                autoplay: audio.checked && autoplay.checked,
                speed: Number(speed.value),
            };
            this.options.audioAnswers = this.preferences.audio;
            syncAutoplay();
            try {
                localStorage.setItem(
                    this.options.preferencesStorageKey,
                    JSON.stringify(this.preferences),
                );
            } catch {}
        };

        audio.onchange = save;
        autoplay.onchange = save;
        speed.onchange = save;
        syncAutoplay();

        this.chatWindow.insertBefore(panel, this.messageList);
    }

    public setTypingStatus(_message: string): void {
        const typingElement = this.messageList.querySelector('#ia-typing-indicator');

        if (typingElement && !typingElement.querySelector('.ia-typing-dot')) {
            typingElement.innerHTML =
                '<span class="ia-typing-dot"></span><span class="ia-typing-dot"></span><span class="ia-typing-dot"></span>';
        }
    }

    private toggleMobileExpanded(): void {
        this.setMobileExpanded(!this.mobileExpanded);
    }

    private setMobileExpanded(expanded: boolean): void {
        if (window.innerWidth > 720) return;
        this.mobileExpanded = expanded;
        this.chatWindow.classList.toggle('ia-chat-window--expanded', expanded);
        const button = this.chatWindow.querySelector('.ia-chat-expand') as HTMLButtonElement | null;
        const handle = this.chatWindow.querySelector(
            '.ia-chat-sheet-handle',
        ) as HTMLButtonElement | null;
        if (button) {
            button.innerHTML = expanded
                ? '<i class="pi pi-chevron-down" aria-hidden="true"></i>'
                : '<i class="pi pi-window-maximize" aria-hidden="true"></i>';
            button.title = expanded ? 'Reducir asistente' : 'Expandir asistente';
            button.setAttribute('aria-label', button.title);
        }
        if (handle)
            handle.setAttribute(
                'aria-label',
                expanded ? 'Reducir asistente' : 'Expandir asistente',
            );
        window.dispatchEvent(new CustomEvent('practiq:assistant:chat-resize'));
    }

    public toggle(): void {
        this.isOpen = !this.isOpen;
        this.container.style.display = this.isOpen ? 'block' : 'none';
        window.dispatchEvent(
            new CustomEvent('practiq:assistant:chat-toggle', { detail: { open: this.isOpen } }),
        );

        if (this.isOpen) {
            setTimeout(() => {
                const textarea = this.chatWindow.querySelector(
                    '.ia-chat-input',
                ) as HTMLTextAreaElement;
                textarea.style.height = '42px';
                textarea.focus();
            }, 100);

            this.scrollToBottom();
        }
    }

    public open(): void {
        if (!this.isOpen) {
            this.toggle();
        }
    }

    public close(): void {
        if (this.isOpen) {
            this.toggle();
        }
    }

    public mount(container: HTMLElement | string = document.body): void {
        const targetContainer =
            typeof container === 'string'
                ? (document.querySelector(container) as HTMLElement)
                : container;

        if (targetContainer) {
            targetContainer.appendChild(this.container);
        }
    }

    public unmount(): void {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    public getShowImages(): boolean {
        const checkbox = this.chatWindow.querySelector('#ia-show-images') as HTMLInputElement;
        return checkbox ? checkbox.checked : false;
    }

    public getAudioAnswers(): boolean {
        return !!this.options.audioAnswers;
    }

    public getAudioInput(): boolean {
        return !!this.options.audioInput;
    }

    public setOnNewConversation(callback: () => void): void {
        this.onNewConversationCallback = callback;
        if (this.newConvButton) {
            this.newConvButton.onclick = callback;
        }
    }

    public clearMessages(): void {
        if (this.messageList) {
            this.messageList.innerHTML = '';
        }

        const textarea = this.chatWindow.querySelector('.ia-chat-input') as HTMLTextAreaElement;
        if (textarea) {
            this.resetTextarea(textarea);
        }
    }

    public stopAudio(): void {
        this.messageList.querySelectorAll('audio').forEach((audio) => {
            (audio as HTMLAudioElement).pause();
        });
    }

    public getMobileSheetTop(): number | null {
        if (!this.isOpen || window.innerWidth > 720) return null;
        return this.chatWindow.getBoundingClientRect().top;
    }

    public setContextLabel(label?: string): void {
        if (!this.contextLabel) return;
        this.contextLabel.textContent = label || '';
        this.contextLabel.style.display = label ? 'inline-flex' : 'none';
    }

    public getDesktopChatTopLeft(): { top: number; left: number } | null {
        if (!this.isOpen || window.innerWidth <= 720) return null;
        const rect = this.chatWindow.getBoundingClientRect();
        return { top: rect.top, left: rect.left };
    }

    public setDesktopFocus(enabled: boolean): void {
        this.chatWindow.classList.toggle('ia-chat-window--desktop-focus', enabled);
    }

    public getIsOpen(): boolean {
        return this.isOpen;
    }

    public async sendPrompt(prompt: string, openWindow: boolean = true): Promise<void> {
        if (openWindow) this.open();
        const textarea = this.chatWindow.querySelector('.ia-chat-input') as HTMLTextAreaElement;
        if (!textarea) return;
        textarea.value = prompt;
        await this.sendMessage();
    }

    private loadStyles(): void {
        if (document.getElementById('ia-chat-styles')) {
            return;
        }

        const {
            primaryColor,
            textColor,
            backgroundColor,
            userMessageBgColor,
            userMessageTextColor,
            assistantMessageBgColor,
            assistantMessageTextColor,
            inputBorderColor,
            inputBgColor,
            inputTextColor,
        } = this.options.theme;

        const styleElement = document.createElement('style');
        styleElement.id = 'ia-chat-styles';
        styleElement.textContent = `
      .ia-chat-container {
        position: fixed;
        z-index: 1001;
        pointer-events: none;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
      }

      .ia-chat-window {
        position: absolute;
        width: min(${this.options.width}px, calc(100vw - 32px));
        height: min(${this.options.height}px, calc(100vh - 120px));
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 251, 253, 0.98) 100%);
        background-color: ${backgroundColor};
        border: 1px solid rgba(18, 60, 82, 0.10);
        border-radius: 24px;
        box-shadow: 0 24px 64px rgba(11, 38, 52, 0.22);
        backdrop-filter: blur(14px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        pointer-events: auto;
        transition: transform 0.24s ease, opacity 0.24s ease, box-shadow 0.24s ease;
      }

      .ia-chat-sheet-handle, .ia-chat-expand { display: none; }

      .ia-chat-window.bottom-right {
        bottom: 90px;
        right: 20px;
      }

      .ia-chat-window.bottom-left {
        bottom: 90px;
        left: 20px;
      }

      .ia-chat-window.top-right {
        top: 20px;
        right: 20px;
      }

      .ia-chat-window.top-left {
        top: 20px;
        left: 20px;
      }


      @media (min-width: 721px) {
        :root { --practiq-assistant-rail: clamp(320px, 27vw, 430px); }
        .practiq-assistant-focus-target {
          box-sizing: border-box;
        }

        .practiq-assistant-focus-target--open {
          --practiq-assistant-focus-open: 1;
        }

        .ia-chat-window.ia-chat-window--desktop-focus {
          top: 24px !important;
          right: 20px !important;
          bottom: 24px !important;
          left: auto !important;
          width: calc(var(--practiq-assistant-rail) - 40px) !important;
          height: calc(100dvh - 48px) !important;
          border-radius: 28px;
          color: #26354d;
          background: linear-gradient(150deg, rgba(255,255,255,.93), rgba(247,248,255,.85));
          border-color: rgba(123,77,255,.14);
          box-shadow: 0 20px 54px rgba(52,42,104,.16);
          backdrop-filter: blur(22px) saturate(1.05);
        }
        .ia-chat-window--desktop-focus .ia-chat-header {
          min-height: 76px;
          padding: 16px 12px 14px 104px;
          background: rgba(255,255,255,.28);
          border-bottom-color: rgba(123,77,255,.10);
          color: #4f3891;
        }
        .ia-chat-window--desktop-focus .ia-chat-title,
        .ia-chat-window--desktop-focus .ia-chat-context-label { display: none !important; }
        .ia-chat-window--desktop-focus .ia-chat-header-actions {
          gap: 6px;
          margin-left: auto;
          flex-shrink: 0;
        }
        .ia-chat-window--desktop-focus .ia-chat-new-conv,
        .ia-chat-window--desktop-focus .ia-chat-close {
          background: rgba(123,77,255,.07);
          color: rgba(79,56,145,.56);
          opacity: .72;
        }
        .ia-chat-window--desktop-focus .ia-chat-settings {
          width: 32px;
          height: 32px;
          padding: 0;
          display: inline-grid;
          place-items: center;
          flex: 0 0 32px;
          border-radius: 999px;
          background: rgba(123,77,255,.07) !important;
          color: #5c44aa !important;
          border: 1px solid rgba(123,77,255,.12) !important;
          opacity: .88;
        }
        .ia-chat-window--desktop-focus .ia-chat-close {
          width: 32px;
          min-width: 32px;
          height: 32px;
          flex: 0 0 32px;
          color: #5c44aa;
          border: 1px solid rgba(123,77,255,.12);
        }
        .ia-chat-window--desktop-focus .ia-chat-new-conv:hover,
        .ia-chat-window--desktop-focus .ia-chat-close:hover {
          background: rgba(123,77,255,.13);
        }
        .ia-chat-window--desktop-focus .ia-chat-messages {
          background: radial-gradient(circle at 20% 0%, rgba(127,97,255,.08), transparent 35%), transparent;
        }
        .ia-chat-window--desktop-focus .ia-chat-message.assistant {
          color: #32415c;
          background: rgba(255,255,255,.64);
          border-color: rgba(123,77,255,.10);
          box-shadow: none;
        }
        .ia-chat-window--desktop-focus .ia-chat-message.user { box-shadow: none; }
        .ia-chat-window--desktop-focus .ia-chat-input-area,
        .ia-chat-window--desktop-focus .ia-chat-checkbox-container {
          background: rgba(255,255,255,.44);
          border-color: rgba(123,77,255,.10);
        }
        .ia-chat-window--desktop-focus .ia-chat-input {
          color: #32415c;
          background: rgba(255,255,255,.78);
          border-color: rgba(123,77,255,.16);
          box-shadow: none;
        }
        .ia-chat-window--desktop-focus .ia-chat-input::placeholder { color: rgba(75,89,118,.46); }
        .ia-chat-window--desktop-focus .ia-chat-send,
        .ia-chat-window--desktop-focus .ia-chat-record {
          opacity: .72;
          box-shadow: 0 0 0 1px rgba(123,77,255,.14), 0 8px 14px rgba(81,60,154,.14);
        }
        .ia-chat-window--desktop-focus .ia-chat-checkbox-label { color: rgba(60,74,105,.62); }
      }

      .ia-chat-header {
        background: rgba(255,255,255,.88);
        color: #4f3891;
        padding: 16px 18px 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(123,77,255,.10);
      }

      .ia-chat-header-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
        flex-shrink: 0;
      }

      .ia-chat-title {
        font-weight: 700;
        color: #31405b;
        font-size: 15px;
        letter-spacing: 0.01em;
        display: block;
        margin: 0;
      }

      .ia-chat-new-conv,
      .ia-chat-close {
        appearance: none;
        border: 1px solid rgba(123,77,255,.12);
        background: rgba(123,77,255,.07);
        color: #5c44aa;
        cursor: pointer;
        outline: none;
        transition: background-color 0.18s ease, transform 0.18s ease, opacity 0.18s ease;
      }

      .ia-chat-btn-icon {
        width: 16px;
        height: 16px;
        display: inline-block;
        flex-shrink: 0;
      }

      .ia-chat-btn-icon path,
      .ia-chat-btn-icon circle {
        vector-effect: non-scaling-stroke;
      }

      .ia-chat-new-conv:hover,
      .ia-chat-close:hover {
        background: rgba(123,77,255,.13);
        transform: translateY(-1px);
      }

      .ia-chat-new-conv {
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 11px;
        line-height: 1;
        font-weight: 600;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        letter-spacing: 0.01em;
      }

      .ia-chat-new-conv-icon,
      .ia-chat-close-icon {
        stroke: currentColor;
        stroke-width: 2;
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .ia-chat-close {
        border-radius: 999px;
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        line-height: 1;
        padding: 0;
      }

      .ia-chat-settings {
        width: 32px;
        height: 32px;
        padding: 0;
        display: inline-grid;
        place-items: center;
        flex: 0 0 32px;
        border-radius: 999px !important;
        background: rgba(123,77,255,.07) !important;
        color: #5c44aa !important;
        border: 1px solid rgba(123,77,255,.12) !important;
      }

      .ia-chat-title,
      .ia-chat-context-label { display: none !important; }


      .ia-chat-new-conv:focus,
      .ia-chat-close:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.18);
      }

      .ia-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 18px 16px 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background:
          radial-gradient(circle at top left, rgba(18, 60, 82, 0.04), transparent 34%),
          linear-gradient(180deg, rgba(248, 251, 253, 0.96) 0%, rgba(255, 255, 255, 1) 100%);
      }

      .ia-chat-message {
        padding: 10px 12px;
        border-radius: 16px;
        max-width: 84%;
        word-break: break-word;
        line-height: 1.5;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
        border: 1px solid transparent;
      }

      .ia-chat-message.user {
        background:
          linear-gradient(135deg, ${userMessageBgColor} 0%, ${this.darkenColor(userMessageBgColor || primaryColor || '#4a90e2', 12)} 100%);
        color: ${userMessageTextColor};
        align-self: flex-end;
        border-bottom-right-radius: 6px;
      }

      .ia-chat-message.assistant {
        background-color: ${assistantMessageBgColor};
        color: ${assistantMessageTextColor};
        align-self: flex-start;
        border: 1px solid rgba(18, 60, 82, 0.08);
        border-bottom-left-radius: 6px;
      }

      .ia-chat-message.error {
        background-color: #ffe6e6;
        color: #d32f2f;
        align-self: flex-start;
        border: 1px solid rgba(211, 47, 47, 0.18);
        border-bottom-left-radius: 6px;
      }


      .ia-md { line-height: 1.7; overflow-wrap: break-word; }
      .ia-md p { margin: 0 0 8px; }
      .ia-md p:last-child { margin-bottom: 0; }
      .ia-md strong { font-weight: 700; }
      .ia-md em { font-style: italic; }
      .ia-md h1, .ia-md h2, .ia-md h3 { font-weight: 700; margin: 12px 0 5px; line-height: 1.3; }
      .ia-md h1 { font-size: 1.1em; }
      .ia-md h2 { font-size: 1.05em; }
      .ia-md h3 { font-size: 1em; }
      .ia-md ul, .ia-md ol { padding-left: 18px; margin: 4px 0 8px; }
      .ia-md li { margin-bottom: 3px; }
      .ia-md code {
        background: rgba(0,0,0,0.08);
        border-radius: 4px;
        padding: 1px 5px;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.87em;
      }
      .ia-md pre {
        background: #1e1e2e;
        color: #cdd6f4;
        border-radius: 8px;
        padding: 12px 14px;
        overflow-x: auto;
        margin: 6px 0;
        font-size: 0.84em;
        line-height: 1.5;
      }
      .ia-md pre code { background: none; padding: 0; color: inherit; font-size: inherit; }
      .ia-md blockquote {
        border-left: 3px solid ${primaryColor};
        padding: 4px 10px;
        margin: 6px 0;
        opacity: 0.85;
      }
      .ia-md table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 0.9em; }
      .ia-md th, .ia-md td { border: 1px solid rgba(0,0,0,0.15); padding: 5px 8px; text-align: left; }
      .ia-md th { font-weight: 700; background: rgba(0,0,0,0.05); }
      .ia-md hr { border: none; border-top: 1px solid rgba(0,0,0,0.12); margin: 10px 0; }
      .ia-md a { color: ${primaryColor}; text-decoration: underline; }
      .ia-md .katex-display { margin: 8px 0; overflow-x: auto; }
      .ia-md .katex { font-size: 1.05em; }

      .ia-chat-input-area {
        padding: 12px 14px 14px;
        border-top: 1px solid rgba(18, 60, 82, 0.08);
        display: flex;
        align-items: flex-end;
        gap: 8px;
        background: rgba(255, 255, 255, 0.96);
      }

      .ia-chat-input-wrapper {
        flex: 1;
        position: relative;
        display: flex;
      }

      .ia-chat-input {
        flex: 1;
        border: 1px solid ${inputBorderColor};
        border-radius: 18px;
        padding: 11px 14px;
        font-family: inherit;
        font-size: 14px;
        resize: none;
        box-sizing: border-box;
        outline: none;
        transition: height 0.1s ease-out, border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
        line-height: 1.4;
        min-height: 42px !important;
        max-height: 120px;
        overflow-y: hidden !important;
        background-color: ${inputBgColor};
        color: ${inputTextColor};
        box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
      }

      .ia-chat-input.multiline {
        overflow-y: auto !important;
      }

      .ia-chat-input:focus {
        border-color: ${primaryColor};
        box-shadow: 0 0 0 4px rgba(18, 60, 82, 0.08);
      }

      .ia-chat-send,
      .ia-chat-record {
        appearance: none;
        -webkit-appearance: none;
        background: linear-gradient(135deg, ${primaryColor} 0%, ${this.darkenColor(primaryColor || '#4a90e2', 10)} 100%);
        color: white;
        border: none;
        border-radius: 50%;
        width: 42px;
        height: 42px;
        min-width: 42px;
        min-height: 42px;
        aspect-ratio: 1 / 1;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease, opacity 0.15s ease, scale 0.15s ease;
        outline: none;
        box-shadow: 0 10px 18px rgba(18, 60, 82, 0.20);
        flex-shrink: 0;
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
      }

      .ia-chat-send::before,
      .ia-chat-record::before,
      .ia-audio-play-btn::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0));
        pointer-events: none;
      }

      .ia-chat-send .ia-chat-btn-icon,
      .ia-chat-record .ia-chat-btn-icon {
        width: 18px;
        height: 18px;
        position: relative;
        z-index: 1;
      }

      .ia-chat-send-icon {
        fill: currentColor;
        transform: translateX(1px) rotate(-8deg);
      }

      .ia-chat-record-icon {
        fill: currentColor;
      }

      .ia-chat-send:hover,
      .ia-chat-record:hover {
        background-color: ${this.darkenColor(primaryColor || '#4a90e2', 10)};
        transform: translateY(-1px);
        box-shadow: 0 14px 22px rgba(18, 60, 82, 0.24);
      }

      .ia-chat-send:active,
      .ia-chat-record:active,
      .ia-audio-play-btn:active,
      .ia-chat-new-conv:active,
      .ia-chat-close:active {
        transform: translateY(0) scale(0.98);
      }


      .ia-chat-send:focus,
      .ia-chat-record:focus {
        outline: none;
        box-shadow: 0 0 0 4px rgba(18, 60, 82, 0.12), 0 10px 18px rgba(18, 60, 82, 0.20);
      }

      .ia-chat-record {
        user-select: none;
      }

      .ia-chat-record.recording {
        background: linear-gradient(135deg, #ff5d5d 0%, #dc2626 100%);
        animation: pulse 1s infinite;
        box-shadow: 0 16px 26px rgba(255, 68, 68, 0.32);
      }

      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }



      .typing {
        display: flex;
        align-items: center;
        padding: 10px 14px;
      }

      .ia-typing-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #888;
        margin-right: 4px;
        animation: typing-dot 1.4s infinite ease-in-out both;
      }

      .ia-typing-dot:nth-child(1) {
        animation-delay: 0s;
      }

      .ia-typing-dot:nth-child(2) {
        animation-delay: 0.2s;
      }

      .ia-typing-dot:nth-child(3) {
        animation-delay: 0.4s;
        margin-right: 0;
      }

      @keyframes typing-dot {
        0%, 80%, 100% { transform: scale(0.7); opacity: 0.6; }
        40% { transform: scale(1); opacity: 1; }
      }


      @media (max-width: 720px) {
        .ia-chat-window {
          width: calc(100% - 16px);
          height: min(48dvh, 520px);
          max-height: calc(100dvh - 112px);
          left: 10px !important;
          right: 6px !important;
          bottom: max(10px, env(safe-area-inset-bottom)) !important;
          top: auto !important;
          border-radius: 26px;
          box-shadow: 0 12px 38px rgba(11, 38, 52, 0.28);
        }

        .ia-chat-window.ia-chat-window--expanded {
          height: calc(100dvh - 16px);
          max-height: calc(100dvh - 16px);
          bottom: 8px !important;
        }

        .ia-chat-sheet-handle {
          display: grid;
          place-items: center;
          flex: 0 0 26px;
          width: 100%;
          border: 0;
          padding: 8px 0 4px;
          background: transparent;
          cursor: ns-resize;
          touch-action: none;
        }

        .ia-chat-sheet-handle span {
          width: 42px;
          height: 4px;
          border-radius: 999px;
          background: rgba(18, 60, 82, 0.28);
        }

        .ia-chat-expand {
          display: inline-grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border: 0;
          border-radius: 10px;
          background: rgba(255,255,255,.16);
          color: inherit;
          cursor: pointer;
          font-size: 18px;
        }

        .ia-chat-header {
          padding: 14px;
        }

        .ia-chat-header-actions {
          gap: 8px;
        }

        .ia-chat-new-conv {
          padding: 7px 10px;
          font-size: 10px;
        }

        .ia-chat-new-conv-text {
          display: none;
        }

        .ia-chat-new-conv {
          width: 32px;
          height: 32px;
          padding: 0;
          justify-content: center;
        }

        .ia-chat-messages {
          padding: 14px 12px;
        }

        .ia-chat-input-area {
          padding: 10px 12px 12px;
        }

        .ia-chat-message {
          max-width: 90%;
        }
      }

      ul {
        margin: 8px 0 8px 18px;
        padding-left: 18px;
      }
      ul li {
        margin-bottom: 2px;
        list-style: disc inside;
      }

      .ia-chat-messages::-webkit-scrollbar {
        width: 8px;
        background: transparent;
      }
      .ia-chat-messages::-webkit-scrollbar-thumb {
        background: ${inputBorderColor};
        border-radius: 8px;
      }
      .ia-chat-messages::-webkit-scrollbar-thumb:hover {
        background: ${primaryColor};
      }
      .ia-chat-messages {
        scrollbar-width: thin;
        scrollbar-color: ${inputBorderColor} transparent;
      }

      .ia-chat-input::-webkit-scrollbar {
        width: 8px;
        background: transparent;
        border-radius: 20px;
      }
      .ia-chat-input::-webkit-scrollbar-thumb {
        background: ${inputBorderColor};
        border-radius: 20px;
        min-height: 24px;
        border: 2px solid ${inputBgColor};
      }
      .ia-chat-input::-webkit-scrollbar-thumb:hover {
        background: ${primaryColor};
      }
      .ia-chat-input {
        scrollbar-width: thin;
        scrollbar-color: ${inputBorderColor} ${inputBgColor};
      }

      .ia-chat-checkbox-container {
        padding: 10px 14px 0;
        background-color: rgba(255, 255, 255, 0.96);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ia-chat-checkbox {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: ${primaryColor};
      }

      .ia-chat-checkbox-label {
        font-size: 12px;
        color: ${assistantMessageTextColor};
        cursor: pointer;
        user-select: none;
        margin: 0;
        opacity: 0.82;
      }

      .ia-chat-checkbox-label:hover {
        color: ${primaryColor};
      }

      .ia-chat-message img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        margin: 10px 0;
        display: block;
      }

      .ia-chat-message.assistant img {
        max-width: 300px;
      }

      .ia-chat-message p {
        margin: 6px 0;
        line-height: 1.5;
      }

      .ia-audio-container {
        margin-top: 10px;
        max-width: 260px;
      }
      .ia-audio-controls { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:18px; background:rgba(255,255,255,.68); border:1px solid rgba(18,60,82,.08); }
      .ia-audio-toggle { appearance:none; box-sizing:border-box; flex:0 0 36px; width:36px; min-width:36px; height:36px; border:0; border-radius:50%; background:${primaryColor}; color:white; cursor:pointer; font-size:13px; line-height:1; display:grid; place-items:center; padding:0 0 0 2px; }
      .ia-audio-time { white-space:nowrap; font-size:12px; font-weight:700; color:#475569; font-variant-numeric:tabular-nums; }
      .ia-audio-progress { min-width:0; width:100%; accent-color:${primaryColor}; cursor:pointer; }
    `;

        document.head.appendChild(styleElement);
    }

    private darkenColor(color: string, percent: number): string {
        if (!/^#[0-9A-F]{3,6}$/i.test(color)) {
            const tempElement = document.createElement('div');
            tempElement.style.color = color;
            document.body.appendChild(tempElement);
            const computedColor = getComputedStyle(tempElement).color;
            document.body.removeChild(tempElement);

            if (computedColor.startsWith('rgb')) {
                color = this.rgbToHex(computedColor);
            } else {
                color = '#4a90e2';
            }
        }

        color = color.replace('#', '');

        let r = parseInt(color.substring(0, 2), 16);
        let g = parseInt(color.substring(2, 4), 16);
        let b = parseInt(color.substring(4, 6), 16);

        r = Math.floor((r * (100 - percent)) / 100);
        g = Math.floor((g * (100 - percent)) / 100);
        b = Math.floor((b * (100 - percent)) / 100);

        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    private rgbToHex(rgb: string): string {
        const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!match) return '#000000';

        const r = parseInt(match[1], 10);
        const g = parseInt(match[2], 10);
        const b = parseInt(match[3], 10);

        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
}

function plainAssistantText(text: string): string {
    try {
        const payload = JSON.parse(text);
        if (Array.isArray(payload?.copilot_blocks)) {
            return payload.copilot_blocks
                .map((block: { content?: string }) => (block?.content ?? '').trim())
                .filter(Boolean)
                .join('\n\n');
        }

        if (typeof payload?.content === 'string') return payload.content.trim();
    } catch {}
    return text;
}
