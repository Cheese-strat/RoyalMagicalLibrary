import assert from "node:assert/strict";
import { test } from "node:test";
import { openLibrary } from "../src/library.js";
import { convert } from "../src/convert.js";
import { readCard } from "../src/readCard.js";
import { readRegistration } from "../src/registration.js";
import { ENGINE_SCRIPTS, engineFunctions, readBack, unknownFunctions } from "../src/write/check.js";
import { dialect } from "../src/write/dialects.js";
import { writeScript } from "../src/write/script.js";
import type * as S from "../src/cardSchema.js";

/**
 * Scripts written from a card's description, for each engine: a YGOPro
 * script read back gives the description it was written from, and an
 * EDOPro script says each thing in EDOPro's names and calls.
 */
const library = await openLibrary();
const describe = (code: number) => convert(library, readCard(library, code), "test");
const ygopro = dialect("ygopro");
const edopro = dialect("edopro");
const moves = (effect: S.EffectSchema) => (effect.does ?? []).flatMap((part) => part.moves ?? []);

test("written scripts read back to the description they were written from", () => {
  const cards = {
    55144522: "Pot of Greed: a draw for the player it declares",
    5318639: "Mystical Space Typhoon: a target on the field, but not itself",
    80794697: "Flame Bufferlo: a discard from the hand, and if it does, a draw",
    84778110: "Flint Cragger: costs, a damage, and a 'you can' after it",
    10705656: "Widget Kid: a Special Summon in Defense Position",
    92826944: "Mezuki: a cost of this card, and a target in the GY",
    11877465: "several targets still on the chain",
    23995346: "Blue-Eyes Ultimate Dragon: a Fusion Summon of 3 of one card",
    17548456: "Jurrac Meteor: a Synchro Summon's Tuner and non-Tuners by their own filters",
    10755984: "Daigusto Eguls: a Synchro Summon's non-Tuners of an archetype",
  };
  for (const [code, what] of Object.entries(cards)) {
    const card = describe(Number(code));
    const { script, unwritten } = writeScript(card, ygopro);
    assert.deepEqual(unwritten, [], what);
    assert.deepEqual(readBack(library, card, script!), [], what);
  }
});

test("what no rule writes yet is said, and no script is given", () => {
  // Number 39: Utopia: an Xyz Summon procedure
  const { script, unwritten } = writeScript(describe(84013237), ygopro);
  assert.equal(script, undefined);
  assert.ok(unwritten.length);
});

test("EDOPro: its names for the same values, and its calls where YGOPro's differ", () => {
  assert.deepEqual(edopro.finish("c:IsRace(RACE_WINDBEAST) and c:IsType(TYPE_DUAL)"), {
    script: "c:IsRace(RACE_WINGEDBEAST) and c:IsType(TYPE_GEMINI)",
    unknown: [],
  });
  // A name EDOPro gives as an expression of others is its own
  assert.equal(edopro.finish("LOCATION_ONFIELD").script, "LOCATION_ONFIELD");
  assert.deepEqual(edopro.finish("RACE_NOT_A_RACE").unknown, ["RACE_NOT_A_RACE"]);

  const card = describe(11877465);
  const ours = writeScript(card, ygopro).script!;
  const theirs = writeScript(card, edopro).script!;
  assert.match(ours, /^local s,id,o=GetID\(\)$/m);
  assert.match(theirs, /^local s,id=GetID\(\)$/m);
  assert.match(ours, /Duel\.GetTargetsRelateToChain\(\)/);
  assert.match(theirs, /Duel\.GetTargetCards\(e\)/);
});

test("EDOPro: a written script calls only what EDOPro's own scripts call", () => {
  const known = engineFunctions(ENGINE_SCRIPTS.edopro);
  assert.deepEqual(unknownFunctions(writeScript(describe(11877465), edopro).script!, known), []);
  // YGOPro's call for the same thing isn't EDOPro's
  assert.deepEqual(unknownFunctions("local tg=Duel.GetTargetsRelateToChain()", known), ["Duel.GetTargetsRelateToChain"]);
});

test("summon procedures: each engine's own, with materials checked as materials", () => {
  const card = describe(17548456);
  const ours = writeScript(card, ygopro).script!;
  const theirs = writeScript(card, edopro).script!;
  assert.match(ours, /aux\.AddSynchroProcedure\(c,s\.matfilter\d,aux\.NonTuner\(s\.matfilter\d\),2\)/);
  // EDOPro: the summon's card, type and player go to each check, and the non-Tuners' filter says they aren't Tuners
  assert.match(theirs, /Synchro\.AddProcedure\(c,s\.matfilter\d,1,1,s\.matfilter\d,2,99\)/);
  assert.match(theirs, /return c:IsNotTuner\(sc,tp\) and c:IsRace\(RACE_DINOSAUR,sc,st,tp\)/);
  assert.deepEqual(unknownFunctions(theirs, engineFunctions(ENGINE_SCRIPTS.edopro)), []);
  assert.match(writeScript(describe(23995346), edopro).script!, /Fusion\.AddProcMixN\(c,true,true,89631139,3\)/);
});

test("reader: a procedure's material filter of the card's own is read, though set up before it registers anything", () => {
  // c10547580.mfilter, given to aux.AddLinkProcedure first thing in initial_effect
  const [link] = describe(10547580).summons ?? [];
  assert.deepEqual(link.materials, [{ count: { min: 2, max: 2 }, role: "ANY", card: { attributes: ["EARTH"], races: ["MACHINE"] } }]);
  assert.equal(link.unread, undefined);
});

test("reader: what a procedure takes that a summon has no field for is unread, not dropped", () => {
  // aux.AddLinkProcedure(c,nil,3,6,c11738489.lcheck): a check of the materials together
  const [link] = describe(11738489).summons ?? [];
  assert.equal(link.unread?.length, 1);
  // A Fusion Summon's substitutes and no-materials flags are kept
  const [fusion] = (describe(23995346).summons ?? []).filter((s) => s.method === "FUSION");
  assert.equal(fusion.substitutes, true);
  assert.equal(fusion.withoutMaterials, true);
});

test("continuous effects: written scripts read back, and register what the card's own script registers", () => {
  const cards = {
    403847: "The A. Forces: ATK for each card, counted on the side of the monster it applies to",
    10526791: "Elemental HERO Wildedge: Special Summoned only by Fusion Summon (aux.fuslimit)",
    12163590: "Dragonmaid Cehrmba: cards on the field that the opponent's effects can't destroy",
    10963799: "Barrier Statue of the Torrent: players who can't Special Summon some monsters",
    80461466: "Great Mammoth of the Netherworld: ATK for the Xyz Monster it is material of",
    37953640: "Royal Swamp Eel: a card's own effect given a target function",
  };
  // What the round trip can't see: a field effect read back as a card's own would read the same
  const kept = ["SetType", "SetCode", "SetProperty", "SetRange", "SetTargetRange", "SetCountLimit"];
  const sets = (registration: ReturnType<typeof readRegistration>, index: number) =>
    (registration.effects.get(index)?.sets ?? []).filter(([setter]) => kept.includes(setter)).sort(([a], [b]) => a.localeCompare(b));
  for (const [code, what] of Object.entries(cards)) {
    const card = describe(Number(code));
    const { script, unwritten } = writeScript(card, ygopro);
    assert.deepEqual(unwritten, [], what);
    assert.deepEqual(readBack(library, card, script!), [], what);
    const theirs = readRegistration(library, card.code);
    const ours = library.withScript(card.code, script!, () => readRegistration(library, card.code));
    for (const effect of (card.effects ?? []).filter((e) => e.kind === "CONTINUOUS" && !e.fromProcedure))
      assert.deepEqual(sets(ours, effect.index), sets(theirs, effect.index), `${what}: effect ${effect.index}`);
  }
});

test("EDOPro: its names for aux values and Card's methods", () => {
  assert.equal(edopro.aux("aux.linklimit"), "aux.lnklimit");
  // None of its own: the writer writes the function
  assert.equal(edopro.aux("aux.tgsval"), undefined);
  assert.equal(edopro.finish("c:IsDualState() and c:IsLinkState()").script, "c:IsGeminiStatus() and c:IsLinked()");
  assert.deepEqual(unknownFunctions(writeScript(describe(10526791), edopro).script!, engineFunctions(ENGINE_SCRIPTS.edopro)), []);
});

test("reader: what a continuous effect reaches is named by its type", () => {
  const applied = (code: number, effect: string) => (describe(code).effects ?? []).find((e) => e.applies?.[0]?.effect === effect)!;
  // XMATERIAL: the Xyz Monster it is material of
  assert.equal(applied(80461466, "UPDATE_ATTACK").applies![0].to, "ATTACHED_TO");
  // A field effect with no target range; the zones Ojama King's operation picks aren't read, and say so
  const disable = applied(90140980, "DISABLE_FIELD");
  assert.equal(disable.applies![0].to, "DUEL");
  assert.deepEqual(disable.unread, [{ role: "operation", text: "s.disop" }]);
  // What aux.EnableChangeCode registers is the card's own effect, not a summon procedure's
  const changed = applied(10928224, "CHANGE_CODE");
  assert.equal(changed.fromProcedure, false);
  assert.equal(changed.applies![0].value, 10979723);
});

test("reader: a value worked out as it applies", () => {
  // The A. Forces: 200 for each face-up Warrior and Spellcaster its controller controls
  const [applied] = (describe(403847).effects ?? []).flatMap((e) => e.applies ?? []);
  assert.deepEqual(applied.value, {
    computed: {
      times: 200,
      per: { matching: { from: { own: ["MZONE"] }, card: { races: ["WARRIOR", "SPELLCASTER"], states: ["FACEUP"] }, ofAffectedController: true } },
    },
  });
});

test("flags and chain limits: kept and let go as moves, checked, and written back", () => {
  // Jar Turtle: a flag on itself while "Jar of Greed" is on the chain, which the draw checks
  const turtle = describe(96287685);
  const [set] = turtle.effects![0].does![0].moves!;
  assert.deepEqual([set.move, set.cards, set.memory, set.until], ["REMEMBER", { who: "THIS_CARD" }, { flag: "THIS_CARD" }, ["LEAVES_FIELD_OR_FLIPS", "CHAIN_END"]]);
  // Helpoemer: "if it is in the GY because it was destroyed by battle" is a flag one effect sets and another checks
  const helpoemer = describe(76052811);
  assert.equal(helpoemer.effects![1].does![0].moves![0].move, "REMEMBER");
  assert.ok(!helpoemer.effects![2].unread?.length);
  // T.G. Blade Blaster: a flag for 2 Standby Phases holding the turn, and one let go
  const blaster = describe(51447164).effects!.flatMap((e) => (e.does ?? []).flatMap((part) => part.moves ?? []));
  assert.deepEqual(blaster.find((m) => m.times)?.numbers, [{ turn: true }]);
  assert.ok(blaster.some((m) => m.move === "FORGET" && JSON.stringify(m.memory) === JSON.stringify({ flag: "THIS_CARD" })));
  // Obelisk the Tormentor: nothing can respond to its Normal Summon
  const [limit] = describe(10000000).effects![3].does![0].moves!;
  assert.deepEqual([limit.move, limit.until, limit.canRespond], ["CHAIN_LIMIT", ["CHAIN_END"], "NONE"]);
  const cards = {
    96287685: "Jar Turtle: a flag set and checked by effects without a chain",
    40509732: "Samurai Destroyer: a flag on the monster it battles, which its field effects check",
    41517789: "a chain limit if it was Synchro Summoned",
  };
  for (const [code, what] of Object.entries(cards)) {
    const card = describe(Number(code));
    const { script, unwritten } = writeScript(card, ygopro);
    assert.deepEqual(unwritten, [], what);
    assert.deepEqual(readBack(library, card, script!), [], what);
  }
  // The flags scripts share are each engine's own: EDOPro's aux.chainreg flag is 1
  assert.equal(ygopro.flag("FLAG_ID_CHAINING"), "FLAG_ID_CHAINING");
  assert.equal(edopro.flag("FLAG_ID_CHAINING"), "1");
  assert.equal(edopro.flag("FLAG_ID_UNION"), undefined);
  assert.equal(edopro.flag("THIS_CARD+1"), "id+1");
});

test("merged events: an event once for all the cards it was about, written for each engine its own way", () => {
  // Astrograph Sorcerer waits for cards destroyed together; what aux registers for that is the event's
  const astrograph = describe(48171151);
  assert.equal(astrograph.effects![3].fromProcedure, true);
  assert.deepEqual([astrograph.effects![4].event, astrograph.effects![4].merged], ["MERGED", { events: ["DESTROYED"], perCard: true }]);
  // Kagemucha Knight's trigger, made to wait for Normal Summons merged: each way reads back
  const knight = describe(19353570);
  const trigger = knight.effects!.findIndex((e) => e.kind === "TRIGGER");
  const plumbing = { ...astrograph.effects![3] };
  for (const perCard of [false, true]) {
    const effects = [...knight.effects!];
    effects[trigger] = { ...effects[trigger], event: "MERGED", merged: { events: ["SUMMON_SUCCESS"], perCard } };
    if (perCard) effects.splice(trigger, 0, plumbing);
    const card = { ...knight, effects: effects.map((e, i) => ({ ...e, index: i + 1 })) };
    const { script, unwritten } = writeScript(card, ygopro);
    assert.deepEqual(unwritten, [], `perCard ${perCard}`);
    assert.deepEqual(readBack(library, card, script!), [], `perCard ${perCard}`);
  }
  // EDOPro merges delayed events in its core, which isn't checked to be the same yet
  const merged = { ...knight, effects: knight.effects!.map((e, i) => (i === trigger ? { ...e, event: "MERGED", merged: { events: ["SUMMON_SUCCESS"], perCard: false } } : e)) };
  assert.ok(writeScript(merged, edopro).unwritten.some((u) => u.includes("merged event")));
});

test("memory: what effects keep in labels and label objects, read and written back", () => {
  const roundTrip = (card: S.CardSchema, what: string) => {
    for (const engine of [ygopro, edopro]) {
      const { script, unwritten } = writeScript(card, engine);
      assert.deepEqual(unwritten, [], `${what} (${engine.engine})`);
      if (engine === ygopro) assert.deepEqual(readBack(library, card, script!), [], what);
    }
  };
  // Iris, the Earth Mother: effect 1 keeps whether the chain was 3 or more links of different names; its draw
  // reads that through its label object, and sets it back to 0 each time its condition is checked
  const iris = describe(9628664);
  assert.deepEqual(iris.effects![1].labelObject, { effect: 1 });
  assert.deepEqual(iris.effects![1].requires, [{ compare: { value: { memory: { effect: 1, slot: "NUMBER" } }, is: "EQUAL", to: 1 } }]);
  assert.deepEqual(iris.effects![1].whenChecked, [{ move: "REMEMBER", memory: { effect: 1, slot: "NUMBER" }, numbers: [0] }]);
  roundTrip(iris, "Iris: a label read through a label object, and set back when checked");
  // Genex Ally Reliever: effect 1's label object is effect 2, registered after it
  assert.deepEqual(describe(63211608).effects![0].labelObject, { effect: 2 });
  // Balloon Lizard: the counters it had as it left the field, kept, then dealt as 400 damage each
  const lizard = describe(39892082);
  assert.deepEqual(moves(lizard.effects![1])[0].numbers, [{ counters: 0x29, on: { who: "THIS_CARD" } }]);
  assert.deepEqual(moves(lizard.effects![2])[0].amount, { multiply: [{ memory: { effect: 3, slot: "NUMBER" } }, 400] });
  // Tri-Brigade Arms Bucephalus II: an effect made while resolving lets go of a flag and ends itself
  const made = moves(describe(10019086).effects![2]).find((m) => m.effect)!.effect!;
  assert.deepEqual(moves(made).map((m) => m.move), ["FORGET", "END_EFFECT"]);
  assert.equal(moves(made)[1].ended, "THIS");
  // You're in Danger!: the effect it leaves keeps the card's field ID, and ends itself once the card's flag no longer holds it
  const danger = moves(describe(10312660).effects![0]).find((m) => m.effect)!.effect!;
  assert.deepEqual(danger.label, [{ fieldId: danger.labelObject }]);
  assert.deepEqual(danger.whenChecked?.map((m) => [m.move, m.ended]), [["END_EFFECT", "THIS"]]);
  // Red-Eyes Black Dragon Exceed: a flag kept for the whole duel, on seat 0 whoever's effect it is
  assert.ok(JSON.stringify(describe(17242022).effects).includes('"seat":0'));
});

test("memory: a grant gives the effect it holds, which is never registered", () => {
  const canvas = describe(89355716);
  const [, grant, held] = canvas.effects!;
  assert.deepEqual([grant.applies![0].effect, grant.labelObject, held.held, held.index], ["GRANT", { effect: 3 }, true, 3]);
  // The Canvas, granting Card Ejector's effect to the "Weather" monsters it reaches (its own column check isn't read yet)
  const ejector = describe(26701483).effects![0];
  const card = {
    ...canvas,
    rules: { ...canvas.rules, onlyOne: undefined },
    effects: [canvas.effects![0], { ...grant, applies: [{ ...grant.applies![0], cards: { archetypes: [0x109] }, requires: undefined }], unread: undefined }, { ...ejector, index: 3, held: true as const }],
  };
  for (const engine of [ygopro, edopro]) {
    const { script, unwritten } = writeScript(card, engine);
    assert.deepEqual(unwritten, [], engine.engine);
    assert.match(script!, /e2:SetType\(EFFECT_TYPE_FIELD\+EFFECT_TYPE_GRANT\)/);
    assert.doesNotMatch(script!, /RegisterEffect\(e3\)/);
    if (engine === ygopro) assert.deepEqual(readBack(library, card, script!), []);
  }
});

test("memory: a group the card makes, kept by several effects, added to, emptied and checked", () => {
  // Mirror Wall: its three effects share one group; the attackers it saw go in it, and its ATK effect checks it
  const wall = describe(22359980);
  const [activate, announce, atk] = wall.effects!;
  assert.deepEqual([activate, announce, atk].map((e) => e.labelObject), ["GROUP", { memory: { effect: 1, slot: "OBJECT" } }, { memory: { effect: 1, slot: "OBJECT" } }]);
  const { requires: _, ...added } = moves(announce)[0];
  assert.deepEqual(added, { move: "REMEMBER", cards: { who: "ATTACKER" }, memory: { effect: 2, slot: "OBJECT" }, adding: true });
  assert.deepEqual(atk.applies![0].cards?.among, [{ memory: { effect: 3, slot: "OBJECT" } }]);
  // Without what isn't memory (clearing the group in its target function, halving ATK, its upkeep), emptied as it resolves instead
  const forget = { move: "FORGET" as const, memory: { effect: 1, slot: "OBJECT" as const } };
  const card = {
    ...wall,
    effects: [
      { ...activate, does: activate.does!.filter((p) => p.part !== 0).map((p) => ({ ...p, moves: [forget, ...p.moves!] })), requires: undefined },
      announce,
      { ...atk, applies: [{ ...atk.applies![0], value: 0, requires: undefined }], unread: undefined },
    ],
  };
  for (const engine of [ygopro, edopro]) {
    const { script, unwritten } = writeScript(card, engine);
    assert.deepEqual(unwritten, [], engine.engine);
    for (const call of ["g1:KeepAlive()", "e2:SetLabelObject(e1:GetLabelObject())", "e:GetLabelObject():AddCard(Duel.GetAttacker())", "e:GetLabelObject():Clear()", "e:GetLabelObject():IsContains(c)"])
      assert.ok(script!.includes(call), `${call} (${engine.engine})`);
    if (engine === ygopro) assert.deepEqual(readBack(library, card, script!), []);
  }
});
