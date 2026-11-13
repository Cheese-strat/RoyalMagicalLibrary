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
  /** In order: the effects ocgcore registers, in the same order, then the held ones. */
  effects?: EffectSchema[];
  /** Which reader built this (RML's commit), and from which script (sha256 of its bytes, hex), so a rebuild only redoes changed cards. */
  source: { readerVersion: string; scriptHash: string };
}

// ---- printed data (cards.cdb, decoded) ----

export type CardKind = "MONSTER" | "SPELL" | "TRAP";
export type SpellType =
  | "NORMAL"
  | "QUICKPLAY"
  | "CONTINUOUS"
  | "EQUIP"
  | "FIELD"
  | "RITUAL";
export type TrapType = "NORMAL" | "CONTINUOUS" | "COUNTER";
export type MonsterFrame =
  | "NORMAL"
  | "EFFECT"
  | "RITUAL"
  | "FUSION"
  | "SYNCHRO"
  | "XYZ"
  | "LINK"
  | "TOKEN";
export type MonsterAbility =
  | "TUNER"
  | "PENDULUM"
  | "FLIP"
  | "GEMINI"
  | "UNION"
  | "SPIRIT"
  | "TOON"
  | "SPECIAL_SUMMON_ONLY";
export type LinkMarker =
  | "BOTTOM_LEFT"
  | "BOTTOM"
  | "BOTTOM_RIGHT"
  | "LEFT"
  | "RIGHT"
  | "TOP_LEFT"
  | "TOP"
  | "TOP_RIGHT";

/** A card's printed data, by its kind: checking kind narrows it, so a Spell has a SpellType and a Monster its frame. */
export type Printed = PrintedSpell | PrintedTrap | PrintedMonster;

/** What every kind of card has printed. */
interface PrintedCard {
  kind: CardKind;
  /** Archetype codes (setcode, up to 4). Matching follows ocgcore's IsSetCard, so "Sky Striker Ace" (0x1115) is also "Sky Striker" (0x115). */
  archetypes?: number[];
}

export interface PrintedSpell extends PrintedCard {
  kind: "SPELL";
  subType: SpellType;
}

export interface PrintedTrap extends PrintedCard {
  kind: "TRAP";
  subType: TrapType;
}

export interface PrintedMonster extends PrintedCard {
  kind: "MONSTER";
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
  /** Flavor text (Normal Monsters, Tokens, a Normal Pendulum's monster section): kept as printed, never read into effects. */
  flavor?: string;
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
  /**
   * What other cards' checks know it by, besides its printed data: the cards its text mentions (aux.IsCodeListed; YGOPro's
   * aux.AddCodeList, EDOPro's s.listed_names), the archetypes of monsters it mentions (aux.IsSetNameMonsterListed;
   * aux.AddSetNameMonsterList, s.listed_series), the cards and archetypes it names as material (aux.IsMaterialListCode,
   * aux.IsMaterialListSetCard; aux.AddMaterialCodeList and material_setcode, s.material and s.material_setcode), and the
   * counters it places and mentions (aux.IsCounterAdded; counter_add_list and mentioned_counter, s.counter_place_list and
   * s.counter_list). What a summon procedure records of its own materials isn't here: its summons say it.
   */
  listed?: Listed;
  /**
   * Data its script gives the card for other scripts to read that no rule describes yet, as written (lvup={74713516});
   * and what the engine reported going wrong setting the card up ("the engine stopped: ..."), after which its effects may be missing.
   */
  unread?: string[];
}

export interface Listed {
  mentions?: number[];
  mentionsArchetypes?: number[];
  materials?: number[];
  materialArchetypes?: number[];
  countersPlaced?: number[];
  countersMentioned?: number[];
}

// ---- summon methods ----

export type SummonMethodName =
  | "NORMAL"
  | "TRIBUTE"
  | "FUSION"
  | "SYNCHRO"
  | "XYZ"
  | "LINK"
  | "RITUAL"
  | "PENDULUM"
  | "PROCEDURE";

/**
 * A way the card is summoned. NORMAL and TRIBUTE are the Normal Summon the
 * rules give it, or one of its own procedures (SUMMON_PROC: K9-17 Izuna's
 * without Tributing; LIMIT_SUMMON_PROC, then its only one); PROCEDURE is a
 * Special Summon procedure of its own (SPSUMMON_PROC: Cyber Dragon's).
 */
export interface SummonMethod {
  method: SummonMethodName;
  /** Where the card is Summoned from (a procedure's range; the hand for a Normal or Tribute Summon). */
  from?: Place[];
  /** Tribute, Fusion, Synchro, Xyz, Link, Ritual: what it is made of, from its player's Monster Zone for a Tribute, Synchro, Xyz or Link Summon. */
  materials?: Material[];
  /** Other places its Tributes can come from, and when (ADD_EXTRA_TRIBUTE: The Great Gallant Bandit's, the opponent's monsters while its player controls none). */
  extraMaterials?: ExtraMaterials[];
  /**
   * What making it does to cards besides its materials: a procedure's
   * operation, its cards as its target function picked them (Dark Magician
   * of Destruction banishes a Level 6 or higher DARK Spellcaster from its
   * player's field), and what the card's SPSUMMON_COST or SUMMON_COST
   * effects do (Lava Golem: its player can't Normal Summon this turn).
   */
  cost?: Move[];
  /** Fusion: a Fusion Substitute monster can be used in place of a material it names (the procedure's sub). */
  substitutes?: boolean;
  /** Fusion: it can be Fusion Summoned with no materials by an effect that allows it, like Instant Fusion's (the procedure's insf). */
  withoutMaterials?: boolean;
  /** A procedure's condition, without its "if c==nil" check and what its materials say (minc, Duel.CheckTribute). */
  requires?: Condition[];
  unread?: Unread[];
}

export interface Material {
  count: Count;
  role: "ANY" | "TUNER" | "NON_TUNER";
  card: CardFilter;
}

export interface ExtraMaterials {
  from: Places;
  requires?: Condition[];
}

// ---- effects ----

/** ACTIVATE is a Spell/Trap's own activation; CONTINUOUS applies without being activated; AUTO happens on an event without a chain (a continuous effect with an operation). */
export type EffectKind =
  | "ACTIVATE"
  | "IGNITION"
  | "QUICK"
  | "TRIGGER"
  | "FLIP"
  | "CONTINUOUS"
  | "AUTO";

export interface EffectSchema {
  kind: EffectKind;
  /** Never registered: kept in another effect's label object (the effect a GRANT gives the cards it reaches). */
  held?: true;
  /**
   * Registered for the duel by the card's setup (Duel.RegisterEffect), for a seat (0 or 1), not on the card: a
   * global check (Cloudcastle's notes which monsters were Normal Summoned). once: only the first copy of the
   * card registers it (if not s.global_check); otherwise each copy does. After the card's other effects.
   */
  global?: { seat: 0 | 1; once: boolean };
  /**
   * Registered by an aux call that RML describes elsewhere: a summon procedure (aux.AddXyzProcedure...),
   * whose effects are the card's summons, or a merged event's (aux.RegisterMergedDelayedEvent_ToSingleCard),
   * whose effect is the event of the effect waiting for it (merged). Not read here.
   */
  fromProcedure: boolean;
  /** Read into the card's summons too (a procedure of its own, what summoning it costs, Tributes from elsewhere): what it does to the card's summons is there, so a reader counts it once. */
  inSummons: boolean;
  /** A trigger or Quick Effect that must be used (_F). */
  mandatory: boolean;
  /** Spell Speed 1-3, null for effects that aren't activated. */
  speed?: 1 | 2 | 3;
  /** What it responds to (FREE_CHAIN, SUMMON_SUCCESS, PHASE_END during the End Phase, PHASE_START_DRAW at the start of the Draw Phase...), or MERGED (see merged); null for CONTINUOUS. */
  event?: string;
  /**
   * A MERGED event: the events it waits for (SPSUMMON_SUCCESS; TO_GRAVE and REMOVE), happening once for
   * all the cards they were about, after the chain they happened in resolves, rather than once for each.
   * perCard: only the cards since this card was last moved to a public place count (YGOPro's
   * aux.RegisterMergedDelayedEvent_ToSingleCard; without it, aux.RegisterMergedDelayedEvent).
   */
  merged?: { events: string[]; perCard: boolean };
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
  /**
   * What its condition does each time the game checks it, once it has worked out whether it holds
   * (Lightning Punisher's sets back to 0 the count it reads).
   */
  whenChecked?: Move[];
  /** Its activation checks (chk==0 in its target and operation), kept apart the same way. */
  legal?: Condition[];
  /**
   * Its cost's activation checks (chk==0 in SetCost), apart from legal: an effect activated without
   * paying its cost (copied by another card, say) skips them but not the others (Fortune Fairy Hikari's
   * cost only checks it isn't revealed).
   */
  costChecks?: Condition[];
  /**
   * What its label holds when it is made (see Memory): numbers (eN:SetLabel), and cards or another effect
   * (eN:SetLabelObject: Call of the Haunted's effect 3 reads effect 2's number through it). An effect made
   * while resolving can start with values worked out then (the field ID of the card it will return).
   * GROUP: a group the card makes for it to keep cards in, empty at first; another effect given the same
   * group keeps the first one's ({ memory }: Mirror Wall's three effects share one).
   */
  label?: Value[];
  labelObject?: CardRef | { effect: EffectRef } | "GROUP";
  /** What the reader or the conversion couldn't read: the effect is fully read when this is empty. */
  unread?: Unread[];
}

// ---- memory ----

/**
 * Where an effect keeps a value for later, as scripts keep them:
 * - effect: in an effect's label. Every effect has one, wherever the effect is (on this card, another
 *   card, a player) and for as long as the effect is: its NUMBER (e:SetLabel; one number, or several,
 *   at: which, from 0) and its OBJECT (e:SetLabelObject: cards, or an effect). Only scripts read labels.
 * - flag: a flag (RegisterFlagEffect) on cards or on a player, by its id: THIS_CARD (the card's own
 *   number), THIS_CARD+n (another of the card's own, by its number less the card's), another card's
 *   number, or a flag scripts share: FLAG_ID_CHAINING (aux.chainreg: this card's effect was activated
 *   in this chain), FLAG_ID_UNION, FLAG_ID_NO_NORMAL_DRAW, FLAG_ID_ALLURE_QUEEN, FLAG_ID_ARCANA_COIN,
 *   FLAG_ID_REVERSAL_OF_FATE. Any script can check one by its id: whether it is there, how many times it
 *   was put there, and the number it holds. Each lasts until something happens (Move.until).
 * A writer keeps each where it says, each engine's way, and links effects that read each other's labels.
 */
export type Memory =
  | { effect: EffectRef; slot: "NUMBER" | "OBJECT"; at?: number }
  | { flag: string };

/**
 * An effect: one of the card's effects by its place in them, from 1; THIS, the effect the function belongs to
 * (an effect made while resolving, which isn't one of them); CHAIN_LINK, the effect of the chain link
 * responded to, or that caused the event (re); or the effect a memory keeps (an effect's OBJECT).
 */
export type EffectRef = number | "THIS" | "CHAIN_LINK" | { memory: Memory };

/** A number worked out when it is needed. */
export type Value =
  | number
  /**
   * What a memory holds: an effect's number, or a flag's, on cards (on) or a player (player; the one summoning,
   * in a summon's check; or seat, see Move.seat); count: how many times the flag is there.
   */
  | {
      memory: Memory;
      on?: CardRef;
      player?: Side | "SUMMONING_PLAYER";
      seat?: 0 | 1;
      count?: true;
    }
  /** One of a card's numbers. */
  | { number: CardNumber; of: CardRef }
  /** How many counters of a kind are on a card. */
  | { counters: number; on: CardRef }
  /** How many there are of what a count counts: cards of a group, cards that match, free zones, cards a move moved. */
  | { countOf: Counted }
  /** A card's number (its name) as it is now, or as printed. */
  | { code: CardRef; original?: true }
  /** Which time a card is where it is (c:GetFieldID()): new each time it moves, so a card that left and came back isn't the same. */
  | { fieldId: CardRef }
  /** The turn, counted from 1 for the duel's first. */
  | { turn: true }
  /** How many links the chain has now. */
  | { chainLinks: true }
  /** A player's Life Points. */
  | { lifePoints: Side }
  /** 1 when these hold, 0 when they don't (c:IsDisabled() and 1 or 0). */
  | { holds: Condition[] }
  | { add: [Value, Value] }
  | { subtract: [Value, Value] }
  | { multiply: [Value, Value] }
  /** One divided by the other, rounded down or up (math.floor(atk/2), math.ceil(Duel.GetLP(tp)/2): "half, rounded up"). */
  | { divide: [Value, Value]; round: "DOWN" | "UP" }
  /** The smallest of these (math.min(ft,2): as many as there are free zones, at most 2), or the largest (math.max). */
  | { smallest: Value[] }
  | { largest: Value[] }
  /**
   * One value when these hold, another when they don't: a variable the script changes under an if
   * (local ft=Duel.GetLocationCount(tp,LOCATION_MZONE) if Duel.IsPlayerAffectedByEffect(tp,59822133) then ft=1 end).
   */
  | { when: Condition[]; then: Value; otherwise: Value }
  | { unread: string };

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
export type Link =
  | "AND_IF_YOU_DO"
  | "THEN"
  | "ALSO_AFTER_THAT"
  | "AND"
  | "OTHERWISE";

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
  | "PLAYER_EFFECT"
  /**
   * A value kept for later (memory): numbers, cards or an effect in an effect's label, or a flag put on
   * cards or a player, which later checks look for ("destroyed by battle", "activated this turn") and
   * which may hold a number.
   */
  | "REMEMBER"
  /** A flag taken off cards or a player before it would end, or cards an effect's label object keeps let go: those (cards), or all. */
  | "FORGET"
  /** What can be activated in response to this effect (canRespond), until the chain ends or for this chain link (until). */
  | "CHAIN_LIMIT"
  /** An effect ended before it would end (ended): the one making the move (e:Reset()), or one a memory keeps. */
  | "END_EFFECT"
  /** A player's Deck shuffled now (player), rather than when the game would shuffle it (Tainted Wisdom's whole effect). */
  | "SHUFFLE_DECK"
  /** The Deck isn't shuffled after the moves that follow take cards from it, as it would be (Duel.DisableShuffleCheck): cards excavated from its top leave the rest in order. */
  | "KEEP_DECK_ORDER"
  /** The Special Summons marked together since the last one done at once, as one Summon (Duel.SpecialSummonComplete). */
  | "SUMMONS_COMPLETE"
  /** The cards count as properly Summoned, so they can be Special Summoned again in spite of a revive limit (c:CompleteProcedure()). */
  | "PROPERLY_SUMMONED"
  /** The cards' materials are recorded as these (to), for checks of what they were Summoned with (c:SetMaterial(g)). */
  | "SET_MATERIALS"
  /** What has changed is applied now, rather than once the effect has resolved: to these cards (Duel.AdjustInstantly), or to all (ADJUST_ALL: Duel.AdjustAll). */
  | "ADJUST"
  | "ADJUST_ALL";

/**
 * How a move's cards were picked. TARGETED: on activation, and it targets. CHOSEN: on
 * resolution, without targeting. ALL: every card that matches, with no choice. EVENT_CARDS: the
 * cards the event was about. CHAIN_LINK: the effect responded to, or its card.
 */
export type Pick =
  | "THIS_CARD"
  | "TARGETED"
  | "CHOSEN"
  | "RANDOM"
  | "ALL"
  | "EVENT_CARDS"
  | "CHAIN_LINK"
  | "DECK_TOP";

export interface Move {
  move: MoveName;
  /**
   * The cards it moves: a pick of the effect (cards), or cards it names (this card, the event's cards...). null
   * for a move with no card (a draw, damage: see player). REMEMBER, FORGET: the cards a flag is put on or taken
   * off, or the cards an effect's label object keeps or lets go.
   */
  cards?: CardRef;
  /** null for a move with no card, or cards picked some way no rule knows. */
  pick?: Pick;
  /** Who picks, when it isn't the player of the effect ("your opponent chooses"); SPECIAL_SUMMON: who summons. */
  by?: Side;
  /** How many cards the pick takes; ALL for every card of a group. */
  count?: PickCount;
  /** Where the pick takes them from, and what they must be. */
  from?: Places;
  card?: CardFilter;
  /** EQUIP, ATTACH, KEEP_TARGETING: the card it goes to or keeps. FUSION_SUMMON: its materials. */
  to?: CardRef;
  /** DRAW, DAMAGE, GAIN_LP, PAY_LP, SET_LP, ADD_COUNTER...: how much: a number, or one worked out when it is made (a number kept, times 400). */
  amount?: Value;
  /**
   * DRAW, DAMAGE, GAIN_LP...: which player. REVEAL: who is shown. TO_HAND, TO_DECK: whose hand or
   * Deck, when not the cards' owner's. SPECIAL_SUMMON: whose field, when not the effect's player's.
   * REMEMBER, FORGET: the player a flag is put on or taken off.
   */
  player?: Side;
  /**
   * REMEMBER, FORGET a flag on a player by seat (0 or 1) rather than side: the same player whoever's effect it
   * is. A flag kept for the whole duel is on seat 0 (Red-Eyes Black Dragon Exceed's); a global check's flags
   * say what each seat did.
   */
  seat?: 0 | 1;
  /** REASON_: COST, EFFECT, DISCARD, MATERIAL... */
  reasons?: string[];
  position?: string[];
  summonType?: string[];
  zones?: string[];
  /** SPECIAL_SUMMON: what it ignores (SUMMON_CONDITIONS: "ignoring its Summoning conditions"; REVIVE_LIMIT: summoned before properly). */
  ignoring?: ("SUMMON_CONDITIONS" | "REVIVE_LIMIT")[];
  /** SPECIAL_SUMMON: done at the same time as the other Special Summons marked together, once SUMMONS_COMPLETE comes (Duel.SpecialSummonStep). */
  together?: true;
  /** TO_DECK: DECKSHUFFLE, DECKTOP or DECKBOT. */
  deckPlace?: string[];
  counter?: string;
  /** GIVE_EFFECT and PLAYER_EFFECT (Mirrorjade's End Phase destruction): the effect, read the same way, and how long it lasts. */
  effect?: EffectSchema;
  /**
   * GIVE_EFFECT, PLAYER_EFFECT, REMEMBER a flag: when it ends. The card's events: LEAVES_FIELD_OR_FLIPS
   * (RESETS_STANDARD: it leaves the field or is flipped face-down), LEAVES_FIELD (not flipping),
   * LEAVES_FIELD_EXCEPT_TO_FIELD, or each event by name (RESET_TOGRAVE...); a phase (END_PHASE,
   * STANDBY_PHASE...); CHAIN_END; and RESET_DISABLE, RESET_SELF_TURN, RESET_OPPO_TURN... by name.
   * Empty for one that never ends. CHAIN_LIMIT: CHAIN_END or THIS_CHAIN_LINK.
   */
  until?: string[];
  /** REMEMBER, FORGET: where. */
  memory?: Memory;
  /** REMEMBER: the numbers kept (an effect's: one, or several; a flag's: one). */
  numbers?: Value[];
  /** REMEMBER in an effect's OBJECT: an effect kept there (cards kept are its cards). */
  keptEffect?: EffectRef;
  /** END_EFFECT: the effect ended. */
  ended?: EffectRef;
  /** REMEMBER cards in an effect's OBJECT: added to the cards it keeps (a group it keeps), rather than kept in their place. */
  adding?: true;
  /** REMEMBER a flag: how many times what it lasts until must happen before it ends, when not once (END_PHASE 2: the end of the next turn). */
  times?: number;
  /** REMEMBER a flag: its EFFECT_FLAG_s (CLIENT_HINT: shown on the card, with description; OATH). */
  flags?: string[];
  /** REMEMBER a flag with CLIENT_HINT: the string shown on the card. */
  description?: number;
  /** CHAIN_LIMIT: NONE (nothing can be activated in response), or YOU (only the effect's player can respond). */
  canRespond?: "NONE" | "YOU";
  /** What this move needs besides its part's. */
  requires?: Condition[];
}

export interface Applied {
  /**
   * The EFFECT_ it applies (CANNOT_DIRECT_ATTACK, UPDATE_ATTACK...), or GRANT: the cards it reaches gain the
   * effect its label object holds, as their own (EFFECT_TYPE_GRANT: the Weather Painter's Canvases).
   */
  effect: string;
  /**
   * What it reaches: this card (SINGLE), the monster it equips (EQUIP), the Xyz Monster it is material of
   * (XMATERIAL), the cards it targets while it stays (TARGET: Spellbinding Circle), cards in places
   * (FIELD), players, or the duel itself (a field effect that reaches no card or player, looked up by its
   * effect: CANNOT_INACTIVATE, a card's own SPSUMMON_PROC).
   */
  to:
    | "THIS_CARD"
    | "EQUIPPED_MONSTER"
    | "ATTACHED_TO"
    | "CARD_IT_TARGETS"
    | "DUEL"
    | { places: Places }
    | { players: Side };
  /**
   * The cards it applies to among those, when it doesn't reach every one; for an effect that reaches one card,
   * the cards it is about (TUNER_MATERIAL_LIMIT: the Synchro Monsters this card can be material for).
   */
  cards?: CardFilter;
  /**
   * A number (UPDATE_ATTACK 500), a constant (RESET_TURN_SET; LOCATION_REMOVED, where a card goes instead),
   * the cards its value lets through (Rhapsodia: attacks on the centre only), or a number worked out as it applies:
   * times each one of something (computed), or any other number (value: what the effect's label holds, e:GetLabel()).
   * fixed: a number worked out once, as an effect made while resolving is made (e1:SetValue(atk): the ATK the target
   * had then), by the effect making it.
   */
  value?:
    | number
    | string
    | CardFilter
    | { computed: Computed }
    | { value: Value }
    | { fixed: Value };
  /** Checks of its value or target function that aren't about a card (an immunity's: the kind of effect it is immune to). */
  requires?: Condition[];
}

/**
 * A number worked out each time it applies: times each one of what it
 * counts, or times one of a card's numbers. Deskbot 005 gains 500 for each
 * "Deskbot" card in its controller's Extra Deck; Slifer the Sky Dragon 1000
 * for each card in its controller's hand.
 */
export interface Computed {
  times: number;
  per: Per;
}

export type Per =
  /**
   * Cards that match, in places from the effect's player's point of view, or from the point of
   * view of the controller of the card it applies to (ofAffectedController: c:GetControler()).
   */
  | {
      matching: {
        from: Places;
        card: CardFilter;
        ofAffectedController: boolean;
      };
    }
  /** One of a card's numbers: its Level, its ATK, how many materials it has... */
  | { number: CardNumber; of: CardRef }
  /** How many counters of this kind are on a card. */
  | { counters: number; on: CardRef };

export interface Declared {
  category: string;
  /** How many cards: a number, or one worked out (as a pick's bounds, the same both ways). */
  count?: PickCount;
  cards?: CardRef;
  places?: Place[];
  amount?: Value;
  possible: boolean;
  requires?: Condition[];
}

// ---- cards and places ----

export type Side = "OWN" | "OPPONENT" | "BOTH";
export type Place =
  | "HAND"
  | "MZONE"
  | "SZONE"
  | "FZONE"
  | "PZONE"
  | "GRAVE"
  | "REMOVED"
  | "DECK"
  | "EXTRA"
  | "OVERLAY"
  | "ONFIELD";
/** Places on each side, from the effect's player's point of view. */
export interface Places {
  own?: Place[];
  opponent?: Place[];
}
export type Count = { min: number; max: number } | "ALL";
/**
 * How many cards a pick takes: a Count, or bounds worked out as it picks (Select(tp,1,ft): up to as many
 * as there are free zones; Select(tp,ct,ct): as many as the cards an earlier move moved).
 */
export type PickCount = Count | { min: Value; max: Value };

/**
 * Inclusive: min 5 is 5 or more. is: one of these; not: none of these. A field left out checks nothing.
 * Each is a number, or one worked out when it is checked (a Level kept: c:IsLevel(e:GetLabel())).
 */
export interface Range {
  min?: Value;
  max?: Value;
  is?: Value[];
  not?: Value[];
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
  | "SEQUENCE"
  /** This turn: how many monsters it has battled (GetBattledGroupCount), attacks declared (GetAttackAnnouncedCount), attacks made (GetAttackedCount). */
  | "BATTLED"
  | "ATTACKS_DECLARED"
  | "ATTACKS";

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
  /** Any of these card numbers, or names worked out when it is checked (a name kept: c:IsCode(e:GetLabel())). */
  names?: Value[];
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
  /**
   * What can be done with it: HAND, GRAVE, GRAVE_AS_COST, REMOVE, DISCARD, TRIBUTE, SET, TARGET, NEGATE,
   * CHANGE_POSITION, FUSION_MATERIAL, XYZ_SUMMON_NOW... SPECIAL_SUMMON, and its forms past the defaults:
   * SPECIAL_SUMMON_AS_FUSION, _IGNORING_CONDITIONS, _IGNORING_REVIVE_LIMIT, _IN_FACEUP_DEFENSE, _TO_OPPONENT, in that order.
   */
  able?: string[];
  /** It has this many materials that can be detached for these reasons (c:CheckRemoveOverlayCard(tp,count,reason)). */
  detachable?: { count: number; reasons: string[] };
  /** What it is now: FACEUP, FACEDOWN, NEGATED, REVEALED, FORBIDDEN, IN_BATTLE, LINKED, LINKED_TO_THIS (a monster this card points to), GEMINI_STATUS (a Gemini monster Normal Summoned again: an Effect Monster), STILL_ON_CHAIN, IMMUNE_TO_THIS, ONLY_ONE_ALLOWS, HAS_FUSION_MATERIALS, NOT_SELF, LEAVES_FREE_MZONE... */
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
  /** Flags earlier effects put on it (REMEMBER: Memory names them): set or not. */
  flags?: { flag: string; set: boolean }[];
  counters?: string[];
  /** Other cards it needs (Rhapsodia's cost: an "Elfnote" in the GY with another Attribute). */
  needs?: Need[];
  /** Comparisons with another card of the same effect (its original Attribute differs from the cost's...). */
  relations?: { property: string; differsFrom: CardRef }[];
  /** A filter another card's effect gives (Chain Material's), which it must pass too. */
  passes?: CardRef[];
  /** Cards it isn't (a call's exclude argument): another the effect holds, or the card being checked (CHECKED_CARD). This card is NOT_SELF. */
  except?: CardRef[];
  /** Cards it is one of (c==e:GetLabelObject(): the card an effect keeps). */
  among?: CardRef[];
  /**
   * Numbers compared, all of which must hold: what a memory holds on it, its field ID, its counters
   * (c:GetFlagEffectLabel(id)==fid: the card this effect marked, if it hasn't moved since). The card
   * checked is { who: CHECKED_CARD }.
   */
  compare?: { value: Value; is: Comparison; to: Value }[];
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
  /**
   * Whose own and opponent's from is, when it isn't the effect's player's: the controller of the card the
   * filter checks (CHECKED_CARD), or of the card a continuous effect applies to (AFFECTED_CARD): c:GetControler().
   */
  viewOf?: "CHECKED_CARD" | "AFFECTED_CARD";
}

/**
 * A card or cards an effect works with. ref: a pick of the effect, by the reader's id (CHOSEN1,
 * TARGET), with cards added or taken away. who: cards it names. cards: several of those together.
 */
export type CardRef =
  | { ref: string; plus?: CardRef[]; minus?: CardRef[] }
  | { who: Who; of?: CardRef }
  | { cards: CardRef[] }
  /** The cards a memory keeps (an effect's OBJECT). */
  | { memory: Memory }
  | { token: number }
  /** The top cards of a player's Deck: how many, a number or one worked out (Duel.GetDecktopGroup(1-tp,ct)). */
  | { deckTop: { player?: Side; count?: Value } }
  | { unread: string };

export type Who =
  | "THIS_CARD"
  | "EVENT_CARDS"
  | "CHAIN_LINK"
  | "CHAIN_LINK_CARD"
  /** The cards the chain link responded to targets (Duel.GetChainInfo(ev,CHAININFO_TARGET_CARDS)). */
  | "CHAIN_LINK_TARGETS"
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
  | "CARD_IN_ZONE"
  | "CHECKED_CARD"
  /** The card a continuous effect applies to, for its value (the c of a value function). */
  | "AFFECTED_CARD"
  /** The monster in the battle now of the effect's player, or of their opponent (Duel.GetBattleMonster). */
  | "OWN_BATTLING_MONSTER"
  | "OPPONENT_BATTLING_MONSTER"
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
  /** Cards of a group the effect holds that pass a filter (g:IsExists(f,1,nil), g:FilterCount(f,nil)). */
  | { among: { cards: CardRef; card: CardFilter } }
  /** How many different names, Types, Attributes... the cards of a group have (g:GetClassCount(Card.GetCode)). */
  | { different: { cards: CardRef; by: Property } }
  | { freeZones: Places; forExtraDeck: boolean }
  /** Cards an earlier move of the effect moved (SUCCEEDED). */
  | { moved: MoveName }
  /** A coin's or die's result. */
  | { result: MoveName };

/** What cards are told apart by, for how many different ones a group has. */
export type Property =
  | "NAME"
  | "ORIGINAL_NAME"
  | "TYPE"
  | "ATTRIBUTE"
  | "RACE"
  | "LEVEL"
  | "RANK";

export type Condition =
  | { all?: Condition[] }
  | { any?: Condition[] }
  | { not: Condition }
  | { atLeast: number; of: Counted }
  | { exists: CardRef }
  | { is: { cards: CardRef; filter: CardFilter } }
  | { stillOnChain: CardRef }
  | { contains: { group: CardRef; card: CardRef } }
  /** Two cards are the same card (Duel.GetAttacker()==e:GetHandler(): this card is the attacker). */
  | { same: [CardRef, CardRef] }
  /** Why it would happen, one of these reasons (a value function's r: destroyed by battle, REASON_BATTLE). */
  | { reasons: string[] }
  /**
   * The effect a value function checks (its te, re or se): what a card is unaffected by (IMMUNE_EFFECT),
   * can't be destroyed or targeted by, or can be Special Summoned by. otherCards: not this card's own;
   * player: whose it is; types: a Monster, Spell or Trap effect; activated: an activated effect.
   */
  | {
      effect: {
        otherCards?: boolean;
        player?: Side;
        types?: string[];
        activated?: boolean;
        effectTypes?: string[];
      };
    }
  /** A Field Spell of this name applies (Duel.IsEnvironment): face-up in a Field Zone, of the player's when given, or treated as on the field. */
  | { fieldSpell: { name: number; player?: Side } }
  | { oneOfEach: { in: CardRef; attributes?: string[] } }
  | { eventCards: { count: number; card: CardFilter } }
  | { turn: "OWN" | "OPPONENT" }
  /** The duel is in one of these phases (MAIN1, DAMAGE...). */
  | { phase: string[] }
  /** In the Damage Step, damage has been calculated. */
  | { damageCalculated: true }
  /** The turn player can still enter their Battle Phase this turn (Duel.IsAbleToEnterBP). */
  | { canEnterBattlePhase: true }
  /**
   * The chain link responded to, or the effect that caused the event (re): there is one (exists), what it
   * declares, its categories, card types (types) and EFFECT_TYPE_s (effectTypes), its EFFECT_FLAG_s (flags:
   * CARD_TARGET, it targets), whether it was activated (not only applied), where its card was when it was
   * activated (from: any of these places), and whether it can be negated.
   */
  | {
      chainLink: {
        exists?: true;
        declares?: string[];
        /** Where the declared cards come from, for a declared category (Ash Blossom: a Special Summon from the Deck). */
        declaredFrom?: { category: string[]; places: Place[] };
        declaredCards?: { category: string[]; count: number; card: CardFilter };
        categories?: string[];
        types?: string[];
        effectTypes?: string[];
        flags?: string[];
        activated?: true;
        from?: Place[];
        negatable?: "EFFECT" | "ACTIVATION";
      };
    }
  | { chainLinks: number }
  /** No two links of the chain are cards with the same name (Duel.CheckChainUniqueness). */
  | { chainNamesUnique: true }
  /** Two effects are the same effect (re==e:GetLabelObject(): the chain link's is the one kept). */
  | { sameEffect: [EffectRef, EffectRef] }
  /** Two values compared (e:GetLabel()==1; c:GetFlagEffectLabel(id)==e:GetLabel(): the card is still the one that flag was put on). */
  | { compare: { value: Value; is: Comparison; to: Value } }
  | { player: { which: "REASON" | "EVENT"; is: Side } }
  | { playerAffectedBy: { player?: Side; effect: string } }
  | { canDraw: { player?: Side; count?: number } }
  /** The player can pay this much LP as a cost (Duel.CheckLPCost): has it, and nothing stops paying it. */
  | { canPayLP: { player?: Side; amount: Value } }
  /**
   * A player can make this move now, as the rules and the effects that apply let them (Duel.IsPlayerCanRemove,
   * IsPlayerCanDiscardDeck(tp,3), IsCanRemoveCounter, CheckRemoveOverlayCard...): the move as an effect would
   * make it. monster: one that isn't a card yet, with the stats it would have (IsPlayerCanSpecialSummonMonster:
   * a Token, a Trap Card as a monster). additional: a Normal Summon besides the one each turn gives.
   */
  | {
      playerCan: {
        player?: Side;
        move: Move;
        monster?: MonsterStats;
        additional?: true;
      };
    }
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

/** A monster's stats as a check gives them, for one that isn't a card yet (a Token). */
export interface MonsterStats {
  name: number;
  archetypes?: number[];
  types: string[];
  attack: Value;
  defense: Value;
  level: Value;
  races: string[];
  attributes: string[];
}

export type Comparison =
  | "EQUAL"
  | "NOT_EQUAL"
  | "LESS"
  | "AT_MOST"
  | "MORE"
  | "AT_LEAST";

/** Something not read, kept as the script wrote it (or as the reader recorded it): a card is fully read when it has none. */
export interface Unread {
  role: "condition" | "cost" | "target" | "operation" | "value" | "summon";
  text: string;
}
