/**
 * Everything static about one card: its printed data (cards.cdb, decoded) and
 * what its script does.
 *
 * Nothing here depends on a game state or cares about conditional properties.
 *
 * Names are constant.lua's without their prefix (MZONE, SPECIAL_SUMMON...).
 * Alternate artworks have no entry of their own.
 */
export interface CardSchema {
  code: number;
  /** For reading only; nothing is decided by it. */
  name: string;
  printed: Printed;
  rules: CardRules;
  summons: SummonMethod[];
  effects: EffectSchema[];
  /** Which reader release built this, and from which script, so a rebuild only redoes changed cards. */
  source: { readerVersion: string; scriptHash: string };
}

export type CardKind = "MONSTER" | "SPELL" | "TRAP";
export type SpellTrapType = "NORMAL" | "QUICKPLAY" | "CONTINUOUS" | "EQUIP" | "FIELD" | "RITUAL" | "COUNTER";
export type MonsterFrame = "NORMAL" | "EFFECT" | "RITUAL" | "FUSION" | "SYNCHRO" | "XYZ" | "LINK" | "TOKEN";
export type MonsterAbility =
  "TUNER" | "PENDULUM" | "FLIP" | "GEMINI" | "UNION" | "SPIRIT" | "TOON" | "SPECIAL_SUMMON_ONLY";
export type LinkMarker =
  "BOTTOM_LEFT" | "BOTTOM" | "BOTTOM_RIGHT" | "LEFT" | "RIGHT" | "TOP_LEFT" | "TOP" | "TOP_RIGHT";

export interface Printed {
  kind: CardKind;
  /** Every TYPE_ flag the card has, for checks written against them (IsType). */
  types: string[];
  /** Spells and Traps only. */
  spellTrap: SpellTrapType | null;
  monster: PrintedMonster | null;
  /** Archetype codes (setcode, up to 4). Matching follows ocgcore's IsSetCard, so "Sky Striker Ace" (0x1115) is also "Sky Striker" (0x115). */
  archetypes: number[];
}

export interface PrintedMonster {
  frame: MonsterFrame;
  abilities: MonsterAbility[];
  attribute: string;
  race: string;
  /** Exactly one of level, rank and link is set, by frame. */
  level: number | null;
  rank: number | null;
  link: number | null;
  /** null is "?" (cards.cdb stores -2). */
  atk: number | null;
  /** null is "?", and always null for Link Monsters (cards.cdb stores their markers there). */
  def: number | null;
  linkMarkers: LinkMarker[];
  /** Pendulum Scales (packed into cards.cdb's level). */
  scales: { left: number; right: number } | null;
}

export interface CardRules {
  /** EnableReviveLimit: must first be summoned properly before it can be revived. */
  mustBeProperlySummoned: boolean;
  /** Cannot be Normal Summoned or Set (EFFECT_CANNOT_SUMMON, EFFECT_CANNOT_MSET, TYPE_SPSUMMON). */
  cannotNormalSummon: boolean;
  /** SetUniqueOnField: only one face-up on the field, for whom. */
  onlyOne: { side: Side } | null;
  /** How often the card can be Special Summoned, across methods (SetSPSummonOnce, or the flag idiom Artmage Non-Finito uses). */
  summonLimit: Limit | null;
  /** Counters it can hold (EnableCounterPermit). */
  counters: number[];
}

export type SummonMethodName =
  "NORMAL" | "TRIBUTE" | "FUSION" | "SYNCHRO" | "XYZ" | "LINK" | "RITUAL" | "PENDULUM" | "PROCEDURE";

export interface SummonMethod {
  method: SummonMethodName;
  from: Place[];
  /** Fusion, Synchro, Xyz, Link, Ritual: what it is made of. */
  materials: Material[];
  /** A procedure's own cost (Artmage Non-Finito: discard 1 Spell/Trap, Tribute 1 Level 7 or higher "Artmage" monster). */
  cost: Move[];
  requires: Condition[];
  unread: Unread[];
}

export interface Material {
  count: Count;
  role: "ANY" | "TUNER" | "NON_TUNER";
  card: CardFilter;
}

// ---- effects ----

/** ACTIVATE is a Spell/Trap's own activation; CONTINUOUS applies without being activated; AUTO happens on an event without a chain (a continuous effect with an operation). */
export type EffectKind = "ACTIVATE" | "IGNITION" | "QUICK" | "TRIGGER" | "FLIP" | "CONTINUOUS" | "AUTO";

export interface EffectSchema {
  /** Its order among the card's registered effects. */
  index: number;
  kind: EffectKind;
  /** A trigger or Quick Effect that must be used (_F). */
  mandatory: boolean;
  /** Spell Speed 1-3, null for effects that aren't activated. */
  speed: 1 | 2 | 3 | null;
  /** What it responds to (FREE_CHAIN, SUMMON_SUCCESS, PHASE_END...); null for CONTINUOUS. */
  event: string | null;
  /** A trigger on this card's own event (SINGLE), or on any card's (FIELD). */
  eventOf: "SELF" | "ANY" | null;
  /** Where it works from (its range); empty is wherever the card is. */
  from: Place[];
  limit: Limit | null;
  targets: boolean;
  /** EFFECT_FLAG_: DAMAGE_STEP, DELAY (an "if" trigger, which doesn't miss timing), CANNOT_DISABLE, CANNOT_NEGATE, UNCOPYABLE... */
  flags: string[];
  /** The phases and moments ocgcore offers it at (SetHintTiming): when the search sees it. */
  offered: { own: string[]; opponent: string[] };
  /** Its text as a card string id: option labels name it. */
  description: number;
  /** What it says it does (SetCategory). */
  categories: string[];
  /** What it tells responders it will do (SetOperationInfo): what Ash Blossom and Ghost Belle read. */
  declares: Declared[];
  /** Choices made on activation, each with its own legality (Clown Crew Meteor's two). */
  modes: Mode[];
  cost: Move[];
  does: Part[];
  /** While a CONTINUOUS effect applies: what it does. */
  applies: Applied[];
  /** Its condition, kept apart: not part of the vacuum value. */
  requires: Condition[];
  /** Its activation checks (chk==0), kept apart the same way. */
  legal: Condition[];
  unread: Unread[];
}

export interface Limit {
  count: number;
  /** TWO_TURNS: not again the next turn (Mirrorjade the Iceblade Dragon). */
  per: "TURN" | "TWO_TURNS" | "DUEL" | "CHAIN" | "WHILE_FACE_UP";
  /** COPY: this copy only (soft). CARD: this copy's effects together. NAME: every copy (hard). Or another card's number it shares with. */
  shared: "COPY" | "CARD" | "NAME" | number;
  /** OATH ("activate"): a negated activation still counts. */
  oath: boolean;
}

export interface Mode {
  mode: number;
  description: number;
  legal: Condition[];
}

/** One part of what an effect does, split at "then" (BreakEffect) and "you can" (a yes/no). */
export interface Part {
  part: number;
  then: boolean;
  optional: boolean;
  /** "and if you do": only when that part happened. */
  afterPart: number | null;
  /** Only in this mode. */
  mode: number | null;
  moves: Move[];
  requires: Condition[];
}

export type MoveName =
  | "SPECIAL_SUMMON"
  | "FUSION_SUMMON"
  | "SYNCHRO_SUMMON"
  | "XYZ_SUMMON"
  | "LINK_SUMMON"
  | "RITUAL_SUMMON"
  | "NORMAL_SUMMON"
  | "TO_HAND"
  | "TO_GRAVE"
  | "TO_DECK"
  | "TO_EXTRA"
  | "BANISH"
  | "DESTROY"
  | "TRIBUTE"
  | "DISCARD"
  | "SET"
  | "PLACE"
  | "DRAW"
  | "DAMAGE"
  | "GAIN_LP"
  | "PAY_LP"
  | "DETACH"
  | "ATTACH"
  | "EQUIP"
  | "TAKE_CONTROL"
  | "CHANGE_POSITION"
  | "REVEAL"
  | "NEGATE_ACTIVATION"
  | "NEGATE_EFFECTS"
  | "CHANGE_ATK"
  | "CHANGE_DEF"
  | "CHANGE_LEVEL"
  | "GIVE_EFFECT"
  | "PLAYER_EFFECT"
  | "LATER";

export interface Move {
  move: MoveName;
  count: Count;
  who: "SELF" | "TARGET" | "CHOSEN" | "ALL" | "EVENT_CARDS" | "CHAIN_LINK" | "PLAYER";
  /** Names one card used by several moves (the card Rhapsodia of Madness negates and gives three effects to). */
  ref: string | null;
  side: Side | null;
  places: Place[];
  card: CardFilter | null;
  /** DRAW, DAMAGE, GAIN_LP, PAY_LP, CHANGE_ATK...: how much. */
  amount: number | null;
  player: Side | null;
  position: string | null;
  summonType: string | null;
  zones: string[];
  /** TO_DECK: SHUFFLE, TOP or BOTTOM. */
  deckPlace: string | null;
  /** How long a GIVE_EFFECT or PLAYER_EFFECT lasts. */
  until: string[];
  /** GIVE_EFFECT, PLAYER_EFFECT and LATER (Mirrorjade's End Phase destruction): the effect, read the same way. */
  effect: EffectSchema | null;
}

export interface Applied {
  /** The EFFECT_ it applies (CANNOT_DIRECT_ATTACK, UPDATE_ATTACK...). */
  effect: string;
  to: { side: Side; places: Place[] } | { player: Side };
  /** The cards it applies to among those, when it doesn't reach every one. */
  cards: CardFilter | null;
  /** A number (UPDATE_ATTACK 500), or the cards its value lets through (Rhapsodia: attacks on the centre only). */
  value: number | CardFilter | null;
}

export interface Declared {
  category: string;
  count: Count;
  side: Side | null;
  places: Place[];
  amount: number | null;
  possible: boolean;
}

export type Side = "OWN" | "OPPONENT" | "BOTH";
export type Place =
  "HAND" | "MZONE" | "SZONE" | "FZONE" | "PZONE" | "GRAVE" | "REMOVED" | "DECK" | "EXTRA" | "OVERLAY" | "ONFIELD";
export type Count = { min: number; max: number } | "ALL";

export interface Range {
  min: number | null;
  max: number | null;
  is: number[];
}

/** What a card has to be. Every key is a check ANDed with the others; anyOf is an OR. An empty filter is any card. */
export interface CardFilter {
  types: string[];
  notTypes: string[];
  archetypes: number[];
  notArchetypes: number[];
  names: number[];
  notNames: number[];
  attributes: string[];
  races: string[];
  level: Range | null;
  rank: Range | null;
  link: Range | null;
  atk: Range | null;
  def: Range | null;
  faceUp: boolean | null;
  positions: string[];
  /** IsAbleToHand, IsAbleToGraveAsCost, IsCanBeSpecialSummoned, IsDiscardable...: GRAVE, GRAVE_AS_COST, HAND, SPECIAL_SUMMON... */
  able: string[];
  summonedBy: string[];
  /** Other cards it needs (Rhapsodia's cost: an "Elfnote" in the GY with another Attribute). */
  needs: {
    count: number;
    side: Side;
    places: Place[];
    card: CardFilter;
    targetable: boolean;
  }[];
  /** Comparisons with another card of the same effect (its original Attribute differs from the cost's...). */
  relations: { property: string; same: boolean; as: string }[];
  anyOf: CardFilter[];
  unread: string[];
}

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | {
      control: { side: Side; places: Place[]; count: number; card: CardFilter };
    }
  | { thisCard: CardFilter }
  | { turn: "OWN" | "OPPONENT" }
  | { phase: string[] }
  | {
      chainLink: {
        declares?: string[];
        from?: Place[];
        categories?: string[];
        negatable?: "EFFECT" | "ACTIVATION";
        by?: Side;
      };
    }
  | { eventCards: { count: number; card: CardFilter } }
  | { unread: string };

/** Something the reader couldn't turn into the schema, kept as the script wrote it: a card is fully read when it has none. */
export interface Unread {
  role: "condition" | "cost" | "target" | "operation" | "value" | "summon";
  line: number;
  text: string;
}
