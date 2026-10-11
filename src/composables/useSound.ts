import correctSound from '@/assets/sounds/correct.mp3';
import incorrectSound from '@/assets/sounds/incorrect.mp3';
import levelupSound from '@/assets/sounds/levelup.mp3';
import clickSound from '@/assets/sounds/click.mp3';
import recordStartSound from '@/assets/sounds/record-start.mp3';
import recordStopSound from '@/assets/sounds/record-stop.mp3';

const sounds = {
    correct: correctSound,
    incorrect: incorrectSound,
    levelup: levelupSound,
    click: clickSound,
    'record-start': recordStartSound,
    'record-stop': recordStopSound,
} as const;

export type SoundName = keyof typeof sounds;

const audioCache: Record<string, HTMLAudioElement> = {};

export function useSound() {
    const play = (name: SoundName, volume = 0.5) => {
        try {
            if (!audioCache[name]) {
                audioCache[name] = new Audio(sounds[name]);
            }
            const audio = audioCache[name];
            audio.volume = volume;
            audio.currentTime = 0;
            audio.play().catch(() => {});
        } catch {}
    };

    return { play };
}
