import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  konamiReader,
  type TextWarning,
} from "../src/builders/EnglishReader/konamiReader.js";
import { TextStop } from "../src/builders/EnglishReader/parts.js";
import { openLibrary } from "../src/lib/library.js";

const library = await openLibrary();
const expected = new URL("./expected/", import.meta.url);
/**
 * A card as it was read, or is expected, without where the reading came from, and without its tags: the cards written by
 * hand say what a card is, and test/rulings.test.ts checks which of that the rulings gave.
 */
const card = (schema: object) => ({
  ...schema,
  source: undefined,
  ruled: undefined,
});

/** The cards that warn, and the parts their warnings are about (undefined: the card as a whole); every other card warns of nothing. */
const WARNED: Record<number, (string | undefined)[]> = {
  // Its non-Tuners are its materials minus its Tuner, which the text doesn't say
  87188910: ["monster effect"],
  // Number 90: its name says "Number", which the database's setcodes don't have
  8165596: [undefined],
};

// Every card of Sangan's Elfnote Ars Magna and Clown Crew decks, written by hand from its text and rulings (src/builders/EnglishReader/README.md)
for (const file of readdirSync(expected).filter((name) =>
  name.endsWith(".json"),
)) {
  const want = JSON.parse(readFileSync(new URL(file, expected), "utf8"));
  test(`${want.name} reads as written by hand`, () => {
    const warnings: TextWarning[] = [];
    assert.deepEqual(
      card(konamiReader(library, want.code, "test", warnings)),
      card(want),
    );
    assert.deepEqual(
      warnings.map((warning) => warning.part),
      WARNED[want.code] ?? [],
    );
  });
}

test("a text the grammar has no patterns for stops at the sentences stage, where it could read no further", () => {
  // Dark Magician of Chaos
  assert.throws(
    () => konamiReader(library, 40737112, "test"),
    (error) =>
      error instanceof TextStop &&
      error.stage === "sentences" &&
      error.reason.startsWith("expected"),
  );
});

test("every card in the database reads, or stops at the part it can't read: the reader throws nothing else", () => {
  const thrown: string[] = [];
  for (const code of library.cards()) {
    try {
      konamiReader(library, code, "test");
    } catch (error) {
      if (!(error instanceof TextStop))
        thrown.push(
          `${code} ${library.cardName(code)}: ${error instanceof Error ? error.message : error}`,
        );
    }
  }
  assert.deepEqual(thrown, []);
});

/** The reading of a card that stops, or of what threw instead. */
const stopOf = (code: number): TextStop => {
  try {
    konamiReader(library, code, "test");
  } catch (error) {
    if (error instanceof TextStop) return error;
    throw error;
  }
  assert.fail(`${code} reads`);
};

test('"If this card is banished:" is its banishment, a trigger, where "while this card is banished" is where it is', () => {
  // Psiics, Moonlight of the Ghoti
  const { kind, event, eventOf, from, flags } = konamiReader(
    library,
    26523337,
    "test",
  ).effects![2];
  assert.deepEqual(
    { kind, event, eventOf, from, flags },
    {
      kind: "TRIGGER",
      event: "REMOVE",
      eventOf: "SELF",
      from: undefined,
      flags: ["DAMAGE_STEP", "DELAY"],
    },
  );
});

test("a Field Spell is activated before its effects apply, which work from the Field Zone", () => {
  // Fortissimo the Mobile Fortress
  const [activation, effect] = konamiReader(library, 86997073, "test").effects!;
  assert.deepEqual(
    [activation.kind, activation.event, activation.does],
    ["ACTIVATE", "FREE_CHAIN", undefined],
  );
  assert.deepEqual([effect.kind, effect.from], ["IGNITION", ["FZONE"]]);
});

test('"up to 1 X and up to 1 Y" takes 1 or 2 cards, at most 1 of each', () => {
  // Evil★Twin's Trouble Sunny
  const [move] = konamiReader(library, 93672138, "test").effects![0].does![0]
    .moves!;
  const atMost2 = (archetype: number) => ({
    not: {
      atLeast: 2,
      of: {
        among: {
          cards: { ref: "CHOSEN1" },
          card: { archetypes: [archetype], types: ["MONSTER"] },
        },
      },
    },
  });
  assert.deepEqual(
    [move.count, move.pickRequires],
    [{ min: 1, max: 2 }, [atMost2(338), atMost2(339)]],
  );
});

test("a Tribute takes monsters, from a Monster Zone, whatever the words name", () => {
  // Release Restraint: "Tribute 1 "Gearfried the Iron Knight""
  const [tribute] = konamiReader(library, 75417459, "test").effects![0].cost!;
  assert.deepEqual(tribute.from, { own: ["MZONE"] });
});

test("words that read but don't make sense together stop the reading at their part", () => {
  // Attack Reflector Unit: two sentences, each an activation of the card
  assert.match(
    stopOf(91989718).reason,
    /a second sentence that is the card's activation/,
  );
  // Enneacraft Release: a pronoun with no card before it
  assert.match(stopOf(54020393).reason, /refers back to cards/);
  // Cyber Revsystem: "It", the card the sentence before Special Summoned, which this reader doesn't carry between sentences
  assert.equal(stopOf(33041277).stage, "sentences");
});

// ---- a card's data and parts ----

test("a passcode that isn't in the database is an error", () => {
  assert.throws(
    () => konamiReader(library, 1, "test"),
    /card 1 has no text row/,
  );
});

test("a Normal Monster's text is flavor, and the card is complete", () => {
  const { printed } = konamiReader(library, 89631139, "test");
  assert.ok(
    printed.kind === "MONSTER" &&
      printed.flavor?.startsWith("This legendary dragon"),
  );
});

test("a Normal Pendulum's monster section is flavor; its Pendulum Effect is read", () => {
  // Metalfoes Silverd's one effect is its Pendulum Effect's, from the Pendulum Zone; its monster section is its flavor
  const silverd = konamiReader(library, 7868571, "test");
  assert.ok(silverd.printed.kind === "MONSTER" && silverd.printed.flavor !== undefined);
  assert.deepEqual(
    silverd.effects!.map((effect) => effect.from),
    [["PZONE"]],
  );
  // Flash Knight has no Pendulum Effect
  const { printed } = konamiReader(library, 17390179, "test");
  assert.ok(printed.kind === "MONSTER" && printed.flavor !== undefined);
});

test("a name the reader doesn't know stops it at the names stage, at that name", () => {
  const stop = stopOf(22873798); // Hyena: '... any number of "Hyenas" from your Deck.'
  const part = stop.parts[stop.part];
  assert.equal(stop.stage, "names");
  assert.equal(part.label, "monster effect");
  assert.equal(part.text.slice(stop.at, stop.at + stop.length), '"Hyenas"');
  assert.equal(stop.reason, 'no card or archetype is named "Hyenas"');
});

test("Kewl Tune hand-Synchro keeps Tuners in Synchro materials, and is a CONDITION (no effect) that no limitation counts", () => {
  const trackMaker = konamiReader(library, 42781164, "test");
  assert.deepEqual(trackMaker.summons![0].materials, [
    { count: { min: 1, max: 1 }, role: "TUNER", card: { archetypes: [469] } },
    { count: { min: 1, max: 99 }, role: "TUNER", card: {} },
  ]);
  const [cond, trig1, trig2] = trackMaker.effects!;
  assert.deepEqual(
    {
      kind: cond.kind,
      from: cond.from,
      flags: cond.flags,
      limit: cond.limit,
      applies: cond.applies,
    },
    {
      kind: "CONDITION",
      from: ["MZONE"],
      flags: ["CANNOT_DISABLE", "UNCOPYABLE"],
      limit: undefined,
      applies: [
        {
          effect: "HAND_SYNCHRO",
          to: "THIS_CARD",
          cards: { types: ["TUNER"], places: ["HAND"] },
          value: 1,
        },
      ],
    },
  );
  assert.equal(trig1.limit?.counter, 0);
  assert.equal(trig2.limit?.counter, 1);

  const reco = konamiReader(library, 89392810, "test");
  assert.equal(reco.effects![0].kind, "CONDITION");
  assert.deepEqual(reco.effects![0].flags, ["CANNOT_DISABLE", "UNCOPYABLE"]);
  assert.equal(reco.effects![0].limit, undefined);
  assert.equal(reco.effects![1].limit?.counter, 0);
  assert.equal(reco.effects![2].limit?.counter, 0);
  assert.equal(reco.effects![3].limit?.counter, 1);
});

test('"Activate this card by targeting" keeps the target: the card\'s rules and links are of the card it targets', () => {
  const cards = (code: number) => konamiReader(library, code, "test").effects!;
  // Call of the Haunted: it keeps the target once it has Special Summoned it, and its links are AUTO
  const [activation, leaves, destroyed] = cards(97077563);
  assert.equal(activation!.kind, "ACTIVATE");
  assert.deepEqual(activation!.does![1], {
    part: 2,
    link: "AND_IF_YOU_DO",
    level: "SUBSEQUENT",
    optional: false,
    moves: [
      {
        move: "KEEP_TARGETING",
        cards: { who: "THIS_CARD" },
        pick: "THIS_CARD",
        to: { ref: "TARGET" },
      },
    ],
  });
  assert.deepEqual(
    [leaves!.kind, leaves!.event, leaves!.eventOf, leaves!.does?.[0]?.moves?.[0]?.cards],
    ["AUTO", "LEAVE_FIELD", "SELF", { who: "CARD_IT_TARGETS" }],
  );
  assert.deepEqual(
    [destroyed!.kind, destroyed!.event, destroyed!.eventOf, destroyed!.requires],
    [
      "AUTO",
      "DESTROYED",
      "ANY",
      [
        {
          contains: {
            group: { who: "EVENT_CARDS" },
            card: { who: "CARD_IT_TARGETS" },
          },
        },
      ],
    ],
  );
  // Spellbinding Circle: what its resolution says of the target are rules of this card on it, as the script's
  // EFFECT_TYPE_TARGET effects are
  const [, rules] = cards(18807108);
  assert.deepEqual([rules!.kind, rules!.from, rules!.applies], [
    "CONTINUOUS",
    ["SZONE"],
    [
      { effect: "CANNOT_ATTACK", to: "CARD_IT_TARGETS" },
      { effect: "CANNOT_CHANGE_POSITION", to: "CARD_IT_TARGETS" },
    ],
  ]);
});

test('"Activate this card by {gerunds}" is the activation, with the gerunds as its cost', () => {
  // Toon World: "Activate this card by paying 1000 LP."
  const [activation] = konamiReader(library, 15259703, "test").effects!;
  assert.deepEqual(
    [activation!.kind, activation!.cost, activation!.does],
    ["ACTIVATE", [{ move: "PAY_LP", amount: 1000, player: "OWN" }], undefined],
  );
});

test('"If ... would be destroyed, you can ... instead" replaces the destruction of every card it names, or of 1 of them', () => {
  const replacement = (code: number) =>
    konamiReader(library, code, "test").effects!.filter((effect) => effect.replaces);
  // Dinomist Pteran's Pendulum Effect: "If another "Dinomist" card(s) you control would be destroyed by battle or an
  // opponent's card effect, you can destroy this card instead."
  const [pteran] = replacement(64973287);
  assert.deepEqual(
    [pteran!.kind, pteran!.event, pteran!.eventOf, pteran!.from, pteran!.replaces!.count],
    ["AUTO", "DESTROY_REPLACE", "ANY", ["PZONE"], "ALL"],
  );
  assert.deepEqual(pteran!.does![0]!.optional, true);
  // Blockout Curtain: "... instead of 1 of those cards", from the field and from the GY
  assert.deepEqual(
    replacement(53167658).map((effect) => [effect.from, effect.replaces!.count]),
    [
      [["SZONE"], { min: 1, max: 1 }],
      [["GRAVE"], { min: 1, max: 1 }],
    ],
  );
  // Relinkuriboh: a monster's replacement from the GY is unclassified
  const [relinkuriboh] = replacement(50185950);
  assert.deepEqual(
    [relinkuriboh!.kind, relinkuriboh!.eventOf, relinkuriboh!.from],
    ["UNCLASSIFIED", "ANY", ["GRAVE"]],
  );
});

test('"that monster" isn\'t guessed: after a pick its words don\'t say is monsters, it stops rather than mean the event\'s card', () => {
  // Blue Rose Dragon's "1 "Black Rose Dragon" or 1 Plant monster in your GY; Special Summon that monster"
  assert.match(stopOf(98884569).message, /that monster/);
});

test("words about the card this card targets stop a card whose activation doesn't say it keeps one", () => {
  // Release from Stone's "Target 1 of your banished Rock monsters; Special Summon it. When this card leaves the field,
  // destroy that monster.": its script keeps the target, but its text doesn't say "Activate this card by targeting"
  assert.match(stopOf(26956670).message, /keeps no target/);
});
