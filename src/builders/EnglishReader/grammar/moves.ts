/** Moves: what a resolution or a cost does to cards and players. */
import type {
  Applied,
  CardNumber,
  CardRef,
  Condition,
  MoveName,
  Property,
  Side,
  Value,
} from "../../../lib/cardSchema.js";
import { holds } from "../../../lib/ruled.js";
import { type Grammar, NoReading, type Pattern } from "../engine.js";
import {
  allBy,
  back,
  BACK,
  BACK_MONSTER,
  BACK_ONE,
  BACK_TARGET,
  backTo,
  both,
  center,
  exactly,
  forPlayer,
  given,
  type MoveDraft,
  negated,
  one,
  type PickDraft,
  pickOf,
  type TokenStats,
  self,
  take,
  THIS,
  THIS_PICK,
  UNTIL_END_OF_TURN,
  withoutMonster,
} from "../phrases.js";
import {
  where,
  FIELD,
  except,
  specialSummonLock,
  extraNormalSummon,
  handCount,
  attackLock,
  cannotActivate,
  tribute,
  type Moved,
  onCards,
  type Rule,
  moving,
  picked,
} from "./shared.js";

/** The Summon's materials include this card. */
const INCLUDING_THIS: Condition = {
  contains: { group: { who: "SUMMON_MATERIALS", of: THIS_PICK }, card: THIS },
};

/** The cards a pick takes are all different by this ("with different names"; "each from your hand, Deck, and GY"). */
const allDifferent = (by: Property): Condition => ({
  compare: {
    value: { countOf: { different: { cards: THIS_PICK, by } } },
    is: "EQUAL",
    to: { countOf: { cards: THIS_PICK } },
  },
});

/** The top n cards of a Deck. */
const deckTop = (n: number, side: "own" | "opponent"): PickDraft => ({
  pick: "DECK_TOP",
  count: exactly(n),
  from: { [side]: ["DECK"] },
  card: {},
});

/**
 * Life points a move takes or gives, its words with the number between the verb and the noun: a number ("inflict 500
 * damage to your opponent"), a number for each card counted ("gain 300 LP for each ..."), or an amount the effect works
 * out ("inflict damage to your opponent equal to its original ATK").
 */
const lifePoints = (
  verb: string,
  noun: string,
  move: MoveName,
  player: Side,
): Pattern[] => [
  [`${verb} {n:number} ${noun}`, ({ n }) => [{ move, amount: n, player }]],
  [
    `${verb} {n:number} ${noun} for each {c:counted}`,
    ({ n, c }) => [{ move, amount: { multiply: [n, c] }, player }],
  ],
  [
    `${verb} ${noun} equal to {v:amount}`,
    ({ v }) => [{ move, amount: v, player }],
  ],
];

/**
 * A rule given to the cards a move takes, for a while. A number the rule works out is worked out once, as the effect
 * that gives it resolves (fixed), where a continuous effect's is worked out as it applies. A number for each of some
 * cards (computed) doesn't read here yet.
 */
function giving(moved: Moved, rules: Rule[], until: string[]): MoveDraft[] {
  const once = (rule: Rule): Rule => {
    const { value } = rule;
    if (typeof value !== "object" || value === null) return rule;
    if ("computed" in value) throw new NoReading();
    return "value" in value ? { ...rule, value: { fixed: value.value } } : rule;
  };
  return [
    moving("GIVE_EFFECT", moved, {
      effect: given(onCards({ to: "THIS_CARD" }, rules.map(once))),
      until,
    }),
  ];
}

export const MOVES: Grammar = {
  moves: [
    ["{m:move}", ({ m }) => m],
    // Done together, as one part
    ["{a:move} and {b:move}", ({ a, b }) => [...a, ...b]],
    ["{a:move} , and {b:move}", ({ a, b }) => [...a, ...b]],
    // What the cards it moved get ("Special Summon it, but negate its effects"): the move's own cards, or its pick, which
    // the pronoun refers back to once the pick has its id (finish.ts). A move of this card isn't a mention there, as a
    // cost that discards this card isn't what a later "that card" means
    [
      "{m:move} , but {b:butClause}",
      ({ m, b }): MoveDraft[] => {
        const last: MoveDraft = m[m.length - 1];
        return [
          ...m,
          ...(b as MoveDraft[]).map((move) =>
            last.picked ? move : { ...move, cards: last.cards },
          ),
        ];
      },
    ],
    ["{t:lingeringPlayerMove}", ({ t }) => t],
  ],
  move: [
    // to the hand
    ["add {m:moved} to your hand", ({ m }) => [moving("TO_HAND", m)]],
    [
      "add {p:pick} to your hand , except {x:cardName}",
      ({ p, x }) => [take("TO_HAND", except(p, x))],
    ],
    [
      "add {p:pick} to your hand , except {s:quantifiedCards}",
      ({ p, s }) => [
        take("TO_HAND", { ...p, card: both(p.card, { none: [s.noun.card] }) }),
      ],
    ],
    ["return {m:moved} to the hand", ({ m }) => [moving("TO_HAND", m)]],
    [
      "return {x:cardPhrase} {at:fromOrInPlaces} to the hand , up to the number of {c:counted}",
      ({ x, at, c }) => [
        take("TO_HAND", pickOf({ min: 1, max: c } as never, x, at)),
      ],
    ],
    // Special Summons
    ["Special Summon {m:moved}", ({ m }) => [moving("SPECIAL_SUMMON", m)]],
    [
      "Special Summon {m:moved} {x:specialSummonMods}",
      ({ m, x }) => [moving("SPECIAL_SUMMON", m, x)],
    ],
    [
      "choose {p:pick} , and Special Summon both monsters , 1 to each field",
      ({ p }) => [moving("SPECIAL_SUMMON", picked(p), { player: "BOTH" })],
    ],
    // A Token that gets the Tributed monsters' ATK and DEF together
    [
      "Special Summon {m:moved} to your opponent's field ( this Token's ATK / DEF become the combined original ATK / DEF of the Tributed monsters )",
      ({ m }) => {
        if (!m.tokenStats || m.count) return undefined;
        const token = m.cards;
        const sum = (number: CardNumber): Applied["value"] => ({
          fixed: { sum: { cards: backTo("TRIBUTE"), number } },
        });
        return [
          moving("SPECIAL_SUMMON", m, { player: "OPPONENT" }),
          {
            move: "GIVE_EFFECT",
            cards: token,
            effect: given([
              {
                effect: "SET_ATTACK",
                to: "THIS_CARD",
                value: sum("BASE_ATTACK"),
              },
              {
                effect: "SET_DEFENSE",
                to: "THIS_CARD",
                value: sum("BASE_DEFENSE"),
              },
            ]),
            until: ["LEAVES_FIELD_OR_FLIPS"],
          },
        ];
      },
    ],
    // "up to 1 ... each from your hand, Deck, and GY": at most one from each place
    [
      "Special Summon up to {n:number} {x:cardNoun} each from your {l:placeList}",
      ({ n, x, l }) => {
        const pick: PickDraft = {
          ...pickOf(
            { min: 1, max: n * l.places.length },
            x,
            where("OWN", l.places),
          ),
          pickRequires: [allDifferent("PLACE")],
        };
        return [take("SPECIAL_SUMMON", pick)];
      },
    ],
    [
      "Synchro Summon {s:quantifiedCardsOr}",
      ({ s }) => [
        take(
          "SYNCHRO_SUMMON",
          pickOf(s.count, s.noun, where("OWN", ["EXTRA"])),
        ),
      ],
    ],
    [
      "Ritual Summon {p:pick} , by Tributing {x:cardNoun} {at:fromOrInPlaces} whose total Levels equal or exceed its Level",
      ({ p, x, at }) => {
        const tributes = tribute(one, x, at);
        return [
          take("RITUAL_SUMMON", p, {
            to: { all: { from: tributes.from, card: tributes.card } },
            levels: "AT_LEAST",
          }),
        ];
      },
    ],
    // Tributes are monsters, from the field unless it says the hand too
    ["Tribute this card", () => [self("TRIBUTE")]],
    ["Tribute {p:tributes}", ({ p }) => [take("TRIBUTE", p)]],
    [
      "Tribute {s:quantifiedCards}",
      ({ s }) => [take("TRIBUTE", tribute(s.count, s.noun, FIELD("OWN")))],
    ],
    [
      "Tribute as many {x:cardNoun} {at:fromOrInPlaces} as possible",
      ({ x, at }) => [take("TRIBUTE", tribute("ALL", x, at))],
    ],
    // A Normal Summon from the hand, now (of a monster whose name another card's text mentions): a Summon, not a Set,
    // which its text would say ("Normal Summon/Set")
    [
      "Normal Summon {s:quantifiedCards}",
      ({ s }) => [
        take("NORMAL_SUMMON", pickOf(s.count, s.noun, where("OWN", ["HAND"])), {
          position: ["FACEUP"],
        }),
      ],
    ],
    [
      "Normal Summon {s:quantifiedCards} mentioned on that monster",
      ({ s }) => [
        take(
          "NORMAL_SUMMON",
          pickOf(
            s.count,
            {
              ...s.noun,
              card: both(s.noun.card, { mentionedBy: [BACK_MONSTER] }),
            },
            where("OWN", ["HAND"]),
          ),
          { position: ["FACEUP"] },
        ),
      ],
    ],
    // The opponent picks among the cards mentioned last, and it is they who banish
    [
      "your opponent banishes {n:number} of them",
      ({ n }) => [
        take(
          "BANISH",
          {
            pick: "CHOSEN",
            count: exactly(n),
            from: {},
            card: { among: [BACK] },
          },
          { by: "OPPONENT", doneBy: "OPPONENT" },
        ),
      ],
    ],
    // A Tribute Summon from the hand, now: a Tribute Set too, unless face-up
    [
      "Tribute Summon {s:quantifiedCards}",
      ({ s }) => [
        take("NORMAL_SUMMON", pickOf(s.count, s.noun, where("OWN", ["HAND"])), {
          summonType: ["ADVANCE"],
        }),
      ],
    ],
    [
      "Tribute Summon {s:quantifiedCards} face-up",
      ({ s }) => [
        take("NORMAL_SUMMON", pickOf(s.count, s.noun, where("OWN", ["HAND"])), {
          summonType: ["ADVANCE"],
          position: ["FACEUP"],
        }),
      ],
    ],
    // Its materials: the monsters it can use, and one it must ("including this card")
    [
      "Fusion Summon {p:pick} , using {u:usable}",
      ({ p, u }) => [take("FUSION_SUMMON", p, { to: u })],
    ],
    [
      "Fusion Summon {p:pick} , using {u:usable} as {w:fusionMaterial}",
      ({ p, u }) => [take("FUSION_SUMMON", p, { to: u })],
    ],
    [
      "Fusion Summon {p:pick} , using {u:usable} as {w:fusionMaterial} , including this card",
      ({ p, u }) => [
        take("FUSION_SUMMON", p, { to: u, requires: [INCLUDING_THIS] }),
      ],
    ],
    [
      "Link Summon {s:quantifiedCards} using materials you control , including this card",
      ({ s }) => [
        take("LINK_SUMMON", pickOf(s.count, s.noun, where("OWN", ["EXTRA"])), {
          to: { all: { from: { own: ["MZONE"] }, card: {} } },
          requires: [INCLUDING_THIS],
        }),
      ],
    ],
    // to the GY
    ["send {m:moved} to the GY", ({ m }) => [moving("TO_GRAVE", m)]],
    // Revealed cards are in hidden places, and a monster of an Extra Deck frame can only be hidden in the Extra Deck
    [
      "send {n:number} revealed {f:frame} Monster to the GY",
      ({ n, f }) =>
        f === "RITUAL"
          ? undefined
          : [
              take("TO_GRAVE", {
                pick: "CHOSEN",
                count: exactly(n),
                from: { own: ["EXTRA"] },
                card: { types: [f], among: [allBy("REVEAL")] },
                monster: true,
              }),
            ],
    ],
    // banished
    ["banish {m:moved}", ({ m }) => [moving("BANISH", m)]],
    // For a while: it comes back at the End Phase, in brackets or not
    [
      "banish {m:moved} until the End Phase",
      ({ m }) => [moving("BANISH", m, { until: ["END_PHASE"] })],
    ],
    [
      "banish {m:moved} ( until the End Phase )",
      ({ m }) => [moving("BANISH", m, { until: ["END_PHASE"] })],
    ],
    [
      "banish both until the End Phase",
      () => [back("BANISH", { until: ["END_PHASE"] }, BACK)],
    ],
    [
      "banish ( face-down ) {m:moved}",
      ({ m }) => [moving("BANISH", m, { position: ["FACEDOWN"] })],
    ],
    [
      "banish ( face-down ) that opponent's monster",
      () => [
        {
          move: "BANISH",
          cards: { who: "OPPONENT_BATTLING_MONSTER" },
          position: ["FACEDOWN"],
        },
      ],
    ],
    [
      "banish the top {n:number} cards of your Deck , face-down",
      ({ n }) => [take("BANISH", deckTop(n, "own"), { position: ["FACEDOWN"] })],
    ],
    // destroyed
    ["destroy {m:moved}", ({ m }) => [moving("DESTROY", m)]],
    // equipped: a card, to a monster mentioned before (a pick is a move's cards, so not where they go)
    [
      "equip {m:moved} to {t:moved}",
      ({ m, t }): MoveDraft[] | undefined =>
        t.picked ? undefined : [moving("EQUIP", m, { to: t.cards })],
    ],
    // attached as material, to an Xyz Monster mentioned before, as equipped is ("as material" or not: attaching makes it one)
    ...["attach {m:moved} to {t:moved}", "attach {m:moved} to {t:moved} as {w:xyzMaterial}"].map(
      (words): Pattern => [
        words,
        ({ m, t }): MoveDraft[] | undefined =>
          t.picked ? undefined : [moving("ATTACH", m, { to: t.cards })],
      ],
    ),
    [
      "destroy {x:cardPhrase} {at:fromOrInPlaces} , up to the number of {c:counted}",
      ({ x, at, c }) => [take("DESTROY", pickOf({ min: 1, max: c }, x, at))],
    ],
    [
      "destroy that card on the field",
      () => [back("DESTROY", { card: { places: ["ONFIELD"] } })],
    ],
    // drawn, discarded
    [
      "draw {n:number} card",
      ({ n }) => [{ move: "DRAW", amount: n, player: "OWN" }],
    ],
    [
      "draw {n:number} cards",
      ({ n }) => [{ move: "DRAW", amount: n, player: "OWN" }],
    ],
    [
      "draw cards equal to {v:amount}",
      ({ v }) => [{ move: "DRAW", amount: v, player: "OWN" }],
    ],
    ["discard this card", () => [self("DISCARD", { where: ["HAND"] })]],
    [
      "discard {s:quantifiedCards}",
      ({ s }) => [
        take("DISCARD", pickOf(s.count, s.noun, where("OWN", ["HAND"]))),
      ],
    ],
    // to the Deck
    [
      "shuffle {m:moved} into the Deck",
      ({ m }) => [moving("TO_DECK", m, { deckPlace: ["DECKSHUFFLE"] })],
    ],
    // As many cards, at random, as its hand has over a number
    [
      "randomly shuffle cards from your hand into the Deck so the number in your hand equals {v:cardsAmount}",
      ({ v }) => {
        const over: Value = { subtract: [handCount, v] };
        return [
          take(
            "TO_DECK",
            {
              pick: "RANDOM",
              count: { min: over, max: over },
              from: { own: ["HAND"] },
              card: {},
            },
            { deckPlace: ["DECKSHUFFLE"] },
          ),
        ];
      },
    ],
    ["return {m:moved} to the Extra Deck", ({ m }) => [moving("TO_DECK", m)]],
    [
      "return both that opponent's monster and this card to the Deck",
      () => [
        {
          move: "TO_DECK",
          cards: { cards: [{ who: "OPPONENT_BATTLING_MONSTER" }, THIS] },
        },
      ],
    ],
    // Each player's whole hand, then as many cards as each shuffled in: those that went to their Deck
    [
      "each player with a hand shuffles their entire hand into the Deck",
      () => [
        take(
          "TO_DECK",
          {
            pick: "ALL",
            count: "ALL",
            from: { own: ["HAND"], opponent: ["HAND"] },
            card: {},
          },
          { deckPlace: ["DECKSHUFFLE"] },
        ),
      ],
    ],
    [
      "draws the same number of cards they shuffled into the Deck",
      () =>
        (["OWN", "OPPONENT"] as const).map(
          (player): MoveDraft => ({
            move: "DRAW",
            amount: {
              countOf: {
                among: {
                  cards: BACK,
                  card: { places: ["DECK"], wasController: player },
                },
              },
            },
            player,
          }),
        ),
    ],
    [
      "excavate the top {n:number} cards of your Deck",
      ({ n }) => [take("REVEAL", deckTop(n, "own"), { player: "BOTH" })],
    ],
    // As many as a number, its player choosing which and their order
    [
      "place {x:cardPhrase} {at:fromOrInPlaces} on the bottom of the Deck in any order , equal to {v:amount}",
      ({ x, at, v }) => [
        take("TO_DECK", pickOf({ min: v, max: v }, x, at), {
          deckPlace: ["DECKBOT"],
        }),
      ],
    ],
    // On top of, or on the bottom of, its owner's Deck ("their Deck": the opponent's cards'), in an order its player
    // chooses when there are several
    ...(
      [
        ["on the bottom of", "DECKBOT"],
        ["on top of", "DECKTOP"],
      ] as const
    ).flatMap(([words, place]) =>
      ["the Deck", "your Deck", "their Deck"].flatMap((deck) =>
        ["", " in any order"].map((order): Pattern => [
          `place {m:moved} ${words} ${deck}${order}`,
          ({ m }) => [moving("TO_DECK", m, { deckPlace: [place] })],
        ]),
      ),
    ),
    // placed, Set
    [
      "place {m:moved} , face-up on your field",
      ({ m }) => [moving("PLACE", m, { position: ["FACEUP"] })],
    ],
    [
      "place {m:moved} face-up on your field",
      ({ m }) => [moving("PLACE", m, { position: ["FACEUP"] })],
    ],
    [
      "place {m:moved} in your Pendulum Zone",
      ({ m }) => [moving("PLACE", m, { zones: ["PZONE"] })],
    ],
    // A monster placed as a Continuous Trap is one while it stays where it was placed
    [
      "place that monster in its owner's Spell & Trap Zone as a face-up Continuous Trap",
      () => [
        {
          move: "PLACE",
          cards: BACK_MONSTER,
          position: ["FACEUP"],
          zones: ["SZONE"],
        },
        {
          move: "GIVE_EFFECT",
          cards: BACK_MONSTER,
          effect: given([
            {
              effect: "CHANGE_TYPE",
              to: "THIS_CARD",
              value: "TYPE_TRAP+TYPE_CONTINUOUS",
            },
          ]),
          until: ["LEAVES_FIELD"],
        },
      ],
    ],
    ["Set {m:moved}", ({ m }) => [moving("SET", m)]],
    // "directly" from the Deck: Set from there, not added to the hand first
    [
      "Set {s:quantifiedCardsOr} directly from your {l:placeList}",
      ({ s, l }) => [take("SET", pickOf(s.count, s.noun, where("OWN", l.places)))],
    ],
    // negated
    [
      "negate that effect",
      () => [{ move: "NEGATE_EFFECT", cards: { who: "CHAIN_LINK" } }],
    ],
    [
      "negate that monster's effect",
      () => [{ move: "NEGATE_EFFECT", cards: { who: "CHAIN_LINK" } }],
    ],
    [
      "negate the activation",
      () => [{ move: "NEGATE_ACTIVATION", cards: { who: "CHAIN_LINK" } }],
    ],
    [
      "negate the first effect",
      () => [{ move: "NEGATE_EFFECT", cards: { who: "PREVIOUS_CHAIN_LINK" } }],
    ],
    [
      "negate the second effect",
      () => [{ move: "NEGATE_EFFECT", cards: { who: "CHAIN_LINK" } }],
    ],
    // Its effects: the card mentioned last, as long as it stays face-up on the field, or for a while
    [
      "negate its effects",
      () => [
        back("GIVE_EFFECT", {
          effect: negated(),
          until: ["LEAVES_FIELD_OR_FLIPS"],
        }),
      ],
    ],
    [
      "negate its effects {u:cardEffectDuration}",
      ({ u }) => [back("GIVE_EFFECT", { effect: negated(), until: u })],
    ],
    [
      "negate the effects of {p:pick}",
      ({ p }) => [
        take("GIVE_EFFECT", p, {
          effect: negated(),
          until: ["LEAVES_FIELD_OR_FLIPS"],
        }),
      ],
    ],
    [
      "negate the effects of {p:pick} {u:cardEffectDuration}",
      ({ p, u }) => [take("GIVE_EFFECT", p, { effect: negated(), until: u })],
    ],
    [
      "negate the effects of {x:cardPhrase} {at:fromOrInPlaces} , equal to {v:amount}",
      ({ x, at, v }) => [
        take("GIVE_EFFECT", pickOf({ min: v, max: v }, x, at), {
          effect: negated(),
          until: ["LEAVES_FIELD_OR_FLIPS"],
        }),
      ],
    ],
    // "that face-up monster your opponent controls": only while it still is one
    [
      "negate the effects of that {x:cardNoun} your opponent controls {u:cardEffectDuration}",
      ({ x, u }) => [
        {
          move: "GIVE_EFFECT",
          cards: BACK_MONSTER,
          effect: negated(),
          until: u,
          requires: [
            {
              is: {
                cards: BACK_MONSTER,
                filter: {
                  ...withoutMonster(x.card),
                  ...(x.faceUp ? { states: ["FACEUP"] } : {}),
                  controller: "OPPONENT",
                },
              },
            },
          ],
        },
      ],
    ],
    // positions
    ...(
      [
        ["Defense Position", "FACEUP_DEFENSE"],
        ["face-up Defense Position", "FACEUP_DEFENSE"],
        ["face-down Defense Position", "FACEDOWN_DEFENSE"],
        ["Attack Position", "FACEUP_ATTACK"],
        ["face-up Attack Position", "FACEUP_ATTACK"],
      ] as const
    ).map(([words, position]): Pattern => [
      `change {m:moved} to ${words}`,
      ({ m }) => [moving("CHANGE_POSITION", m, { position: [position] })],
    ]),
    ["change its battle position", () => [back("CHANGE_POSITION")]],
    [
      "change that monster's battle position",
      () => [{ move: "CHANGE_POSITION", cards: BACK_MONSTER }],
    ],
    // revealed
    ["reveal {r:revealed}", ({ r }) => r],
    // Shown to its player (Duel.ConfirmCards(tp, ...)), as revealing shows the opponent
    [
      "look at your opponent's hand",
      () => [
        take(
          "REVEAL",
          { pick: "ALL", count: "ALL", from: { opponent: ["HAND"] }, card: {} },
          { player: "OWN" },
        ),
      ],
    ],
    [
      "reveal your entire hand",
      () => [
        take(
          "REVEAL",
          { pick: "ALL", count: "ALL", from: { own: ["HAND"] }, card: {} },
          { player: "OPPONENT" },
        ),
      ],
    ],
    // Levels, ATK
    [
      "increase its Level by {n:number} {u:cardEffectDuration}",
      ({ n, u }) => [
        back("GIVE_EFFECT", {
          effect: given([
            { effect: "UPDATE_LEVEL", to: "THIS_CARD", value: n },
          ]),
          until: u,
        }),
      ],
    ],
    [
      "reduce the Levels of {p:pick} by {n:number} {u:cardEffectDuration}",
      ({ p, n, u }) => [
        take("GIVE_EFFECT", p, {
          effect: given([
            { effect: "UPDATE_LEVEL", to: "THIS_CARD", value: -n },
          ]),
          until: u,
        }),
      ],
    ],
    // What a card has for a while: a rule's predicate, after the card and before how long ("this card gains ATK equal
    // to the destroyed monster's original ATK until the end of this turn")
    ["{m:moved} {p:predicate} {u:cardEffectDuration}", ({ m, p, u }) => giving(m, p, u)],
    ["{m:moved} {p:predicates} {u:cardEffectDuration}", ({ m, p, u }) => giving(m, p, u)],
    [
      "it gains {n:number} ATK for each {c:counted}",
      ({ n, c }) => [
        back("GIVE_EFFECT", {
          effect: given([
            {
              effect: "UPDATE_ATTACK",
              to: "THIS_CARD",
              value: { fixed: { multiply: [n, c] } },
            },
          ]),
          until: ["LEAVES_FIELD_OR_FLIPS"],
        }),
      ],
    ],
    [
      "change that opponent's monster's ATK to {n:number} {u:cardEffectDuration}",
      ({ n, u }) => [
        back("GIVE_EFFECT", {
          effect: given([{ effect: "SET_ATTACK", to: "THIS_CARD", value: n }]),
          until: u,
        }),
      ],
    ],
    // zones, materials
    [
      "switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone",
      () => [
        self("SWAP_ZONES", {
          card: { places: ["MZONE"], numbers: { SEQUENCE: { max: 4 } } },
          to: { all: { from: { own: ["MZONE"] }, card: center() } },
        }),
      ],
    ],
    ...lifePoints("inflict", "damage to your opponent", "DAMAGE", "OPPONENT"),
    ...lifePoints("gain", "LP", "GAIN_LP", "OWN"),
    ...lifePoints("pay", "LP", "PAY_LP", "OWN"),
    [
      "pay {n:number} Life Points",
      ({ n }) => [{ move: "PAY_LP", amount: n, player: "OWN" }],
    ],
    [
      "detach {n:number} {w:xyzMaterial} from this card",
      ({ n }) => [
        take("DETACH", {
          pick: "CHOSEN",
          count: exactly(n),
          from: { own: ["OVERLAY"] },
          card: { among: [{ who: "MATERIALS_OF", of: THIS }] },
        }),
      ],
    ],
  ],
  /** How a Special Summon is made, after what it Summons, one way after another ("to your opponent's field in Attack Position"). */
  specialSummonMods: [
    ["{a:specialSummonMod}", ({ a }) => a],
    [
      "{a:specialSummonMod} {rest:specialSummonMods}",
      ({ a, rest }): Partial<MoveDraft> => {
        if (Object.keys(a).some((key) => key in rest))
          throw new NoReading("two of one way of Special Summoning");
        return { ...a, ...rest };
      },
    ],
  ],
  specialSummonMod: [
    ...(
      [
        ["in Defense Position", "FACEUP_DEFENSE"],
        ["in face-up Defense Position", "FACEUP_DEFENSE"],
        ["in face-down Defense Position", "FACEDOWN_DEFENSE"],
        ["in Attack Position", "FACEUP_ATTACK"],
        ["in face-up Attack Position", "FACEUP_ATTACK"],
      ] as const
    ).map(([words, position]): [string, () => Partial<MoveDraft>] => [
      words,
      () => ({ position: [position] }),
    ]),
    [
      "to your zone a Link Monster points to",
      (): Partial<MoveDraft> => ({ zones: ["LINKED"] }),
    ],
    // To the opponent's field: they control it, as a Token Summoned there (Nibiru's) does
    [
      "to your opponent's field",
      (): Partial<MoveDraft> => ({ player: "OPPONENT" }),
    ],
    [
      "( this is treated as {a:article} {f:frame} Summon )",
      ({ f }): Partial<MoveDraft> => ({ summonType: [f] }),
    ],
    ...[", ignoring its Summoning conditions", ", ignoring their Summoning conditions"].map(
      (words): [string, () => Partial<MoveDraft>] => [
        words,
        () => ({ ignoring: ["SUMMON_CONDITIONS"] }),
      ],
    ),
  ],
  /**
   * What the cards the move before it took get, after ", but": "it" and "its" are one card, "them" and "their" all of
   * them, as pronouns are (finish.ts).
   */
  butClause: [
    // It is banished instead of leaving the field any other way
    [
      "banish it when it leaves the field",
      (): MoveDraft[] => [
        {
          move: "GIVE_EFFECT",
          cards: BACK_ONE,
          effect: given([
            {
              effect: "LEAVE_FIELD_REDIRECT",
              to: "THIS_CARD",
              value: "LOCATION_REMOVED",
            },
          ]),
          until: ["RESETS_REDIRECT"],
        },
      ],
    ],
    // A card Set this turn that can't be activated this turn, or for as long as it is there that turn (CANNOT_TRIGGER)
    [
      "it cannot be activated this turn",
      (): MoveDraft[] => [
        {
          move: "GIVE_EFFECT",
          cards: BACK_ONE,
          effect: given([{ effect: "CANNOT_TRIGGER", to: "THIS_CARD" }]),
          until: UNTIL_END_OF_TURN,
        },
      ],
    ],
    // Negated while it stays face-up on the field (RESET_EVENT+RESETS_STANDARD)
    ...(
      [
        ["negate its effects", BACK_ONE],
        ["its effects are negated", BACK_ONE],
        ["negate their effects", BACK],
        ["their effects are negated", BACK],
      ] as const
    ).map(([words, cards]): [string, () => MoveDraft[]] => [
      words,
      () => [
        {
          move: "GIVE_EFFECT",
          cards,
          effect: negated(),
          until: ["LEAVES_FIELD_OR_FLIPS"],
        },
      ],
    ]),
  ],
  /** How long what a move gives a card lasts, after it: with a comma, in brackets, or neither. */
  cardEffectDuration: [
    ["until the end of this turn", () => UNTIL_END_OF_TURN],
    [", until the end of this turn", () => UNTIL_END_OF_TURN],
    ["( until the end of this turn )", () => UNTIL_END_OF_TURN],
    ["this turn", () => UNTIL_END_OF_TURN],
    // Until it leaves the field or is flipped face-down, and not again after: what it was given is gone by then
    ["while face-up on the field", () => ["LEAVES_FIELD_OR_FLIPS"]],
    ["while it is face-up on the field", () => ["LEAVES_FIELD_OR_FLIPS"]],
  ],
  /** Moves that last a while: effects given to a player, or to cards. */
  lingeringPlayerMove: [
    ["for the rest of this turn , {r:rule}", ({ r }) => [forPlayer(r)]],
    ["for the rest of this turn {r:rule}", ({ r }) => [forPlayer(r)]],
    ["{r:rule} for the rest of this turn", ({ r }) => [forPlayer(r)]],
    ["{r:rule} this turn", ({ r }) => [forPlayer(r)]],
    ["until the end of the next turn , {r:rule}", ({ r }) => [forPlayer(r, 2)]],
    [
      "until the end of the next turn after this effect resolves , {r:rule}",
      ({ r }) => [forPlayer(r, 2)],
    ],
    [
      "until the end of the next turn after this card resolves , {r:rule}",
      ({ r }) => [forPlayer(r, 2)],
    ],
    ["this turn , {r:rule}", ({ r }) => [forPlayer(r)]],
    // "this turn" inside the rule it lasts for: a Normal Summon more ("during your Main Phase this turn, in addition to ...")
    [
      "you can Normal Summon {s:quantifiedCards} during your Main Phase this turn , {t:extraNormalSummonTail}",
      ({ s }) => {
        const rule = extraNormalSummon(s);
        return rule && [forPlayer(rule)];
      },
    ],
    [
      "for the rest of this turn after this effect resolves , {r:rule}",
      ({ r }) => [forPlayer(r)],
    ],
    [
      "you cannot activate the effects of {x:cardPhrase} until the end of your next turn after this effect resolves , except {y:cardNoun}",
      ({ x, y }) => [
        forPlayer(
          [
            cannotActivate("OWN", {
              ...x,
              card: both(x.card, { none: [withoutMonster(y.card)] }),
            }),
          ],
          1,
          ["OWN_NEXT_TURN_END"],
        ),
      ],
    ],
    // A Special Summon lock with how long between what it locks and its exception
    [
      "you cannot Special Summon for the rest of this turn , except {e:lockException}",
      ({ e }) => [forPlayer(specialSummonLock({}, e))],
    ],
    [
      "you cannot Special Summon {w:lockedSpecialSummons} for the rest of this turn , except {e:lockException}",
      ({ w, e }) => [forPlayer(specialSummonLock(w, e))],
    ],
    [
      "you cannot declare attacks for the rest of this turn , except with {x:cardNoun}",
      ({ x }) => [forPlayer(attackLock("OWN", withoutMonster(x.card)))],
    ],
    [
      "until the end of this turn , their ATK's become halved",
      () => [
        back(
          "GIVE_EFFECT",
          {
            effect: given([
              {
                effect: holds("a-halved-atk-is-set-or-final")
                  ? "SET_ATTACK"
                  : "SET_ATTACK_FINAL",
                to: "THIS_CARD",
                value: {
                  fixed: {
                    divide: [
                      { number: "ATTACK", of: { who: "AFFECTED_CARD" } },
                      2,
                    ],
                    round: "UP",
                  },
                },
              },
            ]),
            until: UNTIL_END_OF_TURN,
          },
          BACK,
        ),
      ],
    ],
  ],
  /**
   * What applies once this card resolves, whatever else it did: a sentence of its own after the card's activation (a
   * rider, text.ts), or a clause after ", also" (act.ts), never the start of an effect.
   */
  afterCardResolves: [
    [
      "for the rest of this turn after this card resolves , {r:rule}",
      ({ r }) => [forPlayer(r)],
    ],
    [
      "{r:rule} for the rest of this turn after this card resolves",
      ({ r }) => [forPlayer(r)],
    ],
  ],
  /** The monsters a Summon can use as material: every one that matches, in places. */
  usable: [
    [
      "{x:cardNoun} {at:fromOrInPlaces}",
      ({ x, at }): CardRef => {
        const { from, card } = pickOf(one, x, at);
        return { all: { from, card } };
      },
    ],
  ],
  fusionMaterial: ["material", "Fusion Material", "Fusion Materials"].map(
    (words): [string, () => true] => [words, () => true],
  ),
  /** An Xyz Monster's materials, in the old words and the new. */
  xyzMaterial: ["material", "materials", "Xyz Material", "Xyz Materials"].map(
    (words): [string, () => true] => [words, () => true],
  ),
  /** What a move takes: cards it picks, this card, or cards mentioned before ("it", "that card": one card; "them"). */
  moved: [
    ["{p:pick}", ({ p }) => picked(p)],
    ["{p:distinctPick}", ({ p }) => picked(p)],
    // The top cards of a Deck, which nobody chooses
    ...(
      [
        ["your", "own"],
        ["your opponent's", "opponent"],
      ] as const
    ).flatMap(([whose, side]): Pattern[] => [
      [
        `the top card of ${whose} Deck`,
        (): Moved => picked(deckTop(1, side)),
      ],
      [
        `the top {n:number} cards of ${whose} Deck`,
        ({ n }): Moved => picked(deckTop(n, side)),
      ],
    ]),
    ["this card", (): Moved => ({ cards: THIS })],
    [
      "this card from your {l:placeList}",
      ({ l }): Moved => ({ cards: THIS, where: l.places }),
    ],
    ["it", (): Moved => ({ cards: BACK_ONE })],
    ["that card", (): Moved => ({ cards: BACK_ONE })],
    ["them", (): Moved => ({ cards: BACK })],
    ["that target", (): Moved => ({ cards: BACK_TARGET })],
    ["that monster", (): Moved => ({ cards: BACK_MONSTER })],
    ["those targets", (): Moved => ({ cards: BACK_TARGET })],
    // What the effect excavated: all of it, cards picked among it, or the rest, which are the excavated cards still in
    // the Deck once the others have gone ("add 1 excavated card to your hand, also shuffle the rest into the Deck")
    ["the excavated cards", (): Moved => ({ cards: backTo("REVEAL") })],
    ...["{n:number} excavated {x:cardPhrase}", "up to {n:number} excavated {x:cardPhrase}"].map(
      (words, upTo): Pattern => [
        words,
        ({ n, x }): Moved => {
          const pick = pickOf(upTo ? { min: 1, max: n } : exactly(n), x, where("OWN", ["DECK"]));
          return picked({ ...pick, card: both(pick.card, { among: [backTo("REVEAL")] }) });
        },
      ],
    ),
    ...["the rest", "the remaining cards", "the other cards"].map((words): Pattern => [
      words,
      (): Moved =>
        picked({
          pick: "ALL",
          count: "ALL",
          from: { own: ["DECK"], opponent: ["DECK"] },
          card: { among: [backTo("REVEAL")] },
        }),
    ]),
    // A Token, by its name and its stats as printed: they say what its database row does, which konamiReader checks
    [
      "{n:number} {x:cardName} {s:tokenStats}",
      ({ n, x, s }): Moved | undefined =>
        x.length === 1
          ? {
              cards: { token: x[0] },
              ...(n > 1 ? { count: exactly(n) } : {}),
              tokenStats: s,
            }
          : undefined,
    ],
  ],
  /** A pick of cards that all have different names, the words after the cards or after their places. */
  distinctPick: [
    "{s:quantifiedCards} with different names {at:fromOrInPlaces}",
    "{s:quantifiedCards} {at:fromOrInPlaces} with different names",
    "{s:quantifiedCards} {at:fromOrInPlaces} , with different names",
  ].map((words): Pattern => [
    words,
    ({ s, at }): PickDraft => ({
      ...pickOf(s.count, s.noun, at),
      pickRequires: [allDifferent("NAME")],
    }),
  ]),
  /** A Token's stats as printed: "( Beast / EARTH / Level 1 / ATK 0 / DEF 0 )". */
  tokenStats: [
    [
      "( {r:race} / {a:attribute} / Level {n:number} / ATK {k:printedStat} / DEF {d:printedStat} )",
      ({ r, a, n, k, d }): TokenStats => ({
        race: r,
        attribute: a,
        level: n,
        atk: k,
        def: d,
      }),
    ],
  ],
  /** An ATK or DEF as printed: a number, or "?" (null), which an effect works out. */
  printedStat: [
    ["{n:number}", ({ n }): number => n],
    ["?", (): null => null],
  ],
  /** What a reveal shows the opponent: this card from the hand, and cards it picks. */
  revealed: [
    [
      "this card in your hand",
      () => [self("REVEAL", { where: ["HAND"], player: "OPPONENT" })],
    ],
    // "this card and 1 Tuner": another card than this one, which can be a Tuner too (Kewl Tune Rotary)
    [
      "this card and {s:quantifiedCards} in your hand",
      ({ s }) => [
        self("REVEAL", { where: ["HAND"], player: "OPPONENT" }),
        take(
          "REVEAL",
          pickOf(
            s.count,
            { ...s.noun, card: both(s.noun.card, { states: ["NOT_SELF"] }) },
            where("OWN", ["HAND"]),
          ),
          { player: "OPPONENT" },
        ),
      ],
    ],
    [
      "this card in your hand and {p:pick}",
      ({ p }) => [
        self("REVEAL", { where: ["HAND"], player: "OPPONENT" }),
        take("REVEAL", p, { player: "OPPONENT" }),
      ],
    ],
  ],
};
