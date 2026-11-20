/** Effects, and what comes before the colon: when they can be used (events, conditions, phases). */
import type { CardFilter, Condition, Place } from "../../../lib/cardSchema.js";
import { holds } from "../../../lib/ruled.js";
import type { Grammar, Pattern } from "../engine.js";
import {
  backTo,
  BATTLE_PHASE,
  both,
  center,
  control,
  countOf,
  type Draft,
  type Noun,
  located,
  MAIN_PHASE,
  materialsInclude,
  NOT_DAMAGE_STEP,
  OPPONENT_ACTIVATED,
  placesFor,
  reveals,
  self,
  SOFT,
  summonedBy,
  THIS,
  thisIs,
  withoutMonster,
} from "../phrases.js";
import {
  type Fragment,
  type Some,
  where,
  FIELD,
  merge,
  requires,
  continuous,
  happened,
  hasMaterial,
} from "./shared.js";

/** What an event happened to: this card, or any card that matches. */
interface Subject {
  self: boolean;
  card: CardFilter;
  /** Its words say it is a monster ("this Fusion Summoned card"): the field it was on is a Monster Zone. */
  monster?: boolean;
  /** "you control", "an opponent's": whose field it is, or was, on. */
  side?: "OWN" | "OPPONENT";
}
/** What happened, one event each: what the card is or was once it happened, and what else the event needs. */
type Happening = {
  event: string;
  card?: CardFilter;
  /** What it must not have been ("sent to the GY, except from the field"). */
  unless?: CardFilter;
  requires?: Condition[];
  /** It left where it was: "you control" is whose field it was on. */
  leaves?: boolean;
  /** Only monsters can (a Summon, an attack): "monster" says nothing. */
  monsters?: boolean;
  /** The card the event names, when not its cards: the attacker of an attack declaration. */
  actor?: "ATTACKER";
  /** Said only of this card ("destroys an opponent's monster by battle": the monster it battled). */
  ownOnly?: boolean;
  /** It happens in the Damage Step, where an effect on it can be activated. */
  damageStep?: boolean;
}[];

const anyCard = (noun: Noun, side?: "OWN" | "OPPONENT"): Subject => ({
  self: false,
  card: noun.card,
  monster: noun.monster,
  ...(side ? { side } : {}),
});
const summoned = (event: string, by?: string): Happening[number] => ({
  event,
  ...(by ? { card: { summonedBy: [by] } } : {}),
  monsters: true,
});
const destroyed = (
  card: CardFilter,
  damageStep = false,
): Happening[number] => ({
  event: "DESTROYED",
  card,
  leaves: true,
  ...(damageStep ? { damageStep } : {}),
});
const withCard = (happening: Happening, card: CardFilter): Happening =>
  happening.map((each) => ({ ...each, card: both(each.card ?? {}, card) }));
const withRequires = (happening: Happening, condition: Condition): Happening =>
  happening.map((each) => ({
    ...each,
    requires: [...(each.requires ?? []), condition],
  }));
const attack = (requires?: Condition[]): Happening[number] => ({
  event: "ATTACK_ANNOUNCE",
  monsters: true,
  actor: "ATTACKER",
  ...(requires ? { requires } : {}),
});
/** The monster this card battled ("destroys an opponent's monster by battle"). */
const battleTarget = (filter: CardFilter): Condition => ({
  is: { cards: { who: "BATTLE_TARGET" }, filter },
});
/** The field a monster was on is a Monster Zone. */
const fieldOf = (card: CardFilter, monster?: boolean): CardFilter =>
  monster
    ? {
        ...card,
        ...(card.wasIn ? { wasIn: placesFor(card.wasIn, true) } : {}),
        ...(card.places ? { places: placesFor(card.places, true) } : {}),
      }
    : card;
/** Two of one event joined by "or" ("Synchro or Xyz Summoned"): either's card does. */
function eitherOf(
  a: Happening[number],
  b: Happening[number],
): Happening[number] | undefined {
  const { card: x, ...restA } = a;
  const { card: y, ...restB } = b;
  if (JSON.stringify(restA) !== JSON.stringify(restB)) return undefined;
  if (!x || !y) return restA;
  const [kx, ky] = [Object.keys(x), Object.keys(y)];
  const key = kx[0] as keyof CardFilter;
  if (kx.length === 1 && ky.length === 1 && key in y && Array.isArray(x[key]))
    return {
      ...restA,
      card: { [key]: [...(x[key] as unknown[]), ...(y[key] as unknown[])] },
    };
  return { ...restA, card: { anyOf: [x, y] } };
}

/**
 * An event as an effect's: its events, and what each needs of the card it happened to, which is this card (SELF) or
 * one of the event's cards (ANY). When the events need different things, each has its own (eventRequires).
 */
function happen(subject: Subject, happening: Happening): Fragment | undefined {
  if (!subject.self && happening.some((each) => each.ownOnly)) return undefined;
  const tributeSetIsNormal =
    holds("tcg-a-tribute-set-is-a-normal-summon") ||
    !holds("a-tribute-set-is-not-a-normal-summon");
  const expanded =
    !subject.self &&
    tributeSetIsNormal &&
    !reveals(withoutMonster(subject.card), "MZONE")
      ? happening.flatMap((each) =>
          each.event === "SUMMON_SUCCESS" &&
          !each.card?.summonedBy?.includes("ADVANCE")
            ? [
                each,
                {
                  ...each,
                  event: "MSET",
                  card: both(each.card ?? {}, { summonedBy: ["ADVANCE"] }),
                },
              ]
            : [each],
        )
      : happening;
  const byEvent = new Map<string, Happening[number]>();
  for (const each of expanded) {
    const known = byEvent.get(each.event);
    const one = known ? eitherOf(known, each) : each;
    if (!one) return undefined;
    byEvent.set(each.event, one);
  }
  const conditions = (each: Happening[number]): Condition[] => {
    const field: CardFilter = subject.side
      ? each.leaves
        ? { wasController: subject.side, wasIn: ["ONFIELD"] }
        : { controller: subject.side }
      : {};
    const own = each.monsters ? withoutMonster(subject.card) : subject.card;
    const card = fieldOf(
      both(both(own, field), each.card ?? {}),
      subject.monster,
    );
    const rest = each.requires ?? [];
    if (subject.self)
      return [
        ...(Object.keys(card).length ? [thisIs(card)] : []),
        ...(each.unless ? [{ not: thisIs(each.unless) }] : []),
        ...rest,
      ];
    const matched = each.unless
      ? { ...card, none: [...(card.none ?? []), each.unless] }
      : card;
    return [
      each.actor
        ? { is: { cards: { who: each.actor }, filter: matched } }
        : { eventCards: { count: 1, card: matched } },
      ...rest,
    ];
  };
  const events = [...byEvent.keys()];
  const each = [...byEvent.values()].map(conditions);
  const same = each.every((c) => JSON.stringify(c) === JSON.stringify(each[0]));
  return {
    events,
    eventOf: subject.self ? "SELF" : "ANY",
    ...(same
      ? each[0].length
        ? { requires: each[0] }
        : {}
      : {
          eventRequires: Object.fromEntries(
            events.map((event, i) => [event, each[i]]),
          ),
        }),
    ...([...byEvent.values()].some((e) => e.damageStep)
      ? { damageStep: true }
      : {}),
  };
}
/**
 * A player's Summon of monsters: one of the event's cards, Summoned by that player. A Tribute Summon is a Tribute Set
 * too, unless the monster must be something a face-down monster doesn't show ("If you Tribute Summon a LIGHT monster"),
 * which a Set one isn't (ruling: a-tribute-set-is-a-tribute-summon). A Set by Tributing isn't a Normal Summon, so "If a
 * monster is Normal Summoned" has no such twin (ruling: a-tribute-set-is-not-a-normal-summon).
 */
const playerSummons = (
  player: "OWN" | "OPPONENT",
  kinds: Happening,
  some: Some,
): Fragment | undefined => {
  const set = !reveals(withoutMonster(some.noun.card), "MZONE");
  const tributeSetIsTribute = holds("a-tribute-set-is-a-tribute-summon");
  return happen(
    anyCard(some.noun),
    withCard(
      kinds.flatMap((kind) =>
        set && tributeSetIsTribute && kind.card?.summonedBy?.includes("ADVANCE")
          ? [kind, { ...kind, event: "MSET" }]
          : [kind],
      ),
      { summonedByPlayer: player },
    ),
  );
};

export const EFFECTS: Grammar = {
  // ---- effects ----
  effect: [
    ["{h:header} : {a:act}", ({ h, a }): Draft => merge(h, a)],
    ["{a:act}", ({ a }): Draft => a],
    // Continuous effects: what applies while their conditions hold
    ["{a:applied} .", ({ a }): Draft => continuous(a)],
    ["While {c:cond} , {a:applied} .", ({ c, a }): Draft => continuous(a, c)],
    ["{a:applied} , while {c:cond} .", ({ a, c }): Draft => continuous(a, c)],
    ["{a:applied} while {c:cond} .", ({ a, c }): Draft => continuous(a, c)],
    ["If {c:cond} , {a:applied} .", ({ c, a }): Draft => continuous(a, c)],
    // While this card is used as a Fusion Material, it is treated as a card of another name too (EFFECT_ADD_FUSION_CODE)
    [
      "If this face-up card is used as Fusion Material , its name can be treated as {x:cardName} .",
      ({ x }): Draft =>
        continuous(
          [{ effect: "ADD_FUSION_CODE", to: "THIS_CARD", value: x[0] }],
          requires(thisIs({ states: ["FACEUP"] })),
        ),
    ],
    // "it": this card, what the condition is about (a sentence that starts with "It" means the card the one before it did
    // something to: "Special Summon 1 "Cyber Dragon" ... It cannot be destroyed by card effects")
    [
      "If this card has {s:some} as material , it cannot be destroyed by card effects .",
      ({ s }): Draft =>
        continuous(
          [{ effect: "INDESTRUCTABLE_EFFECT", to: "THIS_CARD", value: 1 }],
          requires(hasMaterial(s)),
        ),
    ],
    [
      "If this card you control would be used as Synchro Material , you can treat it as a non-Tuner .",
      (): Draft => continuous([{ effect: "NONTUNER", to: "THIS_CARD" }]),
    ],
    // What happens when something does, without a chain: "If", or "After", with no colon. Konami's FAQ calls these
    // unclassified effects (not activated, Trigger, or Continuous): they don't activate, generally don't apply again, and
    // are negated along with the monster's effects (Cheesestrat, 2026-11-17; Assault Blackwing - Kusanagi the Gathering
    // Storm's first two). RML has no kind of their own for them yet, and writes them as AUTO.
    ...["If", "After"].map(
      (word): Pattern => [
        `${word} {e:event} , {r:resolution} .`,
        ({ e, r }): Draft => ({ ...e, kind: "AUTO", does: r }),
      ],
    ),
    // Every time it does: "immediately", as it happens
    [
      "Each time {e:event} , immediately {r:resolution} .",
      ({ e, r }): Draft => ({ ...e, kind: "AUTO", does: r }),
    ],
    // What its player must do, when the clauses before it say
    [
      "{w:when} , you must {r:resolution} .",
      ({ w, r }): Draft => ({ ...w, kind: "AUTO", does: r }),
    ],
    // Responses to it. Only while it is the last thing to happen, which a ruling's file gives it once the card is read
    // (when-is-the-last-thing-to-happen)
    [
      "Your opponent cannot activate cards or effects when {e:event} .",
      ({ e }): Draft => ({
        ...e,
        kind: "AUTO",
        does: [
          {
            moves: [
              {
                move: "CHAIN_LIMIT",
                cards: { who: "EVENT_CARDS" },
                canRespond: "YOU",
                until: ["SUMMON"],
              },
            ],
            optional: false,
          },
        ],
      }),
    ],
    [
      "Cannot be used as {f:frame} Material the turn it is {g:frame} Summoned .",
      ({ f, g }): Draft =>
        continuous(
          [{ effect: `CANNOT_BE_${f}_MATERIAL`, to: "THIS_CARD", value: 1 }],
          requires(summonedBy(g), thisIs({ states: ["ARRIVED_THIS_TURN"] })),
        ),
    ],
    [
      "This card {z:zone} cannot be destroyed by battle with a monster {y:zone} .",
      ({ z, y }): Draft =>
        continuous(
          [{ effect: "INDESTRUCTABLE_BATTLE", to: "THIS_CARD", value: y }],
          requires(thisIs(z)),
        ),
    ],
    // "You can negate" an effect as it resolves, without a chain
    [
      "You can negate a monster effect activated by your opponent in response to the activation of {x:article} {a:archetypes} monster effect , then destroy this card .",
      ({ a }): Draft => ({
        kind: "AUTO",
        events: ["CHAIN_SOLVING"],
        eventOf: "ANY",
        does: [
          {
            moves: [{ move: "NEGATE_EFFECT", cards: { who: "CHAIN_LINK" } }],
            optional: true,
          },
          { link: "THEN", moves: [self("DESTROY")], optional: false },
        ],
        requires: [
          { chainLink: { types: ["MONSTER"], activated: true } },
          OPPONENT_ACTIVATED,
          {
            chainLink: {
              link: "PREVIOUS",
              types: ["MONSTER"],
              activated: true,
            },
          },
          {
            is: {
              cards: { who: "PREVIOUS_CHAIN_LINK_CARD" },
              filter: { archetypes: a },
            },
          },
        ],
      }),
    ],
    // A negation of an effect that includes any of the listed (Ash Blossom & Joyous Spring)
    [
      "When a card or effect is activated that includes any of these effects ( Quick Effect ) : {a:act} {l:●declared}",
      ({ a, l }): Draft =>
        merge(
          { kind: "QUICK", events: ["CHAINING"] },
          a,
          requires({ any: (l as Condition[][]).flat() }),
        ),
    ],
  ],

  // ---- before the colon: when it can be used ----
  /** Clauses joined by commas, as printed (its event, conditions, phase and limit), then "(Quick Effect)". */
  header: [
    ["{c:when}", ({ c }): Fragment => c],
    [
      "{c:when} ( Quick Effect )",
      ({ c }): Fragment => ({ ...c, kind: "QUICK" }),
    ],
    // An effect that Summons as it resolves puts "you can" before it ("During your opponent's Main Phase, you can (Quick
    // Effect): Immediately after this effect resolves, Normal Summon 1 …")
    [
      "{c:when} , you can ( Quick Effect )",
      ({ c }): Fragment => ({ ...c, kind: "QUICK", optional: true }),
    ],
    [
      "{c:when} ( except during the Damage Step )",
      ({ c }): Fragment => merge(c, requires(NOT_DAMAGE_STEP)),
    ],
    ["( Quick Effect )", (): Fragment => ({ kind: "QUICK" })],
    // A Flip Effect doesn't miss its timing
    ["FLIP", (): Fragment => ({ kind: "FLIP", delay: true })],
  ],
  /** Before the colon, the clauses joined by commas. */
  when: [
    ["{c:whenPart}", ({ c }) => c],
    ["{c:whenPart} , {rest:when}", ({ c, rest }) => merge(c, rest)],
  ],
  whenPart: [
    // "If": a trigger that doesn't miss its timing; "When": one that can
    ["If {e:event}", ({ e }): Fragment => ({ ...e, delay: true })],
    [
      "If {e:event} {x:extras}",
      ({ e, x }): Fragment => ({ ...merge(e, x), delay: true }),
    ],
    // What the card's activation does: a Continuous Spell or Trap's, instead of nothing
    ["When this card is activated", (): Fragment => ({ kind: "ACTIVATE" })],
    ["When {e:event}", ({ e }): Fragment => e],
    ["When {e:event} {x:extras}", ({ e, x }): Fragment => merge(e, x)],
    ["If {c:condition}", ({ c }): Fragment => c],
    ["During {t:time}", ({ t }): Fragment => t],
    ["At {m:moment}", ({ m }): Fragment => m],
    ["Once per turn", (): Fragment => ({ limit: SOFT })],
    // Of an effect applied for a turn: once in that turn
    ["Once", (): Fragment => ({ limit: SOFT })],
    [
      "Once per opponent's turn",
      (): Fragment => ({ limit: SOFT, requires: [{ turn: "OPPONENT" }] }),
    ],
    [
      "Once while face-up on the field",
      (): Fragment => ({ limit: { ...SOFT, per: "WHILE_FACE_UP" } }),
    ],
    [
      "except during the Draw Phase",
      () => requires({ not: { phase: ["DRAW"] } }),
    ],
  ],
  /**
   * After "During": the turn and phase it can be used in (conditions an Ignition Effect meets anyway in its player's Main
   * Phase, which finish.ts leaves out for one), or a phase whose start is its event.
   */
  time: [
    [
      "your Main Phase",
      (): Fragment => ({ during: [{ turn: "OWN" }, MAIN_PHASE] }),
    ],
    ["the Main Phase", (): Fragment => ({ during: [MAIN_PHASE] })],
    [
      "your opponent's Main Phase",
      (): Fragment => ({ during: [{ turn: "OPPONENT" }, MAIN_PHASE] }),
    ],
    ["the Battle Phase", (): Fragment => ({ during: [BATTLE_PHASE] })],
    [
      "your Battle Phase",
      (): Fragment => ({ during: [{ turn: "OWN" }, BATTLE_PHASE] }),
    ],
    [
      "your opponent's Battle Phase",
      (): Fragment => ({ during: [{ turn: "OPPONENT" }, BATTLE_PHASE] }),
    ],
    [
      "the Main or Battle Phase",
      (): Fragment => ({
        during: [
          {
            phase: [
              "MAIN1",
              "MAIN2",
              "BATTLE_START",
              "BATTLE_STEP",
              "DAMAGE",
              "DAMAGE_CAL",
              "BATTLE",
            ],
          },
        ],
      }),
    ],
    ["your turn", (): Fragment => ({ during: [{ turn: "OWN" }] })],
    [
      "your opponent's turn",
      (): Fragment => ({ during: [{ turn: "OPPONENT" }] }),
    ],
    // Either player's turn: whenever it can be used, so a Quick Effect
    ["either player's turn", (): Fragment => ({ kind: "QUICK" })],
    [
      "the Damage Step",
      (): Fragment => ({ during: [{ phase: ["DAMAGE", "DAMAGE_CAL"] }] }),
    ],
    // Damage calculation is about to happen: an event, which a Quick Effect can be activated on too
    [
      "damage calculation",
      (): Fragment => ({ events: ["PRE_DAMAGE_CALCULATE"], eventOf: "ANY" }),
    ],
    // A phase's start: a trigger on it, for whichever player's turn it is, unless it says whose
    ...(
      [
        ["Draw", "PHASE_DRAW"],
        ["Standby", "PHASE_STANDBY"],
        ["End", "PHASE_END"],
      ] as const
    ).flatMap(([word, event]): Pattern[] => [
      [
        `the ${word} Phase`,
        (): Fragment => ({ events: [event], eventOf: "ANY" }),
      ],
      // The phase of the turn an effect is applied for
      [
        `this ${word} Phase`,
        (): Fragment => ({ events: [event], eventOf: "ANY" }),
      ],
      ...(
        [
          [`your ${word} Phase`, "OWN"],
          [`each of your ${word} Phases`, "OWN"],
          [`your opponent's ${word} Phase`, "OPPONENT"],
        ] as const
      ).map(
        ([words, turn]): Pattern => [
          words,
          (): Fragment => ({
            events: [event],
            eventOf: "ANY",
            requires: [{ turn }],
          }),
        ],
      ),
    ]),
  ],
  /** After "At": a moment of the Battle Phase, its event. */
  moment: [
    [
      "the start of the Battle Phase",
      (): Fragment => ({ events: ["PHASE_BATTLE_START"], eventOf: "ANY" }),
    ],
    [
      "the end of the Battle Phase",
      (): Fragment => ({ events: ["PHASE_BATTLE"], eventOf: "ANY" }),
    ],
    [
      "the end of the Damage Step",
      (): Fragment => ({ events: ["DAMAGE_STEP_END"], eventOf: "ANY" }),
    ],
    [
      "the start of the Damage Step",
      (): Fragment => ({ events: ["BATTLE_START"], eventOf: "ANY" }),
    ],
    [
      "the start of the Damage Step , if your {x:noun} battles an opponent's monster",
      ({ x }): Fragment => ({
        events: ["BATTLE_START"],
        eventOf: "ANY",
        requires: [
          {
            is: {
              cards: { who: "OWN_BATTLING_MONSTER" },
              filter: located(x.card, ["MZONE"]),
            },
          },
          { exists: { who: "OPPONENT_BATTLING_MONSTER" } },
        ],
      }),
    ],
    [
      "the start of the Damage Step , if this card battles an opponent's monster {z:zone}",
      ({ z }): Fragment => ({
        events: ["BATTLE_START"],
        eventOf: "SELF",
        requires: [
          { is: { cards: { who: "OPPONENT_BATTLING_MONSTER" }, filter: z } },
        ],
      }),
    ],
  ],
  /** What an event needs as well, written right after it. */
  extras: [
    ["{x:extra}", ({ x }) => x],
    ["{x:extra} {rest:extras}", ({ x, rest }) => merge(x, rest)],
  ],
  extra: [
    [", while {c:cond}", ({ c }) => c],
    ["while {c:cond}", ({ c }) => c],
    // "If this card is banished" is its banishment, an event; "while" it is, where it is
    ["while this card is banished", (): Fragment => ({ where: ["REMOVED"] })],
    [", and {c:cond}", ({ c }) => c],
    // Its event can happen in the Damage Step, and it can be activated there
    [", even during the Damage Step", (): Fragment => ({ damageStep: true })],
  ],

  // ---- what happens to cards, as an event ----
  /**
   * What happened, and to what: this card's own event (SELF), or one that happened to any card, which the event's cards
   * must match (ANY). Joined by "or", what happened is one event each, each with what its cards must be.
   */
  event: [
    ["{s:subject} is {h:happenings}", ({ s, h }) => happen(s, h)],
    ["{s:subject} {h:doing}", ({ s, h }) => happen(s, h)],
    // A player's Summon of monsters ("your opponent Special Summons a monster(s)"): a Tribute Summon is a Tribute Set
    // too, unless it says face-up (the scripts of Soul Exchange, Escalation of the Monarchs and others allow one, and
    // those that say "face-up" don't)
    [
      "you {k:summonKinds} Summon {s:some}",
      ({ k, s }) => playerSummons("OWN", k, s),
    ],
    [
      "your opponent {k:summonKinds} Summons {s:some}",
      ({ k, s }) => playerSummons("OPPONENT", k, s),
    ],
    [
      "your opponent {k:summonKinds} Summons {s:some} ( s )",
      ({ k, s }) => playerSummons("OPPONENT", k, s),
    ],
    [
      "your opponent {k:summonKinds} Summons {s:some} ( s ) from the {l:placeList}",
      ({ k, s, l }) =>
        playerSummons("OPPONENT", withCard(k, { summonedFrom: l.places }), s),
    ],
    // An activation: the chain link it makes is what it must be
    [
      "{c:chainEvent}",
      ({ c }): Fragment => ({
        events: ["CHAINING"],
        eventOf: "ANY",
        requires: c,
      }),
    ],
    [
      "this card's effect destroys a monster",
      (): Fragment => ({
        events: ["DESTROYED"],
        eventOf: "ANY",
        requires: [
          { same: [{ who: "CHAIN_LINK_CARD" }, THIS] },
          { eventCards: { count: 1, card: { types: ["MONSTER"] } } },
        ],
      }),
    ],
  ],
  /** What an event happened to. */
  subject: [
    ["this card", (): Subject => ({ self: true, card: {} })],
    // Where it was, and what it was, as it happened
    [
      "this face-up card",
      (): Subject => ({ self: true, card: { wasPositions: ["FACEUP"] } }),
    ],
    [
      "this Set card",
      (): Subject => ({ self: true, card: { wasPositions: ["FACEDOWN"] } }),
    ],
    [
      "this card in your possession",
      (): Subject => ({ self: true, card: { wasController: "OWN" } }),
    ],
    [
      "this card in the Monster Zone",
      (): Subject => ({ self: true, card: { wasIn: ["MZONE"] } }),
    ],
    [
      "this card on the field",
      (): Subject => ({ self: true, card: { wasIn: ["ONFIELD"] } }),
    ],
    [
      "this card in your hand",
      (): Subject => ({ self: true, card: { wasIn: ["HAND"] } }),
    ],
    [
      "this {f:frame} Summoned card",
      ({ f }): Subject => ({
        self: true,
        card: { summonedBy: [f] },
        monster: true,
      }),
    ],
    ["{s:some}", ({ s }) => anyCard(s.noun)],
    ["{s:some} ( s )", ({ s }) => anyCard(s.noun)],
    // "you control": on its controller's field when it happened
    ["{s:some} you control", ({ s }) => anyCard(s.noun, "OWN")],
    ["{s:some} ( s ) you control", ({ s }) => anyCard(s.noun, "OWN")],
    ["{s:some} your opponent controls", ({ s }) => anyCard(s.noun, "OPPONENT")],
    [
      "{s:some} ( s ) your opponent controls",
      ({ s }) => anyCard(s.noun, "OPPONENT"),
    ],
    ["your {x:noun}", ({ x }) => anyCard(x, "OWN")],
    ["an opponent's {x:noun}", ({ x }) => anyCard(x, "OPPONENT")],
    ["your opponent's {x:noun}", ({ x }) => anyCard(x, "OPPONENT")],
  ],
  /** What happened to it, one event or several joined by "or". */
  happenings: [
    ["{h:happening}", ({ h }) => h],
    ["{a:happening} or {b:happening}", ({ a, b }) => [...a, ...b]],
    ["{a:happening} , or {b:happening}", ({ a, b }) => [...a, ...b]],
  ],
  happening: [
    // Summons: only monsters are Summoned, so "monster" says nothing; "Summoned" alone is any Summon
    ["{k:summonKinds} Summoned", ({ k }) => k],
    [
      "Summoned",
      (): Happening => [
        summoned("SUMMON_SUCCESS"),
        summoned("FLIP_SUMMON_SUCCESS"),
        summoned("SPSUMMON_SUCCESS"),
      ],
    ],
    [
      "{k:summonKinds} Summoned from the {l:placeList}",
      ({ k, l }) => withCard(k, { summonedFrom: l.places }),
    ],
    [
      "{k:summonKinds} Summoned from your {l:placeList}",
      ({ k, l }) => withCard(k, { summonedFrom: l.places }),
    ],
    [
      "{k:summonKinds} Summoned to the center Main Monster Zone",
      ({ k }) => withCard(k, center()),
    ],
    [
      "{k:summonKinds} Summoned to your field",
      ({ k }) => withCard(k, { controller: "OWN" }),
    ],
    [
      "{k:summonKinds} Summoned using {s:some}",
      ({ k, s }) =>
        withRequires(k, materialsInclude(withoutMonster(s.noun.card))),
    ],
    [
      "{k:summonKinds} Summoned using {s:some} as material",
      ({ k, s }) =>
        withRequires(k, materialsInclude(withoutMonster(s.noun.card))),
    ],
    // To the GY, banished, to the hand or Deck
    ["sent to the GY", (): Happening => [{ event: "TO_GRAVE", leaves: true }]],
    // A card goes to its owner's GY: the opponent's cards
    [
      "sent to your opponent's GY",
      (): Happening => [
        { event: "TO_GRAVE", card: { controller: "OPPONENT" }, leaves: true },
      ],
    ],
    [
      "sent from the field to the GY",
      (): Happening => [
        { event: "TO_GRAVE", card: { wasIn: ["ONFIELD"] }, leaves: true },
      ],
    ],
    [
      "sent from the {l:placeList} to the GY",
      ({ l }): Happening => [
        { event: "TO_GRAVE", card: { wasIn: l.places }, leaves: true },
      ],
    ],
    [
      "sent from your {l:placeList} to the GY",
      ({ l }): Happening => [
        { event: "TO_GRAVE", card: { wasIn: l.places }, leaves: true },
      ],
    ],
    [
      "sent to the GY , except from the field",
      (): Happening => [
        { event: "TO_GRAVE", unless: { wasIn: ["ONFIELD"] }, leaves: true },
      ],
    ],
    [
      "sent to the GY as {f:frame} Material",
      ({ f }): Happening => [
        { event: "BE_MATERIAL", card: { places: ["GRAVE"], reasons: [f] } },
      ],
    ],
    [
      "sent to the GY as material for a {f:frame} Summon",
      ({ f }): Happening => [
        { event: "BE_MATERIAL", card: { places: ["GRAVE"], reasons: [f] } },
      ],
    ],
    [
      "used as {f:frame} Material",
      ({ f }): Happening => [{ event: "BE_MATERIAL", card: { reasons: [f] } }],
    ],
    [
      "used as material for a {f:frame} Summon",
      ({ f }): Happening => [{ event: "BE_MATERIAL", card: { reasons: [f] } }],
    ],
    [
      "discarded",
      (): Happening => [{ event: "TO_GRAVE", card: { reasons: ["DISCARD"] } }],
    ],
    ["banished", (): Happening => [{ event: "REMOVE", leaves: true }]],
    [
      "banished face-up",
      (): Happening => [
        { event: "REMOVE", card: { states: ["FACEUP"] }, leaves: true },
      ],
    ],
    [
      "added to your hand",
      (): Happening => [{ event: "TO_HAND", leaves: true }],
    ],
    [
      "added to your hand , except by drawing it",
      (): Happening => [
        { event: "TO_HAND", unless: { reasons: ["DRAW"] }, leaves: true },
      ],
    ],
    [
      "added from the {l:placeList} to your hand",
      ({ l }): Happening => [
        { event: "TO_HAND", card: { wasIn: l.places }, leaves: true },
      ],
    ],
    [
      "added from your {l:placeList} to your hand",
      ({ l }): Happening => [
        { event: "TO_HAND", card: { wasIn: l.places }, leaves: true },
      ],
    ],
    [
      "added from the {l:placeList} to your opponent's hand",
      ({ l }): Happening => [
        {
          event: "TO_HAND",
          card: { wasIn: l.places, controller: "OPPONENT" },
          leaves: true,
        },
      ],
    ],
    [
      "returned to the hand",
      (): Happening => [
        { event: "TO_HAND", card: { wasIn: ["ONFIELD"] }, leaves: true },
      ],
    ],
    [
      "added to your Extra Deck face-up",
      (): Happening => [
        {
          event: "TO_DECK",
          card: { places: ["EXTRA"], states: ["FACEUP"] },
          leaves: true,
        },
      ],
    ],
    [
      "shuffled into the Deck",
      (): Happening => [{ event: "TO_DECK", leaves: true }],
    ],
    // Destroyed: by battle in the Damage Step, where an effect on it can be activated
    ["destroyed", (): Happening => [{ event: "DESTROYED", leaves: true }]],
    // Destroyed by battle is an event of the battle's, which happens in the Damage Step
    [
      "destroyed by battle",
      (): Happening => [{ event: "BATTLE_DESTROYED", leaves: true }],
    ],
    [
      "destroyed by card effect",
      (): Happening => [destroyed({ reasons: ["EFFECT"] })],
    ],
    [
      "destroyed by a card effect",
      (): Happening => [destroyed({ reasons: ["EFFECT"] })],
    ],
    [
      "destroyed by your opponent's card effect",
      (): Happening => [
        destroyed({ reasons: ["EFFECT"], reasonPlayer: "OPPONENT" }),
      ],
    ],
    [
      "destroyed by an opponent's card effect",
      (): Happening => [
        destroyed({ reasons: ["EFFECT"], reasonPlayer: "OPPONENT" }),
      ],
    ],
    [
      "destroyed by battle or card effect",
      (): Happening => [destroyed({ reasons: ["BATTLE", "EFFECT"] }, true)],
    ],
    ...[
      "destroyed by battle or an opponent's card effect",
      "destroyed by battle or your opponent's card effect",
    ].map(
      (words): Pattern => [
        words,
        (): Happening => [
          destroyed(
            {
              anyOf: [
                { reasons: ["BATTLE"] },
                { reasons: ["EFFECT"], reasonPlayer: "OPPONENT" },
              ],
            },
            true,
          ),
        ],
      ],
    ),
    [
      "destroyed and sent to the GY",
      (): Happening => [
        { event: "TO_GRAVE", card: { reasons: ["DESTROY"] }, leaves: true },
      ],
    ],
    [
      "destroyed by battle and sent to the GY",
      (): Happening => [
        {
          event: "BATTLE_DESTROYED",
          card: { places: ["GRAVE"] },
          leaves: true,
        },
      ],
    ],
    // Tributed
    ["Tributed", (): Happening => [{ event: "RELEASE", leaves: true }]],
    [
      "Tributed and added to the Extra Deck face-up",
      (): Happening => [
        {
          event: "TO_DECK",
          card: { reasons: ["RELEASE"], places: ["EXTRA"], states: ["FACEUP"] },
          leaves: true,
        },
      ],
    ],
    ["flipped face-up", (): Happening => [{ event: "FLIP" }]],
    [
      "targeted for an attack",
      (): Happening => [{ event: "BE_BATTLE_TARGET" }],
    ],
    ["attacked", (): Happening => [{ event: "BE_BATTLE_TARGET" }]],
  ],
  /** What a card did, as an event. */
  doing: [
    [
      "leaves the field",
      (): Happening => [{ event: "LEAVE_FIELD", leaves: true }],
    ],
    // An attack declaration names its attacker, a monster
    ["declares an attack", (): Happening => [attack()]],
    ["attacks", (): Happening => [attack()]],
    [
      "declares a direct attack",
      (): Happening => [
        attack([{ not: { exists: { who: "ATTACK_TARGET" } } }]),
      ],
    ],
    [
      "destroys a monster by battle",
      (): Happening => [{ event: "BATTLE_DESTROYING" }],
    ],
    [
      "destroys an opponent's monster by battle",
      (): Happening => [
        {
          event: "BATTLE_DESTROYING",
          ownOnly: true,
          requires: [battleTarget({ wasController: "OPPONENT" })],
        },
      ],
    ],
    [
      "destroys a monster by battle and sends it to the GY",
      (): Happening => [
        {
          event: "BATTLE_DESTROYING",
          ownOnly: true,
          requires: [battleTarget({ places: ["GRAVE"] })],
        },
      ],
    ],
    [
      "destroys an opponent's monster by battle and sends it to the GY",
      (): Happening => [
        {
          event: "BATTLE_DESTROYING",
          ownOnly: true,
          requires: [
            battleTarget({ wasController: "OPPONENT", places: ["GRAVE"] }),
          ],
        },
      ],
    ],
    [
      "inflicts battle damage to your opponent",
      (): Happening => [
        {
          event: "BATTLE_DAMAGE",
          requires: [{ player: { which: "EVENT", is: "OPPONENT" } }],
        },
      ],
    ],
  ],
  /** The kinds of Summon an event says, each its event and what the Summoned monster must be. */
  summonKinds: [
    ["{a:summonKind}", ({ a }) => a],
    ["{a:summonKind} or {b:summonKind}", ({ a, b }) => [...a, ...b]],
    [
      "{a:summonKind} , {b:summonKind} , or {c:summonKind}",
      ({ a, b, c }) => [...a, ...b, ...c],
    ],
  ],
  summonKind: [
    ["Normal", (): Happening => [summoned("SUMMON_SUCCESS")]],
    ["Flip", (): Happening => [summoned("FLIP_SUMMON_SUCCESS")]],
    ["Special", (): Happening => [summoned("SPSUMMON_SUCCESS")]],
    // A Tribute Summon is a Normal Summon, Summoned face-up (a Tribute Set isn't "Summoned")
    ["Tribute", (): Happening => [summoned("SUMMON_SUCCESS", "ADVANCE")]],
    ["{f:frame}", ({ f }): Happening => [summoned("SPSUMMON_SUCCESS", f)]],
  ],
  /** An activation, for "When ... (Quick Effect)": what it must be. */
  chainEvent: [
    [
      "your opponent activates a card or effect",
      (): Condition[] => [OPPONENT_ACTIVATED],
    ],
    [
      "your opponent activates a monster effect",
      (): Condition[] => [
        OPPONENT_ACTIVATED,
        { chainLink: { types: ["MONSTER"] } },
      ],
    ],
    [
      "your opponent activates a monster effect on the {l:placeList}",
      ({ l }): Condition[] => [
        OPPONENT_ACTIVATED,
        { chainLink: { types: ["MONSTER"], from: l.places } },
      ],
    ],
    [
      "your opponent activates a card effect in the {l:placeList}",
      ({ l }): Condition[] => [
        OPPONENT_ACTIVATED,
        { chainLink: { from: l.places } },
      ],
    ],
    [
      "your opponent activates a Spell / Trap Card or effect",
      (): Condition[] => [
        OPPONENT_ACTIVATED,
        { chainLink: { types: ["SPELL", "TRAP"] } },
      ],
    ],
    [
      "your opponent activates a card or effect on the field",
      (): Condition[] => [
        OPPONENT_ACTIVATED,
        { chainLink: { from: ["ONFIELD"] } },
      ],
    ],
    [
      "an opponent's monster activates its effect",
      (): Condition[] => [
        OPPONENT_ACTIVATED,
        { chainLink: { types: ["MONSTER"] } },
      ],
    ],
    [
      "a monster your opponent controls activates its effect",
      (): Condition[] => [
        OPPONENT_ACTIVATED,
        { chainLink: { types: ["MONSTER"], from: ["MZONE"] } },
      ],
    ],
    [
      "a monster on the field activates its effect , or when a Spell / Trap that is already face-up on the field activates its effect",
      (): Condition[] => [
        {
          any: [
            { chainLink: { types: ["MONSTER"], from: ["MZONE"] } },
            {
              all: [
                { chainLink: { types: ["SPELL", "TRAP"], from: ["ONFIELD"] } },
                { not: { chainLink: { effectTypes: ["ACTIVATE"] } } },
              ],
            },
          ],
        },
      ],
    ],
    [
      "{s:some} activates its effect on the field",
      ({ s }): Condition[] => [
        { chainLink: { types: ["MONSTER"], from: ["MZONE"] } },
        {
          is: {
            cards: { who: "CHAIN_LINK_CARD" },
            filter: withoutMonster(s.noun.card),
          },
        },
      ],
    ],
    [
      "a monster effect is activated that targets {p:pick} ( and no other cards )",
      ({ p }): Condition[] => [
        { chainLink: { types: ["MONSTER"], flags: ["CARD_TARGET"] } },
        {
          compare: {
            value: { countOf: { cards: { who: "CHAIN_LINK_TARGETS" } } },
            is: "EQUAL",
            to: p.count.max,
          },
        },
        {
          is: {
            cards: { who: "CHAIN_LINK_TARGETS" },
            filter: {
              places: [...new Set(Object.values(p.from).flat())],
              ...p.card,
            },
          },
        },
      ],
    ],
    [
      "a card or effect is activated in response to another card or effect activation",
      (): Condition[] => [{ chainLink: { link: "PREVIOUS", exists: true } }],
    ],
  ],

  // ---- conditions ----
  /** One condition, or two joined by \"and\" (\"your opponent controls a monster and you control no monsters\"). */
  condition: [
    ["{c:cond}", ({ c }) => c],
    ["{a:cond} and {b:cond}", ({ a, b }) => merge(a, b)],
  ],
  cond: [
    [
      "you control {s:some}",
      ({ s }): Fragment => requires(control(s.noun, FIELD("OWN"))),
    ],
    [
      "you control {p:pick}",
      ({ p }): Fragment =>
        requires({
          atLeast: 1,
          of: {
            matching: {
              count: 1,
              from: p.from,
              card: p.card,
              targetable: false,
            },
          },
        }),
    ],
    [
      "you control no {x:noun}",
      ({ x }): Fragment => requires({ not: control(x, FIELD("OWN")) }),
    ],
    [
      "you control {n:number} or more {x:noun2}",
      ({ n, x }): Fragment => requires(control(x, FIELD("OWN"), n)),
    ],
    // The opponent's side, as \"you control\" is for the player's own
    [
      "your opponent controls {s:some}",
      ({ s }): Fragment | undefined =>
        s.count === "ALL"
          ? undefined
          : requires(control(s.noun, FIELD("OPPONENT"), s.count.min)),
    ],
    [
      "your opponent controls {n:number} or more {x:noun2}",
      ({ n, x }): Fragment => requires(control(x, FIELD("OPPONENT"), n)),
    ],
    [
      "your opponent controls no {x:noun}",
      ({ x }): Fragment => requires({ not: control(x, FIELD("OPPONENT")) }),
    ],
    // Only one side has them
    [
      "only your opponent controls {s:some}",
      ({ s }): Fragment | undefined =>
        s.count === "ALL"
          ? undefined
          : requires(control(s.noun, FIELD("OPPONENT"), s.count.min), {
              not: control(s.noun, FIELD("OWN")),
            }),
    ],
    [
      "your opponent controls more {x:noun} than you do",
      ({ x }): Fragment =>
        requires({
          compare: {
            value: countOf(x, FIELD("OPPONENT")),
            is: "MORE",
            to: countOf(x, FIELD("OWN")),
          },
        }),
    ],
    [
      "this card is in the center Main Monster Zone",
      (): Fragment => requires(thisIs(center())),
    ],
    [
      "in the center Main Monster Zone",
      (): Fragment => requires(thisIs(center())),
    ],
    [
      "this card is in your {l:placeList}",
      ({ l }): Fragment => ({ where: l.places }),
    ],
    [
      "this card is in your {l:placeList} , except the turn it was sent there",
      ({ l }): Fragment => ({
        where: l.places,
        requires: [{ not: thisIs({ states: ["ARRIVED_THIS_TURN"] }) }],
      }),
    ],
    [
      "this card is on the field or in the GY",
      (): Fragment => ({ where: ["ONFIELD", "GRAVE"] }),
    ],
    // Where this card is, without it: "This card's name becomes "Dark Magician" while on the field or in the GY"
    ["{h:here}", ({ h }): Fragment => ({ where: h })],
    ["it is {h:here}", ({ h }): Fragment => ({ where: h })],
    // A Continuous Trap is in a Spell & Trap Zone
    [
      "this card is a Continuous Trap",
      (): Fragment => ({
        where: ["SZONE"],
        requires: [thisIs({ allTypes: ["CONTINUOUS", "TRAP"] })],
      }),
    ],
    [
      "this {f:frame} Summoned monster is on the field",
      ({ f }): Fragment => requires(summonedBy(f)),
    ],
    [
      "you have no card in your other Pendulum Zone",
      (): Fragment =>
        requires({
          not: control(
            { card: { states: ["NOT_SELF"] }, monster: false },
            where("OWN", ["PZONE"]),
          ),
        }),
    ],
    // Each time, once: a monster Summoned twice is two
    [
      "your opponent Normal or Special Summoned {n:number} or more monsters this turn",
      ({ n }): Fragment =>
        requires({
          atLeast: n,
          of: {
            cards: happened(["SUMMON_SUCCESS", "SPSUMMON_SUCCESS"], {
              summonedByPlayer: "OPPONENT",
            }),
          },
        }),
    ],
    [
      "{a:amount} is more than {b:amount}",
      ({ a, b }): Fragment =>
        requires({ compare: { value: a, is: "MORE", to: b } }),
    ],
    [
      "{s:some} is on the field",
      ({ s }): Fragment => requires(control(s.noun, FIELD("BOTH"))),
    ],
    [
      "{s:some} is in your GY",
      ({ s }): Fragment => requires(control(s.noun, where("OWN", ["GRAVE"]))),
    ],
    [
      "you have {s:some} in your GY",
      ({ s }): Fragment => requires(control(s.noun, where("OWN", ["GRAVE"]))),
    ],
    // A face-down monster doesn't show its Type
    [
      "you have {n:number} or more different Monster Types on your field",
      ({ n }): Fragment =>
        requires({
          atLeast: n,
          of: {
            different: {
              cards: {
                all: { from: { own: ["MZONE"] }, card: { states: ["FACEUP"] } },
              },
              by: "RACE",
            },
          },
        }),
    ],
    [
      "this card has {s:some} as material",
      ({ s }): Fragment => requires(hasMaterial(s)),
    ],
    [
      "the detached material was {s:some}",
      ({ s }): Fragment =>
        requires({
          is: { cards: backTo("DETACH"), filter: withoutMonster(s.noun.card) },
        }),
    ],
    [
      "you control this Normal Summoned / Set card",
      (): Fragment => requires(summonedBy("NORMAL")),
    ],
  ],
  /** Where this card is, said without it. */
  here: [
    ["on the field", (): Place[] => ["ONFIELD"]],
    ["in the {l:placeList}", ({ l }): Place[] => l.places],
    ["in the Monster Zone", (): Place[] => ["MZONE"]],
    ["in the Field Zone", (): Place[] => ["FZONE"]],
    ["on the field or in the GY", (): Place[] => ["ONFIELD", "GRAVE"]],
    ["in the hand or on the field", (): Place[] => ["HAND", "ONFIELD"]],
  ],
};
