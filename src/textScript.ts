import { compareCards, type Difference } from "./compare.js";
import { convert } from "./convert.js";
import type { Library } from "./library.js";
import { readCard, type CardFlags } from "./readCard.js";
import { textEffects, type TextCard } from "./text/effects.js";
import { scriptOf } from "./text/script.js";

/**
 * A card's script written from its text (text/), when every sentence of the
 * text was read: the second reading of a card, beside its own script's.
 */
export interface TextScript {
  card: TextCard;
  /** The script, when the whole text was read. */
  script?: string;
}

export function textScript(library: Library, code: number): TextScript {
  const card = textEffects(library, code);
  if (card.unparsed.length || !card.effects.length) return { card };
  return { card, script: scriptOf(card, library.cardName(code)) };
}

/** The reader's records of the script written from the card's text, read as the card's own. */
export function readTextScript(library: Library, code: number, script: string): CardFlags {
  return library.withScript(code, script, () => readCard(library, code));
}

/**
 * How a card's two readings compare. NO_EFFECTS: its text has none (a
 * Normal Monster's flavor). UNPARSED: some of its text no rule reads yet.
 * SAME or DIFFERS, with TEXT_UNREAD when the reader couldn't read something
 * of the script written from the text that it could of the card's own (the
 * writer's mistake, most likely).
 */
export type Status = "NO_EFFECTS" | "UNPARSED" | "SAME" | "DIFFERS" | "TEXT_UNREAD";

export interface Comparison {
  code: number;
  name: string;
  status: Status;
  /** Whether the card's own script had something unread: then a difference may be the reader's. */
  scriptUnread: boolean;
  /** Konami's current wording (with ":" and ";"), or the old, which says less: an old text may not say "target". */
  wording: "current" | "old";
  text: TextScript;
  differences: Difference[];
}

export function compareCard(library: Library, code: number, readerVersion: string): Comparison {
  const text = textScript(library, code);
  const name = library.cardName(code);
  const wording = /[:;]/.test(library.cardText(code)) ? ("current" as const) : ("old" as const);
  const base = { code, name, text, differences: [], scriptUnread: false, wording };
  if (!text.card.effects.length && !text.card.unparsed.length) return { ...base, status: "NO_EFFECTS" };
  if (!text.script) return { ...base, status: "UNPARSED" };
  const fromText = library.withScript(code, text.script, () => convert(library, readCard(library, code), readerVersion));
  const fromScript = convert(library, readCard(library, code), readerVersion);
  const unread = (card: typeof fromText) => new Set((card.effects ?? []).flatMap((e) => (e.unread ?? []).map((u) => u.text)));
  // What the reader can't read in both scripts is the reader's to learn, not the writer's mistake
  const scriptUnread = unread(fromScript);
  const textUnread = [...unread(fromText)].filter((text) => !scriptUnread.has(text));
  const differences = compareCards(fromText, fromScript);
  const status: Status = textUnread.length ? "TEXT_UNREAD" : differences.length ? "DIFFERS" : "SAME";
  return { ...base, status, scriptUnread: scriptUnread.size > 0, differences };
}

/** A sentence with its names and numbers taken out, so sentences worded alike count together. */
export const pattern = (sentence: string) => sentence.replace(/"[^"]*"/g, '"X"').replace(/\b\d+\b/g, "N");

export interface CompareSurvey {
  counts: Record<Status, number>;
  /** Of the cards compared, those whose own script had nothing unread. */
  readCounts: Record<Status, number>;
  /** One row per difference: code, name, status, script read, wording, effects, path, text's value, script's value. */
  rows: string[];
  /** Where reading stopped, by how it is worded, most common first, with a sentence it stopped in. */
  unparsed: [pattern: string, cards: number, example: string][];
  failures: string[];
}

export function compareAll(library: Library, readerVersion: string, progress?: (done: number, total: number) => void): CompareSurvey {
  const codes = library.cardsWithScripts();
  const zero = (): Record<Status, number> => ({ NO_EFFECTS: 0, UNPARSED: 0, SAME: 0, DIFFERS: 0, TEXT_UNREAD: 0 });
  const survey: CompareSurvey = { counts: zero(), readCounts: zero(), rows: [], unparsed: [], failures: [] };
  const patterns = new Map<string, { cards: number; example: string }>();
  const json = (value: unknown) => (value === undefined ? "" : JSON.stringify(value));
  for (const [i, code] of codes.entries()) {
    if (progress && i % 1000 === 0) progress(i, codes.length);
    let comparison: Comparison;
    try {
      comparison = compareCard(library, code, readerVersion);
    } catch (error) {
      survey.failures.push(`${code}\t${library.cardName(code)}\t${String(error).split("\n")[0]}`);
      continue;
    }
    const { status, name, scriptUnread, differences, text } = comparison;
    survey.counts[status]++;
    if (!scriptUnread) survey.readCounts[status]++;
    for (const d of differences) {
      const effects = `${d.text ?? "-"}/${d.script ?? "-"}`;
      survey.rows.push(
        [code, name, status, scriptUnread ? "script unread" : "script read", comparison.wording, effects, d.path, json(d.textValue), json(d.scriptValue)].join("\t"),
      );
    }
    // Counted by where reading stopped, which is what a rule has to be written for
    for (const at of new Set(text.card.unparsed.map((u) => pattern(u.at)))) {
      const seen = patterns.get(at) ?? { cards: 0, example: text.card.unparsed.find((u) => pattern(u.at) === at)!.sentence };
      seen.cards++;
      patterns.set(at, seen);
    }
  }
  survey.unparsed = [...patterns].sort((a, b) => b[1].cards - a[1].cards).map(([p, { cards, example }]) => [p, cards, example]);
  return survey;
}
