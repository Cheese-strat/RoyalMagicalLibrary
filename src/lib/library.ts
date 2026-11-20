import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import initSqlJs, { type Database } from "sql.js";
import {
  createOcgcoreWrapper,
  DirScriptReader,
  SqljsCardReader,
  type OcgcoreWrapper,
  type ScriptReaderFn,
} from "koishipro-core.js";
import { Constants } from "./constants.js";
import type { Region } from "./rulingSchema.js";
import { loadRulings, Rulings } from "./rulings.js";

/**
 * Where the card data is. Use MyCard's scripts and database together
 * (Fluorohydride/ygopro-scripts and mycard/ygopro-database): ProjectIgnis
 * scripts crash this engine, and other databases number archetypes differently.
 */
export interface DataPaths {
  /** The folder of card scripts (c<code>.lua), with constant.lua and utility.lua. */
  scripts: string;
  /** The card database (cards.cdb): each card's printed data and its text. */
  database: string;
  /** strings.conf, for archetype names. */
  strings: string;
  /** RML's corrections to strings.conf's archetype names (archetypes.conf). */
  archetypes: string;
  /** Folder of ruling JSON files, loaded and validated on startup. */
  rulings?: string;
  /** Region whose rulings hold: TCG (default, OCG + TCG overrides) or OCG. */
  region?: Region;
}

export const DEFAULT_PATHS: DataPaths = {
  scripts: "official/ygopro-scripts",
  database: "official/ygopro-database/locales/en-US/cards.cdb",
  strings: "official/ygopro-database/locales/en-US/strings.conf",
  archetypes: "archetypes.conf",
  rulings: "rulings",
  region: "TCG",
};

/** The card data, ocgcore with it loaded, rulings loaded on startup, and lookups into it. */
export interface Library {
  wrapper: OcgcoreWrapper;
  db: Database;
  constants: Constants;
  /** The rulings loaded and validated on startup for the chosen region. */
  rulings: Rulings;
  /** A script's text from the scripts folder (MyCard's), "" when there is none. */
  script(name: string): string;
  /** A card's name, or the code as text when the database doesn't have it. */
  cardName(code: number): string;
  /** A card's text as the database has it: what the text reader reads. */
  cardText(code: number): string;
  /** What has exactly this name: cards (every card but alternate artworks, Tokens included, as texts summon them) and archetypes. */
  named(name: string): { cards: number[]; archetypes: number[] };
  /** An archetype's name (strings.conf, corrected by archetypes.conf), or its code in hex. */
  archetypeName(setcode: number): string;
  /** The other way: an archetype's code from its name (any case), or from its code in hex. */
  archetypeCode(name: string): number | null;
  /**
   * Every card RML describes, by code: everything in the database but alternate
   * artworks (a reader of the data places them as their original) and Tokens
   * (what a Token does is registered by the card that makes it).
   */
  cards(): number[];
  /** Runs fn with a card's script replaced by this text, for the engine: a script RML wrote is loaded as the card's own. */
  withScript<T>(code: number, script: string, fn: () => T): T;
}

/**
 * ocgcore's WebAssembly build, taken from koishipro-core.js for now (it is to
 * be replaced by building ocgcore directly). Its loader expects require and
 * __dirname to exist, which they don't in an ES module.
 */
function loadOcgcoreWasm() {
  const require = createRequire(import.meta.url);
  const wasmDir = join(dirname(require.resolve("koishipro-core.js")), "vendor/wasm_esm");
  const globals = globalThis as unknown as {
    require?: NodeJS.Require;
    module?: { require: NodeJS.Require };
    __dirname?: string;
  };
  globals.require ??= require;
  globals.module ??= { require };
  globals.__dirname ??= wasmDir;
  return new Uint8Array(readFileSync(join(wasmDir, "libocgcore.wasm")));
}

const TYPE_TOKEN = 0x4000;

/** The archetype names in a file of strings.conf's format: each !setname line's name, under its code, in order. */
function setnames(conf: string): Map<number, string[]> {
  const names = new Map<number, string[]>();
  for (const [, hex, name] of conf.matchAll(/^!setname 0x([0-9a-fA-F]+) (.+)$/gm)) {
    const setcode = parseInt(hex, 16);
    names.set(setcode, [...(names.get(setcode) ?? []), name.trim()]);
  }
  return names;
}

export async function openLibrary(paths: DataPaths = DEFAULT_PATHS): Promise<Library> {
  const rulingsDir = paths.rulings ?? DEFAULT_PATHS.rulings!;
  const region = paths.region ?? DEFAULT_PATHS.region ?? "TCG";
  const rulings = new Rulings(loadRulings(rulingsDir), region);
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(readFileSync(paths.database)));
  // Each code's archetype names: a code archetypes.conf has takes its names from there
  const archetypeNames = setnames(readFileSync(paths.strings, "utf8"));
  for (const [setcode, names] of setnames(readFileSync(paths.archetypes, "utf8"))) archetypeNames.set(setcode, names);
  const wrapper = await createOcgcoreWrapper({ wasmBinary: loadOcgcoreWasm() });
  // ocgcore asks each script reader in turn: a script given in place of a card's own first.
  // The folder's reader is made once ocgcore is loaded, which gives it the require it looks for.
  const replaced = new Map<string, string>();
  let dir: ScriptReaderFn | undefined;
  wrapper
    .setScriptReader((path: string) => replaced.get(path.split("/").at(-1)!) ?? null, true)
    .setScriptReader((path) => (dir ??= DirScriptReader(paths.scripts))(path))
    .setCardReader(SqljsCardReader(db), true);

  const script = (name: string) => new TextDecoder().decode(wrapper.readScript(name) ?? new Uint8Array());
  const row = (sql: string, code: number) => (Number.isInteger(code) ? db.exec(sql, [code])[0]?.values[0] : undefined);
  // Built on first use: replacing the names in one card's text needs every name
  let named: Map<string, { cards: number[]; archetypes: number[] }> | undefined;
  const nameMap = () => {
    if (named) return named;
    named = new Map();
    const entry = (name: string) => named!.get(name) ?? named!.set(name, { cards: [], archetypes: [] }).get(name)!;
    const cards = db.exec("SELECT texts.id, texts.name FROM texts JOIN datas ON datas.id = texts.id WHERE datas.alias = 0")[0]?.values ?? [];
    for (const [id, name] of cards) entry(String(name)).cards.push(Number(id));
    for (const [setcode, names] of archetypeNames) for (const name of names) entry(name).archetypes.push(setcode);
    return named;
  };

  return {
    wrapper,
    db,
    constants: new Constants(script("constant.lua")),
    rulings,
    script,
    cardName: (code) => String(row("SELECT name FROM texts WHERE id = ?", code)?.[0] ?? code),
    cardText: (code) => String(row("SELECT desc FROM texts WHERE id = ?", code)?.[0] ?? ""),
    named: (name) => nameMap().get(name) ?? { cards: [], archetypes: [] },
    archetypeName: (setcode) => archetypeNames.get(setcode)?.[0] ?? `0x${setcode.toString(16)}`,
    archetypeCode: (name) => {
      const wanted = name.toLowerCase();
      for (const [setcode, names] of archetypeNames) if (names.some((n) => n.toLowerCase() === wanted)) return setcode;
      return /^0x[0-9a-fA-F]+$/.test(name) ? parseInt(name, 16) : null;
    },
    cards: () =>
      (db.exec(`SELECT id FROM datas WHERE alias = 0 AND (type & ${TYPE_TOKEN}) = 0 ORDER BY id`)[0]?.values ?? []).map(([id]) =>
        Number(id),
      ),
    withScript: (code, text, fn) => {
      replaced.set(`c${code}.lua`, text);
      try {
        return fn();
      } finally {
        replaced.delete(`c${code}.lua`);
      }
    },
  };
}
