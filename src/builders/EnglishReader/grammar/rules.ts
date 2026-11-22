/**
 * Rules: what a continuous effect, or an effect on a player, applies, and the cards it reaches. A rule about cards is a
 * subject and a predicate: the subject names the cards ("this card", "the equipped monster", "monsters you control"),
 * the predicate what applies to each of them ("gains 500 ATK", "cannot be destroyed by battle"). A predicate is written
 * once, in the singular, and read in the plural too.
 */
import type { Applied, CardFilter, Condition, Per } from "../../../lib/cardSchema.js";
import { type Grammar, NoReading, type Pattern } from "../engine.js";
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
  specialSummonLock,
  extraNormalSummon,
  cannotActivate,
  commaTailPatterns,
  listPatterns,
  onCards,
  pointedTo,
  type Reached,
  type Rule,
  where,
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

/**
 * What "the first time X would be destroyed by battle each turn, it is not destroyed" reaches: the cards, and whether it
 * is one card that bears the rule ("this card": a continuous effect of its own, `applied`) or cards in places it reaches
 * ("each "Witchcrafter" monster you control": a rule, which an effect on a player can apply for a while too).
 */
interface FirstTimeSubject {
  reached: Reached;
  single: boolean;
}
/**
 * Not destroyed the first times it would be (EFFECT_INDESTRUCTABLE_COUNT), for these reasons (its value function's r and
 * rp). "each turn" gives the count back at the start of each turn, as the scripts do unless they set NO_TURN_RESET;
 * without it, the count is never given back (Empty Machine's "The first time this face-up card on the field would be
 * destroyed by an opponent's card effect, it is not destroyed": its script sets EFFECT_FLAG_NO_TURN_RESET).
 */
const notDestroyed = (
  s: FirstTimeSubject,
  times: number,
  cause: Condition[],
  eachTurn: boolean,
): Applied[] =>
  onCards(s.reached, [
    {
      effect: "INDESTRUCTABLE_COUNT",
      value: times,
      requires: cause,
      ...(eachTurn ? {} : { noTurnReset: true as const }),
    },
  ]);
/**
 * The ways "the first time(s) ... would be destroyed ..., it is not destroyed" is written, with "each turn" after the
 * cause, between "destroyed" and the cause (Witchcrafter Bystreet's "would be destroyed each turn, by battle or card
 * effect"), before it all, or not at all. Each is read for the subjects take accepts: single ones in `applied`, the rest
 * in `rule`, so a sentence reads one way.
 */
const firstTimes = (take: (s: FirstTimeSubject) => boolean): Pattern[] =>
  (
    [
      ["the first time", () => 1],
      ["the first {n:number} times", ({ n }: { n: number }) => n],
    ] as const
  ).flatMap(([first, times]) =>
    (
      [
        [`${first} {s:firstTimeSubject} would be destroyed {c:indestructableCause} each turn`, true],
        [`${first} {s:firstTimeSubject} would be destroyed each turn , {c:indestructableCause}`, true],
        [`each turn , ${first} {s:firstTimeSubject} would be destroyed {c:indestructableCause}`, true],
        [`${first} {s:firstTimeSubject} would be destroyed {c:indestructableCause}`, false],
      ] as const
    ).map(
      ([words, eachTurn]): Pattern => [
        `${words} , it is not destroyed`,
        (slots) =>
          take(slots.s)
            ? notDestroyed(slots.s, times(slots), slots.c, eachTurn)
            : undefined,
      ],
    ),
  );

/** What its player takes no battle damage from: AVOID_BATTLE_DAMAGE for the controller, NO_BATTLE_DAMAGE for the opponent. */
const AVOID_BATTLE_DAMAGE: Rule = { effect: "AVOID_BATTLE_DAMAGE", value: 1 };
const NO_BATTLE_DAMAGE: Rule = { effect: "NO_BATTLE_DAMAGE", value: 1 };
/** "you take no battle damage from attacks involving {cards}" ("battles" is the same): the rules for its subject. */
const battleDamage = (subject: string): Pattern[] =>
  ["attacks", "battles"].map(
    (fights): Pattern => [
      `{d:battleDamageSide} battle damage from ${fights} involving ${subject}`,
      ({ d, a }) => onCards(a, d),
    ],
  );

/**
 * "you cannot Special Summon monsters from the Extra Deck, except Synchro Monsters" (specialSummonLock), said of its
 * player or of both ("Neither player can Special Summon monsters"), and of Pendulum Summons only ("You cannot Pendulum
 * Summon monsters, except "Ninja" monsters"), as the scripts' target functions check SUMMON_TYPE_PENDULUM.
 */
function summonLocks(): Pattern[] {
  const lock =
    (players: "OWN" | "BOTH", summon: string) =>
    (cards: CardFilter, except?: CardFilter): Applied[] =>
      specialSummonLock(cards, except).map((applied) => ({
        ...applied,
        to: { players },
        ...(summon === "Pendulum" ? { requires: [{ summonType: ["PENDULUM"] }] } : {}),
      }));
  return (
    [
      ["you cannot", "OWN"],
      ["neither player can", "BOTH"],
    ] as const
  ).flatMap(([who, players]) =>
    (
      [
        ["Special", "lockException"],
        ["Pendulum", "pendulumLockException"],
      ] as const
    ).flatMap(([summon, exception]): Pattern[] => {
      const locked = lock(players, summon);
      const words = `${who} ${summon} Summon`;
      return [
        [words, () => locked({})],
        [`${words} {w:lockedSpecialSummons}`, ({ w }) => locked(w)],
        [`${words} , except {e:${exception}}`, ({ e }) => locked({}, e)],
        [`${words} {w:lockedSpecialSummons} , except {e:${exception}}`, ({ w, e }) => locked(w, e)],
      ];
    }),
  );
}
/** The cards this card's Link Arrows point to: in the Monster Zones, the only zones a Link Arrow points to. */
const POINTED_TO = { ...where("BOTH", ["MZONE"]), card: pointedTo };

/**
 * Why a card would be destroyed (destructionCause's filter of the destroyed card), as its value function checks it: one
 * of these reasons (r), by this player (rp), or any of several.
 */
function causeOf(card: CardFilter): Condition[] {
  const { reasons, reasonPlayer, anyOf, ...rest } = card;
  if (Object.keys(rest).length) throw new NoReading();
  return [
    ...(reasons ? [{ reasons }] : []),
    ...(reasonPlayer ? [{ player: { which: "REASON" as const, is: reasonPlayer } }] : []),
    ...(anyOf
      ? [
          {
            any: anyOf.map((one) => {
              const all = causeOf(one);
              return all.length === 1 ? all[0] : { all };
            }),
          },
        ]
      : []),
  ];
}

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
    "gains {n:number} {s:stats} for each {x:cardPhrase} {at:fromOrInPlaces}",
    ({ n, s, x, at }): Rule[] =>
      stats(s, { computed: { times: n, per: perCard(x, at) } }),
  ],
  [
    "loses {n:number} {s:stats} for each {x:cardPhrase} {at:fromOrInPlaces}",
    ({ n, s, x, at }): Rule[] =>
      stats(s, { computed: { times: -n, per: perCard(x, at) } }),
  ],
  // destruction, targeting, effects
  ["cannot be destroyed by battle", (): Rule[] => [BATTLE_PROOF]],
  [
    "cannot be destroyed by {e:effectSourceFilter}",
    ({ e }): Rule[] => [proofAgainst("INDESTRUCTABLE_EFFECT", e)],
  ],
  [
    "cannot be destroyed by battle or {e:effectSourceFilter}",
    ({ e }): Rule[] => [BATTLE_PROOF, proofAgainst("INDESTRUCTABLE_EFFECT", e)],
  ],
  [
    "cannot be targeted by {e:effectSourceFilter}",
    ({ e }): Rule[] => [proofAgainst("CANNOT_BE_EFFECT_TARGET", e)],
  ],
  [
    "cannot be targeted or destroyed by {e:effectSourceFilter}",
    ({ e }): Rule[] => [
      proofAgainst("CANNOT_BE_EFFECT_TARGET", e),
      proofAgainst("INDESTRUCTABLE_EFFECT", e),
    ],
  ],
  ["is unaffected by {e:effectSourceFilter}", ({ e }): Rule[] => [immune(e)]],
  // What it is treated as: a card type it has as well as its own
  ...["is treated as a Tuner", "is treated as a Tuner monster"].map(
    (words): Pattern => [
      words,
      (): Rule[] => [{ effect: "ADD_TYPE", value: "TYPE_TUNER" }],
    ],
  ),
  // A Gemini monster: a Normal Monster, so not an Effect Monster (aux.EnableDualAttribute's ADD_TYPE and REMOVE_TYPE)
  [
    "is treated as a Normal Monster",
    (): Rule[] => [
      { effect: "ADD_TYPE", value: "TYPE_NORMAL" },
      { effect: "REMOVE_TYPE", value: "TYPE_EFFECT" },
    ],
  ],
  // Tributes: this card counts as two, for the Tribute Summon of cards that match
  [
    "can be treated as 2 Tributes for the Tribute Summon of {s:quantifiedCards}",
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
    "can attack while in face-up Defense Position",
    (): Rule[] => [{ effect: "DEFENSE_ATTACK", value: 1 }],
  ],
  [
    "cannot attack directly",
    (): Rule[] => [{ effect: "CANNOT_DIRECT_ATTACK", value: 1 }],
  ],
  ["cannot attack", (): Rule[] => [{ effect: "CANNOT_ATTACK" }]],
  [
    "cannot change its battle position",
    (): Rule[] => [{ effect: "CANNOT_CHANGE_POSITION" }],
  ],
  [
    "cannot attack or change its battle position",
    (): Rule[] => [
      { effect: "CANNOT_ATTACK" },
      { effect: "CANNOT_CHANGE_POSITION" },
    ],
  ],
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
    ["{a:pluralSubject} {p:predicates}", ({ a, p }) => onCards(a, p)],
    ["each {a:singularAffectedSubject} {p:predicate}", ({ a, p }) => onCards(a, p)],
    [
      "the original ATK of {a:pluralSubject} become tripled",
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
    // Not destroyed the first times: cards in places (one card that bears it is `applied`)
    ...firstTimes((s) => !s.single),
    ...battleDamage("{a:pluralSubject}"),
    // The same as \"cannot be targeted by your opponent's card effects\", said of the opponent
    [
      "your opponent cannot target {b:singleSubject} with card effects",
      ({ b }): Applied[] =>
        onCards(b, [proofAgainst("CANNOT_BE_EFFECT_TARGET", { player: "OPPONENT" })]),
    ],
    [
      "your opponent cannot target {a:pluralSubject} with card effects",
      ({ a }): Applied[] =>
        onCards(a, [proofAgainst("CANNOT_BE_EFFECT_TARGET", { player: "OPPONENT" })]),
    ],
    [
      "you cannot activate the effect of {x:cardPhrase}",
      ({ x }): Applied[] => [cannotActivate("OWN", x)],
    ],
    [
      "you cannot activate the effects of {x:cardPhrase}",
      ({ x }): Applied[] => [cannotActivate("OWN", x)],
    ],
    [
      "neither player can activate the effects of {x:cardPhrase}",
      ({ x }): Applied[] => [cannotActivate("BOTH", x)],
    ],
    // A Normal Summon more: only one such effect applies a turn, which "(you can only gain this effect once per turn)"
    // reminds (Konami's FAQ of JJ "Kewl Tune"), so the reminder says nothing more
    [
      "you can Normal Summon {s:quantifiedCards} {t:extraNormalSummonTail}",
      ({ s }) => extraNormalSummon(s),
    ],
    // Levels changed, as ATK is gained or lost
    ...(
      [
        ["increased", 1],
        ["decreased", -1],
      ] as const
    ).map(
      ([words, sign]): Pattern => [
        `the Levels of {a:pluralSubject} are ${words} by {n:number}`,
        ({ a, n }): Applied[] =>
          onCards(a, [{ effect: "UPDATE_LEVEL", value: sign * n }]),
      ],
    ),
    // What its player (or both) can't Special Summon, or Pendulum Summon, and what they still can
    ...summonLocks(),
    [
      "you cannot Normal or Special Summon monsters",
      (): Applied[] => [
        { effect: "CANNOT_SUMMON", to: { players: "OWN" } },
        { effect: "CANNOT_SPECIAL_SUMMON", to: { players: "OWN" } },
      ],
    ],
    // What its player can't use as material: monsters that aren't those (an effect given to the player, not the cards)
    [
      "you cannot use monsters as material for a {f:frames} Summon , except {x:cardNoun}",
      ({ f, x }): Applied[] =>
        (f as string[]).map((frame) => ({
          effect: `CANNOT_BE_${frame}_MATERIAL`,
          to: { players: "OWN" },
          cards: { none: [withoutMonster(x.card)] },
        })),
    ],
  ],
  /** "in addition to your Normal Summon/Set", and when, and the reminder that only one such effect applies a turn. */
  extraNormalSummonTail: [
    ...["", ", ", "during your Main Phase each turn , "].flatMap(
      (when): Pattern[] =>
        ["", " ( you can only gain this effect once per turn )"].map(
          (reminder): Pattern => [
            `${when}in addition to your Normal Summon / Set${reminder}`,
            () => true,
          ],
        ),
    ),
  ],
  /** What a lock says can't be Special Summoned: monsters of a kind, from places. */
  lockedSpecialSummons: [
    ["{x:cardNoun}", ({ x }): CardFilter => withoutMonster(x.card)],
    ["from the {l:placeList}", ({ l }): CardFilter => ({ places: l.places })],
    [
      "{x:cardNoun} from the {l:placeList}",
      ({ x, l }): CardFilter => both(withoutMonster(x.card), { places: l.places }),
    ],
  ],
  /** What a lock still lets be Special Summoned, after "except": monsters of a kind, or from places. */
  lockException: [
    ["{x:cardPhrase}", ({ x }): CardFilter => withoutMonster(x.card)],
    ["from the {l:placeList}", ({ l }): CardFilter => ({ places: l.places })],
  ],
  /**
   * What a Pendulum Summon lock still lets be Pendulum Summoned: one exception, or several listed ("except "Dracoslayer"
   * monsters, "Majespecter" Pendulum Monsters, and "Magician" monsters"), any of them.
   */
  pendulumLockException: [
    ...listPatterns(
      "lockException",
      (excepted: CardFilter[]): CardFilter =>
        excepted.length === 1 ? excepted[0] : { anyOf: excepted },
      { commaConjunctions: ["and"], tailKind: "pendulumLockExceptionTail" },
    ),
  ],
  pendulumLockExceptionTail: commaTailPatterns("lockException", "pendulumLockExceptionTail", ["and"]),
  /** What a continuous effect applies. */
  applied: [
    // What an effect on a player applies applies the same while a continuous effect's conditions hold
    ["{r:rule}", ({ r }) => r],
    ["{b:singleSubject} {p:predicate}", ({ b, p }) => onCards(b, p)],
    // A sentence about this card can leave it out: "Cannot be destroyed by battle.", "Unaffected by Trap effects."
    ["{p:predicate}", ({ p }) => onCards({ to: "THIS_CARD" }, p)],
    [
      "unaffected by {e:effectSourceFilter}",
      ({ e }) => onCards({ to: "THIS_CARD" }, [immune(e)]),
    ],
    // Not destroyed the first times: one card that bears it (cards in places are a rule)
    ...firstTimes((s) => s.single),
    ...battleDamage("{a:singleSubject}"),
    // Piercing: the damage a monster attacking a Defense Position monster inflicts, of its ATK over that DEF
    [
      "if {b:singleSubject} attacks a Defense Position monster , inflict {d:piercing} battle damage",
      ({ b, d }) => onCards(b, [d]),
    ],
    [
      "if {b:singleSubject} attacks a Defense Position monster , inflict {d:piercing} battle damage to your opponent",
      ({ b, d }) => onCards(b, [d]),
    ],
    [
      "if {a:singularAffectedSubject} attacks a Defense Position monster , inflict {d:piercing} battle damage",
      ({ a, d }) => onCards(a, [d]),
    ],
    [
      "if {a:singularAffectedSubject} attacks a Defense Position monster , inflict {d:piercing} battle damage to your opponent",
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
      "You can activate the effects of {a:pluralSubject} as Quick Effects",
      ({ a }): Applied[] => [{ effect: "ACTIVATE_AS_QUICK", ...a }],
    ],
  ],
  /** One card a rule reaches, by what it is to this card. */
  singleSubject: [
    ["this card", (): Reached => ({ to: "THIS_CARD" })],
    ["the equipped monster", (): Reached => ({ to: "EQUIPPED_MONSTER" })],
    [
      "the monster equipped with this card",
      (): Reached => ({ to: "EQUIPPED_MONSTER" }),
    ],
    // The card this card keeps targeting (Dimension Sphinx's "the targeted monster"); konamiReader stops a card that keeps none
    ["the targeted monster", (): Reached => ({ to: "CARD_IT_TARGETS" })],
  ],
  /**
   * What "Activate this card by targeting ...;" applies to its target for as long as this card targets it (Spellbinding
   * Circle's "it cannot attack or change its battle position"): rules on that card, as its script's EFFECT_TYPE_TARGET
   * effects, joined by ", also".
   */
  keptRules: listPatterns("keptRule", (rules: Rule[][]) => rules.flat(), {
    commaConjunctions: ["also"],
  }),
  keptRule: [
    ...["it", "that monster", "that target", "that face-up monster"].map(
      (words): Pattern => [`${words} {p:predicate}`, ({ p }) => p],
    ),
  ],
  /** What "the first time ... would be destroyed" is about: one card that bears it, or each card in places. */
  firstTimeSubject: [
    ["{b:singleSubject}", ({ b }): FirstTimeSubject => ({ reached: b, single: true })],
    // Its continuous effect applies only while it is face-up on the field, so these say no more than "this card"
    ...["this face-up card", "this face-up card on the field", "this card on the field"].map(
      (words): Pattern => [words, (): FirstTimeSubject => ({ reached: { to: "THIS_CARD" }, single: true })],
    ),
    [
      "each {a:singularAffectedSubject}",
      ({ a }): FirstTimeSubject => ({ reached: a, single: false }),
    ],
    [
      "each of {a:pluralSubject}",
      ({ a }): FirstTimeSubject => ({ reached: a, single: false }),
    ],
  ],
  /** Why it would be destroyed, as the value function of INDESTRUCTABLE_COUNT checks it. */
  indestructableCause: [
    ["by battle", (): Condition[] => [{ reasons: ["BATTLE"] }]],
    ["by {c:destructionCause}", ({ c }): Condition[] => causeOf(c.card)],
  ],
  /** Who takes no battle damage from a battle involving the cards: its controller, the opponent, or neither. */
  battleDamageSide: [
    ["you take no", (): Rule[] => [AVOID_BATTLE_DAMAGE]],
    ["your opponent takes no", (): Rule[] => [NO_BATTLE_DAMAGE]],
    ...["neither player takes", "neither player takes any"].map(
      (words): Pattern => [words, (): Rule[] => [AVOID_BATTLE_DAMAGE, NO_BATTLE_DAMAGE]],
    ),
  ],
  /** The cards a rule reaches: every one in places that matches. */
  pluralSubject: [
    ["{x:cardNoun} {at:fromOrInPlaces}", ({ x, at }) => affected(x, at)],
    // What they are, after where they are ("monsters your opponent controls with 1700 or less original ATK")
    [
      "{x:cardNoun} {at:fromOrInPlaces} {m:cardPostMod}",
      ({ x, at, m }) => affected({ ...x, card: both(x.card, m) }, at),
    ],
    ["all {x:cardNoun} {at:fromOrInPlaces}", ({ x, at }) => affected(x, at)],
    [
      "{x:cardNoun} you control whose original Level is {n:number}",
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
      "{x:cardNoun} you control with {a:archetype} in their original names",
      ({ x, a }) =>
        affected(
          { ...x, card: both(x.card, { originalArchetypes: a }) },
          FIELD("OWN"),
        ),
    ],
    ["your {x:cardNoun}", ({ x }) => affected(x, FIELD("OWN"))],
    ["your opponent's {x:cardNoun}", ({ x }) => affected(x, FIELD("OPPONENT"))],
    // A Link Monster's: wherever its arrows point, on either field
    ["{x:cardNoun} this card points to", ({ x }) => affected(x, POINTED_TO)],
    [
      "the monster in your center Main Monster Zone",
      () => affected({ card: center(), monster: true }, FIELD("OWN")),
    ],
  ],
  /** The same cards, one at a time ("If a monster you control attacks", "each monster you control gains"). */
  singularAffectedSubject: [
    ["a {x:cardNoun} {at:fromOrInPlaces}", ({ x, at }) => affected(x, at)],
    ["an {x:cardNoun} {at:fromOrInPlaces}", ({ x, at }) => affected(x, at)],
    ["{x:cardNoun} {at:fromOrInPlaces}", ({ x, at }) => affected(x, at)],
    ["your {x:cardNoun}", ({ x }) => affected(x, FIELD("OWN"))],
    ...["a", "an", ""].map(
      (article): Pattern => [
        `${article} {x:cardNoun} this card points to`.trim(),
        ({ x }) => affected(x, POINTED_TO),
      ],
    ),
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
  effectSourceFilter: [
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
      "monster effects , except {x:cardNoun}",
      ({ x }) => ({
        types: ["MONSTER"],
        card: { none: [withoutMonster(x.card)] },
      }),
    ],
    ["Spell effects", () => ({ types: ["SPELL"] })],
    ["Trap effects", () => ({ types: ["TRAP"] })],
    ["Spell / Trap effects", () => ({ types: ["SPELL", "TRAP"] })],
    // Effects of cards that match ("the effects of Xyz Monsters", "the effects of "Hole" Normal Traps"), whatever kind
    ["the effects of {x:cardPhrase}", ({ x }) => ({ card: withoutMonster(x.card) })],
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
