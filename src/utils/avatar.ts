import type { Avatar as AvatarType, Style as StyleType } from "@dicebear/core";

/**
 * Avatars are drawn here rather than fetched from api.dicebear.com: the hosted
 * service is licensed for non-commercial use only, rate limits per second
 * across every student at once, and does not promise a seed keeps rendering
 * the same avatar. The library carries none of those.
 *
 * It is ~226 kB, so it is fetched on first use instead of at import: a student
 * who has not picked an avatar never downloads it at all.
 */
let loader: Promise<{ Avatar: typeof AvatarType; style: StyleType }> | null = null;

function library() {
  loader ??= (async () => {
    const [{ Avatar, Style }, styleDefinition] = await Promise.all([
      import("@dicebear/core"),
      import("@dicebear/styles/bottts-neutral.json"),
    ]);
    const definition = (styleDefinition as { default?: unknown }).default ?? styleDefinition;
    return {
      Avatar,
      style: new Style(definition as ConstructorParameters<typeof Style>[0]),
    };
  })();
  return loader;
}

/** Each SVG is ~23 kB of markup, so repeats are worth not rebuilding. */
const cache = new Map<string, string>();

export async function avatarSvg(seed: string): Promise<string> {
  const hit = cache.get(seed);
  if (hit) return hit;

  const { Avatar, style } = await library();
  const svg = new Avatar(style, { seed }).toString();
  cache.set(seed, svg);
  return svg;
}

/** Matches the server's rule, so the UI never offers a seed it would reject. */
const SEED_PATTERN = /^[A-Za-z0-9_-]{0,64}$/;

export const isValidSeed = (seed: string) => SEED_PATTERN.test(seed);

/**
 * A fresh batch to pick from. Seeds are short and opaque on purpose: what is
 * stored says nothing about the student.
 */
export function randomSeeds(count: number): string[] {
  const seeds: string[] = [];
  while (seeds.length < count) {
    const seed = Math.random().toString(36).slice(2, 10);
    if (isValidSeed(seed) && !seeds.includes(seed)) seeds.push(seed);
  }
  return seeds;
}
