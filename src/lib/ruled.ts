/**
 * What rulings give a card (rulingSchema.ts), for a reader: which rulings hold while it reads, the values it gives by
 * one marked where it gives them, and the marks turned into the card's tags (cardSchema.ts's Ruled) once it is read.
 * And for whoever has the card: the values at its tags' paths, and the card as its text alone reads.
 *
 * A reader asks holds(id) where a ruling decides something, and gives what an ADDITION ruling gives through give,
 * giveName or given, which do nothing when the ruling doesn't hold. So reading without a ruling gives the card without
 * what the ruling gives, and textAlone, which undoes a card's tags, gives the same card as reading with no ADDITION
 * ruling at all: test/rulings.test.ts checks that on every card that reads.
 */
import { isDeepStrictEqual } from "node:util";
import type { CardSchema, Ruled } from "./cardSchema.js";
import { setsOf, type Rulings } from "./rulings.js";

// ---- while reading ----

let current: Rulings | undefined;

/** Reads with these rulings: holds asks them, for as long as read runs. */
export function readingWith<T>(rulings: Rulings, read: () => T): T {
  const before = current;
  current = rulings;
  try {
    return read();
  } finally {
    current = before;
  }
}

/** Whether a ruling holds for the card being read. */
export function holds(ruling: string): boolean {
  if (!current)
    throw new Error(`ruling ${ruling} asked for outside a reading (readingWith)`);
  return current.holds(ruling);
}

/**
 * Marks ride on the object that holds the value, under this key, until the card is read: drafts are copied, merged and
 * rebuilt on the way, and a key of the object goes wherever the object does. lifted takes them out again.
 */
const MARKS = "$ruled";
interface Mark {
  rulings: string[];
  without?: unknown;
}
type Marks = Record<string, Mark>;
const marksOf = (holder: object): Marks | undefined =>
  (holder as { [MARKS]?: Marks })[MARKS];

/**
 * Marks a value of holder as given by a ruling: at one of its keys, at a name in one of its lists ("flags/DAMAGE_STEP"),
 * or holder itself (""). without is what the text alone reads as there, when that is something; a second ruling that
 * gives the same value is added to the first's mark.
 */
export function ruledBy(
  holder: object,
  at: string,
  ruling: string,
  without?: unknown,
): void {
  const marks = marksOf(holder) ?? {};
  const made = marks[at];
  const mark: Mark = made
    ? { ...made, rulings: [...new Set([...made.rulings, ruling])] }
    : { rulings: [ruling], ...(without !== undefined ? { without } : {}) };
  // A new object each time: a copy of holder made before this keeps the marks it had
  (holder as { [MARKS]?: Marks })[MARKS] = { ...marks, [at]: mark };
}

/** Gives holder's key a value by a ruling, when the ruling holds and the value isn't there already. */
export function give<T extends object, K extends keyof T & string>(
  holder: T,
  key: K,
  value: T[K],
  ruling: string,
): void {
  if (!holds(ruling) || isDeepStrictEqual(holder[key], value)) return;
  ruledBy(holder, key, ruling, holder[key]);
  holder[key] = value;
}

/** Adds a name to one of holder's lists by a ruling (at a place in it, or at its end), when the ruling holds and the name isn't there. */
export function giveName<T extends object, K extends keyof T & string>(
  holder: T,
  key: K,
  name: string,
  ruling: string,
  place?: number,
): void {
  const list = (holder[key] as string[] | undefined) ?? [];
  if (!holds(ruling) || list.includes(name)) return;
  const at = place ?? list.length;
  ruledBy(holder, `${key}/${name}`, ruling);
  holder[key] = [...list.slice(0, at), name, ...list.slice(at)] as T[K];
}

/**
 * A whole value a ruling gives (a Summon the rules give a monster, the activation they give a Continuous Spell), but for
 * the keys the card's words give (wordKeys: the Tributes its text adds, the limit it puts on the activation). When the
 * ruling holds, the value, marked; when it doesn't, what the words give alone, or nothing.
 */
export function given<T extends object>(
  value: T,
  ruling: string,
  wordKeys: (keyof T & string)[] = [],
): T | undefined {
  const said = wordKeys.filter(
    (key) =>
      value[key] !== undefined &&
      !(Array.isArray(value[key]) && !value[key].length),
  );
  const words = said.length
    ? (Object.fromEntries(said.map((key) => [key, value[key]])) as T)
    : undefined;
  if (!holds(ruling)) return words;
  ruledBy(value, "", ruling, words);
  return value;
}

/** Whether a list of a filter or move is one a ruling gave whole: joining another list to it would lose which part was the text's. */
export const givenWhole = (holder: object, key: string): boolean =>
  !!marksOf(holder)?.[key];

/** Two objects' marks together, for an object made of both. */
export function marksTogether(a: object, b: object): object {
  const marks = { ...marksOf(a), ...marksOf(b) };
  return Object.keys(marks).length ? { [MARKS]: marks } : {};
}
export const isMarks = (key: string): boolean => key === MARKS;

// ---- once read ----

/**
 * A value without its marks, and the marks as tags, each with its path from the value. What a mark's without holds is
 * the text's alone, so anything a ruling gave inside it is undone there.
 */
export function lifted<T>(value: T): { value: T; ruled: Ruled[] } {
  const ruled: Ruled[] = [];
  const walk = (node: unknown, path: string[]): unknown => {
    if (Array.isArray(node))
      return node.map((item, i) => walk(item, [...path, String(i)]));
    if (!node || typeof node !== "object") return node;
    for (const [at, mark] of Object.entries(marksOf(node) ?? {})) {
      const inner = lifted(mark.without);
      const without = undone(inner.value, inner.ruled);
      ruled.push({
        path: [...path, ...(at ? at.split("/") : [])].join("/"),
        rulings: mark.rulings,
        ...(without !== undefined ? { without } : {}),
      });
    }
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => key !== MARKS)
        .map(([key, item]) => [key, walk(item, [...path, key])]),
    );
  };
  return { value: walk(value, []) as T, ruled };
}

/** A value as the text alone reads it: what rulings gave inside it, as marked, undone. */
export function textOf<T>(value: T): T {
  const { value: unmarked, ruled } = lifted(value);
  return undone(unmarked, ruled);
}

/** The tags that say something of a card: one whose value was left out as empty, with nothing without it either, says nothing. */
export const tagsOf = (card: object, ruled: Ruled[]): Ruled[] =>
  ruled.filter(
    (tag) =>
      valueAt(card, tag.path) !== undefined || tag.without !== undefined,
  );

// ---- paths ----

/** A list of names (strings or numbers): a path names its entries by themselves, where it names another list's by their place. */
const ofNames = (list: unknown[]): boolean =>
  list.length > 0 && list.every((item) => typeof item !== "object");

/** What is at a path (Ruled's) in a value; undefined when nothing is. */
export function valueAt(value: unknown, path: string): unknown {
  let node = value;
  for (const key of path === "" ? [] : path.split("/")) {
    if (Array.isArray(node))
      node = ofNames(node)
        ? node.find((item) => String(item) === key)
        : node[Number(key)];
    else if (node && typeof node === "object")
      node = (node as Record<string, unknown>)[key];
    else return undefined;
  }
  return node;
}

/**
 * Puts a value at a path, or takes what is there away (undefined): a key of an object; an entry of a list by its place,
 * the entries after it moving up when it is taken away; a name out of a list of names. A list left empty is taken away
 * too, as an empty list is left out of a card. What holds the path's last key must be there.
 */
export function setAt(root: unknown, path: string, value: unknown): void {
  const keys = path.split("/");
  const key = keys.pop()!;
  const parent = keys.join("/");
  const holder = valueAt(root, parent);
  if (Array.isArray(holder)) {
    if (ofNames(holder)) {
      if (value !== undefined)
        throw new Error(`${path}: a name in a list is there or not; set the list`);
      const at = holder.findIndex((item) => String(item) === key);
      if (at >= 0) holder.splice(at, 1);
    } else if (value === undefined) holder.splice(Number(key), 1);
    else holder[Number(key)] = value;
    if (!holder.length) setAt(root, parent, undefined);
  } else if (holder && typeof holder === "object") {
    if (value === undefined) delete (holder as Record<string, unknown>)[key];
    else (holder as Record<string, unknown>)[key] = value;
  } else throw new Error(`nothing at ${parent || "the card"} to hold ${key}`);
}

/** Paths from the last to the first: a list's later entries before its earlier ones, and what is inside a value before the value. */
function lastFirst(a: string, b: string): number {
  const [x, y] = [a.split("/"), b.split("/")];
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    const numbers = /^\d+$/.test(x[i]) && /^\d+$/.test(y[i]);
    return numbers ? Number(y[i]) - Number(x[i]) : x[i] < y[i] ? 1 : -1;
  }
  return y.length - x.length;
}

/** A value with its tags undone: at each, what the text alone reads as, or nothing. */
function undone<T>(value: T, ruled: Ruled[]): T {
  if (!ruled.length) return value;
  const out = structuredClone(value);
  for (const tag of [...ruled].sort((a, b) => lastFirst(a.path, b.path))) {
    // The value itself was given: what is left is what the text reads as in its place
    if (tag.path === "") return structuredClone(tag.without) as T;
    setAt(out, tag.path, structuredClone(tag.without));
  }
  return out;
}

/**
 * The card as its text alone reads: every value a ruling gave taken out, or put back to what the text reads as there.
 * What a writer of card text writes from, so that it writes no rule. It can lack what a card must have (a Summon, an
 * effect's kind) where only a ruling gives it.
 */
export function textAlone(card: CardSchema): Partial<CardSchema> {
  const { ruled, ...rest } = card;
  return undone(rest, ruled ?? []);
}

// ---- what rulings give, as their files say ----

/** A ruling gives something RML can't say (its gives' unsaid): the card's reading stops, with this as the reason. */
export class Unsaid extends Error {}

/** One of the values a ruling gives to: where it is, and what it is inside of, from the card down. */
interface Found {
  path: string[];
  value: unknown;
  above: unknown[];
}

/** The values of a card at an each path: "*" every entry of a list, "**" every value at any depth. */
function found(card: unknown, each: string | undefined): Found[] {
  let at: Found[] = [{ path: [], value: card, above: [] }];
  for (const key of each === undefined ? [] : each.split("/"))
    at = at.flatMap((from) => (key === "**" ? [from, ...inside(from)] : entries(from, key)));
  return at;
}
function entries({ path, value, above }: Found, key: string): Found[] {
  const next = (name: string, item: unknown): Found => ({
    path: [...path, name],
    value: item,
    above: [...above, value],
  });
  if (Array.isArray(value))
    return key === "*"
      ? value.map((item, i) => next(String(i), item))
      : key in value
        ? [next(key, value[Number(key)])]
        : [];
  if (!value || typeof value !== "object" || key === "*") return [];
  return key in value ? [next(key, (value as Record<string, unknown>)[key])] : [];
}
/** Every value inside one that can hold values, at any depth. */
function inside(from: Found): Found[] {
  const { value } = from;
  if (!value || typeof value !== "object") return [];
  const keys = Array.isArray(value) ? value.map((_, i) => String(i)) : Object.keys(value);
  return keys
    .flatMap((key) => entries(from, key))
    .filter((item) => item.value && typeof item.value === "object")
    .flatMap((item) => [item, ...inside(item)]);
}

/**
 * The move that says what a move's cards are (a Like's $pick): itself, when it says where they are picked from, or the
 * first move of its effect (or Summon) that took the same pick. Nothing, for a move whose cards aren't a pick.
 */
function pickOf(move: Record<string, unknown>, above: unknown[]): unknown {
  const ref = (move.cards as { ref?: unknown } | undefined)?.ref;
  if (typeof ref !== "string") return undefined;
  if (move.from !== undefined) return move;
  const effect = [...above]
    .reverse()
    .find((value) => !!value && typeof value === "object" && ("kind" in value || "method" in value));
  return (
    effect &&
    inside({ path: [], value: effect, above: [] }).find(
      ({ value }) =>
        (value as { cards?: { ref?: unknown } }).cards?.ref === ref &&
        (value as { from?: unknown }).from !== undefined,
    )?.value
  );
}

/** Whether a value is like a Like (rulingSchema.ts); above is what the value is inside of. */
function like(value: unknown, pattern: unknown, above: unknown[]): boolean {
  if (pattern === null) return value === undefined;
  if (Array.isArray(pattern)) return isDeepStrictEqual(value, pattern);
  if (typeof pattern !== "object") return value === pattern;
  const holder =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  // Everything the object says holds: its $ words of the value itself, its other keys of the value's
  return Object.entries(pattern).every(([word, item]) => {
    const each = (one: unknown) => like(value, one, above);
    if (word === "$any") return (item as unknown[]).some(each);
    if (word === "$all") return (item as unknown[]).every(each);
    if (word === "$not") return !each(item);
    if (word === "$in")
      return (item as unknown[]).some((candidate) =>
        isDeepStrictEqual(value, candidate),
      );
    if (word === "$nin")
      return !(item as unknown[]).some((candidate) =>
        isDeepStrictEqual(value, candidate),
      );
    if (word === "$lte") return typeof value === "number" && value <= (item as number);
    if (word === "$gte") return typeof value === "number" && value >= (item as number);
    if (word === "$lt") return typeof value === "number" && value < (item as number);
    if (word === "$gt") return typeof value === "number" && value > (item as number);
    if (word === "$exists") return Boolean(item) ? value !== undefined : value === undefined;
    if (word === "$has")
      return Array.isArray(value) && value.some((entry) => like(entry, item, above));
    if (word === "$only")
      return (
        value === undefined ||
        (Array.isArray(value) && value.every((entry) => like(entry, item, above)))
      );
    if (!holder) return false;
    if (word === "$pick") return like(pickOf(holder, above), item, above);
    return like(holder[word], item, [...above, value]);
  });
}

/** Shifts existing tag paths at or after an inserted index in an object array so paths stay accurate. */
function shiftTags(ruled: Ruled[], listPath: string, atIndex: number): void {
  const prefix = `${listPath}/`;
  for (const entry of ruled) {
    if (!entry.path.startsWith(prefix)) continue;
    const rest = entry.path.slice(prefix.length);
    const slash = rest.indexOf("/");
    const head = slash === -1 ? rest : rest.slice(0, slash);
    if (!/^\d+$/.test(head)) continue;
    const idx = Number(head);
    if (idx >= atIndex) {
      entry.path = `${prefix}${idx + 1}${slash === -1 ? "" : rest.slice(slash)}`;
    }
  }
}

const CARD_KEY_ORDER = [
  "code",
  "name",
  "printed",
  "rules",
  "summons",
  "effects",
  "source",
  "ruled",
] as const;

/** Reorders top-level CardSchema keys canonically so adding optional fields like summons/effects keeps output clean. */
function orderedCard(card: CardSchema): CardSchema {
  const record = card as unknown as Record<string, unknown>;
  const ordered: Record<string, unknown> = {};
  for (const key of CARD_KEY_ORDER) {
    if (record[key] !== undefined) ordered[key] = record[key];
  }
  for (const [key, value] of Object.entries(record)) {
    if (!(key in ordered) && value !== undefined) ordered[key] = value;
  }
  return ordered as unknown as CardSchema;
}

/**
 * A card with what the rulings that hold give it, as their files say (gives): each value they set or add, tagged with
 * what the card's text reads as there. A CARD ruling that gives what the text already reads as changes nothing, and
 * that is said (told): the text has caught up with it (Konami's database, a reprint), and it can be deleted. A ruling
 * that gives what RML can't say (unsaid) throws Unsaid, for the reader to stop at.
 */
export function withRulings(
  card: CardSchema,
  rulings: Rulings,
  told: (reason: string) => void = () => {},
): CardSchema {
  const giving = rulings.giving(card.code);
  if (!giving.length) return card;
  // Its tags are kept apart meanwhile: what a tag holds is the text's alone, and no ruling gives to it
  const { ruled = [], ...out } = structuredClone(card);
  let textBaseline: Partial<CardSchema> | undefined;
  const baseline = () => (textBaseline ??= textAlone(card));
  const tag = (path: string, ruling: string, without?: unknown) => {
    const made = ruled.find((entry) => entry.path === path);
    if (made) {
      if (!made.rulings.includes(ruling)) made.rulings.push(ruling);
    } else {
      ruled.push({
        path,
        rulings: [ruling],
        ...(without !== undefined ? { without } : {}),
      });
    }
  };
  for (const ruling of giving)
    for (const give of ruling.gives!) {
      if (give.card !== undefined && !like(out, give.card, [])) continue;
      if (give.textCard !== undefined && !like(baseline(), give.textCard, []))
        continue;
      // Found before anything is put there: what a ruling gives isn't what it is given to
      const values = found(out, give.each).filter(
        ({ value, above }) =>
          give.where === undefined || like(value, give.where, above),
      );
      const sets = setsOf(give);
      for (const { path } of values) {
        const at = (from: string) => [...path, ...from.split("/")].join("/");
        if (give.unsaid) throw new Unsaid(`ruling ${ruling.id}: ${give.unsaid}`);
        for (const set of sets) {
          const targetPath = at(set.path);
          const before = valueAt(out, targetPath);
          if (isDeepStrictEqual(before, set.value)) {
            if (ruling.cards)
              told(`ruling ${ruling.id} sets ${targetPath} to what its text already reads as: the ruling can be deleted`);
            continue;
          }
          try {
            setAt(out, targetPath, structuredClone(set.value));
          } catch (error) {
            throw new Error(
              `ruling ${ruling.id} doesn't fit ${card.name} (${card.code}) as it reads now: ${error instanceof Error ? error.message : error}`,
            );
          }
          tag(targetPath, ruling.id, before);
        }
        for (const add of give.adds ?? []) {
          const listPath = at(add.path);
          const list = (valueAt(out, listPath) as unknown[] | undefined) ?? [];
          if (list.some((entry) => isDeepStrictEqual(entry, add.entry))) {
            if (ruling.cards)
              told(`ruling ${ruling.id} adds to ${listPath} what its text already reads as: the ruling can be deleted`);
            continue;
          }
          const name = typeof add.entry === "string";
          const findMatch = (target: unknown): number =>
            name && typeof target === "string"
              ? list.indexOf(target)
              : list.findIndex((entry) => like(entry, target, []));
          let place = add.position === "start" ? 0 : list.length;
          if (add.before !== undefined) {
            const idx = findMatch(add.before);
            if (idx >= 0) place = idx;
          } else if (add.after !== undefined) {
            const idx = findMatch(add.after);
            if (idx >= 0) place = idx + 1;
          }
          if (!name && place < list.length) shiftTags(ruled, listPath, place);
          setAt(out, listPath, [
            ...list.slice(0, place),
            structuredClone(add.entry),
            ...list.slice(place),
          ]);
          tag(`${listPath}/${name ? add.entry : place}`, ruling.id);
        }
      }
    }
  return orderedCard(ruled.length ? { ...out, ruled } : out);
}
