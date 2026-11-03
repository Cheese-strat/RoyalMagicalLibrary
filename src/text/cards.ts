import type { Library } from "../library.js";

/**
 * Cards as card text names them ("1 Level 4 or lower "Sky Striker" monster
 * from your Deck"): how many, what they have to be, and where they are.
 *
 * Names are constant.lua's without their prefix, as the reader's are.
 */

/** Places on each side, from the effect's player's point of view (LOCATION_ names). */
export interface TextPlaces {
  own: string[];
  opponent: string[];
}

/** Inclusive, as the schema's: min 5 is 5 or more. */
export interface TextRange {
  min?: number;
  max?: number;
  is?: number;
}

/** What a card has to be: every field present is a check, ANDed with the others. */
export interface TextFilter {
  /** Any of these TYPE_ flags. */
  types?: string[];
  /** All of these ("Continuous Spell": a Spell, and Continuous). */
  allTypes?: string[];
  /** Any of these archetypes. */
  archetypes?: number[];
  /** Any of these cards. */
  names?: number[];
  /** None of these cards ("except ..."). */
  except?: number[];
  /** Mentions this card ("that mentions ..."). */
  mentions?: number;
  attributes?: string[];
  races?: string[];
  level?: TextRange;
  rank?: TextRange;
  atk?: TextRange;
  def?: TextRange;
  faceup?: boolean;
  facedown?: boolean;
}

export interface CardPhrase {
  count: { min: number; max: number } | "ALL";
  filter: TextFilter;
  /** Where the cards are, when the phrase says ("from your Deck", "you control"). */
  from?: TextPlaces;
}

const ATTRIBUTES = ["EARTH", "WATER", "FIRE", "WIND", "LIGHT", "DARK", "DIVINE"];

/** Monster Types as card text writes them, and their RACE_ names. */
const RACES: Record<string, string> = {
  Warrior: "WARRIOR",
  Spellcaster: "SPELLCASTER",
  Fairy: "FAIRY",
  Fiend: "FIEND",
  Zombie: "ZOMBIE",
  Machine: "MACHINE",
  Aqua: "AQUA",
  Pyro: "PYRO",
  Rock: "ROCK",
  "Winged Beast": "WINDBEAST",
  Plant: "PLANT",
  Insect: "INSECT",
  Thunder: "THUNDER",
  Dragon: "DRAGON",
  "Beast-Warrior": "BEASTWARRIOR",
  Beast: "BEAST",
  Dinosaur: "DINOSAUR",
  Fish: "FISH",
  "Sea Serpent": "SEASERPENT",
  Reptile: "REPTILE",
  Psychic: "PSYCHO",
  "Divine-Beast": "DIVINE",
  "Creator God": "CREATORGOD",
  Wyrm: "WYRM",
  Cyberse: "CYBERSE",
  Illusion: "ILLUSION",
};
// Longest first, so "Beast-Warrior" is read before "Beast"
const RACE_WORDS = Object.keys(RACES).sort((a, b) => b.length - a.length);

/** Card kinds written before the noun ("Synchro Monster", "Quick-Play Spell"), and their TYPE_ names. */
const KINDS: Record<string, string> = {
  Normal: "NORMAL",
  Effect: "EFFECT",
  Tuner: "TUNER",
  Fusion: "FUSION",
  Synchro: "SYNCHRO",
  Xyz: "XYZ",
  Link: "LINK",
  Ritual: "RITUAL",
  Pendulum: "PENDULUM",
  Flip: "FLIP",
  Gemini: "DUAL",
  Toon: "TOON",
  Spirit: "SPIRIT",
  Union: "UNION",
  Continuous: "CONTINUOUS",
  "Quick-Play": "QUICKPLAY",
  Equip: "EQUIP",
  Field: "FIELD",
  Counter: "COUNTER",
};

/** What can follow an archetype's name in a card phrase: a kind, a Type, an Attribute. */
const FOLLOWS = [...Object.keys(KINDS), ...RACE_WORDS, ...ATTRIBUTES].join("|");

/** The nouns a card phrase ends in, and the TYPE_ names each checks. */
const NOUNS: [RegExp, string[]][] = [
  [/^Spell\/Trap(?: Cards?|s)?\b/, ["SPELL", "TRAP"]],
  [/^Spell(?: Cards?|s)?\b/, ["SPELL"]],
  [/^Trap(?: Cards?|s)?\b/, ["TRAP"]],
  [/^[Mm]onsters?\b/, ["MONSTER"]],
  [/^cards?\b/, []],
];

/** Places as card text writes them, after "from" or "in". */
const PLACE_WORDS: Record<string, string> = {
  Deck: "DECK",
  "Main Deck": "DECK",
  hand: "HAND",
  GY: "GRAVE",
  Graveyard: "GRAVE",
  "Extra Deck": "EXTRA",
  "Pendulum Zone": "PZONE",
  "Spell & Trap Zone": "SZONE",
  "Monster Zone": "MZONE",
  "Main Monster Zone": "MZONE",
  "Field Zone": "FZONE",
};
const PLACE_PATTERN = Object.keys(PLACE_WORDS)
  .sort((a, b) => b.length - a.length)
  .join("|");
/** "your Deck", "your hand or GY", "your hand, Deck, or GY" */
const PLACE_LIST = new RegExp(`^(${PLACE_PATTERN})(?:(?:, | or |, or )(${PLACE_PATTERN}))?(?:(?:, | or |, or )(${PLACE_PATTERN}))?`);

/**
 * A card phrase from its start: what it consumed and what it says, or null
 * when the text doesn't start with one. A card name in quotes with no noun
 * after it is that card ("1 "Thunder Dragondark""); with one, an archetype
 * ("1 "Thunder Dragon" card").
 */
export function cardPhrase(library: Library, text: string): { phrase: CardPhrase; rest: string } | null {
  let rest = text;
  const take = (pattern: RegExp) => {
    const m = rest.match(pattern);
    if (m) rest = rest.slice(m[0].length);
    return m;
  };

  let count: CardPhrase["count"];
  let m: RegExpMatchArray | null;
  if ((m = take(/^up to (\d+) /))) count = { min: 1, max: Number(m[1]) };
  else if ((m = take(/^(\d+) /))) count = { min: Number(m[1]), max: Number(m[1]) };
  else if (take(/^an? /)) count = { min: 1, max: 1 };
  else if (take(/^all /)) count = "ALL";
  else return null;

  const filter: TextFilter = {};
  const add = <K extends "types" | "attributes" | "races">(key: K, values: string[]) => {
    filter[key] = [...(filter[key] ?? []), ...values];
  };
  for (;;) {
    if ((m = take(/^face-(up|down) /))) filter[m[1] === "up" ? "faceup" : "facedown"] = true;
    else if ((m = take(/^(Level|Rank) (\d+)(?: or (lower|higher))? /))) {
      const n = Number(m[2]);
      filter[m[1] === "Level" ? "level" : "rank"] = m[3] === "lower" ? { max: n } : m[3] === "higher" ? { min: n } : { is: n };
    } else if ((m = take(new RegExp(`^(${ATTRIBUTES.join("|")})((?: or (?:${ATTRIBUTES.join("|")}))*) `))))
      add("attributes", [m[1], ...m[2].split(" or ").filter(Boolean)]);
    else if ((m = take(new RegExp(`^(${RACE_WORDS.join("|")})((?: or (?:${RACE_WORDS.join("|")}))*)(?:-Type)? `))))
      add("races", [m[1], ...m[2].split(" or ").filter(Boolean)].map((race) => RACES[race]));
    else if ((m = take(new RegExp(`^(${Object.keys(KINDS).join("|")}) (?=[A-Z]|monster)`)))) add("types", [KINDS[m[1]]]);
    else if ((m = take(new RegExp(`^"([^"]+)"((?: or "[^"]+")*) (?=Spell|Trap|[Mm]onster|card|${FOLLOWS})`)))) {
      const archetypes = [m[1], ...[...m[2].matchAll(/"([^"]+)"/g)].map((a) => a[1])].map((name) => library.archetypeCode(name));
      if (archetypes.some((code) => code === null)) return null;
      filter.archetypes = archetypes as number[];
    } else break;
  }

  // The noun, or a card's name on its own
  const noun = NOUNS.find(([pattern]) => pattern.test(rest));
  const isMonster = noun?.[1].join() === "MONSTER";
  if (noun) {
    take(noun[0]);
    const kinds = filter.types ?? [];
    // A kind of monster is checked as that kind alone (IsType(TYPE_SYNCHRO)); a kind of Spell or Trap with
    // the noun, since Continuous and Ritual are kinds of both (IsAllTypes(TYPE_SPELL+TYPE_CONTINUOUS))
    if (!kinds.length && noun[1].length) filter.types = noun[1];
    else if (noun[1].length === 1 && noun[1][0] !== "MONSTER") {
      if (kinds.includes("NORMAL") || kinds.length > 1) return null;
      filter.allTypes = [noun[1][0], ...kinds];
      delete filter.types;
    }
  } else if ((m = take(/^"([^"]+)"((?:,? or "[^"]+")*)/))) {
    if (Object.keys(filter).length) return null;
    const names = [m[1], ...[...m[2].matchAll(/"([^"]+)"/g)].map((a) => a[1])].map((name) => library.cardCode(name));
    if (names.some((code) => code === null)) return null;
    filter.names = names as number[];
  } else return null;

  // What follows the noun: ATK or DEF, a card it mentions, where it is
  for (;;) {
    if ((m = take(/^ with (\d+) or (less|more) (ATK|DEF)/))) {
      filter[m[3] === "ATK" ? "atk" : "def"] = m[2] === "less" ? { max: Number(m[1]) } : { min: Number(m[1]) };
    } else if ((m = take(/^ that mentions "([^"]+)"/))) {
      const code = library.cardCode(m[1]);
      if (code === null) return null;
      filter.mentions = code;
    } else break;
  }
  const from = placesOf(rest, isMonster);
  if (from) rest = rest.slice(from.consumed);
  // What a card on the field is can only be seen face-up: "a Dragon monster you control" is a face-up one. A
  // monster, or a Spell/Trap (whatever is in a Spell & Trap Zone is one), can be face-down; a Pendulum Zone's
  // cards are always face-up
  const onField = from && [...from.places.own, ...from.places.opponent].some((p) => ["MZONE", "SZONE", "ONFIELD", "FZONE"].includes(p));
  const anyFaceDown = !filter.types || filter.types.join() === "MONSTER" || filter.types.join() === "SPELL,TRAP";
  const checksWhat = Object.keys(filter).some((k) => k !== "types" && k !== "facedown") || !anyFaceDown;
  if (onField && checksWhat && !filter.facedown) filter.faceup = true;
  return { phrase: { count, filter, ...(from ? { from: from.places } : {}) }, rest };
}

/** A whole text as one card phrase, or null. */
export function wholeCardPhrase(library: Library, text: string): CardPhrase | null {
  const read = cardPhrase(library, text);
  return read && !read.rest ? read.phrase : null;
}

/**
 * Where the cards are, from the start of the text: "from your Deck", "in your GY",
 * "you control", "your opponent controls", "on the field", "in either GY".
 */
export function placesOf(text: string, monster: boolean): { places: TextPlaces; consumed: number } | null {
  // On the field: a monster is in a Monster Zone, any other card anywhere on it
  const field = monster ? "MZONE" : "ONFIELD";
  const fixed: [RegExp, TextPlaces][] = [
    [/^ you control/, { own: [field], opponent: [] }],
    [/^ your opponent controls/, { own: [], opponent: [field] }],
    [/^ on the field/, { own: [field], opponent: [field] }],
    [/^ in either GY/, { own: ["GRAVE"], opponent: ["GRAVE"] }],
    [/^ (?:in|from) your opponent's GY/, { own: [], opponent: ["GRAVE"] }],
  ];
  for (const [pattern, places] of fixed) {
    const m = text.match(pattern);
    if (m) return { places, consumed: m[0].length };
  }
  const m = text.match(/^ (?:in|from) your /);
  if (!m) return null;
  const list = text.slice(m[0].length).match(PLACE_LIST);
  if (!list) return null;
  const own = list.slice(1).filter(Boolean).map((word) => PLACE_WORDS[word]);
  return { places: { own, opponent: [] }, consumed: m[0].length + list[0].length };
}
