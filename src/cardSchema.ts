/**
 * Everything static about one card: its printed data (cards.cdb, decoded) and
 * what its script does. The reader writes one JSON file per card in this
 * format; this file is the only copy of it, and Sangan imports it from its
 * RML submodule (data/rml), so a card's data and its schema always come from
 * the same commit. Nothing here depends on a game state.
 *
 * Names are constant.lua's without their prefix (MZONE, SPECIAL_SUMMON...).
 * Alternate artworks have no entry of their own: a reader of the data places
 * them as their original.
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

// ---- printed data (cards.cdb, decoded) ----

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

// ---- card-wide rules from the script ----

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

// ---- summon methods ----

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
  /** "Choose 1 of these effects": each mode, with its own legality (Clown Crew Meteor's two) and when it is chosen. */
  modes: Mode[];
  /**
   * Paid to activate (level COST): the cost function's moves, and any move made as a cost
   * wherever the script makes it (REASON_COST, Duel.PayLPCost; some scripts pay in the target
   * function, so the cost can depend on the targets).
   */
  cost: Move[];
  /** Done on activation without being paid (level ON_ACTIVATION): a reveal, an effect set up for a later turn. */
  onActivation: Move[];
  /** What it does on resolution, in parts (levels EFFECT and SUBSEQUENT). */
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
  /**
   * For a NAME limit, which of the card's own counters: 0 for its number (id), n for id+n.
   * Effects on one counter share it ("only 1 of these effects per turn"); "each effect once per
   * turn" gives each its own.
   */
  counter: number;
  /** OATH ("activate"): a negated activation still counts. */
  oath: boolean;
}

/**
 * One mode of a "choose 1 of these effects". Its number is the script's: Duel.SelectOption
 * counts from 0, aux.SelectFromOptions from 1, option tables give their own, so a number means
 * something within its card only.
 */
export interface Mode {
  mode: number;
  description: number;
  legal: Condition[];
  /** ACTIVATION: the opponent knows it before responding. RESOLUTION: made once the chain has resolved down to it. */
  chosenOn: ModeChosenOn;
}

export type ModeChosenOn = "ACTIVATION" | "RESOLUTION";

/**
 * What stops a move, strongest first. COST and ON_ACTIVATION happen on activation, and only
 * "cannot activate" stops them; EFFECT happens on resolution, also stopped by negating the effect;
 * SUBSEQUENT happens only if an earlier part did, so it is also stopped by that part failing.
 * What is decided on activation (targets, modes) isn't a level: it does nothing itself, it picks
 * the branch the effect goes down.
 */
export type Level = "COST" | "ON_ACTIVATION" | "EFFECT" | "SUBSEQUENT";

/**
 * How a part of a resolution follows the parts before it, from two facts of the script: whether
 * a Duel.BreakEffect() comes between them (sequential) and whether the part sits under a check on
 * what an earlier part did (dependent). AND_IF_YOU_DO: dependent, at the same time. THEN:
 * dependent, after. ALSO_AFTER_THAT: independent, after. AND: independent, at the same time.
 * OTHERWISE: instead of an earlier part, when that part's check fails (if ... else).
 */
export type Link = "AND_IF_YOU_DO" | "THEN" | "ALSO_AFTER_THAT" | "AND" | "OTHERWISE";

/**
 * One part of what an effect does on resolution: a new part starts where its checks add "you
 * can", a mode, or a check on what an earlier part did, or where a Duel.BreakEffect() comes
 * between it and what was done before.
 */
export interface Part {
  part: number;
  /** How it follows the parts before it; null for the first part, of the resolution or of its mode. */
  link: Link | null;
  level: Extract<Level, "EFFECT" | "SUBSEQUENT">;
  /** "You can": the player decides on resolution. */
  optional: boolean;
  /** Only in this mode (modes[].mode). */
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
  | "NORMAL_SUMMON"
  | "SET"
  | "PLACE"
  | "RETURN_TO_FIELD"
  | "TO_HAND"
  | "TO_GRAVE"
  | "TO_DECK"
  | "TO_EXTRA_FACEUP"
  | "BANISH"
  | "DESTROY"
  | "TRIBUTE"
  | "DISCARD"
  | "DETACH"
  | "ATTACH"
  | "EQUIP"
  | "TAKE_CONTROL"
  | "SWAP_CONTROL"
  | "CHANGE_POSITION"
  | "REVEAL"
  | "DRAW"
  | "DAMAGE"
  | "GAIN_LP"
  | "PAY_LP"
  | "SET_LP"
  | "ADD_COUNTER"
  | "REMOVE_COUNTER"
  | "NEGATE_ACTIVATION"
  | "NEGATE_EFFECT"
  | "NEGATE_ON_CHAIN"
  | "NEGATE_ATTACK"
  | "CHANGE_ATTACK_TARGET"
  | "ATTACK_AGAIN"
  | "TOSS_COIN"
  | "ROLL_DIE"
  /** A continuous "this card targets that card" link, as Call of the Haunted keeps. */
  | "KEEP_TARGETING"
  /** A Spell or Trap that stays on the field once it has resolved. */
  | "STAYS_ON_FIELD"
  /** An effect given to cards (a negation, an ATK change, a destruction later). */
  | "GIVE_EFFECT"
  /** An effect given to a player (a restriction, something to happen at a later phase). */
  | "PLAYER_EFFECT";

/**
 * How a move's cards were picked. TARGETED: on activation, and it targets. CHOSEN: on
 * resolution, without targeting. ALL: every card that matches, with no choice. EVENT_CARDS: the
 * cards the event was about. CHAIN_LINK: the effect responded to, or its card.
 */
export type Pick = "THIS_CARD" | "TARGETED" | "CHOSEN" | "RANDOM" | "ALL" | "EVENT_CARDS" | "CHAIN_LINK" | "DECK_TOP";

export interface Move {
  move: MoveName;
  count: Count;
  /** null for a move with no card (a draw, damage: see player), or cards picked some way no rule knows. */
  pick: Pick | null;
  /** Who picks, when it isn't the player of the effect ("your opponent chooses"). */
  by: Side | null;
  /** Names one card used by several moves (the card Rhapsodia of Madness negates and gives three effects to). */
  ref: string | null;
  side: Side | null;
  places: Place[];
  card: CardFilter | null;
  /** DRAW, DAMAGE, GAIN_LP, PAY_LP, SET_LP, ADD_COUNTER...: how much. */
  amount: number | null;
  player: Side | null;
  position: string | null;
  summonType: string | null;
  zones: string[];
  /** TO_DECK: SHUFFLE, TOP or BOTTOM. */
  deckPlace: string | null;
  /** How long a GIVE_EFFECT or PLAYER_EFFECT lasts. */
  until: string[];
  /** GIVE_EFFECT and PLAYER_EFFECT (Mirrorjade's End Phase destruction): the effect, read the same way. */
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

// ---- cards and places ----

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

// ---- conditions: never part of the vacuum value, stored as JSON ----

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
