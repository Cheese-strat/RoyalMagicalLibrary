/** What the grammar's families share: the shapes of phrases, the printed words for frames, Types and Attributes, and helpers. */
import type {
  Applied,
  CardFilter,
  CardRef,
  Condition,
  Count,
  ExtraMaterials,
  Limit,
  MoveName,
  Place,
  Value,
} from "../../../lib/cardSchema.js";
import { holds } from "../../../lib/ruled.js";
import type { Pattern } from "../engine.js";
import {
  BACK,
  both,
  exactly,
  type Draft,
  type MoveDraft,
  type Noun,
  type PartDraft,
  type PickDraft,
  PICKED,
  type SummonDraft,
  pickOf,
  sides,
  THIS,
  THIS_PICK,
  type Where,
  withoutMonster,
} from "../phrases.js";

/** Some cards of a noun: how many, or all. */
export interface Some {
  count: Count | "ALL";
  noun: Noun;
  /** "up to n": alone it takes at least 1, and with another pick ("up to 1 X and up to 1 Y") it can take none. */
  upTo?: true;
}
/** A phrase that adds to an effect: requires, where this card is, its kind... */
export type Fragment = Partial<Draft>;
/** A clause of a resolution: its moves, or modes of moves ("add to your hand, or Special Summon, 1 ..."). */
export interface Clause {
  moves?: MoveDraft[];
  modes?: MoveDraft[][];
  optional: boolean;
}
/** A mode of an effect, as a bullet holds it: its parts, and what it targets ("● You can target 1 ...; add it to your hand."). */
export interface ModeDraft {
  parts: PartDraft[];
  targets?: PickDraft[];
}

export const ATTRIBUTES = [
  "DARK",
  "LIGHT",
  "WATER",
  "FIRE",
  "EARTH",
  "WIND",
  "DIVINE",
];
/** Monster frames as printed, and their TYPE_ names. */
export const FRAMES = [
  ["Fusion", "FUSION"],
  ["Synchro", "SYNCHRO"],
  ["Xyz", "XYZ"],
  ["Link", "LINK"],
  ["Ritual", "RITUAL"],
  ["Pendulum", "PENDULUM"],
] as const;
/** Monster Types as printed, and their RACE_ names. */
export const RACES: Record<string, string> = {
  Warrior: "WARRIOR",
  Spellcaster: "SPELLCASTER",
  Fairy: "FAIRY",
  Fiend: "FIEND",
  Zombie: "ZOMBIE",
  Machine: "MACHINE",
  Aqua: "AQUA",
  Pyro: "PYRO",
  Rock: "ROCK",
  "Winged Beast": "WINDBEAST",
  Plant: "PLANT",
  Insect: "INSECT",
  Thunder: "THUNDER",
  Dragon: "DRAGON",
  Beast: "BEAST",
  "Beast-Warrior": "BEASTWARRIOR",
  Dinosaur: "DINOSAUR",
  Fish: "FISH",
  "Sea Serpent": "SEASERPENT",
  Reptile: "REPTILE",
  Psychic: "PSYCHO",
  "Divine-Beast": "DIVINE",
  "Creator God": "CREATORGOD",
  Wyrm: "WYRM",
  Cyberse: "CYBERSE",
  Illusion: "ILLUSION",
};

export const where = (
  side: Where["side"],
  places: Place[],
  faceUp: Place[] = [],
): Where => ({ side, places, faceUp });
export const FIELD = (side: Where["side"]) => where(side, ["ONFIELD"]);
/** Fragments together: their requires, and when they can be used (during), joined in order; the rest of the later one kept. */
export const merge = (...fragments: Fragment[]): Fragment =>
  fragments.reduce(
    (a, b) => ({
      ...a,
      ...b,
      requires: [...(a.requires ?? []), ...(b.requires ?? [])],
      ...(a.during || b.during
        ? { during: [...(a.during ?? []), ...(b.during ?? [])] }
        : {}),
    }),
    {},
  );
export const requires = (...conditions: Condition[]): Fragment => ({
  requires: conditions,
});
/** An effect that also needs these, before its own conditions (a granted effect's). */
export const needing = (effect: Draft, conditions: Condition[]): Draft => ({
  ...effect,
  requires: [...conditions, ...(effect.requires ?? [])],
});
/** A noun's cards with a modifier's checks: types stacked ("Tuner Synchro Monster") must all hold, in printed order. */
export function modified(mod: Partial<Noun>, noun: Noun): Noun {
  const card = mod.card ?? {};
  let filter: CardFilter;
  if (card.types && noun.card.types) {
    const { types, ...rest } = noun.card;
    filter = both(
      { ...rest, allTypes: [...card.types, ...types] },
      (({ types: _, ...r }) => r)(card),
    );
  } else filter = both(card, noun.card);
  return {
    card: filter,
    monster: noun.monster || !!mod.monster,
    faceUp: noun.faceUp || mod.faceUp || undefined,
  };
}
export const except = (pick: PickDraft, names: number[]): PickDraft => ({
  ...pick,
  card: both(pick.card, { none: [{ names }] }),
});
/** "with a different original Attribute": from the cards mentioned before it. */
export const differentAttribute = (noun: Noun): Noun => ({
  ...noun,
  card: both(noun.card, {
    relations: [{ property: "ORIGINAL_ATTRIBUTE", differsFrom: BACK }],
  }),
});
/** The parts of a resolution's first clause: one, or one for each mode, chosen on resolution. */
export const partsOf = (clause: Clause): PartDraft[] =>
  clause.modes
    ? clause.modes.map((moves, i) => ({
        moves,
        optional: false,
        mode: i + 1,
        chosenOn: "RESOLUTION",
      }))
    : [{ moves: clause.moves!, optional: clause.optional }];
export const continuous = (
  applies: Applied[],
  { requires, ...rest }: Fragment = {},
): Draft => ({
  kind: "CONTINUOUS",
  applies,
  ...(requires?.length ? { requires } : {}),
  ...rest,
});
export const IMMUNE = (
  to: Applied["to"],
  effect: object,
  rest: Partial<Applied> = {},
): Applied => ({
  effect: "IMMUNE_EFFECT",
  to,
  ...rest,
  requires: [{ effect }],
});
/** "you can Normal Summon 1 X ... in addition to your Normal Summon/Set": one Normal Summon more, of those cards. */
export const extraNormalSummon = (some: Some): Applied[] | undefined =>
  some.count !== "ALL" && some.count.min === 1 && some.count.max === 1
    ? [
        {
          effect: "EXTRA_SUMMON_COUNT",
          to: { players: "OWN" },
          cards: withoutMonster(some.noun.card),
        },
      ]
    : undefined;
/**
 * "You cannot Special Summon monsters from the Extra Deck, except Synchro Monsters": an effect on its player, the cards
 * it can't Special Summon (of a kind, from places), less those it still can (except).
 */
export const specialSummonLock = (
  cards: CardFilter,
  except?: CardFilter,
): Applied[] => {
  const locked = except ? both(cards, { none: [except] }) : cards;
  return [
    {
      effect: "CANNOT_SPECIAL_SUMMON",
      to: { players: "OWN" },
      ...(Object.keys(locked).length ? { cards: locked } : {}),
    },
  ];
};
/**
 * "you cannot declare attacks ..., except with "Power Patron" monsters": an effect on players, which a monster unaffected
 * by it doesn't escape (ruling: a-lock-on-players-binds-unaffected-monsters). One on monsters ("your monsters cannot attack directly")
 * doesn't reach a monster unaffected by it.
 */
export const attackLock = (
  players: "OWN" | "BOTH",
  except: CardFilter,
): Applied[] => [
  {
    effect: "CANNOT_ATTACK_ANNOUNCE",
    to: holds("a-lock-on-players-binds-unaffected-monsters")
      ? { players }
      : { places: sides(players, ["MZONE"]) },
    cards: { none: [except] },
  },
];
/**
 * Modes chosen as it is activated, each with its parts and targets; with a limit of their own, each mode has one
 * ("but you can only use each effect of X once per turn"; ruling: each-mode-is-limited-on-its-own), given its counter
 * once the text is read (assemble).
 */
export const modesOf = (
  modes: ModeDraft[],
  modeLimit?: Omit<Limit, "counter">,
): Fragment => ({
  does: modes.flatMap((mode, i) =>
    mode.parts.map((part) => ({
      ...part,
      mode: i + 1,
      chosenOn: "ACTIVATION" as const,
    })),
  ),
  ...(modes.some((mode) => mode.targets)
    ? { targets: modes.flatMap((mode) => mode.targets ?? []) }
    : {}),
  ...(modeLimit
    ? holds("each-mode-is-limited-on-its-own")
      ? { modeLimit }
      : { limit: { ...modeLimit, counter: 0 } }
    : {}),
});
/** "you cannot activate the effects of monsters ...": monster effects of cards that match. */
export const cannotActivate = (
  players: "OWN" | "BOTH",
  noun: Noun,
): Applied => ({
  effect: "CANNOT_ACTIVATE",
  to: { players },
  requires: [
    { effect: { types: ["MONSTER"], card: withoutMonster(noun.card) } },
  ],
});
/** The monsters a Summon's Tributes were, as its materials ("the number of monsters Tributed for its Tribute Summon"). */
export const tributesOf = (summoned: CardRef): Value => ({
  countOf: { cards: { who: "SUMMON_MATERIALS", of: summoned } },
});
/** The cards these events happened to, this turn or turnsAgo turns before. */
export const happened = (
  events: string[],
  card: CardFilter,
  turnsAgo = 0,
): CardRef => ({
  happened: { events, card, ...(turnsAgo ? { turnsAgo } : {}) },
});
/** What a move takes: the cards a pick takes, this card (and where it says it is), or cards mentioned before. */
export type Moved = Pick<MoveDraft, "cards" | "picked" | "where" | "count" | "tokenStats">;
/** What a rule applies to each card it reaches, without those cards: its subject says them. */
export type Rule = Omit<Applied, "to">;
/** The cards a rule reaches. */
export type Reached = Pick<Applied, "to" | "cards">;
/** A rule on the cards its subject names. */
export const onCards = (cards: Reached, rules: Rule[]): Applied[] =>
  rules.map(({ effect, ...rest }) => ({ effect, ...cards, ...rest }));
export const picked = (pick: PickDraft): Moved => ({
  cards: PICKED,
  picked: pick,
});
export const moving = (
  move: MoveName,
  moved: Moved,
  rest: Partial<MoveDraft> = {},
): MoveDraft => ({ move, ...moved, ...rest });
/** One of two picks ("1 monster in your GY, or 1 face-up monster your opponent controls"): from either's places, each card as its own pick says. */
export const either = (a: PickDraft, b: PickDraft): PickDraft | undefined => {
  if (JSON.stringify(a.count) !== JSON.stringify(b.count)) return undefined;
  const from = { ...a.from };
  for (const side of ["own", "opponent"] as const)
    if (b.from[side])
      from[side] = [...new Set([...(from[side] ?? []), ...b.from[side]!])];
  const placed = (pick: PickDraft): CardFilter => ({
    ...pick.card,
    places: Object.values(pick.from).flat() as Place[],
  });
  return {
    pick: a.pick,
    count: a.count,
    from,
    card: { anyOf: [placed(a), placed(b)] },
    monster: (a.monster && b.monster) || undefined,
  };
};
/**
 * Two picks made as one ("1 X and 1 Y", "up to 1 X and up to 1 Y"): their cards together, each pick's count of its own
 * cards among them (a card that is both can be either's), and at least 1 card in all.
 */
export const together = (
  a: Some,
  b: Some,
  at: Where,
  make: MakePick,
): PickDraft | undefined => {
  if (a.count === "ALL" || b.count === "ALL") return undefined;
  const among = (card: CardFilter, k: number): Condition => ({
    atLeast: k,
    of: { among: { cards: THIS_PICK, card } },
  });
  const [one, two] = [
    { ...a, count: a.count },
    { ...b, count: b.count },
  ].map((s) => {
    const least = s.upTo ? 0 : s.count.min;
    const card = make(s.count, s.noun, at).card;
    const own = [
      ...(least > 0 ? [among(card, least)] : []),
      ...(s.upTo ? [{ not: among(card, s.count.max + 1) }] : []),
    ];
    return { least, most: s.count.max, card, own };
  });
  return {
    pick: "CHOSEN",
    count: {
      min: Math.max(1, one.least + two.least),
      max: one.most + two.most,
    },
    from: make(a.count, a.noun, at).from,
    card: { anyOf: [one.card, two.card] },
    pickRequires: [...one.own, ...two.own],
    monster: (a.noun.monster && b.noun.monster) || undefined,
  };
};
/** This card has a material of a noun ("this card has a "Photon" card as material"). */
export const hasMaterial = (s: Some): Condition => ({
  atLeast: 1,
  of: {
    among: {
      cards: { who: "MATERIALS_OF", of: THIS },
      card: withoutMonster(s.noun.card),
    },
  },
});
/** How a pick's cards are taken from places, for patterns that pick ("pick", "tributes"). */
export type MakePick = (
  count: Count | "ALL",
  noun: Noun,
  at: Where,
) => PickDraft;
/**
 * The cards a Tribute takes: monsters, so on the field they are in a Monster Zone ("Tribute 1 "Cyber Dragon""; ruling:
 * a-tribute-takes-monsters-from-the-monster-zone). The game reveals them as it Tributes them, so they can be face-down
 * whatever they are checked for (ruling: own-monsters-are-revealed-as-they-are-used; Linkuriboh's "Tribute 1 Level 1
 * monster" can Tribute a Set one).
 */
export const tribute: MakePick = (count, noun, at) =>
  pickOf(
    count,
    holds("a-tribute-takes-monsters-from-the-monster-zone")
      ? { ...noun, monster: true }
      : noun,
    at,
    { revealed: true },
  );
/** The ways a pick is written, its cards taken from places the way make takes them. */
export const picks = (make: MakePick): Pattern[] => [
  ["{s:quantifiedCardsOr} {at:fromOrInPlaces}", ({ s, at }) => make(s.count, s.noun, at)],
  ["{a:quantifiedCards} and {b:quantifiedCards} {at:fromOrInPlaces}", ({ a, b, at }) => together(a, b, at, make)],
  [
    "{a:quantifiedCards} and {b:quantifiedCards} , except {x:cardName} , {at:fromOrInPlaces}",
    ({ a, b, x, at }) =>
      together(
        a,
        {
          ...b,
          noun: {
            ...b.noun,
            card: both(b.noun.card, { none: [{ names: x }] }),
          },
        },
        at,
        make,
      ),
  ],
  // \"1 of your banished DARK monsters\": taken from the banishment, as \"from your banishment\" does
  [
    "{n:number} of your banished {x:cardPhrase}",
    ({ n, x }) => make(exactly(n), x, where("OWN", ["REMOVED"])),
  ],
  [
    "{n:number} of your opponent's banished {x:cardPhrase}",
    ({ n, x }) => make(exactly(n), x, where("OPPONENT", ["REMOVED"])),
  ],
  [
    "{s:quantifiedCards} {at:fromOrInPlaces} with a Level equal to {v:amount}",
    ({ s, at, v }) =>
      make(
        s.count,
        {
          ...s.noun,
          card: both(s.noun.card, { numbers: { LEVEL: { is: [v] } } }),
        },
        at,
      ),
  ],
  [
    "{s:quantifiedCards} {at:fromOrInPlaces} , except {x:cardName}",
    ({ s, at, x }) => except(make(s.count, s.noun, at), x),
  ],
  [
    "{s:quantifiedCards} {at:fromOrInPlaces} with a different original Attribute",
    ({ s, at }) => make(s.count, differentAttribute(s.noun), at),
  ],
];
/** The Extra Monster Zones and the Main Monster Zones, as filters of the Monster Zone's cards. */
export const EXTRA_MONSTER_ZONE: CardFilter = {
  places: ["MZONE"],
  numbers: { SEQUENCE: { min: 5 } },
};
export const MAIN_MONSTER_ZONE: CardFilter = {
  places: ["MZONE"],
  numbers: { SEQUENCE: { max: 4 } },
};
/** "cards", of any kind. */
export const CARDS: Noun = { card: {}, monster: false };
/** "monsters". */
export const MONSTERS: Noun = { card: { types: ["MONSTER"] }, monster: true };
/** How many cards its player's hand has. */
export const handCount: Value = {
  countOf: {
    matching: {
      count: 1,
      from: { own: ["HAND"] },
      card: {},
      targetable: false,
    },
  },
};
export const pointedTo: CardFilter = { states: ["LINKED_TO_THIS"] };
export const MULCHARMY_ACTIVATIONS = (archetypes: number[]): Value => ({
  activations: { types: ["MONSTER"], card: { archetypes } },
});
/** Places listed together. */
export const places = (
  ...lists: Pick<Where, "places" | "faceUp">[]
): Pick<Where, "places" | "faceUp"> => ({
  places: lists.flatMap((l) => l.places),
  faceUp: lists.flatMap((l) => l.faceUp),
});
/** How a list of one kind of phrase is written, for listPatterns. */
export interface ListShape {
  /** One item alone is a list ("DARK"). Races aren't: a lone Type is a cardPrefixMod of its own. */
  single?: boolean;
  /** Words between two items ("X or Y", "X and / or Y", "X / Y"). */
  conjunctions?: string[];
  /** Words between two items after a comma ("X , or Y"). */
  commaConjunctions?: string[];
  /** The kind that reads the rest of a list of three or more ("Y , or Z" in "X , Y , or Z"), written with commaTailPatterns. */
  tailKind?: string;
}
/**
 * The ways a list of one kind is written, so every list says "X", "X or Y" and "X, Y, or Z" the same way: what it means
 * is combine of its items' meanings, in printed order.
 */
export function listPatterns<T>(
  item: string,
  combine: (items: T[]) => unknown,
  {
    single = true,
    conjunctions = [],
    commaConjunctions = [],
    tailKind,
  }: ListShape,
): Pattern[] {
  const two = (words: string): Pattern => [
    `{a:${item}} ${words} {b:${item}}`,
    ({ a, b }) => combine([a, b]),
  ];
  return [
    ...(single ? [[`{a:${item}}`, ({ a }) => combine([a])] as Pattern] : []),
    ...conjunctions.map(two),
    ...commaConjunctions.map((words) => two(`, ${words}`)),
    ...(tailKind
      ? [
          [
            `{a:${item}} , {rest:${tailKind}}`,
            ({ a, rest }) => combine([a, ...rest]),
          ] as Pattern,
        ]
      : []),
  ];
}
/**
 * A list's tail kind: its items after the first, each after a comma, the last after one of the conjunctions ("Y , Z ,
 * or W"). Its meaning is the items' meanings, for the list to combine.
 */
export const commaTailPatterns = (
  item: string,
  tailKind: string,
  conjunctions: string[],
): Pattern[] => [
  [`{a:${item}} , {rest:${tailKind}}`, ({ a, rest }) => [a, ...rest]],
  ...conjunctions.map(
    (words): Pattern => [
      `{a:${item}} , ${words} {b:${item}}`,
      ({ a, b }) => [a, b],
    ],
  ),
];
/** Once per turn for every copy of the card (a hard once per turn); an oath when it says "activate". */
export function hard(oath = false) {
  return { count: 1, per: "TURN", shared: "NAME", oath } as const;
}
/** The MEANING ruling that a Summoning condition, and what an Equip Spell can equip, are no effect (CONDITION). */
export const CONDITIONS = "summoning-and-equip-conditions-are-not-effects";
/**
 * A Special Summon procedure of the card's own that its player can choose ("you can Special Summon this card (from your
 * hand)"), or its Normal Summon without Tributing: an unclassified effect, which negating the card's effects stops
 * (ruling: special-summon-and-no-tribute-procedures-are-unclassified).
 */
export function unclassifiedProcedure(summon: SummonDraft): SummonDraft {
  return holds("special-summon-and-no-tribute-procedures-are-unclassified")
    ? { ...summon, kind: "UNCLASSIFIED" }
    : summon;
}
/**
 * A way of Summoning the card that is no effect (ruling: summoning-and-equip-conditions-are-not-effects): a Summoning
 * condition's procedure ("Must (first) be Special Summoned ... by"), a Tribute Summon by other Tributes ("You can Tribute
 * Summon this card by Tributing ...", which Konami's text never numbers as an effect), TY-PHON's Xyz Summon by one monster.
 */
export function conditionProcedure<T extends SummonDraft | ExtraMaterials>(
  summon: T,
): T {
  return holds(CONDITIONS) ? { ...summon, kind: "CONDITION" } : summon;
}
/**
 * A condition its Special Summons must meet: SPSUMMON_CONDITION, which works wherever the card is. A Summoning condition
 * is no effect, so negating the card's effects doesn't lift it (ruling: summoning-and-equip-conditions-are-not-effects).
 */
export function summonCondition(conditions: Condition[]): Draft {
  return {
    kind: holds(CONDITIONS) ? "CONDITION" : "CONTINUOUS",
    where: [],
    applies: [
      { effect: "SPSUMMON_CONDITION", to: "THIS_CARD", requires: conditions },
    ],
  };
}
/**
 * "Normal or Special Summoned" is two effects, one on each event, that share their limit; what an event needs goes before
 * the effect's own requires, on its effect only.
 */
export function twins(effect: Draft): Draft[] {
  const { eventRequires, ...rest } = effect;
  return (effect.events ?? [undefined]).map((event) => {
    const twin = structuredClone(rest);
    if (event) twin.events = [event];
    const needs = event ? (eventRequires?.[event] ?? []) : [];
    if (needs.length) twin.requires = [...needs, ...(twin.requires ?? [])];
    return twin;
  });
}
