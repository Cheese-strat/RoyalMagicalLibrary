import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { convert } from "./convert.js";
import { parseArgs } from "node:util";
import { cardText } from "./format.js";
import { DEFAULT_PATHS, openLibrary, type Library } from "./library.js";
import { readCard } from "./readCard.js";
import { survey } from "./survey.js";
import { textCheck } from "./textCheck.js";

const USAGE = `Usage:
  npm run read -- <card>... [--json]     a card by code or by (part of) its name; --json in the schema's format
  npm run export -- [<card>...] [--out DIR]
                                         every card (or these) in the schema's format, one JSON file each (default cards/)
  npm run survey -- [--out DIR]          every card: how much is read, written to DIR (default survey/)
  npm run text-check -- [--out DIR]      every card: where its script and its text may differ, written to DIR (default survey/)

Data options (for both):
  --scripts DIR      card scripts           (default ${DEFAULT_PATHS.scripts})
  --database FILE    cards.cdb              (default ${DEFAULT_PATHS.database})
  --strings FILE     strings.conf           (default ${DEFAULT_PATHS.strings})`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: "boolean" },
    out: { type: "string" },
    scripts: { type: "string", default: DEFAULT_PATHS.scripts },
    database: { type: "string", default: DEFAULT_PATHS.database },
    strings: { type: "string", default: DEFAULT_PATHS.strings },
    help: { type: "boolean", short: "h" },
  },
});
const [command, ...cards] = positionals;
if (values.help || !["read", "export", "survey", "text-check"].includes(command ?? "")) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 1);
}

const library = await openLibrary({ scripts: values.scripts!, database: values.database!, strings: values.strings! });
const out = values.out ?? (command === "export" ? "cards" : "survey");

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
