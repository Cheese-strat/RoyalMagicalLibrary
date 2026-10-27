import assert from "node:assert/strict";
import { test } from "node:test";
import type { CardSchema, Move, Part } from "../src/cardSchema.js";
import { convert } from "../src/convert.js";
import { openLibrary } from "../src/library.js";
import { readCard } from "../src/readCard.js";

/**
 * The conversion field by field, each on a card whose script shows it
 * plainly (the card data in data/, as for every command).
 */
const library = await openLibrary();
const card = (code: number): CardSchema => convert(library, readCard(library, code), "test");
const effect = (code: number, index = 1) => card(code).effects!.find((e) => e.index === index)!;
const moves = (part: Part): Move["move"][] => (part.moves ?? []).map((m) => m.move);

test("Sky Striker Mobilize - Engage!: a search, then you can draw", () => {
  const e = effect(63166095);
  assert.equal(e.kind, "ACTIVATE");
  assert.equal(e.speed, 1);
  const [search, draw] = e.does!;
  assert.deepEqual(moves(search), ["TO_HAND", "REVEAL"]);
  const add = search.moves![0];
  assert.equal(add.pick, "CHOSEN");
  assert.deepEqual(add.from, { own: ["DECK"] });
  assert.deepEqual(add.card?.archetypes, [0x115]);
  assert.deepEqual(add.card?.none, [{ names: [63166095] }]);
  assert.equal(draw.link, "THEN");
  assert.equal(draw.level, "SUBSEQUENT");
  assert.equal(draw.optional, true);
  assert.deepEqual(draw.moves?.[0], { move: "DRAW", amount: 1, player: "OWN", reasons: ["EFFECT"] });
  assert.equal(e.unread, undefined);
});

test("Ash Blossom & Joyous Spring: a hard once per turn, discarding itself as its cost", () => {
  const e = effect(14558127);
  assert.equal(e.kind, "QUICK");
  assert.equal(e.speed, 2);
  assert.deepEqual(e.from, ["HAND"]);
  assert.deepEqual(e.limit, { count: 1, per: "TURN", shared: "NAME", counter: 0, oath: false });
  assert.equal(e.cost?.[0].move, "DISCARD");
  assert.equal(e.cost?.[0].pick, "THIS_CARD");
  assert.ok(e.requires?.some((c) => "any" in c));
});

test("each effect once per turn has a counter of its own; one counter is shared", () => {
  // Fighting Flame Swordsman: "each effect" (id and id+o); Thunder Dragondark: "only 1 ... effect per turn" (id for all three)
  assert.equal(effect(1047075, 1).limit?.counter, 0);
  assert.equal(effect(1047075, 3).limit?.counter, 1);
  assert.deepEqual([1, 2, 3].map((index) => effect(56713174, index).limit?.counter), [0, 0, 0]);
});

test("Fire Ejection: an OPT (OATH), modes chosen on resolution, each following the send with THEN", () => {
  const e = effect(11654067);
  assert.equal(e.limit?.oath, true);
  assert.deepEqual(e.modes?.map((m) => [m.mode, m.chosenOn]), [[1, "RESOLUTION"], [2, "RESOLUTION"], [3, "RESOLUTION"]]);
  const token = e.does!.find((p) => p.mode === 2 && moves(p).includes("SPECIAL_SUMMON"))!;
  assert.equal(token.link, "THEN");
});

test("Called by the Grave: a target picked on activation and banished on resolution", () => {
  const e = effect(24224830);
  assert.equal(e.targets, true);
  const banish = e.does![0].moves![0];
  assert.equal(banish.move, "BANISH");
  assert.equal(banish.pick, "TARGETED");
  assert.deepEqual(banish.from, { opponent: ["GRAVE"] });
});

test("Downbeat: a cost paid in the target function is a cost, picked rather than targeted", () => {
  const e = effect(96540);
  assert.deepEqual(e.cost?.map((m) => [m.move, m.pick]), [["TRIBUTE", "CHOSEN"]]);
});

test("printed data: a Link Monster's markers, an Xyz's Rank, a Pendulum's Scales", () => {
  assert.deepEqual(card(1861629).printed.monster, {
    frame: "LINK",
    attribute: "DARK",
    race: "CYBERSE",
    link: 3,
    atk: 2300,
    linkMarkers: ["BOTTOM_LEFT", "BOTTOM_RIGHT", "TOP"],
  });
  assert.equal(card(2978414).printed.monster?.rank, 8);
  assert.deepEqual(card(17330916).printed.monster?.scales, { left: 1, right: 1 });
});

test("summon procedures: their materials", () => {
  const [xyz] = card(2978414).summons!;
  assert.deepEqual(xyz.materials, [{ count: { min: 2, max: 2 }, role: "ANY", card: { races: ["DRAGON"], numbers: { LEVEL: { is: [8] } } } }]);
  const [synchro] = card(12018201).summons!;
  assert.deepEqual(synchro.materials?.[1], {
    count: { min: 1, max: 99 },
    role: "NON_TUNER",
    card: { attributes: ["FIRE"], none: [{ types: ["TUNER"] }] },
  });
  // A Level 6 monster is Tribute Summoned with 1 Tribute
  assert.deepEqual(card(17330916).summons?.find((s) => s.method === "TRIBUTE")?.materials?.[0].count, { min: 1, max: 1 });
});
