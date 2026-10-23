import type { Library } from "./library.js";
import { readCard, type Flags } from "./readCard.js";

/**
 * How much of every card the reader reads. Unread parts are split by where
 * they are: a card's valued parts (cost, target, operation, value, what a
 * continuous effect applies to) are what a static card value needs; its
 * conditions and activation checks (LEGAL) are kept apart.
 */
export interface Survey {
  cards: number;
  /** Cards with nothing unread anywhere. */
  clean: number;
  /** Cards with every valued part read (some may have unread conditions). */
  valuedClean: number;
  /** One row per card read: code, name, CLEAN / CONDITIONS_ONLY / VALUED, and the unread count per part. */
  rows: string[];
  /** Cards the reader failed on: code, name, error. */
  failures: string[];
  /** Unread text in general form (names and numbers replaced), with how many cards have it, most common first. */
  patterns: [pattern: string, cards: number][];
}

const VALUED = ["VALUE", "APPLIES_TO", "COST", "TARGET", "OPERATION"];
const PARTS = ["CONDITION", ...VALUED];

/** Every unread text in a record. */
function unread(value: unknown, found: string[] = []) {
  if (Array.isArray(value)) value.forEach((x) => unread(x, found));
  else if (value && typeof value === "object") {
    for (const [key, x] of Object.entries(value)) {
      if (key === "RAW" || key === "RAW_LINES" || key === "CALL" || (key === "EXPR" && (value as Flags).WHO === "RAW"))
        found.push(...[x].flat().map(String));
      else unread(x, found);
    }
  }
  return found;
}

/** Unread text in a general form, so the same check in different scripts counts as one pattern. The reader's own notes (plain words) stay as they are. */
const generalForm = (text: string) =>
  /^[a-z ,]+$/.test(text)
    ? text
    : text
        .replace(/\bs\.\w+/g, "s.F")
        .replace(/\b\d+\b/g, "N")
        .replace(/\b(?!Duel|aux|Card|Group|Effect)[a-z]\w*\b(?=[:.(,)\s]|$)/g, "x")
        .slice(0, 70);

export function survey(library: Library, progress?: (done: number, total: number) => void): Survey {
  const codes = library.cardsWithScripts();
  const result: Survey = { cards: codes.length, clean: 0, valuedClean: 0, rows: [], failures: [], patterns: [] };
  const patterns = new Map<string, Set<number>>();
  for (const [i, code] of codes.entries()) {
    if (progress && i % 1000 === 0) progress(i, codes.length);
    let card;
    try {
      card = readCard(library, code);
    } catch (error) {
      result.failures.push(`${code}\t${library.cardName(code)}\t${String((error as Error).message).split("\n")[0]}`);
      continue;
    }
    const effects = card.EFFECTS.filter((effect) => !effect.FROM_PROCEDURE);
    const counts = new Map<string, number>();
    const add = (part: string, n: number) => n && counts.set(part, (counts.get(part) ?? 0) + n);
    for (const effect of effects) {
      for (const part of PARTS) {
        const value = effect[part];
        if (!value || typeof value === "string") continue;
        add("LEGAL", unread(value.LEGAL ?? []).length);
        add(part, unread(Array.isArray(value) ? value : { ...value, LEGAL: [] }).length);
      }
    }
    const valued = VALUED.filter((part) => counts.has(part));
    if (!valued.length) result.valuedClean++;
    if (!counts.size) result.clean++;
    const group = valued.length ? "VALUED" : counts.size ? "CONDITIONS_ONLY" : "CLEAN";
    result.rows.push(`${code}\t${card.NAME}\t${group}\t${[...counts].map(([part, n]) => `${part}=${n}`).join(" ")}`);
    for (const text of unread(effects)) {
      const pattern = generalForm(text);
      if (!patterns.has(pattern)) patterns.set(pattern, new Set());
      patterns.get(pattern)!.add(code);
    }
  }
  result.patterns = [...patterns]
    .map(([pattern, cards]) => [pattern, cards.size] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  return result;
}
