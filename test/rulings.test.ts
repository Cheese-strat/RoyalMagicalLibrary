import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  konamiReader,
  type TextWarning,
} from "../src/builders/EnglishReader/konamiReader.js";
import { TextStop } from "../src/builders/EnglishReader/parts.js";
import type { CardSchema } from "../src/lib/cardSchema.js";
import { DEFAULT_PATHS, openLibrary } from "../src/lib/library.js";
import { textAlone, valueAt } from "../src/lib/ruled.js";
import type { RawRuling, Ruling } from "../src/lib/rulingSchema.js";
import {
  FIELDS,
  GIVE_FIELDS,
  LIKE_WORDS,
  loadRulings,
  normalizeRuling,
  problemsOf,
  RULINGS_DIR,
  Rulings,
  rulingsFor,
  SOURCE_FIELDS,
} from "../src/lib/rulings.js";

const library = await openLibrary();
const all = loadRulings();
const tcg = library.rulings;
/** A value as it is written to a file: without what is undefined. */
const written = (value: unknown) => JSON.parse(JSON.stringify(value));
/** A card as read, or undefined when its text doesn't read yet. */
function read(
  code: number,
  rulings: Rulings = tcg,
  warnings: TextWarning[] = [],
): CardSchema | undefined {
  try {
    return konamiReader(library, code, "test", warnings, rulings);
  } catch (error) {
    if (error instanceof TextStop) return undefined;
    throw error;
  }
}

// ---- the database ----

const BY_CHEESESTRAT = {
  from: "PLAYER",
  by: "Cheesestrat",
  date: "2026-11-16",
} as const;
const ruling = (id: string, rest: Partial<Ruling> = {}): Ruling => ({
  id,
  statement: "A rule.",
  kind: "MEANING",
  region: "OCG",
  status: "APPLIED",
  sources: [BY_CHEESESTRAT],
  ...rest,
});

test("every ruling in the database is in the format, which loading it checks", () => {
  assert.ok(all.length > 0);
  assert.deepEqual(problemsOf(ruling("a-rule"), "a-rule.json"), []);
});

test("what isn't in the format is said, while omitted id/region/status/sources default cleanly", () => {
  const problems = (written: RawRuling, file = `${written.id ?? "a-rule"}.json`) =>
    problemsOf(written, file).join("\n");
  // Minimal ruling: id, region, status and sources can all be omitted
  assert.equal(
    problems({ statement: "A rule.", kind: "MEANING" }, "general/a-rule.json"),
    "",
  );
  assert.deepEqual(
    normalizeRuling({ statement: "A rule.", kind: "MEANING" }, "tcg/my-tcg-rule.json"),
    {
      id: "my-tcg-rule",
      statement: "A rule.",
      kind: "MEANING",
      region: "TCG",
      status: "APPLIED",
      sources: [],
    },
  );
  assert.equal(
    problems(ruling("a-rule", { status: "WAITING", sources: [] })),
    "",
  );
  assert.match(
    problems({ ...ruling("a-rule"), note: "x" } as Ruling),
    /"note" isn't a field/,
  );
  assert.match(
    problems(ruling("a-rule"), "another.json"),
    /isn't its file's name/,
  );
  assert.match(
    problems(ruling("A_Rule")),
    /lower-case words joined by hyphens/,
  );
  assert.match(
    problems(ruling("a-rule", { priority: "high" as unknown as number })),
    /priority isn't a number/,
  );
  assert.match(problems(ruling("a-rule", { kind: "CARD" })), /names its cards/);
  assert.match(
    problems(ruling("a-rule", { kind: "CARD", cards: [4334811] })),
    /says what it gives its cards/,
  );
  assert.match(
    problems(ruling("a-rule", { kind: "ADDITION", cards: [4334811] })),
    /names its cards/,
  );
  assert.match(
    problems(ruling("a-rule", { gives: [{ sets: { rules: true } }] })),
    /a MEANING ruling gives nothing/,
  );
  const giving = (give: object) =>
    problems(ruling("a-rule", { kind: "ADDITION", gives: [give] }));
  assert.equal(
    giving({
      each: "effects/*",
      where: { kind: { $in: ["TRIGGER", "FLIP"] } },
      sets: { speed: 2 },
    }),
    "",
  );
  assert.equal(
    giving({
      card: { printed: { level: { $gte: 5, $lte: 6 } } },
      unsets: ["effects/0/limit"],
    }),
    "",
  );
  assert.match(
    giving({ each: "effects/*" }),
    /sets nothing, adds nothing and isn't unsaid/,
  );
  assert.match(
    giving({
      where: { kind: { $oneOf: ["TRIGGER"] } },
      sets: { speed: 2 },
    }),
    /\$oneOf isn't a word/,
  );
  assert.match(
    giving({
      where: { level: { $lte: "4" } },
      sets: { speed: 2 },
    }),
    /\$lte takes a number/,
  );
  assert.match(
    giving({ only: { kind: "TRIGGER" }, sets: { speed: 2 } }),
    /"only" isn't a field of gives/,
  );
  assert.match(
    giving({ adds: [{ path: "flags" }] }),
    /an add without its path or its entry/,
  );
  assert.match(
    problems(ruling("a-rule", { replaces: ["another"] })),
    /only a TCG ruling replaces/,
  );
  assert.match(
    problems(
      ruling("a-rule", {
        sources: [{ from: "QA", id: 9667, date: "24 March 2017", says: "x" }],
      }),
    ),
    /date isn't a day/,
  );
  assert.match(
    problems(
      ruling("a-rule", {
        sources: [{ from: "QA", id: 9667, date: "2017-03-24" } as never],
      }),
    ),
    /without its says/,
  );
  assert.throws(
    () => new Rulings([ruling("a-rule"), ruling("a-rule")], "TCG"),
    /same id/,
  );
  assert.throws(
    () =>
      new Rulings(
        [ruling("a-rule", { region: "TCG", replaces: ["missing"] })],
        "TCG",
      ),
    /isn't an OCG ruling/,
  );
});

test("rulings.schema.json stays in sync with rulings.ts validation rules", () => {
  const schema = JSON.parse(
    readFileSync(join(RULINGS_DIR, "rulings.schema.json"), "utf8"),
  );
  assert.deepEqual(
    new Set(Object.keys(schema.properties)),
    FIELDS,
  );
  assert.deepEqual(
    new Set(Object.keys(schema.$defs.give.properties)),
    GIVE_FIELDS,
  );
  const likeObj = schema.$defs.like.oneOf.find(
    (branch: { type?: string }) => branch.type === "object",
  );
  assert.deepEqual(new Set(Object.keys(likeObj.properties)), LIKE_WORDS);
  const sourceKinds = new Set(
    schema.$defs.source.oneOf.map(
      (branch: { properties: { from: { const: string } } }) =>
        branch.properties.from.const,
    ),
  );
  assert.deepEqual(sourceKinds, new Set(Object.keys(SOURCE_FIELDS)));
});

test("openLibrary loads rulings on startup from nested folders and respects region", async () => {
  assert.equal(library.rulings.region, "TCG");
  const ocgLib = await openLibrary({ ...DEFAULT_PATHS, region: "OCG" });
  assert.equal(ocgLib.rulings.region, "OCG");

  // Editing/adding JSON files in a custom rulings directory is picked up automatically on startup
  const dir = mkdtempSync(join(tmpdir(), "rml-rulings-"));
  try {
    mkdirSync(join(dir, "general"), { recursive: true });
    mkdirSync(join(dir, "tcg"), { recursive: true });
    writeFileSync(
      join(dir, "general", "base-rule.json"),
      JSON.stringify({ statement: "Base OCG rule.", kind: "MEANING" }),
    );
    writeFileSync(
      join(dir, "tcg", "tcg-override.json"),
      JSON.stringify({
        statement: "TCG override.",
        kind: "MEANING",
        replaces: ["base-rule"],
      }),
    );
    const loaded = loadRulings(dir);
    assert.deepEqual(
      loaded.map((r) => [r.id, r.region, r.status]),
      [
        ["base-rule", "OCG", "APPLIED"],
        ["tcg-override", "TCG", "APPLIED"],
      ],
    );
    assert.equal(new Rulings(loaded, "TCG").holds("base-rule"), false);
    assert.equal(new Rulings(loaded, "TCG").holds("tcg-override"), true);
    assert.equal(new Rulings(loaded, "OCG").holds("base-rule"), true);
    assert.equal(new Rulings(loaded, "OCG").holds("tcg-override"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the TCG plays by the OCG's rulings, but for those a TCG ruling that holds replaces; the OCG by its own", () => {
  const rulings = [
    ruling("base"),
    ruling("kept"),
    ruling("tcg-own", { region: "TCG", replaces: ["base"] }),
    ruling("tcg-waiting", {
      region: "TCG",
      replaces: ["kept"],
      status: "WAITING",
      question: "?",
      meanwhile: "The OCG's.",
    }),
  ];
  const holding = (region: "OCG" | "TCG") =>
    rulings
      .map(({ id }) => id)
      .filter((id) => new Rulings(rulings, region).holds(id));
  assert.deepEqual(holding("TCG"), ["kept", "tcg-own"]);
  assert.deepEqual(holding("OCG"), ["base", "kept"]);
  assert.throws(
    () => new Rulings(rulings, "TCG").holds("no-such-ruling"),
    /no ruling no-such-ruling/,
  );
  // The database's own: a Tribute Set isn't a Normal Summon in the TCG either, until the TCG's ruling on it is decided
  assert.equal(
    tcg.get("tcg-a-tribute-set-is-a-normal-summon").status,
    "WAITING",
  );
  assert.ok(tcg.holds("a-tribute-set-is-not-a-normal-summon"));
});

// ---- the reader ----

test("the reader references every ruling it follows itself (via holds() or ruling: comment), and no unknown ruling id", () => {
  const folder = new URL("../src/builders/EnglishReader/", import.meta.url)
    .pathname;
  const source = [folder, join(folder, "grammar")]
    .flatMap((dir) =>
      readdirSync(dir)
        .filter((file) => file.endsWith(".ts"))
        .map((file) => readFileSync(join(dir, file), "utf8")),
    )
    .join("\n")
    // A comment's lines, joined: an id can end one line and... not be split, but "ruling:" and its id can
    .replace(/\n\s*(\*|\/\/)\s*/g, " ");
  const unnamed = all
    .filter(
      ({ gives, status, id }) =>
        !gives && status === "APPLIED" && !source.includes(id),
    )
    .map(({ id }) => id);
  assert.deepEqual(unnamed, []);
  const named = [
    ...[...source.matchAll(/\bruling: ([a-z0-9]+(?:-[a-z0-9]+)+)/g)].map(
      (match) => match[1],
    ),
    ...[...source.matchAll(/\bholds\(\s*"([a-z0-9]+(?:-[a-z0-9]+)+)"\s*\)/g)].map(
      (match) => match[1],
    ),
  ];
  assert.ok(named.length > 0);
  assert.deepEqual(
    named.filter((id) => !all.some((ruling) => ruling.id === id)),
    [],
  );
});

test("no ruling that gives a card something is APPLIED without a card that shows it", () => {
  assert.deepEqual(
    all
      .filter(
        ({ kind, status, examples }) =>
          kind !== "MEANING" && status === "APPLIED" && !examples?.length,
      )
      .map(({ id }) => id),
    [],
  );
});

for (const { id, kind, status, examples } of all)
  for (const example of examples ?? [])
    test(`${id}: ${example.name} shows it at ${example.path}`, () => {
      assert.equal(status, "APPLIED");
      assert.equal(library.cardName(example.card), example.name);
      const card = read(example.card);
      assert.ok(card, "the card doesn't read");
      const value = valueAt(card, example.path);
      assert.notEqual(value, undefined, "nothing is there");
      if ("value" in example) assert.deepEqual(value, example.value);
      const tag = card.ruled?.find((tag) => tag.path === example.path);
      // What a ruling gives is tagged with it; what words mean is the text's own
      if (kind === "MEANING") assert.equal(tag, undefined);
      else
        assert.ok(tag?.rulings.includes(id), "no tag there names the ruling");
    });

test("a card's tags undone give the card as its text alone reads: read with no ruling that gives anything, on every card that reads", () => {
  const meanings = tcg.where(({ kind }) => kind === "MEANING");
  const different: string[] = [];
  let cards = 0;
  let tagged = 0;
  for (const code of library.cards()) {
    const card = read(code);
    if (!card) continue;
    cards++;
    if (card.ruled) tagged++;
    for (const tag of card.ruled ?? []) {
      assert.ok(
        valueAt(card, tag.path) !== undefined || tag.without !== undefined,
        `${card.name}: a tag at ${tag.path}, where nothing is`,
      );
      for (const id of tag.rulings)
        assert.ok(
          tcg.holds(id) && tcg.get(id).kind !== "MEANING",
          `${card.name}: tagged with ${id}`,
        );
    }
    const alone = read(code, meanings);
    assert.ok(alone, `${card.name} doesn't read without the rulings`);
    assert.equal(alone.ruled, undefined);
    if (
      JSON.stringify(written(textAlone(card))) !==
      JSON.stringify(written(alone))
    )
      different.push(`${code} ${card.name}`);
  }
  assert.deepEqual(different, []);
  // The cards that read when this was written (2026-11-17): fewer would mean the check checks less
  assert.ok(
    cards >= 1329 && tagged >= 1187,
    `${cards} cards read, ${tagged} of them tagged`,
  );
});

test("a ruling that doesn't hold gives nothing: in the OCG a TCG ruling's, and anywhere a ruling taken out", () => {
  const NEW_FACE = 6547248;
  assert.equal(read(NEW_FACE)!.effects![1].speed, 2);
  const without = read(
    NEW_FACE,
    tcg.where(({ id }) => id !== "a-traps-trigger-effects-are-spell-speed-2"),
  )!;
  assert.equal(without.effects![1].speed, 1);
  assert.ok(
    !without.ruled!.some((tag) =>
      tag.rulings.includes("a-traps-trigger-effects-are-spell-speed-2"),
    ),
  );
  // A Ritual Monster without its ruling is Normal Summoned as its Level says: one ruling's gift isn't another's
  const flair = read(
    42759961,
    tcg.where(({ id }) => id !== "ritual-monsters-are-ritual-summoned"),
  )!;
  assert.deepEqual(
    [
      flair.rules.cannotNormalSummon,
      flair.summons?.map(({ method }) => method),
    ],
    [false, ["NORMAL"]],
  );
});

// ---- what a ruling's file gives ----

const SCRAP_RECYCLER = 4334811;
/** The database's rulings and one more, as a region has them. */
const withRuling = (extra: Ruling, region: "OCG" | "TCG" = "TCG") =>
  new Rulings([...all, extra], region);
const giving = (gives: Ruling["gives"], rest: Partial<Ruling> = {}) =>
  ruling("a-test-ruling", { kind: "ADDITION", gives, ...rest });
const tagsOf = (card: CardSchema, id = "a-test-ruling") =>
  card.ruled!.filter((tag) => tag.rulings.includes(id));

test("a ruling gives what its file says: to the cards like its card, at each value like its where, what it sets and adds, tagged", () => {
  // Scrap Recycler's third effect is an Ignition Effect with a limit for this copy; its first two are its triggers
  const machines = {
    printed: { kind: "MONSTER", race: { $any: ["MACHINE", "ROCK"] } },
  };
  const once = giving([
    {
      card: machines,
      each: "effects/*",
      where: {
        kind: "IGNITION",
        limit: { shared: "COPY" },
        flags: null,
        cost: { $has: { move: "TO_DECK" } },
        $not: { mandatory: true },
      },
      sets: [
        { path: "speed", value: 3 },
        { path: "limit/count", value: 2 },
      ],
      adds: [
        { path: "flags", entry: "CANNOT_DISABLE" },
        { path: "requires", entry: { turn: "OWN" } },
      ],
    },
    // A name goes before one name or after another, where the list has that one
    {
      card: machines,
      each: "effects/0",
      adds: [
        { path: "flags", entry: "CARD_TARGET", before: "DAMAGE_STEP" },
        { path: "flags", entry: "UNCOPYABLE", after: "DAMAGE_STEP" },
      ],
    },
  ]);
  const plain = read(SCRAP_RECYCLER)!;
  const card = read(SCRAP_RECYCLER, withRuling(once))!;
  const [first, , third] = card.effects!;
  assert.deepEqual(
    [third.speed, third.limit!.count, third.flags, third.requires],
    [3, 2, ["CANNOT_DISABLE"], [{ turn: "OWN" }]],
  );
  assert.deepEqual(first.flags, ["CARD_TARGET", "DAMAGE_STEP", "UNCOPYABLE"]);
  assert.deepEqual(tagsOf(card), [
    { path: "effects/2/speed", rulings: ["a-test-ruling"], without: 1 },
    { path: "effects/2/limit/count", rulings: ["a-test-ruling"], without: 1 },
    { path: "effects/2/flags/CANNOT_DISABLE", rulings: ["a-test-ruling"] },
    { path: "effects/2/requires/0", rulings: ["a-test-ruling"] },
    { path: "effects/0/flags/CARD_TARGET", rulings: ["a-test-ruling"] },
    { path: "effects/0/flags/UNCOPYABLE", rulings: ["a-test-ruling"] },
  ]);
  // Its text alone reads as it did, and a card that isn't like the ruling's is as it was
  assert.deepEqual(written(textAlone(card)), written(textAlone(plain)));
  assert.deepEqual(read(42759961, withRuling(once)), read(42759961));
});

test("a where can ask what a move's cards are, wherever its effect says it ($pick)", () => {
  // Adamancipator Risen - Dragite: "excavate the top 5 cards of your Deck ... place the rest on the bottom": the last move names the first's pick
  const DRAGITE = 9464441;
  const bottom = giving([
    {
      each: "**",
      where: {
        move: "TO_DECK",
        from: null,
        $pick: { move: "REVEAL", from: { own: ["DECK"] } },
      },
      sets: [{ path: "times", value: 2 }],
    },
  ]);
  assert.deepEqual(tagsOf(read(DRAGITE, withRuling(bottom))!), [
    { path: "effects/0/does/2/moves/0/times", rulings: ["a-test-ruling"] },
  ]);
});

test("a ruling that gives what RML can't say stops the reading, as words it can't read do", () => {
  const unsaid = giving([
    {
      each: "effects/*",
      where: { kind: "IGNITION" },
      unsaid: "an Ignition Effect, for this test",
    },
  ]);
  assert.throws(
    () => konamiReader(library, SCRAP_RECYCLER, "test", [], withRuling(unsaid)),
    (error) =>
      error instanceof TextStop &&
      error.reason ===
        "ruling a-test-ruling: an Ignition Effect, for this test",
  );
  // Clown Crew New Face has no Ignition Effect
  assert.ok(read(6547248, withRuling(unsaid)));
});

// ---- rulings on named cards ----

const onCard = (
  sets: { path: string; value?: unknown }[],
  rest: Partial<Ruling> = {},
) =>
  ruling("scrap-recycler-ruled", {
    kind: "CARD",
    cards: [SCRAP_RECYCLER],
    gives: [{ sets }],
    ...rest,
  });

test("a CARD ruling gives its cards values in place of what their text reads as, tagged with that", () => {
  const plain = read(SCRAP_RECYCLER)!;
  assert.equal(plain.effects![2].targets, false);
  const card = read(
    SCRAP_RECYCLER,
    withRuling(
      onCard([
        { path: "effects/2/targets", value: true },
        { path: "effects/2/limit" },
      ]),
    ),
  )!;
  assert.equal(card.effects![2].targets, true);
  assert.equal(card.effects![2].limit, undefined);
  assert.deepEqual(tagsOf(card, "scrap-recycler-ruled"), [
    {
      path: "effects/2/targets",
      rulings: ["scrap-recycler-ruled"],
      without: false,
    },
    {
      path: "effects/2/limit",
      rulings: ["scrap-recycler-ruled"],
      without: plain.effects![2].limit,
    },
  ]);
  // Its text alone reads as it did
  assert.deepEqual(written(textAlone(card)), written(textAlone(plain)));
  // No other card is changed, nor this one where the ruling doesn't hold
  assert.deepEqual(
    read(
      42759961,
      withRuling(onCard([{ path: "effects/2/targets", value: true }])),
    ),
    read(42759961),
  );
  assert.deepEqual(
    read(
      SCRAP_RECYCLER,
      withRuling(
        onCard([{ path: "effects/2/targets", value: true }], { region: "TCG" }),
        "OCG",
      ),
    ),
    read(SCRAP_RECYCLER, rulingsFor("OCG")),
  );
});

test("a CARD ruling that gives what the text already reads as is warned of: the text has caught up, and the ruling can go", () => {
  const warnings: TextWarning[] = [];
  const card = read(
    SCRAP_RECYCLER,
    withRuling(onCard([{ path: "effects/2/targets", value: false }])),
    warnings,
  )!;
  assert.deepEqual(card, read(SCRAP_RECYCLER));
  assert.match(
    warnings[0].reason,
    /scrap-recycler-ruled sets effects\/2\/targets to what its text already reads as/,
  );
});

test("a CARD ruling that no longer fits its card as it reads is an error, not a stop: the ruling needs another look", () => {
  assert.throws(
    () =>
      konamiReader(
        library,
        SCRAP_RECYCLER,
        "test",
        [],
        withRuling(onCard([{ path: "effects/9/targets", value: true }])),
      ),
    (error) =>
      !(error instanceof TextStop) &&
      /scrap-recycler-ruled doesn't fit Scrap Recycler/.test(
        (error as Error).message,
      ),
  );
});

// ---- JSON-driven ADDITION & live-toggleable MEANING/WAITING rulings ----

const withStatus = (id: string, status: "APPLIED" | "WAITING", region: "OCG" | "TCG" = "TCG") =>
  new Rulings(
    all.map((r) => (r.id === id ? { ...r, status } : r)),
    region,
  );

test("core ADDITION rulings (Extra Deck, Ritual, Pendulum, Normal/Tribute Summon, Continuous/Field) are driven by JSON gives", () => {
  for (const id of [
    "extra-deck-monsters-are-summoned-properly-first",
    "ritual-monsters-are-ritual-summoned",
    "pendulum-monsters-are-pendulum-summoned",
    "monsters-are-normal-summoned-by-level",
    "continuous-and-field-cards-are-activated-first",
  ]) {
    assert.ok(tcg.get(id).gives?.length, `${id} should define gives in JSON`);
  }
  // Patissciel Couverture (Fusion Pendulum) still gets PENDULUM from EXTRA even with extra-deck ruling active
  const PATISSCIEL = 26435595;
  assert.deepEqual(
    read(PATISSCIEL)!.summons?.map(({ method, from }) => ({ method, from })),
    [
      { method: "FUSION", from: ["EXTRA"] },
      { method: "PENDULUM", from: ["EXTRA"] },
    ],
  );
  // Disabling pendulum-monsters-are-pendulum-summoned immediately drops PENDULUM
  assert.deepEqual(
    read(PATISSCIEL, withStatus("pendulum-monsters-are-pendulum-summoned", "WAITING"))!
      .summons?.map(({ method }) => method),
    ["FUSION"],
  );
  // Disabling continuous-and-field-cards-are-activated-first drops the activation from Clown Crew New Face
  const NEW_FACE = 6547248;
  const withoutAct = read(
    NEW_FACE,
    withStatus("continuous-and-field-cards-are-activated-first", "WAITING"),
  )!;
  assert.equal(withoutAct.effects![0].kind, "TRIGGER");
  // The Great Gallant Bandit keeps its text-only extraMaterials when monsters-are-normal-summoned-by-level is disabled
  const BANDIT = 24203749;
  const banditFull = read(BANDIT)!;
  const banditWithoutNormal = read(
    BANDIT,
    withStatus("monsters-are-normal-summoned-by-level", "WAITING"),
  )!;
  assert.equal(banditFull.summons![0].method, "TRIBUTE");
  assert.equal(banditWithoutNormal.summons![0].method, undefined);
  assert.ok(banditWithoutNormal.summons![0].extraMaterials?.length);
  assert.deepEqual(written(textAlone(banditFull)), written(textAlone(banditWithoutNormal)));
});

test("toggling MEANING and WAITING rulings in JSON immediately updates reader behavior", () => {
  // 1. Disabling a-tribute-set-is-a-tribute-summon drops the MSET twin from Clown Crew New Face
  const NEW_FACE = 6547248;
  assert.equal(
    read(NEW_FACE)!.effects!.some((e) => e.event === "MSET"),
    true,
  );
  assert.equal(
    read(NEW_FACE, withStatus("a-tribute-set-is-a-tribute-summon", "WAITING"))!
      .effects!.some((e) => e.event === "MSET"),
    false,
  );
  // 2. Flipping a-special-summon-from-the-deck-is-declared to APPLIED adds DECKDES to Special Summons from Deck
  const CONCOURS = 14283055;
  assert.ok(!read(CONCOURS)!.effects![0].categories?.includes("DECKDES"));
  assert.ok(
    read(CONCOURS, withStatus("a-special-summon-from-the-deck-is-declared", "APPLIED"))!
      .effects![0].categories?.includes("DECKDES"),
  );
  // 3. Flipping a-halved-atk-is-set-or-final to APPLIED switches halved ATK from SET_ATTACK_FINAL to SET_ATTACK
  const MEDICURIUS = 4063756;
  assert.ok(JSON.stringify(read(MEDICURIUS)!.effects![0]).includes("SET_ATTACK_FINAL"));
  const medicuriusApplied = read(
    MEDICURIUS,
    withStatus("a-halved-atk-is-set-or-final", "APPLIED"),
  )!;
  assert.ok(!JSON.stringify(medicuriusApplied.effects![0]).includes("SET_ATTACK_FINAL"));
  assert.ok(JSON.stringify(medicuriusApplied.effects![0]).includes('"SET_ATTACK"'));
  // 4. Disabling if-triggers-do-not-miss-timing removes DELAY
  const JUNOLDO = 10266279;
  assert.ok(read(JUNOLDO)!.effects![0].flags?.includes("DELAY"));
  assert.ok(
    !read(JUNOLDO, withStatus("if-triggers-do-not-miss-timing", "WAITING"))!
      .effects![0].flags?.includes("DELAY"),
  );
  // 5. Disabling activate-limits-are-oaths-use-limits-are-not and once-per-chain-activation-limits-are-by-name-and-oaths
  const SUCCESSION = 99674361;
  assert.equal(read(SUCCESSION)!.effects![0].limit?.oath, true);
  assert.equal(
    read(SUCCESSION, withStatus("activate-limits-are-oaths-use-limits-are-not", "WAITING"))!
      .effects![0].limit?.oath,
    false,
  );
  const FUTSU = 55397172;
  assert.equal(read(FUTSU)!.effects![0].limit?.oath, true);
  assert.equal(
    read(FUTSU, withStatus("once-per-chain-activation-limits-are-by-name-and-oaths", "WAITING"))!
      .effects![0].limit?.oath,
    false,
  );
  // 6. Disabling and-if-makes-what-follows-depend changes Number 90's link from AND_IF_YOU_DO to AND
  const NUMBER_90 = 8165596;
  assert.equal(read(NUMBER_90)!.effects![1].does![1].link, "AND_IF_YOU_DO");
  assert.equal(
    read(NUMBER_90, withStatus("and-if-makes-what-follows-depend", "WAITING"))!
      .effects![1].does![1].link,
    "AND",
  );
  // 7. Flipping tcg-a-tribute-set-is-a-normal-summon to APPLIED replaces the OCG rule in TCG only
  const appliedTcg = withStatus("tcg-a-tribute-set-is-a-normal-summon", "APPLIED", "TCG");
  const appliedOcg = withStatus("tcg-a-tribute-set-is-a-normal-summon", "APPLIED", "OCG");
  assert.equal(appliedTcg.holds("tcg-a-tribute-set-is-a-normal-summon"), true);
  assert.equal(appliedTcg.holds("a-tribute-set-is-not-a-normal-summon"), false);
  assert.equal(appliedOcg.holds("tcg-a-tribute-set-is-a-normal-summon"), false);
  assert.equal(appliedOcg.holds("a-tribute-set-is-not-a-normal-summon"), true);
});

test("simplified gives syntax supports object sets, unsets, $in/$lte/$gte/$exists and position: start with tag shifting", () => {
  const simplified = giving([
    {
      card: { printed: { level: { $gte: 1, $lte: 4 } } },
      each: "effects/*",
      where: { kind: { $in: ["IGNITION"] }, limit: { $exists: true } },
      sets: { speed: 3 },
      unsets: ["limit"],
    },
    {
      adds: [
        {
          path: "summons",
          position: "start",
          entry: { method: "SPECIAL", from: ["HAND"] },
        },
      ],
    },
  ]);
  const plain = read(SCRAP_RECYCLER)!;
  const card = read(SCRAP_RECYCLER, withRuling(simplified))!;
  assert.equal(card.effects![2].speed, 3);
  assert.equal(card.effects![2].limit, undefined);
  assert.equal(card.summons![0].method, "SPECIAL");
  assert.equal(card.summons![1].method, "NORMAL");
  // Existing tag on NORMAL shifted from summons/0 to summons/1 cleanly, so textAlone still matches plain
  assert.deepEqual(written(textAlone(card)), written(textAlone(plain)));
});
