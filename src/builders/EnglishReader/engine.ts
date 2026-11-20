/**
 * Reads token sequences with a grammar of patterns, the way the first text reader did (Cheesestrat's design): a
 * pattern is the words as printed with {kind} where a phrase of that kind goes, every reading is tried, and a text
 * means something only when it reads exactly one way.
 *
 * Three additions: a slot can be named, {name:kind}, so a pattern can hold two phrases of one kind ("{a:places} or
 * {b:places}"); readings of a phrase that mean the same thing are one reading, as two patterns that agree on what
 * words mean aren't a question of which is meant; and a slot can be a bulleted list, {name:●kind}: the bullet belongs
 * to the list, and the words before the list say what kind of phrase its bullets hold.
 */

/** A word, number, name code or punctuation mark, and where it starts in the text. */
export interface Token {
  text: string;
  at: number;
}
const TOKEN = /\{[^}]*\}|\d+|[A-Za-z]+(?:[-'][A-Za-z]+)*|\S/g;
export const tokenize = (text: string): Token[] =>
  [...text.matchAll(TOKEN)].map((m) => ({ text: m[0], at: m.index! }));

/** A way of writing a phrase, and what it means from the meanings of the phrases in its slots (by name, or by kind). */
export type Pattern = [pattern: string, meaning: (slots: any) => unknown];
/**
 * For each kind of phrase, the ways it is written. Two kinds are built in: number (500) and name (a code from the
 * names stage). So is the bulleted list of any kind (●kind), whose meaning is its phrases' meanings in order.
 */
export type Grammar = Record<string, Pattern[]>;
/** What starts each phrase of a list. */
const BULLET = "●";

/** A pattern as it is followed: words to match, and slots for phrases of a kind. */
type Step = { word: string } | { slot: string; name: string };

/** One way of reading a phrase: what it means, and the token after it. */
interface Read {
  value: unknown;
  end: number;
}

/**
 * Thrown by a meaning, from however deep, when its words contradict each other ("two values of controller in one
 * filter"): like a meaning of undefined, that pattern has no reading there.
 */
export class NoReading extends Error {}

/**
 * What has exactly one reading, or where reading stopped and why. When it stopped for words no pattern has there, the
 * reason says what was expected, and expected lists each of those on its own.
 */
export type Reading<T> =
  | { value: T }
  | { at: number; length: number; reason: string; expected?: string[] };

export class Reader {
  private readonly steps = new Map<string, Step[]>();
  constructor(private readonly grammar: Grammar) {
    for (const [kind, patterns] of Object.entries(grammar))
      for (const [pattern] of patterns) {
        const steps = this.stepsOf(pattern);
        if ("slot" in steps[0] && steps[0].slot === kind)
          throw new Error(
            `a ${kind} pattern starts with its own kind: ${pattern}`,
          );
      }
  }

  private stepsOf(pattern: string): Step[] {
    let steps = this.steps.get(pattern);
    if (!steps) {
      steps = tokenize(pattern).map(({ text }) => {
        const slot = text.match(/^\{(?:(\w+):)?(●?\w+)\}$/);
        return slot
          ? { slot: slot[2], name: slot[1] ?? slot[2] }
          : { word: text };
      });
      this.steps.set(pattern, steps);
    }
    return steps;
  }

  /** Reads the whole text as one phrase of this kind. */
  read<T>(kind: string, text: string): Reading<T> {
    const reading = new Reading_(this, tokenize(text));
    const readings = reading
      .kind(kind, 0)
      .filter((read) => read.end === reading.tokens.length);
    if (readings.length === 1) return { value: readings[0].value as T };
    if (readings.length > 1)
      return {
        at: 0,
        length: text.length,
        reason: `the text reads ${readings.length} ways: the grammar has patterns that overlap`,
      };
    const token = reading.tokens[reading.furthest];
    return {
      at: token?.at ?? text.length,
      length: token?.text.length ?? 0,
      reason: `expected ${[...reading.expected].join(" or ")}`,
      expected: [...reading.expected],
    };
  }

  patterns(kind: string): Pattern[] {
    const patterns = this.grammar[kind];
    if (!patterns) throw new Error(`no kind ${kind} in the grammar`);
    return patterns;
  }
  stepsFor(pattern: string): Step[] {
    return this.stepsOf(pattern);
  }
}

/** One text being read. */
class Reading_ {
  /** The readings of each kind from each token ("card@4"), worked out once. */
  private readonly known = new Map<string, Read[]>();
  /** The furthest token any pattern got to, and what was expected there: where reading stops. */
  furthest = 0;
  readonly expected = new Set<string>();
  constructor(
    private readonly reader: Reader,
    readonly tokens: Token[],
  ) {}

  /** Every way the tokens from at start with a phrase of this kind, one for each meaning. */
  kind(kind: string, at: number): Read[] {
    const token = this.tokens[at];
    if (kind === "number")
      return /^\d+$/.test(token?.text ?? "")
        ? [{ value: Number(token.text), end: at + 1 }]
        : this.expect(at, "a number");
    if (kind === "name")
      return token?.text.startsWith("{")
        ? [{ value: codes(token.text), end: at + 1 }]
        : this.expect(at, "a name");
    const key = `${kind}@${at}`;
    let reads = this.known.get(key);
    if (!reads && kind.startsWith(BULLET)) {
      reads = this.bulleted(kind.slice(BULLET.length), at);
      this.known.set(key, reads);
    }
    if (!reads) {
      // Marked as read while it is worked out: a pattern reached again at the same token without moving reads nothing
      this.known.set(key, []);
      const unique = new Map<string, Read>();
      for (const [pattern, meaning] of this.reader.patterns(kind))
        for (const { slots, end } of this.follow(
          this.reader.stepsFor(pattern),
          at,
          {},
        )) {
          let value: unknown;
          try {
            value = meaning(slots);
          } catch (error) {
            if (error instanceof NoReading) continue;
            throw error;
          }
          if (value === undefined) continue;
          unique.set(`${end} ${JSON.stringify(value)}`, { value, end });
        }
      reads = [...unique.values()];
      this.known.set(key, reads);
    }
    return reads;
  }

  /**
   * Every way the tokens from at start with a bulleted list of this kind: a bullet and a phrase of the kind, one or
   * more times. Its meaning is the phrases' meanings, in order.
   */
  private bulleted(kind: string, at: number): Read[] {
    if (this.tokens[at]?.text !== BULLET) return this.expect(at, `"${BULLET}"`);
    return this.kind(kind, at + 1).flatMap((phrase) => [
      { value: [phrase.value], end: phrase.end },
      ...this.kind(BULLET + kind, phrase.end).map((rest) => ({
        value: [phrase.value, ...(rest.value as unknown[])],
        end: rest.end,
      })),
    ]);
  }

  /** Every way the tokens from at follow these steps: the meanings read into the slots, and the token after them. */
  private follow(
    steps: Step[],
    at: number,
    slots: Record<string, unknown>,
  ): { slots: Record<string, unknown>; end: number }[] {
    const [step, ...rest] = steps;
    if (!step) return [{ slots, end: at }];
    if ("slot" in step)
      return this.kind(step.slot, at).flatMap((phrase) =>
        this.follow(rest, phrase.end, { ...slots, [step.name]: phrase.value }),
      );
    if (sameWord(this.tokens[at]?.text, step.word))
      return this.follow(rest, at + 1, slots);
    // What was expected: the pattern's words from here to its next slot
    const next = steps.findIndex((s) => "slot" in s);
    const words = (next === -1 ? steps : steps.slice(0, next)).map(
      (s) => (s as { word: string }).word,
    );
    return this.expect(at, `"${words.join(" ").replace(/ (?=[,.;:)])/g, "")}"`);
  }

  /** Notes what was expected at a token, for where reading stops; there is no reading there. */
  private expect(at: number, what: string): [] {
    if (at > this.furthest) {
      this.furthest = at;
      this.expected.clear();
    }
    if (at === this.furthest) this.expected.add(what);
    return [];
  }
}

/** A word as printed matches the pattern's whatever the case of its first letter: a sentence's first word is capitalised. */
const sameWord = (token: string | undefined, word: string) =>
  token !== undefined &&
  (token === word ||
    (token.slice(1) === word.slice(1) &&
      token[0].toLowerCase() === word[0].toLowerCase()));

/** What a name code from the names stage can be: cards ({#89631139}), archetypes ({a#0xdd}), or both. */
export interface Codes {
  cards: number[];
  archetypes: number[];
}
const codes = (token: string): Codes => {
  const result: Codes = { cards: [], archetypes: [] };
  for (const code of token.slice(1, -1).split("|"))
    if (code.startsWith("a#"))
      result.archetypes.push(parseInt(code.slice(2), 16));
    else result.cards.push(Number(code.slice(1)));
  return result;
};
