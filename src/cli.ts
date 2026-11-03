import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { convert } from "./convert.js";
import { parseArgs } from "node:util";
import { cardText } from "./format.js";
import { DEFAULT_PATHS, openLibrary, type Library } from "./library.js";
import { readCard } from "./readCard.js";
import { survey } from "./survey.js";
import { textCheck } from "./textCheck.js";
import { compareAll, compareCard, readTextScript, textScript } from "./textScript.js";
import type { CardSchema } from "./cardSchema.js";
import { ENGINES, type Engine } from "./write/dialects.js";
import { scriptWriter, type WriteStatus } from "./write/survey.js";

const USAGE = `Usage:
  npm run read -- <card>... [--json]     a card by code or by (part of) its name; --json in the schema's format
  npm run export -- [<card>...] [--out DIR]
                                         every card (or these) in the schema's format, one JSON file each (default cards/)
  npm run survey -- [--out DIR]          every card: how much is read, written to DIR (default survey/)
  npm run text-check -- [--out DIR]      every card: where its script and its text may differ, written to DIR (default survey/)
  npm run script -- <card>... [--read]   the script written from a card's text, or what of its text isn't read yet;
                                         --read: the reader's records of it instead
  npm run compare -- [<card>...] [--out DIR]
                                         a card's two readings, its script's and its text's, and where they differ;
                                         with no card, every card, written to DIR (default survey/)
  npm run write -- [<card>...] [--engine ygopro|edopro|omega] [--out DIR]
                                         each card's script for each engine (or one), written from its
                                         description (cards/<code>.json) into DIR/<engine>/c<code>.lua
                                         (default scripts/); what isn't written yet, and why, in survey/

Data options (for both):
  --scripts DIR      card scripts           (default ${DEFAULT_PATHS.scripts})
  --database FILE    cards.cdb              (default ${DEFAULT_PATHS.database})
  --strings FILE     strings.conf           (default ${DEFAULT_PATHS.strings})`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: "boolean" },
    read: { type: "boolean" },
    out: { type: "string" },
    engine: { type: "string" },
    scripts: { type: "string", default: DEFAULT_PATHS.scripts },
    database: { type: "string", default: DEFAULT_PATHS.database },
    strings: { type: "string", default: DEFAULT_PATHS.strings },
    help: { type: "boolean", short: "h" },
  },
});
const [command, ...cards] = positionals;
if (values.help || !["read", "export", "survey", "text-check", "script", "compare", "write"].includes(command ?? "")) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 1);
}

const library = await openLibrary({ scripts: values.scripts!, database: values.database!, strings: values.strings! });
const out = values.out ?? (command === "export" ? "cards" : command === "write" ? "scripts" : "survey");

/** This reader's commit, and "+changes" when its code has changes not committed: which reader made an export. */
function readerVersion() {
  const git = (args: string) => execSync(`git ${args}`, { cwd: dirname(fileURLToPath(import.meta.url)) }).toString().trim();
  return `${git("rev-parse --short HEAD")}${git("status --porcelain -- .") ? "+changes" : ""}`;
}

/** A card given as a code, or every card whose name contains the text. */
function cardCodes(library: Library, card: string): number[] {
  if (/^\d+$/.test(card)) return [Number(card)];
  const rows = library.db.exec(
    "SELECT d.id FROM datas d JOIN texts t ON t.id = d.id WHERE d.alias = 0 AND t.name LIKE ? ORDER BY t.name",
    [`%${card}%`],
  );
  const codes = (rows[0]?.values ?? []).map(([id]) => Number(id));
  if (!codes.length) console.error(`No card named like "${card}"`);
  return codes;
}

if (command === "read") {
  const read = cards.flatMap((card) => cardCodes(library, card)).map((code) => readCard(library, code));
  if (values.json) {
    const version = readerVersion();
    const schemas = read.map((card) => convert(library, card, version));
    console.log(JSON.stringify(schemas.length === 1 ? schemas[0] : schemas, null, 1));
  } else console.log(read.map(cardText).join("\n\n"));
} else if (command === "export") {
  const codes = cards.length ? cards.flatMap((card) => cardCodes(library, card)) : library.cardsWithScripts();
  const version = readerVersion();
  mkdirSync(out, { recursive: true });
  let effects = 0;
  let readEffects = 0;
  let readCards = 0;
  for (const [i, code] of codes.entries()) {
    if (i % 1000 === 0) console.error(`${i}/${codes.length}`);
    const card = convert(library, readCard(library, code), version);
    const unread = (card.effects ?? []).map((effect) => effect.unread?.length ?? 0);
    effects += unread.length;
    readEffects += unread.filter((n) => n === 0).length;
    if (unread.every((n) => n === 0) && (card.summons ?? []).every((summon) => !summon.unread?.length)) readCards++;
    writeFileSync(join(out, `${code}.json`), JSON.stringify(card, null, 1) + "\n");
  }
  console.log(`${codes.length} cards written to ${out}/, by reader ${version}`);
  console.log(`effects with nothing unread: ${readEffects} of ${effects}; cards with nothing unread: ${readCards}`);
} else if (command === "script") {
  for (const code of cards.flatMap((card) => cardCodes(library, card))) {
    const { card, script } = textScript(library, code);
    console.log(`=== ${library.cardName(code)} (${code})`);
    for (const sentence of card.skipped) console.log(`skipped:  ${sentence}`);
    for (const { sentence, at } of card.unparsed) console.log(`not read: ${sentence}\n    at: ${at}`);
    if (script) console.log(values.read ? cardText(readTextScript(library, code, script)) : script);
  }
} else if (command === "compare" && cards.length) {
  const version = readerVersion();
  for (const code of cards.flatMap((card) => cardCodes(library, card))) {
    const comparison = compareCard(library, code, version);
    const { name, status, scriptUnread, text, differences } = comparison;
    const { wording } = comparison;
    console.log(`=== ${name} (${code}): ${status}${scriptUnread ? " (its script has something unread)" : ""}${wording === "old" ? " (old wording)" : ""}`);
    for (const { sentence, at } of text.card.unparsed) console.log(`not read: ${sentence}\n    at: ${at}`);
    for (const d of differences) {
      const where = `effect ${d.text ?? "-"} of the text, ${d.script ?? "-"} of the script`;
      if (!d.path) console.log(`  ${where}: only in the ${d.text ? "text" : "script"} (${d.textValue ?? d.scriptValue})`);
      else console.log(`  ${where}: ${d.path}\n      text:   ${JSON.stringify(d.textValue)}\n      script: ${JSON.stringify(d.scriptValue)}`);
    }
  }
} else if (command === "compare") {
  const result = compareAll(library, readerVersion(), (done, total) => console.error(`${done}/${total}`));
  mkdirSync(out, { recursive: true });
  writeFileSync(
    join(out, "compare.tsv"),
    ["code\tname\tstatus\tscript\twording\teffects (text/script)\tpath\ttext\tscript", ...result.rows].join("\n") + "\n",
  );
  writeFileSync(
    join(out, "unparsed.tsv"),
    ["cards\twhere reading stopped\texample", ...result.unparsed.map(([p, n, example]) => `${n}\t${p}\t${example}`)].join("\n") + "\n",
  );
  writeFileSync(join(out, "compare-failed.tsv"), ["code\tname\terror", ...result.failures].join("\n") + "\n");
  console.log("status         cards   (of those, with their own script fully read)");
  for (const status of Object.keys(result.counts) as (keyof typeof result.counts)[]) {
    // The card's own script is only read for a comparison
    const read = status === "NO_EFFECTS" || status === "UNPARSED" ? "" : `(${result.readCounts[status]})`;
    console.log(`${status.padEnd(15)}${String(result.counts[status]).padEnd(8)}${read}`);
  }
  console.log(`failed         ${result.failures.length}`);
  console.log(`written to ${out}/: compare.tsv, unparsed.tsv, compare-failed.tsv`);
} else if (command === "write") {
  const engines = values.engine ? [values.engine as Engine] : ENGINES;
  if (engines.some((engine) => !ENGINES.includes(engine))) throw new Error(`No engine ${values.engine}: ${ENGINES.join(", ")}`);
  const all = !cards.length;
  const codes = all
    ? readdirSync("cards").filter((f) => f.endsWith(".json")).map((f) => Number(f.slice(0, -5))).sort((a, b) => a - b)
    : cards.flatMap((card) => cardCodes(library, card));
  const write = scriptWriter(library, engines);
  // A full run replaces each engine's scripts, so none is left from a card no longer written
  for (const engine of engines) {
    if (all) rmSync(join(out, engine), { recursive: true, force: true });
    mkdirSync(join(out, engine), { recursive: true });
  }
  const counts = new Map(engines.map((engine) => [engine, new Map<WriteStatus, number>()]));
  const rows: string[] = [];
  for (const [i, code] of codes.entries()) {
    if (all && i % 1000 === 0) console.error(`${i}/${codes.length}`);
    const path = join("cards", `${code}.json`);
    if (!existsSync(path)) {
      console.error(`No description of ${code} (${path})`);
      continue;
    }
    const card = JSON.parse(readFileSync(path, "utf8")) as CardSchema;
    for (const result of write(card)) {
      const count = counts.get(result.engine)!;
      count.set(result.status, (count.get(result.status) ?? 0) + 1);
      if (result.script) writeFileSync(join(out, result.engine, `c${code}.lua`), result.script);
      else rows.push([code, card.name, result.engine, result.status, result.reasons.join("; ")].join("\t"));
      if (!all && !result.script) console.log(`${card.name} (${code}), ${result.engine}: ${result.status}\n  ${result.reasons.join("\n  ")}`);
    }
  }
  if (all) {
    mkdirSync("survey", { recursive: true });
    writeFileSync(join("survey", "unwritten.tsv"), ["code\tname\tengine\tstatus\twhy", ...rows].join("\n") + "\n");
  }
  for (const [engine, count] of counts) console.log(`${engine.padEnd(8)}${[...count].map(([status, n]) => `${status} ${n}`).join(", ")}`);
  console.log(`scripts in ${out}/<engine>/${all ? "; what isn't written, and why, in survey/unwritten.tsv" : ""}`);
} else if (command === "text-check") {
  const result = textCheck(library, (done, total) => console.error(`${done}/${total}`));
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "text.tsv"), ["code\tname\tread\twording\tlabel\tdifference", ...result.rows].join("\n") + "\n");
  console.log("label             only in text   only in script   (of those, cards with every valued part read)");
  for (const { label, textOnly, scriptOnly, textOnlyRead, scriptOnlyRead } of result.summary) {
    const both = `${textOnly} (${textOnlyRead})`.padEnd(15) + `${scriptOnly} (${scriptOnlyRead})`;
    console.log(`${label.padEnd(18)}${both}`);
  }
  console.log(`written to ${out}/text.tsv`);
} else {
  const result = survey(library, (done, total) => console.error(`${done}/${total}`));
  mkdirSync(out, { recursive: true });
  writeFileSync(
    join(out, "cards.tsv"),
    ["code\tname\tread\tunread per part", ...result.rows].join("\n") + "\n",
  );
  writeFileSync(join(out, "failed.tsv"), ["code\tname\terror", ...result.failures].join("\n") + "\n");
  writeFileSync(
    join(out, "patterns.tsv"),
    ["cards\tunread pattern", ...result.patterns.map(([pattern, n]) => `${n}\t${pattern}`)].join("\n") + "\n",
  );
  const read = result.cards - result.failures.length;
  const percent = (n: number) => `${((100 * n) / read).toFixed(1)}%`;
  console.log(`${result.cards} cards with a script, ${result.failures.length} failed`);
  console.log(`every valued part read: ${result.valuedClean} (${percent(result.valuedClean)})`);
  console.log(`everything read:        ${result.clean} (${percent(result.clean)})`);
  console.log(`written to ${out}/: cards.tsv, failed.tsv, patterns.tsv`);
}
