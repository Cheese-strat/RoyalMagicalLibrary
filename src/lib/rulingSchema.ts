/**
 * A ruling: a rule of the game that decides what a card does where its text alone doesn't. Each is a JSON file under
 * rulings/ (e.g. rulings/general/<id>.json, rulings/tcg/<id>.json, rulings/cards/<id>.json), validated against
 * rulings/rulings.schema.json and loaded automatically on RML startup (openLibrary).
 *
 * What wins over what: a ruling over a card's text, and a card's text over a script. The TCG plays by the OCG's
 * rulings, except where a TCG ruling replaces one: a head judge's ruling taken as precedent, or a card's TCG text
 * that plays differently from the OCG card (a mistranslation is played as printed until Konami's database says
 * otherwise, and the database's text is played before it is reprinted).
 *
 * A reader follows the rulings that hold in the region it reads for, and writes into each card which of its values a
 * ruling gave (cardSchema.ts's Ruled), so a writer of card text leaves them out, and a difference from a script can be
 * traced to the ruling behind it.
 *
 * A ruling says what it gives cards in its file (gives), for a program: a reader reads a card's text for what the text
 * says, then applies every such ruling that holds, as written. So updating or adding a ruling is a JSON edit, loaded
 * automatically on startup, with no code changes.
 */
export interface Ruling {
  /** Optional JSON Schema reference for editor autocomplete and validation. */
  $schema?: string;
  /**
   * Its name, in a card's tags and in the reader's code: lower-case words joined by hyphens.
   * Optional in JSON: defaults to the file's basename without ".json".
   */
  id: string;
  /** The rule, as a judge would say it. */
  statement: string;
  kind: RulingKind;
  /**
   * Whose rule it is. OCG: the base, which holds in the TCG too unless a TCG ruling replaces it. TCG: only there.
   * Optional in JSON: defaults to "TCG" inside rulings/tcg/, otherwise "OCG".
   */
  region: Region;
  /** A TCG ruling: the OCG rulings that don't hold in the TCG because of it. */
  replaces?: string[];
  /**
   * APPLIED: it holds, and readers follow it. WAITING: not decided yet (or temporarily disabled), so it doesn't hold.
   * Optional in JSON: defaults to "APPLIED".
   */
  status: "APPLIED" | "WAITING";
  /**
   * Evaluation order for gives rulings: lower runs first (default 0; ties break alphabetically by id).
   * Use this when one ruling depends on what another ruling sets (e.g. Ritual setting cannotNormalSummon before
   * Normal Summon by Level checks it).
   */
  priority?: number;
  /** WAITING (or historical note): what isn't decided. */
  question?: string;
  /** WAITING (or historical note): what readers do until it is. */
  meanwhile?: string;
  /** Where it comes from, the most authoritative first. Optional in JSON (defaults to []). */
  sources: Source[];
  /** A CARD ruling: the cards it is about, by passcode. */
  cards?: number[];
  /**
   * What it gives cards, written for a program, which applies each in order once a card's text is read. A CARD ruling
   * has it, for its cards. An ADDITION ruling has it for every card, unless what it gives depends on dynamic parsing
   * hooks in the reader: then the reader's code checks holds(id).
   */
  gives?: Give[];
  /** How scripts differ from it, as found: what tells a script's bug from a reading of ours. */
  scripts?: string;
  /** Cards that show it, each checked by a test. */
  examples?: Example[];
}

/**
 * A ruling as written in a JSON file before defaults are filled in:
 * id defaults to the filename, region to "TCG" under tcg/ else "OCG", status to "APPLIED", sources to [].
 */
export type RawRuling = Omit<Ruling, "id" | "region" | "status" | "sources"> &
  Partial<Pick<Ruling, "id" | "region" | "status" | "sources">>;

/**
 * - MEANING: what words of a card's text mean ("If" doesn't miss timing; "You can only activate" is an oath). What they
 *   give a card is its text's own, so it isn't tagged, and a writer of card text writes the words back. The reader's
 *   grammar/finisher checks holds(id) so toggling status/region/replaces in JSON takes effect immediately.
 * - ADDITION: what the rules give a card that no word of its text says (a Ritual Monster cannot be Normal Summoned; a
 *   Trap's Trigger Effect is Spell Speed 2). Tagged in the card (Ruled), with what its text alone reads as there.
 * - CARD: what named cards do in place of what their text reads as. Tagged the same way. One that gives what the
 *   card's text already reads as is warned of: the text has caught up with it (Konami's database, a reprint).
 */
export type RulingKind = "MEANING" | "ADDITION" | "CARD";

export type Region = "OCG" | "TCG";

/**
 * One thing a ruling gives: to which cards (card / textCard), to which of their values (each, where), and what
 * (sets, unsets, adds, unsaid).
 * "A Trap's Trigger Effects are Spell Speed 2" is:
 * { card: { printed: { kind: "TRAP" } }, each: "effects/*", where: { kind: "TRIGGER" }, sets: { speed: 2 } }.
 */
export interface Give {
  /** Only to cards like this (matching current state after earlier rulings); to every card when left out. */
  card?: Like;
  /** Only to cards whose text-alone reading (before any ADDITION rulings) is like this. */
  textCard?: Like;
  /**
   * To each value of the card at this path (Ruled's), where "*" is every entry of a list, and "**" every value at any
   * depth, the card included ("**" with a where finds every move of a kind, wherever an effect makes it). To the card
   * itself, when left out.
   */
  each?: string;
  /** Only to the values like this. */
  where?: Like;
  /**
   * What it puts there, at paths from the value, in place of what is there.
   * Concise object form ({ "speed": 2, "rules/mustBeProperlySummoned": true }) or array form ([{ path, value }]).
   */
  sets?: Record<string, unknown> | RulingSet[];
  /** Paths from the value to remove (concise alternative to a RulingSet without value). */
  unsets?: string[];
  /** What it adds to lists there, at paths from the value. */
  adds?: RulingAdd[];
  /**
   * RML can't say what the ruling gives a value like this, and why: the reading of a card that has one stops there, as
   * at words it can't read, rather than say something else.
   */
  unsaid?: string;
}

/** A value put at a path; with no value, nothing is there. */
export interface RulingSet {
  path: string;
  value?: unknown;
}

/**
 * An entry added to the list at a path, unless the list already has it:
 * - position: "start" puts it at index 0, "end" (default) at the end;
 * - before / after: a string name or a Like pattern to insert immediately before or after a matching entry when one
 *   exists (falls back to position / end otherwise).
 */
export interface RulingAdd {
  path: string;
  entry: unknown;
  position?: "start" | "end";
  before?: string | Like;
  after?: string | Like;
}

/**
 * What a value must be like:
 * - a string, a number, true or false: the value is that;
 * - null: nothing is there (undefined);
 * - a list: the value is deeply equal to that list;
 * - an object: everything it says holds. Each of its keys is a key of the value, with a value like the key's
 *   ({ kind: "TRIGGER" }), except the words that start with $, which are about the value itself:
 *   - $any: [...]: matches any one pattern; $all: [...]: matches every pattern; $not: like: does not match;
 *   - $in: [...]: value deeply equals one of these; $nin: [...]: value deeply equals none of these;
 *   - $lte / $gte / $lt / $gt: number: numeric comparison (false if value is not a number);
 *   - $exists: boolean: true when value !== undefined, false when value === undefined;
 *   - $has: like: value is a list with an entry matching like;
 *   - $only: like: value is undefined or a list where every entry matches like;
 *   - $pick: like, on a move: the move that says what its cards are matches like (itself, or the earlier move of its
 *     effect that took the same pick).
 */
export type Like =
  | null
  | string
  | number
  | boolean
  | unknown[]
  | { [key: string]: unknown };

/**
 * Where a ruling comes from. says is what the source says, in English and in our words: a person checks a ruling
 * against it without reading Japanese.
 */
export type Source =
  /** Konami's rulebook: which one, and where in it. */
  | { from: "RULEBOOK"; where: string; says: string }
  /**
   * An entry of the Q&A in Konami's card database (db.yugioh-card.com, which is the OCG's; mirrored with its history
   * at github.com/db-ygoresources-com/yugioh-qa-history as <id>.json), as it stood on date, its databaseDate.
   */
  | { from: "QA"; id: number; date: string; says: string }
  /**
   * A card's FAQ in that database (yugioh-faq-history's <card>.json): card is Konami's id of it, not its passcode,
   * name the card's English name, effect the printed number of the effect the lines are under ("1" for ①; "0" for
   * the card as a whole).
   */
  | { from: "FAQ"; card: number; name: string; effect?: string; date: string; says: string }
  /** A head judge's ruling at a TCG event, taken as precedent. */
  | { from: "HEAD_JUDGE"; event: string; date: string; says: string }
  /**
   * The card's TCG text, where it plays differently from the OCG card: as printed (a mistranslation), or as Konami's
   * database has it ahead of a reprint. card is its passcode.
   */
  | { from: "TCG_TEXT"; card: number; date: string; says: string }
  /** A person's statement of the rule, until an official source is found for it. */
  | { from: "PLAYER"; by: string; date: string };

/**
 * A card that shows a ruling: reading it gives this value at this path (any value, when none is given), and for an
 * ADDITION or CARD ruling, a tag there that names the ruling. name is the card's, for a person reading the file.
 */
export interface Example {
  card: number;
  name: string;
  path: string;
  value?: unknown;
}
