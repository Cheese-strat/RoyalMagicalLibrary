/** Moves: what a resolution or a cost does to cards and players. */
import type {
  Applied,
  CardNumber,
  CardRef,
  Condition,
  Value,
} from "../../../lib/cardSchema.js";
import { holds } from "../../../lib/ruled.js";
import { type Grammar, NoReading } from "../engine.js";
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
  extraDeckLock,
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
    // It is banished instead of leaving the field any other way
    [
      "{m:move} , but banish it when it leaves the field",
      ({ m }): MoveDraft[] => [
        ...m,
        {
          move: "GIVE_EFFECT",
          cards: m[m.length - 1].cards,
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
    ["{t:timed}", ({ t }) => t],
  ],
  move: [
    // to the hand
    ["add {m:moved} to your hand", ({ m }) => [moving("TO_HAND", m)]],
    [
      "add {p:pick} to your hand , except {x:cardName}",
      ({ p, x }) => [take("TO_HAND", except(p, x))],
    ],
    [
      "add {p:pick} to your hand , except {s:some}",
      ({ p, s }) => [
        take("TO_HAND", { ...p, card: both(p.card, { none: [s.noun.card] }) }),
      ],
    ],
    ["return {m:moved} to the hand", ({ m }) => [moving("TO_HAND", m)]],
    [
      "return {x:noun2} {at:at} to the hand , up to the number of {c:counted}",
      ({ x, at, c }) => [
        take("TO_HAND", pickOf({ min: 1, max: c } as never, x, at)),
      ],
    ],
    // Special Summons
    ["Special Summon {m:moved}", ({ m }) => [moving("SPECIAL_SUMMON", m)]],
    [
      "Special Summon {m:moved} to your zone a Link Monster points to",
      ({ m }) => [moving("SPECIAL_SUMMON", m, { zones: ["LINKED"] })],
    ],
    [
      "Special Summon {m:moved} in Defense Position",
      ({ m }) => [
        moving("SPECIAL_SUMMON", m, { position: ["FACEUP_DEFENSE"] }),
      ],
    ],
    [
      "Special Summon {m:moved} ( this is treated as {a:article} {f:frame} Summon )",
      ({ m, f }) => [moving("SPECIAL_SUMMON", m, { summonType: [f] })],
    ],
    [
      "Special Summon {m:moved} , ignoring its Summoning conditions",
      ({ m }) => [
        moving("SPECIAL_SUMMON", m, { ignoring: ["SUMMON_CONDITIONS"] }),
      ],
    ],
    [
      "Special Summon {m:moved} , ignoring their Summoning conditions",
      ({ m }) => [
        moving("SPECIAL_SUMMON", m, { ignoring: ["SUMMON_CONDITIONS"] }),
      ],
    ],
    [
      "choose {p:pick} , and Special Summon both monsters , 1 to each field",
      ({ p }) => [moving("SPECIAL_SUMMON", picked(p), { player: "BOTH" })],
    ],
    // A Token, its stats as printed (read, not checked against the database), that gets the Tributed monsters' together
    [
      "Special Summon 1 {x:cardName} ( {r:race} / {a:attribute} / Level {n:number} / ATK ? / DEF ? ) to your opponent's field ( this Token's ATK / DEF become the combined original ATK / DEF of the Tributed monsters )",
      ({ x }) => {
        const token = { token: x[0] };
        const sum = (number: CardNumber): Applied["value"] => ({
          fixed: { sum: { cards: backTo("TRIBUTE"), number } },
        });
        return [
          { move: "SPECIAL_SUMMON", cards: token, player: "OPPONENT" },
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
      "Special Summon up to {n:number} {x:noun} each from your {l:placeList}",
      ({ n, x, l }) => {
        const pick: PickDraft = {
          ...pickOf(
            { min: 1, max: n * l.places.length },
            x,
            where("OWN", l.places),
          ),
          pickRequires: [
            {
              compare: {
                value: {
                  countOf: { different: { cards: THIS_PICK, by: "PLACE" } },
                },
                is: "EQUAL",
                to: { countOf: { cards: THIS_PICK } },
              },
            },
          ],
        };
        return [take("SPECIAL_SUMMON", pick)];
      },
    ],
    [
      "Synchro Summon {s:someOr}",
      ({ s }) => [
        take(
          "SYNCHRO_SUMMON",
          pickOf(s.count, s.noun, where("OWN", ["EXTRA"])),
        ),
      ],
    ],
    [
      "Ritual Summon {p:pick} , by Tributing {x:noun} {at:at} whose total Levels equal or exceed its Level",
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
      "Tribute {s:some}",
      ({ s }) => [take("TRIBUTE", tribute(s.count, s.noun, FIELD("OWN")))],
    ],
    [
      "Tribute as many {x:noun} {at:at} as possible",
      ({ x, at }) => [take("TRIBUTE", tribute("ALL", x, at))],
    ],
    // A Normal Summon from the hand, now, of a monster whose name another card's text mentions: a Summon, not a Set,
    // which its text would say ("Normal Summon/Set")
    [
      "Normal Summon {s:some} mentioned on that monster",
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
      "Tribute Summon {s:some}",
      ({ s }) => [
        take("NORMAL_SUMMON", pickOf(s.count, s.noun, where("OWN", ["HAND"])), {
          summonType: ["ADVANCE"],
        }),
      ],
    ],
    [
      "Tribute Summon {s:some} face-up",
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
      "Link Summon {s:some} using materials you control , including this card",
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
      ({ n }) => [
        take(
          "BANISH",
          {
            pick: "DECK_TOP",
            count: exactly(n),
            from: { own: ["DECK"] },
            card: {},
          },
          { position: ["FACEDOWN"] },
        ),
      ],
    ],
    // destroyed
    ["destroy {m:moved}", ({ m }) => [moving("DESTROY", m)]],
    // equipped: a card, to a monster mentioned before (a pick is a move's cards, so not where they go)
    [
      "equip {m:moved} to {t:moved}",
      ({ m, t }): MoveDraft[] | undefined =>
        t.picked ? undefined : [moving("EQUIP", m, { to: t.cards })],
    ],
    [
      "destroy {x:noun2} {at:at} , up to the number of {c:counted}",
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
      "discard {s:some}",
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
      ({ n }) => [
        take(
          "REVEAL",
          {
            pick: "DECK_TOP",
            count: exactly(n),
            from: { own: ["DECK"] },
            card: {},
          },
          { player: "BOTH" },
        ),
      ],
    ],
    // As many as a number, its player choosing which and their order
    [
      "place {x:noun2} {at:at} on the bottom of the Deck in any order , equal to {v:amount}",
      ({ x, at, v }) => [
        take("TO_DECK", pickOf({ min: v, max: v }, x, at), {
          deckPlace: ["DECKBOT"],
        }),
      ],
    ],
    [
      "place the excavated cards on the bottom of your Deck in any order",
      () => [
        { move: "TO_DECK", cards: backTo("REVEAL"), deckPlace: ["DECKBOT"] },
      ],
    ],
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
      "negate the effects of {p:pick} {u:lasting}",
      ({ p, u }) => [take("GIVE_EFFECT", p, { effect: negated(), until: u })],
    ],
    [
      "negate the effects of {x:noun2} {at:at} , equal to {v:amount}",
      ({ x, at, v }) => [
        take("GIVE_EFFECT", pickOf({ min: v, max: v }, x, at), {
          effect: negated(),
          until: ["LEAVES_FIELD_OR_FLIPS"],
        }),
      ],
    ],
    // "that face-up monster your opponent controls": only while it still is one
    [
      "negate the effects of that {x:noun} your opponent controls {u:lasting}",
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
    [
      "change {m:moved} to Defense Position",
      ({ m }) => [
        moving("CHANGE_POSITION", m, { position: ["FACEUP_DEFENSE"] }),
      ],
    ],
    [
      "change {m:moved} to face-down Defense Position",
      ({ m }) => [
        moving("CHANGE_POSITION", m, { position: ["FACEDOWN_DEFENSE"] }),
      ],
    ],
    ["change its battle position", () => [back("CHANGE_POSITION")]],
    [
      "change that monster's battle position",
      () => [{ move: "CHANGE_POSITION", cards: BACK_MONSTER }],
    ],
    // revealed
    ["reveal {r:revealed}", ({ r }) => r],
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
      "increase its Level by {n:number} {u:lasting}",
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
      "reduce the Levels of {p:pick} by {n:number} {u:lasting}",
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
    ["{m:moved} {p:predicate} {u:lasting}", ({ m, p, u }) => giving(m, p, u)],
    ["{m:moved} {p:predicates} {u:lasting}", ({ m, p, u }) => giving(m, p, u)],
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
      "change that opponent's monster's ATK to {n:number} {u:lasting}",
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
    [
      "pay {n:number} LP",
      ({ n }) => [{ move: "PAY_LP", amount: n, player: "OWN" }],
    ],
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
  /** How long what a move gives a card lasts, after it: with a comma, in brackets, or neither. */
  lasting: [
    ["until the end of this turn", () => UNTIL_END_OF_TURN],
    [", until the end of this turn", () => UNTIL_END_OF_TURN],
    ["( until the end of this turn )", () => UNTIL_END_OF_TURN],
    ["this turn", () => UNTIL_END_OF_TURN],
    // Until it leaves the field or is flipped face-down, and not again after: what it was given is gone by then
    ["while face-up on the field", () => ["LEAVES_FIELD_OR_FLIPS"]],
    ["while it is face-up on the field", () => ["LEAVES_FIELD_OR_FLIPS"]],
  ],
  /** Moves that last a while: effects given to a player, or to cards. */
  timed: [
    ["for the rest of this turn , {r:rule}", ({ r }) => [forPlayer(r)]],
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
    [
      "you cannot activate the effects of {x:noun2} until the end of your next turn after this effect resolves , except {y:noun}",
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
    [
      "you cannot Special Summon from the Extra Deck for the rest of this turn , except {x:noun}",
      ({ x }) => [forPlayer(extraDeckLock(x))],
    ],
    [
      "you cannot declare attacks for the rest of this turn , except with {x:noun}",
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
  /** The monsters a Summon can use as material: every one that matches, in places. */
  usable: [
    [
      "{x:noun} {at:at}",
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
    ["this card", (): Moved => ({ cards: THIS })],
    [
      "this card from your {l:placeList}",
      ({ l }): Moved => ({ cards: THIS, where: l.places }),
    ],
    ["it", (): Moved => ({ cards: BACK_ONE })],
    ["that card", (): Moved => ({ cards: BACK_ONE })],
    ["them", (): Moved => ({ cards: BACK })],
    ["that target", (): Moved => ({ cards: BACK_TARGET })],
    ["those targets", (): Moved => ({ cards: BACK_TARGET })],
  ],
  /** What a reveal shows the opponent: this card from the hand, and cards it picks. */
  revealed: [
    [
      "this card in your hand",
      () => [self("REVEAL", { where: ["HAND"], player: "OPPONENT" })],
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
