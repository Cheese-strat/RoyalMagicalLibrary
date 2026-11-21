/**
 * What the grammar's phrases mean before an effect is finished (finish.ts): the drafts of effects, parts, moves and
 * picks, and the functions that build them, so each pattern in grammar.ts says only what its words add.
 */
import type {
  Applied,
  CardFilter,
  CardRef,
  CardRules,
  Condition,
  Count,
  EffectKind,
  ExtraMaterials,
  Limit,
  Link,
  Material,
  ModeChosenOn,
  Move,
  MoveName,
  PickCount,
  Place,
  Places,
  SummonMethod,
  Value,
} from "../../lib/cardSchema.js";
import {
  givenWhole,
  holds,
  isMarks,
  marksTogether,
  ruledBy,
  textOf,
} from "../../lib/ruled.js";
import { NoReading } from "./engine.js";

// The rulings that give a filter what its text doesn't say (rulings/<id>.json)
const SHOWS_ONLY_KIND = "a-face-down-card-shows-only-its-kind";
const REVEALED_AS_USED = "own-monsters-are-revealed-as-they-are-used";

// ---- drafts ----

/**
 * A pick as read: the cards a move or a target takes. finish.ts numbers an effect's picks (TARGET, CHOSEN1, ALL1...)
 * and writes each one's description on the first move that takes its cards; a later move names them by their id.
 */
export interface PickDraft {
  pick: "TARGETED" | "CHOSEN" | "ALL" | "DECK_TOP" | "RANDOM";
  count: PickCount;
  from: Places;
  card: CardFilter;
  /** What the cards it takes must be together ({ ref: "?this" } is the pick itself). */
  pickRequires?: Condition[];
  /** Its noun says monsters: "that monster" can refer back to it. */
  monster?: boolean;
}

/** A move as read: the pick whose cards it takes (cards is then PICKED), and where it says this card is ("banish this card from your hand"). */
export interface MoveDraft extends Omit<Move, "effect"> {
  picked?: PickDraft;
  where?: Place[];
  effect?: Draft;
  /** A Token's stats as its text prints them, which konamiReader checks against the Token's database row and leaves out of RML. */
  tokenStats?: TokenStats;
}

/** A Token's stats as printed: "(Beast/EARTH/Level 1/ATK 0/DEF 0)"; "?" is null. */
export interface TokenStats {
  race: string;
  attribute: string;
  level: number;
  atk: number | null;
  def: number | null;
}

export interface PartDraft {
  link?: Link;
  optional: boolean;
  requires?: Condition[];
  moves: MoveDraft[];
  mode?: number;
  chosenOn?: ModeChosenOn;
}

/** An effect as read: what its words say, before what follows from them (its speed, categories, flags...) is worked out. */
export interface Draft {
  /**
   * When its words decide it: QUICK ("(Quick Effect)"), CONTINUOUS, AUTO, CONDITION (words that are no effect).
   * Otherwise an event makes it a trigger, and a card's kind decides the rest; finish.ts makes a monster's CONTINUOUS
   * effect UNCLASSIFIED where Konami classes it so.
   */
  kind?: EffectKind;
  /** One event, or two for an effect that is two ("If this card is Normal or Special Summoned": SUMMON_SUCCESS and SPSUMMON_SUCCESS). */
  events?: string[];
  eventOf?: "SELF" | "ANY";
  /** An "If" trigger: an optional one doesn't miss timing (DELAY). */
  delay?: boolean;
  /** "You can". */
  optional?: boolean;
  /** Its event happens in the Damage Step, and it can be activated there ("destroyed by battle"). */
  damageStep?: boolean;
  /**
   * What each of its events needs, for an effect that is two ("If this card is Synchro Summoned, or sent to the GY": the
   * Synchro Summon's), put before its requires when it is made into one effect for each event (twins).
   */
  eventRequires?: Record<string, Condition[]>;
  /**
   * The turn and phase its words say it can be used in ("During your Main Phase"), before its requires: what an Ignition
   * Effect meets anyway, in its player's Main Phase, says nothing for one.
   */
  during?: Condition[];
  /** Where the words say this card is ("If this card is in your GY"); [] for nowhere in particular. */
  where?: Place[];
  limit?: Limit;
  alsoLimit?: Limit;
  /** Each of its modes' own limit ("but you can only use each effect of X once per turn"), and each mode's counter, in printed order (assemble). */
  modeLimit?: Omit<Limit, "counter">;
  modeCounters?: number[];
  requires?: Condition[];
  cost?: MoveDraft[];
  targets?: PickDraft[];
  onActivation?: MoveDraft[];
  does?: PartDraft[];
  applies?: Applied[];
}

/**
 * A sentence that limits how often other effects of the card can be used ("You can only use this effect of X once per
 * turn"), or how often the card can be Summoned a way. Once the whole text is read, its limit goes onto what it names.
 */
export interface Limitation {
  /**
   * Which effects of its part: the one before it, every one before it (PRECEDING), every one, every one after it; the
   * card's activation (ACTIVATION: "You can only activate 1 X per turn"); or a Summon: the procedure before it (SUMMON),
   * or every way (SUMMONS, the card's summonLimit).
   */
  of:
    | "PREVIOUS"
    | "PRECEDING"
    | "ALL"
    | "FOLLOWING"
    | "ACTIVATION"
    | "SUMMON"
    | "SUMMONS";
  /** They share one count ("1 X effect per turn"), rather than each having its own ("each effect"). */
  together: boolean;
  /** The counter is given as it is applied: one of the card's own for each count, in printed order. */
  limit: Omit<Limit, "counter">;
}

/** A Summon procedure as read: its cost's moves are drafts, numbered like an effect's. */
export interface SummonDraft extends Omit<SummonMethod, "cost"> {
  cost?: MoveDraft[];
}

/** What a sentence says. Most say one thing; a sentence that makes a procedure and its Summon condition says two. */
export interface Sentence {
  effects?: Draft[];
  limitation?: Limitation;
  /**
   * Words that add to the effect before them: a move at the end of its resolution (Theorealize Past Lull's "Your
   * opponent cannot activate cards or effects when that monster is Special Summoned"), what activating it does and
   * needs (the Mulcharmy clause), or the kind of Summon it Special Summons as.
   */
  rider?: {
    moves?: MoveDraft[];
    /** A part of its own after the effect's last, done whatever they did ("For the rest of this turn after this card resolves, ..."). */
    also?: MoveDraft[];
    onActivation?: MoveDraft[];
    requires?: Condition[];
    /** "(This is treated as a Fusion Summon.)": the kind of Summon its last Special Summon is. */
    summonType?: MoveDraft["summonType"];
  };
  summon?: SummonDraft;
  /** Other places its Tribute Summon's Tributes can come from (The Great Gallant Bandit). */
  tributes?: ExtraMaterials;
  rules?: Partial<CardRules>;
  /** "(This card is always treated as a "Power Patron" card.)" */
  treatedAs?: number[];
  /** "For this card's Synchro Summon, you can treat 1 X you control as a Tuner." */
  tuner?: CardFilter;
  /** A materials line, and what its materials must be together ("2 monsters with the same Attribute but different Types"). */
  materials?: Material[];
  materialsRequire?: Condition[];
  /** What an Equip Spell can equip: "Equip only to a Warrior monster.", "Equip only to a monster you control." */
  equipTo?: EquipTo;
  /** "You can only control 1 X.": only one face-up X on its player's field, or on the field; X is this card, or the cards that match. */
  only?: { side: "OWN" | "BOTH"; card: CardFilter };
  /**
   * A sentence about "it" ("It gains 700 ATK."), as what applies to it: "it" is the card the sentence before it did
   * something to, so what it means is known only once the card's sentences are put together.
   */
  aboutIt?: Omit<Applied, "to">[];
}

/** The monsters an Equip Spell can equip, and on whose field. */
export interface EquipTo {
  noun: Noun;
  side: Where["side"];
}

// ---- cards ----

/** The cards a move takes are its pick's. */
export const PICKED: CardRef = { ref: "?" };
/** "them": the cards mentioned last. */
export const BACK: CardRef = { ref: "?back" };
/**
 * "it", "that card": the cards mentioned last that can be one card, as a pronoun agrees in number with what it means
 * (Parametalfoes Azortless's "shuffle 2 face-up Pendulum Monsters ... into the Deck, and if you do, destroy that card":
 * its target, not the 2 monsters).
 */
export const BACK_ONE: CardRef = { ref: "?back-one" };
/** "that target", "those targets": the effect's targets, whatever was mentioned after them. */
export const BACK_TARGET: CardRef = { ref: "?back-target" };
/** "that monster": the monsters mentioned last (Enigmaster Packbit's "discard 1 card, and if you do, place that monster": its target). */
export const BACK_MONSTER: CardRef = { ref: "?back-monster" };
/** "the excavated cards", "the detached material": the cards the last move of this kind took. */
export const backTo = (move: MoveName): CardRef => ({ ref: `?back:${move}` });
/** "the number revealed": the cards every move of this kind took, together (Fydraulis Harmonia reveals itself and Synchro Monsters). */
export const allBy = (move: MoveName): CardRef => ({ ref: `?all:${move}` });
/** The pick being made, in what its cards must be together ("including a monster you control"). */
export const THIS_PICK: CardRef = { ref: "?this" };
export const THIS: CardRef = { who: "THIS_CARD" };

export const one: Count = { min: 1, max: 1 };
export const exactly = (n: number): Count => ({ min: n, max: n });

/** The center Main Monster Zone, as a filter of the Monster Zone's cards. */
export const center = (): CardFilter => ({
  places: ["MZONE"],
  numbers: { SEQUENCE: { is: [2] } },
});

/** What a noun says cards are: a monster's can only be in a Monster Zone on the field; face-up, when it says so. */
export interface Noun {
  card: CardFilter;
  monster: boolean;
  faceUp?: boolean;
}

/** Places as read: whose, which (ONFIELD for "field", whatever is there), the ones said to be face-up, and a zone's filter (the center one). */
export interface Where {
  side: "OWN" | "OPPONENT" | "BOTH";
  places: Place[];
  faceUp: Place[];
  card?: CardFilter;
}

/** "field" for a monster is its Monster Zone. */
export const placesFor = (places: Place[], monster: boolean): Place[] =>
  places.map((place) => (place === "ONFIELD" && monster ? "MZONE" : place));

export const sides = (side: Where["side"], places: Place[]): Places =>
  side === "OWN"
    ? { own: places }
    : side === "OPPONENT"
      ? { opponent: places }
      : { own: places, opponent: places };

/** A filter's lists whose entries must all hold (IsAllTypes, every state, none of the none filters...): two are joined. */
const EVERY_OF = new Set<string>([
  "allTypes",
  "able",
  "states",
  "statuses",
  "hasEffects",
  "flags",
  "needs",
  "relations",
  "passes",
  "except",
  "compare",
  "allOf",
  "none",
  "unread",
]);

/**
 * Filters together: their checks all hold. A list whose entries must all hold is joined to another; any other list
 * holds when one of its entries does (types, reasons, places, anyOf...), so two different ones are each kept, the
 * second in allOf: "destroyed by battle or card effect" and "destroyed" is IsReason(BATTLE+EFFECT) and
 * IsReason(DESTROY), not any of the three. Two values or ranges of the same thing contradict, and don't read. What a
 * ruling gave either filter stays marked; a list a ruling gave whole isn't joined to another, as which of its entries
 * were the text's would be lost.
 */
export function both(a: CardFilter, b: CardFilter): CardFilter {
  const out: Record<string, unknown> = { ...a, ...marksTogether(a, b) };
  for (const [key, value] of Object.entries(b)) {
    if (isMarks(key)) continue;
    const mine = out[key];
    if (mine === undefined) out[key] = value;
    else if (Array.isArray(mine)) {
      if (givenWhole(a, key) || givenWhole(b, key))
        throw new Error(`a filter's ${key} that a ruling gave, joined to more`);
      if (EVERY_OF.has(key)) out[key] = [...mine, ...(value as unknown[])];
      else if (!same(mine, value))
        out.allOf = [...((out.allOf as CardFilter[]) ?? []), { [key]: value }];
    } else if (key === "numbers") {
      for (const number of Object.keys(value as object))
        if (number in (mine as object))
          throw new NoReading(`two ranges of ${number} in one filter`);
      out[key] = { ...(mine as object), ...(value as object) };
    } else throw new NoReading(`two values of ${key} in one filter`);
  }
  return out as CardFilter;
}

/** A filter without "monster", where it says nothing: of materials, or a Summon's cards ("Ritual Monster" is a Ritual card that is a monster). */
export const withoutMonster = (card: CardFilter): CardFilter =>
  Object.fromEntries(
    Object.entries(card).filter(
      ([key, value]) =>
        !(
          (key === "types" || key === "allTypes") &&
          value.length === 1 &&
          value[0] === "MONSTER"
        ),
    ),
  );

/** Places a card can be face-down in (a card in a Pendulum Zone is face-up). */
export const HIDDEN = new Set<Place>([
  "MZONE",
  "SZONE",
  "ONFIELD",
  "FZONE",
  "REMOVED",
]);
const PROPERTIES = [
  "allTypes",
  "exactTypes",
  "archetypes",
  "originalArchetypes",
  "names",
  "attributes",
  "originalAttributes",
  "races",
] as const;
/** The kinds of card a zone of the field shows a face-down card is: a monster, or a Spell or Trap. */
const SHOWN = ["MONSTER", "SPELL TRAP"];

/**
 * Whether a filter checks something a face-down card in this place doesn't show. On the field a face-down card shows
 * which kind of card it is, a monster in a Monster Zone and a Spell or Trap in a Spell & Trap Zone (Mystical Space
 * Typhoon's "1 Spell/Trap on the field" can be a Set card); a face-down banished card shows nothing.
 */
export function reveals(card: CardFilter, place: Place): boolean {
  if (PROPERTIES.some((key) => card[key]?.length)) return true;
  if (Object.keys(card.numbers ?? {}).some((number) => number !== "SEQUENCE"))
    return true;
  if (
    card.types?.length &&
    (place === "REMOVED" || !SHOWN.includes([...card.types].sort().join(" ")))
  )
    return true;
  return (card.anyOf ?? []).some((filter) => reveals(filter, place));
}

/**
 * A filter of cards in places, as its words mean it there:
 * - "monster" says nothing where only monsters are (the Monster Zone, the Extra Deck);
 * - a card checked for something a face-down card doesn't show must be face-up where it could be face-down, and where
 *   the words say face-up ("your hand or face-up field"): FACEUP, or, when it can also come from places where it
 *   needn't be (the hand), anyOf those places or FACEUP. The GY is face-up already.
 * A filter that needs nothing face-up has its none filters checked the same way ("except with "Power Patron" monsters":
 * those that aren't face-up "Power Patron" monsters).
 *
 * The game reveals its player's own cards as it uses them as a Tribute or Fusion Material, so those show what they are
 * face-down too, and only the words make them face-up; the opponent's face-down cards show nothing. A revealed pick that
 * checks what a face-down card doesn't show is its player's own there, or face-up.
 *
 * Both are rulings (a-face-down-card-shows-only-its-kind, own-monsters-are-revealed-as-they-are-used): what they add
 * to the filter is marked, against the filter as its words alone make it.
 */
export function located(
  card: CardFilter,
  places: Place[],
  faceUp: Place[] = [],
  revealed = false,
): CardFilter {
  const shows = holds(SHOWS_ONLY_KIND);
  const asUsed = shows && revealed && holds(REVEALED_AS_USED);
  const out = locate(card, places, faceUp, shows, asUsed, (filter, here) =>
    located(filter, here, [], revealed),
  );
  /** The filter as it would be without the second ruling, or without either, the filters inside it too. */
  const under = (shows: boolean): CardFilter => {
    const inside = (filter: CardFilter, here: Place[]): CardFilter =>
      locate(filter, here, [], shows, false, inside);
    return locate(card, places, faceUp, shows, false, inside);
  };
  const text = under(false);
  const unrevealed = under(shows);
  for (const key of ["states", "anyOf", "allOf", "none"] as const) {
    const mine = textOf(out[key]);
    if (same(mine, text[key])) continue;
    // A list with FACEUP added to the text's own keeps the text's entries apart from the ruling's
    const added =
      key === "states" && same(mine, [...(text.states ?? []), "FACEUP"]);
    const at = added ? "states/FACEUP" : key;
    ruledBy(out, at, SHOWS_ONLY_KIND, added ? undefined : text[key]);
    if (asUsed && !same(mine, textOf(unrevealed[key])))
      ruledBy(out, at, REVEALED_AS_USED);
  }
  return out;
}
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * located, with what the rulings decide given: whether a face-down card shows only its kind (shows), and whether the
 * cards are revealed as they are used (revealed). nested locates the filters the cards must fail.
 */
function locate(
  card: CardFilter,
  places: Place[],
  faceUp: Place[],
  shows: boolean,
  revealed: boolean,
  nested: (filter: CardFilter, here: Place[]) => CardFilter,
): CardFilter {
  let out =
    places.length &&
    places.every((place) => place === "MZONE" || place === "EXTRA")
      ? withoutMonster(card)
      : card;
  const here = out.places ?? places;
  if (out.places && out.places.every((place) => place === "MZONE"))
    out = withoutMonster(out);
  const hidden = here.filter(
    (place) =>
      shows &&
      !faceUp.includes(place) &&
      HIDDEN.has(place) &&
      reveals(out, place),
  );
  const need = here.filter(
    (place) => faceUp.includes(place) || hidden.includes(place),
  );
  if (need.length) {
    const rest = here.filter(
      (place) => !need.includes(place) && place !== "GRAVE",
    );
    const or: CardFilter[] = [
      ...(rest.length ? [{ places: rest }] : []),
      ...(revealed && hidden.length
        ? [{ places: hidden, controller: "OWN" as const }]
        : []),
    ];
    if (!or.length)
      return { ...out, states: [...(out.states ?? []), "FACEUP"] };
    const anyOf = [...or, { states: ["FACEUP"] }];
    // A filter that is already an OR keeps it, and this one must hold too
    return out.anyOf
      ? { ...out, allOf: [...(out.allOf ?? []), { anyOf }] }
      : { ...out, anyOf };
  }
  return out.none
    ? { ...out, none: out.none.map((filter) => nested(filter, here)) }
    : out;
}

/**
 * The cards some words take: how many, of what, from where (a pick of every card that matches is ALL). How it takes
 * them: chosen or targeted (pick), and whether the game reveals them as it uses them (revealed, as `located`).
 */
export function pickOf(
  count: PickCount | "ALL",
  noun: Noun,
  where: Where,
  how: { pick?: PickDraft["pick"]; revealed?: boolean } = {},
): PickDraft {
  const { pick = "CHOSEN", revealed = false } = how;
  const places = placesFor(where.places, noun.monster);
  const faceUp = noun.faceUp ? places : placesFor(where.faceUp, noun.monster);
  const card = located(
    where.card ? both(noun.card, where.card) : noun.card,
    places,
    faceUp,
    revealed,
  );
  const monster = noun.monster || undefined;
  return count === "ALL"
    ? {
        pick: "ALL",
        count: "ALL",
        from: sides(where.side, places),
        card,
        monster,
      }
    : { pick, count, from: sides(where.side, places), card, monster };
}

/** At least k cards that match, in places ("you control a "Power Patron" Link Monster"). */
export function control(noun: Noun, where: Where, k = 1): Condition {
  const { from, card } = pickOf(exactly(k), noun, where);
  return {
    atLeast: k,
    of: { matching: { count: k, from, card, targetable: false } },
  };
}

/** How many cards match, in places ("the number of "Power Patron" Link Monsters you control"). */
export function countOf(noun: Noun, where: Where): Value {
  const { from, card } = pickOf(one, noun, where);
  return { countOf: { matching: { count: 1, from, card, targetable: false } } };
}

/** The cards a continuous rule reaches: everything in the places, or the cards there that match. */
export function affected(
  noun: Noun,
  where: Where,
): Pick<Applied, "to" | "cards"> {
  const places = placesFor(where.places, noun.monster);
  const card = located(
    where.card ? both(noun.card, where.card) : noun.card,
    places,
    noun.faceUp ? places : [],
  );
  return {
    to: { places: sides(where.side, places) },
    ...(Object.keys(card).length ? { cards: card } : {}),
  };
}

export const thisIs = (filter: CardFilter): Condition => ({
  is: { cards: THIS, filter },
});

// ---- moves ----

/** A move of a pick's cards. */
export const take = (
  move: MoveName,
  picked: PickDraft,
  rest: Partial<MoveDraft> = {},
): MoveDraft => ({ move, cards: PICKED, picked, ...rest });
/** A move of this card. */
export const self = (
  move: MoveName,
  rest: Partial<MoveDraft> = {},
): MoveDraft => ({ move, cards: THIS, ...rest });
/** A move of the card mentioned last ("it"), or of the cards mentioned last ("them": BACK). */
export const back = (
  move: MoveName,
  rest: Partial<MoveDraft> = {},
  cards: CardRef = BACK_ONE,
): MoveDraft => ({ move, cards, ...rest });

/** An effect given to cards or a player, with what it applies. */
export const given = (applies: Applied[]): Draft => ({
  kind: "CONTINUOUS",
  applies,
});
/**
 * An effect on its player for a while ("for the rest of this turn"; "until the end of the next turn": END_PHASE twice;
 * "until the end of your next turn": OWN_NEXT_TURN_END).
 */
export const forPlayer = (
  applies: Applied[],
  times = 1,
  until = ["END_PHASE"],
): MoveDraft => ({
  move: "PLAYER_EFFECT",
  player: "OWN",
  effect: given(applies),
  until,
  ...(times > 1 ? { times } : {}),
});
/** How long an effect given to cards on the field lasts: until they leave it or are flipped face-down, or the end of the turn. */
export const UNTIL_END_OF_TURN = ["LEAVES_FIELD_OR_FLIPS", "END_PHASE"];
/** Negated: its effects ("negate the effects of 1 face-up card your opponent controls"). */
export const negated = (): Draft =>
  given([
    { effect: "DISABLE", to: "THIS_CARD" },
    { effect: "DISABLE_EFFECT", to: "THIS_CARD" },
  ]);

// ---- conditions ----

export const MAIN_PHASE: Condition = { phase: ["MAIN1", "MAIN2"] };
export const BATTLE_PHASE: Condition = {
  phase: ["BATTLE_START", "BATTLE_STEP", "DAMAGE", "DAMAGE_CAL", "BATTLE"],
};
export const NOT_DAMAGE_STEP: Condition = {
  not: { phase: ["DAMAGE", "DAMAGE_CAL"] },
};
export const OPPONENT_ACTIVATED: Condition = {
  player: { which: "REASON", is: "OPPONENT" },
};
export const summonedBy = (type: string): Condition =>
  thisIs({ summonedBy: [type] });
/** The materials of this card's Summon include one that matches. */
export const materialsInclude = (card: CardFilter): Condition => ({
  atLeast: 1,
  of: { among: { cards: { who: "SUMMON_MATERIALS", of: THIS }, card } },
});
/** Once per turn for this copy ("Once per turn"). */
export const SOFT: Limit = {
  count: 1,
  per: "TURN",
  shared: "COPY",
  counter: 0,
  oath: false,
};
