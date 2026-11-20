/**
 * Rules: what a continuous effect, or an effect on a player, applies, and the cards it reaches. A rule about cards is a
 * subject and a predicate: the subject names the cards ("this card", "the equipped monster", "monsters you control"),
 * the predicate what applies to each of them ("gains 500 ATK", "cannot be destroyed by battle"). A predicate is written
 * once, in the singular, and read in the plural too.
 */
import type { Applied, Per } from "../../../lib/cardSchema.js";
import type { Grammar, Pattern } from "../engine.js";
import {
  affected,
  BACK,
  both,
  center,
  type Noun,
  one,
  pickOf,
  type Where,
  withoutMonster,
} from "../phrases.js";
import {
  FIELD,
  attackLock,
  extraDeckLock,
  cannotActivate,
  onCards,
  type Reached,
  type Rule,
} from "./shared.js";

/** A change of ATK, DEF, or both. */
const stats = (which: string[], value: Rule["value"]): Rule[] =>
  which.map((stat) => ({ effect: `UPDATE_${stat}`, value }));

/** As many as the cards that match, counted from the effect's player's side ("for each card in your hand"). */
function perCard(noun: Noun, at: Where): Per {
  const { from, card } = pickOf(one, noun, at);
  return { matching: { from, card, ofAffectedController: false } };
}

/** Protection from effects: from every one, or from those the filter describes (the opponent's, monster effects). */
const proofAgainst = (effect: string, effects: object): Rule =>
  Object.keys(effects).length
    ? { effect, value: 1, requires: [{ effect: effects }] }
    : { effect, value: 1 };
const BATTLE_PROOF: Rule = { effect: "INDESTRUCTABLE_BATTLE", value: 1 };
const immune = (effects: object): Rule => ({
  effect: "IMMUNE_EFFECT",
  requires: [{ effect: effects }],
});
/** An effect that stops attacks on a card stops the attacking monster, so not one unaffected by it. */
const NOT_ATTACKED: Rule = {
  effect: "CANNOT_BE_BATTLE_TARGET",
  value: { none: [{ states: ["IMMUNE_TO_THIS"] }] },
};

/** What a rule does to each card it reaches, as a verb phrase after them, in the singular ("this card gains 500 ATK"). */
const PREDICATES: Pattern[] = [
  // ATK and DEF
  ["gains {n:number} {s:stats}", ({ n, s }): Rule[] => stats(s, n)],
  ["loses {n:number} {s:stats}", ({ n, s }): Rule[] => stats(s, -n)],
  // A number worked out as the rule applies; an effect that gives it as it resolves works it out once (moves.ts)
  [
    "gains {s:stats} equal to {v:amount}",
    ({ s, v }): Rule[] => stats(s, { value: v }),
  ],
  [
    "gains {n:number} {s:stats} for each {x:noun2} {at:at}",
    ({ n, s, x, at }): Rule[] =>
      stats(s, { computed: { times: n, per: perCard(x, at) } }),
  ],
  [
    "loses {n:number} {s:stats} for each {x:noun2} {at:at}",
    ({ n, s, x, at }): Rule[] =>
      stats(s, { computed: { times: -n, per: perCard(x, at) } }),
  ],
  // destruction, targeting, effects
  ["cannot be destroyed by battle", (): Rule[] => [BATTLE_PROOF]],
  [
    "cannot be destroyed by {e:effects}",
    ({ e }): Rule[] => [proofAgainst("INDESTRUCTABLE_EFFECT", e)],
  ],
  [
    "cannot be destroyed by battle or {e:effects}",
    ({ e }): Rule[] => [BATTLE_PROOF, proofAgainst("INDESTRUCTABLE_EFFECT", e)],
  ],
  [
    "cannot be targeted by {e:effects}",
    ({ e }): Rule[] => [proofAgainst("CANNOT_BE_EFFECT_TARGET", e)],
  ],
  [
    "cannot be targeted or destroyed by {e:effects}",
    ({ e }): Rule[] => [
      proofAgainst("CANNOT_BE_EFFECT_TARGET", e),
      proofAgainst("INDESTRUCTABLE_EFFECT", e),
    ],
  ],
  ["is unaffected by {e:effects}", ({ e }): Rule[] => [immune(e)]],
  // What it is treated as: a card type it has as well as its own
  ...["is treated as a Tuner", "is treated as a Tuner monster"].map(
    (words): Pattern => [
      words,
      (): Rule[] => [{ effect: "ADD_TYPE", value: "TYPE_TUNER" }],
    ],
  ),
  // Tributes: this card counts as two, for the Tribute Summon of cards that match
  [
    "can be treated as 2 Tributes for the Tribute Summon of {s:some}",
    ({ s }): Rule[] | undefined =>
      s.count === "ALL"
        ? undefined
        : [
            {
              effect: "DOUBLE_TRIBUTE",
              requires: [
                {
                  is: {
                    cards: { who: "CHECKED_CARD" },
                    filter: withoutMonster(s.noun.card),
                  },
                },
              ],
            },
          ],
  ],
  // attacks
  ["can attack directly", (): Rule[] => [{ effect: "DIRECT_ATTACK" }]],
  [
    "cannot attack directly",
    (): Rule[] => [{ effect: "CANNOT_DIRECT_ATTACK", value: 1 }],
  ],
  ["cannot attack", (): Rule[] => [{ effect: "CANNOT_ATTACK" }]],
  [
    "cannot declare an attack",
    (): Rule[] => [{ effect: "CANNOT_ATTACK_ANNOUNCE" }],
  ],
  ["must attack , if able", (): Rule[] => [{ effect: "MUST_ATTACK" }]],
  ["must attack if able", (): Rule[] => [{ effect: "MUST_ATTACK" }]],
  [
    "can make a second attack during each Battle Phase",
    (): Rule[] => [{ effect: "EXTRA_ATTACK", value: 1 }],
  ],
  // up to 3 attacks: 2 more than the one each monster has
  [
    "can make up to {n:number} attacks on monsters during each Battle Phase",
    ({ n }): Rule[] => [{ effect: "EXTRA_ATTACK_MONSTER", value: n - 1 }],
  ],
  ...[
    "can attack all monsters your opponent controls once each",
    "can attack all your opponent's monsters , once each",
  ].map(
    (words): Pattern => [
      words,
      (): Rule[] => [{ effect: "ATTACK_ALL", value: 1 }],
    ],
  ),
  ["cannot be targeted for attacks", (): Rule[] => [NOT_ATTACKED]],
  [
    "cannot be targeted for attacks , but does not prevent your opponent from attacking you directly",
    (): Rule[] => [{ effect: "IGNORE_BATTLE_TARGET", value: 1 }],
  ],
  // They can't select any battle target but that one, and an attack directly isn't an attack on it either
  [
    "cannot attack , except to attack that monster",
    (): Rule[] => [
      {
        effect: "CANNOT_SELECT_BATTLE_TARGET",
        value: { none: [{ among: [BACK] }] },
      },
      { effect: "CANNOT_DIRECT_ATTACK", value: 1 },
    ],
  ],
];

/** The plural of a predicate, for a subject of several cards ("monsters you control gain 500 ATK"): its first word's. */
const PLURAL: Record<string, string> = {
  gains: "gain",
  loses: "lose",
  is: "are",
};
const plural = ([pattern, meaning]: Pattern): Pattern => {
  const [first, ...rest] = pattern.split(" ");
  return [[PLURAL[first] ?? first, ...rest].join(" "), meaning];
};

export const RULES: Grammar = {
  /** What an effect on a player applies; a continuous effect can apply it too. */
  rule: [
    [
      "cards cannot be added from either player's Main Deck to the hand",
      (): Applied[] => [
        {
          effect: "CANNOT_TO_HAND",
          to: { players: "BOTH" },
          cards: { places: ["DECK"] },
        },
        { effect: "CANNOT_DRAW", to: { players: "BOTH" } },
      ],
    ],
    // Every card in places: the effect reaches them there, the ones that come later too
    ["{a:affected} {p:predicates}", ({ a, p }) => onCards(a, p)],
    ["each {a:affectedOne} {p:predicate}", ({ a, p }) => onCards(a, p)],
    [
      "the original ATK of {a:affected} become tripled",
      ({ a }): Applied[] => [
        {
          effect: "SET_BASE_ATTACK",
          ...a,
          value: {
            value: {
              multiply: [
                { number: "BASE_ATTACK", of: { who: "AFFECTED_CARD" } },
                3,
              ],
            },
          },
        },
      ],
    ],
    [
      "the first {n:number} times each of {a:affected} would be destroyed by battle each turn , it is not destroyed",
      ({ a, n }): Applied[] => [
        {
          effect: "INDESTRUCTABLE_COUNT",
          ...a,
          value: n,
          requires: [{ reasons: ["BATTLE"] }],
        },
      ],
    ],
    // The same as \"cannot be targeted by your opponent's card effects\", said of the opponent
    [
      "your opponent cannot target {b:bearer} with card effects",
      ({ b }): Applied[] =>
        onCards(b, [proofAgainst("CANNOT_BE_EFFECT_TARGET", { player: "OPPONENT" })]),
    ],
    [
      "your opponent cannot target {a:affected} with card effects",
      ({ a }): Applied[] =>
        onCards(a, [proofAgainst("CANNOT_BE_EFFECT_TARGET", { player: "OPPONENT" })]),
    ],
    [
      "you cannot activate the effect of {x:noun2}",
      ({ x }): Applied[] => [cannotActivate("OWN", x)],
    ],
    [
      "you cannot activate the effects of {x:noun2}",
      ({ x }): Applied[] => [cannotActivate("OWN", x)],
    ],
    [
      "neither player can activate the effects of {x:noun2}",
      ({ x }): Applied[] => [cannotActivate("BOTH", x)],
    ],
    [
      "you cannot Normal or Special Summon monsters",
      (): Applied[] => [
        { effect: "CANNOT_SUMMON", to: { players: "OWN" } },
        { effect: "CANNOT_SPECIAL_SUMMON", to: { players: "OWN" } },
      ],
    ],
    // What its player can't use as material: monsters that aren't those (an effect given to the player, not the cards)
    [
      "you cannot use monsters as material for a {f:frames} Summon , except {x:noun}",
      ({ f, x }): Applied[] =>
        (f as string[]).map((frame) => ({
          effect: `CANNOT_BE_${frame}_MATERIAL`,
          to: { players: "OWN" },
          cards: { none: [withoutMonster(x.card)] },
        })),
    ],
  ],
  /** What a continuous effect applies. */
  applied: [
    // What an effect on a player applies applies the same while a continuous effect's conditions hold
    ["{r:rule}", ({ r }) => r],
    ["{b:bearer} {p:predicate}", ({ b, p }) => onCards(b, p)],
    // A sentence about this card can leave it out: "Cannot be destroyed by battle.", "Unaffected by Trap effects."
    ["{p:predicate}", ({ p }) => onCards({ to: "THIS_CARD" }, p)],
    [
      "unaffected by {e:effects}",
      ({ e }) => onCards({ to: "THIS_CARD" }, [immune(e)]),
    ],
    // Piercing: the damage a monster attacking a Defense Position monster inflicts, of its ATK over that DEF
    [
      "if {b:bearer} attacks a Defense Position monster , inflict {d:piercing} battle damage",
      ({ b, d }) => onCards(b, [d]),
    ],
    [
      "if {b:bearer} attacks a Defense Position monster , inflict {d:piercing} battle damage to your opponent",
      ({ b, d }) => onCards(b, [d]),
    ],
    [
      "if {a:affectedOne} attacks a Defense Position monster , inflict {d:piercing} battle damage",
      ({ a, d }) => onCards(a, [d]),
    ],
    [
      "if {a:affectedOne} attacks a Defense Position monster , inflict {d:piercing} battle damage to your opponent",
      ({ a, d }) => onCards(a, [d]),
    ],
    [
      "This card's name becomes {x:cardName}",
      ({ x }): Applied[] => [
        { effect: "CHANGE_CODE", to: "THIS_CARD", value: x[0] },
      ],
    ],
    [
      "neither player can declare attacks , except with monsters in their center Main Monster Zones",
      (): Applied[] => attackLock("BOTH", center()),
    ],
    [
      "This card's original ATK becomes {n:number}",
      ({ n }): Applied[] => [
        { effect: "SET_BASE_ATTACK", to: "THIS_CARD", value: n },
      ],
    ],
    [
      "You cannot Special Summon from the Extra Deck , except {x:noun}",
      ({ x }) => extraDeckLock(x),
    ],
    [
      "You can activate the effects of {a:affected} as Quick Effects",
      ({ a }): Applied[] => [{ effect: "ACTIVATE_AS_QUICK", ...a }],
    ],
  ],
  /** One card a rule reaches, by what it is to this card. */
  bearer: [
    ["this card", (): Reached => ({ to: "THIS_CARD" })],
    ["the equipped monster", (): Reached => ({ to: "EQUIPPED_MONSTER" })],
    [
      "the monster equipped with this card",
      (): Reached => ({ to: "EQUIPPED_MONSTER" }),
    ],
  ],
  /** The cards a rule reaches: every one in places that matches. */
  affected: [
    ["{x:noun} {at:at}", ({ x, at }) => affected(x, at)],
    ["all {x:noun} {at:at}", ({ x, at }) => affected(x, at)],
    [
      "{x:noun} you control whose original Level is {n:number}",
      ({ x, n }) =>
        affected(
          {
            ...x,
            card: both(x.card, { numbers: { ORIGINAL_LEVEL: { is: [n] } } }),
          },
          FIELD("OWN"),
        ),
    ],
    [
      "{x:noun} you control with {a:archetype} in their original names",
      ({ x, a }) =>
        affected(
          { ...x, card: both(x.card, { originalArchetypes: a }) },
          FIELD("OWN"),
        ),
    ],
    ["your {x:noun}", ({ x }) => affected(x, FIELD("OWN"))],
    ["your opponent's {x:noun}", ({ x }) => affected(x, FIELD("OPPONENT"))],
    [
      "the monster in your center Main Monster Zone",
      () => affected({ card: center(), monster: true }, FIELD("OWN")),
    ],
  ],
  /** The same cards, one at a time ("If a monster you control attacks", "each monster you control gains"). */
  affectedOne: [
    ["a {x:noun} {at:at}", ({ x, at }) => affected(x, at)],
    ["an {x:noun} {at:at}", ({ x, at }) => affected(x, at)],
    ["{x:noun} {at:at}", ({ x, at }) => affected(x, at)],
    ["your {x:noun}", ({ x }) => affected(x, FIELD("OWN"))],
  ],
  predicate: PREDICATES,
  predicates: PREDICATES.map(plural),
  stats: [
    ["ATK", () => ["ATTACK"]],
    ["DEF", () => ["DEFENSE"]],
    ["ATK / DEF", () => ["ATTACK", "DEFENSE"]],
    ["ATK and DEF", () => ["ATTACK", "DEFENSE"]],
  ],
  /** Effects a card can be kept safe from: whose they are, what they are. */
  effects: [
    ["card effects", () => ({})],
    ["your opponent's card effects", () => ({ player: "OPPONENT" })],
    [
      "your opponent's activated effects",
      () => ({ player: "OPPONENT", activated: true }),
    ],
    ["other cards' effects", () => ({ otherCards: true })],
    ["monster effects", () => ({ types: ["MONSTER"] })],
    [
      "monster effects activated by your opponent",
      () => ({ player: "OPPONENT", types: ["MONSTER"], activated: true }),
    ],
    [
      "monster effects , except {x:noun}",
      ({ x }) => ({
        types: ["MONSTER"],
        card: { none: [withoutMonster(x.card)] },
      }),
    ],
    ["Spell effects", () => ({ types: ["SPELL"] })],
    ["Trap effects", () => ({ types: ["TRAP"] })],
    ["Spell / Trap effects", () => ({ types: ["SPELL", "TRAP"] })],
  ],
  /** The battle damage an attack on a Defense Position monster inflicts: its ATK over that DEF, or twice that. */
  piercing: [
    ["piercing", (): Rule => ({ effect: "PIERCE" })],
    [
      "double piercing",
      (): Rule => ({ effect: "PIERCE", value: "DOUBLE_DAMAGE" }),
    ],
  ],
};
