import type { CardSchema } from "../cardSchema.js";
import type { Library } from "../library.js";
import { ENGINE_SCRIPTS, engineFunctions, readBack, unknownFunctions } from "./check.js";
import { dialect, type Engine } from "./dialects.js";
import { writeScript } from "./script.js";

/**
 * WRITTEN: the script, checked (read back to the same description, or for
 * EDOPro calling only what EDOPro's scripts call). UNWRITTEN: something of
 * the description no rule writes yet. DIFFERS: written, but read back
 * differently (the writer's mistake). UNKNOWN_CALLS: written for EDOPro with
 * calls its scripts never make.
 */
export type WriteStatus = "WRITTEN" | "UNWRITTEN" | "DIFFERS" | "UNKNOWN_CALLS";

export interface WriteResult {
  code: number;
  engine: Engine;
  status: WriteStatus;
  /** Only when WRITTEN. */
  script?: string;
  /** Why it isn't written: what is unwritten, where it read back differently, or the calls. */
  reasons: string[];
}

/** Writes and checks scripts for these engines, one card at a time. */
export function scriptWriter(library: Library, engines: Engine[]) {
  const dialects = new Map(engines.map((engine) => [engine, dialect(engine)]));
  const known = new Map<Engine, Set<string>>();
  return (card: CardSchema): WriteResult[] => {
    const results: WriteResult[] = [];
    let read: { script: string; differences: string[] } | undefined;
    for (const engine of engines) {
      const result = (status: WriteStatus, reasons: string[], script?: string): WriteResult => ({ code: card.code, engine, status, reasons, script });
      const written = writeScript(card, dialects.get(engine)!);
      if (!written.script) {
        results.push(result("UNWRITTEN", written.unwritten));
        continue;
      }
      if (engine === "edopro") {
        if (!known.has(engine)) known.set(engine, engineFunctions(ENGINE_SCRIPTS[engine]));
        const unknown = unknownFunctions(written.script, known.get(engine)!);
        results.push(unknown.length ? result("UNKNOWN_CALLS", unknown) : result("WRITTEN", [], written.script));
        continue;
      }
      // YGOPro's and Omega's scripts are read the same way: read once
      if (read?.script !== written.script) read = { script: written.script, differences: readBack(library, card, written.script) };
      results.push(read.differences.length ? result("DIFFERS", read.differences) : result("WRITTEN", [], written.script));
    }
    return results;
  };
}
