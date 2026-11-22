import assert from "node:assert/strict";
import { test } from "node:test";
import { Reader } from "../src/builders/EnglishReader/engine.js";
import { GRAMMAR } from "../src/builders/EnglishReader/grammar.js";
import { konamiReader } from "../src/builders/EnglishReader/konamiReader.js";
import type { Draft } from "../src/builders/EnglishReader/phrases.js";
import type { Applied } from "../src/lib/cardSchema.js";
import { openLibrary } from "../src/lib/library.js";
import { readingWith } from "../src/lib/ruled.js";

const library = await openLibrary();
const reader = new Reader(GRAMMAR);

/**
 * What one sentence of a card's text applies, read as an effect with the rulings that hold: for cards whose other
 * sentences don't read yet ("This effect cannot be negated.", a Gemini monster's reminder). Names are written as the
 * names stage replaces them ({a#0x2b}: the "Ninja" archetype).
 */
function applies(sentence: string): Applied[] {
  const reading = readingWith(library.rulings, () => reader.read<Draft>("effect", sentence));
  assert.ok("value" in reading, `${sentence}: ${"reason" in reading ? reading.reason : ""}`);
  assert.equal(reading.value.kind, "CONTINUOUS");
  // Tags of what the rulings gave are for test/rulings.test.ts
  return JSON.parse(JSON.stringify(reading.value.applies), (key, value) =>
    key === "$ruled" ? undefined : value,
  );
}
/** A card's effects that apply one of these EFFECT_s, with their kind and where they work. */
function ruled(code: number, ...effects: string[]) {
  return konamiReader(library, code, "test")
    .effects!.filter((effect) => effect.applies?.some((a) => effects.includes(a.effect)))
    .map(({ kind, from, applies }) => ({ kind, from, applies }));
}

// ---- "The first time ... would be destroyed, it is not destroyed" ----

test('"The first time this card would be destroyed by battle each turn" is a count given back each turn', () => {
  // Dream Shark's first sentence
  assert.deepEqual(
    applies("The first time this card would be destroyed by battle each turn, it is not destroyed."),
    [
      {
        effect: "INDESTRUCTABLE_COUNT",
        to: "THIS_CARD",
        value: 1,
        requires: [{ reasons: ["BATTLE"] }],
      },
    ],
  );
  // Dark Resonator says only that, and reads whole
  assert.deepEqual(ruled(97021916, "INDESTRUCTABLE_COUNT"), [
    {
      kind: "CONTINUOUS",
      from: ["MZONE"],
      applies: [
        {
          effect: "INDESTRUCTABLE_COUNT",
          to: "THIS_CARD",
          value: 1,
          requires: [{ reasons: ["BATTLE"] }],
        },
      ],
    },
  ]);
});

test('"The first time" with no turn is never given back (noTurnReset), as Empty Machine\'s script sets NO_TURN_RESET', () => {
  assert.deepEqual(
    applies(
      "The first time this face-up card on the field would be destroyed by an opponent's card effect, it is not destroyed.",
    ),
    [
      {
        effect: "INDESTRUCTABLE_COUNT",
        to: "THIS_CARD",
        value: 1,
        requires: [{ reasons: ["EFFECT"] }, { player: { which: "REASON", is: "OPPONENT" } }],
        noTurnReset: true,
      },
    ],
  );
});

test('"each turn" can come before the cause or the whole sentence, and "each X" reaches every one in its places', () => {
  const each = {
    effect: "INDESTRUCTABLE_COUNT",
    to: { places: { own: ["MZONE"] } },
    cards: { archetypes: [0x128], states: ["FACEUP"] },
    value: 1,
  };
  // Witchcrafter Bystreet
  assert.deepEqual(
    applies(
      "The first time each {a#0x128} monster you control would be destroyed each turn, by battle or card effect, it is not destroyed.",
    ),
    [{ ...each, requires: [{ reasons: ["BATTLE", "EFFECT"] }] }],
  );
  assert.deepEqual(
    applies("Each turn, the first time this card would be destroyed by battle, it is not destroyed."),
    applies("The first time this card would be destroyed by battle each turn, it is not destroyed."),
  );
  // Either cause: battle, or an opponent's card effect
  assert.deepEqual(
    applies(
      "The first time this card would be destroyed by battle or an opponent's card effect each turn, it is not destroyed.",
    )[0].requires,
    [
      {
        any: [
          { reasons: ["BATTLE"] },
          { all: [{ reasons: ["EFFECT"] }, { player: { which: "REASON", is: "OPPONENT" } }] },
        ],
      },
    ],
  );
});

// ---- the cards a Link Monster points to ----

test("the monsters this card points to are on either field (Space Insulator)", () => {
  const pointed = {
    to: { places: { own: ["MZONE"], opponent: ["MZONE"] } },
    cards: { states: ["LINKED_TO_THIS"] },
  };
  assert.deepEqual(applies("Monsters this card points to lose 800 ATK/DEF."), [
    { effect: "UPDATE_ATTACK", ...pointed, value: -800 },
    { effect: "UPDATE_DEFENSE", ...pointed, value: -800 },
  ]);
  assert.deepEqual(
    applies(
      "The first time each monster this card points to would be destroyed by battle each turn, it is not destroyed.",
    ),
    [
      {
        effect: "INDESTRUCTABLE_COUNT",
        ...pointed,
        value: 1,
        requires: [{ reasons: ["BATTLE"] }],
      },
    ],
  );
});

// ---- battle damage ----

test("no battle damage from attacks involving this card: AVOID_BATTLE_DAMAGE, and NO_BATTLE_DAMAGE for neither player", () => {
  // Amazoness Fighter
  assert.deepEqual(ruled(55821894, "AVOID_BATTLE_DAMAGE"), [
    {
      kind: "CONTINUOUS",
      from: ["MZONE"],
      applies: [{ effect: "AVOID_BATTLE_DAMAGE", to: "THIS_CARD", value: 1 }],
    },
  ]);
  assert.deepEqual(
    applies("Neither player takes any battle damage from attacks involving this card."),
    [
      { effect: "AVOID_BATTLE_DAMAGE", to: "THIS_CARD", value: 1 },
      { effect: "NO_BATTLE_DAMAGE", to: "THIS_CARD", value: 1 },
    ],
  );
  // Cubic Dharma: the monsters in places that match
  assert.deepEqual(
    applies("You take no battle damage from attacks involving your {a#0xe3} monsters."),
    [
      {
        effect: "AVOID_BATTLE_DAMAGE",
        to: { places: { own: ["MZONE"] } },
        cards: { archetypes: [0xe3], states: ["FACEUP"] },
        value: 1,
      },
    ],
  );
});

// ---- Summon locks ----

test("a Pendulum Summon lock is a Special Summon lock on Pendulum Summons (Twilight Ninja Kagen)", () => {
  assert.deepEqual(
    applies('You cannot Pendulum Summon monsters, except {a#0x2b} monsters.'),
    [
      {
        effect: "CANNOT_SPECIAL_SUMMON",
        to: { players: "OWN" },
        cards: { none: [{ archetypes: [0x2b] }] },
        requires: [{ summonType: ["PENDULUM"] }],
      },
    ],
  );
  // Odd-Eyes Pendulumgraph Dragon's list of exceptions: any of them
  assert.deepEqual(
    applies(
      "You cannot Pendulum Summon monsters, except {a#0x9f} monsters, {a#0x98} Pendulum Monsters, and {a#0x99} monsters.",
    )[0].cards,
    {
      none: [
        {
          anyOf: [
            { archetypes: [0x9f] },
            { archetypes: [0x98], types: ["PENDULUM"] },
            { archetypes: [0x99] },
          ],
        },
      ],
    },
  );
});

test('"Neither player can Special Summon" is the same lock, on both players (Barrier Statue of the Abyss)', () => {
  assert.deepEqual(ruled(84478195, "CANNOT_SPECIAL_SUMMON"), [
    {
      kind: "CONTINUOUS",
      from: ["MZONE"],
      applies: [
        {
          effect: "CANNOT_SPECIAL_SUMMON",
          to: { players: "BOTH" },
          cards: { none: [{ attributes: ["DARK"] }] },
        },
      ],
    },
  ]);
});

// ---- what a card is treated as, what it can do, what it is unaffected by ----

test("treated as a Normal Monster off the field is a Normal Monster, not an Effect Monster, and unclassified", () => {
  // Dragon Spirit of White: "This card is treated as a Normal Monster while in the hand or GY."
  assert.deepEqual(ruled(45467446, "ADD_TYPE"), [
    {
      kind: "UNCLASSIFIED",
      from: ["HAND", "GRAVE"],
      applies: [
        { effect: "ADD_TYPE", to: "THIS_CARD", value: "TYPE_NORMAL" },
        { effect: "REMOVE_TYPE", to: "THIS_CARD", value: "TYPE_EFFECT" },
      ],
    },
  ]);
});

test("attacking from Defense Position, and immunity to the effects of cards that match", () => {
  assert.deepEqual(applies("This card can attack while in face-up Defense Position."), [
    { effect: "DEFENSE_ATTACK", to: "THIS_CARD", value: 1 },
  ]);
  assert.deepEqual(applies("This card is unaffected by the effects of Xyz Monsters."), [
    {
      effect: "IMMUNE_EFFECT",
      to: "THIS_CARD",
      requires: [{ effect: { card: { types: ["XYZ"] } } }],
    },
  ]);
});
