import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import DOMPurify from 'dompurify';

marked.setOptions({
    breaks: true,
    gfm: true,
});

export function renderContent(text: string): string {
    if (!text?.trim()) return '';

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

    return DOMPurify.sanitize(marked.parse(s) as string);
}

const MATH_WORDS = new Set([
    'sin',
    'cos',
    'tan',
    'cot',
    'sec',
    'csc',
    'log',
    'exp',
    'lim',
    'max',
    'min',
    'abs',
    'mod',
    'det',
    'sqrt',
    'arcsin',
    'arccos',
    'arctan',
]);

const BARE_FRACTION = /(?<![\w/\\{])(\d+|\?)\s*\/\s*(\d+|\?)(?![\w/}])/g;

const stack = (chunk: string, addDelimiters: boolean) =>
    chunk.replace(BARE_FRACTION, (_, top, bottom) =>
        addDelimiters ? `$\\frac{${top}}{${bottom}}$` : `\\frac{${top}}{${bottom}}`,
    );

function stackFractions(text: string, inProse: boolean): string {
    if (!inProse) return stack(text, false);
    return text
        .split(/(\$\$[\s\S]*?\$\$|\$[^$]*\$)/g)
        .map((part) => stack(part, !part.startsWith('$')))
        .join('');
}

function looksLikeProse(text: string): boolean {
    const withoutCommands = text.replace(/\\[a-zA-Z]+/g, ' ');
    const words = (withoutCommands.match(/[\p{L}]{3,}/gu) ?? []).filter(
        (word) => !MATH_WORDS.has(word.toLowerCase()),
    );
    return words.length >= 2;
}

export function renderEquation(latex: string): string {
    if (!latex?.trim()) return '';
    const trimmed = latex.trim();

    if (trimmed.startsWith('$') || trimmed.startsWith('\\[')) {
        return renderContent(trimmed);
    }

    if (looksLikeProse(trimmed)) {
        return renderContent(stackFractions(trimmed, true));
    }

    return renderContent(`$$${stackFractions(trimmed, false)}$$`);
}

export function renderInlineEquation(latex: string): string {
    if (!latex?.trim()) return '';
    let math = latex.trim();
    if (math.startsWith('$$') && math.endsWith('$$')) {
        math = math.slice(2, -2).trim();
    } else if (math.startsWith('$') && math.endsWith('$')) {
        math = math.slice(1, -1).trim();
    } else if (math.startsWith('\\[') && math.endsWith('\\]')) {
        math = math.slice(2, -2).trim();
    }

    try {
        return katex.renderToString(stackFractions(math, false), {
            displayMode: false,
            throwOnError: false,
            output: 'html',
        });
    } catch {
        return `<code>${latex}</code>`;
    }
}
