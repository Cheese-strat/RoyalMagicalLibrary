import assert from "node:assert/strict";
import { test } from "node:test";
import { checkScript } from "../src/check.js";
import { openLibrary } from "../src/lib/library.js";

const library = await openLibrary();

const BLUE_EYES = 89631139; // Normal Monster: MyCard has no script for it
const FLASH_KNIGHT = 17390179; // Normal Pendulum Monster with no Pendulum Effect: MyCard's only sets up the Pendulum procedure
const script = (...lines: string[]) => [`function c${FLASH_KNIGHT}.initial_effect(c)`, ...lines.map((l) => `\t${l}`), "end", ""].join("\n");

test("a script that registers what MyCard's does matches it", () => {
  assert.equal(checkScript(library, FLASH_KNIGHT, script("aux.EnablePendulumAttribute(c)")).status, "MATCHES");
  assert.equal(checkScript(library, BLUE_EYES, null).status, "MATCHES");
});

test("what only one script registers is a difference", () => {
  const missing = checkScript(library, FLASH_KNIGHT, script());
  assert.equal(missing.status, "DIFFERS");
  assert.ok(missing.differences.includes("setup only in MyCard's: aux.EnablePendulumAttribute()"));
  assert.ok(missing.differences.some((line) => line.startsWith("effect only in MyCard's: #1 By=aux.EnablePendulumAttribute")));
});

test("a script error in ours is an engine error", () => {
  assert.equal(checkScript(library, FLASH_KNIGHT, script("c:NoSuchCall()")).status, "ENGINE_ERROR");
});
