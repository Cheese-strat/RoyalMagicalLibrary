import assert from "node:assert/strict";
import { test } from "node:test";
import { Reader } from "../src/builders/EnglishReader/engine.js";
import { GRAMMAR } from "../src/builders/EnglishReader/grammar.js";
import { konamiReader } from "../src/builders/EnglishReader/konamiReader.js";
import { TextStop } from "../src/builders/EnglishReader/parts.js";
import type { MoveDraft } from "../src/builders/EnglishReader/phrases.js";
import type { EffectSchema, Move } from "../src/lib/cardSchema.js";
import { openLibrary } from "../src/lib/library.js";
import { readingWith } from "../src/lib/ruled.js";

const library = await openLibrary();
const reader = new Reader(GRAMMAR);

/** A card's effects as read. */
const effects = (code: number): EffectSchema[] =>
  konamiReader(library, code, "test").effects!;
/** The moves of an effect's resolution, part by part. */
const moves = (effect: EffectSchema): Move[][] =>
  effect.does!.map((part) => part.moves!);
/** What some words of a resolution do, read alone with the rulings that hold, before finish.ts resolves their pronouns. */
function read(words: string): MoveDraft[] {
  const reading = readingWith(library.rulings, () =>
    reader.read<MoveDraft[]>("moves", words),
  );
  assert.ok("value" in reading, `${words}: ${"reason" in reading ? reading.reason : ""}`);
  return reading.value;
}

test('"inflict damage to your opponent equal to half its original ATK" is DAMAGE, half the target\'s original ATK, rounded up', () => {
  // Ancient Gear Explosive
  const [effect] = effects(4446672);
  assert.deepEqual(moves(effect)[1], [
    {
      move: "DAMAGE",
      amount: {
        divide: [{ number: "BASE_ATTACK", of: { ref: "TARGET" } }, 2],
        round: "UP",
      },
      player: "OPPONENT",
    },
  ]);
  assert.deepEqual(effect.categories, ["DESTROY", "DAMAGE"]);
});

test('"Gain 1200 LP." and "Inflict 800 damage to your opponent." are GAIN_LP and DAMAGE, RECOVER and DAMAGE', () => {
  // Poison of the Old Man
  const [effect] = effects(8842266);
  assert.deepEqual(moves(effect), [
    [{ move: "GAIN_LP", amount: 1200, player: "OWN" }],
    [{ move: "DAMAGE", amount: 800, player: "OPPONENT" }],
  ]);
  assert.deepEqual(effect.categories, ["DAMAGE", "RECOVER"]);
});

test("life points read with a number, a number for each card counted, or an amount, the same way for each move", () => {
  assert.deepEqual(read("pay 1000 LP"), [
    { move: "PAY_LP", amount: 1000, player: "OWN" },
  ]);
  assert.deepEqual(read("gain 500 LP for each monster you control"), [
    {
      move: "GAIN_LP",
      amount: {
        multiply: [
          500,
          {
            countOf: {
              matching: {
                count: 1,
                from: { own: ["MZONE"] },
                card: {},
                targetable: false,
              },
            },
          },
        ],
      },
      player: "OWN",
    },
  ]);
  assert.deepEqual(read("pay LP equal to its Level x 500"), [
    {
      move: "PAY_LP",
      amount: { multiply: [{ number: "LEVEL", of: { ref: "?back-one" } }, 500] },
      player: "OWN",
    },
  ]);
});

test('", up to the number of" after a target\'s places, with a comma, counts names with "with different names"', () => {
  // Gladiator Beast Charge: "Target face-up cards on the field, up to the number of "Gladiator Beast" monsters you
  // control with different names"
  const [move] = moves(effects(16990348)[0])[0];
  assert.deepEqual(
    { pick: move.pick, count: move.count },
    {
      pick: "TARGETED",
      count: {
        min: 1,
        max: {
          countOf: {
            different: {
              cards: {
                all: {
                  from: { own: ["MZONE"] },
                  card: { archetypes: [4121], states: ["FACEUP"] },
                },
              },
              by: "NAME",
            },
          },
        },
      },
    },
  );
});

test('a pick "with different names" needs as many names among its cards as it has cards', () => {
  // Colonel on C-String: "Special Summon 2 Level 4 or lower Warrior monsters with different names from your hand"
  const [move] = moves(effects(54656181)[0])[0];
  assert.deepEqual(move.count, { min: 2, max: 2 });
  assert.deepEqual(move.pickRequires, [
    {
      compare: {
        value: { countOf: { different: { cards: { ref: "CHOSEN1" }, by: "NAME" } } },
        is: "EQUAL",
        to: { countOf: { cards: { ref: "CHOSEN1" } } },
      },
    },
  ]);
});

test('targets in two groups ("1 X you control and 1 card your opponent controls") are one pick, each group\'s count among it', () => {
  // Graydle Impact
  const [move] = moves(effects(2759860)[1])[0];
  const mine = {
    states: ["NOT_SELF", "FACEUP"],
    archetypes: [209],
    places: ["ONFIELD"],
    controller: "OWN",
  };
  const theirs = { places: ["ONFIELD"], controller: "OPPONENT" };
  assert.deepEqual(move, {
    move: "DESTROY",
    cards: { ref: "TARGET" },
    pick: "TARGETED",
    count: { min: 2, max: 2 },
    card: { anyOf: [mine, theirs] },
    from: { own: ["ONFIELD"], opponent: ["ONFIELD"] },
    pickRequires: [
      { atLeast: 1, of: { among: { cards: { ref: "TARGET" }, card: mine } } },
      { atLeast: 1, of: { among: { cards: { ref: "TARGET" }, card: theirs } } },
    ],
  });
});

test('"change all monsters your opponent controls to face-down Defense Position" is CHANGE_POSITION, a POSITION', () => {
  // Floowandereeze and the Dreaming Town
  const effect = effects(41215808)[1];
  assert.deepEqual(moves(effect)[0][0].position, ["FACEDOWN_DEFENSE"]);
  assert.deepEqual(effect.categories, ["POSITION"]);
  assert.deepEqual(read("change it to face-up Defense Position"), [
    { move: "CHANGE_POSITION", cards: { ref: "?back-one" }, position: ["FACEUP_DEFENSE"] },
  ]);
});

test('"send the top 3 cards of your Deck to the GY" takes the Deck\'s top cards: TOGRAVE and DECKDES', () => {
  // Laundry Dragonmaid
  const effect = effects(13171876)[0];
  assert.deepEqual(moves(effect)[0], [
    {
      move: "TO_GRAVE",
      cards: { ref: "DECK_TOP1" },
      pick: "DECK_TOP",
      count: { min: 3, max: 3 },
      card: {},
      from: { own: ["DECK"] },
    },
  ]);
  assert.deepEqual(effect.categories, ["TOGRAVE", "DECKDES"]);
});

test('"attach X to Y as material" is ATTACH, to a card mentioned before, as "equip X to Y" is', () => {
  // Starring Knight: "Special Summon this card, and if you do, attach that monster to this card as material"
  const [move] = moves(effects(5916510)[1])[1];
  assert.deepEqual([move.move, move.cards, move.to], [
    "ATTACH",
    { ref: "TARGET" },
    { who: "THIS_CARD" },
  ]);
  assert.deepEqual(read("attach this card to it as material"), [
    { move: "ATTACH", cards: { who: "THIS_CARD" }, to: { ref: "?back-one" } },
  ]);
});

test('"Set 1 X directly from your Deck, but it cannot be activated this turn" Sets from the Deck, then gives the card CANNOT_TRIGGER', () => {
  const [set, lock] = read(
    "Set 1 {a#0xd0} Spell/Trap directly from your Deck, but it cannot be activated this turn",
  );
  assert.deepEqual(
    [set.move, set.picked?.from, set.picked?.card],
    ["SET", { own: ["DECK"] }, { archetypes: [0xd0], types: ["SPELL", "TRAP"] }],
  );
  assert.deepEqual(
    [lock.move, lock.effect?.applies, lock.until],
    [
      "GIVE_EFFECT",
      [{ effect: "CANNOT_TRIGGER", to: "THIS_CARD" }],
      ["LEAVES_FIELD_OR_FLIPS", "END_PHASE"],
    ],
  );
});

test('the cards an excavation leaves are the excavated cards still in the Deck: "also place the rest on the bottom of the Deck"', () => {
  // Adamancipator Conductor
  const [excavate, summon, rest] = moves(effects(24925387)[1]);
  assert.deepEqual(excavate[0].pick, "DECK_TOP");
  assert.deepEqual(summon[0].card?.among, [{ ref: "DECK_TOP1" }]);
  assert.deepEqual(rest, [
    {
      move: "TO_DECK",
      cards: { ref: "ALL1" },
      pick: "ALL",
      count: "ALL",
      card: { among: [{ ref: "DECK_TOP1" }] },
      from: { own: ["DECK"], opponent: ["DECK"] },
      deckPlace: ["DECKBOT"],
    },
  ]);
});

test('Kewl Tune Cue\'s "also for the rest of this turn you cannot Special Summon, except Tuners" reads without a comma', () => {
  assert.deepEqual(
    read("for the rest of this turn you cannot Special Summon, except Tuners"),
    read("for the rest of this turn, you cannot Special Summon, except Tuners"),
  );
  const [lock] = read("for the rest of this turn you cannot Special Summon, except Tuners");
  assert.deepEqual(lock.effect?.applies, [
    {
      effect: "CANNOT_SPECIAL_SUMMON",
      to: { players: "OWN" },
      cards: { none: [{ types: ["TUNER"] }] },
    },
  ]);
  // The card still stops, but at its excavation's "the top or bottom of the Deck", past the lock
  try {
    konamiReader(library, 16387555, "test");
    assert.fail("Kewl Tune Cue reads");
  } catch (error) {
    assert.ok(error instanceof TextStop);
    const text = error.parts[error.part].replaced!;
    assert.ok(error.at > text.indexOf("sent to the GY as Synchro Material"));
  }
});
