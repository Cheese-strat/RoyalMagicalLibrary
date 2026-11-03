import type { MoveName } from "../cardSchema.js";
import { names } from "../constants.js";
import type { Library } from "../library.js";
import { scriptFunctions, type FunctionDeclaration } from "../lua.js";

/** A record of what the reader found. Keys are UPPER_CASE; values are text, numbers, lists or more records. */
export type Flags = Record<string, any>;

/** What the reader keeps while it reads one effect, from its cost and target into its operation. */
export interface EffectState {
  /** Which effect e is: the card's registered effect by index, or THIS (one made while resolving, which has none). */
  index: number | "THIS";
  /** The effect its label object holds from when it is made (eN:SetLabelObject(eM)), by index. */
  linked?: number;
  /** What the cost stored with e:SetLabel when it is read as something besides a number kept: the mode chosen, an Attribute. */
  label?: Flags;
  /** The card the target function targeted. */
  target: Flags;
  /** The chain's target player and parameter (Duel.SetTargetPlayer, Duel.SetTargetParam). */
  chainPlayer: Flags;
  chainParam: Flags;
  /** How many cards the effect has picked so far, to number their ids. */
  picks: number;
}

export const newEffectState = (index: number | "THIS" = "THIS", linked?: number): EffectState => ({
  index,
  linked,
  target: { REF: "TARGET" },
  chainPlayer: { WHO: "TARGET_PLAYER" },
  chainParam: { EXPR: "TARGET_PARAM" },
  picks: 0,
});

/** Everything the readers need about the card being read. */
export interface CardContext {
  library: Library;
  code: number;
  /** The script's functions by name. */
  functions: Map<string, FunctionDeclaration>;
  /** The card's effect strings (str1, str2...). */
  strings: string[];
  effect: EffectState;
  /** Each registered effect's label object when it is another effect (eN:SetLabelObject(eM)): N to M. */
  links: Map<number, number>;
  /** Each group the card makes and gives effects as their label object ("<group 1>"), by the first effect given it. */
  groups: Map<string, number>;
}

export function cardContext(library: Library, code: number): CardContext {
  return {
    library,
    code,
    functions: scriptFunctions(library.script(`c${code}.lua`), code),
    strings: library.cardStrings(code),
    effect: newEffectState(),
    links: new Map(),
    groups: new Map(),
  };
}

/**
 * The functions of aux (utility.lua and procedure.lua), by name, read like a script's own: an
 * effect given aux.bfgcost as its cost does what Auxiliary.bfgcost does. aux and Auxiliary are
 * read as "s", the script's own table, so they call each other as a script's functions do.
 */
export function auxFunctions(library: Library): Map<string, FunctionDeclaration> {
  let functions = auxCache.get(library);
  if (!functions) {
    const text = ["utility.lua", "procedure.lua"].map((name) => library.script(name)).join("\n");
    functions = scriptFunctions(text.replace(/\b(?:Auxiliary|aux)\./g, "s."), 0);
    auxCache.set(library, functions);
  }
  return functions;
}
const auxCache = new WeakMap<Library, Map<string, FunctionDeclaration>>();

/** The Duel functions that do something to cards or players, and the action name a record gives each. */
export const DUEL_ACTIONS: Record<string, MoveName> = {
  SpecialSummon: "SPECIAL_SUMMON",
  SpecialSummonStep: "SPECIAL_SUMMON",
  SendtoGrave: "TO_GRAVE",
  SendtoHand: "TO_HAND",
  SendtoDeck: "TO_DECK",
  SendtoExtraP: "TO_EXTRA_FACEUP",
  Remove: "BANISH",
  Destroy: "DESTROY",
  Release: "TRIBUTE",
  Draw: "DRAW",
  Damage: "DAMAGE",
  Recover: "GAIN_LP",
  SSet: "SET",
  NegateActivation: "NEGATE_ACTIVATION",
  NegateEffect: "NEGATE_EFFECT",
  NegateRelatedChain: "NEGATE_ON_CHAIN",
  ChangePosition: "CHANGE_POSITION",
  GetControl: "TAKE_CONTROL",
  Equip: "EQUIP",
  MoveToField: "PLACE",
  Overlay: "ATTACH",
  DiscardHand: "DISCARD",
  ConfirmCards: "REVEAL",
  ConfirmDecktop: "REVEAL",
  DiscardDeck: "TO_GRAVE",
  PayLPCost: "PAY_LP",
  SetLP: "SET_LP",
  RemoveOverlayCard: "DETACH",
  RemoveCounter: "REMOVE_COUNTER",
  Summon: "NORMAL_SUMMON",
  MSet: "SET",
  SpecialSummonRule: "SPECIAL_SUMMON",
  SynchroSummon: "SYNCHRO_SUMMON",
  XyzSummon: "XYZ_SUMMON",
  LinkSummon: "LINK_SUMMON",
  ReturnToField: "RETURN_TO_FIELD",
  NegateAttack: "NEGATE_ATTACK",
  ChainAttack: "ATTACK_AGAIN",
  ChangeAttackTarget: "CHANGE_ATTACK_TARGET",
  SwapControl: "SWAP_CONTROL",
  TossCoin: "TOSS_COIN",
  TossDice: "ROLL_DIE",
};

/** The card methods that do something to the card they are called on, and the action name a record gives each. */
export const CARD_ACTIONS: Record<string, MoveName> = {
  RemoveOverlayCard: "DETACH",
  AddCounter: "ADD_COUNTER",
  RemoveCounter: "REMOVE_COUNTER",
  // A continuous "this card targets that card" link, as Call of the Haunted keeps
  SetCardTarget: "KEEP_TARGETING",
};

const isOwnCode = (context: CardContext, text: string) => text === "id" || text === String(context.code);

/** A card number as a script writes it: a number, or a constant like CARD_NECROVALLEY. */
export function codeName(context: CardContext, text: string) {
  if (isOwnCode(context, text)) return "THIS_CARD";
  const value = /^\d+$/.test(text) ? Number(text) : context.library.constants.value(text);
  return value ? context.library.cardName(value) : text;
}

/** An effect code as a script writes it: EFFECT_ names, or a card's number for an effect only that card has. */
export function effectName(context: CardContext, text: string) {
  const value = /^\d+$/.test(text) ? Number(text) : context.library.constants.value(text);
  return value > 0xffff ? codeName(context, text) : context.library.constants.name("EFFECT_", value);
}

/**
 * A flag's id: THIS_CARD for the card's own number, THIS_CARD+n for one made
 * from it ("id+o*2", where GetID's o is 1, or 100 for a number of 9 digits),
 * another card's number, or a flag scripts share (FLAG_ID_CHAINING). Anything
 * else is kept as written.
 */
export function flagName(context: CardContext, text: string) {
  const t = text.replace(/\s/g, "");
  if (/^FLAG_ID_\w+$/.test(t)) return t;
  const m = t.match(/^(id|\d+)(?:\+(\d+|o|o\*\d+|\d+\*o))?$/);
  if (!m || !isOwnCode(context, m[1])) return m && !m[2] ? m[1] : text;
  if (!m[2]) return "THIS_CARD";
  const o = context.code < 100000000 ? 1 : 100;
  return `THIS_CARD+${m[2].split("*").reduce((n, x) => n * (x === "o" ? o : Number(x)), 1)}`;
}

/** A description's number: aux.Stringid(code, k) is code * 16 + k; a system string is its own number. */
export function stringNumber(context: CardContext, text: string) {
  const stringId = text.match(/aux\.Stringid\((id|\d+),\s*(\d+)\)/);
  if (stringId) return (stringId[1] === "id" ? context.code : Number(stringId[1])) * 16 + Number(stringId[2]);
  return /^\d+$/.test(text) ? Number(text) : null;
}

/** An effect description: aux.Stringid(id, k), or the number id * 16 + k, is the card's string k. */
export function stringText(context: CardContext, text: string) {
  const stringId = text.match(/aux\.Stringid\((?:id|\d+),\s*(\d+)\)/);
  if (stringId) return context.strings[Number(stringId[1])] || `EMPTY_STR${Number(stringId[1]) + 1}`;
  const n = Number(text);
  if (n >= 16 && Math.floor(n / 16) === context.code) return context.strings[n % 16] || `EMPTY_STR${(n % 16) + 1}`;
  return n ? `SYSTEM_STRING_${n}` : undefined;
}

/** Locations on each side, as a record: { OWN: [...], OPPONENT: [...] }. */
export function places(own: string | undefined, opponent: string | undefined): Flags {
  const ownPlaces = names(own, "LOCATION_");
  const opponentPlaces = names(opponent, "LOCATION_");
  return {
    ...(ownPlaces.length ? { OWN: ownPlaces } : {}),
    ...(opponentPlaces.length ? { OPPONENT: opponentPlaces } : {}),
  };
}

/** A zone mask. 0x60 is the two Extra Monster Zones; others are left as written. */
export function zoneNames(context: CardContext, zone: string) {
  return context.library.constants.value(zone) === 0x60 ? ["EXTRA_MONSTER_ZONE"] : [zone];
}

/** The events of RESETS_STANDARD, by what RML calls them together: all of them, all but being flipped face-down, all but moving to the field. */
export const STANDARD_RESETS: Record<string, string[]> = {
  LEAVES_FIELD_OR_FLIPS: [],
  LEAVES_FIELD: ["RESET_TURN_SET"],
  LEAVES_FIELD_EXCEPT_TO_FIELD: ["RESET_TOFIELD"],
};

/** The RESET_ bits after RESETS_STANDARD's, in the order they are named. */
export const OTHER_RESETS = ["RESET_DISABLE", "RESET_CONTROL", "RESET_OVERLAY", "RESET_MSCHANGE", "RESET_SELF_TURN", "RESET_OPPO_TURN", "RESET_CARD", "RESET_CODE", "RESET_COPY"];

/**
 * When a created effect or flag ends, by the bits of its reset: the card's
 * events (LEAVES_FIELD_OR_FLIPS for RESETS_STANDARD, LEAVES_FIELD and
 * LEAVES_FIELD_EXCEPT_TO_FIELD for it less one event, or each RESET_ event by
 * name), then each phase (END_PHASE), CHAIN_END, and the other bits by name
 * (RESET_DISABLE, RESET_SELF_TURN). A reset of anything but constants and
 * numbers, or with events and no RESET_EVENT, is kept as written.
 */
export function resetFlags(context: CardContext, expression: string) {
  const constants = context.library.constants;
  const terms = expression.replace(/\s/g, "").split(/([+|-])/);
  let value = 0;
  for (let i = 0; i < terms.length; i += 2) {
    const term = terms[i];
    const n = /^(0x[0-9a-fA-F]+|\d+)$/.test(term) ? Number(term) : constants.has(term) ? constants.value(term) : undefined;
    if (n === undefined) return [expression];
    value += terms[i - 1] === "-" ? -n : n;
  }
  const has = (name: string) => Math.floor(value / constants.value(name)) % 2 === 1;
  const standard = constants.flags("RESET_", constants.value("RESETS_STANDARD")).map((name) => `RESET_${name}`);
  const events = standard.filter(has);
  const out: string[] = [];
  if (events.length || OTHER_RESETS.slice(0, 4).some(has)) {
    if (!has("RESET_EVENT")) return [expression];
    const missing = standard.filter((name) => !events.includes(name));
    const together = Object.entries(STANDARD_RESETS).find(([, less]) => less.join() === missing.join())?.[0];
    if (together) out.push(together);
    else out.push(...events);
  }
  if (has("RESET_PHASE")) out.push(...constants.flags("PHASE_", value % 0x1000).map((phase) => `${phase}_PHASE`));
  if (has("RESET_CHAIN")) out.push("CHAIN_END");
  out.push(...OTHER_RESETS.filter(has));
  return out;
}

/** Filter checks whose list is "any one of these": a card is of one Attribute, in one place, with one name... */
const ALTERNATIVES = new Set([
  "TYPE",
  "FUSION_TYPE",
  "EXACT_TYPE",
  "ATTRIBUTE",
  "RACE",
  "LOCATION",
  "CODE",
  "POSITION",
  "WAS_IN",
  "WAS_POSITION",
  "REASON",
  "SUMMONED_BY",
  "SUMMONED_FROM",
  "MENTIONS",
]);

/** Merges records; lists under the same key are joined, and records under the same key merged. */
export function merge(...parts: Flags[]): Flags {
  const out: Flags = {};
  const record = (x: unknown) => x && typeof x === "object" && !Array.isArray(x);
  for (const part of parts) {
    for (const [key, value] of Object.entries(part)) {
      // A second check that lists alternatives (IsType(TYPE_SPELL+TYPE_TRAP)) must hold as well, not add to the first's
      if (ALTERNATIVES.has(key) && out[key] !== undefined) out.ALL_OF = [...(out.ALL_OF ?? []), { [key]: value }];
      else if (Array.isArray(value) && Array.isArray(out[key])) out[key] = [...out[key], ...value];
      // Two ranges on the same number, "Level 3 or more" and "Level 6 or less", are one
      else if (record(value) && record(out[key])) out[key] = { ...out[key], ...value };
      else out[key] = value;
    }
  }
  return out;
}
