import { execSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { konamiReader, TextStop } from "./builders/konamiReader.js";
import { ygoproWriter, type Written } from "./builders/ygoproWriter.js";
import { checkScript, type Check } from "./check.js";
import type { CardSchema } from "./lib/cardSchema.js";
import type { Library } from "./lib/library.js";

/**
 * One card through every stage, each run only when the one before it is
 * complete: Konami's text → RML → a YGOPro script → that script against
 * MyCard's. build, report and inspect all take a card through here, so they
 * can't disagree about one.
 */
export interface CardBuild {
  code: number;
  name: string;
  /** The description read from the text, when all of it was read. */
  rml?: CardSchema;
  /** Where reading the text stopped, when it did. */
  stop?: TextStop;
  /** Anything else the reader threw, for a card whose data it can't take at all (a Pendulum's scale that isn't its text's). */
  error?: string;
  /** The script written from rml, when its text is read completely: null when the card needs none. */
  ygopro?: Written;
  /** Our script against MyCard's, when it is written and the check is asked for (it runs the engine). */
  check?: Check;
}

/** Whether the card's text was read completely, so it is built into a file. */
export const complete = (card: CardBuild) => card.rml !== undefined;

export function buildCard(library: Library, code: number, options: { check: boolean }): CardBuild {
  const build: CardBuild = { code, name: library.cardName(code) };
  try {
    build.rml = konamiReader(library, code, readerVersion());
  } catch (error) {
    if (error instanceof TextStop) build.stop = error;
    else build.error = error instanceof Error ? error.message : String(error);
    return build;
  }
  build.ygopro = ygoproWriter(build.rml!, code);
  if (options.check && build.ygopro !== undefined) build.check = checkScript(library, code, build.ygopro);
  return build;
}

let version: string | undefined;

/** RML's commit, with "+changes" when its code has changes not committed: which reader built a card. */
export function readerVersion(): string {
  const git = (args: string) =>
    execSync(`git ${args}`, { cwd: dirname(fileURLToPath(import.meta.url)) })
      .toString()
      .trim();
  return (version ??= `${git("rev-parse --short HEAD")}${git("status --porcelain -- .") ? "+changes" : ""}`);
}
