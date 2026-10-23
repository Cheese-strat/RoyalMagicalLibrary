import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import luaparse from "luaparse";

/**
 * Parses every card script with luaparse (Lua 5.3), to check it can be the
 * base of a reader built on syntax trees rather than text.
 *   npm run parse-check -- [scripts folder]
 */
const dir = process.argv[2] ?? "data/ygopro-scripts";
const files = readdirSync(dir).filter((file) => file.endsWith(".lua"));
const failures: string[] = [];
for (const file of files) {
  try {
    luaparse.parse(readFileSync(join(dir, file), "utf8"), { luaVersion: "5.3", locations: true, ranges: true });
  } catch (error) {
    failures.push(`${file}: ${(error as Error).message}`);
  }
}
console.log(`${files.length - failures.length} of ${files.length} scripts parsed`);
for (const failure of failures.slice(0, 20)) console.log(`  ${failure}`);
process.exitCode = failures.length ? 1 : 0;
