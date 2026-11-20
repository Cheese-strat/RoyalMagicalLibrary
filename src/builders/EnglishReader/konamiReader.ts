/**
 * A card's text read into RML (README.md): its stages are names, then sentences, and the first part a stage can't
 * read ends the reading with a TextStop (parts.ts). A grammar reads whole effects, and what follows from them is
 * worked out once the text is read (finish.ts).
 */
import type {
  CardFilter,
  CardRules,
  CardSchema,
  Condition,
  EffectSchema,
  ExtraMaterials,
  Limit,
  LinkMarker,
  Material,
  MonsterAbility,
  MonsterFrame,
  Printed,
  SpellType,
  SummonMethod,
  TrapType,
} from "../../lib/cardSchema.js";
import type { Library } from "../../lib/library.js";
import {
  giveName,
  given,
  holds,
  lifted,
  readingWith,
  tagsOf,
  Unsaid,
  withRulings,
} from "../../lib/ruled.js";
import type { Rulings } from "../../lib/rulings.js";
import { Reader } from "./engine.js";
import {
  type Context,
  finishEffect,
  finishSummon,
  isActivation,
  prune,
  Unresolved,
} from "./finish.js";
import { GRAMMAR, twins } from "./grammar.js";
import { continuous, FIELD } from "./grammar/shared.js";
import { type Part, replaceNames, TextStop } from "./parts.js";
import {
  BACK_ONE,
  type Draft,
  type EquipTo,
  one,
  pickOf,
  type Sentence,
  type SummonDraft,
  THIS,
  withoutMonster,
} from "./phrases.js";

const reader = new Reader(GRAMMAR);

// The ADDITION ruling whose effect is built dynamically from the card's parsed equipTo clause
const EQUIP = "equip-spells-are-activated-on-a-monster";

const FRAMES: MonsterFrame[] = [
  "TOKEN",
  "LINK",
  "XYZ",
  "SYNCHRO",
  "FUSION",
  "RITUAL",
  "EFFECT",
  "NORMAL",
];
const ABILITIES: MonsterAbility[] = [
  "TUNER",
  "PENDULUM",
  "FLIP",
  "GEMINI",
  "UNION",
  "SPIRIT",
  "TOON",
  "SPECIAL_SUMMON_ONLY",
];
/** The ability's TYPE_ flag, where its name isn't the flag's. */
const ABILITY_FLAGS: Partial<Record<MonsterAbility, string>> = {
  GEMINI: "DUAL",
  SPECIAL_SUMMON_ONLY: "SPSUMMON",
};
const EXTRA_DECK: MonsterFrame[] = ["FUSION", "SYNCHRO", "XYZ", "LINK"];
/** MyCard's Pendulum layout: "Pendulum Scale = N", an optional "[ Pendulum Effect ]", 40 dashes, then "[ Monster Effect ]". */
const PENDULUM_LAYOUT =
  /^Pendulum Scale = (\d+)\r\n(?:\[ Pendulum Effect \]\r\n([\s\S]*?)\r\n)?-{40}\r\n\[ Monster Effect \]\r\n([\s\S]*)$/;

/**
 * Something reading found for a person to decide, which doesn't stop the reading (Cheesestrat, 2026-11-14): RML says what
 * the text says, and a warning says what else holds that the text doesn't say, or where the database disagrees with it.
 */
export interface TextWarning {
  /** The part of the text it is about (its label), when it is about one. */
  part?: string;
  reason: string;
}

/**
 * The card its text describes, with what the rulings that hold give it (the TCG's, unless others are given), each such
 * value tagged with its rulings (ruled); what it warns of is added to warnings. The text is read for what it says, then
 * the rulings are applied as their files say (gives); those that can't be written that way yet are given as it is read.
 */
export function konamiReader(
  library: Library,
  code: number,
  readerVersion: string,
  warnings: TextWarning[] = [],
  rulings: Rulings = library.rulings,
): CardSchema {
  return readingWith(rulings, () =>
    readText(library, code, readerVersion, warnings, rulings),
  );
}

function readText(
  library: Library,
  code: number,
  readerVersion: string,
  warnings: TextWarning[],
  rulings: Rulings,
): CardSchema {
  const [, name, text] =
    library.db.exec(`SELECT * FROM texts WHERE id = ${code}`)[0]?.values[0] ??
    [];
  if (typeof text !== "string" || typeof name !== "string")
    throw new Error(`card ${code} has no text row`);
  const [, , , , type, atk, def, stars, race, attribute] = (library.db.exec(
    `SELECT * FROM datas WHERE id = ${code}`,
  )[0]?.values[0] ?? []) as number[];
  if (typeof type !== "number") throw new Error(`card ${code} has no data row`);
  const types = library.constants.flags("TYPE_", type);

  // ---- the parts of the text, and what is printed ----
  const parts: Part[] = [];
  let printed: Printed;
  let context: Omit<Context, "pendulum">;
  let frame: MonsterFrame | undefined;
  if (types.includes("MONSTER")) {
    frame = FRAMES.find((f) => types.includes(f));
    if (!frame) throw new Error(`monster ${code} has no frame`);
    // Its Pendulum Scale as its text gives it, else as the database does, which a person checks where they disagree
    const database = types.includes("PENDULUM")
      ? { left: (stars >> 24) & 0xff, right: (stars >> 16) & 0xff }
      : undefined;
    const layout = text.match(PENDULUM_LAYOUT);
    const scale = layout ? Number(layout[1]) : undefined;
    const scales =
      scale === undefined ? database : { left: scale, right: scale };
    if (scale !== database?.left || scale !== database?.right)
      warnings.push({
        reason: `its text's Pendulum Scale is ${scale ?? "none"}, the database's ${database ? `${database.left}/${database.right}` : "none"}`,
      });
    let monsterText = layout ? layout[3] : text;
    // An Extra Deck monster's first line is its materials, unless it starts with "(" or ends with "."
    const first = monsterText.match(/^[^\t\r\n]*/)![0];
    if (
      EXTRA_DECK.includes(frame) &&
      !first.startsWith("(") &&
      !first.endsWith(".")
    ) {
      parts.push({ label: "materials", text: first });
      monsterText = monsterText.slice(first.length).trimStart();
    }
    if (layout?.[2] !== undefined)
      parts.push({ label: "pendulum effect", text: layout[2] });
    const flavor =
      frame === "TOKEN" || frame === "NORMAL" ? monsterText : undefined;
    parts.push(
      flavor !== undefined
        ? { label: "flavor text", text: flavor, flavor: true }
        : { label: "monster effect", text: monsterText },
    );
    const level = stars & 0xff;
    printed = {
      kind: "MONSTER",
      frame,
      abilities: ABILITIES.filter((ability) =>
        types.includes(ABILITY_FLAGS[ability] ?? ability),
      ),
      attribute: library.constants.name("ATTRIBUTE_", attribute),
      race: library.constants.name("RACE_", race),
      level: frame !== "XYZ" && frame !== "LINK" ? level : undefined,
      rank: frame === "XYZ" ? level : undefined,
      link: frame === "LINK" ? level : undefined,
      atk: atk === -2 ? undefined : atk,
      def: frame === "LINK" || def === -2 ? undefined : def,
      linkMarkers:
        frame === "LINK"
          ? (library.constants.flags("LINK_MARKER_", def) as LinkMarker[])
          : undefined,
      scales,
      flavor,
    };
    context = {
      kind: "MONSTER",
      extraDeck: EXTRA_DECK.includes(frame),
      pendulumMonster: types.includes("PENDULUM"),
    };
  } else if (types.includes("SPELL") || types.includes("TRAP")) {
    parts.push({ label: "effect", text });
    const spell = types.includes("SPELL");
    const subType = spell
      ? ((
          ["QUICKPLAY", "CONTINUOUS", "EQUIP", "FIELD", "RITUAL"] as SpellType[]
        ).find((t) => types.includes(t)) ?? "NORMAL")
      : ((["CONTINUOUS", "COUNTER"] as TrapType[]).find((t) =>
          types.includes(t),
        ) ?? "NORMAL");
    printed = spell
      ? { kind: "SPELL", subType: subType as SpellType }
      : { kind: "TRAP", subType: subType as TrapType };
    context = { kind: spell ? "SPELL" : "TRAP", subType, extraDeck: false };
  } else
    throw new Error(`card ${code} is neither a monster, a Spell nor a Trap`);

  // ---- names, then sentences ----
  for (const [i, part] of parts.entries()) {
    if (part.flavor) continue;
    const replaced = replaceNames(library, part.text);
    if (!("text" in replaced))
      throw new TextStop(
        parts,
        i,
        "names",
        replaced.at,
        replaced.length,
        replaced.reason,
      );
    part.replaced = replaced.text;
  }
  const read = parts.map((part, i): Sentence[] => {
    if (part.flavor) return [];
    const materials = part.label === "materials";
    const reading = reader.read<unknown>(
      materials ? "materialsLine" : "text",
      part.replaced!,
    );
    if (!("value" in reading))
      throw new TextStop(
        parts,
        i,
        "sentences",
        reading.at,
        reading.length,
        reading.reason,
        reading.expected,
      );
    // Drafts are finished in place, and the grammar shares what it read between readings
    const value = structuredClone(reading.value);
    return materials ? [value as Sentence] : (value as Sentence[]);
  });

  // ---- what the sentences say, together ----
  const card = assemble(parts, read, context);
  const contextOf = (part: number): Context => ({
    ...context,
    pendulum: parts[part].label === "pendulum effect",
  });
  /** Finishes what a part says, stopping at the part where its words turn out to mean nothing (finish.ts's Unresolved). */
  const finish = <T>(part: number, finishing: (context: Context) => T): T => {
    try {
      return finishing(contextOf(part));
    } catch (error) {
      if (error instanceof Unresolved) throw stopAt(parts, part, error.message);
      throw error;
    }
  };
  const summons: SummonMethod[] = [];
  // Rules from the card's text alone; Extra Deck, Ritual, Pendulum and Normal/Tribute Summons are applied from JSON
  // rulings (gives) once the text is read.
  const rules: CardRules = {
    mustBeProperlySummoned: false,
    cannotNormalSummon: false,
    ...card.rules,
  };
  // Only one of this card: a text that names another card this way would be a rule of that card
  if (card.only) {
    if (card.only.names.length !== 1 || card.only.names[0] !== code)
      throw stopAt(
        parts,
        0,
        "only one of a card that isn't this one on the field",
      );
    rules.onlyOne = { side: card.only.side };
  }
  if (card.materials && frame)
    summons.push(
      materialSummon(frame, card.materials, card.tuner, card.materialsRequire),
    );
  for (const { summon, part } of card.summons)
    summons.push(finish(part, (context) => finishSummon(summon, context)));
  // Extra Tributes from the text belong to the Normal/Tribute Summon that monsters-are-normal-summoned-by-level gives
  if (printed.kind === "MONSTER" && card.tributes.length)
    summons.push({ extraMaterials: card.tributes } as SummonMethod);

  const effects: EffectSchema[] = [];
  /** Adds an effect a ruling gives the card: without the ruling, only what its text says of the effect (its limit), if anything. */
  const addGivenEffect = (effect: EffectSchema | undefined) => {
    if (effect) effects.push(effect);
  };
  // A Continuous Spell or Trap, or a Field Spell, gets its activation from continuous-and-field-cards-are-activated-first
  // (JSON gives) unless its text says what activating it does. A limit on that activation stays as text-only here.
  const stays = context.subType === "CONTINUOUS" || context.subType === "FIELD";
  const activated = card.effects.some(({ draft }) => draft.kind === "ACTIVATE");
  if (stays && !activated && card.activationLimit)
    effects.push({ limit: card.activationLimit } as EffectSchema);
  if (card.equipTo && context.subType !== "EQUIP")
    throw stopAt(parts, 0, "what a card that isn't an Equip Spell can equip");
  if (context.subType === "EQUIP")
    finish(0, (context) =>
      equipSpell(card.equipTo, card.activationLimit, context),
    ).forEach(addGivenEffect);
  // A card has one activation, and these cards' is the rules', unless the text says what it does
  let activations =
    (stays && !activated) || context.subType === "EQUIP" ? 1 : 0;
  for (const { draft, part } of card.effects) {
    const finished = twins(draft).map((twin) =>
      finish(part, (context) => finishEffect(twin, context)),
    );
    // A card has one activation: what a second sentence of it does is part of the first, joined in a way this reader
    // doesn't read. Old texts do this ("Tribute 1 "Cyber Dragon". Special Summon 1 "Cyber Barrier Dragon" ..."), and
    // RML doesn't include old texts (Cheesestrat, 2026-11-16)
    if (finished.some((effect) => effect.kind === "ACTIVATE") && activations++)
      throw stopAt(
        parts,
        part,
        "a second sentence that is the card's activation: how it joins the first isn't read",
      );
    effects.push(...finished);
    const shortcut = nonTunerShortcut(draft, summons[0]);
    if (shortcut) warnings.push({ part: parts[part].label, reason: shortcut });
  }

  printed.archetypes = archetypesOf(library, name, card.treatedAs);
  const setcodes = setcodeDifference(library, code, printed.archetypes);
  if (setcodes) warnings.push({ reason: setcodes });
  // What rulings gave was marked where it was given: the marks come out as the card's tags
  const { value, ruled } = lifted({
    code,
    name,
    printed,
    rules,
    summons,
    effects,
    source: { readerVersion, scriptHash: "" },
  });
  const described = prune(value);
  const asRead = prune({ ...described, ruled: tagsOf(described, ruled) });
  // What the rulings' files give it; where one gives what RML can't say, the reading stops, as at words it can't read
  try {
    return withRulings(asRead, rulings, (reason) => warnings.push({ reason }));
  } catch (error) {
    if (!(error instanceof Unsaid)) throw error;
    const part = parts.findIndex((part) => part.replaced !== undefined);
    throw stopAt(parts, part, error.message);
  }
}

/**
 * An Equip Spell's activation, by the rules: it targets a face-up monster it can equip, and equips to it as it resolves,
 * keeping it as its target (CONTINUOUS_TARGET, as the scripts' equip procedure, aux.AddEquipProcedure, has it). What it
 * can equip ("Equip only to ...", or any monster) is a rule of the card while it is equipped (EQUIP_LIMIT), which
 * negating its effects doesn't lift (CANNOT_DISABLE).
 *
 * The rules give all of it but what its text says: the limit its text puts on the activation, and what "Equip only to"
 * lets it equip. Without the ruling, those are what is left.
 */
function equipSpell(
  to: EquipTo | undefined,
  activationLimit: Limit | undefined,
  context: Context,
): (EffectSchema | undefined)[] {
  const noun = to?.noun ?? { card: {}, monster: true };
  const side = to?.side ?? "BOTH";
  const target = pickOf(
    one,
    { ...noun, monster: true, faceUp: true },
    FIELD(side),
    { pick: "TARGETED" },
  );
  const activation = finishEffect(
    {
      kind: "ACTIVATE",
      limit: activationLimit,
      targets: [target],
      does: [
        {
          optional: false,
          moves: [{ move: "EQUIP", cards: THIS, to: BACK_ONE }],
        },
      ],
    },
    context,
  );
  activation.flags = [...(activation.flags ?? []), "CONTINUOUS_TARGET"];
  const limit: CardFilter = {
    ...withoutMonster(noun.card),
    ...(side !== "BOTH" ? { controller: side } : {}),
  };
  const rule = finishEffect(
    {
      kind: "CONTINUOUS",
      applies: [
        {
          effect: "EQUIP_LIMIT",
          to: "THIS_CARD",
          value: Object.keys(limit).length ? limit : 1,
        },
      ],
    },
    context,
  );
  giveName(rule, "flags", "CANNOT_DISABLE", EQUIP);
  return [given(activation, EQUIP, ["limit"]), to ? rule : given(rule, EQUIP)];
}

/** Whether a card's activation is the rules' (a Continuous, Field or Equip card's), unless its text says what it does. */
const RULES_ACTIVATE = (context: Omit<Context, "pendulum">): boolean =>
  ["CONTINUOUS", "FIELD", "EQUIP"].includes(context.subType!);

/** A stop at a whole part, which reads but doesn't make sense as a whole. */
const stopAt = (parts: Part[], part: number, reason: string) =>
  new TextStop(
    parts,
    part,
    "sentences",
    0,
    parts[part].replaced!.length,
    reason,
  );

/** Whether anything in a value passes the test. */
const finds = (value: unknown, test: (value: object) => boolean): boolean =>
  !!value &&
  typeof value === "object" &&
  (test(value) || Object.values(value).some((item) => finds(item, test)));

/**
 * A count of the materials used as non-Tuners, when its materials line fixes how many Tuners its Synchro Summon uses: they
 * are its materials minus those Tuners, which an engine that doesn't keep the role each material was used as can count
 * instead (YGOPro's scripts count GetMaterialCount()-1). A shortcut the text doesn't say, so a warning, not RML.
 */
function nonTunerShortcut(
  draft: Draft,
  summon: SummonMethod | undefined,
): string | undefined {
  if (
    summon?.method !== "SYNCHRO" ||
    !finds(draft, (value) => "role" in value && value.role === "NON_TUNER")
  )
    return undefined;
  const tuners = summon.materials![0].count;
  if (tuners === "ALL" || tuners.min !== tuners.max) return undefined;
  return (
    `it counts the materials used as non-Tuners for its Synchro Summon, which are its materials minus the ${tuners.min} ` +
    `Tuner its materials line has: an engine that doesn't keep the role each material was used as can count that instead`
  );
}

/**
 * Where the database's setcodes aren't the archetypes its name and text give. Either can be wrong, and a person decides
 * which (the archetype names, the setcodes and the scripts are all written by people).
 */
function setcodeDifference(
  library: Library,
  code: number,
  archetypes: number[],
): string | undefined {
  // Four 16-bit setcodes fill 64 bits, more than a JavaScript number holds exactly, so SQLite splits them
  const [row] = library.db.exec(
    `SELECT setcode & 65535, (setcode >> 16) & 65535, (setcode >> 32) & 65535, (setcode >> 48) & 65535 FROM datas WHERE id = ${code}`,
  )[0].values;
  const database = (row as number[]).filter((setcode) => setcode !== 0);
  const names = (setcodes: number[]) =>
    setcodes
      .map(
        (setcode) =>
          `"${library.archetypeName(setcode)}" (0x${setcode.toString(16)})`,
      )
      .join(", ");
  const unlisted = archetypes.filter((setcode) => !database.includes(setcode));
  const unnamed = database.filter((setcode) => !archetypes.includes(setcode));
  const differences = [
    ...(unlisted.length
      ? [
          `its name and text give ${names(unlisted)}, which the database's setcodes don't have`,
        ]
      : []),
    ...(unnamed.length
      ? [
          `the database's setcodes have ${names(unnamed)}, which its name and text don't give`,
        ]
      : []),
  ];
  return differences.length ? differences.join("; ") : undefined;
}

/** The sentences of every part together: effects (with the limits limitations give them, and riders added), Summons, rules. */
/** Whether an effect equips this card to a monster. */
const equipsThisCard = (draft: Draft): boolean =>
  !!draft.does?.some((part) =>
    part.moves.some(
      (move) =>
        move.move === "EQUIP" &&
        (move.cards as { who?: string } | undefined)?.who === "THIS_CARD",
    ),
  );

function assemble(
  parts: Part[],
  read: Sentence[][],
  context: Omit<Context, "pendulum">,
) {
  const card = {
    effects: [] as { draft: Draft; part: number }[],
    summons: [] as { summon: SummonDraft; part: number }[],
    rules: {} as Partial<CardRules>,
    treatedAs: [] as number[],
    tributes: [] as ExtraMaterials[],
    tuner: undefined as CardFilter | undefined,
    materials: undefined as Material[] | undefined,
    materialsRequire: undefined as Condition[] | undefined,
    equipTo: undefined as EquipTo | undefined,
    only: undefined as Sentence["only"],
    /** The limit of the card's activation, when the activation is the rules' (a Continuous, Field or Equip card's). */
    activationLimit: undefined as Limit | undefined,
  };
  // Each count of a limitation is one of the card's counters, in printed order across its parts
  let counter = 0;
  for (const [i, sentences] of read.entries()) {
    const effects: { draft: Draft; at: number }[] = [];
    const summons: { summon: SummonDraft; at: number }[] = [];
    for (const [at, sentence] of sentences.entries()) {
      if (sentence.unsaid) throw stopAt(parts, i, sentence.unsaid);
      for (const draft of sentence.effects ?? []) {
        effects.push({ draft, at });
        card.effects.push({ draft, part: i });
      }
      if (sentence.summon) {
        summons.push({ summon: sentence.summon, at });
        card.summons.push({ summon: sentence.summon, part: i });
      }
      Object.assign(card.rules, sentence.rules);
      card.treatedAs.push(...(sentence.treatedAs ?? []));
      if (sentence.tributes) card.tributes.push(sentence.tributes);
      card.tuner ??= sentence.tuner;
      card.materials ??= sentence.materials;
      card.materialsRequire ??= sentence.materialsRequire;
      card.only ??= sentence.only;
      if (sentence.equipTo) {
        if (card.equipTo)
          throw stopAt(
            parts,
            i,
            "two sentences that say what an Equip Spell can equip",
          );
        card.equipTo = sentence.equipTo;
      }
      // "It": the card the sentence before it did something to. After an Equip Spell's "Equip only to", that is the
      // monster it equips, for as long as it does, however it was equipped. After an effect that equips this card, what
      // the equip gives the monster lasts while this card stays, but whether negating this card ends it isn't known
      if (sentence.aboutIt) {
        const before = sentences[at - 1];
        if (before?.effects?.some(equipsThisCard)) {
          if (!holds("what-an-equip-by-effect-gives-the-monster"))
            throw stopAt(
              parts,
              i,
              'a sentence about "it" after an effect that equips this card: what the equip gives the monster, and whether negating this card ends it, waits for a ruling',
            );
        } else if (!before?.equipTo) {
          throw stopAt(
            parts,
            i,
            'a sentence about "it" after one that doesn\'t equip this card to a monster',
          );
        }
        const draft = continuous(
          sentence.aboutIt.map(({ effect, ...rest }) => ({
            effect,
            to: "EQUIPPED_MONSTER" as const,
            ...rest,
          })),
        );
        effects.push({ draft, at });
        card.effects.push({ draft, part: i });
      }
      if (sentence.rider) {
        const before = effects.at(-1);
        if (before?.at !== at - 1)
          throw stopAt(
            parts,
            i,
            "words that add to the effect before them, with no effect before them",
          );
        const { moves, onActivation, requires, summonType } = sentence.rider;
        const last = before.draft.does?.at(-1);
        if (moves && !last)
          throw stopAt(
            parts,
            i,
            "words that add to what the effect before them does, which does nothing",
          );
        if (moves) last!.moves.push(...moves);
        if (summonType) {
          const summon = (before.draft.does ?? [])
            .flatMap((part) => part.moves)
            .filter((move) => move.move === "SPECIAL_SUMMON")
            .at(-1);
          if (!summon)
            throw stopAt(
              parts,
              i,
              "a Summon treated as another kind, after an effect that Special Summons nothing",
            );
          summon.summonType = summonType;
        }
        if (onActivation)
          before.draft.onActivation = [
            ...(before.draft.onActivation ?? []),
            ...onActivation,
          ];
        if (requires)
          before.draft.requires = [
            ...(before.draft.requires ?? []),
            ...requires,
          ];
      }
    }
    // A limitation names effects that are used: not a continuous one
    const used = effects.filter(({ draft }) => draft.kind !== "CONTINUOUS");
    for (const [at, { effects: drafts, limitation }] of sentences.entries()) {
      // Modes with limits of their own count where their effect is printed
      for (const draft of drafts ?? [])
        if (draft.modeLimit)
          draft.modeCounters = [
            ...new Set(
              (draft.does ?? [])
                .map((part) => part.mode)
                .filter((mode) => mode !== undefined),
            ),
          ].map(() => counter++);
      if (!limitation) continue;
      const { of, together, limit } = limitation;
      if (of === "SUMMONS") {
        card.rules.summonLimit = { ...limit, counter: counter++ };
        continue;
      }
      if (of === "SUMMON") {
        const summon = summons.filter((s) => s.at < at).at(-1);
        if (!summon)
          throw stopAt(
            parts,
            i,
            "a limitation of a Summon procedure, with none before it",
          );
        summon.summon.limit = { ...limit, counter: counter++ };
        continue;
      }
      const named = (
        of === "ACTIVATION"
          ? used.filter((e) =>
              isActivation(e.draft, { ...context, pendulum: false }),
            )
          : of === "PREVIOUS"
            ? used.filter((e) => e.at < at).slice(-1)
            : of === "PRECEDING"
              ? used.filter((e) => e.at < at)
              : of === "FOLLOWING"
                ? used.filter((e) => e.at > at)
                : used
      ).map((e) => e.draft);
      if (!named.length && of === "ACTIVATION" && RULES_ACTIVATE(context)) {
        card.activationLimit = { ...limit, counter: counter++ };
        continue;
      }
      if (!named.length)
        throw stopAt(
          parts,
          i,
          `a limitation with no effect to limit: none ${of === "PREVIOUS" || of === "PRECEDING" ? "before it" : of === "FOLLOWING" ? "after it" : of === "ACTIVATION" ? "that is the card's activation" : "in its part"}`,
        );
      for (const draft of named) {
        // An effect its own words limit ("Once while face-up on the field") has this limit as well
        const field = draft.limit ? "alsoLimit" : "limit";
        if (draft[field]) throw stopAt(parts, i, "an effect three limits name");
        draft[field] = { ...limit, counter: together ? counter : counter++ };
      }
      if (together) counter++;
    }
  }
  return card;
}

/**
 * The Summon its materials line gives an Extra Deck monster. A Synchro Monster's other materials are non-Tuners, whether
 * or not the line says so (ruling: a-synchro-monsters-other-materials-are-non-tuners).
 */
function materialSummon(
  frame: MonsterFrame,
  materials: Material[],
  tuner: CardFilter | undefined,
  materialsRequire: Condition[] | undefined,
): SummonMethod {
  let slots =
    frame === "SYNCHRO" && holds("a-synchro-monsters-other-materials-are-non-tuners")
      ? materials.map((m, i) =>
          i === 0 ? m : { ...m, role: "NON_TUNER" as const },
        )
      : materials;
  // "you can treat 1 X you control as a Tuner": its Tuner can be one
  if (tuner)
    slots = [
      {
        count: slots[0].count,
        role: "ANY",
        card: { anyOf: [{ types: ["TUNER"] }, tuner] },
      },
      ...slots.slice(1),
    ];
  return {
    method: frame as SummonMethod["method"],
    from: ["EXTRA"],
    materials: slots,
    ...(materialsRequire ? { materialsRequire } : {}),
  };
}

/**
 * Its archetypes: each archetype's name its name has, in the order they come, then the ones its text says it is always
 * treated as. A name can be fused into a word, its first letter in either case ("Linkuriboh" is a "Kuriboh" card, "Decode
 * Talker" a "Code Talker" one): read that way, the names of the database's 14,239 cards give its setcodes for 13,499 of
 * them, against 13,300 when a name must start a word (2026-11-14; strings.conf names some archetypes for this, "lswarm" for
 * Evilswarm). The rest disagree ("Exchange" isn't a "Change" card), and setcodeDifference warns of each. A name inside
 * another's is in that one's archetype already (ocgcore's IsSetCard: "Synchro Dragon" is "Synchro"), so it is left out.
 */
function archetypesOf(
  library: Library,
  name: string,
  treatedAs: number[],
): number[] {
  const found: { start: number; end: number; codes: number[] }[] = [];
  for (let start = 0; start < name.length; start++) {
    for (let end = start + 1; end <= name.length; end++) {
      const piece = name.slice(start, end);
      const codes = library.named(piece).archetypes.length
        ? library.named(piece).archetypes
        : library.named(piece[0].toUpperCase() + piece.slice(1)).archetypes;
      if (codes.length) found.push({ start, end, codes });
    }
  }
  const kept = found.filter(
    (f) => !found.some((g) => g !== f && g.start <= f.start && f.end <= g.end),
  );
  return [
    ...new Set([
      ...kept.sort((a, b) => a.start - b.start).flatMap((f) => f.codes),
      ...treatedAs,
    ]),
  ];
}
