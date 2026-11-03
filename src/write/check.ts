import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CardSchema } from "../cardSchema.js";
import { convert } from "../convert.js";
import type { Library } from "../library.js";
import { readCard } from "../readCard.js";
import type { Engine } from "./dialects.js";

/**
 * Checks of written scripts. A YGOPro script (Omega's too) is read back by
 * the reader, the way the card's own script was, and must give back the
 * description it was written from. An EDOPro script can't be read here (its
 * API is EDOPro's), so it is checked for what it calls: each function must
 * be one EDOPro's scripts use or define.
 */

/** Where a description read back from its written script differs from the one it was written from: none when the same. */
export function readBack(library: Library, card: CardSchema, script: string): string[] {
  const back = library.withScript(card.code, script, () => convert(library, readCard(library, card.code), card.source.readerVersion));
  return differences(card, back);
}

/**
 * Paths where two descriptions differ, besides their source, and besides
 * how their picks are numbered: CHOSEN3 in one is CHOSEN1 in the other when
 * it is the first pick either writes.
 */
export function differences(a: CardSchema, b: CardSchema): string[] {
  const { source: _a, ...x } = renumbered(a);
  const { source: _b, ...y } = renumbered(b);
  return diff(x, y, "");
}

const canonical = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])]))
      : v;

function diff(a: unknown, b: unknown, path: string): string[] {
  if (JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))) return [];
  if (a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b)) {
    const [x, y] = [a as Record<string, unknown>, b as Record<string, unknown>];
    return [...new Set([...Object.keys(x), ...Object.keys(y)])].flatMap((k) => diff(x[k], y[k], `${path}.${k}`));
  }
  return [`${path}: ${JSON.stringify(a)} written, ${JSON.stringify(b)} read back`];
}

/** Each effect's picks renamed by the order they first appear in it. */
function renumbered(card: CardSchema): CardSchema {
  const effects = (card.effects ?? []).map((effect) => {
    const ids = new Map<string, string>();
    const walk = (v: unknown): unknown => {
      if (Array.isArray(v)) return v.map(walk);
      if (!v || typeof v !== "object") return v;
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => {
          if (k !== "ref" || typeof x !== "string" || !/^(CHOSEN|ALL)\d+$/.test(x)) return [k, walk(x)];
          if (!ids.has(x)) ids.set(x, `${x.replace(/\d+$/, "")}#${ids.size + 1}`);
          return [k, ids.get(x)];
        }),
      );
    };
    return walk(effect);
  });
  return { ...card, effects } as CardSchema;
}

/** The functions an engine's own scripts call or define: Duel.X, Card.X (or c:X), aux.X, Effect.X, Group.X, and EDOPro's procedures (Synchro.X...). */
export function engineFunctions(scriptsDir: string): Set<string> {
  const out = new Set<string>();
  const add = (text: string) => {
    for (const [, object, name] of text.matchAll(/\b(Duel|Card|aux|Auxiliary|Effect|Group|Synchro|Xyz|Link|Fusion)\.(\w+)/g))
      out.add(`${object === "Auxiliary" ? "aux" : object}.${name}`);
    // Methods called on a card, effect or group: c:IsFaceup(), e:GetHandler(), g:GetFirst()
    for (const [, name] of text.matchAll(/\w:(\w+)\(/g)) out.add(`:${name}`);
  };
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name));
      else if (entry.name.endsWith(".lua")) add(readFileSync(join(dir, entry.name), "utf8"));
    }
  };
  walk(scriptsDir);
  return out;
}

/** The functions a script calls that the engine's scripts never do: each a function the engine may not have. */
export function unknownFunctions(script: string, known: Set<string>): string[] {
  const calls = new Set<string>();
  for (const [, object, name] of script.matchAll(/\b(Duel|aux|Effect|Group|Synchro|Xyz|Link|Fusion)\.(\w+)\(/g)) calls.add(`${object}.${name}`);
  for (const [, name] of script.matchAll(/\w:(\w+)\(/g)) calls.add(`:${name}`);
  return [...calls].filter((call) => !known.has(call));
}

/** Where each engine's scripts are, for the functions they call. */
export const ENGINE_SCRIPTS: Record<Engine, string> = {
  ygopro: "data/ygopro-scripts",
  omega: "data/ygopro-scripts",
  edopro: "data/edopro-scripts",
};
