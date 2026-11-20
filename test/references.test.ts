import assert from "node:assert/strict";
import { test } from "node:test";
import { replaceNames } from "../src/builders/EnglishReader/parts.js";

/** A few names, as the Library gives them: what has each name. */
const NAMES: Record<string, { cards?: number[]; archetypes?: number[] }> = {
  "Blue-Eyes White Dragon": { cards: [89631139] },
  Polymerization: { cards: [24094653], archetypes: [0x46] },
  Fusion: { archetypes: [0x46] },
  'Maxx "C"': { cards: [23434538] },
  "Sheep Token": { cards: [73915052] },
  Number: { archetypes: [0x48, 0x16a] },
  'Odd {#name}: "with" every. character;': { cards: [100000001] },
};
const library = {
  named: (name: string) => ({ cards: NAMES[name]?.cards ?? [], archetypes: NAMES[name]?.archetypes ?? [] }),
};
const replaced = (text: string) => replaceNames(library, text);

test("a card's name becomes its code", () => {
  assert.deepEqual(replaced('Special Summon 1 "Blue-Eyes White Dragon" from your Deck.'), {
    text: "Special Summon 1 {#89631139} from your Deck.",
  });
});

test("a name that is a card's and an archetype's keeps both codes, for the sentence reader to choose", () => {
  assert.deepEqual(replaced('1 "Polymerization" or "Fusion" Spell'), { text: "1 {#24094653|a#0x46} or {a#0x46} Spell" });
  assert.deepEqual(replaced('1 "Number" monster'), { text: "1 {a#0x48|a#0x16a} monster" });
});

test("a name holding quotes ends at the nearest quote that makes a name", () => {
  assert.deepEqual(replaced('add 1 "Maxx "C"" to your hand'), { text: "add 1 {#23434538} to your hand" });
});

test("correct PSCT's plural is outside the quotes, and stays", () => {
  assert.deepEqual(replaced('Special Summon 2 "Sheep Token"s.'), { text: "Special Summon 2 {#73915052}s." });
});

test("a custom name can hold any character, and its own text can name it", () => {
  assert.deepEqual(replaced('You can only use "Odd {#name}: "with" every. character;" once per turn.'), {
    text: "You can only use {#100000001} once per turn.",
  });
});

test("text with no quotes is unchanged", () => {
  assert.deepEqual(replaced("Draw 2 cards."), { text: "Draw 2 cards." });
});

test("quoted text that names nothing stops the replacement, saying where and why", () => {
  assert.deepEqual(replaced('any number of "Hyenas" from your Deck'), {
    at: 14,
    length: 8,
    reason: 'no card or archetype is named "Hyenas"',
  });
  assert.deepEqual(replaced('the goddess "Madera".'), { at: 12, length: 8, reason: 'no card or archetype is named "Madera"' });
});

test("a quote with no closing quote stops the replacement, saying where and why", () => {
  assert.deepEqual(replaced('add 1 "Blue-Eyes White Dragon'), { at: 6, length: 1, reason: "a quote with no closing quote" });
});
