import type { Exercise } from "@/types";

/**
 * Fill-in-the-blanks exercises. The statement is plain text with {{n}} markers,
 * so the same type serves prose, formulas, dates or code — nothing here assumes
 * a subject.
 */

export interface FillBlank {
  id: number;
  answer: string;
}

export interface FillBlanksConfig {
  blanks: FillBlank[];
  /**
   * Wrong options only. The pool the student sees is answers + distractors,
   * built at save time — keeping them apart is what lets two blanks share the
   * same answer without the pool collapsing them into one block.
   */
  distractors: string[];
  /** "code" renders the statement monospaced; anything else reads as prose. */
  layout: "text" | "code";
}

/** The pool the student sees: one block per blank, plus the wrong options. */
export function buildOptions(config: FillBlanksConfig): string[] {
  const answers = config.blanks
    .map((blank) => blank.answer.trim())
    .filter(Boolean);
  const distractors = config.distractors
    .map((option) => option.trim())
    .filter(Boolean);
  return [...answers, ...distractors];
}

export type StatementSegment =
  | { kind: "text"; value: string }
  | { kind: "blank"; id: number };

const BLANK_PATTERN = /\{\{\s*(\d+)\s*\}\}/g;

/** Blank ids in the order they appear in the statement, without repeats. */
export function blankIdsIn(statement: string): number[] {
  const ids: number[] = [];
  for (const match of statement.matchAll(BLANK_PATTERN)) {
    const id = Number(match[1]);
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Blank numbers used more than once. Two blanks sharing a number fill each
 * other when the student places a block, so the editor has to reject them. */
export function repeatedBlankIdsIn(statement: string): number[] {
  const seen = new Set<number>();
  const repeated: number[] = [];
  for (const match of statement.matchAll(BLANK_PATTERN)) {
    const id = Number(match[1]);
    if (seen.has(id)) {
      if (!repeated.includes(id)) repeated.push(id);
    }
    seen.add(id);
  }
  return repeated;
}

/** Splits the statement so the UI can render text and blanks in order. */
export function splitStatement(statement: string): StatementSegment[] {
  const segments: StatementSegment[] = [];
  let lastIndex = 0;

  for (const match of statement.matchAll(BLANK_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ kind: "text", value: statement.slice(lastIndex, start) });
    }
    segments.push({ kind: "blank", id: Number(match[1]) });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < statement.length) {
    segments.push({ kind: "text", value: statement.slice(lastIndex) });
  }
  return segments;
}

export function parseFillBlanksConfig(
  exercise?: Pick<Exercise, "metadata"> | null,
): FillBlanksConfig {
  const empty: FillBlanksConfig = { blanks: [], distractors: [], layout: "text" };
  if (!exercise?.metadata) return empty;

  try {
    const parsed = JSON.parse(exercise.metadata);
    const blanks: FillBlank[] = Array.isArray(parsed?.blanks)
      ? parsed.blanks
          .map((blank: { id?: unknown; answer?: unknown }) => ({
            id: Number(blank?.id),
            answer: String(blank?.answer ?? ""),
          }))
          .filter((blank: FillBlank) => Number.isFinite(blank.id))
      : [];
    const options: string[] = Array.isArray(parsed?.options)
      ? parsed.options.map((option: unknown) => String(option)).filter(Boolean)
      : [];
    // Recover the distractors by removing one pool entry per answer, so a
    // repeated answer does not look like a distractor when editing.
    const remaining = [...options];
    for (const blank of blanks) {
      const index = remaining.indexOf(blank.answer.trim());
      if (index !== -1) remaining.splice(index, 1);
    }

    return {
      blanks,
      distractors: remaining,
      layout: parsed?.layout === "code" ? "code" : "text",
    };
  } catch {
    return empty;
  }
}

/**
 * Answer format shared with the backend: a JSON object keyed by blank number.
 * JSON rather than a delimited string because options legitimately contain
 * characters like "|" (code) or ":" (times), which would break a delimiter.
 */
export function serializeAnswer(placements: Record<number, string>): string {
  const payload: Record<string, string> = {};
  for (const [id, value] of Object.entries(placements)) {
    const answer = String(value ?? "").trim();
    if (answer) payload[String(Number(id))] = answer;
  }
  return Object.keys(payload).length ? JSON.stringify(payload) : "";
}

/** Reads an answer back so a saved draft can be restored into the blanks. */
export function deserializeAnswer(value?: string): Record<number, string> {
  if (!value?.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return {};
    const placements: Record<number, string> = {};
    for (const [id, answer] of Object.entries(parsed)) {
      const blankId = Number(id);
      if (Number.isFinite(blankId) && typeof answer === "string") {
        placements[blankId] = answer;
      }
    }
    return placements;
  } catch {
    return {};
  }
}

/** Safe assistant view of puzzle state. Never exposes configured answers. */
export function buildFillBlanksAssistantContext(
  exercise: Pick<Exercise, "question" | "metadata">,
  serializedAnswer?: string,
) {
  const config = parseFillBlanksConfig(exercise);
  const placements = deserializeAnswer(serializedAnswer);
  const ids = blankIdsIn(exercise.question);
  return {
    interaction: "tap_option_then_blank",
    statement: exercise.question,
    layout: config.layout,
    blanks: ids.map((id) => ({
      id,
      status: placements[id] ? "filled" : "empty",
      value: placements[id] || "",
    })),
    // Options are visible to the student. Answers stay only on the backend.
    available_options: buildOptions(config),
  };
}

/**
 * Drops blanks whose marker is no longer in the statement. Removing a `{{n}}`
 * leaves its entry behind in the config, and nothing else catches it:
 * `validateFillBlanks` only checks that every statement id has an answer, not
 * that every stored blank still exists. The leftovers ended up in the correct
 * answer and in the option pool as a choice that matched no blank.
 */
export function pruneFillBlanks(
  config: FillBlanksConfig,
  statement: string,
): FillBlanksConfig {
  const ids = new Set(blankIdsIn(statement));
  return { ...config, blanks: config.blanks.filter((blank) => ids.has(blank.id)) };
}

export function buildCorrectAnswer(blanks: FillBlank[]): string {
  const placements: Record<number, string> = {};
  for (const blank of blanks) {
    placements[blank.id] = blank.answer;
  }
  return serializeAnswer(placements);
}

/** Why a fill_blanks exercise cannot be saved yet, or empty when it is fine. */
export function validateFillBlanks(
  statement: string,
  config: FillBlanksConfig,
): string {
  const ids = blankIdsIn(statement);
  if (!ids.length) {
    return "Agregá al menos un hueco al enunciado.";
  }
  const repeated = repeatedBlankIdsIn(statement);
  if (repeated.length) {
    return `El número ${repeated.join(", ")} está repetido en el enunciado. Cada hueco necesita un número distinto.`;
  }
  const answered = new Set(
    config.blanks.filter((blank) => blank.answer.trim()).map((blank) => blank.id),
  );
  const missing = ids.filter((id) => !answered.has(id));
  if (missing.length) {
    return `Falta la respuesta del hueco ${missing.join(", ")}.`;
  }
  return "";
}

/** Shuffles a copy so each student sees the options in a different order. */
export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
