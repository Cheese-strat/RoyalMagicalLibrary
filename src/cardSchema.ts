/**
 * Everything static about one card: its printed data (cards.cdb, decoded) and
 * what its script does. The reader writes one JSON file per card in this
 * format; this file is the only copy of it, and Sangan imports it from its
 * RML submodule (data/rml), so a card's data and its schema always come from
 * the same commit. Nothing here depends on a game state.
 *
 * A field with nothing in it (an empty list, or null) is left out, so every
 * field of the schema that can be one is optional: absent is empty, or none.
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
  summons?: SummonMethod[];
  effects?: EffectSchema[];
  /** Which reader built this (RML's commit), and from which script (sha256 of its bytes, hex), so a rebuild only redoes changed cards. */
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
  types?: string[];
  /** Spells and Traps only. */
  spellTrap?: SpellTrapType;
  monster?: PrintedMonster;
  /** Archetype codes (setcode, up to 4). Matching follows ocgcore's IsSetCard, so "Sky Striker Ace" (0x1115) is also "Sky Striker" (0x115). */
  archetypes?: number[];
}

export interface PrintedMonster {
  frame: MonsterFrame;
  abilities?: MonsterAbility[];
  attribute: string;
  race: string;
  /** Exactly one of level, rank and link is set, by frame. */
  level?: number;
  rank?: number;
  link?: number;
  /** null is "?" (cards.cdb stores -2). */
  atk?: number;
  /** null is "?", and always null for Link Monsters (cards.cdb stores their markers there). */
  def?: number;
  linkMarkers?: LinkMarker[];
  /** Pendulum Scales (packed into cards.cdb's level). */
  scales?: { left: number; right: number };
}

// ---- card-wide rules from the script ----

export interface CardRules {
  /** EnableReviveLimit: must first be summoned properly before it can be revived. */
  mustBeProperlySummoned: boolean;
  /** Cannot be Normal Summoned or Set (EFFECT_CANNOT_SUMMON, EFFECT_CANNOT_MSET, TYPE_SPSUMMON). */
  cannotNormalSummon: boolean;
  /** SetUniqueOnField: only one face-up on the field, on whose field (BOTH: on either). */
  onlyOne?: { side: Side };
  /** How often the card can be Special Summoned, across methods (SetSPSummonOnce, or the flag idiom Artmage Non-Finito uses). */
  summonLimit?: Limit;
  /** Counters it can hold (EnableCounterPermit). */
  counters?: number[];
}

// ---- summon methods ----

export type SummonMethodName =
  "NORMAL" | "TRIBUTE" | "FUSION" | "SYNCHRO" | "XYZ" | "LINK" | "RITUAL" | "PENDULUM" | "PROCEDURE";

export interface SummonMethod {
  method: SummonMethodName;
  /** Where the card is Summoned from (a procedure's range; the hand for a Normal or Tribute Summon). */
  from?: Place[];
  /** Fusion, Synchro, Xyz, Link, Ritual: what it is made of. */
  materials?: Material[];
  /** A procedure's own cost (Artmage Non-Finito: discard 1 Spell/Trap, Tribute 1 Level 7 or higher "Artmage" monster). */
  cost?: Move[];
  requires?: Condition[];
  unread?: Unread[];
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
  /** Its order among the card's registered effects, from 1 (the effects Sangan's ocgcore registers, in the same order). */
  index: number;
  kind: EffectKind;
  /** Registered by an aux summon procedure (aux.AddXyzProcedure...): what it does is the card's summons, not read here. */
  fromProcedure: boolean;
  /** A trigger or Quick Effect that must be used (_F). */
  mandatory: boolean;
  /** Spell Speed 1-3, null for effects that aren't activated. */
  speed?: 1 | 2 | 3;
  /** What it responds to (FREE_CHAIN, SUMMON_SUCCESS, PHASE_END...); null for CONTINUOUS. */
  event?: string;
  /** A trigger on this card's own event (SINGLE), or on any card's (FIELD). */
  eventOf?: "SELF" | "ANY";
  /** Where it works from (its range); empty is wherever the card is. */
  from?: Place[];
  limit?: Limit;
  targets: boolean;
  /** EFFECT_FLAG_: DAMAGE_STEP, DELAY (an "if" trigger, which doesn't miss timing), CANNOT_DISABLE, CANNOT_NEGATE, UNCOPYABLE... */
  flags?: string[];
  /** The phases and moments ocgcore offers it at (SetHintTiming): when the search sees it. */
  offered: { own: string[]; opponent: string[] };
  /** Its text as a card string id (code * 16 + k): option labels name it. null when it has none. */
  description?: number;
  /** What it says it does (SetCategory). */
  categories?: string[];
  /** What it tells responders it will do (SetOperationInfo): what Ash Blossom and Ghost Belle read. */
  declares?: Declared[];
  /** "Choose 1 of these effects": each mode, with its own legality (Clown Crew Meteor's two) and when it is chosen. */
  modes?: Mode[];
  /**
   * Paid to activate (level COST): the cost function's moves, and any move made as a cost
   * wherever the script makes it (REASON_COST, Duel.PayLPCost; some scripts pay in the target
   * function, so the cost can depend on the targets).
   */
  cost?: Move[];
  /** Done on activation without being paid (level ON_ACTIVATION): a reveal, an effect set up for a later turn. */
  onActivation?: Move[];
  /** What it does when it resolves, or when its event happens, in parts (levels EFFECT and SUBSEQUENT). */
  does?: Part[];
  /** While a CONTINUOUS effect applies: what it does. */
  applies?: Applied[];
  /** Its condition, kept apart: not part of the vacuum value. */
  requires?: Condition[];
  /** Its activation checks (chk==0), kept apart the same way. */
  legal?: Condition[];
  /** What the reader or the conversion couldn't read: the effect is fully read when this is empty. */
  unread?: Unread[];
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
  /** Its text as a string id, null when the script builds it in a way not read. */
  description?: number;
  legal?: Condition[];
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
  link?: Link;
  level: Extract<Level, "EFFECT" | "SUBSEQUENT">;
  /** "You can": the player decides on resolution. */
  optional: boolean;
  /** Only in this mode (modes[].mode). */
  mode?: number;
  /** What every move of the part needs, besides its "you can" and its mode. */
  requires?: Condition[];
  moves?: Move[];
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
  /** The cards it moves: a pick of the effect (cards), or cards it names (this card, the event's cards...). null for a move with no card (a draw, damage: see player). */
  cards?: CardRef;
  /** null for a move with no card, or cards picked some way no rule knows. */
  pick?: Pick;
  /** Who picks, when it isn't the player of the effect ("your opponent chooses"). */
  by?: Side;
  /** How many cards the pick takes; ALL for every card of a group. */
  count?: Count;
  /** Where the pick takes them from, and what they must be. */
  from?: Places;
  card?: CardFilter;
  /** EQUIP, ATTACH, KEEP_TARGETING: the card it goes to or keeps. FUSION_SUMMON: its materials. */
  to?: CardRef;
  /** DRAW, DAMAGE, GAIN_LP, PAY_LP, SET_LP, ADD_COUNTER...: how much, when it is a number. */
  amount?: number;
  /** DRAW, DAMAGE, GAIN_LP...: which player. REVEAL: who is shown. */
  player?: Side;
  /** REASON_: COST, EFFECT, DISCARD, MATERIAL... */
  reasons?: string[];
  position?: string[];
  summonType?: string[];
  zones?: string[];
  /** TO_DECK: DECKSHUFFLE, DECKTOP or DECKBOT. */
  deckPlace?: string[];
  counter?: string;
  /** GIVE_EFFECT and PLAYER_EFFECT (Mirrorjade's End Phase destruction): the effect, read the same way, and how long it lasts. */
  effect?: EffectSchema;
  until?: string[];
  /** What this move needs besides its part's. */
  requires?: Condition[];
}

export interface Applied {
  /** The EFFECT_ it applies (CANNOT_DIRECT_ATTACK, UPDATE_ATTACK...). */
  effect: string;
  /** What it reaches: this card (SINGLE), the monster it equips (EQUIP), cards in places (FIELD), or players. */
  to: "THIS_CARD" | "EQUIPPED_MONSTER" | { places: Places } | { players: Side };
  /** The cards it applies to among those, when it doesn't reach every one. */
  cards?: CardFilter;
  /** A number (UPDATE_ATTACK 500), a constant (RESET_TURN_SET; LOCATION_REMOVED, where a card goes instead), or the cards its value lets through (Rhapsodia: attacks on the centre only). */
  value?: number | string | CardFilter;
  /** Checks of its value or target function that aren't about a card (an immunity's: the kind of effect it is immune to). */
  requires?: Condition[];
}

export interface Declared {
  category: string;
  count?: Count;
  cards?: CardRef;
  places?: Place[];
  amount?: number;
  possible: boolean;
  requires?: Condition[];
}

// ---- cards and places ----

export type Side = "OWN" | "OPPONENT" | "BOTH";
export type Place =
  "HAND" | "MZONE" | "SZONE" | "FZONE" | "PZONE" | "GRAVE" | "REMOVED" | "DECK" | "EXTRA" | "OVERLAY" | "ONFIELD";
/** Places on each side, from the effect's player's point of view. */
export interface Places {
  own?: Place[];
  opponent?: Place[];
}
export type Count = { min: number; max: number } | "ALL";

/** Inclusive: min 5 is 5 or more. is: one of these; not: none of these. A field left out checks nothing. */
export interface Range {
  min?: number;
  max?: number;
  is?: number[];
  not?: number[];
}

/** The numbers of a card a filter can check. */
export type CardNumber =
  | "LEVEL"
  | "RANK"
  | "LINK"
  | "ATTACK"
  | "DEFENSE"
  | "BASE_ATTACK"
  | "BASE_DEFENSE"
  | "PRINTED_ATTACK"
  | "PRINTED_DEFENSE"
  | "MATERIALS"
  | "SEQUENCE";

/**
 * What a card has to be. Every field present is a check, ANDed with the others; a field left out
 * checks nothing, so {} is any card. A list of alternatives (types, attributes, places...) is any
 * one of them; allOf holds further checks of the same kind that must hold too, anyOf is an OR of
 * filters, none the filters it must fail.
 */
export interface CardFilter {
  /** Any of these TYPE_ flags (IsType). */
  types?: string[];
  /** All of these (IsAllTypes). */
  allTypes?: string[];
  /** Exactly these (GetType()==). */
  exactTypes?: string[];
  fusionTypes?: string[];
  /** Archetype codes. Matching follows ocgcore's IsSetCard, so "Sky Striker Ace" (0x1115) is also "Sky Striker" (0x115). */
  archetypes?: number[];
  fusionArchetypes?: number[];
  /** Any of these card numbers. */
  names?: number[];
  /** Its text mentions one of these (aux.IsCodeListed). */
  mentions?: number[];
  /** It lists one of these as material (aux.IsMaterialListCode). */
  listsAsMaterial?: number[];
  attributes?: string[];
  races?: string[];
  numbers?: Partial<Record<CardNumber, Range>>;
  /** Where it is, and where it was. */
  places?: Place[];
  wasIn?: Place[];
  positions?: string[];
  wasPositions?: string[];
  /** What can be done with it: HAND, GRAVE, GRAVE_AS_COST, REMOVE, SPECIAL_SUMMON, DISCARD, TRIBUTE, SET, TARGET, NEGATE, CHANGE_POSITION, FUSION_MATERIAL, XYZ_SUMMON_NOW... */
  able?: string[];
  /** What it is now: FACEUP, FACEDOWN, NEGATED, REVEALED, FORBIDDEN, IN_BATTLE, LINKED, STILL_ON_CHAIN, IMMUNE_TO_THIS, ONLY_ONE_ALLOWS, HAS_FUSION_MATERIALS, NOT_SELF, LEAVES_FREE_MZONE... */
  states?: string[];
  controller?: Side;
  wasController?: Side;
  summonedBy?: string[];
  summonedFrom?: Place[];
  summonedByPlayer?: Side;
  /** Why it moved (IsReason): DESTROY, BATTLE, EFFECT... */
  reasons?: string[];
  statuses?: string[];
  /** Effects on it (IsHasEffect). */
  hasEffects?: string[];
  /** Flags earlier effects put on it: set or not. */
  flags?: { flag: string; set: boolean }[];
  counters?: string[];
  /** Other cards it needs (Rhapsodia's cost: an "Elfnote" in the GY with another Attribute). */
  needs?: Need[];
  /** Comparisons with another card of the same effect (its original Attribute differs from the cost's...). */
  relations?: { property: string; differsFrom: CardRef }[];
  /** A filter another card's effect gives (Chain Material's), which it must pass too. */
  passes?: CardRef[];
  allOf?: CardFilter[];
  anyOf?: CardFilter[];
  none?: CardFilter[];
  unread?: string[];
}

/** At least count cards that match, in places. */
export interface Need {
  count: number;
  from: Places;
  card: CardFilter;
  targetable: boolean;
}

/**
 * A card or cards an effect works with. ref: a pick of the effect, by the reader's id (CHOSEN1,
 * TARGET), with cards added or taken away. who: cards it names. cards: several of those together.
 */
export type CardRef =
  | { ref: string; plus?: CardRef[]; minus?: CardRef[] }
  | { who: Who; of?: CardRef }
  | { cards: CardRef[] }
  | { token: number }
  | { deckTop: { player?: Side; count?: number } }
  | { unread: string };

export type Who =
  | "THIS_CARD"
  | "EVENT_CARDS"
  | "CHAIN_LINK"
  | "CHAIN_LINK_CARD"
  | "ATTACKER"
  | "ATTACK_TARGET"
  | "BATTLE_TARGET"
  | "EQUIPPED_MONSTER"
  | "CARD_IT_TARGETS"
  | "MOVED_BY_LAST_STEP"
  | "TRIBUTABLE"
  | "FUSION_MATERIALS"
  | "CHAIN_MATERIAL"
  | "CHAIN_MATERIAL_MATERIALS"
  | "LABEL_OBJECT"
  | "CARD_IN_ZONE"
  | "CHECKED_CARD"
  /** of: the Xyz Monster whose materials they are. */
  | "MATERIALS_OF"
  /** of: the group, the highest or lowest by a number. */
  | "HIGHEST"
  | "LOWEST";

// ---- conditions: never part of the vacuum value, stored as JSON ----

/** What a count counts, for "at least". */
export type Counted =
  /** Cards of a group the effect holds. */
  | { cards: CardRef }
  /** Cards that match, in places (IsExistingMatchingCard, GetMatchingGroupCount). */
  | { matching: Need }
  | { freeZones: Places; forExtraDeck: boolean }
  /** Cards an earlier move of the effect moved (SUCCEEDED). */
  | { moved: MoveName }
  /** A coin's or die's result. */
  | { result: MoveName };

export type Condition =
  | { all?: Condition[] }
  | { any?: Condition[] }
  | { not: Condition }
  | { atLeast: number; of: Counted }
  | { exists: CardRef }
  | { is: { cards: CardRef; filter: CardFilter } }
  | { stillOnChain: CardRef }
  | { contains: { group: CardRef; card: CardRef } }
  | { oneOfEach: { in: CardRef; attributes?: string[] } }
  | { eventCards: { count: number; card: CardFilter } }
  | { turn: "OWN" | "OPPONENT" }
  /** The duel is in one of these phases (MAIN1, DAMAGE...). */
  | { phase: string[] }
  /** In the Damage Step, damage has been calculated. */
  | { damageCalculated: true }
  | {
      chainLink: {
        declares?: string[];
        /** Where the declared cards come from, for a declared category (Ash Blossom: a Special Summon from the Deck). */
        declaredFrom?: { category: string[]; places: Place[] };
        declaredCards?: { category: string[]; count: number; card: CardFilter };
        categories?: string[];
        types?: string[];
        effectTypes?: string[];
        negatable?: "EFFECT" | "ACTIVATION";
      };
    }
  | { chainLinks: number }
  | { player: { which: "REASON" | "EVENT"; is: Side } }
  | { playerFlag: { flag: string; set: boolean; player: "OWN" | "SUMMONING_PLAYER" } }
  | { playerAffectedBy: { player?: Side; effect: string } }
  | { canDraw: { player?: Side; count?: number } }
  | { necroValley: "DOESNT_APPLY" | "STOPS_IT" }
  /** Activated by paying its cost, not applied by another card copying it. */
  | { costChecked: true }
  /** The effect being of these EFFECT_TYPE_s (ACTIVATE: the card's own activation). */
  | { effectIs: string[] }
  | { summonType: string[] }
  | { mode: number }
  | { optional: true }
  /** Never holds (aux.FALSE: a card that can't be Special Summoned at all). */
  | { never: true }
  | { unread: string };

/** Something not read, kept as the script wrote it (or as the reader recorded it): a card is fully read when it has none. */
export interface Unread {
  role: "condition" | "cost" | "target" | "operation" | "value" | "summon";
  text: string;
}
