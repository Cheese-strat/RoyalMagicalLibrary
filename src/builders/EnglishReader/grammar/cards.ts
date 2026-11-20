/** Cards: how many, of what, from where. */
import type { CardFilter } from "../../../lib/cardSchema.js";
import type { Codes, Grammar, Pattern } from "../engine.js";
import {
  BACK,
  both,
  center,
  exactly,
  type Noun,
  one,
  pickOf,
  type Where,
} from "../phrases.js";
import {
  type Some,
  ATTRIBUTES,
  FRAMES,
  RACES,
  where,
  FIELD,
  modified,
  tribute,
  picks,
  EXTRA_MONSTER_ZONE,
  MAIN_MONSTER_ZONE,
  places,
  listPatterns,
  commaTailPatterns,
} from "./shared.js";

export const CARDS: Grammar = {
  // ---- cards: how many, of what, from where ----
  pick: picks(pickOf),
  tributes: picks(tribute),
  quantifiedCards: [
    [
      "{n:number} {x:cardPhrase}",
      ({ n, x }): Some => ({ count: exactly(n), noun: x }),
    ],
    ["a {x:cardPhrase}", ({ x }): Some => ({ count: one, noun: x })],
    ["an {x:cardPhrase}", ({ x }): Some => ({ count: one, noun: x })],
    [
      "another {x:cardPhrase}",
      ({ x }): Some => ({
        count: one,
        noun: modified({ card: { states: ["NOT_SELF"] } }, x),
      }),
    ],
    ["all {x:cardPhrase}", ({ x }): Some => ({ count: "ALL", noun: x })],
    [
      "up to {n:number} {x:cardPhrase}",
      ({ n, x }): Some => ({ count: { min: 1, max: n }, noun: x, upTo: true }),
    ],
    [
      "any number of {x:cardPhrase}",
      ({ x }): Some => ({ count: { min: 1, max: 99 }, noun: x }),
    ],
  ],
  /** One of two ("1 "Elfnote" Synchro Monster or 1 "Junora the Power Patron of Tuning""). */
  quantifiedCardsOr: [
    ["{s:quantifiedCards}", ({ s }) => s],
    [
      "{a:quantifiedCards} or {b:quantifiedCards}",
      ({ a, b }): Some => ({
        count: a.count,
        noun: {
          card: { anyOf: [a.noun.card, b.noun.card] },
          monster: a.noun.monster && b.noun.monster,
        },
      }),
    ],
  ],
  /** A noun, and what is said of it after it ("monsters with 1700 or less original ATK"). */
  cardPhrase: [
    ["{x:cardNoun}", ({ x }) => x],
    [
      "{x:cardNoun} {m:cardPostMod}",
      ({ x, m }): Noun => ({ ...x, card: both(x.card, m) }),
    ],
  ],
  /** What a noun's cards are, said after it: the checks it adds to the noun's filter. */
  cardPostMod: [
    [
      "with a different original Attribute",
      (): CardFilter => ({
        relations: [{ property: "ORIGINAL_ATTRIBUTE", differsFrom: BACK }],
      }),
    ],
    [
      "with a different original Level / Rank / Link Rating",
      (): CardFilter => ({
        relations: [{ property: "ORIGINAL_LEVEL_RANK_LINK", differsFrom: BACK }],
      }),
    ],
    [
      "Special Summoned from the {l:placeList}",
      ({ l }): CardFilter => ({ summonedFrom: l.places }),
    ],
    // ATK and DEF, as they are or as the card's own (original: GetBaseAttack, which its own effects can change)
    ...(
      [
        ["ATK", "ATTACK"],
        ["DEF", "DEFENSE"],
        ["original ATK", "BASE_ATTACK"],
        ["original DEF", "BASE_DEFENSE"],
      ] as const
    ).flatMap(([words, number]): Pattern[] => [
      [
        `with {n:number} or more ${words}`,
        ({ n }): CardFilter => ({ numbers: { [number]: { min: n } } }),
      ],
      [
        `with {n:number} or less ${words}`,
        ({ n }): CardFilter => ({ numbers: { [number]: { max: n } } }),
      ],
    ]),
  ],
  cardNoun: [
    ["{h:cardBaseNoun}", ({ h }) => h],
    ["{m:cardPrefixMod} {x:cardNoun}", ({ m, x }) => modified(m, x)],
  ],
  cardBaseNoun: [
    ...["card", "cards"].map((word): [string, () => Noun] => [
      word,
      () => ({ card: {}, monster: false }),
    ]),
    ...["monster", "monsters"].map((word): [string, () => Noun] => [
      word,
      () => ({ card: { types: ["MONSTER"] }, monster: true }),
    ]),
    ...["Spell / Trap", "Spells / Traps"].map((words): [string, () => Noun] => [
      words,
      () => ({ card: { types: ["SPELL", "TRAP"] }, monster: false }),
    ]),
    ["Trap", (): Noun => ({ card: { types: ["TRAP"] }, monster: false })],
    ...["Spell", "Spells"].map((word): [string, () => Noun] => [
      word,
      () => ({ card: { types: ["SPELL"] }, monster: false }),
    ]),
    // TYPE_RITUAL is a Ritual Spell's as well as a Ritual Monster's
    [
      "Ritual Spell",
      (): Noun => ({
        card: { types: ["RITUAL"], allTypes: ["SPELL"] },
        monster: false,
      }),
    ],
    // What it is as printed, wherever it is and whatever it is treated as (a monster placed as a Continuous Trap)
    ...["Monster Card", "Monster Cards"].map((words): [string, () => Noun] => [
      words,
      () => ({ card: { originalTypes: ["MONSTER"] }, monster: false }),
    ]),
    ...["Monster", "Monsters"].flatMap(
      (word): [string, (slots: any) => Noun][] => [
        [
          `{f:frames} ${word}`,
          ({ f }) => ({
            card: {
              types: f,
              ...(f.includes("RITUAL") ? { allTypes: ["MONSTER"] } : {}),
            },
            monster: true,
          }),
        ],
        [
          `Normal ${word}`,
          () => ({ card: { types: ["NORMAL"] }, monster: true }),
        ],
        [
          `Effect ${word}`,
          () => ({ card: { types: ["EFFECT"] }, monster: true }),
        ],
      ],
    ),
    ...["Tuner", "Tuners"].map((word): [string, () => Noun] => [
      word,
      () => ({ card: { types: ["TUNER"] }, monster: true }),
    ]),
    ["non-Tuners", (): Noun => ({ card: {}, monster: true })],
    ["{x:cardName}", ({ x }): Noun => ({ card: { names: x }, monster: false })],
  ],
  cardPrefixMod: [
    ["face-up", (): Partial<Noun> => ({ faceUp: true })],
    ["other", (): Partial<Noun> => ({ card: { states: ["NOT_SELF"] } })],
    // A Tribute Summon is a Normal Summon too
    [
      "Normal Summoned",
      (): Partial<Noun> => ({
        card: { summonedBy: ["NORMAL"] },
        monster: true,
      }),
    ],
    [
      "Tribute Summoned",
      (): Partial<Noun> => ({
        card: { summonedBy: ["ADVANCE"] },
        monster: true,
      }),
    ],
    ...FRAMES.map(([word, frame]): [string, () => Partial<Noun>] => [
      `non-${word}`,
      () => ({ card: { none: [{ types: [frame] }] } }),
    ]),
    [
      "Level {n:number} or lower",
      ({ n }): Partial<Noun> => ({
        card: { numbers: { LEVEL: { max: n } } },
        monster: true,
      }),
    ],
    [
      "Level {n:number} or higher",
      ({ n }): Partial<Noun> => ({
        card: { numbers: { LEVEL: { min: n } } },
        monster: true,
      }),
    ],
    [
      "Level {n:number}",
      ({ n }): Partial<Noun> => ({
        card: { numbers: { LEVEL: { is: [n] } } },
        monster: true,
      }),
    ],
    ["{a:archetypes}", ({ a }): Partial<Noun> => ({ card: { archetypes: a } })],
    ["{a:attributes}", ({ a }): Partial<Noun> => ({ card: { attributes: a } })],
    // Types listed ("Insect, Plant, and/or Reptile")
    ["{r:races}", ({ r }): Partial<Noun> => ({ card: { races: r } })],
    ...Object.entries(RACES).flatMap(
      ([word, race]): [string, () => Partial<Noun>][] => [
        [word, () => ({ card: { races: [race] } })],
        [`non-${word}`, () => ({ card: { none: [{ races: [race] }] } })],
      ],
    ),
    ["Tuner", (): Partial<Noun> => ({ card: { types: ["TUNER"] } })],
    ["Continuous", (): Partial<Noun> => ({ card: { types: ["CONTINUOUS"] } })],
    // The second material of a Synchro Summon is a non-Tuner anyway
    ["non-Tuner", (): Partial<Noun> => ({})],
  ],
  attribute: ATTRIBUTES.map((attribute): [string, () => string] => [
    attribute,
    () => attribute,
  ]),
  attributes: listPatterns("attribute", (a: string[]) => a, {
    conjunctions: ["or"],
  }),
  frame: FRAMES.map(([word, frame]): [string, () => string] => [
    word,
    () => frame,
  ]),
  /** Frames listed, for monsters of any of them ("Ritual, Fusion, Synchro, Xyz, Pendulum, or Link Monster"). */
  frames: listPatterns("frame", (f: string[]) => f, {
    conjunctions: ["or", "and / or"],
    commaConjunctions: ["or", "and / or"],
    tailKind: "frameList",
  }),
  frameList: commaTailPatterns("frame", "frameList", ["or", "and / or"]),
  /** Frames listed with commas only ("(Ritual, Fusion, Synchro, Xyz, Pendulum, Link)"). */
  frameCommas: [
    ["{a:frame}", ({ a }) => [a]],
    ["{a:frame} , {rest:frameCommas}", ({ a, rest }) => [a, ...rest]],
  ],
  race: Object.entries(RACES).map(([word, race]): [string, () => string] => [
    word,
    () => race,
  ]),
  /** Two or more Types: "or", "and / or", or commas with one of them before the last. */
  races: listPatterns("race", (r: string[]) => r, {
    single: false,
    conjunctions: ["or", "and / or"],
    tailKind: "raceList",
  }),
  raceList: commaTailPatterns("race", "raceList", ["or", "and / or"]),
  archetype: [
    [
      "{name}",
      ({ name }: { name: Codes }) =>
        name.archetypes.length ? name.archetypes : undefined,
    ],
  ],
  cardName: [
    [
      "{name}",
      ({ name }: { name: Codes }) =>
        name.cards.length ? name.cards : undefined,
    ],
  ],
  /** Cards named one by one: "X", "X or Y". */
  cardNames: listPatterns("cardName", (x: number[][]) => x.flat(), {
    conjunctions: ["or"],
  }),
  archetypes: listPatterns("archetype", (a: number[][]) => a.flat(), {
    conjunctions: ["or", "and"],
    tailKind: "archetypeList",
  }),
  archetypeList: commaTailPatterns("archetype", "archetypeList", ["or", "and"]),
  // ---- places ----
  fromOrInPlaces: [
    ["from your {l:placeList}", ({ l }): Where => ({ side: "OWN", ...l })],
    ["in your {l:placeList}", ({ l }): Where => ({ side: "OWN", ...l })],
    ["your opponent controls", () => FIELD("OPPONENT")],
    ["your opponent currently controls", () => FIELD("OPPONENT")],
    ["you control", () => FIELD("OWN")],
    ["on the field", () => FIELD("BOTH")],
    ["on the field or in either GY", () => where("BOTH", ["ONFIELD", "GRAVE"])],
    ["from the field", () => FIELD("BOTH")],
    ["from the field and the GYs", () => where("BOTH", ["ONFIELD", "GRAVE"])],
    [
      "from the face-up Extra Decks and the field",
      () => where("BOTH", ["EXTRA", "ONFIELD"], ["EXTRA"]),
    ],
    // Your opponent's own places, as \"from your\" is for the player's (the opponent's GY, hand, banishment...)
    [
      "from your opponent's {l:placeList}",
      ({ l }): Where => ({ side: "OPPONENT", ...l }),
    ],
    [
      "in your opponent's {l:placeList}",
      ({ l }): Where => ({ side: "OPPONENT", ...l }),
    ],
    [
      "in your center Main Monster Zone",
      (): Where => ({ ...where("OWN", ["MZONE"]), card: center() }),
    ],
    ["in the GYs", () => where("BOTH", ["GRAVE"])],
  ],
  placeList: listPatterns(
    "place",
    (l: Pick<Where, "places" | "faceUp">[]) => places(...l),
    { conjunctions: ["or", "and / or", "/"], tailKind: "placeListTail" },
  ),
  placeListTail: commaTailPatterns("place", "placeListTail", [
    "or",
    "and",
    "and / or",
  ]),
  place: [
    ...(
      [
        ["hand", "HAND"],
        ["Deck", "DECK"],
        ["Main Deck", "DECK"],
        ["GY", "GRAVE"],
        ["banishment", "REMOVED"],
        ["Extra Deck", "EXTRA"],
        ["field", "ONFIELD"],
        ["Pendulum Zone", "PZONE"],
        ["Spell & Trap Zone", "SZONE"],
      ] as const
    ).map(
      ([words, place]): [string, () => Pick<Where, "places" | "faceUp">] => [
        words,
        () => ({ places: [place], faceUp: [] }),
      ],
    ),
    ["face-up field", () => ({ places: ["ONFIELD"], faceUp: ["ONFIELD"] })],
    ["face-up Extra Deck", () => ({ places: ["EXTRA"], faceUp: ["EXTRA"] })],
  ],
  /** Monster Zones: the Extra ones, or the Main ones. */
  monsterZoneFilter: [
    ["in an Extra Monster Zone", () => EXTRA_MONSTER_ZONE],
    ["in the Extra Monster Zone", () => EXTRA_MONSTER_ZONE],
    ["in the Main Monster Zone", () => MAIN_MONSTER_ZONE],
  ],
};
