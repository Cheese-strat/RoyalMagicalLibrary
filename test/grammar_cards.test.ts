import assert from "node:assert/strict";
import { test } from "node:test";
import type { CardFilter } from "../src/lib/cardSchema.js";
import { konamiReader } from "../src/builders/EnglishReader/konamiReader.js";
import { Reader } from "../src/builders/EnglishReader/engine.js";
import { GRAMMAR } from "../src/builders/EnglishReader/grammar.js";
import type { PickDraft } from "../src/builders/EnglishReader/phrases.js";
import { openLibrary } from "../src/lib/library.js";
import { readingWith } from "../src/lib/ruled.js";

const library = await openLibrary();
const reader = new Reader(GRAMMAR);
/** A phrase of one kind, which must read exactly one way, with the rulings a card is read with. */
const read = <T>(kind: string, text: string): T => {
  const reading = readingWith(library.rulings, () => reader.read<T>(kind, text));
  if (!("value" in reading)) assert.fail(`${kind} "${text}": ${reading.reason}`);
  return reading.value;
};
/** The card filter of the first move of an effect's first part. */
const moved = (code: number, effect: number): CardFilter =>
  konamiReader(library, code, "test").effects![effect].does![0].moves![0].card!;

test('"that mentions X" is a card whose text mentions X; "as material", one that lists X as material', () => {
  // Monstrous Arms of Atlantis: "target 1 monster in your GY that mentions "Atlantis, City of the Sea Dragon""
  assert.deepEqual(moved(37092104, 1).mentions, [38391684]);
  // Vision Resonator: "add 1 Spell/Trap that mentions "Red Dragon Archfiend" from your Deck"
  assert.deepEqual(moved(98396890, 0).mentions, [70902743]);
  // Branded Fusion's "1 Fusion Monster that mentions "Fallen of Albaz" as material from your Extra Deck"
  const fusion = read<PickDraft>(
    "pick",
    "1 Fusion Monster that mentions {#68468459} as material from your Extra Deck",
  );
  assert.deepEqual([fusion.card.listsAsMaterial, fusion.card.mentions], [[68468459], undefined]);
});

test('"1 X or 1 card that mentions it": "it" is the card the phrase names', () => {
  // Gadget Trio: "add 1 "Shining Sarcophagus" or 1 Spell/Trap that mentions it from your Deck"
  assert.deepEqual(moved(92110878, 0).anyOf, [
    { names: [79791878] },
    { types: ["SPELL", "TRAP"], mentions: [79791878] },
  ]);
});

test('"that was Special Summoned from the Extra Deck", and "that was X Summoned", after the noun or after its place', () => {
  // Get Out!: "Target 2 monsters your opponent controls that were Special Summoned from the Extra Deck"
  assert.deepEqual(moved(22373487, 0).summonedFrom, ["EXTRA"]);
  // Grisaille Prison's "a face-up monster that was Tribute, Ritual, or Fusion Summoned"
  const { card } = read<{ card: CardFilter }>(
    "cardPhrase",
    "face-up monster that was Tribute, Ritual, or Fusion Summoned",
  );
  assert.deepEqual(card.summonedBy, ["ADVANCE", "RITUAL", "FUSION"]);
});

test('"this card points to" is where a pick is: the Monster Zones this card\'s Link Arrows point to', () => {
  // Ra'ten, the Heavenly General's "target 1 face-up monster this card points to"
  const pointed = read<PickDraft>("pick", "1 face-up monster this card points to");
  assert.deepEqual(pointed.from, { own: ["MZONE"], opponent: ["MZONE"] });
  assert.ok(pointed.card.states?.includes("LINKED_TO_THIS"));
  // Trackblack's "target 1 monster you control this card points to"
  const own = read<PickDraft>("pick", "1 monster you control this card points to");
  assert.deepEqual(own.from, { own: ["MZONE"] });
  assert.ok(own.card.states?.includes("LINKED_TO_THIS"));
});

test('compound places: "that is banished or in your GY", "on your field or in your GY"', () => {
  // Emergency Apport: "Target 1 of your Level 5 or lower Psychic monsters that is banished or in your GY"
  const apport = konamiReader(library, 43633088, "test").effects![0].does![0].moves![0];
  assert.deepEqual(apport.from, { own: ["REMOVED", "GRAVE"] });
  assert.deepEqual(apport.card!.races, ["PSYCHO"]);
  assert.deepEqual(
    read<PickDraft>("pick", "1 Trap that is banished or in either GY").from,
    { own: ["REMOVED", "GRAVE"], opponent: ["REMOVED", "GRAVE"] },
  );
  assert.deepEqual(
    read<PickDraft>("pick", "1 {a#0xee} card on your field or in your GY").from,
    { own: ["ONFIELD", "GRAVE"] },
  );
});

test('what a card isn\'t: "other than X", "that is not a X", and a pick\'s ", except a X"', () => {
  // Gagaga Clerk: "If you control a "Gagaga" monster other than "Gagaga Clerk""
  const clerk = konamiReader(library, 44250812, "test").summons![0].requires![0] as {
    of: { matching: { card: CardFilter } };
  };
  assert.deepEqual(clerk.of.matching.card.none, [{ names: [44250812] }]);
  // Rubic, Malebranche of the Burning Abyss: "a monster that is not a "Burning Abyss" monster"
  const { card } = read<{ card: CardFilter }>("cardPhrase", "monster that is not a {a#0xb1} monster");
  assert.deepEqual(card.none, [{ archetypes: [0xb1], types: ["MONSTER"] }]);
  // Cynet Recovery: "target 1 monster in your GY, except a Link Monster"
  assert.deepEqual(moved(73558460, 1).none, [{ types: ["LINK"] }]);
});
