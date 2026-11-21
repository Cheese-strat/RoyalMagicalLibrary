/** What a part of a card's text is: its sentences, the limitations and riders among them, how the card is Summoned, and its materials. */
import type {
  CardRef,
  Comparison,
  Condition,
  Count,
  Material,
  Property,
} from "../../../lib/cardSchema.js";
import { holds } from "../../../lib/ruled.js";
import type { Grammar } from "../engine.js";
import {
  BACK,
  both,
  type Draft,
  exactly,
  forPlayer,
  type Limitation,
  one,
  pickOf,
  type EquipTo,
  type MoveDraft,
  type Noun,
  type Sentence,
  take,
  THIS,
  THIS_PICK,
  thisIs,
  withoutMonster,
} from "../phrases.js";
import {
  where,
  happened,
  MULCHARMY_ACTIVATIONS,
  hard,
  keptActivation,
  type Some,
  modified,
  MONSTERS,
  conditionProcedure,
  unclassifiedProcedure,
  summonCondition,
  tribute,
  listPatterns,
  continuous,
  type Rule,
} from "./shared.js";

/** How a Ritual Summon's Tributes' total Level compares with the Ritual Monster's Level, or with a number printed instead (total). */
interface RitualTotal {
  levels: Comparison;
  total?: number;
}

/**
 * Materials that include some that are something more: those, which are what the rest are as well, and the rest, as
 * many fewer as those are.
 */
function including(material: Material, some: Some): Material[] | undefined {
  const { count } = some;
  const all = material.count;
  if (count === "ALL" || all === "ALL" || count.min !== count.max)
    return undefined;
  const least = all.min - count.min;
  const most = all.max === 99 ? 99 : all.max - count.max;
  if (least < 0 || most < 0) return undefined;
  return [
    {
      count,
      role: material.role,
      card: both(material.card, withoutMonster(some.noun.card)),
    },
    ...(most > 0 ? [{ ...material, count: { min: least, max: most } }] : []),
  ];
}

/**
 * A material of a noun: used as the Tuner when the noun is a Tuner, whatever else it must be ("1 DARK Tuner" is a Tuner
 * that is DARK), and otherwise used as anything.
 */
function materialOf(count: Count, noun: Noun): Material {
  const card = withoutMonster(noun.card);
  const { types, ...rest } = card;
  return types?.length === 1 && types[0] === "TUNER"
    ? { count, role: "TUNER", card: rest }
    : { count, role: "ANY", card };
}

/** The materials' own cards, as a Summon's conditions name them. */
const MATERIALS: CardRef = { who: "SUMMON_MATERIALS", of: THIS };
/** All the materials are the same in a property: they have 1 of it between them. */
const same = (by: Property): Condition => ({
  compare: {
    value: { countOf: { different: { cards: MATERIALS, by } } },
    is: "EQUAL",
    to: 1,
  },
});
/** All the materials are different in a property: as many of it as there are materials. */
const different = (by: Property): Condition => ({
  compare: {
    value: { countOf: { different: { cards: MATERIALS, by } } },
    is: "EQUAL",
    to: { countOf: { cards: MATERIALS } },
  },
});
/** A material that can't be a Token (\"2+ monsters, except Tokens\"). */
const exceptTokens = (m: Material): Material => ({
  ...m,
  card: both(m.card, { none: [{ types: ["TOKEN"] }] }),
});

export const TEXT: Grammar = {
  // ---- a part of a card's text ----
  text: [
    ["{s:sentence} {rest:text}", ({ s, rest }) => [s, ...rest]],
    ["{s:sentence}", ({ s }) => [s]],
    // A bulleted list holds what the words before it say. Its bullets are effects of their own only after "each of the
    // following effects", ending the part. Anywhere else they are a sentence's (its modes, or the effects it applies
    // or grants), so a bullet can't start a sentence.
    [
      "{l:limitation} {b:●effect}",
      ({ l, b }) =>
        (l as Limitation).of === "FOLLOWING"
          ? [
              { limitation: l },
              ...(b as Draft[]).map((e): Sentence => ({ effects: [e] })),
            ]
          : undefined,
    ],
  ],
  sentence: [
    ["{e:effect}", ({ e }): Sentence => ({ effects: [e] })],
    ["{l:limitation}", ({ l }): Sentence => ({ limitation: l })],
    ["{r:rider}", ({ r }): Sentence => ({ rider: r })],
    [
      "( This card is always treated as {a:article} {x:archetypes} card . )",
      ({ x }): Sentence => ({ treatedAs: x }),
    ],
    ["{s:summonText}", ({ s }) => s],
    [
      "This card gains these effects based on the original Attributes of materials used for its Synchro Summon . {g:●attributeGrant}",
      ({ g }): Sentence => ({ effects: g }),
    ],
    [
      "Gains these effects based on the number of monsters it points to . {g:●countGrant}",
      ({ g }): Sentence => ({ effects: g }),
    ],
    // A reminder: a card of the archetype can Ritual Summon it (one that says it Ritual Summons it), which the rules allow anyway
    ["You can Ritual Summon this card with {s:quantifiedCards} .", (): Sentence => ({})],
    [
      "You can Ritual Summon this card with {x:cardName} .",
      (): Sentence => ({}),
    ],
    // A reminder that only one effect that gives a Normal Summon more applies a turn, a rule that holds without it
    ["( You can only gain this effect once per turn . )", (): Sentence => ({})],
    ["Equip only to {e:equippable} .", ({ e }): Sentence => ({ equipTo: e })],
    ["It {p:predicate} .", ({ p }): Sentence => ({ aboutIt: p })],
    // An activation that keeps its target and only gives it rules: they are rules of this card on that card for as long
    // as this card targets it, not something done as it resolves (Spellbinding Circle's script registers them as
    // EFFECT_TYPE_TARGET effects, apart from the activation)
    [
      "Activate this card by targeting {t:target} ; {k:keptRules} .",
      ({ t, k }): Sentence => ({
        effects: [
          keptActivation(t)!,
          continuous(
            (k as Rule[]).map((rule) => ({ ...rule, to: "CARD_IT_TARGETS" })),
          ),
        ],
      }),
    ],
    // The old Ritual Spell: what it Ritual Summons, then its Tributes
    [
      "{r:ritualOf} . You must also Tribute {t:ritualTributes} .",
      ({ r, t }): Sentence => ({
        effects: [
          {
            does: [
              {
                moves: [
                  take("RITUAL_SUMMON", pickOf(one, r.noun, r.at), {
                    to: { all: { from: t.from, card: t.card } },
                    levels: t.levels,
                    ...(t.total !== undefined ? { levelTotal: t.total } : {}),
                  }),
                ],
                optional: false,
              },
            ],
          },
        ],
      }),
    ],
  ],
  /** What an old Ritual Spell Ritual Summons, and from where (the hand, unless it says): the Ritual Monsters it names, or any of a kind. */
  ritualOf: [
    ["{w:ritualWhich}", ({ w }) => ({ ...w, at: where("OWN", ["HAND"]) })],
    ["{w:ritualWhich} {at:fromOrInPlaces}", ({ w, at }) => ({ ...w, at })],
  ],
  ritualWhich: [
    [
      "This card is used to Ritual Summon {x:cardNames}",
      ({ x }) => ({ noun: { card: { names: x }, monster: true } }),
    ],
    [
      "This card is used to Ritual Summon any {x:cardNoun}",
      ({ x }) => ({ noun: x }),
    ],
    [
      "This card can be used to Ritual Summon any {x:cardNoun}",
      ({ x }) => ({ noun: x }),
    ],
  ],
  /**
   * An old Ritual Spell's Tributes: monsters from your hand or field, and how their total Level compares with the Ritual
   * Monster's. Older texts put the places last ("whose total Levels equal 8 or more from the field or your hand"), which
   * RML doesn't read (old texts aren't included: Cheesestrat, 2026-11-16).
   */
  ritualTributes: [
    [
      "{x:cardNoun} {at:fromOrInPlaces} whose total Levels {t:ritualTotal}",
      ({ x, at, t }) => ({ ...tribute(one, x, at), ...t }),
    ],
    [
      "{x:cardNoun} {at:fromOrInPlaces} , whose total Levels {t:ritualTotal}",
      ({ x, at, t }) => ({ ...tribute(one, x, at), ...t }),
    ],
  ],
  /** How Tributes' total Level compares: with the Ritual Monster's Level, or with a number (an old Ritual Spell prints its original Level). */
  ritualTotal: [
    [
      "equal {n:number} or more",
      ({ n }): RitualTotal => ({ levels: "AT_LEAST", total: n }),
    ],
    [
      "equal exactly {n:number}",
      ({ n }): RitualTotal => ({ levels: "EQUAL", total: n }),
    ],
    [
      "exactly equal {n:number}",
      ({ n }): RitualTotal => ({ levels: "EQUAL", total: n }),
    ],
    ["equal or exceed its Level", (): RitualTotal => ({ levels: "AT_LEAST" })],
    [
      "equal or exceed the Level of the Ritual Monster",
      (): RitualTotal => ({ levels: "AT_LEAST" }),
    ],
    [
      "equal or exceed the Level of the Ritual Monster you Ritual Summon",
      (): RitualTotal => ({ levels: "AT_LEAST" }),
    ],
    [
      "equal the Level of the Ritual Monster you Ritual Summon",
      (): RitualTotal => ({ levels: "EQUAL" }),
    ],
    [
      "exactly equal the Level of the Ritual Monster you Ritual Summon",
      (): RitualTotal => ({ levels: "EQUAL" }),
    ],
  ],
  /** The monsters an Equip Spell can equip. */
  equippable: [
    ["{s:quantifiedCardsOr}", ({ s }): EquipTo => ({ noun: s.noun, side: "BOTH" })],
    ["{x:cardNoun}", ({ x }): EquipTo => ({ noun: x, side: "BOTH" })],
    [
      "{x:cardNoun} or {y:cardNoun}",
      ({ x, y }): EquipTo => ({
        noun: { card: { anyOf: [x.card, y.card] }, monster: false },
        side: "BOTH",
      }),
    ],
    [
      "{s:quantifiedCards} you control",
      ({ s }): EquipTo => ({ noun: s.noun, side: "OWN" }),
    ],
    [
      "an opponent's {x:cardNoun}",
      ({ x }): EquipTo => ({ noun: x, side: "OPPONENT" }),
    ],
  ],
  article: [
    ["a", () => true],
    ["an", () => true],
  ],

  // ---- limitations, and words that add to the effect before them ----
  limitation: [
    // "use": it counts once the effect is activated, whatever is negated after; "activate": an oath, which a negated
    // activation gives back (ruling: activate-limits-are-oaths-use-limits-are-not). "once per Chain" is read the same
    // way, by name (ruling: once-per-chain-activation-limits-are-by-name-and-oaths)
    [
      "You can only use {w:limited} of {name} {t:limitFrequency} .",
      ({ w, t }): Limitation => ({ ...w, limit: { ...hard(), ...t } }),
    ],
    [
      "You can only activate {w:limited} of {name} {t:limitFrequency} .",
      ({ w, t }): Limitation => {
        if (t.per === "CHAIN") {
          const byNameAndOath = holds(
            "once-per-chain-activation-limits-are-by-name-and-oaths",
          );
          return {
            ...w,
            limit: {
              ...hard(byNameAndOath),
              shared: byNameAndOath ? "NAME" : "COPY",
              ...t,
            },
          };
        }
        return {
          ...w,
          limit: {
            ...hard(holds("activate-limits-are-oaths-use-limits-are-not")),
            ...t,
          },
        };
      },
    ],
    [
      "You can only use {n:number} {name} effect per turn , and only once that turn .",
      ({ n }): Limitation => ({
        of: "ALL",
        together: true,
        limit: { ...hard(), count: n },
      }),
    ],
    [
      "You can only use {n:number} of {w:limitedAll} of {name} per turn , and only once that turn .",
      ({ n, w }): Limitation => ({
        of: w,
        together: true,
        limit: { ...hard(), count: n },
      }),
    ],
    // The card itself: its activation, not its effects once it is on the field
    [
      "You can only activate {n:number} {name} {p:limitPeriod} .",
      ({ n, p }): Limitation => ({
        of: "ACTIVATION",
        together: true,
        limit: {
          ...hard(holds("activate-limits-are-oaths-use-limits-are-not")),
          count: n,
          per: p,
        },
      }),
    ],
    [
      "You can only activate {name} once {p:limitPeriod} .",
      ({ p }): Limitation => ({
        of: "ACTIVATION",
        together: true,
        limit: {
          ...hard(holds("activate-limits-are-oaths-use-limits-are-not")),
          per: p,
        },
      }),
    ],
    [
      "You can only Special Summon {name} once per turn this way .",
      (): Limitation => ({ of: "SUMMON", together: false, limit: hard(true) }),
    ],
    [
      "You can only Special Summon {name} once per turn this way , no matter which method you use .",
      (): Limitation => ({ of: "SUMMONS", together: false, limit: hard(true) }),
    ],
  ],
  /** Which effects of the card's part a limitation names. */
  limited: [
    ...["this effect", "the effect", "the previous effect"].map(
      (words): [string, () => Pick<Limitation, "of" | "together">] => [
        words,
        () => ({ of: "PREVIOUS", together: false }),
      ],
    ),
    ...[
      ["each effect", "ALL"],
      ["each of these effects", "ALL"],
      ["the following effect", "FOLLOWING"],
      ["each of the following effects", "FOLLOWING"],
      ["each of the preceding effects", "PRECEDING"],
      ["each of the previous effects", "PRECEDING"],
    ].map(
      ([words, of]): [string, () => Pick<Limitation, "of" | "together">] => [
        words,
        () => ({ of: of as Limitation["of"], together: false }),
      ],
    ),
  ],
  /** Several effects that share a count. */
  limitedAll: [
    ["these effects", (): Limitation["of"] => "ALL"],
    ["the following effects", (): Limitation["of"] => "FOLLOWING"],
  ],
  /** How often. */
  limitFrequency: [
    ["once {p:limitPeriod}", ({ p }) => ({ count: 1, per: p })],
    ["twice per turn", () => ({ count: 2, per: "TURN" })],
    ["thrice per turn", () => ({ count: 3, per: "TURN" })],
  ],
  limitPeriod: [
    ["per turn", () => "TURN"],
    ["per Duel", () => "DUEL"],
    ["per Chain", () => "CHAIN"],
  ],
  rider: [
    // What applies once the card resolves, as a part of its own: whatever the parts before it did ("also")
    [
      "{m:afterCardResolves} .",
      ({ m }): Sentence["rider"] => ({ also: m }),
    ],
    // What the effect before it Special Summons is Summoned as another kind of Summon
    [
      "( This is treated as {a:article} {f:frame} Summon . )",
      ({ f }): Sentence["rider"] => ({ summonType: [f] }),
    ],
    [
      "Your opponent cannot activate cards or effects when that monster is Special Summoned .",
      (): Sentence["rider"] => ({
        moves: [
          {
            move: "CHAIN_LIMIT",
            cards: BACK,
            canRespond: "YOU",
            until: ["SUMMON"],
          },
        ],
      }),
    ],
    // Its player can't activate another after it this turn, and can't activate it after two
    [
      "You can only activate 1 other {a:archetype} monster effect , the turn you activate this effect .",
      ({ a }): Sentence["rider"] => ({
        onActivation: [
          forPlayer([
            {
              effect: "CANNOT_ACTIVATE",
              to: { players: "OWN" },
              requires: [
                { effect: { types: ["MONSTER"], card: { archetypes: a } } },
                {
                  compare: {
                    value: MULCHARMY_ACTIVATIONS(a),
                    is: "AT_LEAST",
                    to: 2,
                  },
                },
              ],
            },
          ]),
        ],
        requires: [
          {
            compare: { value: MULCHARMY_ACTIVATIONS(a), is: "AT_MOST", to: 1 },
          },
        ],
      }),
    ],
  ],

  // ---- how the card is Summoned ----
  summonText: [
    [
      "You can Special Summon this card ( from your {l:placeList} ) to your center Main Monster Zone .",
      ({ l }): Sentence => ({
        summon: unclassifiedProcedure({
          method: "PROCEDURE",
          from: l.places,
          zones: ["CENTER"],
        }),
      }),
    ],
    [
      "If {c:conditionClause} , you can Tribute Summon this card face-up by Tributing monsters from your {a:place} and / or your opponent's {b:place} .",
      ({ c, a, b }): Sentence => ({
        tributes: conditionProcedure({
          from: { own: a.places, opponent: b.places.map(() => "MZONE") },
          positions: ["FACEUP"],
          requires: c.requires,
        }),
      }),
    ],
    // A Special Summon procedure of its own, when a condition holds (\"If you control no monsters, you can Special Summon this card (from your hand).\")
    ...[
      "If {c:condition} , you can Special Summon this card ( from your {l:placeList} ) .",
      "If {c:condition} , you can Special Summon this card from your {l:placeList} .",
    ].map((words): [string, (slots: any) => Sentence | undefined] => [
      words,
      ({ c, l }) =>
        c.requires && Object.keys(c).every((key) => key === "requires")
          ? {
              summon: unclassifiedProcedure({
                method: "PROCEDURE",
                from: l.places,
                requires: c.requires,
              }),
            }
          : undefined,
    ]),
    // Summon conditions: how it can be Summoned, and how not
    ...[
      "Cannot be Normal Summoned / Set .",
      "Cannot be Normal Summoned or Set .",
      "This card cannot be Normal Summoned or Set .",
    ].map((words): [string, () => Sentence] => [
      words,
      () => ({ rules: { cannotNormalSummon: true } }),
    ]),
    ...[
      "Cannot be Special Summoned .",
      "This card cannot be Special Summoned .",
    ].map((words): [string, () => Sentence] => [
      words,
      () => ({ effects: [summonCondition([{ never: true }])] }),
    ]),
    [
      "Cannot be Special Summoned from the {l:placeList} .",
      ({ l }): Sentence => ({
        effects: [summonCondition([{ not: thisIs({ places: l.places }) }])],
      }),
    ],
    // Summoned its own way: only that way, or that way before any other (which an Extra Deck or Ritual Monster must be anyway)
    ...[
      "Must be {f:frame} Summoned .",
      "Must be {f:frame} Summoned and cannot be Special Summoned by other ways .",
    ].map((words): [string, (slots: any) => Sentence] => [
      words,
      ({ f }) => ({
        effects: [summonCondition([{ summonType: [f] }])],
        rules: { mustBeProperlySummoned: true },
      }),
    ]),
    [
      "Must first be {f:frame} Summoned .",
      (): Sentence => ({ rules: { mustBeProperlySummoned: true } }),
    ],
    [
      "Must first be Special Summoned ( from your {l:placeList} ) by {c:gerunds} .",
      ({ l, c }): Sentence => ({
        summon: conditionProcedure({
          method: "PROCEDURE",
          from: l.places,
          cost: c,
        }),
        rules: { mustBeProperlySummoned: true },
      }),
    ],
    // By another card's effect: the effect that Special Summons it is one of that card's
    [
      "Must be Special Summoned with {x:cardName} .",
      ({ x }): Sentence => ({
        effects: [summonCondition([{ effect: { card: { names: x } } }])],
        rules: { mustBeProperlySummoned: true },
      }),
    ],
    // Only one face-up: on each player's field, or on the field; of this card, or of the cards that match ("There can only
    // be 1 face-up "Malefic" monster on the field"). Only one can be face-up anyway, so "face-up" says nothing
    [
      "You can only control {n:number} {x:cardNoun} .",
      ({ n, x }): Sentence | undefined =>
        n === 1 ? { only: { side: "OWN", card: x.card } } : undefined,
    ],
    [
      "There can only be {n:number} {x:cardNoun} on the field .",
      ({ n, x }): Sentence | undefined =>
        n === 1 ? { only: { side: "BOTH", card: x.card } } : undefined,
    ],
    // A Tribute Summon of its own, with other Tributes: "face-up" only, so not a Tribute Set; otherwise a Tribute Set
    // too (ruling: a-tribute-set-is-a-tribute-summon)
    ...[
      ["You can Tribute Summon this card face-up by Tributing {s:quantifiedCards} .", true],
      ["You can Tribute Summon this card by Tributing {s:quantifiedCards} .", false],
    ].map(([words, faceUp]): [string, (slots: any) => Sentence | undefined] => [
      words as string,
      ({ s }) =>
        s.count === "ALL"
          ? undefined
          : {
              summon: conditionProcedure({
                method: "TRIBUTE",
                from: ["HAND"],
                materials: [
                  {
                    count: s.count,
                    role: "ANY",
                    card: withoutMonster(s.noun.card),
                  },
                ],
                ...(faceUp || !holds("a-tribute-set-is-a-tribute-summon")
                  ? { positions: ["FACEUP"] }
                  : {}),
              }),
            },
    ]),
    // A Normal Summon without Tributes, whatever its Level: "Normal Summon", not Set, so face-up only (as Konami's FAQ
    // of these cards says too: セットする事はできません)
    [
      "You can Normal Summon this card without Tributing .",
      (): Sentence => ({
        summon: unclassifiedProcedure({
          method: "NORMAL",
          from: ["HAND"],
          positions: ["FACEUP"],
        }),
      }),
    ],
    [
      "If {c:condition} , you can Normal Summon this card without Tributing .",
      ({ c }): Sentence | undefined =>
        c.requires && Object.keys(c).every((key) => key === "requires")
          ? {
              summon: unclassifiedProcedure({
                method: "NORMAL",
                from: ["HAND"],
                positions: ["FACEUP"],
                requires: c.requires,
              }),
            }
          : undefined,
    ],
    // A Special Summon procedure of its own, by what it does as it is made: its cost ("by Tributing 1 Dragon monster")
    [
      "You can Special Summon this card ( from your {l:placeList} ) by {c:gerunds} .",
      ({ l, c }): Sentence => ({
        summon: unclassifiedProcedure({ method: "PROCEDURE", from: l.places, cost: c }),
      }),
    ],
    // Its Xyz Summon by using one monster, which can only be one with the highest ATK: comparing ATK, it is face-up (a
    // face-down monster shows none). Its materials become this card's; "If you do" is what Summoning it this way costs.
    [
      "During the turn , or turn after , your opponent Special Summoned {n:number} or more monsters from the {l:placeList} , you can also {f:frame} Summon this card by using 1 monster you control with the highest ATK ( your choice , if tied ) . ( Transfer its materials to this card . ) If you do , {t:lingeringPlayerMove} .",
      ({ n, l, f, t }): Sentence => ({
        summon: conditionProcedure({
          method: f,
          from: ["EXTRA"],
          materials: [
            {
              count: one,
              role: "ANY",
              card: {
                among: [
                  {
                    who: "HIGHEST",
                    of: {
                      all: {
                        from: { own: ["MZONE"] },
                        card: { states: ["FACEUP"] },
                      },
                    },
                    by: "ATTACK",
                  },
                ],
              },
            },
          ],
          cost: t,
          requires: [
            {
              any: [0, 1].map(
                (turnsAgo): Condition => ({
                  atLeast: n,
                  of: {
                    cards: happened(
                      ["SPSUMMON_SUCCESS"],
                      { summonedByPlayer: "OPPONENT", summonedFrom: l.places },
                      turnsAgo,
                    ),
                  },
                }),
              ),
            },
          ],
        }),
      }),
    ],
    // A procedure it must be Summoned by: nothing else Summons it (a revive limit, and a condition that never holds)
    [
      "Must be Special Summoned ( from your {l:placeList} ) by {c:gerunds} .",
      ({ l, c }): Sentence => ({
        summon: conditionProcedure({
          method: "PROCEDURE",
          from: l.places,
          cost: c,
        }),
        effects: [summonCondition([{ never: true }])],
        rules: { mustBeProperlySummoned: true },
      }),
    ],
    [
      "Must be either {f:frame} Summoned , or Special Summoned ( from your {l:placeList} ) by {c:gerunds} .",
      ({ f, l, c }): Sentence => ({
        summon: conditionProcedure({
          method: "PROCEDURE",
          from: l.places,
          cost: c,
        }),
        effects: [summonCondition([{ summonType: [f] }])],
        rules: { mustBeProperlySummoned: true },
      }),
    ],
    [
      "For this card's Synchro Summon , you can treat {n:number} {x:cardNoun} you control as a Tuner .",
      ({ x }): Sentence => ({ tuner: withoutMonster(x.card) }),
    ],
  ],
  gerunds: listPatterns("gerund", (g: MoveDraft[][]) => g.flat(), {
    conjunctions: ["and"],
  }),
  gerund: [
    [
      "discarding {s:quantifiedCards}",
      ({ s }) => [
        take("DISCARD", pickOf(s.count, s.noun, where("OWN", ["HAND"]))),
      ],
    ],
    ["Tributing {p:tributes}", ({ p }) => [take("TRIBUTE", p)]],
    [
      "paying {n:number} LP",
      ({ n }): MoveDraft[] => [{ move: "PAY_LP", amount: n, player: "OWN" }],
    ],
    ["banishing {p:pick}", ({ p }) => [take("BANISH", p)]],
    ["sending {p:pick} to the GY", ({ p }) => [take("TO_GRAVE", p)]],
    [
      "shuffling {p:pick} into the Deck",
      ({ p }) => [take("TO_DECK", p, { deckPlace: ["DECKSHUFFLE"] })],
    ],
    ["returning {p:pick} to the hand", ({ p }) => [take("TO_HAND", p)]],
    // "returning 3 monsters (1 Fusion, 1 Synchro, and 1 Xyz) ...": one of each among them
    [
      "returning {s:quantifiedCards} ( 1 {a:frame} , 1 {b:frame} , and 1 {c:frame} ) {at:fromOrInPlaces} to the Extra Deck",
      ({ s, a, b, c, at }) => [
        take("TO_DECK", {
          ...pickOf(s.count, s.noun, at),
          pickRequires: [a, b, c].map(
            (type): Condition => ({
              atLeast: 1,
              of: { among: { cards: THIS_PICK, card: { types: [type] } } },
            }),
          ),
        }),
      ],
    ],
  ],

  // ---- materials ----
  /** A materials line: its materials, and what they must be together. */
  materialsLine: [
    ["{m:materials}", ({ m }): Sentence => ({ materials: m })],
    // What they must be together: the same or different Types, Attributes, Levels, Ranks or names
    [
      "{m:material} {r:materialsRelation}",
      ({ m, r }): Sentence => ({ materials: [m], materialsRequire: r }),
    ],
    ...["Tokens", "a Token"].map((words): [string, (slots: any) => Sentence] => [
      `{m:material} {r:materialsRelation} , except ${words}`,
      ({ m, r }) => ({ materials: [exceptTokens(m)], materialsRequire: r }),
    ]),
  ],
  /** How materials compare with each other, as the conditions on the Summon's materials. */
  materialsRelation: [
    ["with the same {p:sameProperty}", ({ p }): Condition[] => [same(p)]],
    [
      "with different {p:differentProperty}",
      ({ p }): Condition[] => [different(p)],
    ],
    [
      "with the same {a:sameProperty} but different {b:differentProperty}",
      ({ a, b }): Condition[] => [same(a), different(b)],
    ],
    [
      "with the same {a:sameProperty} and {b:sameProperty}",
      ({ a, b }): Condition[] => [same(a), same(b)],
    ],
    [
      "with the same {a:sameProperty} and {b:sameProperty} , but different {c:differentProperty}",
      ({ a, b, c }): Condition[] => [same(a), same(b), different(c)],
    ],
    [
      "with different {a:differentProperty} and {b:differentProperty}",
      ({ a, b }): Condition[] => [different(a), different(b)],
    ],
    [
      "with the same {a:sameProperty} or {b:sameProperty}",
      ({ a, b }): Condition[] => [{ any: [same(a), same(b)] }],
    ],
  ],
  /** What materials are the same in, in the singular, and different in, in the plural. */
  sameProperty: [
    ["name", (): Property => "NAME"],
    ["Attribute", (): Property => "ATTRIBUTE"],
    ["Type", (): Property => "RACE"],
    ["Level", (): Property => "LEVEL"],
    ["Rank", (): Property => "RANK"],
  ],
  differentProperty: [
    ["names", (): Property => "NAME"],
    ["Attributes", (): Property => "ATTRIBUTE"],
    ["Types", (): Property => "RACE"],
    ["Levels", (): Property => "LEVEL"],
    ["Ranks", (): Property => "RANK"],
  ],
  materials: [
    ["{a:material}", ({ a }) => [a]],
    ["{a:material} + {rest:materials}", ({ a, rest }) => [a, ...rest]],
    // Some of them are something more (\"2+ monsters, including a Fiend monster\", \"2 Beast-Warrior monsters, including
    // a WIND \"Ancient Warriors\" monster\")
    ["{m:material} , including {s:quantifiedCards}", ({ m, s }) => including(m, s)],
    ["{m:material} including {s:quantifiedCards}", ({ m, s }) => including(m, s)],
    ...["Tokens", "a Token"].map((words): [string, (slots: any) => Material[]] => [
      `{m:material} , except ${words}`,
      ({ m }) => [exceptTokens(m)],
    ]),
  ],
  material: [
    // A Tuner of some kind ("1 Tuner", "1+ Tuners", "1 DARK Tuner", "1 WIND Machine Tuner") is used as the Tuner
    [
      "{n:number} {x:cardPhrase}",
      ({ n, x }): Material => materialOf(exactly(n), x),
    ],
    [
      "{n:number} {x:cardPhrase} {z:monsterZoneFilter}",
      ({ n, x, z }): Material => {
        const m = materialOf(exactly(n), x);
        return { ...m, card: both(m.card, z) };
      },
    ],
    ...["{n:number} + {x:cardPhrase}", "{n:number} or more {x:cardPhrase}"].map(
      (words): [string, (slots: any) => Material] => [
        words,
        ({ n, x }) => materialOf({ min: n, max: 99 }, x),
      ],
    ),
    [
      "{x:cardNames}",
      ({ x }): Material => ({ count: one, role: "ANY", card: { names: x } }),
    ],
  ],
};
