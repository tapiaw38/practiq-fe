import { marked } from "marked";
import katex from "katex";
import DOMPurify from "dompurify";

marked.setOptions({
  breaks: true,
  gfm: true,
});

// Protect code spans + blocks, render math, then markdown
export function renderContent(text: string): string {
  if (!text?.trim()) return "";

  // 1. Stash fenced code blocks  ```...```
  const fenced: string[] = [];
  let s = text.replace(/```[\s\S]*?```/g, (m) => {
    fenced.push(m);
    return `\x00FENCED${fenced.length - 1}\x00`;
  });

  // 2. Stash inline code `...`
  const inlined: string[] = [];
  s = s.replace(/`[^`\n]+`/g, (m) => {
    inlined.push(m);
    return `\x00INLINED${inlined.length - 1}\x00`;
  });

  // 3. Block math  $$...$$
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
        output: "html",
      });
    } catch {
      return `<code>$$${math}$$</code>`;
    }
  });

  // 4. Inline math  $...$  (not $$)
  s = s.replace(/(?<!\$)\$(?!\$)([^\n$]+?)(?<!\$)\$(?!\$)/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
        output: "html",
      });
    } catch {
      return `<code>$${math}$</code>`;
    }
  });

  // 5. Restore stashes
  inlined.forEach((v, i) => {
    s = s.replace(`\x00INLINED${i}\x00`, v);
  });
  fenced.forEach((v, i) => {
    s = s.replace(`\x00FENCED${i}\x00`, v);
  });

  // 6. Markdown → HTML
  // Notebook statements and assistant feedback can be authored remotely. They
  // reach `v-html`, so markdown output must never retain executable markup.
  return DOMPurify.sanitize(marked.parse(s) as string);
}

/**
 * Renders pure LaTeX for equation exercises.
 * Wraps in $$ delimiters if not already present, then renders.
 */
/**
 * Whether a statement is prose rather than a bare formula.
 *
 * An "equation" exercise is not always a lone expression: teachers write
 * "Simplificá la fracción 6/8. Escribí el resultado", which is a sentence that
 * happens to mention numbers. Forcing that into math mode collapsed every
 * space — it rendered as "Simplificálafracción6/8." — in italic serif, and
 * display math does not wrap, so the tail ran off the screen.
 *
 * LaTeX command names are stripped first: \frac and \sqrt would otherwise
 * read as words. What remains counts as prose when at least two real words
 * are left.
 */
// Function names teachers type without a backslash: "sin(x) + cos(x)" is a
// formula, and counting sin and cos as words would misread it as a sentence.
const MATH_WORDS = new Set([
  "sin", "cos", "tan", "cot", "sec", "csc", "log", "exp", "lim",
  "max", "min", "abs", "mod", "det", "sqrt", "arcsin", "arccos", "arctan",
]);

const BARE_FRACTION = /(?<![\w/\\{])(\d+|\?)\s*\/\s*(\d+|\?)(?![\w/}])/g;

const stack = (chunk: string, addDelimiters: boolean) =>
  chunk.replace(BARE_FRACTION, (_, top, bottom) =>
    addDelimiters
      ? `$\\frac{${top}}{${bottom}}$`
      : `\\frac{${top}}{${bottom}}`,
  );

function stackFractions(text: string, inProse: boolean): string {
  if (!inProse) return stack(text, false);
  return text
    .split(/(\$\$[\s\S]*?\$\$|\$[^$]*\$)/g)
    .map((part) => stack(part, !part.startsWith("$")))
    .join("");
}

function looksLikeProse(text: string): boolean {
  const withoutCommands = text.replace(/\\[a-zA-Z]+/g, " ");
  const words = (withoutCommands.match(/[\p{L}]{3,}/gu) ?? []).filter(
    (word) => !MATH_WORDS.has(word.toLowerCase()),
  );
  return words.length >= 2;
}

export function renderEquation(latex: string): string {
  if (!latex?.trim()) return "";
  const trimmed = latex.trim();
  // If already has delimiters, use as-is
  if (trimmed.startsWith("$") || trimmed.startsWith("\\[")) {
    return renderContent(trimmed);
  }
  // A sentence stays a sentence; renderContent still renders any $...$ inside
  // it as math, so a statement can mix both.
  if (looksLikeProse(trimmed)) {
    return renderContent(stackFractions(trimmed, true));
  }
  // Wrap in display math delimiters
  return renderContent(`$$${stackFractions(trimmed, false)}$$`);
}

export function renderInlineEquation(latex: string): string {
  if (!latex?.trim()) return "";
  let math = latex.trim();
  if (math.startsWith("$$") && math.endsWith("$$")) {
    math = math.slice(2, -2).trim();
  } else if (math.startsWith("$") && math.endsWith("$")) {
    math = math.slice(1, -1).trim();
  } else if (math.startsWith("\\[") && math.endsWith("\\]")) {
    math = math.slice(2, -2).trim();
  }

  try {
    return katex.renderToString(stackFractions(math, false), {
      displayMode: false,
      throwOnError: false,
      output: "html",
    });
  } catch {
    return `<code>${latex}</code>`;
  }
}
