import assert from "node:assert/strict";
import { test } from "node:test";
import { openLibrary } from "../src/library.js";
import { convert } from "../src/convert.js";
import { readCard } from "../src/readCard.js";
import { wholeCardPhrase } from "../src/text/cards.js";
import { textEffects } from "../src/text/effects.js";
import { compareCard } from "../src/textScript.js";

/**
 * Card text read into effects, the script written from them, and the two
 * readings compared, each on cards whose text shows it plainly (the card
 * data in data/, as for every command).
 */
const library = await openLibrary();

test("a card phrase: how many, what they are, where", () => {
  assert.deepEqual(wholeCardPhrase(library, "1 Level 4 or lower Warrior monster from your Deck"), {
    count: { min: 1, max: 1 },
    filter: { level: { max: 4 }, races: ["WARRIOR"], types: ["MONSTER"] },
    from: { own: ["DECK"], opponent: [] },
  });
  // A name in quotes with a noun after it is an archetype; a Continuous Spell is both
  assert.deepEqual(wholeCardPhrase(library, 'up to 2 "Sky Striker" cards in your GY')?.filter, { archetypes: [0x115] });
  assert.deepEqual(wholeCardPhrase(library, "1 Continuous Spell from your Deck")?.filter, { allTypes: ["SPELL", "CONTINUOUS"] });
  // What a monster on the field is can only be seen face-up; a Spell/Trap on the field can be face-down
  assert.equal(wholeCardPhrase(library, "1 Dragon monster you control")?.filter.faceup, true);
  assert.equal(wholeCardPhrase(library, "1 Spell/Trap on the field")?.filter.faceup, undefined);
});

test("Pot of Greed: a Spell's activation that draws", () => {
  const { effects, unparsed } = textEffects(library, 55144522);
  assert.deepEqual(unparsed, []);
  assert.equal(effects[0].kind, "ACTIVATE");
  assert.deepEqual(effects[0].parts[0].actions, [{ move: "DRAW", amount: 2, player: "OWN" }]);
});

test('"this effect" limits the effect just before it, not the last one', () => {
  // Gamma The Electromagnet Warrior: the summon trigger's limit sentence comes before its Quick Effect
  const [trigger, quick] = textEffects(library, 15502037).effects;
  assert.deepEqual(trigger.events, ["SUMMON_SUCCESS", "SPSUMMON_SUCCESS"]);
  assert.deepEqual(trigger.limit, { count: 1, counter: 0 });
  assert.equal(quick.kind, "QUICK");
  assert.equal(quick.limit, undefined);
});

test("where reading stopped is kept with the sentence", () => {
  const { unparsed } = textEffects(library, 63166095);
  assert.equal(unparsed[0].at, "in your Main Monster Zone");
});

test("cards whose script does what its text says read the same both ways", () => {
  // A draw, a search, a target destroyed, a cost and a Quick Effect with a limit, an optional Flip Effect
  for (const code of [55144522, 32807846, 5318639, 15502037, 27189308])
    assert.equal(compareCard(library, code, "test").status, "SAME", library.cardName(code));
});

test("a difference between a script and its text is found", () => {
  // Cheepcheepcheep's old wording aside, Strategist of the Ice Barrier's cost sends from the hand,
  // and its script can banish instead (Ice Barrier's replacement effect)
  const { status, differences } = compareCard(library, 50032342, "test");
  assert.equal(status, "DIFFERS");
  assert.ok(differences.some((d) => d.path.startsWith("cost")));
});

test("reader: an early return false under a not adds the check itself", () => {
  // Shiranui Style Swallow's Slash Tributes a Zombie: "if not c:IsRace(RACE_ZOMBIE) then return false end"
  const card = convert(library, readCard(library, 4333086), "test");
  const tribute = card.effects!.flatMap((e) => e.cost ?? []).find((m) => m.move === "TRIBUTE");
  assert.deepEqual(tribute?.card?.races, ["ZOMBIE"]);
});

test("reader: Duel.DiscardHand without REASON_DISCARD sends from the hand to the GY", () => {
  // Spell Reproduction: "Send 2 Spells from your hand to the GY"
  const [cost] = convert(library, readCard(library, 29228529), "test").effects![0].cost!;
  assert.equal(cost.move, "TO_GRAVE");
  assert.equal(cost.pick, "CHOSEN");
});
