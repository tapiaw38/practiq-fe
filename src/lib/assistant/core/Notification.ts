export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface NotificationOptions {
    type: NotificationType;

    message: string;

    duration?: number;
}

export class Notification {
    private readonly type: NotificationType;
    private readonly colors = {
        error: '#ff5252',
        warning: '#ffb142',
        info: '#4a90e2',
        success: '#4caf50',
    };

    constructor(type: NotificationType = 'info') {
        this.type = type;
    }

    async send(message: string, options: { duration?: number } = {}): Promise<void> {
        const color = this.colors[this.type];
        console.log(
            `%c${this.type.toUpperCase()}: ${message}`,
            `color: ${color}; font-weight: bold`,
        );
    }
}
