import type { Library } from "./library.js";
import { readCard, type CardFlags, type Flags } from "./readCard.js";
import { BOOKKEEPING } from "./read/parts.js";
import { readStatus } from "./survey.js";

/**
 * Where a card's script and its text may differ: the one place the card
 * text is read.
 *
 * The reader's output follows the script whatever the text says, because
 * ocgcore plays the script; a script that doesn't do what its card says is
 * for the script's maintainers to fix. This lists the cards whose text has
 * something the script's labels don't (or the other way round), to be
 * looked at. The text is read with a few rules about Konami's wording, card
 * by card rather than effect by effect (a card's text and its registered
 * effects don't line up one to one: a trigger is often registered twice),
 * so a row is something to check, not a proven difference: the wording
 * rule, the reader, or the script may be what's wrong. The read column says
 * how much of the card the reader read; a card with no valued part unread
 * is the likeliest to be a script that differs.
 */
export interface TextCheck {
  /** One row per difference: code, name, how much was read, the text's wording (current or old), the label, and which side has it. */
  rows: string[];
  /** Per label: cards where only the text has it and only the script does, among cards with every valued part read and among all. */
  summary: { label: string; textOnly: number; scriptOnly: number; textOnlyRead: number; scriptOnlyRead: number }[];
}

/**
 * What each label is, in the text and in the script's reading. A card is
 * listed when its text says it (text) and its script has it nowhere
 * (script), or its script plainly has it (scriptPlainly, default script)
 * and its text says nothing like it (textLoosely, default text).
 */
interface Check {
  label: string;
  text: (clauses: Clause[], card: CardFlags) => boolean;
  textLoosely?: (clauses: Clause[], card: CardFlags) => boolean;
  script: (card: CardFlags) => boolean;
  scriptPlainly?: (card: CardFlags) => boolean;
}

const CHECKS: Check[] = [
  {
    // A part that only gives effects to what was moved is written with "but", "it" or "they" instead
    // ("Special Summon it, but negate its effects", "Destroy it during the End Phase")
    label: "AND_IF_YOU_DO",
    text: (clauses) => clauses.some((c) => /\band if you do\b/i.test(c.effect)),
    textLoosely: (clauses) => clauses.some((c) => /\band if you do\b|, but\b/i.test(c.effect)),
    script: (card) => parts(card).some((p) => p.LINK === "AND_IF_YOU_DO"),
    scriptPlainly: (card) => parts(card).some((p) => p.LINK === "AND_IF_YOU_DO" && !onlyAppliesToMoved(card, p)),
  },
  {
    label: "THEN",
    text: (clauses) => clauses.some((c) => /\bthen\b/i.test(c.effect)),
    script: (card) => parts(card).some((p) => p.LINK === "THEN"),
  },
  {
    // A Fusion, Ritual... Summon sends its materials, then summons: one action in the text ("Fusion Summon")
    label: "ALSO_AFTER_THAT",
    text: (clauses) => clauses.some((c) => /\balso,? after that\b|\bin sequence\b/i.test(c.effect)),
    script: (card) => parts(card).some((p) => p.LINK === "ALSO_AFTER_THAT" && !summonsByProcedure(card, p)),
  },
  {
    // "you can" after a conjunction inside what the effect does ("then, if ..., you can draw"), not the
    // "You can" of an optional activation, which old cards write mid-sentence ("When ..., you can select")
    label: "OPTIONAL",
    text: (clauses) => clauses.some((c) => /\b(then|and if you do|also)\b[^.;]*\byou can\b(?! only)/i.test(c.effect)),
    script: (card) => parts(card).some((p) => p.OPTIONAL),
  },
  {
    // An Equip Spell's activation targets the monster it equips (the rules, not its text); old cards say "select"
    label: "TARGETS",
    text: (clauses, card) =>
      (card.TYPE.includes("SPELL") && card.TYPE.includes("EQUIP")) ||
      clauses.some((c) => /\btargets?\b/i.test(c.activation) || (!c.activation && /\bselect\b/i.test(c.effect))),
    script: (card) => card.EFFECTS.some((e) => (e.PROPERTY ?? []).includes("CARD_TARGET")),
  },
];

/** The steps of a part that do something. */
function movesOf(card: CardFlags, part: Flags): Flags[] {
  const effect = card.EFFECTS.find((e) => typeof e.OPERATION === "object" && e.OPERATION.PARTS?.includes(part));
  return (effect?.OPERATION.ACTIONS ?? []).filter((action: Flags) => action.PART === part.PART && !BOOKKEEPING.has(action.ACTION));
}

/** Whether a part only gives effects (to the cards an earlier part moved, or to a player for later). */
const onlyAppliesToMoved = (card: CardFlags, part: Flags) =>
  movesOf(card, part).every((action) => action.ACTION === "GIVE_EFFECT" || action.ACTION === "PLAYER_EFFECT");

/** Whether a part is a summon's own second step: a Fusion, Ritual, Synchro, Xyz or Link Monster Summoned after its materials. */
function summonsByProcedure(card: CardFlags, part: Flags) {
  return movesOf(card, part).some(
    (action) =>
      action.ACTION === "SPECIAL_SUMMON" &&
      ["FUSION", "RITUAL", "SYNCHRO", "XYZ", "LINK"].some((type) => (action.SUMMON_TYPE ?? []).includes(type)),
  );
}

/** A sentence of card text: what is done on activation (before the ";") and what the effect does (after it). */
interface Clause {
  activation: string;
  effect: string;
}

/**
 * Konami's wording: "condition: cost or target; effect". A sentence (or a
 * "●" item) with a ";" has its activation clause between its last ":"
 * before the ";" and the ";", and its effect after the ";"; one without has
 * only an effect, after its ":" if it has one.
 */
function clausesOf(text: string): Clause[] {
  return (
    text
      .split(/(?<=[.!])\s+|\r?\n|●/)
      .filter((sentence) => sentence.trim())
      // How this card itself is Special Summoned is a summon procedure, not an effect's resolution
      .filter((sentence) => !/\bSpecial Summon(ed)? this card\b[^:;]*\bby\b/i.test(sentence))
      .map((sentence) => {
      const semicolon = sentence.lastIndexOf(";");
      const colon = sentence.lastIndexOf(":", semicolon === -1 ? sentence.length : semicolon);
      return semicolon === -1
        ? { activation: "", effect: sentence.slice(colon + 1) }
        : { activation: sentence.slice(colon + 1, semicolon), effect: sentence.slice(semicolon + 1) };
      })
  );
}

/** Every labelled part of a card's resolutions. */
const parts = (card: CardFlags): Flags[] =>
  card.EFFECTS.flatMap((effect) => (typeof effect.OPERATION === "object" ? (effect.OPERATION.PARTS ?? []) : []));

export function textCheck(library: Library, progress?: (done: number, total: number) => void): TextCheck {
  const codes = library.cardsWithScripts();
  const rows: string[] = [];
  const summary = CHECKS.map(({ label }) => ({ label, textOnly: 0, scriptOnly: 0, textOnlyRead: 0, scriptOnlyRead: 0 }));
  for (const [i, code] of codes.entries()) {
    if (progress && i % 1000 === 0) progress(i, codes.length);
    const card = readCard(library, code);
    const { group } = readStatus(card);
    const text = library.cardText(code);
    const clauses = clausesOf(text);
    // Text from before Konami's current wording has no ":" or ";", and uses "and" and "then" loosely
    const wording = /[:;]/.test(text) ? "current" : "old";
    CHECKS.forEach(({ label, text, textLoosely = text, script, scriptPlainly = script }, k) => {
      const inText = text(clauses, card) && !script(card);
      const inScript = scriptPlainly(card) && !textLoosely(clauses, card);
      if (!inText && !inScript) return;
      const side = inText ? "text" : "script";
      rows.push(`${code}\t${card.NAME}\t${group}\t${wording}\t${label}\tonly in the ${side}`);
      const read = group !== "VALUED";
      if (inText) {
        summary[k].textOnly++;
        if (read) summary[k].textOnlyRead++;
      } else {
        summary[k].scriptOnly++;
        if (read) summary[k].scriptOnlyRead++;
      }
    });
  }
  return { rows, summary };
}
