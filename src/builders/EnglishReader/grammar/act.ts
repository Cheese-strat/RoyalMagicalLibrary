/** What comes after the colon: what an effect costs, targets and does, its modes, and its resolution's parts. */
import type { Condition, Value } from "../../../lib/cardSchema.js";
import { holds } from "../../../lib/ruled.js";
import type { Grammar } from "../../EnglishReader/engine.js";
import {
  allBy,
  back,
  BACK,
  backTo,
  control,
  countOf,
  type Draft,
  given,
  materialsInclude,
  type MoveDraft,
  type PartDraft,
  type PickDraft,
  HIDDEN,
  one,
  pickOf,
  summonedBy,
  take,
  THIS,
  THIS_PICK,
  type Where,
  withoutMonster,
} from "../../EnglishReader/phrases.js";
import {
  type Fragment,
  type Clause,
  type ModeDraft,
  FIELD,
  needing,
  partsOf,
  modesOf,
  tributesOf,
  happened,
  either,
  CARDS,
  MONSTERS,
  pointedTo,
  hard,
  twins,
} from "./shared.js";

/** What the words before a list of modes give them. */
interface ModeChoice {
  /** Each mode's own limit ("but you can only use each effect of X once per turn"). */
  limit?: ReturnType<typeof hard>;
  /** What is done after whichever mode is chosen ("also ..."). */
  also?: MoveDraft[];
}
/** The modes a choice's words are followed by, with what those words give them. */
function chosen(choice: ModeChoice, modes: ModeDraft[]): Fragment {
  const fragment = modesOf(modes, choice.limit);
  return choice.also
    ? {
        ...fragment,
        does: [
          ...fragment.does!,
          { link: "AND", moves: choice.also, optional: false },
        ],
      }
    : fragment;
}

export const ACT: Grammar = {
  // ---- after the colon: what it costs, targets and does ----
  act: [
    [
      "You can {c:moves} ; {r:resolution} .",
      ({ c, r }): Fragment => ({ optional: true, cost: c, does: r }),
    ],
    [
      "You can {c:moves} , then target {t:target} ; {r:resolution} .",
      ({ c, t, r }): Fragment => ({
        optional: true,
        cost: c,
        targets: [t],
        does: r,
      }),
    ],
    // A Spell's or Trap's activation: what it costs, without "You can"
    [
      "{c:moves} ; {r:resolution} .",
      ({ c, r }): Fragment => ({ cost: c, does: r }),
    ],
    [
      "{c:moves} , then target {t:target} ; {r:resolution} .",
      ({ c, t, r }): Fragment => ({ cost: c, targets: [t], does: r }),
    ],
    [
      "You can target {t:target} ; {r:resolution} .",
      ({ t, r }): Fragment => ({ optional: true, targets: [t], does: r }),
    ],
    [
      "Target {t:target} ; {r:resolution} .",
      ({ t, r }): Fragment => ({ targets: [t], does: r }),
    ],
    [
      "You can {r:resolution} .",
      ({ r }): Fragment => ({ optional: true, does: r }),
    ],
    // Activated for nothing, where what it does isn't its player's to do ("...; your opponent banishes 1 of them")
    [
      "You can activate this effect ; {r:resolution} .",
      ({ r }): Fragment => ({ optional: true, does: r }),
    ],
    ["{r:resolution} .", ({ r }): Fragment => ({ does: r })],
    // Modes chosen as it is activated, after a cost or not ("You can discard 1 card, then activate 1 of these effects;")
    [
      "You can {x:modeChoice} ; {m:●mode}",
      ({ x, m }): Fragment => ({ optional: true, ...chosen(x, m) }),
    ],
    ["{x:modeChoice} ; {m:●mode}", ({ x, m }): Fragment => chosen(x, m)],
    [
      "You can {c:moves} , then {x:modeChoice} ; {m:●mode}",
      ({ c, x, m }): Fragment => ({ optional: true, cost: c, ...chosen(x, m) }),
    ],
    [
      "{c:moves} , then {x:modeChoice} ; {m:●mode}",
      ({ c, x, m }): Fragment => ({ cost: c, ...chosen(x, m) }),
    ],
    // Parts that need the number revealed to be at least, or exactly, a number, each after the one before
    [
      "You can {c:moves} ; apply all of these effects in sequence , based on {v:amount} , also {t:lingeringPlayerMove} . {l:●threshold}",
      ({ c, v, t, l }): Fragment => ({
        optional: true,
        cost: c,
        does: [
          ...(
            l as { is: "AT_LEAST" | "EQUAL"; n: number; parts: PartDraft[] }[]
          ).flatMap(({ is, n, parts }, i) =>
            parts.map(
              (part, j): PartDraft =>
                j > 0
                  ? part
                  : {
                      ...part,
                      ...(i > 0 ? { link: "ALSO_AFTER_THAT" } : {}),
                      requires: [
                        { compare: { value: v, is, to: n } },
                        ...(part.requires ?? []),
                      ],
                    },
            ),
          ),
          { link: "AND", moves: t, optional: false },
        ],
      }),
    ],
    // Effects its player has for the rest of the turn
    [
      "You can {c:move} ; apply these effects this turn . {l:●effect}",
      ({ c, l }): Fragment => ({
        optional: true,
        cost: c,
        does: [
          {
            moves: (l as Draft[]).flatMap(twins).map(
              (effect): MoveDraft => ({
                move: "PLAYER_EFFECT",
                player: "OWN",
                effect,
                until: ["END_PHASE"],
              }),
            ),
            optional: false,
          },
        ],
      }),
    ],
  ],
  /** The words that say modes follow, with what they give the modes: a limit each, and what is done after whichever is chosen. */
  modeChoice: [
    ["activate 1 of these effects", (): ModeChoice => ({})],
    [
      "activate 1 of these effects ( but you can only use each effect of {name} once per turn )",
      (): ModeChoice => ({ limit: hard() }),
    ],
    [
      "activate 1 of these effects ( but you can only use each of these effects of {name} once per turn )",
      (): ModeChoice => ({ limit: hard() }),
    ],
    [
      "activate 1 of these effects ( but you can only use each of these effects of {name} once per turn , also {t:lingeringPlayerMove} )",
      ({ t }): ModeChoice => ({ limit: hard(), also: t }),
    ],
  ],
  target: [
    ["{p:pick}", ({ p }): PickDraft => ({ ...p, pick: "TARGETED" })],
    [
      "{x:cardPhrase} {at:fromOrInPlaces} up to the number of {c:counted}",
      ({ x, at, c }): PickDraft =>
        pickOf({ min: 1, max: c } as never, x, at, { pick: "TARGETED" }),
    ],
    // As many as the cards mentioned last ("Discard any number of cards, then target that many")
    [
      "that many {x:cardPhrase} {at:fromOrInPlaces}",
      ({ x, at }): PickDraft => {
        const many: Value = { countOf: { cards: BACK } };
        return pickOf({ min: many, max: many }, x, at, { pick: "TARGETED" });
      },
    ],
    [
      "{a:pick} , or {b:pick}",
      ({ a, b }): PickDraft | undefined => {
        const pick = either(a, b);
        return pick && { ...pick, pick: "TARGETED" };
      },
    ],
    [
      "{p:pick} , including {s:quantifiedCards} {at:fromOrInPlaces}",
      ({ p, s, at }): PickDraft => ({
        ...p,
        pick: "TARGETED",
        pickRequires: [
          {
            atLeast: 1,
            of: {
              among: {
                cards: THIS_PICK,
                card: { ...withoutMonster(s.noun.card), controller: at.side },
              },
            },
          },
        ],
      }),
    ],
  ],
  counted: [
    ["{x:cardPhrase} {at:fromOrInPlaces}", ({ x, at }) => countOf(x, at)],
    [
      "excavated {x:cardPhrase}",
      ({ x }): Value => ({
        countOf: { among: { cards: backTo("REVEAL"), card: x.card } },
      }),
    ],
    // The monsters a Tribute Summon Tributed are its materials: the Summon its event is ("If this card is Tribute Summoned")
    ["monsters Tributed", () => tributesOf(BACK)],
    ["monsters Tributed for its Tribute Summon", () => tributesOf(BACK)],
    // The materials used as non-Tuners, whatever their types (Zalen treated as a non-Tuner is one)
    [
      "non-Tuners used for its Synchro Summon",
      (): Value => ({
        countOf: {
          cards: { who: "SUMMON_MATERIALS", of: BACK, role: "NON_TUNER" },
        },
      }),
    ],
  ],
  /** A number an effect works out as it resolves. */
  amount: [
    ["the number of {c:counted}", ({ c }) => c],
    [
      "the number revealed",
      (): Value => ({ countOf: { cards: allBy("REVEAL") } }),
    ],
    [
      "the number banished",
      (): Value => ({ countOf: { cards: backTo("BANISH") } }),
    ],
    [
      "the number of {c:counted} + {n:number}",
      ({ c, n }): Value => ({ add: [c, n] }),
    ],
    // Those of its materials that match, their numbers added up
    [
      "the total original ATK of the {x:cardNoun} used as material",
      ({ x }): Value => ({
        sum: {
          cards: { who: "SUMMON_MATERIALS", of: BACK },
          number: "BASE_ATTACK",
          card: withoutMonster(x.card),
        },
      }),
    ],
    // The monster a trigger on a destruction is about: its event's card
    [
      "the destroyed monster's original ATK",
      (): Value => ({ number: "BASE_ATTACK", of: { who: "EVENT_CARDS" } }),
    ],
    [
      "the number of different card types of {x:cardNoun} Tributed this turn ( {l:frameCommas} )",
      ({ x, l }): Value => ({
        countOf: {
          cardTypes: { cards: happened(["RELEASE"], x.card), among: l },
        },
      }),
    ],
    // The monsters there, told apart by Type: face-up ones where a monster can be face-down, which doesn't show its Type
    [
      "the number of different Monster Types {at:fromOrInPlaces}",
      ({ at }): Value => {
        const { from, card } = pickOf(one, MONSTERS, {
          ...at,
          faceUp: (at as Where).places.filter((place) => HIDDEN.has(place)),
        });
        return {
          countOf: { different: { cards: { all: { from, card } }, by: "RACE" } },
        };
      },
    ],
    // How many cards the effect's draw drew, before it
    ["the number of cards you drew", (): Value => ({ countOf: { moved: "DRAW" } })],
  ],
  /** A number of cards, after words that said cards ("shuffle cards ... so the number in your hand equals the number your opponent controls + 6"). */
  cardsAmount: [
    ["the number {at:fromOrInPlaces}", ({ at }) => countOf(CARDS, at)],
    [
      "the number {at:fromOrInPlaces} + {n:number}",
      ({ at, n }): Value => ({ add: [countOf(CARDS, at), n] }),
    ],
  ],
  // ---- what a list's bullets hold: the words before the list say which ({m:●mode}) ----
  /** A mode of an effect, chosen as it is activated. */
  mode: [
    ["{r:resolution} .", ({ r }): ModeDraft => ({ parts: r })],
    [
      "You can target {t:target} ; {r:resolution} .",
      ({ t, r }): ModeDraft => ({ parts: r, targets: [t] }),
    ],
  ],
  /** Parts that need a number to be at least, or exactly, the number before the colon. */
  threshold: [
    [
      "{n:number} + : {r:resolution} .",
      ({ n, r }) => ({ is: "AT_LEAST", n, parts: r }),
    ],
    [
      "{n:number} : {r:resolution} .",
      ({ n, r }) => ({ is: "EQUAL", n, parts: r }),
    ],
  ],
  /** What the effect a chain link is can include, for "any of these effects". */
  declared: [
    // Drawing adds cards from the Deck to the hand too
    [
      "Add a card from the Deck to the hand .",
      (): Condition[] => [
        {
          chainLink: {
            declaredFrom: { category: ["TOHAND"], places: ["DECK"] },
          },
        },
        { chainLink: { declares: ["DRAW"] } },
      ],
    ],
    [
      "Special Summon from the Deck .",
      (): Condition[] => [
        {
          chainLink: {
            declaredFrom: { category: ["SPECIAL_SUMMON"], places: ["DECK"] },
          },
        },
      ],
    ],
    [
      "Send a card from the Deck to the GY .",
      (): Condition[] => [
        {
          chainLink: {
            declaredFrom: { category: ["TOGRAVE"], places: ["DECK"] },
          },
        },
      ],
    ],
  ],
  /** An effect this card has when its Synchro Materials included the Attribute before the colon. */
  attributeGrant: [
    [
      "{a:attribute} : {e:effect}",
      ({ a, e }): Draft =>
        needing(e, [
          summonedBy("SYNCHRO"),
          materialsInclude({ originalAttributes: [a] }),
        ]),
    ],
  ],
  /** An effect this card has when it points to at least, or exactly, the number of monsters before the colon. */
  countGrant: [
    [
      "{n:number} + : {e:effect}",
      ({ n, e }): Draft =>
        needing(e, [
          control({ card: pointedTo, monster: true }, FIELD("BOTH"), n),
        ]),
    ],
    [
      "{n:number} : {e:effect}",
      ({ n, e }): Draft =>
        needing(e, [
          {
            compare: {
              value: countOf({ card: pointedTo, monster: true }, FIELD("BOTH")),
              is: "EQUAL",
              to: n,
            },
          },
        ]),
    ],
  ],

  // ---- resolutions: parts, joined ----
  resolution: [
    ["{c:firstClause}", ({ c }) => partsOf(c)],
    ["{c:firstClause} {l:links}", ({ c, l }) => [...partsOf(c), ...l]],
  ],
  links: [
    [
      "{k:link} {c:clause}",
      ({ k, c }): PartDraft[] => [
        { ...k, moves: c.moves, optional: c.optional },
      ],
    ],
    [
      "{k:link} {c:clause} {rest:links}",
      ({ k, c, rest }): PartDraft[] => [
        { ...k, moves: c.moves, optional: c.optional },
        ...rest,
      ],
    ],
  ],
  link: [
    [", and if you do ,", () => ({ link: "AND_IF_YOU_DO" })],
    [", then", () => ({ link: "THEN" })],
    [
      ", then if {c:conditionClause} ,",
      ({ c }) => ({ link: "THEN", requires: c.requires }),
    ],
    [", also", () => ({ link: "AND" })],
    // "and if you do" with a condition: what follows needs what came before to have happened, as well as the condition
    // (ruling: and-if-makes-what-follows-depend; Number 90's destroy needs its negation)
    [
      ", and if {c:conditionClause} ,",
      ({ c }) => ({
        link: holds("and-if-makes-what-follows-depend")
          ? "AND_IF_YOU_DO"
          : "AND",
        requires: c.requires,
      }),
    ],
  ],
  firstClause: [
    ["{m:moves}", ({ m }): Clause => ({ moves: m, optional: false })],
    ["{x:modal}", ({ x }): Clause => ({ modes: x, optional: false })],
    [
      "immediately after this effect resolves , {m:moves}",
      ({ m }): Clause => ({ moves: m, optional: false }),
    ],
  ],
  clause: [
    ["{m:moves}", ({ m }): Clause => ({ moves: m, optional: false })],
    ["{m:afterCardResolves}", ({ m }): Clause => ({ moves: m, optional: false })],
    ["you can {m:moves}", ({ m }): Clause => ({ moves: m, optional: true })],
    [
      "immediately after this effect resolves, you can {m:moves}",
      ({ m }): Clause => ({ moves: m, optional: true }),
    ],
    [
      "immediately after this effect resolves, {m:moves}",
      ({ m }): Clause => ({ moves: m, optional: false }),
    ],
  ],
  /** Moves made in one of the ways listed, chosen as it resolves: of one pick, or of the cards mentioned last. */
  modal: [
    ...["add to your hand , or Special Summon , {p:pick}", "add to your hand or Special Summon , {p:pick}"].map(
      (words): [string, (slots: any) => MoveDraft[][]] => [
        words,
        ({ p }) => [[take("TO_HAND", p)], [take("SPECIAL_SUMMON", p)]],
      ],
    ),
    [
      "take {p:pick} , and either add it to your hand or attach it to this card as material",
      ({ p }) => [[take("TO_HAND", p)], [take("ATTACH", p, { to: THIS })]],
    ],
    // For as long as it is on the field face-up
    [
      "increase or decrease its Level by {n:number}",
      ({ n }) =>
        [n, -n].map((value) => [
          back("GIVE_EFFECT", {
            effect: given([{ effect: "UPDATE_LEVEL", to: "THIS_CARD", value }]),
            until: ["LEAVES_FIELD_OR_FLIPS"],
          }),
        ]),
    ],
  ],
};
