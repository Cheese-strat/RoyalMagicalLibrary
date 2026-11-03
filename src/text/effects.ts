import type { Link, MoveName } from "../cardSchema.js";
import type { Library } from "../library.js";
import { cardPhrase, type CardPhrase, type TextFilter, type TextPlaces } from "./cards.js";

/**
 * A card's text as effects, by Konami's wording ("condition: cost or target;
 * effect"), each as what a script would register: its kind, event, range,
 * limit, condition, cost, target and the parts of its resolution. A sentence
 * no rule here reads is kept in unparsed, as written: the card gets a script
 * from its text only when every sentence was read.
 */
export interface TextCard {
  code: number;
  /** The card's own types (TYPE_ names) and archetypes, for whether cards it picks could be itself. */
  types: string[];
  archetypes: number[];
  effects: TextEffect[];
  unparsed: Unparsed[];
  /** Text left for the database or the summon procedures (materials, "always treated as"), not compared yet. */
  skipped: string[];
}

/** A sentence no rule reads, and the words in it where reading stopped. */
export interface Unparsed {
  sentence: string;
  at: string;
}

/** Where reading the current sentence stopped: set by the rule that couldn't go on. */
let failedAt = "";
function fail(at: string): null {
  failedAt = at;
  return null;
}

export type TextKind = "ACTIVATE" | "IGNITION" | "QUICK" | "TRIGGER" | "FLIP";

export interface TextEffect {
  sentence: string;
  kind: TextKind;
  /** "You can": an optional trigger or Quick Effect (_O). */
  optional: boolean;
  /** A trigger on this card's own event (SINGLE), not any card's. */
  single: boolean;
  /** The events it responds to, one registration each (EVENT_ names); FREE_CHAIN for a Quick Effect or an activation with none. */
  events: string[];
  /** Where it works from (LOCATION_ names); none for this card's own triggers and a Spell's or Trap's activation. */
  range?: string[];
  /** An "If" trigger, which doesn't miss timing (EFFECT_FLAG_DELAY). */
  delay: boolean;
  limit?: TextLimit;
  conditions: TextCondition[];
  cost: TextAction[];
  target?: CardPhrase;
  parts: TextPart[];
}

/** SetCountLimit: per COPY (soft, "Once per turn"), or a counter of the card's own number (id+counter). */
export interface TextLimit {
  count: number;
  counter?: number;
  oath?: boolean;
  duel?: boolean;
}

export type TextCondition =
  | { turn: "OWN" | "OPPONENT" }
  | { phase: string[] }
  /** At least this many cards (or none, "you control no monsters") in places, of a kind when card says. */
  | { cards: { places: TextPlaces; atLeast: number; none?: boolean; card?: TextFilter } }
  /** Where this card was, and why it moved (a trigger's "sent from the field to the GY", "destroyed by battle or card effect"). */
  | { thisCard: { wasIn?: string[]; isIn?: string[]; reasons?: string[]; summonType?: string; summonedFrom?: string[] } }
  /** The chain link being responded to: its activation or effect can be negated. */
  | { chainLink: { negatable: "ACTIVATION" | "EFFECT"; byOpponent?: boolean; monster?: boolean } };

export interface TextPart {
  link?: Link;
  optional: boolean;
  conditions: TextCondition[];
  actions: TextAction[];
}

/** The cards a move takes. */
export type Subject =
  | { self: true }
  | { target: true }
  /** "it", "them" when nothing was targeted: the cards the move before took. */
  | { previous: true }
  /** The card of the chain link negated ("negate the activation, and if you do, destroy that card"). */
  | { chainLinkCard: true }
  | { pick: CardPhrase }
  | { all: CardPhrase };

export interface TextAction {
  move: MoveName;
  cards?: Subject;
  /** Where this card is, when the move says ("banish this card from your GY"). */
  where?: string[];
  amount?: number;
  player?: "OWN" | "OPPONENT";
  position?: "FACEUP_DEFENSE";
}

/** The effects of a card's text, read sentence by sentence. */
export function textEffects(library: Library, code: number): TextCard {
  const text = library.cardText(code);
  const [type = 0, ...setcodes] = (
    library.db.exec(
      "SELECT type, setcode & 65535, (setcode >> 16) & 65535, (setcode >> 32) & 65535, (setcode >> 48) & 65535 FROM datas WHERE id = ?",
      [code],
    )[0]?.values[0] ?? []
  ).map(Number);
  const types = library.constants.flags("TYPE_", type);
  const archetypes = setcodes.filter((setcode) => setcode > 0);
  const card: TextCard = { code, types, archetypes, effects: [], unparsed: [], skipped: [] };
  // A Normal Monster's text is flavor
  if (types.includes("NORMAL") && !types.includes("PENDULUM")) return card;

  // A Continuous, Field or Equip card is activated on its own; its text is what it does once on the field
  const staysOnField = !types.includes("MONSTER") && ["CONTINUOUS", "FIELD", "EQUIP"].some((t) => types.includes(t));
  if (types.includes("EQUIP")) {
    card.unparsed.push({ sentence: text, at: "an Equip Card" });
    return card;
  }
  if (staysOnField) card.effects.push({ ...newEffect("", "ACTIVATE"), events: ["FREE_CHAIN"] });

  for (const section of sectionsOf(text, types, card.skipped)) {
    const limits: string[] = [];
    const effects: TextEffect[] = [];
    // The effect of the sentence just before, for "this effect" (null when that sentence wasn't read)
    let last: TextEffect | null = null;
    let missing = false;
    for (const sentence of section.sentences) {
      if (/^You can only (use|activate)\b/.test(sentence)) {
        const applied = applyLimit(library, code, sentence, effects, last);
        if (applied === "LATER") limits.push(sentence);
        else if (applied === "UNKNOWN" || (applied === "NOT_APPLIED" && !missing)) card.unparsed.push({ sentence, at: sentence });
        continue;
      }
      if (/^\(This card is (always|also) treated as\b|^\(This card's name is always treated as\b/.test(sentence)) {
        card.skipped.push(sentence);
        continue;
      }
      // "When this card is activated: ..." is what a Continuous or Field card's own activation does
      const onActivation = sentence.match(/^When this card is activated: (You can )?(.+)$/);
      if (onActivation && staysOnField) {
        failedAt = sentence;
        const activation = effectOf(library, types, "CARD", onActivation[2]);
        if (activation?.kind === "ACTIVATE" && !activation.cost.length && !activation.target) {
          activation.sentence = sentence;
          activation.parts[0].optional = Boolean(onActivation[1]);
          card.effects[0] = activation;
        } else card.unparsed.push({ sentence, at: failedAt });
        continue;
      }
      failedAt = sentence;
      const effect = effectOf(library, types, section.pendulum && !staysOnField ? "PENDULUM" : staysOnField ? "ON_FIELD" : "CARD", sentence);
      if (effect) effects.push(effect);
      else {
        card.unparsed.push({ sentence, at: failedAt });
        missing = true;
      }
      last = effect;
    }
    // A limit on effects not read is left with them; one worded in a way no rule knows is unread itself
    for (const sentence of limits) {
      const applied = applyLimit(library, code, sentence, effects, null, true);
      if (applied === "UNKNOWN" || (applied === "NOT_APPLIED" && !missing)) card.unparsed.push({ sentence, at: sentence });
    }
    card.effects.push(...effects);
  }
  return card;
}

interface Section {
  pendulum: boolean;
  sentences: string[];
}

/**
 * The text's sentences, by section: a Pendulum Monster's Pendulum Effect and
 * its monster effects. An Extra Deck monster's first line, its materials, is
 * skipped: its summon procedure says them.
 */
function sectionsOf(text: string, types: string[], skipped: string[]): Section[] {
  // Older texts say "Graveyard" where newer ones say "GY"
  let body = text.replace(/\r/g, "").replace(/\t/g, "").replace(/\bGraveyard\b/g, "GY");
  const sections: Section[] = [];
  const pendulum = body.match(/\[ Pendulum Effect \]\n([\s\S]*?)\n-+\n\[ (Monster Effect|Flavor Text) \]\n([\s\S]*)$/);
  if (pendulum) {
    sections.push({ pendulum: true, sentences: sentencesOf(pendulum[1]) });
    if (pendulum[2] === "Flavor Text") return sections;
    body = pendulum[3];
  } else body = body.replace(/^Pendulum Scale = \d+\n/, "");
  if (["FUSION", "SYNCHRO", "XYZ", "LINK"].some((t) => types.includes(t))) {
    const [first, ...rest] = body.split("\n");
    if (!first.includes(":")) {
      skipped.push(first);
      body = rest.join("\n");
    }
  }
  sections.push({ pendulum: false, sentences: sentencesOf(body) });
  return sections;
}

/** Text with what is inside quotes masked, so ".", ":" and ";" in card names don't split it. */
export const masked = (text: string) => text.replace(/"[^"]*"/g, (q) => `"${"x".repeat(q.length - 2)}"`);

/** Sentences, with each "●" line kept with the sentence before it. */
function sentencesOf(text: string): string[] {
  const sentences: string[] = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (line.startsWith("●") && sentences.length) {
      sentences[sentences.length - 1] += `\n${line}`;
      continue;
    }
    const hidden = masked(line);
    let start = 0;
    for (const m of hidden.matchAll(/[.!](?:\)|")?\s+(?=[A-Z("●])/g)) {
      const end = m.index! + m[0].trimEnd().length;
      sentences.push(line.slice(start, end));
      start = m.index! + m[0].length;
    }
    if (start < line.length) sentences.push(line.slice(start));
  }
  return sentences;
}

/** Splits text at a separator outside quotes, at its first match. */
function splitAt(text: string, separator: RegExp): [string, string] | null {
  const m = masked(text).match(separator);
  return m ? [text.slice(0, m.index), text.slice(m.index! + m[0].length)] : null;
}

const newEffect = (sentence: string, kind: TextKind): TextEffect => ({
  sentence,
  kind,
  optional: true,
  single: false,
  events: [],
  delay: false,
  conditions: [],
  cost: [],
  parts: [],
});

/**
 * One sentence as an effect, or null when a rule doesn't know some of it. A
 * CARD sentence of a Spell or Trap is its activation; ON_FIELD, what a
 * Continuous or Field card does once it is on the field; PENDULUM, a
 * Pendulum Effect.
 */
function effectOf(library: Library, types: string[], where: "CARD" | "ON_FIELD" | "PENDULUM", sentence: string): TextEffect | null {
  if (sentence.includes("\n")) return fail("a list (●)"); // "choose 1 of these effects" and lists: not read yet
  const text = sentence.replace(/\.$/, "");
  const isMonster = types.includes("MONSTER");
  const pendulum = where === "PENDULUM";
  const effect = newEffect(sentence, isMonster || where !== "CARD" ? "IGNITION" : "ACTIVATE");

  // condition: activation; resolution
  const colon = splitAt(text, /: /);
  const head = colon ? colon[0] : "";
  const body = colon ? colon[1] : text;
  const semicolon = splitAt(body, /; /);
  let activation = semicolon ? semicolon[0] : "";
  let resolution = semicolon ? semicolon[1] : body;

  if (colon && !readHead(library, effect, head, pendulum)) return null;
  // "You can" before the activation clause, or before the resolution when there is none: a Spell's or
  // Trap's activation has none, a trigger without one must be used, an Ignition or Quick Effect always has one
  const youCan = /^You can /;
  if (youCan.test(semicolon ? activation : resolution)) {
    if (semicolon) activation = activation.replace(youCan, "");
    else resolution = resolution.replace(youCan, "");
  } else if (effect.kind === "IGNITION" || effect.kind === "QUICK") return fail(colon || semicolon ? `${effect.kind} without You can` : sentence);
  else if (effect.kind !== "ACTIVATE") effect.optional = false;
  // A monster's sentence with neither ":" nor ";" is a rule or a continuous effect, not read yet
  if (!colon && !semicolon && effect.kind !== "ACTIVATE") return fail(sentence);

  if (activation && !readActivation(library, effect, activation)) return null;
  if (!partsOf(library, effect, resolution)) return null;

  // A Spell's or Trap's sentence whose cost moves it from the GY is an effect of it there, not its activation
  const self = effect.cost.find((a) => a.cards && "self" in a.cards);
  if (effect.kind === "ACTIVATE" && self?.where) effect.kind = "IGNITION";
  if (effect.kind === "ACTIVATE") {
    if (!effect.events.length) effect.events = ["FREE_CHAIN"];
    return effect;
  }
  // A Trap's effects are Quick Effects: what a Continuous Trap can do on the field is one
  if (effect.kind === "IGNITION" && where === "ON_FIELD" && types.includes("TRAP")) {
    effect.kind = "QUICK";
    effect.events = ["FREE_CHAIN"];
  }
  // Where it works from: where its condition, its cost or what it does says this card is, else where the card is used
  if (!effect.range && !effect.single) {
    const fromHand = self && (self.move === "DISCARD" || self.move === "REVEAL");
    const resolved = effect.parts.flatMap((p) => p.actions).find((a) => a.cards && "self" in a.cards && a.where);
    effect.range =
      self?.where ??
      resolved?.where ??
      (fromHand ? ["HAND"] : pendulum ? ["PZONE"] : isMonster ? ["MZONE"] : types.includes("FIELD") ? ["FZONE"] : ["SZONE"]);
  }
  return effect;
}

/** Monster events as card text says them, after "this card is". */
const OWN_EVENTS: [RegExp, string[], TextCondition[]?][] = [
  [/^Normal or Special Summoned$/, ["SUMMON_SUCCESS", "SPSUMMON_SUCCESS"]],
  [/^Normal Summoned$/, ["SUMMON_SUCCESS"]],
  [/^Special Summoned$/, ["SPSUMMON_SUCCESS"]],
  [/^Summoned$/, ["SUMMON_SUCCESS", "SPSUMMON_SUCCESS", "FLIP_SUMMON_SUCCESS"]],
  [/^Flip Summoned$/, ["FLIP_SUMMON_SUCCESS"]],
  [/^Tribute Summoned$/, ["SUMMON_SUCCESS"], [{ thisCard: { summonType: "ADVANCE" } }]],
  [/^Fusion Summoned$/, ["SPSUMMON_SUCCESS"], [{ thisCard: { summonType: "FUSION" } }]],
  [/^Synchro Summoned$/, ["SPSUMMON_SUCCESS"], [{ thisCard: { summonType: "SYNCHRO" } }]],
  [/^Xyz Summoned$/, ["SPSUMMON_SUCCESS"], [{ thisCard: { summonType: "XYZ" } }]],
  [/^Link Summoned$/, ["SPSUMMON_SUCCESS"], [{ thisCard: { summonType: "LINK" } }]],
  [/^Ritual Summoned$/, ["SPSUMMON_SUCCESS"], [{ thisCard: { summonType: "RITUAL" } }]],
  [/^Pendulum Summoned$/, ["SPSUMMON_SUCCESS"], [{ thisCard: { summonType: "PENDULUM" } }]],
  [/^sent to the GY$/, ["TO_GRAVE"]],
  [/^sent to the GY by card effect$/, ["TO_GRAVE"], [{ thisCard: { reasons: ["EFFECT"] } }]],
  [/^destroyed by battle and sent to the GY$/, ["BATTLE_DESTROYED"], [{ thisCard: { isIn: ["GRAVE"] } }]],
  [/^Special Summoned from the hand$/, ["SPSUMMON_SUCCESS"], [{ thisCard: { summonedFrom: ["HAND"] } }]],
  [/^Special Summoned from the GY$/, ["SPSUMMON_SUCCESS"], [{ thisCard: { summonedFrom: ["GRAVE"] } }]],
  [/^sent from the field to the GY$/, ["TO_GRAVE"], [{ thisCard: { wasIn: ["ONFIELD"] } }]],
  [/^sent from the hand to the GY$/, ["TO_GRAVE"], [{ thisCard: { wasIn: ["HAND"] } }]],
  [/^banished$/, ["REMOVE"]],
  [/^destroyed$/, ["DESTROYED"]],
  [/^destroyed by battle$/, ["BATTLE_DESTROYED"]],
  [/^destroyed by battle or card effect$/, ["DESTROYED"], [{ thisCard: { reasons: ["BATTLE", "EFFECT"] } }]],
  [/^destroyed by card effect$/, ["DESTROYED"], [{ thisCard: { reasons: ["EFFECT"] } }]],
  [/^added from the Deck to your hand$/, ["TO_HAND"], [{ thisCard: { wasIn: ["DECK"] } }]],
  [/^Tributed$/, ["RELEASE"]],
  [/^flipped face-up$/, ["FLIP"]],
];

const OWN_MZONE: TextPlaces = { own: ["MZONE"], opponent: [] };

/** The condition before the ":": the kind of effect, its event, where it works and its conditions. */
function readHead(library: Library, effect: TextEffect, head: string, pendulum: boolean): boolean {
  let rest = head;
  const take = (pattern: RegExp) => {
    const m = rest.match(pattern);
    if (m) rest = rest.slice(m[0].length).replace(/^,? /, "");
    return m;
  };
  if (take(/^FLIP$/)) {
    // A Flip Effect never misses its timing
    effect.kind = "FLIP";
    effect.single = true;
    effect.delay = true;
    return true;
  }
  let m: RegExpMatchArray | null;
  while (rest) {
    if (take(/^Once per turn/)) effect.limit = { count: 1 };
    else if (take(/^\(Quick Effect\)/)) {
      effect.kind = "QUICK";
      if (!effect.events.length) effect.events = ["FREE_CHAIN"];
    } else if (take(/^[Dd]uring your Main Phase/)) {
      // An Ignition Effect: on a Spell or Trap, one of the card where it is (its GY), not its activation
      effect.kind = effect.kind === "QUICK" ? "QUICK" : "IGNITION";
    } else if (take(/^[Dd]uring the Main Phase/)) effect.conditions.push({ phase: ["MAIN1", "MAIN2"] });
    else if ((m = take(/^[Dd]uring (your|your opponent's|each|either player's|the) (Standby|End) Phase/))) {
      // A trigger at the start of a phase, of a turn the condition says
      effect.kind = "TRIGGER";
      effect.single = false;
      effect.events = [`PHASE+PHASE_${m[2].toUpperCase()}`];
      if (m[1] === "your") effect.conditions.push({ turn: "OWN" });
      if (m[1] === "your opponent's") effect.conditions.push({ turn: "OPPONENT" });
    } else if (take(/^[Dd]uring either player's turn/)) {
      // The older wording of a Quick Effect
      effect.kind = "QUICK";
      if (!effect.events.length) effect.events = ["FREE_CHAIN"];
    } else if ((m = take(/^When an opponent's monster declares (an|a direct) attack/))) {
      // Only the turn player attacks: an opponent's monster attacks in the opponent's turn
      if (m[1] !== "an") return Boolean(fail(m[0]));
      effect.events = ["ATTACK_ANNOUNCE"];
      if (effect.kind !== "ACTIVATE") effect.kind = "TRIGGER";
      effect.conditions.push({ turn: "OPPONENT" });
    } else if (take(/^[Dd]uring your opponent's turn/)) effect.conditions.push({ turn: "OPPONENT" });
    else if (take(/^[Dd]uring your turn/)) effect.conditions.push({ turn: "OWN" });
    else if ((m = take(/^(?:If|When) this card is in your (hand|GY|hand or GY)/))) {
      effect.range = m[1] === "hand" ? ["HAND"] : m[1] === "GY" ? ["GRAVE"] : ["HAND", "GRAVE"];
      if (effect.kind === "ACTIVATE") effect.kind = "IGNITION";
    } else if ((m = take(/^(If|When) this card (?:in the Monster Zone|on the field) is (destroyed(?: by battle or card effect)?)(?=$|,| \()/))) {
      effect.kind = "TRIGGER";
      effect.single = true;
      effect.events = ["DESTROYED"];
      const field = m[0].includes("Monster Zone") ? ["MZONE"] : ["ONFIELD"];
      effect.conditions.push({ thisCard: { wasIn: field, ...(m[2].includes("battle") ? { reasons: ["BATTLE", "EFFECT"] } : {}) } });
      effect.delay = m[1] === "If";
    } else if ((m = take(/^(If|When) this card is (.+?)(?=$|,| \()/))) {
      const own = OWN_EVENTS.find(([pattern]) => pattern.test(m![2]));
      if (!own) return Boolean(fail(m[0]));
      effect.kind = "TRIGGER";
      effect.single = true;
      effect.events = own[1];
      effect.conditions.push(...(own[2] ?? []));
      effect.delay = m[1] === "If";
    } else if ((m = take(/^When (?:a card or effect is activated|your opponent activates a card or effect)(?: that includes an effect that Special Summons a monster)?/))) {
      if (m[0].includes("Special Summons")) return Boolean(fail(m[0]));
      effect.events = ["CHAINING"];
      if (effect.kind === "IGNITION") effect.kind = "QUICK";
      effect.conditions.push({ chainLink: { negatable: "ACTIVATION", byOpponent: m[0].includes("opponent") } });
    } else if (take(/^If you control no monsters/)) {
      effect.conditions.push({ cards: { places: OWN_MZONE, atLeast: 1, none: true } });
    } else if (take(/^If your opponent controls a monster and you control no monsters/)) {
      effect.conditions.push({ cards: { places: OWN_MZONE, atLeast: 1, none: true } });
      effect.conditions.push({ cards: { places: { own: [], opponent: ["MZONE"] }, atLeast: 1 } });
    } else if ((m = take(/^If you control (.+?)(?=$|,| \()/))) {
      // A card you control is checked face-up: what it is can't be seen face-down. "If you control "X"": 1 "X"
      const read = cardPhrase(library, `${/^"/.test(m[1]) ? "1 " : ""}${m[1]} you control`);
      if (!read || read.rest || read.phrase.count === "ALL") return Boolean(fail(m[0]));
      const card = { ...read.phrase.filter, faceup: true };
      effect.conditions.push({ cards: { places: read.phrase.from!, atLeast: read.phrase.count.min, card } });
    } else return Boolean(fail(rest));
  }
  return true;
}

/** The activation clause, before the ";": what the effect costs, and its target. */
function readActivation(library: Library, effect: TextEffect, text: string): boolean {
  for (const clause of splitAll(text, /, then |, and /)) {
    const m = clause.match(/^target (.+)$/i);
    if (m) {
      const read = cardPhrase(library, m[1]);
      if (!read || read.rest || read.phrase.count === "ALL" || !read.phrase.from) return Boolean(fail(clause));
      effect.target = read.phrase;
      continue;
    }
    const action = actionOf(library, effect, clause, true, effect.cost.at(-1));
    if (!action) return false;
    effect.cost.push(action);
  }
  return true;
}

/** Splits at every match of a separator outside quotes. */
function splitAll(text: string, separator: RegExp): string[] {
  const out: string[] = [];
  let rest = text;
  for (;;) {
    const split = splitAt(rest, separator);
    if (!split) return [...out, rest];
    out.push(split[0]);
    rest = split[1];
  }
}

/** How each part of a resolution follows the one before, as card text says it. */
const LINKS: [RegExp, Link][] = [
  [/^,? and if you do, /, "AND_IF_YOU_DO"],
  [/^,? then,? /, "THEN"],
  [/^,? also, after that, /, "ALSO_AFTER_THAT"],
  [/^,? also,? /, "AND"],
];
const LINK_ANYWHERE = /,? and if you do, |,? then,? |,? also, after that, |,? also,? /;

/** The resolution, after the ";": its parts (into effect.parts) and how each follows the one before. */
function partsOf(library: Library, effect: TextEffect, text: string): boolean {
  let rest = text;
  let link: Link | undefined;
  for (;;) {
    const split = splitAt(rest, LINK_ANYWHERE);
    const clause = split ? split[0] : rest;
    const part = partOf(library, effect, clause, link);
    if (!part) return false;
    effect.parts.push(part);
    if (!split) return true;
    const separator = rest.slice(split[0].length, rest.length - split[1].length);
    link = LINKS.find(([pattern]) => pattern.test(separator))?.[1];
    rest = split[1];
  }
}

function partOf(library: Library, effect: TextEffect, text: string, link: Link | undefined): TextPart | null {
  const part: TextPart = { ...(link ? { link } : {}), optional: false, conditions: [], actions: [] };
  let rest = text;
  let m: RegExpMatchArray | null;
  if ((m = rest.match(/^if you have (\d+) or more (.+?) in your GY, /))) {
    const read = cardPhrase(library, `${m[1]} ${m[2]} in your GY`);
    if (!read || read.rest || read.phrase.count === "ALL") return fail(m[0]);
    part.conditions.push({ cards: { places: read.phrase.from!, atLeast: Number(m[1]), card: read.phrase.filter } });
    rest = rest.slice(m[0].length);
  }
  if (/^you can /i.test(rest)) {
    part.optional = true;
    rest = rest.replace(/^you can /i, "");
  }
  const action = actionOf(library, effect, rest, false, effect.parts.at(-1)?.actions.at(-1));
  if (!action) return null;
  part.actions.push(action);
  return part;
}


function subjectOf(library: Library, effect: TextEffect, text: string, previous: TextAction | undefined): { cards: Subject; rest: string } | null {
  const words = text.match(/^(this card|it|them|that card|that target|that monster|those cards|those targets|those monsters|that face-up monster|that targeted card|that targeted monster)\b/);
  if (words) {
    const word = words[1];
    const rest = text.slice(word.length);
    if (word === "this card") return { cards: { self: true }, rest };
    if (previous?.move === "NEGATE_ACTIVATION") return { cards: { chainLinkCard: true }, rest };
    if (effect.target) return { cards: { target: true }, rest };
    if (previous?.cards && "pick" in previous.cards) return { cards: { previous: true }, rest };
    return null;
  }
  const read = cardPhrase(library, text);
  if (!read) return null;
  return { cards: read.phrase.count === "ALL" ? { all: read.phrase } : { pick: read.phrase }, rest: read.rest };
}

/** ", except "X"" at the end of a move: those cards are left out. */
function withExcept(library: Library, cards: Subject, except: string | undefined): boolean {
  if (!except) return true;
  if (!("pick" in cards || "all" in cards)) return false;
  const phrase = "pick" in cards ? cards.pick : cards.all;
  const names = [...except.matchAll(/"([^"]+)"/g)].map((m) => library.cardCode(m[1]));
  if (!names.length || names.some((code) => code === null) || except.replace(/"[^"]+"|,? or /g, "").trim()) return false;
  phrase.filter.except = names as number[];
  return true;
}

/** One move, as card text says it; previous is the move before it in the same clause (cost or resolution). */
function actionOf(library: Library, effect: TextEffect, text: string, isCost: boolean, previous: TextAction | undefined): TextAction | null {
  let where: string[] | undefined;
  const cards = (words: string, except?: string, defaultFrom?: TextPlaces) => {
    const subject = subjectOf(library, effect, words, previous);
    if (!subject || !withExcept(library, subject.cards, except)) return null;
    let rest = subject.rest;
    const phrase = "pick" in subject.cards ? subject.cards.pick : "all" in subject.cards ? subject.cards.all : undefined;
    if (phrase && !phrase.from) {
      if (!defaultFrom) return null;
      phrase.from = defaultFrom;
    }
    // Where this card is: "banish this card from your GY", "Special Summon this card (from your hand)", "reveal this card in your hand"
    const m = "self" in subject.cards ? rest.match(/^ \(?(?:from|in) your (hand or GY|hand|GY)\)?/) : null;
    if (m) {
      where = m[1] === "hand" ? ["HAND"] : m[1] === "GY" ? ["GRAVE"] : ["HAND", "GRAVE"];
      rest = rest.slice(m[0].length);
    }
    return rest ? null : subject.cards;
  };
  let m: RegExpMatchArray | null;

  if ((m = text.match(/^draw (\d+) cards?$/i))) return { move: "DRAW", amount: Number(m[1]), player: "OWN" };
  if ((m = text.match(/^inflict (\d+) damage to your opponent$/i))) return { move: "DAMAGE", amount: Number(m[1]), player: "OPPONENT" };
  if ((m = text.match(/^gain (\d+) LP$/i))) return { move: "GAIN_LP", amount: Number(m[1]), player: "OWN" };
  if ((m = text.match(/^pay (\d+) LP$/i))) return { move: "PAY_LP", amount: Number(m[1]), player: "OWN" };
  if (/^negate the activation$/i.test(text)) return { move: "NEGATE_ACTIVATION" };
  if ((m = text.match(/^detach (\d+) (?:Xyz )?materials? from this card$/i))) return { move: "DETACH", cards: { self: true }, amount: Number(m[1]) };
  if (/^negate that effect$/i.test(text)) return { move: "NEGATE_EFFECT" };

  const moves: [RegExp, MoveName, TextPlaces?][] = [
    [/^add (.+?) to your hand(?:, except (.+))?$/i, "TO_HAND"],
    [/^return (.+?) to the hand$/i, "TO_HAND"],
    [/^Special Summon (.+?)(?:, except (.+))?$/, "SPECIAL_SUMMON"],
    [/^send (.+?) to the GY(?:, except (.+))?$/i, "TO_GRAVE"],
    [/^banish (.+?)(?:, except (.+))?$/i, "BANISH"],
    [/^destroy (.+?)(?:, except (.+))?$/i, "DESTROY"],
    [/^discard (.+?)$/i, "DISCARD", { own: ["HAND"], opponent: [] }],
    [/^Tribute (.+?)$/, "TRIBUTE", { own: ["MZONE"], opponent: [] }],
    [/^shuffle (.+?) into the Deck$/i, "TO_DECK"],
    [/^reveal (.+?)$/i, "REVEAL", { own: ["HAND"], opponent: [] }],
  ];
  for (const [pattern, move, defaultFrom] of moves) {
    if (!(m = text.match(pattern))) continue;
    let words = m[1];
    let position: TextAction["position"];
    if (move === "SPECIAL_SUMMON" && / in Defense Position$/.test(words)) {
      position = "FACEUP_DEFENSE";
      words = words.replace(/ in Defense Position$/, "");
    }
    // "discard 1 card": any card in the hand
    if (move === "DISCARD" && /^\d+ cards?$/.test(words)) words += " from your hand";
    const subject = cards(words, m[2], defaultFrom);
    if (!subject) return fail(`${move}: ${words}${m[2] ? `, except ${m[2]}` : ""}`);
    if (isCost && "target" in subject) return fail(`${move} of a target as a cost`);
    return { move, cards: subject, ...(where ? { where } : {}), ...(position ? { position } : {}) };
  }
  return fail(text);
}

/**
 * Applies a "You can only ..." sentence to the effects it names: "this effect" the one just before it
 * (last), the others every effect of the section, once they have all been read (atEnd). UNKNOWN: no rule
 * knows its wording; NOT_APPLIED: the effects it names aren't there (or already have a limit); LATER:
 * it names effects not all read yet.
 */
function applyLimit(
  library: Library,
  code: number,
  sentence: string,
  effects: TextEffect[],
  last: TextEffect | null,
  atEnd = false,
): "APPLIED" | "NOT_APPLIED" | "UNKNOWN" | "LATER" {
  const quoted = [...sentence.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (quoted.length !== 1 || library.cardCode(quoted[0]) !== code) return "UNKNOWN";
  const shape = sentence.replace(/"[^"]+"/, '"X"');
  const ofThisEffect = /^You can only use (this|the) effect of "X" once per (turn|Duel)\.$/.test(shape);
  if (!ofThisEffect && !atEnd) return "LATER";
  const result = limitOf(shape, ofThisEffect ? (last ? [last] : []) : effects, effects);
  return result === undefined ? "UNKNOWN" : result ? "APPLIED" : "NOT_APPLIED";
}

/** A limit sentence's shape applied to the effects it names: undefined for a shape no rule knows. */
function limitOf(shape: string, effects: TextEffect[], all: TextEffect[]): boolean | undefined {
  const activated = effects.filter((e) => e.kind !== "ACTIVATE" || effects.length === 1);
  // Counters already used by earlier limits of this card
  const used = () => new Set(all.map((e) => e.limit?.counter).filter((c) => c !== undefined));
  const nextCounter = () => used().size;
  switch (shape) {
    case 'You can only use this effect of "X" once per turn.':
    case 'You can only use the effect of "X" once per turn.': {
      const effect = effects.at(-1);
      if (!effect || effect.limit) return false;
      effect.limit = { count: 1, counter: nextCounter() };
      return true;
    }
    case 'You can only use this effect of "X" once per Duel.': {
      const effect = effects.at(-1);
      if (!effect || effect.limit) return false;
      effect.limit = { count: 1, counter: nextCounter(), duel: true };
      return true;
    }
    case 'You can only use each effect of "X" once per turn.':
    case 'You can only use each of the following effects of "X" once per turn.':
    case 'You can only use each of these effects of "X" once per turn.':
      if (activated.length < 2 || activated.some((e) => e.limit)) return false;
      activated.forEach((effect, i) => (effect.limit = { count: 1, counter: i }));
      return true;
    case 'You can only use 1 "X" effect per turn, and only once that turn.':
    case 'You can only use 1 of the following effects of "X" per turn, and only once that turn.':
      if (activated.length < 2 || activated.some((e) => e.limit)) return false;
      activated.forEach((effect) => (effect.limit = { count: 1, counter: 0 }));
      return true;
    case 'You can only activate 1 "X" per turn.': {
      const activation = effects.find((e) => e.kind === "ACTIVATE");
      if (!activation || activation.limit) return false;
      activation.limit = { count: 1, counter: 0, oath: true };
      return true;
    }
  }
  return undefined;
}

