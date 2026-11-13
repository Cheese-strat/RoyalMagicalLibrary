import type { Library } from "./lib/library.js";
import { readRegistration, type RegisteredEffect, type Registration } from "./lib/registration.js";

/**
 * Set* calls left out of the comparison, each with its reason: they don't
 * change what the card does (Cheesestrat, 2026-11-07).
 */
export const IGNORED: Record<string, string> = {
  SetDescription: "the text shown for the effect, a string id",
  SetHintTiming: "a hint: when the client offers the effect",
};

/**
 * Our script against MyCard's, by what each registers when ocgcore loads it:
 * MATCHES when every setup call and every effect is the same (in any order),
 * with function names left out, since they are the author's (s.target and
 * s.sptg are the same), and IGNORED's calls left out; ENGINE_ERROR when
 * ocgcore reported an error loading ours. MyCard's scripts are written by
 * volunteers, not Konami, so DIFFERS says where to look, not which is wrong:
 * both scripts are compared by hand.
 */
export type CheckStatus = "MATCHES" | "DIFFERS" | "ENGINE_ERROR";

export interface Check {
  status: CheckStatus;
  /** One line for each difference. */
  differences: string[];
  /** What each registers, a line for each setup call and effect. */
  official: string[];
  ours: string[];
}

/** One effect's Set* calls, the last of each (a later call replaces an earlier one), named for reading. */
type Calls = Map<string, string>;

const NO_SCRIPT: Registration = { setup: [], merged: new Map(), effects: new Map(), errors: [] };

/** Compares our script (null: the card needs none) with MyCard's (none when it has no file). */
export function checkScript(library: Library, code: number, script: string | null): Check {
  const official = library.script(`c${code}.lua`) ? readRegistration(library, code) : NO_SCRIPT;
  const ours = script === null ? NO_SCRIPT : library.withScript(code, script, () => readRegistration(library, code));
  const theirSetup = official.setup.map(setupLine);
  const ourSetup = ours.setup.map(setupLine);
  const theirs = [...official.effects].map(([index, effect]) => ({ index, calls: callsOf(library, effect) }));
  const mine = [...ours.effects].map(([index, effect]) => ({ index, calls: callsOf(library, effect) }));
  const [onlyTheirSetup, onlyOurSetup] = unmatched(theirSetup, ourSetup);
  const differences = [
    ...ours.errors.map((error) => `our script: the engine reported: ${error}`),
    ...onlyTheirSetup.map((line) => `setup only in MyCard's: ${line}`),
    ...onlyOurSetup.map((line) => `setup only in ours: ${line}`),
    ...effectDifferences(theirs, mine),
  ];
  return {
    status: ours.errors.length ? "ENGINE_ERROR" : differences.length ? "DIFFERS" : "MATCHES",
    differences,
    official: [...theirSetup.map((line) => `SETUP ${line}`), ...theirs.map(({ index, calls }) => effectLine(index, calls))],
    ours: [...ourSetup.map((line) => `SETUP ${line}`), ...mine.map(({ index, calls }) => effectLine(index, calls))],
  };
}

/** Function names in a value, which are the script author's, as one name: s.sptg is s.function. */
const anonymous = (value: string) => value.replace(/\bs\.[A-Za-z_][A-Za-z0-9_]*/g, "s.function");

const setupLine = ([name, args]: [string, string]) => `${name}(${anonymous(args)})`;

function callsOf(library: Library, effect: RegisteredEffect): Calls {
  const { constants } = library;
  const calls: Calls = new Map();
  if (effect.procedure) calls.set("By", effect.procedure);
  if (effect.held) calls.set("Held", "true");
  if (effect.global) calls.set("Global", `seat ${effect.global.seat}${effect.global.once ? ", once" : ""}`);
  const type = Number([...effect.sets].reverse().find(([setter]) => setter === "SetType")?.[1][0] ?? 0);
  // An effect that happens on an event has an EVENT_ code; one that applies has an EFFECT_ code
  const onEvent = constants.flags("EFFECT_TYPE_", type).some((t) => /^(ACTIVATE|TRIGGER_[OF]|QUICK_[OF]|CONTINUOUS)$/.test(t));
  const flags = (prefix: string) => (arg: string) => (/^\d+$/.test(arg) ? constants.flags(prefix, Number(arg)).join("|") || "0" : arg);
  const name = (prefix: string) => (arg: string) => (/^\d+$/.test(arg) ? constants.name(prefix, Number(arg)) : arg);
  const NAMED: Record<string, (arg: string, i: number) => string> = {
    SetType: flags("EFFECT_TYPE_"),
    SetCategory: flags("CATEGORY_"),
    SetProperty: (arg, i) => flags(i === 0 ? "EFFECT_FLAG_" : "EFFECT_FLAG2_")(arg),
    SetRange: flags("LOCATION_"),
    SetTargetRange: flags("LOCATION_"),
    SetReset: flags("RESET_"),
    SetCode: name(onEvent ? "EVENT_" : "EFFECT_"),
  };
  for (const [setter, args] of effect.sets) {
    if (setter in IGNORED) continue;
    const named = NAMED[setter];
    calls.set(setter.slice("Set".length), args.map((arg, i) => anonymous(named ? named(arg, i) : arg)).join(", "));
  }
  return calls;
}

const effectLine = (index: number, calls: Calls) => `#${index} ${[...calls].map(([k, v]) => `${k}=${v}`).join(" ")}`;
const key = (calls: Calls) => JSON.stringify([...calls].sort());

/** What is in one list and not the other, counting repeats: [only in a, only in b]. */
function unmatched<T>(a: T[], b: T[], same: (x: T, y: T) => boolean = (x, y) => x === y): [T[], T[]] {
  const rest = [...b];
  const onlyA = a.filter((x) => {
    const i = rest.findIndex((y) => same(x, y));
    if (i === -1) return true;
    rest.splice(i, 1);
    return false;
  });
  return [onlyA, rest];
}

/** Effects that are the same pair up in any order; the rest pair up in order, call by call. */
function effectDifferences(theirs: { index: number; calls: Calls }[], mine: { index: number; calls: Calls }[]): string[] {
  const [a, b] = unmatched(theirs, mine, (x, y) => key(x.calls) === key(y.calls));
  const out: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const [x, y] = [a[i], b[i]];
    if (!y) out.push(`effect only in MyCard's: ${effectLine(x.index, x.calls)}`);
    else if (!x) out.push(`effect only in ours: ${effectLine(y.index, y.calls)}`);
    else {
      const setters = [...new Set([...x.calls.keys(), ...y.calls.keys()])];
      const calls = setters
        .filter((s) => x.calls.get(s) !== y.calls.get(s))
        .map((s) => `${s} ${x.calls.get(s) ?? "(none)"} / ${y.calls.get(s) ?? "(none)"}`);
      out.push(`MyCard's #${x.index} / our #${y.index}: ${calls.join("; ")}`);
    }
  }
  return out;
}
