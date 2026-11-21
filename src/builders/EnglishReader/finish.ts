/**
 * Finishing an effect: what follows from its words once they are all read. The words say what an effect does; its
 * kind, speed, event, range, flags and categories follow from that and from the card's kind, and its picks get ids
 * (TARGET, CHOSEN1, ALL1...) in the order the effect makes them, with each pronoun the cards it refers back to.
 */
import type {
  CardFilter,
  CardRef,
  Condition,
  EffectKind,
  EffectSchema,
  Mode,
  Move,
  Part,
  Pick as PickKind,
  Place,
  SummonMethod,
} from "../../lib/cardSchema.js";
import { holds } from "../../lib/ruled.js";
import {
  type Draft,
  MAIN_PHASE,
  type MoveDraft,
  NOT_DAMAGE_STEP,
  type PartDraft,
  type PickDraft,
  type SummonDraft,
} from "./phrases.js";

/**
 * Words that read but, once the effect is finished, mean nothing: a pronoun with nothing before it to refer to ("it"
 * after a condition that mentions no card). The reader stops at their part, as it does at words it can't read.
 */
export class Unresolved extends Error {}

/** What finishing an effect needs to know of its card and part. */
export interface Context {
  kind: "MONSTER" | "SPELL" | "TRAP";
  /** A Spell's or Trap's. */
  subType?: string;
  /** A Fusion, Synchro, Xyz or Link Monster: returned to the Extra Deck, not the Deck. */
  extraDeck: boolean;
  /** A Pendulum Monster: destroyed, it goes face-up to the Extra Deck, not the GY. */
  pendulumMonster?: boolean;
  /** In the Pendulum Effect: it works from the Pendulum Zone. */
  pendulum: boolean;
}

/** ocgcore's categories, in the order of their bits. */
const CATEGORIES = [
  "DESTROY",
  "RELEASE",
  "REMOVE",
  "TOHAND",
  "TODECK",
  "TOGRAVE",
  "DECKDES",
  "HANDES_SELF",
  "SUMMON",
  "SPECIAL_SUMMON",
  "TOKEN",
  "GRAVE_ACTION",
  "POSITION",
  "CONTROL",
  "DISABLE",
  "DISABLE_SUMMON",
  "DRAW",
  "SEARCH",
  "EQUIP",
  "DAMAGE",
  "RECOVER",
  "ATKCHANGE",
  "DEFCHANGE",
  "COUNTER",
  "COIN",
  "DICE",
  "LEAVE_GRAVE",
  "GRAVE_SPSUMMON",
  "NEGATE",
  "ANNOUNCE",
  "FUSION_SUMMON",
  "TOEXTRA",
  "MSET",
  "SSET",
  "HANDES_OPPO",
];

/** A battle's events from the start of the Damage Step on. */
const DAMAGE_STEP_EVENTS = new Set([
  "BATTLE_START",
  "BATTLE_CONFIRM",
  "PRE_DAMAGE_CALCULATE",
  "DAMAGE_CALCULATING",
  "PRE_BATTLE_DAMAGE",
  "BATTLED",
  "BATTLE_DAMAGE",
  "BATTLE_DESTROYING",
  "BATTLE_DESTROYED",
  "DAMAGE_STEP_END",
]);
/** Those of damage calculation. */
const DAMAGE_CAL_EVENTS = new Set([
  "PRE_DAMAGE_CALCULATE",
  "DAMAGE_CALCULATING",
  "PRE_BATTLE_DAMAGE",
]);
/**
 * DAMAGE_STEP when the rules let the effect be activated in the Damage Step, and DAMAGE_CAL when during damage
 * calculation too. A trigger or Flip Effect that must be activated is activated whenever its event happens, the Damage
 * Step included, so it has neither.
 *
 * These are the rules every effect follows. An optional trigger on its own card's move can be activated there too, by a
 * ruling whose file gives it (own-move-triggers-activate-in-the-damage-step), once the card is read.
 */
function damageStepFlags(
  kind: EffectKind,
  draft: Draft,
  event: string | undefined,
  resolved: Move[],
): string[] {
  // "(except during the Damage Step)"
  if (
    draft.requires?.some(
      (condition) =>
        JSON.stringify(condition) === JSON.stringify(NOT_DAMAGE_STEP),
    )
  )
    return [];
  // A negation of an activation, whenever there is one to negate
  if (resolved.some((move) => move.move === "NEGATE_ACTIVATION"))
    return ["DAMAGE_STEP", "DAMAGE_CAL"];
  if (!(
    kind === "QUICK" ||
    kind === "ACTIVATE" ||
    ((kind === "TRIGGER" || kind === "FLIP") && draft.optional)
  ))
    return [];
  // An event that happens there: a battle's, or one its words say can happen by battle ("destroyed by battle or card
  // effect": Wind Pegasus @Ignister)
  if (event && DAMAGE_CAL_EVENTS.has(event))
    return ["DAMAGE_STEP", "DAMAGE_CAL"];
  if (draft.damageStep || (event && DAMAGE_STEP_EVENTS.has(event)))
    return ["DAMAGE_STEP"];
  // Another event that can happen outside the Damage Step can't be responded to there
  return [];
}

export function finishEffect(
  draft: Draft,
  context: Context,
  nested = false,
): EffectSchema {
  const where = whereOf(draft);
  const read = kindOf(draft, where, context);
  const from = nested ? undefined : fromOf(read, draft, where, context);
  const kind = classOf(read, draft, from, context);
  const event =
    draft.events?.[0] ??
    (kind === "QUICK" || kind === "ACTIVATE" ? "FREE_CHAIN" : undefined);
  const refs = new References(event, context, draft.eventOf);
  // When its words say it can be used: an Ignition Effect is used in its player's Main Phase anyway
  const during = (draft.during ?? []).filter(
    (condition) =>
      kind !== "IGNITION" ||
      !(
        JSON.stringify(condition) === JSON.stringify({ turn: "OWN" }) ||
        JSON.stringify(condition) === JSON.stringify(MAIN_PHASE)
      ),
  );
  const requires = refs.conditions(
    during.length ? [...during, ...(draft.requires ?? [])] : draft.requires,
  );
  const cost = draft.cost?.map((move) => refs.move(move));
  for (const target of draft.targets ?? []) refs.target(target);
  const onActivation = draft.onActivation?.map((move) => refs.move(move));
  const does = refs.parts(draft.does ?? []);
  const applies = refs.resolve(draft.applies);
  // A target no move takes (the monster an Equip Spell equips) is described where nothing else says what it is: in what
  // activating the effect needs, as many of them there to target
  const legal = draft.targets
    ?.filter((target) => !refs.described(target))
    .map((target) => refs.needed(target));
  const modes = [
    ...new Map(
      (draft.does ?? [])
        .filter((part) => part.mode)
        .map((part) => [part.mode!, part.chosenOn!]),
    ).entries(),
  ].map(([mode, chosenOn]): Mode => ({
    mode,
    chosenOn,
    ...(draft.modeLimit
      ? {
          limit: {
            ...draft.modeLimit,
            counter: draft.modeCounters![mode - 1],
          },
        }
      : {}),
  }));
  const resolved = does.flatMap((part) => part.moves ?? []);
  const flags = [
    ...(draft.targets?.length ? ["CARD_TARGET"] : []),
    // Words that are no effect: negating the card's effects doesn't stop them, and nothing copies them
    ...(kind === "CONDITION" ? ["CANNOT_DISABLE", "UNCOPYABLE"] : []),
    ...damageStepFlags(kind, draft, event, resolved),
    // An optional effect on an "If" event doesn't miss timing, and neither does a Flip Effect: a trigger, a Quick
    // Effect, or a card activated on it (a choice, as every activation is; ruling: if-triggers-do-not-miss-timing)
    ...(draft.delay &&
    holds("if-triggers-do-not-miss-timing") &&
    (draft.optional || kind === "ACTIVATE") &&
    ["TRIGGER", "QUICK", "ACTIVATE", "FLIP"].includes(kind)
      ? ["DELAY"]
      : []),
  ];
  return {
    kind,
    fromProcedure: false,
    inSummons: false,
    mandatory:
      (kind === "TRIGGER" || kind === "QUICK" || kind === "FLIP") &&
      !draft.optional,
    speed: nested ? undefined : speedOf(kind, context),
    event,
    eventOf: kind === "TRIGGER" || kind === "AUTO" ? draft.eventOf : undefined,
    from,
    limit: draft.limit,
    alsoLimit: draft.alsoLimit,
    targets: !!draft.targets?.length,
    flags: nested ? undefined : flags,
    offered: { own: [], opponent: [] },
    // What its chain link says it does: an effect that is never activated has no chain link
    categories:
      nested || NEVER_ACTIVATED.has(kind)
        ? undefined
        : categoriesOf(
            resolved,
            context,
            from ??
              (draft.eventOf === "SELF" ? after(event, context) : undefined),
          ),
    modes,
    cost,
    onActivation,
    does,
    applies,
    requires,
    legal,
  };
}

export function finishSummon(
  summon: SummonDraft,
  context: Context,
): SummonMethod {
  const refs = new References(undefined, context);
  return { ...summon, cost: summon.cost?.map((move) => refs.move(move)) };
}

/**
 * Its words decide its kind, or its event does (a trigger), or its card: a monster's effects are Ignition Effects; a
 * Spell's or Trap's in the GY or banished, or of a Continuous, Field or Equip card once it is on the field, are effects of
 * their own, and a Trap's effects are Spell Speed 2 (Quick); otherwise it is the card's own activation.
 */
/** Where the words say this card is: the effect's, or a move's ("banish this card from your GY"). */
const whereOf = (draft: Draft): Place[] | undefined =>
  draft.where ??
  [
    ...(draft.cost ?? []),
    ...(draft.does ?? []).flatMap((part) => part.moves),
  ].find((move) => move.where)?.where;

/** Whether an effect as read is its card's activation. */
export const isActivation = (draft: Draft, context: Context): boolean =>
  kindOf(draft, whereOf(draft), context) === "ACTIVATE";

function kindOf(
  draft: Draft,
  where: Place[] | undefined,
  context: Context,
): EffectKind {
  if (draft.kind) return draft.kind;
  const away = where?.some((place) => place === "GRAVE" || place === "REMOVED");
  const stays = ["CONTINUOUS", "FIELD", "EQUIP"].includes(context.subType!);
  // A card that doesn't stay on the field is activated on an event ("When an opponent's monster declares an attack:");
  // its own event is a trigger, wherever it is
  if (draft.events) {
    if (
      draft.events.every((e) => e.startsWith("PHASE_")) &&
      !holds("a-phase-trigger-is-activated-in-an-open-game-state")
    )
      return context.kind === "TRAP" ? "QUICK" : "IGNITION";
    return context.kind === "MONSTER" ||
      away ||
      stays ||
      draft.eventOf === "SELF"
      ? "TRIGGER"
      : "ACTIVATE";
  }
  if (context.kind === "MONSTER") return "IGNITION";
  if (away || stays) return context.kind === "TRAP" ? "QUICK" : "IGNITION";
  return "ACTIVATE";
}

/** The kinds that are never activated, so have no chain link, speed or categories. */
export const NEVER_ACTIVATED = new Set<EffectKind>([
  "CONTINUOUS",
  "AUTO",
  "UNCLASSIFIED",
  "CONDITION",
]);

/** The field's zones: a monster card placed in a Spell & Trap Zone is a Spell or Trap there (Centur-Ion Primera's), classed as one. */
const ON_FIELD = new Set<Place>(["MZONE", "SZONE", "FZONE", "PZONE", "ONFIELD"]);
/** What a monster's effect applies when it is how the card can be used for a Summon: as 2 Tributes, as a non-Tuner. */
const USED_FOR_A_SUMMON = new Set(["DOUBLE_TRIBUTE", "NONTUNER"]);

/**
 * How Konami's FAQ classes an effect that applies without being activated, where its words don't say (they say
 * CONDITION). A monster's Continuous Effect applies from the Monster Zone: one whose words make it apply off the field
 * too ("This card's name becomes "Cyber Dragon" while on the field or in the GY") is an unclassified effect (ruling:
 * a-monster-effect-that-applies-off-the-field-is-unclassified), and so is one that is how the card can be used for a
 * Summon (ruling: tribute-and-synchro-material-treatments-are-unclassified). A Spell's, Trap's or Pendulum Effect's
 * effect is classed only by whether it makes a chain link, so stays CONTINUOUS.
 */
function classOf(
  kind: EffectKind,
  draft: Draft,
  from: Place[] | undefined,
  context: Context,
): EffectKind {
  if (kind !== "CONTINUOUS" || context.kind !== "MONSTER" || context.pendulum)
    return kind;
  if (
    from?.some((place) => !ON_FIELD.has(place)) &&
    holds("a-monster-effect-that-applies-off-the-field-is-unclassified")
  )
    return "UNCLASSIFIED";
  if (
    draft.applies?.length &&
    draft.applies.every((applied) => USED_FOR_A_SUMMON.has(applied.effect)) &&
    holds("tribute-and-synchro-material-treatments-are-unclassified")
  )
    return "UNCLASSIFIED";
  return kind;
}

/**
 * Spell Speed, by the rules: a Trigger Effect is 1, a Quick Effect 2, and a Counter Trap's activation 3; a Trap's or a
 * Quick-Play Spell's activation is 2. A Trap's trigger is 2 as well, by a ruling whose file gives it once the card is
 * read (a-traps-trigger-effects-are-spell-speed-2; ocgcore makes a trigger 1 whatever its card). A trigger on a phase
 * ("During the End Phase:") is activated in an open game state during that phase, at its card's speed, in the GY too
 * (ruling: a-phase-trigger-is-activated-in-an-open-game-state).
 */
function speedOf(kind: EffectKind, context: Context): 1 | 2 | 3 | undefined {
  if (kind === "QUICK") return 2;
  if (kind === "IGNITION" || kind === "FLIP" || kind === "TRIGGER") return 1;
  if (kind === "ACTIVATE")
    return context.subType === "COUNTER"
      ? 3
      : context.kind === "TRAP" || context.subType === "QUICKPLAY"
        ? 2
        : 1;
  return undefined;
}

/** Where its own event leaves this card: sent to the GY, banished, added to the hand, or destroyed (to the GY, or face-up to the Extra Deck for a Pendulum Monster). */
function after(
  event: string | undefined,
  context: Context,
): Place[] | undefined {
  if (event === "DESTROYED" || event === "BATTLE_DESTROYED")
    return context.pendulumMonster ? ["EXTRA"] : ["GRAVE"];
  const places: Record<string, Place[]> = {
    TO_GRAVE: ["GRAVE"],
    REMOVE: ["REMOVED"],
    TO_HAND: ["HAND"],
  };
  return event ? places[event] : undefined;
}

/**
 * Where it works from: where its words say this card is (on the field, the zone its card's effects are in), or
 * wherever its own event finds it, or the zone its card's effects are in: the Field Zone for a Field Spell, a Spell &
 * Trap Zone for another Spell or a Trap, the Pendulum Zone for a Pendulum Effect, or a Monster Zone.
 */
function fromOf(
  kind: EffectKind,
  draft: Draft,
  where: Place[] | undefined,
  context: Context,
): Place[] | undefined {
  if (kind === "ACTIVATE") return undefined;
  // What reaches the monster its card equips, or is material of, works from there, where the card is because it is one
  if (
    draft.applies?.length &&
    draft.applies.every(
      (applied) =>
        applied.to === "EQUIPPED_MONSTER" || applied.to === "ATTACHED_TO",
    )
  )
    return undefined;
  const zone: Place =
    context.kind !== "MONSTER"
      ? context.subType === "FIELD"
        ? "FZONE"
        : "SZONE"
      : context.pendulum
        ? "PZONE"
        : "MZONE";
  if (where) return where.map((place) => (place === "ONFIELD" ? zone : place));
  // A Flip Effect is its own card's too
  if (
    kind === "FLIP" ||
    ((kind === "TRIGGER" || kind === "AUTO") && draft.eventOf === "SELF")
  )
    return undefined;
  return [zone];
}

/** Cards that can only be Fusion, Synchro, Xyz or Link Monsters, which go back to the Extra Deck, not the Deck. */
const extraDeckOnly = (card: CardFilter | undefined): boolean =>
  !!card?.types?.length &&
  card.types.every((type) =>
    ["FUSION", "SYNCHRO", "XYZ", "LINK"].includes(type),
  );

/** The Summons, which take a card from where it is to the field. */
const SUMMONS = new Set([
  "SPECIAL_SUMMON",
  "FUSION_SUMMON",
  "SYNCHRO_SUMMON",
  "XYZ_SUMMON",
  "LINK_SUMMON",
  "RITUAL_SUMMON",
]);
/** The moves out of the GY Ghost Belle names, besides a Special Summon: to the hand, Deck or Extra Deck, and banished. */
const GRAVE_ACTIONS = new Set([
  "TO_HAND",
  "TO_DECK",
  "TO_EXTRA_FACEUP",
  "BANISH",
]);
/** The other moves out of the GY, which Necrovalley negates with the rest. */
const LEAVES_GRAVE = new Set([
  "ATTACH",
  "EQUIP",
  "PLACE",
  "SET",
  "RETURN_TO_FIELD",
]);

/** Where a move's cards are: where they can be, and whether that is known as the effect is activated. */
interface Taken {
  places: Place[];
  known: boolean;
}

/**
 * What an effect, as it is activated, says it does (ruling: an-activation-declares-everything-it-does): from what it
 * does on resolution and what the effects it gives do and apply (Mulcharmy Fuwalos draws, as Maxx "C"'s script says it
 * does), and where it takes cards from. A pick made as
 * it resolves can still take them from any of its places; a target, or this card, is where it is, so the effect takes
 * cards from a place only when they can be nowhere else (S:P Little Knight's "1 card on the field or in either GY"
 * doesn't move a card out of the GY when it targets one on the field). A pick's places are on the first move that takes
 * it; this card is where the effect works from.
 */
function categoriesOf(
  moves: Move[],
  context: Context,
  range: Place[] | undefined,
  found = new Set<string>(),
): string[] {
  const picks = new Map<string, Taken>();
  for (const move of moves) {
    const cards = move.cards as
      { ref?: string; who?: string; token?: number } | undefined;
    const described = move.from && {
      places: [...(move.from.own ?? []), ...(move.from.opponent ?? [])],
      known: move.pick === "TARGETED",
    };
    if (described && cards?.ref) picks.set(cards.ref, described);
    const taken =
      described ??
      (cards?.ref
        ? picks.get(cards.ref)
        : cards?.who === "THIS_CARD" && range
          ? { places: range, known: true }
          : undefined);
    const places = taken?.places ?? [];
    const from = (place: Place) =>
      (taken?.known
        ? places.every((p) => p === place)
        : places.includes(place)) && places.length > 0;
    const of: Record<string, string[]> = {
      TO_HAND: ["TOHAND", ...(from("DECK") ? ["SEARCH"] : [])],
      TO_GRAVE: ["TOGRAVE", ...(from("DECK") ? ["DECKDES"] : [])],
      // Cards in the Deck already (excavated ones, put on its bottom) don't return to it: it is only put in another order
      TO_DECK:
        places.length && places.every((place) => place === "DECK")
          ? []
          : [
              (cards?.who === "THIS_CARD" && context.extraDeck) ||
              extraDeckOnly(move.card)
                ? "TOEXTRA"
                : "TODECK",
            ],
      BANISH: ["REMOVE"],
      DESTROY: ["DESTROY"],
      DISCARD: ["HANDES_SELF"],
      // A Special Summon "treated as a Fusion Summon" is one; a Token's is a Token made
      SPECIAL_SUMMON: [
        "SPECIAL_SUMMON",
        ...(from("DECK") && holds("a-special-summon-from-the-deck-is-declared")
          ? ["DECKDES"]
          : []),
        ...(move.summonType?.includes("FUSION") ? ["FUSION_SUMMON"] : []),
        ...(cards && "token" in cards ? ["TOKEN"] : []),
      ],
      SYNCHRO_SUMMON: ["SPECIAL_SUMMON"],
      XYZ_SUMMON: ["SPECIAL_SUMMON"],
      LINK_SUMMON: ["SPECIAL_SUMMON"],
      RITUAL_SUMMON: ["SPECIAL_SUMMON"],
      FUSION_SUMMON: ["SPECIAL_SUMMON", "FUSION_SUMMON"],
      // A Tribute Summon not said to be face-up can be a Tribute Set
      NORMAL_SUMMON: [
        "SUMMON",
        ...(holds("a-tribute-set-is-a-tribute-summon") &&
        !move.position?.includes("FACEUP")
          ? ["MSET"]
          : []),
      ],
      TRIBUTE: ["RELEASE"],
      EQUIP: ["EQUIP"],
      NEGATE_EFFECT: ["DISABLE"],
      NEGATE_ACTIVATION: ["NEGATE"],
      DRAW: ["DRAW"],
      // To face-down Defense Position too: not a Set (ruling: to-face-down-defense-is-a-change-of-position)
      CHANGE_POSITION: [
        !holds("to-face-down-defense-is-a-change-of-position") &&
        move.position?.includes("FACEDOWN_DEFENSE")
          ? "MSET"
          : "POSITION",
      ],
      // A Spell or Trap Set (this card, when it is one) is an SSET, a monster's an MSET
      SET: [
        (cards?.who === "THIS_CARD" && context.kind !== "MONSTER") ||
        move.card?.types?.some((type) => type === "SPELL" || type === "TRAP")
          ? "SSET"
          : "MSET",
      ],
    };
    for (const category of of[move.move] ?? []) found.add(category);
    // A card moved out of the GY: Special Summoned (GRAVE_SPSUMMON), or moved as Ghost Belle names (GRAVE_ACTION), which
    // are what Ghost Belle reads; or any other way (LEAVE_GRAVE), what Necrovalley reads besides those
    if (from("GRAVE") && SUMMONS.has(move.move)) found.add("GRAVE_SPSUMMON");
    if (from("GRAVE") && GRAVE_ACTIONS.has(move.move))
      found.add("GRAVE_ACTION");
    if (from("GRAVE") && LEAVES_GRAVE.has(move.move)) found.add("LEAVE_GRAVE");
    for (const applied of move.effect?.applies ?? []) {
      if (["DISABLE", "DISABLE_EFFECT"].includes(applied.effect))
        found.add("DISABLE");
      if (/^(UPDATE|SET)_(BASE_)?ATTACK/.test(applied.effect))
        found.add("ATKCHANGE");
      if (/^(UPDATE|SET)_(BASE_)?DEFENSE/.test(applied.effect))
        found.add("DEFCHANGE");
    }
    // The card an effect is given to could be anywhere
    if (holds("an-activation-declares-everything-it-does"))
      categoriesOf(
        (move.effect?.does ?? []).flatMap((part) => part.moves ?? []),
        context,
        undefined,
        found,
      );
  }
  return CATEGORIES.filter((category) => found.has(category));
}

/** What a pronoun can refer back to: a pick of the effect, or cards it names. */
type Referent = { pick: PickDraft } | { ref: CardRef };
interface State {
  /** The cards mentioned last, and the monsters mentioned last ("that monster"). */
  last?: Referent;
  lastMonster?: Referent;
  /** The cards mentioned last that can be one card ("it", "that card"). */
  lastOne?: Referent;
  /** The effect's targets ("that target"). */
  target?: Referent;
  /** The last pick of each kind of move ("the excavated cards": REVEAL's). */
  lastBy: Map<string, PickDraft>;
  /** The cards every move of each kind took ("the number revealed"). */
  allBy: Map<string, CardRef[]>;
  /** The picks a move has described so far, on this path through the effect's modes. */
  described: Set<string>;
}
const copy = (state: State): State => ({
  last: state.last,
  lastMonster: state.lastMonster,
  lastOne: state.lastOne,
  target: state.target,
  lastBy: new Map(state.lastBy),
  allBy: new Map(state.allBy),
  described: new Set(state.described),
});

/**
 * What an effect's event mentions, for a pronoun before anything else is: this card, when the event is its own ("If this
 * card is Special Summoned: You can increase ... its Level"); the attacking monster, when it declares an attack; the
 * card of the chain link it responds to; or the cards the event happened to.
 */
function eventReferent(
  event: string | undefined,
  eventOf: string | undefined,
): Referent | undefined {
  if (!event || event === "FREE_CHAIN") return undefined;
  if (event === "CHAINING") return { ref: { who: "CHAIN_LINK_CARD" } };
  if (eventOf === "SELF") return { ref: { who: "THIS_CARD" } };
  if (event === "ATTACK_ANNOUNCE") return { ref: { who: "ATTACKER" } };
  return { ref: { who: "EVENT_CARDS" } };
}

/** How a move's cards were picked, when it names them. */
function pickOfWho(cards: CardRef): PickKind | undefined {
  if (!("who" in cards)) return undefined;
  if (cards.who === "THIS_CARD") return "THIS_CARD";
  if (cards.who === "EVENT_CARDS") return "EVENT_CARDS";
  if (/CHAIN_LINK/.test(cards.who)) return "CHAIN_LINK";
  return undefined;
}

/**
 * An effect's picks and references, walked in the order the effect makes them: its conditions, its cost, its targets,
 * what it does on activation, then each part of its resolution (each mode from where the modes start). A pronoun is
 * the cards mentioned last: a pick, the cards a condition counts (COUNTED1...), or the card of a chain link it negated.
 */
class References {
  private readonly ids = new Map<PickDraft, string>();
  /** Each pick's description, its references read as the effect stood when it was made. */
  private readonly descriptions = new Map<
    PickDraft,
    Pick<Move, "count" | "card">
  >();
  private readonly numbers = new Map<string, number>();
  /** The picks a move has described, on any path through the effect's modes. */
  private readonly everDescribed = new Set<string>();
  private state: State;
  constructor(
    event: string | undefined,
    private readonly context: Context,
    eventOf?: string,
  ) {
    const last = eventReferent(event, eventOf);
    this.state = {
      last,
      lastMonster: last,
      lastOne: last,
      lastBy: new Map(),
      allBy: new Map(),
      described: new Set(),
    };
  }

  private id(pick: PickDraft): string {
    let id = this.ids.get(pick);
    if (id === undefined) {
      // What its words refer to is what came before it
      this.descriptions.set(pick, {
        count: this.resolve(pick.count),
        card: this.resolve(pick.card),
      });
      if (pick.pick === "TARGETED") id = "TARGET";
      else {
        const n = (this.numbers.get(pick.pick) ?? 0) + 1;
        this.numbers.set(pick.pick, n);
        id = `${pick.pick}${n}`;
      }
      this.ids.set(pick, id);
    }
    return id;
  }

  /** Words that refer back, as the cards they mean: "?back" the cards mentioned last ("?back:REVEAL" the last REVEAL's), "?this" the pick being made. */
  resolve<T>(value: T, self?: string): T {
    if (Array.isArray(value))
      return value.map((item) => this.resolve(item, self)) as T;
    if (!value || typeof value !== "object") return value;
    const ref = (value as { ref?: unknown }).ref;
    if (typeof ref === "string" && ref.startsWith("?")) {
      if (ref === "?this") {
        if (!self) throw new Error("the pick being made, outside a pick");
        return { ref: self } as T;
      }
      return this.cardsOf(this.referent(ref)) as T;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        this.resolve(item, self),
      ]),
    ) as T;
  }

  private referent(marker: string): Referent {
    const referent =
      marker === "?back"
        ? this.state.last
        : marker === "?back-one"
          ? this.state.lastOne
          : marker === "?back-monster"
            ? this.state.lastMonster
            : marker === "?back-target"
              ? this.state.target
              : marker.startsWith("?all:")
                ? this.allOf(marker.slice("?all:".length))
                : this.lastOf(marker.slice("?back:".length));
    if (!referent)
      throw new Unresolved(
        `a word that refers back to cards (${marker}), with none before it`,
      );
    return referent;
  }
  private allOf(move: string): Referent | undefined {
    const cards = this.state.allBy.get(move);
    return cards && { ref: cards.length === 1 ? cards[0] : { cards } };
  }
  private lastOf(move: string): Referent | undefined {
    const pick = this.state.lastBy.get(move);
    return pick && { pick };
  }
  private cardsOf(referent: Referent): CardRef {
    return "pick" in referent ? { ref: this.id(referent.pick) } : referent.ref;
  }

  /** The effect's conditions: each that counts cards in places (COUNTED1...) mentions them. */
  conditions(conditions: Condition[] | undefined): Condition[] | undefined {
    let counted = 0;
    return conditions?.map((condition) => {
      const out = this.resolve(condition);
      if ("atLeast" in out && "matching" in out.of)
        this.say({ ref: { ref: `COUNTED${++counted}` } });
      return out;
    });
  }

  target(pick: PickDraft): void {
    this.id(pick);
    this.mention(pick);
    this.state.target = { pick };
  }

  /** Whether a move has said what a pick's cards are. */
  described(pick: PickDraft): boolean {
    return this.everDescribed.has(this.id(pick));
  }

  /** A pick's cards, as what activating the effect needs: as many as it takes, there to pick. */
  needed(pick: PickDraft): Condition {
    const { count, card } = this.descriptions.get(pick)!;
    const n =
      typeof count === "object" && typeof count.min === "number"
        ? count.min
        : 1;
    return {
      atLeast: n,
      of: {
        matching: {
          count: n,
          from: pick.from!,
          card: card ?? {},
          targetable: pick.pick === "TARGETED",
        },
      },
    };
  }

  /** Cards are what pronouns refer back to now: "it" too, unless they are several. */
  private say(referent: Referent, one = true): void {
    this.state.last = referent;
    if (one) this.state.lastOne = referent;
  }

  /** A pick is what its pronouns refer back to now ("it" only when it takes one card at most). */
  private mention(pick: PickDraft): void {
    this.say({ pick }, pick.count !== "ALL" && pick.count.max === 1);
    if (pick.monster) this.state.lastMonster = { pick };
  }

  move(draft: MoveDraft): Move {
    const { move, cards, picked, where, effect, ...rest } = draft;
    const out: Move = { move };
    let pick = picked;
    if (!pick && cards) {
      const ref = (cards as { ref?: string }).ref;
      const referent: Referent = ref?.startsWith("?back")
        ? this.referent(ref)
        : { ref: cards };
      if ("pick" in referent) pick = referent.pick;
      else {
        out.cards = referent.ref;
        const how = pickOfWho(referent.ref);
        if (how) out.pick = how;
      }
    }
    let self: string | undefined;
    if (pick) {
      self = this.id(pick);
      out.cards = { ref: self };
      // The first move that takes a pick's cards says what they are
      if (!this.state.described.has(self)) {
        this.state.described.add(self);
        this.everDescribed.add(self);
        Object.assign(out, {
          pick: pick.pick,
          ...this.descriptions.get(pick),
          from: pick.from,
        });
        if (pick.pickRequires)
          out.pickRequires = this.resolve(pick.pickRequires, self);
      }
    }
    Object.assign(out, this.resolve(rest, self));
    // What the effect it gives applies can refer to this effect's cards ("the combined original ATK of the Tributed monsters")
    if (effect)
      out.effect = finishEffect(
        { ...effect, applies: this.resolve(effect.applies, self) },
        this.context,
        true,
      );
    if (out.cards)
      this.state.allBy.set(move, [
        ...(this.state.allBy.get(move) ?? []),
        out.cards,
      ]);
    if (pick) {
      this.mention(pick);
      this.state.lastBy.set(move, pick);
    } else if (move === "NEGATE_EFFECT" || move === "NEGATE_ACTIVATION") {
      // Negating a chain link mentions its card ("negate the activation, and if you do, destroy it")
      const who = (out.cards as { who: string }).who;
      this.say({
        ref: {
          who:
            who === "PREVIOUS_CHAIN_LINK"
              ? "PREVIOUS_CHAIN_LINK_CARD"
              : "CHAIN_LINK_CARD",
        },
      });
    }
    return out;
  }

  parts(parts: PartDraft[]): Part[] {
    let start: State | undefined;
    const modes = new Map<number, State>();
    let mode: number | undefined;
    return parts.map((part, i): Part => {
      if (part.mode !== undefined && part.mode !== mode) {
        start ??= copy(this.state);
        mode = part.mode;
        this.state = copy(modes.get(mode) ?? start);
      }
      const out: Part = {
        part: i + 1,
        link: part.link,
        level:
          part.link === "AND_IF_YOU_DO" || part.link === "THEN"
            ? "SUBSEQUENT"
            : "EFFECT",
        optional: part.optional,
        mode: part.mode,
        requires: this.resolve(part.requires),
        moves: part.moves.map((move) => this.move(move)),
      };
      if (part.mode !== undefined) modes.set(part.mode, this.state);
      return out;
    });
  }
}

/** Empty is left out: undefined, and empty lists, except an effect's offered (the schema requires its two). */
export function prune<T>(value: T, key = ""): T {
  if (Array.isArray(value)) return value.map((item) => prune(item)) as T;
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, item] of Object.entries(value)) {
    if (item === undefined) continue;
    if (Array.isArray(item) && item.length === 0 && key !== "offered") continue;
    out[k] = prune(item, k);
  }
  return out as T;
}
