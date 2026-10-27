import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { cardText } from "./format.js";
import { DEFAULT_PATHS, openLibrary, type Library } from "./library.js";
import { readCard } from "./readCard.js";
import { survey } from "./survey.js";
import { textCheck } from "./textCheck.js";

const USAGE = `Usage:
  npm run read -- <card>... [--json]     a card by code or by (part of) its name
  npm run survey -- [--out DIR]          every card: how much is read, written to DIR (default survey/)
  npm run text-check -- [--out DIR]      every card: where its script and its text may differ, written to DIR

Data options (for both):
  --scripts DIR      card scripts           (default ${DEFAULT_PATHS.scripts})
  --database FILE    cards.cdb              (default ${DEFAULT_PATHS.database})
  --strings FILE     strings.conf           (default ${DEFAULT_PATHS.strings})`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: "boolean" },
    out: { type: "string", default: "survey" },
    scripts: { type: "string", default: DEFAULT_PATHS.scripts },
    database: { type: "string", default: DEFAULT_PATHS.database },
    strings: { type: "string", default: DEFAULT_PATHS.strings },
    help: { type: "boolean", short: "h" },
  },
});
const [command, ...cards] = positionals;
if (values.help || !["read", "survey", "text-check"].includes(command ?? "")) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 1);
}

const library = await openLibrary({ scripts: values.scripts!, database: values.database!, strings: values.strings! });

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
  console.log(
    values.json ? JSON.stringify(read.length === 1 ? read[0] : read, null, 2) : read.map(cardText).join("\n\n"),
  );
} else if (command === "text-check") {
  const result = textCheck(library, (done, total) => console.error(`${done}/${total}`));
  mkdirSync(values.out!, { recursive: true });
  writeFileSync(join(values.out!, "text.tsv"), ["code\tname\tread\twording\tlabel\tdifference", ...result.rows].join("\n") + "\n");
  console.log("label             only in text   only in script   (of those, cards with every valued part read)");
  for (const { label, textOnly, scriptOnly, textOnlyRead, scriptOnlyRead } of result.summary) {
    const both = `${textOnly} (${textOnlyRead})`.padEnd(15) + `${scriptOnly} (${scriptOnlyRead})`;
    console.log(`${label.padEnd(18)}${both}`);
  }
  console.log(`written to ${values.out}/text.tsv`);
} else {
  const result = survey(library, (done, total) => console.error(`${done}/${total}`));
  mkdirSync(values.out!, { recursive: true });
  writeFileSync(
    join(values.out!, "cards.tsv"),
    ["code\tname\tread\tunread per part", ...result.rows].join("\n") + "\n",
  );
  writeFileSync(join(values.out!, "failed.tsv"), ["code\tname\terror", ...result.failures].join("\n") + "\n");
  writeFileSync(
    join(values.out!, "patterns.tsv"),
    ["cards\tunread pattern", ...result.patterns.map(([pattern, n]) => `${n}\t${pattern}`)].join("\n") + "\n",
  );
  const read = result.cards - result.failures.length;
  const percent = (n: number) => `${((100 * n) / read).toFixed(1)}%`;
  console.log(`${result.cards} cards with a script, ${result.failures.length} failed`);
  console.log(`every valued part read: ${result.valuedClean} (${percent(result.valuedClean)})`);
  console.log(`everything read:        ${result.clean} (${percent(result.clean)})`);
  console.log(`written to ${values.out}/: cards.tsv, failed.tsv, patterns.tsv`);
}
