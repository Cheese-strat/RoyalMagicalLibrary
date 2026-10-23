import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import initSqlJs, { type Database } from "sql.js";
import { createOcgcoreWrapper, DirScriptReader, SqljsCardReader, type OcgcoreWrapper } from "koishipro-core.js";
import { Constants } from "./constants.js";

/**
 * Where the card data is. Use MyCard's scripts and database together
 * (mycard/ygopro-scripts and mycard/ygopro-database): ProjectIgnis scripts
 * crash this engine, and other databases number archetypes differently.
 */
export interface DataPaths {
  /** The folder of card scripts (c<code>.lua) and constant.lua. */
  scripts: string;
  /** The card database (cards.cdb). */
  database: string;
  /** strings.conf, for archetype names. */
  strings: string;
}

export const DEFAULT_PATHS: DataPaths = {
  scripts: "data/ygopro-scripts",
  database: "data/ygopro-database/locales/en-US/cards.cdb",
  strings: "data/ygopro-database/locales/en-US/strings.conf",
};

/** ocgcore with the card data loaded, and lookups into that data. */
export interface Library {
  wrapper: OcgcoreWrapper;
  db: Database;
  constants: Constants;
  /** A script's text, "" when there is none. */
  script(name: string): string;
  /** A card's name, or the code as text when the database doesn't have it. */
  cardName(code: number): string;
  /** A card's effect strings (str1, str2...). */
  cardStrings(code: number): string[];
  /** An archetype's name from strings.conf, or its code in hex. */
  archetypeName(setcode: number): string;
  /** Every card with a script of its own, artworks left out. */
  cardsWithScripts(): number[];
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

export async function openLibrary(paths: DataPaths = DEFAULT_PATHS): Promise<Library> {
  const wrapper = await createOcgcoreWrapper({ wasmBinary: loadOcgcoreWasm() });
  const SQL = await initSqlJs();
  const db = new SQL.Database(new Uint8Array(readFileSync(paths.database)));
  wrapper.setScriptReader(DirScriptReader(paths.scripts), true).setCardReader(SqljsCardReader(db), true);

  const decode = (bytes: Uint8Array | null | undefined) => new TextDecoder().decode(bytes ?? new Uint8Array());
  const script = (name: string) => decode(wrapper.readScript(name));
  const constants = new Constants(script("constant.lua"));
  const strings = readFileSync(paths.strings, "utf8");
  const row = (sql: string, code: number) => (Number.isInteger(code) ? db.exec(sql, [code])[0]?.values[0] : undefined);

  return {
    wrapper,
    db,
    constants,
    script,
    cardName: (code) => String(row("SELECT name FROM texts WHERE id = ?", code)?.[0] ?? code),
    cardStrings: (code) =>
      (row("SELECT str1, str2, str3, str4, str5, str6, str7, str8 FROM texts WHERE id = ?", code) ?? []).map((s) =>
        String(s ?? ""),
      ),
    archetypeName: (setcode) =>
      strings.match(new RegExp(`^!setname 0x${setcode.toString(16)} (.+)$`, "m"))?.[1] ?? `0x${setcode.toString(16)}`,
    cardsWithScripts: () =>
      (db.exec("SELECT id FROM datas WHERE alias = 0 ORDER BY id")[0]?.values ?? [])
        .map(([id]) => Number(id))
        .filter((id) => script(`c${id}.lua`)),
  };
}
