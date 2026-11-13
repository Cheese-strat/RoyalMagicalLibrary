import assert from "node:assert/strict";
import { test } from "node:test";
import { konamiReader, TextStop } from "../src/builders/konamiReader.js";
import { openLibrary } from "../src/lib/library.js";

const library = await openLibrary();
const read = (code: number) => konamiReader(library, code, "test");
/** Where reading the card's text stopped. */
const stopOf = (code: number): TextStop => {
  try {
    read(code);
  } catch (error) {
    if (error instanceof TextStop) return error;
    throw error;
  }
  throw new Error(`card ${code} was read completely`);
};

test("a passcode that isn't in the database is an error", () => {
  assert.throws(() => read(1), /card 1 has no text row/);
});

test("a Normal Monster's text is flavor and the card is complete; an Effect Monster's stops at the sentences", () => {
  const blueEyes = read(89631139);
  assert.ok(blueEyes.printed.kind === "MONSTER" && blueEyes.printed.flavor?.startsWith("This legendary dragon"));
  assert.equal(stopOf(26202165).stage, "sentences");
});

test("a Normal Pendulum's monster section is flavor; it is complete only without a Pendulum Effect", () => {
  const silverd = stopOf(7868571);
  assert.equal(silverd.parts[silverd.part].label, "pendulum effect");
  const complete = read(17390179);
  assert.ok(complete.printed.kind === "MONSTER" && complete.printed.flavor !== undefined);
});

test("a name the reader doesn't know stops it at the names stage, at that name", () => {
  const stop = stopOf(22873798); // Hyena: '... any number of "Hyenas" from your Deck.'
  const part = stop.parts[stop.part];
  assert.equal(stop.stage, "names");
  assert.equal(part.label, "monster effect");
  assert.equal(part.text.slice(stop.at, stop.at + stop.length), '"Hyenas"');
  assert.equal(stop.reason, 'no card or archetype is named "Hyenas"');
});
