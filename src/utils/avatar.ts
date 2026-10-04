import type { Avatar as AvatarType, Style as StyleType } from '@dicebear/core';

let loader: Promise<{ Avatar: typeof AvatarType; style: StyleType }> | null = null;

function library() {
    loader ??= (async () => {
        const [{ Avatar, Style }, styleDefinition] = await Promise.all([
            import('@dicebear/core'),
            import('@dicebear/styles/bottts-neutral.json'),
        ]);
        const definition = (styleDefinition as { default?: unknown }).default ?? styleDefinition;
        return {
            Avatar,
            style: new Style(definition as ConstructorParameters<typeof Style>[0]),
        };
    })();
    return loader;
}

const cache = new Map<string, string>();

export async function avatarSvg(seed: string): Promise<string> {
    const hit = cache.get(seed);
    if (hit) return hit;

    const { Avatar, style } = await library();
    const svg = new Avatar(style, { seed }).toString();
    cache.set(seed, svg);
    return svg;
}

const SEED_PATTERN = /^[A-Za-z0-9_-]{0,64}$/;

export const isValidSeed = (seed: string) => SEED_PATTERN.test(seed);

export function randomSeeds(count: number): string[] {
    const seeds: string[] = [];
    while (seeds.length < count) {
        const seed = Math.random().toString(36).slice(2, 10);
        if (isValidSeed(seed) && !seeds.includes(seed)) seeds.push(seed);
    }
    return seeds;
}
