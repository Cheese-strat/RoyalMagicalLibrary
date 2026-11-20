/**
 * A card's text in parts, the names stage that replaces each quoted name with the codes it could be, and the stop that
 * ends a reading at the first part a stage can't read (Cheesestrat's design).
 */
import type { Library } from "../../lib/library.js";

/** One part of a card's text: its materials, Pendulum Effect, monster effect, flavor text, or a Spell's or Trap's effect. */
export interface Part {
  label: string;
  /** As printed. */
  text: string;
  /** Flavor is printed as it is, never read. */
  flavor?: true;
  /** The text with its names replaced by codes, once the names stage has read it. */
  replaced?: string;
}

/**
 * A text exception: where reading a card's text stopped, thrown so the reading ends there
 * (Cheesestrat, 2026-11-09). It keeps the parts, so a reader can be shown how far it got.
 */
export class TextStop extends Error {
  constructor(
    readonly parts: Part[],
    /** Which of the parts. */
    readonly part: number,
    readonly stage: "names" | "sentences",
    /** Where the stage stopped in its text (the part's replaced text, once it has one, or else its printed text), and how much of it is the cause. */
    readonly at: number,
    readonly length: number,
    readonly reason: string,
    /** What the stage expected there, each on its own, when the reason is a list of them. */
    readonly expected: string[] = [],
  ) {
    super(`${stage}, in the ${parts[part].label}: ${reason}`);
  }
}

/** A text with its names replaced, or the text exception that stopped it: where, how much of the text is the cause, and why. */
type Replaced =
  | { text: string }
  | { at: number; length: number; reason: string };
type Named = ReturnType<Library["named"]>;

/**
 * Card text with each quoted name replaced by the codes it could be ({#89631139}, {a#0xdd},
 * {#24094653|a#0x46}), so sentences can be split without a name's characters in the way. Which of a
 * name's codes is meant is left to the sentence reader, which reads the words around it.
 */
export function replaceNames(
  library: Pick<Library, "named">,
  text: string,
): Replaced {
  let out = "";
  let from = 0;
  while (true) {
    const open = text.indexOf('"', from);
    if (open === -1) return { text: out + text.slice(from) };
    const closes: number[] = [];
    for (
      let i = text.indexOf('"', open + 1);
      i !== -1;
      i = text.indexOf('"', i + 1)
    )
      closes.push(i);
    if (!closes.length)
      return { at: open, length: 1, reason: "a quote with no closing quote" };
    // A name can hold quotes (Maxx "C"): it ends at the nearest quote that makes a name
    const close = closes.find((c) =>
      isName(library.named(text.slice(open + 1, c))),
    );
    if (close === undefined)
      return {
        at: open,
        length: closes[0] - open + 1,
        reason: `no card or archetype is named "${text.slice(open + 1, closes[0])}"`,
      };
    out +=
      text.slice(from, open) +
      token(library.named(text.slice(open + 1, close)));
    from = close + 1;
  }
}

const isName = ({ cards, archetypes }: Named) =>
  cards.length + archetypes.length > 0;
const token = ({ cards, archetypes }: Named) =>
  "{" +
  [
    ...cards.map((c) => `#${c}`),
    ...archetypes.map((a) => `a#0x${a.toString(16)}`),
  ].join("|") +
  "}";
