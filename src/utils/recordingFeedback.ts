export function vibrateRecordingStart(): void {
    navigator.vibrate?.(20);
}

export function vibrateRecordingStop(): void {
    navigator.vibrate?.(15);
}
