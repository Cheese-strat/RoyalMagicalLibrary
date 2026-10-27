import { names } from "../constants.js";
import type { Library } from "../library.js";
import { scriptFunctions, type FunctionDeclaration } from "../lua.js";

/** A record of what the reader found. Keys are UPPER_CASE; values are text, numbers, lists or more records. */
export type Flags = Record<string, any>;

/** What the reader keeps while it reads one effect, from its cost and target into its operation. */
export interface EffectState {
  /** What the cost stored with e:SetLabel. */
  label: Flags;
  /** The card the target function targeted. */
  target: Flags;
  /** The chain's target player and parameter (Duel.SetTargetPlayer, Duel.SetTargetParam). */
  chainPlayer: Flags;
  chainParam: Flags;
  /** How many cards the effect has picked so far, to number their ids. */
  picks: number;
}

export const newEffectState = (): EffectState => ({
  label: { EXPR: "label" },
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
}

export function cardContext(library: Library, code: number): CardContext {
  return {
    library,
    code,
    functions: scriptFunctions(library.script(`c${code}.lua`), code),
    strings: library.cardStrings(code),
    effect: newEffectState(),
  };
}

/** The Duel functions that do something to cards or players, and the action name a record gives each. */
export const DUEL_ACTIONS: Record<string, string> = {
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
export const CARD_ACTIONS: Record<string, string> = {
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

/** A flag's id: usually the card's own number, or one made from it ("id+o*2"). */
export function flagName(context: CardContext, text: string) {
  return isOwnCode(context, text) ? "THIS_CARD" : text.replace(/^id\b/, "THIS_CARD");
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

/** When a created effect or flag ends. RESETS_STANDARD means when the card leaves the field or is flipped face-down. */
export function resetFlags(expression: string) {
  const parts = expression.split(/[+|-]/).map((part) => part.trim());
  const out: string[] = [];
  if (parts.includes("RESETS_STANDARD")) {
    out.push(expression.includes("-RESET_TOFIELD") ? "LEAVES_FIELD_EXCEPT_TO_FIELD" : "LEAVES_FIELD_OR_FLIPS");
  }
  if (parts.includes("RESET_PHASE")) {
    out.push(...parts.filter((part) => part.startsWith("PHASE_")).map((part) => `${part.slice(6)}_PHASE`));
  }
  if (parts.includes("RESET_CHAIN")) out.push("CHAIN_END");
  const read = ["RESET_EVENT", "RESETS_STANDARD", "RESET_PHASE", "RESET_CHAIN", "RESET_TOFIELD"];
  out.push(...parts.filter((part) => !read.includes(part) && !part.startsWith("PHASE_")));
  return out;
}

/** Merges records; lists under the same key are joined, and records under the same key merged. */
export function merge(...parts: Flags[]): Flags {
  const out: Flags = {};
  const record = (x: unknown) => x && typeof x === "object" && !Array.isArray(x);
  for (const part of parts) {
    for (const [key, value] of Object.entries(part)) {
      if (Array.isArray(value) && Array.isArray(out[key])) out[key] = [...out[key], ...value];
      // Two ranges on the same number, "Level 3 or more" and "Level 6 or less", are one
      else if (record(value) && record(out[key])) out[key] = { ...out[key], ...value };
      else out[key] = value;
    }
  }
  return out;
}
