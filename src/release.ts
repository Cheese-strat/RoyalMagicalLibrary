import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DEFAULT_PATHS } from "./lib/library.js";
import type { CardSchema } from "./lib/cardSchema.js";

/**
 * A release of RML's cards for the engines that read them (Sangan): one zip, release/rml-<commit>.zip, of
 *   cards/<code>.json  every card described completely,
 *   cardSchema.ts      the format they are in,
 *   release.json       what built them (Release).
 * An engine pins a release by the zip's sha256, so it changes only when the engine asks for a new one, and git there
 * sees one line change, not every card.
 *
 * A release names one reader: every card has to have been built by the same committed RML (source.readerVersion with
 * no "+changes"), and the schema has to be that commit's, so the cards and their format always match. Run
 * `npm run build` from a clean commit first.
 *
 * Uploading is by hand: attach the zip to a GitHub release, then give the engine its URL and sha256.
 */

const CARDS = "cards";
const SCHEMA = "src/lib/cardSchema.ts";
const OUT = "release";

/** release.json: what a release's cards were built by and from. */
export interface Release {
  /** The RML commit that read every card. */
  rml: string;
  cards: number;
  /** The card data commits the cards were read from: a card's scriptHash is of a script in that scripts commit. */
  scripts: string;
  database: string;
  built: string;
}

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const files = readdirSync(CARDS)
  .filter((file) => file.endsWith(".json"))
  .sort();
if (!files.length) fail(`No cards in ${CARDS}/: run npm run build first.`);

const byReader = new Map<string, string[]>();
for (const file of files) {
  const card = JSON.parse(readFileSync(join(CARDS, file), "utf8")) as CardSchema;
  const reader = card.source.readerVersion;
  byReader.set(reader, [...(byReader.get(reader) ?? []), file]);
}
const readers = [...byReader.keys()];
if (readers.length > 1)
  fail(`The cards were built by ${readers.length} readers (${readers.map((r) => `${r}: ${byReader.get(r)!.length}`).join(", ")}): a release is one reader's. Rebuild every card.`);
const rml = readers[0];
if (rml.endsWith("+changes")) fail(`The cards were built by RML ${rml}, with code not committed: commit, then rebuild every card.`);
if (git("status", "--porcelain", "--", SCHEMA) || git("diff", "--name-only", rml, "--", SCHEMA))
  fail(`${SCHEMA} isn't the one RML ${rml} wrote the cards in: rebuild every card.`);

const release: Release = {
  rml,
  cards: files.length,
  scripts: git("-C", DEFAULT_PATHS.scripts, "rev-parse", "HEAD"),
  database: git("-C", resolve(DEFAULT_PATHS.database, "../../.."), "rev-parse", "HEAD"),
  built: new Date().toISOString(),
};

const stage = mkdtempSync(join(tmpdir(), "rml-release-"));
try {
  mkdirSync(join(stage, "cards"));
  for (const file of files) copyFileSync(join(CARDS, file), join(stage, "cards", file));
  copyFileSync(SCHEMA, join(stage, "cardSchema.ts"));
  writeFileSync(join(stage, "release.json"), JSON.stringify(release, null, 1) + "\n");
  mkdirSync(OUT, { recursive: true });
  const zip = resolve(OUT, `rml-${rml}.zip`);
  rmSync(zip, { force: true });
  execFileSync("zip", ["-q", "-r", "-X", zip, "cards", "cardSchema.ts", "release.json"], { cwd: stage });
  const sha256 = createHash("sha256").update(readFileSync(zip)).digest("hex");
  console.log(`${zip}: ${files.length} cards, ${(statSync(zip).size / 1e6).toFixed(1)} MB`);
  console.log(`sha256 ${sha256}`);
  console.log(`Attach it to a GitHub release, then put its URL and sha256 in Sangan's data/rml.json.`);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
