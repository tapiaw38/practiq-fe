import { Notification, type NotificationType, type NotificationOptions } from './core/Notification';
import {
    FloatingButton,
    type FloatingButtonOptions,
    type FloatingButtonPosition,
    type ButtonSize,
} from './components/FloatingButton';
import { Chat, type ChatOptions, type ChatTheme, type ChatPosition } from './components/Chat';
import { createAssistant, type Assistant, type AssistantOptions } from './core/Assistant';

export type {
    NotificationType,
    NotificationOptions,
    FloatingButtonOptions,
    FloatingButtonPosition,
    ButtonSize,
    ChatOptions,
    ChatTheme,
    ChatPosition,
    Assistant,
    AssistantOptions,
};

export { Notification, FloatingButton, Chat, createAssistant };

export default createAssistant;
