import assert from "node:assert/strict";
import { test } from "node:test";
import { openLibrary } from "../src/library.js";
import { convert } from "../src/convert.js";
import { readCard } from "../src/readCard.js";
import { readRegistration } from "../src/registration.js";
import { ENGINE_SCRIPTS, engineFunctions, readBack, unknownFunctions } from "../src/write/check.js";
import { dialect } from "../src/write/dialects.js";
import { writeScript } from "../src/write/script.js";

/**
 * Scripts written from a card's description, for each engine: a YGOPro
 * script read back gives the description it was written from, and an
 * EDOPro script says each thing in EDOPro's names and calls.
 */
const library = await openLibrary();
const describe = (code: number) => convert(library, readCard(library, code), "test");
const ygopro = dialect("ygopro");
const edopro = dialect("edopro");

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
