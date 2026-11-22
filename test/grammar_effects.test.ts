// Events, triggers and replacements (src/builders/EnglishReader/grammar/effects.ts, finish.ts): whole cards where they
// read, and single sentences where the rest of their card doesn't read yet
import assert from "node:assert/strict";
import { test } from "node:test";
import { Reader } from "../src/builders/EnglishReader/engine.js";
import {
  type Context,
  finishEffect,
  prune,
  Unresolved,
} from "../src/builders/EnglishReader/finish.js";
import { GRAMMAR } from "../src/builders/EnglishReader/grammar.js";
import { konamiReader } from "../src/builders/EnglishReader/konamiReader.js";
import type { Draft } from "../src/builders/EnglishReader/phrases.js";
import type { EffectSchema } from "../src/lib/cardSchema.js";
import { openLibrary } from "../src/lib/library.js";
import { readingWith } from "../src/lib/ruled.js";

const library = await openLibrary();
const reader = new Reader(GRAMMAR);
const MONSTER: Context = { kind: "MONSTER", extraDeck: false, pendulum: false };

/** Without the tags of what rulings gave ($ruled), which a card's reading gathers into its ruled. */
const untagged = <T>(value: T): T =>
  value === undefined
    ? value
    : JSON.parse(JSON.stringify(value, (key, v) => (key === "$ruled" ? undefined : v)));
/** A phrase of a kind, as its card's text writes it once names are replaced ({a#0x128} an archetype, {#code} a card). */
const read = <T>(kind: string, text: string): T | undefined =>
  readingWith(library.rulings, () => {
    const reading = reader.read<T>(kind, text);
    return "value" in reading ? untagged(reading.value) : undefined;
  });
/** A sentence read as one effect of a card of this context, and finished. */
const effect = (text: string, context: Context = MONSTER): EffectSchema | undefined =>
  readingWith(library.rulings, () => {
    const reading = reader.read<Draft>("effect", text);
    return "value" in reading ? untagged(prune(finishEffect(reading.value, context))) : undefined;
  });
const card = (code: number) => konamiReader(library, code, "test");

test('a cost replaced: "if you would discard to activate the effect of X, you can ... instead" (Witchcrafter Walpurgis)', () => {
  // "During your turn, if you would discard to activate the effect of a "Witchcrafter" monster you control, you can send
  // 1 "Witchcrafter" Spell/Trap from your Deck to the GY instead, except "Witchcrafter Walpurgis"."
  const replacement = card(32353566).effects!.find((e) => e.event === "COST_REPLACE")!;
  assert.deepEqual(
    [replacement.kind, replacement.eventOf, replacement.from, replacement.requires],
    ["AUTO", "ANY", ["FZONE"], [{ turn: "OWN" }]],
  );
  assert.deepEqual(replacement.replaces, {
    cost: "DISCARD",
    count: "ALL",
    forEffect: {
      player: "OWN",
      card: { archetypes: [0x128], controller: "OWN", states: ["FACEUP"], places: ["MZONE"] },
    },
  });
  const [instead] = replacement.does!;
  assert.equal(instead!.optional, true);
  assert.deepEqual(instead!.moves![0]!.card, {
    archetypes: [0x128],
    types: ["SPELL", "TRAP"],
    none: [{ names: [32353566] }],
  });
});

test("a monster's cost replacement from the GY is unclassified, and what it would pay is said (S-Force Retroactive)", () => {
  const replacement = effect(
    "If an {a#0x156} monster you control would banish a card(s) from your hand to activate its effect, you can banish this card from your GY instead.",
  )!;
  assert.deepEqual(
    [replacement.kind, replacement.event, replacement.from],
    ["UNCLASSIFIED", "COST_REPLACE", ["GRAVE"]],
  );
  assert.deepEqual(replacement.replaces, {
    cost: "BANISH",
    card: { places: ["HAND"] },
    count: "ALL",
    forEffect: {
      player: "OWN",
      card: { archetypes: [0x156], controller: "OWN", states: ["FACEUP"], places: ["MZONE"] },
    },
  });
});

test('"except the turn this card was sent to the GY" puts a replacement in the GY, from the turn after (Ursarctic Departure)', () => {
  const replacement = card(16471775).effects!.find((e) => e.event === "COST_REPLACE")!;
  assert.deepEqual(
    [replacement.kind, replacement.from, replacement.replaces],
    [
      "AUTO",
      ["GRAVE"],
      { cost: "TRIBUTE", count: "ALL", forEffect: { player: "OWN", card: { archetypes: [0x163], types: ["MONSTER"] } } },
    ],
  );
  assert.deepEqual(replacement.requires, [
    { not: { is: { cards: { who: "THIS_CARD" }, filter: { states: ["ARRIVED_THIS_TURN"] } } } },
  ]);
});

test("a redirect of this card is an unclassified rule that negating its effects doesn't stop, with no range (Floowandereeze & Robina, Archlord Kristya)", () => {
  // Robina's other sentences don't read yet
  const robina = effect("If this face-up card would leave the field, banish it instead.")!;
  assert.deepEqual(
    [robina.kind, robina.from, robina.flags, robina.applies, robina.requires],
    [
      "UNCLASSIFIED",
      undefined,
      ["CANNOT_DISABLE"],
      [{ effect: "LEAVE_FIELD_REDIRECT", to: "THIS_CARD", value: "LOCATION_REMOVED" }],
      [{ is: { cards: { who: "THIS_CARD" }, filter: { states: ["FACEUP"] } } }],
    ],
  );
  const kristya = effect(
    "If this face-up card would be sent from the field to the GY, place it on top of the Deck, instead.",
  )!;
  assert.deepEqual(kristya.applies, [
    { effect: "TO_GRAVE_REDIRECT", to: "THIS_CARD", value: "LOCATION_DECK" },
  ]);
  // A Spell's or Trap's is classed only by whether it makes a chain link
  assert.equal(
    effect("If this face-up card would leave the field, banish it instead.", {
      kind: "TRAP",
      subType: "CONTINUOUS",
      extraDeck: false,
      pendulum: false,
    })!.kind,
    "CONTINUOUS",
  );
  // What a move gives a monster ("Special Summon it, but banish it when it leaves the field") is that move's, as before
  const given = card(97556336).effects!.flatMap((e) => e.does ?? []).flatMap((part) => part.moves ?? []);
  assert.equal(given.find((move) => move.move === "GIVE_EFFECT")!.effect!.kind, "CONTINUOUS");
});

test("a battle at one of its moments: its event, this card's own or a monster of its player's (Dinomist Stegosaur, D.D. Warrior Lady)", () => {
  // Dinomist Stegosaur's monster effect: "If another Pendulum Monster you control battles an opponent's monster, after
  // damage calculation: You can destroy those monsters." ("those monsters" doesn't read yet)
  assert.deepEqual(
    read("header", "If another Pendulum Monster you control battles an opponent's monster, after damage calculation"),
    {
      events: ["BATTLED"],
      eventOf: "ANY",
      requires: [
        {
          is: {
            cards: { who: "OWN_BATTLING_MONSTER" },
            // A face-down monster doesn't show it is a Pendulum Monster
            filter: { states: ["NOT_SELF", "FACEUP"], types: ["PENDULUM"] },
          },
        },
        { exists: { who: "OPPONENT_BATTLING_MONSTER" } },
      ],
    },
  );
  // The moment can come first
  assert.deepEqual(
    read("header", "At the start of the Damage Step, if this card battles a monster"),
    { events: ["BATTLE_START"], eventOf: "SELF", requires: [{ exists: { who: "BATTLE_TARGET" } }] },
  );
  // "After damage calculation, when this card battles an opponent's monster: You can banish that monster, also banish
  // this card.": "that monster" is the monster it battled, not this card
  const [lady] = card(7572887).effects!;
  assert.deepEqual(
    [lady!.event, lady!.eventOf, lady!.flags, lady!.does!.map((part) => part.moves![0]!.cards)],
    ["BATTLED", "SELF", ["DAMAGE_STEP"], [{ who: "BATTLE_TARGET" }, { who: "THIS_CARD" }]],
  );
  // "It" could be either monster of a battle: it stops (konamiReader stops a card where a reference is Unresolved)
  assert.throws(
    () => effect("If this card battles an opponent's monster, after damage calculation: Banish it."),
    Unresolved,
  );
});

test("sent to the GY by a card effect, drawn, and in the GY since this turn (Shaddoll Beast, XX-Saber Darksoul)", () => {
  // Shaddoll Beast: "If this card is sent to the GY by a card effect: You can draw 1 card."
  const beast = card(3717252).effects!.find((e) => e.event === "TO_GRAVE")!;
  assert.deepEqual(
    [beast.kind, beast.eventOf, beast.requires],
    ["TRIGGER", "SELF", [{ is: { cards: { who: "THIS_CARD" }, filter: { reasons: ["EFFECT"] } } }]],
  );
  // "Once per turn, during the End Phase, if this card is in the GY because it was sent there from your field this turn"
  const [darksoul] = card(31383545).effects!;
  assert.deepEqual(
    [darksoul!.event, darksoul!.from, darksoul!.requires],
    [
      "PHASE_END",
      ["GRAVE"],
      [
        {
          is: {
            cards: { who: "THIS_CARD" },
            filter: { wasIn: ["ONFIELD"], wasController: "OWN", states: ["ARRIVED_THIS_TURN"] },
          },
        },
      ],
    ],
  );
  assert.deepEqual(read("event", "you draw this card"), { events: ["DRAW"], eventOf: "SELF" });
  // Discarded, and by a card effect too
  assert.deepEqual(read("happening", "discarded to the GY by card effect"), [
    { event: "TO_GRAVE", card: { reasons: ["DISCARD"], allOf: [{ reasons: ["EFFECT"] }] } },
  ]);
});

test("an attack declared, by any monster or involving one; and Life Points compared", () => {
  assert.deepEqual(read("event", "an attack is declared"), {
    events: ["ATTACK_ANNOUNCE"],
    eventOf: "ANY",
  });
  assert.deepEqual(read("event", "an attack is declared involving this card"), {
    events: ["ATTACK_ANNOUNCE"],
    eventOf: "ANY",
    requires: [
      {
        any: [
          { same: [{ who: "ATTACKER" }, { who: "THIS_CARD" }] },
          { same: [{ who: "ATTACK_TARGET" }, { who: "THIS_CARD" }] },
        ],
      },
    ],
  });
  assert.deepEqual(read("conditionClause", "your LP are lower than your opponent's"), {
    requires: [
      { compare: { value: { lifePoints: "OWN" }, is: "LESS", to: { lifePoints: "OPPONENT" } } },
    ],
  });
});

test('a replacement names "a card(s)": a number of them would be a count it checks, which stops rather than be dropped', () => {
  const instead = (cards: string) =>
    effect(`If ${cards} you control would be destroyed, you can destroy this card instead.`);
  assert.equal(instead("a {a#0xd8} card(s)")!.replaces!.count, "ALL");
  assert.equal(instead("2 {a#0xd8} cards"), undefined);
  assert.equal(instead("all {a#0xd8} cards"), undefined);
  assert.equal(instead("up to 2 {a#0xd8} cards"), undefined);
  // Where they are: "in your Spell & Trap Zone" (Magistus Vritra)
  const vritra = card(327051).effects!.find((e) => e.event === "DESTROY_REPLACE")!;
  assert.deepEqual(vritra.replaces, {
    card: {
      archetypes: [0x150],
      states: ["FACEUP"],
      places: ["SZONE"],
      controller: "OWN",
      reasons: ["EFFECT"],
      reasonPlayer: "OPPONENT",
    },
    count: "ALL",
  });
});
