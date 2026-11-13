import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { DEFAULT_PATHS, openLibrary, type Library } from "./lib/library.js";
import { buildCard, complete, type CardBuild } from "./pipeline.js";

const RML_DIR = "cards";
const YGOPRO_DIR = "RML_scripts/ygopro";

/** Terminal colours, left out when NO_COLOR is set (no-color.org). */
const paint = (code: string) => (text: string) => (process.env.NO_COLOR || !text ? text : `\x1b[${code}m${text}\x1b[0m`);
const green = paint("32");
const red = paint("31");
/** The words a stage stopped at: bold, underlined red. */
const cause = paint("1;4;31");
/** Card text has Windows line endings; a terminal shows \r as going back to the line's start. */
const lines = (text: string) => text.replace(/\r\n/g, "\n");

const USAGE = `Usage:
  npm run build   -- [<card>...] [--archetype NAME]
      Reads each card's text into RML and writes a YGOPro script from it: ${RML_DIR}/<code>.json
      for each card described completely, ${YGOPRO_DIR}/c<code>.lua for each that needs a script.
      A file is only ever complete: a card with anything not handled gets none.
  npm run report  -- [<card>...] [--archetype NAME]
      How many cards get through each stage, and what stops the most of them; with cards
      or an archetype given, a line for each card too, saying where its reading stopped.
  npm run inspect -- <card>
      One card at every stage: its text, green as far as the reader got and red from where it
      stopped, the stage and reason it stopped, its RML, our script and MyCard's, and what each
      registers in the engine.

A card is given by its code, its name, or part of its name; with none, every card
(alternate artworks and Tokens left out). --archetype keeps those of an archetype, by its
name in strings.conf or its code in hex (0x115).

Data:
  --scripts DIR      MyCard's card scripts    (default ${DEFAULT_PATHS.scripts})
  --database FILE    cards.cdb                (default ${DEFAULT_PATHS.database})
  --strings FILE     strings.conf             (default ${DEFAULT_PATHS.strings})
  --archetypes FILE  corrections to its archetype names (default ${DEFAULT_PATHS.archetypes})`;

const COMMANDS = ["build", "report", "inspect"];

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    archetype: { type: "string" },
    scripts: { type: "string", default: DEFAULT_PATHS.scripts },
    database: { type: "string", default: DEFAULT_PATHS.database },
    strings: { type: "string", default: DEFAULT_PATHS.strings },
    archetypes: { type: "string", default: DEFAULT_PATHS.archetypes },
    help: { type: "boolean", short: "h" },
  },
});
const [command, ...names] = positionals;
if (values.help || !COMMANDS.includes(command ?? "") || (command === "inspect" && names.length !== 1)) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 1);
}

const library = await openLibrary({ scripts: values.scripts!, database: values.database!, strings: values.strings!, archetypes: values.archetypes! });
const codes = select(library, names, values.archetype);
if (command === "build") build(codes);
else if (command === "report") report(codes, Boolean(names.length || values.archetype));
else inspect(codes);

// ---- choosing cards ----

/** The cards named (by code, name or part of a name; every card when none is), kept to an archetype's when one is given. */
function select(library: Library, names: string[], archetype: string | undefined): number[] {
  const all = library.cards();
  let codes = names.length ? [...new Set(names.flatMap((name) => named(library, all, name)))] : all;
  if (archetype !== undefined) {
    const set = library.archetypeCode(archetype);
    if (set === null) fail(`No archetype named "${archetype}" in strings.conf`);
    // Four archetypes of 16 bits each, split by SQLite: a JavaScript number can't hold all 64 bits
    const rows = library.db.exec(
      "SELECT id, setcode & 65535, (setcode >> 16) & 65535, (setcode >> 32) & 65535, (setcode >> 48) & 65535 FROM datas",
    )[0]?.values;
    const setcodes = new Map((rows ?? []).map(([id, ...four]) => [Number(id), four.map(Number)]));
    codes = codes.filter((code) => (setcodes.get(code) ?? []).some((setcode) => isSetCard(setcode, set)));
  }
  if (!codes.length) fail("No cards chosen");
  return codes;
}

/** A card by its code, by its whole name (any case), or every card whose name contains the text. */
function named(library: Library, all: number[], name: string): number[] {
  if (/^\d+$/.test(name)) return [Number(name)];
  const cards = all.map((code) => ({ code, name: library.cardName(code).toLowerCase() }));
  const wanted = name.toLowerCase();
  const exact = cards.filter((card) => card.name === wanted);
  const found = exact.length ? exact : cards.filter((card) => card.name.includes(wanted));
  if (!found.length) fail(`No card named like "${name}"`);
  return found.map((card) => card.code);
}

/** ocgcore's IsSetCard, for one of a card's archetypes: set's, or a sub-archetype of it ("Sky Striker Ace" 0x1115 is "Sky Striker" 0x115). */
function isSetCard(setcode: number, set: number) {
  return setcode !== 0 && (setcode & 0xfff) === (set & 0xfff) && (setcode & set & 0xf000) === (set & 0xf000);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// ---- build ----

/**
 * Writes each card's RML and script. Only a complete card gets a file; one
 * that no longer reads loses the file an earlier build gave it. The release
 * read from scripts (files with a scriptHash) is kept until its cards are read
 * from text, which replaces them one by one.
 */
function build(codes: number[]) {
  mkdirSync(RML_DIR, { recursive: true });
  mkdirSync(YGOPRO_DIR, { recursive: true });
  let described = 0;
  let scripts = 0;
  let noScript = 0;
  for (const code of codes) {
    const card = buildCard(library, code, { check: false });
    const rmlFile = join(RML_DIR, `${code}.json`);
    const scriptFile = join(YGOPRO_DIR, `c${code}.lua`);
    if (!complete(card)) {
      if (existsSync(rmlFile) && JSON.parse(readFileSync(rmlFile, "utf8")).source?.textHash) rmSync(rmlFile);
    } else {
      writeFileSync(rmlFile, JSON.stringify(card.rml, null, 1) + "\n");
      described++;
    }
    if (typeof card.ygopro === "string") {
      writeFileSync(scriptFile, card.ygopro);
      scripts++;
    } else rmSync(scriptFile, { force: true });
    if (card.ygopro === null) noScript++;
  }
  console.log(
    `${codes.length} cards: ${described} read completely (${RML_DIR}/), ${scripts} scripts written (${YGOPRO_DIR}/), ` +
      `${noScript} need no script. npm run report says what stops the rest.`,
  );
}

// ---- showing how far a card got ----

/** Where reading stopped, in words: "names, in the monster effect: no card or archetype is named "Hyenas"". */
function stopped(card: CardBuild): string | undefined {
  if (card.error) return `the reader threw: ${card.error}`;
  if (card.stop) return card.stop.message;
}

/** A card's progress in a word or two for each stage it reached: "STOPPED at names", "READ NO_SCRIPT MATCHES". */
function status(card: CardBuild): string {
  if (!complete(card)) return red(`STOPPED at ${card.stop?.stage ?? "the reader"}`);
  const words = [green("READ")];
  if (card.ygopro !== undefined) words.push(card.ygopro === null ? "NO_SCRIPT" : "WRITTEN");
  if (card.check) words.push(card.check.status === "MATCHES" ? green("MATCHES") : red(card.check.status));
  return words.join(" ");
}

/**
 * Each part of the text, green as far as the reader got and red from where it stopped, with the words it
 * stopped at underlined. A part is shown as the stage that stopped was given it: with its names replaced
 * by codes once the names stage has read it.
 */
function showReading(card: CardBuild): string {
  const stop = card.stop;
  if (!stop) return (complete(card) ? green : red)(lines(library.cardText(card.code)));
  return stop.parts
    .map((part, i) => {
      const text = part.replaced ?? part.text;
      const label = `[${part.label}]`;
      if (i < stop.part || part.flavor) return `${label}\n${green(lines(text))}`;
      if (i > stop.part) return `${label} (not reached)\n${red(lines(text))}`;
      const end = stop.at + stop.length;
      return `${label}\n${green(lines(text.slice(0, stop.at)))}${cause(lines(text.slice(stop.at, end)))}${red(lines(text.slice(end)))}`;
    })
    .join("\n\n");
}

// ---- report ----

function report(codes: number[], listEach: boolean) {
  const cards = codes.map((code) => buildCard(library, code, { check: true }));
  if (listEach)
    for (const card of cards) console.log([card.code, card.name, status(card), stopped(card)].filter(Boolean).join("\t"));
  const count = (keep: (card: CardBuild) => boolean) => cards.filter(keep).length;
  const line = (n: number, what: string) =>
    `  ${String(n).padStart(6)}  ${((100 * n) / cards.length).toFixed(1).padStart(5)}%  ${what}`;
  console.log(`\n${cards.length} cards`);
  console.log(line(count(complete), "text → RML: read completely"));
  console.log(
    line(count((card) => card.ygopro !== undefined), `RML → YGOPro: written (${count((card) => card.ygopro === null)} need no script)`),
  );
  console.log(line(count((card) => card.check?.status === "MATCHES"), "register what MyCard's script registers"));
  const differ = count((card) => card.check?.status === "DIFFERS");
  const errors = count((card) => card.check?.status === "ENGINE_ERROR");
  if (differ || errors) console.log(`          (${differ} register differently, ${errors} gave an engine error: npm run inspect)`);
  // What stops the most cards: the stage and its reason, with the part left out, so a reason counts across parts
  const counts = new Map<string, number>();
  for (const card of cards) {
    const stop = card.stop;
    const what = card.error ? `the reader threw: ${card.error}` : stop && `${stop.stage}: ${stop.reason}`;
    if (what) counts.set(what, (counts.get(what) ?? 0) + 1);
  }
  if (!counts.size) return;
  console.log("\nWhat stops the most cards reading:");
  for (const [what, n] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`  ${String(n).padStart(6)}  ${what}`);
}

// ---- inspect ----

function inspect(codes: number[]) {
  if (codes.length > 1) {
    console.log(codes.map((code) => `${code}\t${library.cardName(code)}`).join("\n"));
    fail(`${codes.length} cards are named like that: give one, by its code or its whole name`);
  }
  const [code] = codes;
  const card = buildCard(library, code, { check: true });
  const section = (title: string, body: string) => console.log(`\n--- ${title}\n${body.trimEnd()}`);
  console.log(`=== ${card.name} (${code}): ${status(card)}`);
  section(`Text (${green("green")}: read, ${red("red")}: not)`, showReading(card));
  const stop = stopped(card);
  if (stop) section("Stopped at", stop);
  if (card.rml) section("RML", JSON.stringify(card.rml, null, 1));
  if (card.ygopro !== undefined) section("Our YGOPro script", card.ygopro ?? "(none: the card needs no script)");
  const theirs = library.script(`c${code}.lua`);
  section(`MyCard's script (${values.scripts}/c${code}.lua)`, theirs || "(none)");
  if (card.check) {
    section("What MyCard's registers", card.check.official.join("\n") || "(nothing)");
    section("What ours registers", card.check.ours.join("\n") || "(nothing)");
    section(`Check: ${card.check.status}`, card.check.differences.join("\n"));
  }
}
