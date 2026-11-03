import type * as S from "./cardSchema.js";

/**
 * A card's two readings side by side: its own script's, and the script
 * written from its text's (textScript.ts), both in the schema's format.
 *
 * Only what the text says is compared. How a script words a thing isn't:
 * its string ids, hint timings, categories and what it declares, its
 * activation checks, and the checks that only make a move safe to do (the
 * pick found a card, the target is still on the chain, the player can draw,
 * a free zone, Necrovalley). A difference is something to look at: the
 * text's reading, the script's reading, or the script itself may be what's
 * wrong. Neither reading is preferred.
 */
export interface Difference {
  /** The effect on each side (its index), or none on the side that doesn't have it. */
  text?: number;
  script?: number;
  /** The field that differs, as a path into the effect; empty when the whole effect is on one side only. */
  path: string;
  textValue?: unknown;
  scriptValue?: unknown;
}

/** The effects compared: summon procedures and what the card's summons read aren't, yet. */
const compared = (card: S.CardSchema) => (card.effects ?? []).filter((e) => !e.fromProcedure && !e.inSummons);

export function compareCards(fromText: S.CardSchema, fromScript: S.CardSchema): Difference[] {
  const textEffects = compared(fromText);
  const scriptEffects = compared(fromScript);
  const differences: Difference[] = [];
  const unmatched = new Set(scriptEffects);
  // Each of the text's effects with the script's first effect of the same kind on the same event, from the same place
  const keys: ((e: S.EffectSchema) => string)[] = [
    (e) => `${e.kind}|${e.event}|${e.eventOf}|${(e.from ?? []).join("+")}`,
    (e) => `${e.kind}|${e.event}`,
    (e) => e.kind,
  ];
  const pairs = new Map<S.EffectSchema, S.EffectSchema>();
  for (const key of keys) {
    for (const t of textEffects) {
      if (pairs.has(t)) continue;
      const s = [...unmatched].find((e) => key(e) === key(t));
      if (!s) continue;
      pairs.set(t, s);
      unmatched.delete(s);
    }
  }
  for (const t of textEffects) {
    const s = pairs.get(t);
    if (!s) differences.push({ text: t.index, path: "", textValue: summary(t) });
    else diff(view(t), view(s), "", (path, textValue, scriptValue) =>
      differences.push({ text: t.index, script: s.index, path, textValue, scriptValue }),
    );
  }
  for (const s of unmatched) differences.push({ script: s.index, path: "", scriptValue: summary(s) });
  return differences;
}

/** An effect in a few words, for one that is only on one side. */
const summary = (e: S.EffectSchema) => [e.kind, e.event, ...(e.from ?? [])].filter(Boolean).join(" ");

/** What of an effect the text says, with each pick named by the order it first appears in (#1, #2...). */
function view(e: S.EffectSchema): unknown {
  return renamePicks(sameMeaning(strip(effectView(e))), new Map());
}

function effectView(e: S.EffectSchema): unknown {
  return {
    kind: e.kind,
    speed: e.speed,
    mandatory: e.mandatory,
    event: e.event,
    eventOf: e.eventOf,
    // A trigger on this card's own event happens where the event puts it
    from: e.eventOf === "SELF" ? undefined : e.from,
    limit: e.limit,
    targets: e.targets,
    // "If" (a trigger that doesn't miss timing) or "When"
    delay: e.kind === "TRIGGER" && !e.mandatory ? (e.flags ?? []).includes("DELAY") : undefined,
    modes: e.modes?.map(({ mode, chosenOn }) => ({ mode, chosenOn })),
    cost: moves(e.cost, true),
    onActivation: moves(e.onActivation),
    does: e.does?.map((part) => ({ ...part, requires: conditions(part.requires), moves: moves(part.moves) })),
    applies: e.applies,
    requires: impliedByEvent(e),
  };
}

/**
 * Checks of this card its event already says: one destroyed by battle was destroyed by battle, and
 * a card Special Summoned from a place was there before (IsSummonLocation or IsPreviousLocation).
 */
function impliedByEvent(e: S.EffectSchema): S.Condition[] | undefined {
  const kept = (e.requires ?? [])
    .filter((c) => !(e.event === "BATTLE_DESTROYED" && "is" in c && "who" in c.is.cards && JSON.stringify(c.is.filter) === '{"reasons":["BATTLE"]}'))
    .map((c) => {
      if (e.event !== "SPSUMMON_SUCCESS" || !("is" in c) || !c.is.filter.summonedFrom) return c;
      const { summonedFrom, ...filter } = c.is.filter;
      return { is: { ...c.is, filter: { ...filter, wasIn: summonedFrom } } };
    });
  return kept.length ? kept : undefined;
}

/** A card added to the hand is shown to the opponent by the rules: that REVEAL isn't a move of the text's. */
function moves(list: S.Move[] | undefined, isCost = false): unknown[] | undefined {
  return list
    ?.filter((m, i) => !(m.move === "REVEAL" && list[i - 1]?.move === "TO_HAND" && JSON.stringify(m.cards) === JSON.stringify(list[i - 1].cards)))
    .map((m) => move(m, isCost));
}

/** ABLE checks a move's own needs (a card added to the hand can be added): what the move itself says. */
const ABLE_OF: Partial<Record<S.MoveName, string>> = {
  TO_HAND: "HAND",
  TO_GRAVE: "GRAVE",
  BANISH: "REMOVE",
  TO_DECK: "DECK",
  SPECIAL_SUMMON: "SPECIAL_SUMMON",
  DISCARD: "DISCARD",
  TRIBUTE: "TRIBUTE",
};

function move(m: S.Move, isCost = false): unknown {
  const { requires: _, ...rest } = m;
  let card = m.card;
  if (card) {
    // What the move needs of its cards, and the states only rules check (Necrovalley, a free zone it leaves)
    const able = (card.able ?? []).filter((a) => a !== ABLE_OF[m.move] && a !== `${ABLE_OF[m.move]}_AS_COST`);
    const states = (card.states ?? []).filter((st) => st !== "NOT_NECRO_VALLEY" && st !== "LEAVES_FREE_MZONE");
    card = { ...card, able: able.length ? able : undefined, states: states.length ? states : undefined };
    // A cost's card that must leave the effect something to do (One for One's: not the only Level 1 monster to summon)
    if (isCost) card = { ...card, needs: undefined };
    // Only monsters can be Special Summoned
    if (m.move === "SPECIAL_SUMMON" && card.types?.join() === "MONSTER") card = { ...card, types: undefined };
  }
  // The first of the cards that match, when they all have one name, is the one a player would choose
  const firstOfOneName = m.pick === "ALL" && m.count !== "ALL" && m.count?.max === 1 && m.card?.names?.length === 1;
  const reasons = m.reasons && [...m.reasons].sort();
  // Tributes are the player's own monsters unless the move says otherwise (Duel.SelectReleaseGroup names no places)
  if (m.move === "TRIBUTE" && !m.from && m.pick !== "THIS_CARD") rest.from = { own: ["MZONE"] };
  return { ...rest, card, reasons, ...(firstOfOneName ? { pick: "CHOSEN" } : {}), effect: m.effect && effectView(m.effect) };
}

/**
 * The checks that only make a move safe to do, which card text doesn't say: the pick found a card,
 * the target is still on the chain, the player can draw, a free zone, Necrovalley, and re-checks of a
 * card the effect already holds (the target is still face-up).
 */
function conditions(list: S.Condition[] | undefined): S.Condition[] | undefined {
  const kept = (list ?? []).filter((c) => {
    if ("exists" in c || "stillOnChain" in c || "necroValley" in c || "canDraw" in c || "optional" in c || "is" in c) return false;
    if ("atLeast" in c && ("cards" in c.of || "freeZones" in c.of || "moved" in c.of)) return false;
    return true;
  });
  return kept.length ? kept : undefined;
}

const SPELL_TRAP_KINDS = new Set(["SPELL", "TRAP", "CONTINUOUS", "QUICKPLAY", "EQUIP", "FIELD", "COUNTER"]);
/** Kinds only a Spell (or only a Trap) has: IsType(TYPE_QUICKPLAY) is IsAllTypes(TYPE_SPELL+TYPE_QUICKPLAY). */
const ONLY_OF: Record<string, string> = { QUICKPLAY: "SPELL", FIELD: "SPELL", EQUIP: "SPELL", COUNTER: "TRAP" };

/**
 * Checks worded differently that say the same, worded one way: a filter and the places it looks in
 * (a Move's or a Need's card and from), wherever they are.
 */
function sameMeaning(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sameMeaning);
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) out[key] = sameMeaning(v);
  if (out.card && typeof out.card === "object") {
    const places = out.from as S.Places | undefined;
    const card = { ...(out.card as S.CardFilter) };
    // A kind only Spells (or Traps) have, with or without saying Spell; a Spell's exact type is all of its types
    if (card.types?.length === 1 && ONLY_OF[card.types[0]]) card.allTypes = [ONLY_OF[card.types[0]], card.types[0]];
    if (card.types?.length === 1 && ONLY_OF[card.types[0]]) delete card.types;
    if (card.exactTypes?.every((t) => SPELL_TRAP_KINDS.has(t))) {
      card.allTypes = [...(card.allTypes ?? []), ...card.exactTypes];
      delete card.exactTypes;
    }
    if (card.allTypes) card.allTypes = [...new Set(card.allTypes)].sort();
    // Only monsters have a Level, an Attribute, a Type or ATK, and only monsters are in a Monster Zone or the Extra Deck
    const inMonsterZone = places && [...(places.own ?? []), ...(places.opponent ?? [])].every((p) => p === "MZONE" || p === "EXTRA");
    const monsterOnly =
      card.races || card.attributes || (card.numbers && Object.keys(card.numbers).some((n) => n !== "SEQUENCE")) || inMonsterZone;
    if (monsterOnly && card.types?.join() === "MONSTER") delete card.types;
    // A Spell or Trap on the field is in a Spell & Trap Zone
    const kinds = [...(card.types ?? []), ...(card.allTypes ?? [])];
    const spellTrap = kinds.length && kinds.every((t) => SPELL_TRAP_KINDS.has(t));
    if (places) {
      const zone = (list?: S.Place[]) => list && [...new Set(list.map((p) => (spellTrap && p === "ONFIELD" ? "SZONE" : p)))].sort();
      out.from = strip({ own: zone(places.own), opponent: zone(places.opponent) });
    }
    out.card = card;
  }
  // The checks a resolution's parts make only to be safe
  if ("part" in out && "level" in out) out.requires = conditions(out.requires as S.Condition[]);
  return strip(out);
}

/** Each pick named by the order it first appears in, since each reading numbers its picks its own way; the target stays TARGET. */
function renamePicks(value: unknown, names: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((v) => renamePicks(v, names));
  if (typeof value !== "object" || value === null) return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (key === "ref" && typeof v === "string" && v !== "TARGET") {
      if (!names.has(v)) names.set(v, `#${names.size + 1}`);
      out[key] = names.get(v);
    } else out[key] = renamePicks(v, names);
  }
  return out;
}

/** Leaves out what is undefined, so a field left out and one set to nothing are the same. */
function strip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Calls out with each path where a and b differ, down to the first level where their shapes differ. */
function diff(a: unknown, b: unknown, path: string, out: (path: string, a: unknown, b: unknown) => void) {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    a.forEach((item, i) => diff(item, b[i], `${path}[${i}]`, out));
    return;
  }
  if (object(a) && object(b) && !Array.isArray(a) && !Array.isArray(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[key], b[key], path ? `${path}.${key}` : key, out);
    return;
  }
  out(path, a, b);
}
