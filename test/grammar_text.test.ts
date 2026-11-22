/** Task 3 of GRAMMAR_TASK.md: Summon procedures (Rank-Up, Contact Fusion), material restrictions and "activate up to N" limits. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { Reader } from "../src/builders/EnglishReader/engine.js";
import { GRAMMAR } from "../src/builders/EnglishReader/grammar.js";
import { konamiReader } from "../src/builders/EnglishReader/konamiReader.js";
import type { Sentence } from "../src/builders/EnglishReader/phrases.js";
import type { AboveDraft } from "../src/builders/EnglishReader/grammar/text.js";
import { openLibrary } from "../src/lib/library.js";
import { readingWith } from "../src/lib/ruled.js";

// The library loads the rulings the grammar's meanings ask about
const library = await openLibrary();
const grammar = new Reader(GRAMMAR);
/** A phrase of a kind read alone, with the rulings a card is read with. */
const reader = {
  read: <T>(kind: string, text: string) =>
    readingWith(library.rulings, () => grammar.read<T>(kind, text)),
};
const read = (code: number) => konamiReader(library, code, "test");
/** A text's sentences, read alone (names written as the names stage writes them: {#code}, {a#0xsetcode}). */
const sentences = (text: string): Sentence[] => {
  const reading = reader.read<Sentence[]>("text", text);
  assert.ok("value" in reading, `doesn't read: ${JSON.stringify(reading)}`);
  return reading.value;
};
const MATERIALS = { who: "SUMMON_MATERIALS", of: { who: "THIS_CARD" } };
const one = { min: 1, max: 1 };

test('Rank-Up: "You can also Xyz Summon this card by using 1 monster you control" is an Xyz Summon of its own, no effect', () => {
  // Gaia Dragon, the Thunder Charger: its materials line's Xyz Summon, then its own by 1 Rank 5 or 6 Xyz Monster
  const [line, rankUp] = read(91949988).summons!;
  assert.equal(line.method, "XYZ");
  assert.deepEqual(rankUp, {
    method: "XYZ",
    kind: "CONDITION",
    from: ["EXTRA"],
    materials: [
      {
        count: one,
        role: "ANY",
        card: { types: ["XYZ"], numbers: { RANK: { is: [5, 6] } } },
      },
    ],
  });
});

test('Rank-Up: "Once per turn, you can also Xyz Summon X" is by name and an oath, counted before the limits printed after it', () => {
  // DoomZ XIII Over - Graflareio
  const card = read(65848113);
  assert.deepEqual(card.summons![1].limit, {
    count: 1,
    per: "TURN",
    shared: "NAME",
    oath: true,
    counter: 0,
  });
  assert.deepEqual(
    card.effects!.map((effect) => effect.limit?.counter),
    [1, 2],
  );
});

test("Rank-Up: what it costs besides its material, and its material's checks after \"you control\"", () => {
  const [{ summon }] = sentences(
    "You can also Xyz Summon this card by discarding 1 Spell , and using 1 Rank 4 Xyz Monster you control with 2 or more materials as material . ( Transfer its materials to this card . )",
  );
  assert.equal(summon!.kind, "CONDITION");
  assert.deepEqual(
    summon!.cost!.map((move) => move.move),
    ["DISCARD"],
  );
  assert.deepEqual(summon!.materials![0].card, {
    types: ["XYZ"],
    numbers: { RANK: { is: [4] }, MATERIALS: { min: 2 } },
  });
  // Only 1 monster: "2 Xyz Monsters" is no Rank-Up
  assert.ok(
    !(
      "value" in
      reader.read(
        "text",
        "You can also Xyz Summon this card by using 2 Xyz Monsters you control .",
      )
    ),
  );
});

test('Contact Fusion: "the above cards" are the materials line\'s, which then Fusion Summon nothing, and the procedure moves them', () => {
  // XY-Dragon Cannon: "Must first be Special Summoned (from your Extra Deck) by banishing the above cards you control."
  const [procedure, ...rest] = read(2111707).summons!;
  assert.deepEqual(rest, []);
  assert.deepEqual(
    { ...procedure, materials: undefined },
    {
      method: "PROCEDURE",
      kind: "CONDITION",
      from: ["EXTRA"],
      cost: [{ move: "BANISH", cards: MATERIALS }],
      materials: undefined,
    },
  );
  assert.deepEqual(
    procedure.materials!.map(({ count, card }) => [
      count,
      card.names,
      card.places,
      card.controller,
    ]),
    [
      [one, [62651957], ["ONFIELD"], "OWN"],
      [one, [65622692], ["ONFIELD"], "OWN"],
    ],
  );
  // Elemental HERO Grand Neos: shuffled into the Deck
  assert.deepEqual(read(48996569).summons![0].cost, [
    { move: "TO_DECK", cards: MATERIALS, deckPlace: ["DECKSHUFFLE"] },
  ]);
});

test('Contact Fusion: "Must be either Fusion Summoned, or Special Summoned by ..." keeps the materials line\'s Fusion Summon too', () => {
  const [sentence] = sentences(
    "Must be either Fusion Summoned , or Special Summoned by sending the above cards from any Monster Zones to the GY .",
  );
  const summon = sentence.summon as AboveDraft;
  assert.deepEqual(summon.above, {
    where: { side: "BOTH", places: ["MZONE"], faceUp: [] },
    monster: false,
    lineSummons: true,
  });
  assert.deepEqual(summon.from, ["EXTRA"]);
  assert.deepEqual(summon.cost, [{ move: "TO_GRAVE", cards: MATERIALS }]);
  assert.deepEqual(sentence.effects![0].applies![0].requires, [
    { summonType: ["FUSION"] },
  ]);
  // The reminder that it is no Fusion Summon reads only of "Polymerization"
  sentences(
    "Must first be Special Summoned ( from your Extra Deck ) by Tributing the above cards you control ( in which case you do not use {#24094653|a#0x46} ) .",
  );
  assert.ok(
    !(
      "value" in
      reader.read(
        "text",
        "Must first be Special Summoned ( from your Extra Deck ) by banishing the above cards you control . ( You do not use {#89631139} . )",
      )
    ),
  );
});

test('"A Fusion Summon of this card can only be done with the above Fusion Materials": its Fusion Summon has no substitutes', () => {
  // Cyber End Dragon
  const [fusion] = read(1546123).summons!;
  assert.equal(fusion.method, "FUSION");
  assert.equal(fusion.substitutes, false);
});

test("what this card can't be material for is no effect: CANNOT_BE_X_MATERIAL, for every monster or all but some", () => {
  // Ronintoadin: "Cannot be used as Synchro Material."
  const [plain] = read(1357146).effects!;
  assert.equal(plain.kind, "CONDITION");
  assert.deepEqual(plain.flags, ["CANNOT_DISABLE", "UNCOPYABLE"]);
  assert.deepEqual(plain.applies, [
    { effect: "CANNOT_BE_SYNCHRO_MATERIAL", to: "THIS_CARD", value: 1 },
  ]);
  // Majestic Dragon: "..., except for the Synchro Summon of a "Majestic" monster."
  const [except] = read(21159309).effects!;
  assert.equal(except.kind, "CONDITION");
  assert.deepEqual(except.applies, [
    {
      effect: "CANNOT_BE_SYNCHRO_MATERIAL",
      to: "THIS_CARD",
      value: { none: [{ archetypes: [0x3f] }] },
    },
  ]);
  const [{ effects }] = sentences(
    "Cannot be used as material for an Xyz Summon , except the Xyz Summon of a DARK monster .",
  );
  assert.deepEqual(effects![0].applies, [
    {
      effect: "CANNOT_BE_XYZ_MATERIAL",
      to: "THIS_CARD",
      value: { none: [{ attributes: ["DARK"] }] },
    },
  ]);
  // The Summon it can be material for is of the kind it names
  assert.ok(
    !(
      "value" in
      reader.read(
        "text",
        "Cannot be used as Synchro Material , except for the Xyz Summon of a DARK monster .",
      )
    ),
  );
});

test('"You can activate up to 2 X per turn" limits the card\'s activation as "You can only activate 2 X per turn" does', () => {
  const upTo = reader.read("limitation", "You can activate up to 2 {#78058681} per turn .");
  const only = reader.read("limitation", "You can only activate 2 {#78058681} per turn .");
  assert.ok("value" in upTo);
  assert.deepEqual(upTo, only);
  assert.deepEqual(upTo.value, {
    of: "ACTIVATION",
    together: true,
    limit: { count: 2, per: "TURN", shared: "NAME", oath: true },
  });
});
