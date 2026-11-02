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

test("a Special Summon procedure of the card's own: its condition, and its cost's cards as its target function picked them", () => {
  // Cyber Dragon: only the opponent controls a monster, without the "if c==nil" check
  const cyber = card(70095154).summons!.find((s) => s.method === "PROCEDURE")!;
  assert.equal(cyber.requires?.length, 3);
  assert.ok(!JSON.stringify(cyber.requires).includes("THIS_CARD"));
  // Dark Magician of Destruction banishes the Level 6 or higher DARK Spellcaster it picked, from its player's field
  const [banish] = card(59400890).summons!.find((s) => s.method === "PROCEDURE")!.cost!;
  assert.equal(banish.move, "BANISH");
  assert.deepEqual(banish.from, { own: ["MZONE"] });
  assert.deepEqual(banish.card?.numbers, { LEVEL: { min: 6 } });
  // Lava Golem Tributes 2 of the opponent's monsters, and its SPSUMMON_COST keeps its player from Normal Summoning that turn
  const golem = card(102380);
  const [tribute, ...after] = golem.summons!.find((s) => s.method === "PROCEDURE")!.cost!;
  assert.deepEqual([tribute.move, tribute.from, tribute.count], ["TRIBUTE", { opponent: ["MZONE"] }, { min: 2, max: 2 }]);
  assert.ok(after.some((move) => move.effect?.applies?.[0].effect === "CANNOT_SUMMON"));
  assert.deepEqual(golem.effects!.filter((e) => e.inSummons).map((e) => e.index), [1, 3]);
});

test("a Normal Summon procedure of the card's own, and Tributes from elsewhere", () => {
  // K9-17 Izuna: Normal Summoned without Tributing while the opponent holds 2 cards; its minc==0 is the method
  const izuna = card(92248362).summons!;
  const without = izuna.find((s) => s.method === "NORMAL")!;
  assert.ok(without.requires?.some((c) => "atLeast" in c && c.atLeast === 2));
  assert.ok(!JSON.stringify(without.requires).includes("minc"));
  assert.ok(izuna.some((s) => s.method === "TRIBUTE"));
  // Slifer the Sky Dragon: its LIMIT_SUMMON_PROC is its only Normal Summon, a Tribute Summon of 3
  assert.deepEqual(card(10000020).summons!.map((s) => [s.method, s.materials?.[0].count]), [["TRIBUTE", { min: 3, max: 3 }]]);
  // The Great Gallant Bandit's Tributes can be the opponent's monsters while its player controls none
  const [bandit] = card(24203749).summons!;
  assert.deepEqual(bandit.extraMaterials?.[0].from, { opponent: ["MZONE"] });
  assert.ok(bandit.extraMaterials?.[0].requires?.[0] && "not" in bandit.extraMaterials[0].requires[0]);
});
