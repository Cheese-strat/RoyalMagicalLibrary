import type {
  Applied,
  CardFilter,
  CardRef,
  Condition,
  EffectSchema,
  Limit,
  Move,
  Part,
  Places,
  Value,
} from "../lib/cardSchema.js";

/**
 * The grammar: for each kind of phrase, the ways card text writes it and what each means.
 *
 * A pattern is the words as printed, with {kind} where a phrase of that kind goes. Its meaning is made
 * from the meanings of those phrases, named by their kinds. Two kinds are built in and read one token:
 * {number} (500) and {name} (a name code from the names stage, {#…} or {a#…}).
 *
 * Another way of writing a phrase is another pattern. A pattern can't start with a slot of its own kind
 * ("{card} and {card}" as a card): reading it would never end.
 */
const GRAMMAR: Grammar = {
  //the overarching type of all sentences of effect text
  sentence: [
    [
      "While {condition}, {applied}.",
      ({ condition, applied }) => continuous([condition], applied),
    ],
    ["{limitation}", ({ limitation }) => limitation],
  ],
  //for an effect that contains ":" this is an activated effect and will be split into 2 parts
  activation: [],
  //wording for a whole sentence dedicated to a restriction or once per turn
  limitation: [
    [
      "You can only use this effect of {name} once per turn.",
      () => ({ of: "PREVIOUS", together: false, limit: ONCE_PER_TURN }),
    ],
    [
      "You can only use each effect of {name} once per turn.",
      () => ({ of: "ALL", together: false, limit: ONCE_PER_TURN }),
    ],
    [
      "You can only use each of the following effects of {name} once per turn.",
      () => ({ of: "FOLLOWING", together: false, limit: ONCE_PER_TURN }),
    ],
    [
      "You can only use {number} {name} effect per turn, and only once that turn.",
      ({ number }) => ({
        of: "ALL",
        together: true,
        limit: { ...ONCE_PER_TURN, count: number },
      }),
    ],
  ],
  //to handle the conjuction words, "and if you do", "then", "also", "and", "also after that"
  part: [],
  //movement of a card or cards to another location {verb} {count} {cards} {place}
  move: [],
  //continous effects
  applied: [
    [
      "{places} lose {number} ATK",
      ({ places, number }) => [
        { effect: "UPDATE_ATTACK", to: { places }, value: -number },
      ],
    ],
    [
      "{places} cannot attack, except to attack {reference}",
      ({ places, reference }) => [
        // They can't select any battle target but that one...
        {
          effect: "CANNOT_SELECT_BATTLE_TARGET",
          to: { places },
          value: { none: [{ among: [reference] }] },
        },
        // ...and an attack directly isn't an attack on it either
        { effect: "CANNOT_DIRECT_ATTACK", to: { places }, value: 1 },
      ],
    ],
  ],
  //a restriction or required values
  condition: [
    [
      "{reference} is {description}",
      ({ reference, description }) => ({
        is: { cards: reference, filter: description },
      }),
    ],
    [
      "you control a monster in your {zone}",
      ({ zone }) => ({
        atLeast: 1,
        of: {
          matching: {
            count: 1,
            from: { own: ["MZONE"] },
            card: zone,
            targetable: false,
          },
        },
      }),
    ],
  ],
  //CardFilter? not sure what text this would be used for
  description: [["in Defense Position", () => ({ positions: ["DEFENSE"] })]],
  //places {owner} {zone}
  places: [
    ["monsters your opponent controls", () => ({ opponent: ["MZONE"] })],
    ["your opponent's monsters", () => ({ opponent: ["MZONE"] })],
  ],

  //reference to a card written somewhere else in the text
  reference: [["this card", () => ({ who: "THIS_CARD" })]],

  //numbers or calculations
  numbers: [],

  zone: [
    [
      "center Main Monster Zone",
      () => ({ places: ["MZONE"], numbers: { SEQUENCE: { is: [2] } } }),
    ],
  ],
};

/** What a phrase of each kind means once read. */
interface Kinds {
  sentence: Sentence;
  /** The fields of an effect a trigger or an activation gives ("If this card is Summoned:", "discard 1 card;"), which its sentence puts into the effect. */
  activation: Partial<EffectSchema>;
  limitation: Limitation;
  part: Part[];
  move: Move;
  /** One phrase can apply several ("cannot attack, except to attack that monster" is two). */
  applied: Applied[];
  condition: Condition;
  description: CardFilter;
  places: Places;
  reference: CardRef;
  numbers: Value;
  zone: CardFilter;
}
type Kind = keyof Kinds | "number" | "name";
type Grammar = { [K in keyof Kinds]: Pattern<Kinds[K]>[] };
/** A way of writing a phrase, and what it means from the meanings of the phrases in its slots. */
type Pattern<T> = [pattern: string, meaning: (slots: any) => T];

/** What a sentence says: an effect, or a limitation of other effects. */
export type Sentence = EffectSchema | Limitation;

/**
 * A sentence that limits how often other effects of the card can be used ("You can only use this effect of X once
 * per turn"): an unregistered effect. Once the whole text is read, its limit goes onto the effects it names
 * (applyLimitations), so no sentence needs to know the ones around it as it is read.
 */
export interface Limitation {
  /** Which effects of its part: the one before it, every one, or every one after it. */
  of: "PREVIOUS" | "ALL" | "FOLLOWING";
  /** They share one count ("1 X effect per turn"), rather than each having its own ("each effect"). */
  together: boolean;
  /** The counter is given as it is applied: one of the card's own for each count. */
  limit: Omit<Limit, "counter">;
}

/** Once per turn for every copy of the card (a hard once per turn), its name's count. */
const ONCE_PER_TURN = {
  count: 1,
  per: "TURN",
  shared: "NAME",
  oath: false,
} as const;

/** A continuous effect: what applies while its conditions hold. */
const continuous = (
  requires: Condition[],
  applies: Applied[],
): EffectSchema => ({
  kind: "CONTINUOUS",
  fromProcedure: false,
  inSummons: false,
  mandatory: false,
  targets: false,
  offered: { own: [], opponent: [] },
  requires,
  applies,
});

// ---- reading text with the grammar ----

/** The effects a text describes (limitations among them, not yet applied), or where and why reading it stopped. */
export type Effects =
  | { effects: Sentence[] }
  | { at: number; length: number; reason: string };

/**
 * Reads a text (one part of a card's, with its names already codes) as sentences. It is read every way the
 * grammar allows: exactly one reading is its effects, and more than one is a stop, as the grammar has
 * patterns that overlap and which is meant isn't known.
 */
export function readEffects(text: string): Effects {
  const reader: Reader = {
    tokens: tokenize(text),
    known: new Map(),
    furthest: 0,
    expected: new Set(),
  };
  const readings = readSentences(reader, 0);
  if (readings.length === 1) return { effects: readings[0] };
  if (readings.length > 1)
    return {
      at: 0,
      length: text.length,
      reason: `the text reads ${readings.length} ways: the grammar has patterns that overlap`,
    };
  const token = reader.tokens[reader.furthest];
  return {
    at: token?.at ?? text.length,
    length: token?.text.length ?? 0,
    reason: `expected ${[...reader.expected].join(" or ")}`,
  };
}

/**
 * The effects of a card's parts once all of them are read, each limitation's limit on the effects it names, in its
 * own part ("each effect" in the monster effect is the monster effects). Each count is one of the card's counters,
 * across its parts. A limitation that names no effect, or an effect two name, is where reading stops.
 */
export function applyLimitations(
  parts: Sentence[][],
): { effects: EffectSchema[] } | { part: number; reason: string } {
  const isEffect = (sentence: Sentence) => "kind" in sentence;
  let counter = 0;
  for (const [part, sentences] of parts.entries())
    for (const [at, sentence] of sentences.entries()) {
      if (isEffect(sentence)) continue;
      const { of, together, limit } = sentence as Limitation;
      const named = (
        of === "PREVIOUS"
          ? sentences.slice(0, at).filter(isEffect).slice(-1)
          : of === "FOLLOWING"
            ? sentences.slice(at + 1)
            : sentences
      ).filter(isEffect) as EffectSchema[];
      if (!named.length)
        return {
          part,
          reason: `a limitation with no effect to limit: none ${of === "PREVIOUS" ? "before it" : of === "FOLLOWING" ? "after it" : "in its part"}`,
        };
      for (const effect of named) {
        if (effect.limit)
          return { part, reason: "an effect two limitations name" };
        effect.limit = { ...limit, counter: together ? counter : counter++ };
      }
      if (together) counter++;
    }
  return { effects: parts.flat().filter(isEffect) as EffectSchema[] };
}

/** A word, number, name code or punctuation mark, and where it starts in the text. */
interface Token {
  text: string;
  at: number;
}
const TOKEN = /\{[^}]*\}|\d+|[A-Za-z]+(?:[-'][A-Za-z]+)*|\S/g;
const tokenize = (text: string): Token[] =>
  [...text.matchAll(TOKEN)].map((m) => ({ text: m[0], at: m.index! }));

/** One text being read. */
interface Reader {
  tokens: Token[];
  /** The readings of each kind from each token ("card@4"), worked out once. */
  known: Map<string, Read[]>;
  /** The furthest token any pattern got to, and what was expected there: where reading stops. */
  furthest: number;
  expected: Set<string>;
}

/** One way of reading a phrase: what it means, and the token after it. */
interface Read {
  value: unknown;
  end: number;
}

/** A pattern as it is followed: words to match, and slots for phrases of a kind. */
type Step = { word: string } | { slot: Kind };
const steps = (pattern: string): Step[] =>
  tokenize(pattern).map(({ text }) => {
    const slot = text.match(/^\{(\w+)\}$/)?.[1];
    return slot ? { slot: slot as Kind } : { word: text };
  });

/** Every way the tokens from at to the end are sentences. */
function readSentences(reader: Reader, at: number): Sentence[][] {
  if (at === reader.tokens.length) return [[]];
  const readings = readKind(reader, "sentence", at).flatMap((sentence) =>
    readSentences(reader, sentence.end).map((rest) => [
      sentence.value as Sentence,
      ...rest,
    ]),
  );
  expect(reader, at, "the end of the text");
  return readings;
}

/** Every way the tokens from at start with a phrase of this kind. */
function readKind(reader: Reader, kind: Kind, at: number): Read[] {
  const token = reader.tokens[at];
  if (kind === "number")
    return /^\d+$/.test(token?.text ?? "")
      ? [{ value: Number(token.text), end: at + 1 }]
      : expect(reader, at, "a number");
  if (kind === "name")
    return token?.text.startsWith("{")
      ? [{ value: token.text, end: at + 1 }]
      : expect(reader, at, "a name");
  const key = `${kind}@${at}`;
  if (!reader.known.has(key))
    reader.known.set(
      key,
      (GRAMMAR[kind] as Pattern<unknown>[]).flatMap(([pattern, meaning]) =>
        follow(reader, steps(pattern), at, {}).map(({ slots, end }) => ({
          value: meaning(slots),
          end,
        })),
      ),
    );
  return reader.known.get(key)!;
}

/** Every way the tokens from at follow these steps: the meanings read into the slots, and the token after them. */
function follow(
  reader: Reader,
  steps: Step[],
  at: number,
  slots: Record<string, unknown>,
): { slots: Record<string, unknown>; end: number }[] {
  const [step, ...rest] = steps;
  if (!step) return [{ slots, end: at }];
  if ("slot" in step)
    return readKind(reader, step.slot, at).flatMap((phrase) =>
      follow(reader, rest, phrase.end, { ...slots, [step.slot]: phrase.value }),
    );
  if (reader.tokens[at]?.text === step.word)
    return follow(reader, rest, at + 1, slots);
  // What was expected: the pattern's words from here to its next slot
  const next = steps.findIndex((step) => "slot" in step);
  const words = (next === -1 ? steps : steps.slice(0, next)).map(
    (step) => (step as { word: string }).word,
  );
  // Joined as printed: no space before punctuation
  return expect(reader, at, `"${words.join(" ").replace(/ (?=[,.;:)])/g, "")}"`);
}

/** Notes what was expected at a token, for where reading stops; there is no reading there. */
function expect(reader: Reader, at: number, what: string): [] {
  if (at > reader.furthest) {
    reader.furthest = at;
    reader.expected.clear();
  }
  if (at === reader.furthest) reader.expected.add(what);
  return [];
}
