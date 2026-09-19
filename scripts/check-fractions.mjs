import assert from "node:assert";
import { readFile } from "node:fs/promises";

const modulePath = new URL("../src/composables/useContentRenderer.ts", import.meta.url);
const source = await readFile(modulePath, "utf8");

const start = source.indexOf("const BARE_FRACTION");
const end = source.indexOf("function looksLikeProse");
if (start === -1 || end === -1 || end < start) {
  console.error(
    "Fraction check could not find stackFractions in useContentRenderer.ts.\n" +
      "Move the check with the code instead of deleting it.",
  );
  process.exit(1);
}

const plainJs = source
  .slice(start, end)
  .replace(/: string/g, "")
  .replace(/: boolean/g, "");
const { stackFractions } = await import(
  "data:text/javascript," + encodeURIComponent(`${plainJs}\nexport { stackFractions };`)
);

const cases = [
  ["Completá la amplificación: 3/4 = ?/8", true, "Completá la amplificación: $\\frac{3}{4}$ = $\\frac{?}{8}$"],
  ["Simplificá la fracción 6/8.", true, "Simplificá la fracción $\\frac{6}{8}$."],
  ["Resolvé 10 / 5 paso a paso", true, "Resolvé $\\frac{10}{5}$ paso a paso"],
  ["Calculá $1/2 + 1/3$ y explicá", true, "Calculá $\\frac{1}{2} + \\frac{1}{3}$ y explicá"],
  ["Entregar el 12/8/2026 sin falta", true, "Entregar el 12/8/2026 sin falta"],
  ["km/h de la moto", true, "km/h de la moto"],
  ["3/4 = ?/8", false, "\\frac{3}{4} = \\frac{?}{8}"],
  ["\\frac{3}{4} + 1", false, "\\frac{3}{4} + 1"],
  ["N/A", false, "N/A"],
];

const failures = [];
for (const [input, inProse, expected] of cases) {
  const actual = stackFractions(input, inProse);
  if (actual !== expected) failures.push({ input, expected, actual });
}

if (failures.length) {
  console.error("Fraction rendering check failed:");
  for (const { input, expected, actual } of failures) {
    console.error(`  in:       ${input}`);
    console.error(`  expected: ${expected}`);
    console.error(`  actual:   ${actual}\n`);
  }
  process.exit(1);
}

const katex = (await import("katex")).default;
const rendered = katex.renderToString(stackFractions("3/4", false), { throwOnError: true });
assert.ok(rendered.includes("frac-line"), "KaTeX rendered no fraction bar");

console.log(`Fraction check passed (${cases.length} statements).`);
