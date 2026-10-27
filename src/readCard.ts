import type { Library } from "./library.js";
import { returned } from "./read/conditions.js";
import { cardContext, newEffectState, stringText, type CardContext, type Flags } from "./read/context.js";
import { BOOKKEEPING, labelParts, pickLabel, stepLevel } from "./read/parts.js";
import { ACTIVATED, HAPPENS, steps, type Steps } from "./read/steps.js";
import { readRegistration, splitArgs, type RegisteredEffect } from "./registration.js";

export type { Flags } from "./read/context.js";

/**
 * A card as the reader sees it: its type, its setup calls, and its effects
 * as flag records.
 *
 * What the card registers comes from ocgcore (registration.ts) and is exact.
 * What the effects' functions do is read from their syntax trees (read/), and
 * anything the reader doesn't understand is kept as RAW. A card is fully read
 * when nothing in it is RAW.
 */
export interface CardFlags {
  CODE: number;
  NAME: string;
  TYPE: string[];
  /** Setup calls: summon procedures, revive limit, only one on the field... */
  SETUP: Flags[];
  EFFECTS: Flags[];
}

export function readCard(library: Library, code: number): CardFlags {
  const context = cardContext(library, code);
  const { setup, effects } = readRegistration(library, code);
  const type = Number(library.db.exec("SELECT type FROM datas WHERE id = ?", [code])[0]?.values[0][0] ?? 0);
  return {
    CODE: code,
    NAME: library.cardName(code),
    TYPE: library.constants.flags("TYPE_", type),
    SETUP: setup.map(([name, args]) => setupFlags(context, name, splitArgs(args))),
    EFFECTS: [...effects].map(([index, effect]) => effectFlags(context, index, effect)),
  };
}

/** One registered effect: its properties, then its condition, value, cost, target and operation. */
function effectFlags(context: CardContext, index: number, { sets, procedure }: RegisteredEffect): Flags {
  const { library, code } = context;
  const { constants } = library;
  context.effect = newEffectState();

  // The last call of each setter is the one that counts
  const get = (setter: string) => sets.filter(([s]) => s === setter).at(-1)?.[1];
  const number = (setter: string) => Number(get(setter)?.[0] ?? 0);

  const out: Flags = { EFFECT: index };
  if (procedure) out.FROM_PROCEDURE = true;
  const type = number("SetType");
  out.TYPE = constants.flags("EFFECT_TYPE_", type);
  const happens = out.TYPE.some((t: string) => HAPPENS.includes(t));

  const effectCode = number("SetCode");
  if (effectCode) {
    if (!happens) out.APPLIES = [constants.name("EFFECT_", effectCode)];
    // EVENT_PHASE plus a PHASE_ is the event of that phase
    else if (effectCode & 0x3000 && effectCode < 0x4000)
      out.ON = [`PHASE_${constants.flags("PHASE_", effectCode & ~0x3000).join("|")}`];
    else out.ON = [constants.name("EVENT_", effectCode)];
  }
  if (get("SetDescription")) out.TEXT = stringText(context, get("SetDescription")![0]);
  if (get("SetCategory")) out.CATEGORY = constants.flags("CATEGORY_", number("SetCategory"));
  if (get("SetProperty")) out.PROPERTY = constants.flags("EFFECT_FLAG_", number("SetProperty"));
  if (get("SetRange")) out.RANGE = constants.flags("LOCATION_", number("SetRange"));

  if (get("SetTargetRange")) {
    const [own, opponent] = get("SetTargetRange")!.map(Number);
    const reach = (value: number) => (value === 1 ? ["PLAYER"] : constants.flags("LOCATION_", value));
    out.REACHES = { ...(own ? { OWN: reach(own) } : {}), ...(opponent ? { OPPONENT: reach(opponent) } : {}) };
  }

  if (get("SetCountLimit")) {
    // The count code is the card's own number for a hard limit, with flags above it for OATH, per duel and per chain
    const [count, countCode = "0"] = get("SetCountLimit")!;
    const c = Number(countCode);
    const shared = c % 0x10000000;
    const kinds = constants.flags("EFFECT_COUNT_CODE_", c - shared);
    // id+1, id+o...: a second hard limit of this card's own, for "each effect once per turn" (not a card's number)
    const second = shared > code && shared - code < 100 && library.cardName(shared) === String(shared);
    const sharedWith =
      shared === code || second ? "HARD" : c === 1 ? "SINGLE" : shared ? library.cardName(shared) : "SOFT";
    out.LIMIT = {
      COUNT: Number(count),
      SHARED: sharedWith,
      ...(second ? { COUNTER: `id+${shared - code}` } : {}),
      ...(kinds.length ? { KIND: kinds } : {}),
    };
  }

  if (get("SetHintTiming")) {
    const [own, opponent] = get("SetHintTiming")!.map(Number);
    out.TIMING = {
      ...(own ? { OWN: constants.flags("TIMING_", own) } : {}),
      ...(opponent ? { OPPONENT: constants.flags("TIMING_", opponent) } : {}),
    };
  }

  const value = get("SetValue")?.[0];
  if (value) out.VALUE = /^s\.\w+$/.test(value) ? returned(context, value.slice(2), true) : value;

  // A function of the card's own script ("s.name"), or one from elsewhere (aux) given as written
  const ownFunction = (setter: string) => get(setter)?.[0]?.match(/^s\.(\w+)$/)?.[1];
  const otherFunction = (setter: string) => {
    const f = get(setter)?.[0];
    return f && f !== "nil" && !ownFunction(setter) ? f : undefined;
  };

  if (ownFunction("SetCondition")) out.CONDITION = returned(context, ownFunction("SetCondition")!, false);
  else if (otherFunction("SetCondition")) out.CONDITION = otherFunction("SetCondition");

  // A summon procedure's target and operation are its steps. Other field effects that just apply
  // use their target function to say which cards they apply to.
  const isProcedure = ["SPSUMMON_PROC", "SUMMON_PROC"].includes(out.APPLIES?.[0]);
  const roles = [
    ["SetCost", "COST"],
    ["SetTarget", "TARGET"],
    ["SetOperation", "OPERATION"],
  ] as const;
  const read: Partial<Record<(typeof roles)[number][1], Steps>> = {};
  for (const [setter, role] of roles) {
    const fn = ownFunction(setter);
    if (fn) {
      if (setter === "SetTarget" && !happens && !isProcedure && type & 0x2) {
        out.APPLIES_TO = returned(context, fn, true);
        continue;
      }
      read[role] = steps(context, fn);
    } else if (otherFunction(setter)) {
      out[role] = otherFunction(setter);
    }
  }
  labelSteps(read, out.TYPE.some((t: string) => ACTIVATED.includes(t)));
  for (const [role, part] of Object.entries(read))
    out[role] = Object.fromEntries(Object.entries(part).filter(([, v]) => !Array.isArray(v) || v.length));
  return out;
}

/**
 * The labels of an effect's steps (read/parts.ts): the level of each cost
 * and target step, the resolution's parts, and how each move's cards were
 * picked, from the picks of all three functions (a target is picked on
 * activation and moved on resolution).
 */
function labelSteps(read: Partial<Record<"COST" | "TARGET" | "OPERATION", Steps>>, activated: boolean) {
  // In order: cards made the target (Duel.SetTargetCard) are targeted for the moves after it, not before
  const picks = new Map<string, Flags>();
  for (const action of Object.values(read).flatMap((part) => part.ACTIONS)) {
    if (action.ID) picks.set(action.ID, action);
    if (action.ACTION === "TARGET" && action.SUBJECT) picks.set(JSON.stringify(action.SUBJECT), { ACTION: "TARGET" });
    if (!BOOKKEEPING.has(action.ACTION)) Object.assign(action, pickLabel(action.SUBJECT ?? action.TO, picks));
  }
  for (const role of ["COST", "TARGET"] as const)
    for (const action of read[role]?.ACTIONS ?? [])
      if (!BOOKKEEPING.has(action.ACTION)) action.LEVEL = stepLevel(role, action, activated);
  if (!read.OPERATION?.ACTIONS.length) return;
  // A mode is chosen on resolution when the operation offers it, else on activation
  const onResolution = new Set((read.OPERATION.MODES ?? []).map((mode) => mode.MODE));
  const onActivation = Boolean(read.COST?.MODES?.length || read.TARGET?.MODES?.length);
  read.OPERATION.PARTS = labelParts(read.OPERATION.ACTIONS).map((part) =>
    part.MODE === undefined
      ? part
      : { ...part, CHOSEN_ON: onResolution.has(part.MODE) || !onActivation ? "RESOLUTION" : "ACTIVATION" },
  );
}

/** A setup call of initial_effect: a summon procedure, the revive limit, only one on the field... */
function setupFlags(context: CardContext, name: string, args: string[]): Flags {
  if (name === "SetUniqueOnField") return { ONLY_ONE_ON_FIELD: true };
  if (name === "EnableReviveLimit") return { MUST_BE_PROPERLY_SUMMONED: true };

  const procedure = name.match(/^aux\.Add(Fusion|Synchro|Xyz|Link|Ritual)/);
  if (procedure?.[1] === "Synchro") {
    return {
      SUMMON_PROCEDURE: "SYNCHRO",
      TUNER: material(context, args[0] ?? "nil"),
      NON_TUNERS: material(context, args[1] ?? "nil"),
      MIN: args[2],
      ...(args[3] ? { MAX: args[3] } : {}),
    };
  }
  if (procedure) {
    const materials = args.map((arg) => material(context, arg));
    return { SUMMON_PROCEDURE: procedure[1].toUpperCase(), VIA: name.slice(4), ARGS: materials };
  }
  return { [name]: args };
}

/** A summon material as written: a card's number, or a filter aux built. */
function material(context: CardContext, text: string): unknown {
  const { library } = context;
  if (/^\d{5,}$/.test(text)) return library.cardName(Number(text));
  const bool = text.match(/^aux\.FilterBoolFunction\(Card\.(\w+),\s*(\d+)\)$/);
  if (bool) {
    const key = bool[1].replace(/^Is/, "").toUpperCase();
    if (/SetCard/.test(bool[1])) return { [key]: library.archetypeName(Number(bool[2])) };
    if (/Type/.test(bool[1])) return { [key]: library.constants.flags("TYPE_", Number(bool[2])) };
    return { RAW: text };
  }
  if (text === "aux.NonTuner(nil)") return "NON_TUNER";
  if (text === "nil") return "ANY";
  return text;
}
