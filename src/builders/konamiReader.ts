import {
  CardRules,
  CardSchema,
  EffectSchema,
  LinkMarker,
  MonsterAbility,
  MonsterFrame,
  Printed,
  SpellType,
  TrapType,
} from "../lib/cardSchema.js";
import { Library } from "../lib/library.js";
import { applyLimitations, readEffects, Sentence } from "./konamiEffectReader.js";
//this function is intended to take yugioh card text and convert it into RML format
export function konamiReader(
  library: Library,
  code: number,
  readerVersion: string,
): CardSchema {
  let [, name, text] =
    library.db.exec(`SELECT * from texts where id = ${code}`)[0]?.values[0] ??
    [];
  if (typeof text !== "string" || typeof name !== "string")
    throw new Error(`card ${code} has no text row`);
  let [
    id,
    ot,
    alias,
    setcode,
    bitType,
    atk,
    def,
    bitLevel,
    race,
    attribute,
    category,
  ] = (library.db.exec(`SELECT * from datas where id = ${code}`)[0]
    ?.values[0] ?? []) as number[];
  if (typeof bitType !== "number")
    throw new Error(`card ${code} has no data row`);
  let types = library.constants.flags("TYPE_", bitType);
  // Archetypes come from the name and the text (the vocabulary stage); none are read yet
  let archetypes: number[] = [];
  let rules: CardRules = {
    mustBeProperlySummoned: false,
    cannotNormalSummon: false,
  };
  let source = { readerVersion: readerVersion, scriptHash: "" };
  let result: CardSchema;
  // The parts of the text, in printed order, for readText
  let parts: Part[] = [];
  // The effects the text describes, before the card's own by its type are added
  let effects: EffectSchema[];

  //handle monster case
  if (types.includes("MONSTER")) {
    // A card can carry more than one frame flag (a Ritual Effect Monster is RITUAL|EFFECT, a Token TOKEN|NORMAL): its frame is the first here
    let FRAMES: MonsterFrame[] = [
      "TOKEN",
      "LINK",
      "XYZ",
      "SYNCHRO",
      "FUSION",
      "RITUAL",
      "EFFECT",
      "NORMAL",
    ];
    let frame = FRAMES.find((str: string) => types.includes(str));
    if (!frame) throw new Error(`monster ${code} has no frame`);
    let ABILTIIES: MonsterAbility[] = [
      "TUNER",
      "PENDULUM",
      "FLIP",
      "GEMINI",
      "UNION",
      "SPIRIT",
      "TOON",
    ];
    let abilities = ABILTIIES.filter((ability) =>
      types.includes(ability === "GEMINI" ? "DUAL" : ability),
    );

    // The low byte is the Level, Rank or Link Rating; a Pendulum's scales are packed above it
    let stars = bitLevel & 0xff;
    // A Link Monster has no DEF: cards.cdb keeps its arrows there
    let links: LinkMarker[] =
      frame === "LINK"
        ? (library.constants.flags("LINK_MARKER_", def) as LinkMarker[])
        : [];
    let scales = types.includes("PENDULUM")
      ? { left: (bitLevel >> 24) & 0xff, right: (bitLevel >> 16) & 0xff }
      : undefined;
    // MyCard's Pendulum layout: "Pendulum Scale = N", an optional "[ Pendulum Effect ]", 40 dashes, then "[ Monster Effect ]"
    let layout = text.match(
      /^Pendulum Scale = (\d+)\r\n(?:\[ Pendulum Effect \]\r\n([\s\S]*?)\r\n)?-{40}\r\n\[ Monster Effect \]\r\n([\s\S]*)$/,
    );
    let scale = layout ? Number(layout[1]) : undefined;
    // A Pendulum without the layout, the layout on a non-Pendulum, or a scale other than the database's is an error
    if (scale !== scales?.left || scale !== scales?.right)
      throw new Error(
        `card ${code}: the text's Pendulum Scale (${scale}) isn't the database's (${scales?.left}/${scales?.right})`,
      );
    let pendulumText = layout?.[2];
    let monsterText = layout ? layout[3] : text;
    // An Extra Deck monster's first line is its materials, unless it starts with "(" or ends with "." (26 cards, like the Masked HEROes, have none)
    let first = monsterText.match(/^[^\t\r\n]*/)![0];
    let materials =
      ["FUSION", "SYNCHRO", "XYZ", "LINK"].includes(frame) &&
      !first.startsWith("(") &&
      !first.endsWith(".")
        ? first
        : undefined;
    if (materials !== undefined)
      monsterText = monsterText.slice(first.length).trimStart();
    // A Normal Monster or a Token has only flavor text; a Normal Pendulum's monster section is flavor too
    let flavour =
      frame === "TOKEN" || frame === "NORMAL" ? monsterText : undefined;
    if (materials !== undefined)
      parts.push({ label: "materials", text: materials });
    if (pendulumText !== undefined)
      parts.push({ label: "pendulum effect", text: pendulumText });
    parts.push(
      flavour !== undefined
        ? { label: "flavor text", text: flavour, flavor: true }
        : { label: "monster effect", text: monsterText },
    );
    effects = readText(library, parts);
    result = {
      code: code,
      name: name,
      printed: {
        kind: "MONSTER",
        frame: frame,
        abilities: abilities,
        attribute: library.constants.name("ATTRIBUTE_", attribute),
        race: library.constants.name("RACE_", race),
        level: frame !== "XYZ" && frame !== "LINK" ? stars : undefined,
        rank: frame === "XYZ" ? stars : undefined,
        link: frame === "LINK" ? stars : undefined,
        // cards.cdb stores a printed "?" as -2; it is left out, as the schema's types have no null
        atk: atk === -2 ? undefined : atk,
        def: frame === "LINK" || def === -2 ? undefined : def,
        linkMarkers: links,
        scales: scales,
        flavor: flavour,
        archetypes: archetypes,
      },
      rules: rules,
      summons: [],
      effects: effects,
      source: source,
    };
  }
  //handle spell case
  else if (types.includes("SPELL")) {
    parts.push({ label: "effect", text });
    effects = readText(library, parts);
    let SPELL_TYPES: SpellType[] = [
      "QUICKPLAY",
      "CONTINUOUS",
      "EQUIP",
      "FIELD",
      "RITUAL",
    ];
    result = {
      code: code,
      name: name,
      printed: {
        kind: "SPELL",
        subType: SPELL_TYPES.find((str) => types.includes(str)) ?? "NORMAL",
        archetypes: archetypes,
      },
      rules: rules,
      summons: [],
      effects: effects,
      source: source,
    };
  }
  //handle trap case
  else if (types.includes("TRAP")) {
    parts.push({ label: "effect", text });
    effects = readText(library, parts);
    let TRAP_TYPES: TrapType[] = ["CONTINUOUS", "COUNTER"];
    result = {
      code: code,
      name: name,
      printed: {
        kind: "TRAP",
        subType: TRAP_TYPES.find((str) => types.includes(str)) ?? "NORMAL",
        archetypes: archetypes,
      },
      rules: rules,
      summons: [],
      effects: effects,
      source: source,
    };
  } else
    throw new Error(`card ${code} is neither a monster, a Spell nor a Trap`);
  return result;
}

/** One part of a card's text: its materials, Pendulum Effect, monster effect, flavor text, or a Spell's or Trap's effect. */
export interface Part {
  label: string;
  /** As printed. */
  text: string;
  /** Flavor is printed as it is, never read. */
  flavor?: true;
  /** The text with its names replaced by codes, once the names stage has read it. */
  replaced?: string;
}

/**
 * A text exception: where reading a card's text stopped, thrown so the reading ends there
 * (Cheesestrat, 2026-11-09). It keeps the parts, so a reader can be shown how far it got.
 */
export class TextStop extends Error {
  constructor(
    readonly parts: Part[],
    /** Which of the parts. */
    readonly part: number,
    readonly stage: "names" | "sentences",
    /** Where the stage stopped in its text (the part's replaced text, once it has one, or else its printed text), and how much of it is the cause. */
    readonly at: number,
    readonly length: number,
    readonly reason: string,
  ) {
    super(`${stage}, in the ${parts[part].label}: ${reason}`);
  }
}

/**
 * Each stage reads every part before the next stage starts, and the first part a stage can't read ends
 * the reading with a TextStop (Cheesestrat, 2026-11-09): names (quoted names into codes), then
 * sentences, which give the effects the text describes, in printed order, and the limitations of them.
 * Limitations go onto the effects they name once every part is read (Cheesestrat, 2026-11-11), so no
 * sentence is read with the ones around it in mind.
 */
function readText(library: Library, parts: Part[]): EffectSchema[] {
  for (const [i, part] of parts.entries()) {
    if (part.flavor) continue;
    const replaced = replaceNames(library, part.text);
    if (!("text" in replaced))
      throw new TextStop(parts, i, "names", replaced.at, replaced.length, replaced.reason);
    part.replaced = replaced.text;
  }
  const read = parts.map((part, i): Sentence[] => {
    if (part.flavor) return [];
    // A materials line isn't sentences: it needs a reader of its own
    if (part.label === "materials")
      throw new TextStop(parts, i, "sentences", 0, part.replaced!.length, "materials aren't read yet");
    const sentences = readEffects(part.replaced!);
    if (!("effects" in sentences))
      throw new TextStop(parts, i, "sentences", sentences.at, sentences.length, sentences.reason);
    return sentences.effects;
  });
  const limited = applyLimitations(read);
  if (!("effects" in limited))
    throw new TextStop(parts, limited.part, "sentences", 0, parts[limited.part].replaced!.length, limited.reason);
  return limited.effects;
}

/** A text with its names replaced, or the text exception that stopped it: where, how much of the text is the cause, and why. */
type Replaced =
  | { text: string }
  | { at: number; length: number; reason: string };
type Named = ReturnType<Library["named"]>;

/**
 * Card text with each quoted name replaced by the codes it could be ({#89631139}, {a#0xdd},
 * {#24094653|a#0x46}), so sentences can be split without a name's characters in the way. Which of a
 * name's codes is meant is left to the sentence reader, which reads the words around it.
 */
export function replaceNames(
  library: Pick<Library, "named">,
  text: string,
): Replaced {
  let out = "";
  let from = 0;
  while (true) {
    const open = text.indexOf('"', from);
    if (open === -1) return { text: out + text.slice(from) };
    const closes: number[] = [];
    for (
      let i = text.indexOf('"', open + 1);
      i !== -1;
      i = text.indexOf('"', i + 1)
    )
      closes.push(i);
    if (!closes.length)
      return { at: open, length: 1, reason: "a quote with no closing quote" };
    // A name can hold quotes (Maxx "C"): it ends at the nearest quote that makes a name
    const close = closes.find((c) =>
      isName(library.named(text.slice(open + 1, c))),
    );
    if (close === undefined)
      return {
        at: open,
        length: closes[0] - open + 1,
        reason: `no card or archetype is named "${text.slice(open + 1, closes[0])}"`,
      };
    out +=
      text.slice(from, open) +
      token(library.named(text.slice(open + 1, close)));
    from = close + 1;
  }
}

const isName = ({ cards, archetypes }: Named) =>
  cards.length + archetypes.length > 0;
const token = ({ cards, archetypes }: Named) =>
  "{" +
  [
    ...cards.map((c) => `#${c}`),
    ...archetypes.map((a) => `a#0x${a.toString(16)}`),
  ].join("|") +
  "}";
