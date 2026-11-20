/**
 * The rulings database (rulings/**\/*.json, rulingSchema.ts): recursively loaded, normalized, validated, and queried
 * for which rulings hold in a region. Loaded automatically on RML startup inside openLibrary().
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Give, RawRuling, Region, Ruling, RulingSet } from "./rulingSchema.js";

export const RULINGS_DIR = fileURLToPath(
  new URL("../../rulings/", import.meta.url),
);

/** What each kind of source must say. */
export const SOURCE_FIELDS: Record<string, Record<string, "string" | "number">> = {
  RULEBOOK: { where: "string", says: "string" },
  QA: { id: "number", date: "string", says: "string" },
  FAQ: { card: "number", name: "string", date: "string", says: "string" },
  HEAD_JUDGE: { event: "string", date: "string", says: "string" },
  TCG_TEXT: { card: "number", date: "string", says: "string" },
  PLAYER: { by: "string", date: "string" },
};

export const GIVE_FIELDS = new Set([
  "card",
  "textCard",
  "each",
  "where",
  "sets",
  "unsets",
  "adds",
  "unsaid",
]);

/** The words of a Like that aren't keys of the value (rulingSchema.ts). */
export const LIKE_WORDS = new Set([
  "$any",
  "$all",
  "$not",
  "$in",
  "$nin",
  "$lte",
  "$gte",
  "$lt",
  "$gt",
  "$exists",
  "$has",
  "$only",
  "$pick",
]);

export const FIELDS = new Set([
  "$schema",
  "id",
  "statement",
  "kind",
  "region",
  "replaces",
  "status",
  "priority",
  "question",
  "meanwhile",
  "sources",
  "cards",
  "gives",
  "scripts",
  "examples",
]);

const text = (value: unknown): value is string =>
  typeof value === "string" && value !== "";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** Normalizes Give.sets (object shorthand or RulingSet[]) and Give.unsets into RulingSet[]. */
export function setsOf(give: Give): RulingSet[] {
  const list: RulingSet[] = [];
  if (Array.isArray(give.sets)) {
    list.push(...give.sets);
  } else if (isPlainObject(give.sets)) {
    for (const [path, value] of Object.entries(give.sets))
      list.push({ path, value });
  }
  for (const path of give.unsets ?? []) list.push({ path });
  return list;
}

/** What is wrong with one thing a ruling gives, as written. */
function problemsOfGive(give: Give): string[] {
  const problems: string[] = [];
  if (!isPlainObject(give)) return ["a gives entry isn't an object"];
  for (const key of Object.keys(give))
    if (!GIVE_FIELDS.has(key)) problems.push(`"${key}" isn't a field of gives`);
  const hasSets = Array.isArray(give.sets)
    ? give.sets.length > 0
    : isPlainObject(give.sets)
      ? Object.keys(give.sets).length > 0
      : false;
  const hasUnsets = Array.isArray(give.unsets) && give.unsets.length > 0;
  const hasAdds = Array.isArray(give.adds) && give.adds.length > 0;
  if (!hasSets && !hasUnsets && !hasAdds && !text(give.unsaid))
    problems.push("a gives that sets nothing, adds nothing and isn't unsaid");
  if (give.each !== undefined && !text(give.each))
    problems.push("a gives whose each isn't a path");
  if (give.sets !== undefined) {
    if (Array.isArray(give.sets)) {
      for (const set of give.sets)
        if (!isPlainObject(set) || !text(set.path))
          problems.push("a set without its path");
    } else if (isPlainObject(give.sets)) {
      for (const path of Object.keys(give.sets))
        if (!text(path)) problems.push("a set without its path");
    } else {
      problems.push("its sets isn't an object or a list");
    }
  }
  if (give.unsets !== undefined) {
    if (!Array.isArray(give.unsets)) problems.push("its unsets isn't a list");
    else
      for (const path of give.unsets)
        if (!text(path)) problems.push("an unset without its path");
  }
  if (give.adds !== undefined && !Array.isArray(give.adds)) {
    problems.push("its adds isn't a list");
  } else {
    for (const add of give.adds ?? []) {
      if (!isPlainObject(add) || !text(add.path) || add.entry === undefined)
        problems.push("an add without its path or its entry");
      if (
        add.position !== undefined &&
        add.position !== "start" &&
        add.position !== "end"
      )
        problems.push(`an add with position ${String(add.position)}`);
      words(add.before);
      words(add.after);
    }
  }
  /** Every word of a Like that starts with $ is one of its words. */
  function words(like: unknown): void {
    if (!like || typeof like !== "object") return;
    if (Array.isArray(like)) {
      like.forEach(words);
      return;
    }
    for (const [key, item] of Object.entries(like)) {
      if (key.startsWith("$") && !LIKE_WORDS.has(key))
        problems.push(`${key} isn't a word of what a value is like`);
      if (
        (key === "$lte" || key === "$gte" || key === "$lt" || key === "$gt") &&
        typeof item !== "number"
      )
        problems.push(`${key} takes a number`);
      if (key === "$exists" && typeof item !== "boolean")
        problems.push(`${key} takes true or false`);
      if (
        (key === "$any" || key === "$all" || key === "$in" || key === "$nin") &&
        !Array.isArray(item)
      )
        problems.push(`${key} takes a list`);
      words(item);
    }
  }
  words(give.card);
  words(give.textCard);
  words(give.where);
  return problems;
}

/** Fills in defaults (id from filename, region from subfolder, status APPLIED, sources []) on a raw JSON ruling. */
export function normalizeRuling(raw: RawRuling, file: string): Ruling {
  const fileName = basename(file);
  const fileId = fileName.endsWith(".json")
    ? fileName.slice(0, -".json".length)
    : fileName;
  const parts = file.split(/[\\/]/);
  const defaultRegion: Region = parts.includes("tcg") ? "TCG" : "OCG";
  return {
    ...raw,
    id: raw.id ?? fileId,
    region: raw.region ?? defaultRegion,
    status: raw.status ?? "APPLIED",
    sources: raw.sources ?? [],
  };
}

/** What is wrong with one ruling as written, a line for each thing; nothing when it is in the format. */
export function problemsOf(raw: RawRuling, file: string): string[] {
  const problems: string[] = [];
  const wrong = (problem: string) => problems.push(`${file}: ${problem}`);
  if (!isPlainObject(raw)) {
    wrong("it isn't a JSON object");
    return problems;
  }
  for (const key of Object.keys(raw))
    if (!FIELDS.has(key)) wrong(`"${key}" isn't a field of a ruling`);
  const ruling = normalizeRuling(raw, file);
  const fileName = basename(file);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(ruling.id ?? ""))
    wrong("its id isn't lower-case words joined by hyphens");
  if (raw.id !== undefined && `${raw.id}.json` !== fileName)
    wrong(`its id isn't its file's name`);
  if (!text(ruling.statement)) wrong("it has no statement");
  if (!["MEANING", "ADDITION", "CARD"].includes(ruling.kind))
    wrong(`its kind is ${ruling.kind}`);
  if (!["OCG", "TCG"].includes(ruling.region))
    wrong(`its region is ${ruling.region}`);
  if (!["APPLIED", "WAITING"].includes(ruling.status))
    wrong(`its status is ${ruling.status}`);
  if (
    ruling.priority !== undefined &&
    (typeof ruling.priority !== "number" || !Number.isFinite(ruling.priority))
  )
    wrong("its priority isn't a number");
  if (ruling.replaces && ruling.region !== "TCG")
    wrong("only a TCG ruling replaces others");
  if (ruling.question !== undefined && !text(ruling.question))
    wrong("its question is empty");
  if (ruling.meanwhile !== undefined && !text(ruling.meanwhile))
    wrong("its meanwhile is empty");
  if (raw.sources !== undefined && !Array.isArray(raw.sources))
    wrong("its sources isn't a list");
  for (const source of Array.isArray(ruling.sources) ? ruling.sources : []) {
    const fields = SOURCE_FIELDS[source?.from];
    if (!fields) {
      wrong(`a source from ${source?.from}`);
      continue;
    }
    for (const [key, type] of Object.entries(fields))
      if (typeof (source as Record<string, unknown>)[key] !== type)
        wrong(`a ${source.from} source without its ${key}`);
    for (const key of Object.keys(source))
      if (
        key !== "from" &&
        !(key in fields) &&
        !(key === "effect" && source.from === "FAQ")
      )
        wrong(`"${key}" isn't a field of a ${source.from} source`);
    if ("date" in source && !/^\d{4}-\d{2}-\d{2}$/.test(source.date))
      wrong(`a ${source.from} source's date isn't a day (2026-11-16)`);
  }
  const forCards = ruling.kind === "CARD";
  if (forCards !== !!ruling.cards?.length)
    wrong("a CARD ruling, and only one, names its cards");
  if (forCards && !ruling.gives?.length)
    wrong("a CARD ruling says what it gives its cards");
  if (ruling.kind === "MEANING" && ruling.gives)
    wrong("a MEANING ruling gives nothing: what its words give is the text's own");
  if (ruling.gives !== undefined && !Array.isArray(ruling.gives))
    wrong("its gives isn't a list");
  else for (const give of ruling.gives ?? []) problemsOfGive(give).forEach(wrong);
  for (const example of ruling.examples ?? [])
    if (
      !isPlainObject(example) ||
      typeof example.card !== "number" ||
      !text(example.name) ||
      !text(example.path)
    )
      wrong("an example without its card, name or path");
  return problems;
}

/** Recursively collects all ruling JSON files under dir (skipping *.schema.json). */
function collectRulingFiles(dir: string, root = dir): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectRulingFiles(full, root));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".json") &&
      !entry.name.endsWith(".schema.json")
    ) {
      found.push(relative(root, full));
    }
  }
  return found;
}

/** Every ruling of the database, sorted by id. Throws with everything wrong in it, when anything is. */
export function loadRulings(dir = RULINGS_DIR): Ruling[] {
  const problems: string[] = [];
  const rulings = collectRulingFiles(dir)
    .flatMap((relPath): Ruling[] => {
      try {
        const raw = JSON.parse(readFileSync(join(dir, relPath), "utf8"));
        problems.push(...problemsOf(raw, relPath));
        return [normalizeRuling(raw, relPath)];
      } catch (error) {
        problems.push(
          `${relPath}: ${error instanceof Error ? error.message : error}`,
        );
        return [];
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  problems.push(...problemsBetween(rulings));
  if (problems.length)
    throw new Error(`the rulings aren't in their format:\n${problems.join("\n")}`);
  return rulings;
}

/** What is wrong between rulings: two with one id, or one that replaces a ruling that isn't an OCG one. */
export function problemsBetween(rulings: Ruling[]): string[] {
  const byId = new Map(rulings.map((ruling) => [ruling.id, ruling]));
  return [
    ...(byId.size < rulings.length ? ["two rulings have the same id"] : []),
    ...rulings.flatMap((ruling) =>
      (ruling.replaces ?? [])
        .filter((id) => byId.get(id)?.region !== "OCG")
        .map((id) => `${ruling.id}: it replaces ${id}, which isn't an OCG ruling`),
    ),
  ];
}

const byPriority = (a: Ruling, b: Ruling): number =>
  (a.priority ?? 0) - (b.priority ?? 0);

/** The rulings, as they hold in one region. */
export class Rulings {
  private readonly byId: Map<string, Ruling>;
  constructor(
    readonly all: Ruling[],
    readonly region: Region,
    /** Which rulings are taken into account at all (every one, unless narrowed by where). */
    private readonly kept: (ruling: Ruling) => boolean = () => true,
  ) {
    const problems = problemsBetween(all);
    if (problems.length) throw new Error(problems.join("\n"));
    this.byId = new Map(all.map((ruling) => [ruling.id, ruling]));
  }

  /** A ruling by its id. A name that isn't a ruling's is a mistake in the code that asks. */
  get(id: string): Ruling {
    const ruling = this.byId.get(id);
    if (!ruling) throw new Error(`no ruling ${id} in the rulings database`);
    return ruling;
  }

  /**
   * Whether a ruling holds in this region: it is APPLIED, and it is this region's own, or an OCG ruling that no TCG
   * ruling that holds replaces.
   */
  holds(id: string): boolean {
    const ruling = this.get(id);
    if (!this.inForce(ruling)) return false;
    if (ruling.region === "TCG") return true;
    return !this.all.some(
      (other) => this.inForce(other) && other.replaces?.includes(id),
    );
  }
  private inForce(ruling: Ruling): boolean {
    return (
      ruling.status === "APPLIED" &&
      this.kept(ruling) &&
      (ruling.region === "OCG" || this.region === "TCG")
    );
  }

  /**
   * The rulings that hold and say in their file what they give (gives), for a card: those for every card, then the
   * CARD rulings about this one, each ordered by priority (ascending, default 0) then id.
   */
  giving(code: number): Ruling[] {
    const giving = this.all.filter(
      (ruling) => ruling.gives && this.holds(ruling.id),
    );
    return [
      ...giving.filter((ruling) => !ruling.cards).sort(byPriority),
      ...giving
        .filter((ruling) => ruling.cards?.includes(code))
        .sort(byPriority),
    ];
  }

  /** The same rulings, with only those that pass taken into account: a card as it reads without the others. */
  where(kept: (ruling: Ruling) => boolean): Rulings {
    return new Rulings(
      this.all,
      this.region,
      (ruling) => this.kept(ruling) && kept(ruling),
    );
  }
}

const loadedByDir = new Map<string, Ruling[]>();
/** Clears cached rulings (useful if files changed during a long-lived process or test). */
export function clearRulingsCache(): void {
  loadedByDir.clear();
}
/** The database's rulings as they hold in a region: the TCG's, which RML is for, unless the OCG's are asked for. */
export function rulingsFor(region: Region = "TCG", dir = RULINGS_DIR): Rulings {
  const key = resolve(dir);
  let loaded = loadedByDir.get(key);
  if (!loaded) {
    loaded = loadRulings(key);
    loadedByDir.set(key, loaded);
  }
  return new Rulings(loaded, region);
}
