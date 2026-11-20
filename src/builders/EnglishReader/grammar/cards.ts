/** Cards: how many, of what, from where. */
import type { Codes, Grammar } from "../engine.js";
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
  differentAttribute,
  tribute,
  picks,
  EXTRA_MONSTER_ZONE,
  MAIN_MONSTER_ZONE,
  places,
} from "./shared.js";

export const CARDS: Grammar = {
  // ---- cards: how many, of what, from where ----
  pick: picks(pickOf),
  tributes: picks(tribute),
  some: [
    [
      "{n:number} {x:noun2}",
      ({ n, x }): Some => ({ count: exactly(n), noun: x }),
    ],
    ["a {x:noun2}", ({ x }): Some => ({ count: one, noun: x })],
    ["an {x:noun2}", ({ x }): Some => ({ count: one, noun: x })],
    [
      "another {x:noun2}",
      ({ x }): Some => ({
        count: one,
        noun: modified({ card: { states: ["NOT_SELF"] } }, x),
      }),
    ],
    ["all {x:noun2}", ({ x }): Some => ({ count: "ALL", noun: x })],
    [
      "up to {n:number} {x:noun2}",
      ({ n, x }): Some => ({ count: { min: 1, max: n }, noun: x, upTo: true }),
    ],
    [
      "any number of {x:noun2}",
      ({ x }): Some => ({ count: { min: 1, max: 99 }, noun: x }),
    ],
  ],
  /** One of two ("1 "Elfnote" Synchro Monster or 1 "Junora the Power Patron of Tuning""). */
  someOr: [
    ["{s:some}", ({ s }) => s],
    [
      "{a:some} or {b:some}",
      ({ a, b }): Some => ({
        count: a.count,
        noun: {
          card: { anyOf: [a.noun.card, b.noun.card] },
          monster: a.noun.monster && b.noun.monster,
        },
      }),
    ],
  ],
  noun2: [
    ["{x:noun}", ({ x }) => x],
    [
      "{x:noun} with a different original Attribute",
      ({ x }) => differentAttribute(x),
    ],
    [
      "{x:noun} with a different original Level / Rank / Link Rating",
      ({ x }): Noun => ({
        ...x,
        card: both(x.card, {
          relations: [
            { property: "ORIGINAL_LEVEL_RANK_LINK", differsFrom: BACK },
          ],
        }),
      }),
    ],
    [
      "{x:noun} Special Summoned from the {l:placeList}",
      ({ x, l }): Noun => ({
        ...x,
        card: both(x.card, { summonedFrom: l.places }),
      }),
    ],
    [
      "{x:noun} with {n:number} or more ATK",
      ({ x, n }): Noun => ({
        ...x,
        card: both(x.card, { numbers: { ATTACK: { min: n } } }),
      }),
    ],
    [
      "{x:noun} with {n:number} or less ATK",
      ({ x, n }): Noun => ({
        ...x,
        card: both(x.card, { numbers: { ATTACK: { max: n } } }),
      }),
    ],
    [
      "{x:noun} with {n:number} or more DEF",
      ({ x, n }): Noun => ({
        ...x,
        card: both(x.card, { numbers: { DEFENSE: { min: n } } }),
      }),
    ],
    [
      "{x:noun} with {n:number} or less DEF",
      ({ x, n }): Noun => ({
        ...x,
        card: both(x.card, { numbers: { DEFENSE: { max: n } } }),
      }),
    ],
  ],
  noun: [
    ["{h:head}", ({ h }) => h],
    ["{m:mod} {x:noun}", ({ m, x }) => modified(m, x)],
  ],
  head: [
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
    ["non-Tuners", (): Noun => ({ card: {}, monster: true })],
    ["{x:cardName}", ({ x }): Noun => ({ card: { names: x }, monster: false })],
  ],
  mod: [
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
  attributes: [
    ["{a:attribute}", ({ a }) => [a]],
    ["{a:attribute} or {b:attribute}", ({ a, b }) => [a, b]],
  ],
  frame: FRAMES.map(([word, frame]): [string, () => string] => [
    word,
    () => frame,
  ]),
  /** Frames listed, for monsters of any of them ("Ritual, Fusion, Synchro, Xyz, Pendulum, or Link Monster"). */
  frames: [
    ["{a:frame}", ({ a }) => [a]],
    ["{a:frame} or {b:frame}", ({ a, b }) => [a, b]],
    ["{a:frame} and / or {b:frame}", ({ a, b }) => [a, b]],
    ["{l:frameList}", ({ l }) => l],
  ],
  /** Three or more: commas, then "or" or "and/or" before the last. */
  frameList: [
    ["{a:frame} , {rest:frameList}", ({ a, rest }) => [a, ...rest]],
    ["{a:frame} , or {b:frame}", ({ a, b }) => [a, b]],
    ["{a:frame} , and / or {b:frame}", ({ a, b }) => [a, b]],
  ],
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
  races: [
    ["{a:race} or {b:race}", ({ a, b }) => [a, b]],
    ["{a:race} and / or {b:race}", ({ a, b }) => [a, b]],
    ["{a:race} , {b:race} , or {c:race}", ({ a, b, c }) => [a, b, c]],
    ["{a:race} , {b:race} , and / or {c:race}", ({ a, b, c }) => [a, b, c]],
  ],
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
  cardNames: [
    ["{x:cardName}", ({ x }) => x],
    ["{x:cardName} or {y:cardName}", ({ x, y }) => [...x, ...y]],
  ],
  archetypes: [
    ["{a:archetype}", ({ a }) => a],
    ["{a:archetype} or {b:archetype}", ({ a, b }) => [...a, ...b]],
    ["{a:archetype} and {b:archetype}", ({ a, b }) => [...a, ...b]],
    [
      "{a:archetype} , {b:archetype} , or {c:archetype}",
      ({ a, b, c }) => [...a, ...b, ...c],
    ],
    [
      "{a:archetype} , {b:archetype} , and {c:archetype}",
      ({ a, b, c }) => [...a, ...b, ...c],
    ],
  ],
  // ---- places ----
  at: [
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
  placeList: [
    ["{a:place}", ({ a }) => a],
    ["{a:place} or {b:place}", ({ a, b }) => places(a, b)],
    ["{a:place} and / or {b:place}", ({ a, b }) => places(a, b)],
    ["{a:place} / {b:place}", ({ a, b }) => places(a, b)],
    ["{a:place} , {b:place} , or {c:place}", ({ a, b, c }) => places(a, b, c)],
    ["{a:place} , {b:place} , and {c:place}", ({ a, b, c }) => places(a, b, c)],
    [
      "{a:place} , {b:place} , and / or {c:place}",
      ({ a, b, c }) => places(a, b, c),
    ],
  ],
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
  zone: [
    ["in an Extra Monster Zone", () => EXTRA_MONSTER_ZONE],
    ["in the Extra Monster Zone", () => EXTRA_MONSTER_ZONE],
    ["in the Main Monster Zone", () => MAIN_MONSTER_ZONE],
  ],
};
