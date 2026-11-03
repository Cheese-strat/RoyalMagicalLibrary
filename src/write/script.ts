import type * as S from "../cardSchema.js";
import type { Dialect, MaterialMethod } from "./dialects.js";
import { OTHER_RESETS, STANDARD_RESETS } from "../read/context.js";

/**
 * A card's script, written from its description in RML's format
 * (cardSchema.ts) for one engine: the description is the card, and a script
 * is one engine's way of saying it. Each thing is written the way the
 * engines' own scripts write it, so that the reader reads the script back
 * into the same description (test/write.test.ts).
 *
 * What the description doesn't say, or says in a way no rule here writes
 * yet, is unwritten, never guessed: a card with anything unwritten gets no
 * script.
 */
export interface Written {
  script?: string;
  /** What of the description no rule here writes yet: the card is written when this is empty. */
  unwritten: string[];
}

export function writeScript(card: S.CardSchema, dialect: Dialect): Written {
  const writer = new Writer(card, dialect);
  const setup = writer.card();
  if (writer.unwritten.length) return { unwritten: [...new Set(writer.unwritten)] };
  const { script, unknown } = dialect.finish(
    [
      `--${card.name}`,
      "--written by RML from its description",
      dialect.header,
      "function s.initial_effect(c)",
      ...indent(setup),
      "end",
      ...writer.functions,
      "",
    ].join("\n"),
  );
  if (unknown.length) return { unwritten: [`constants ${dialect.engine} has no name for: ${unknown.join(", ")}`] };
  return { script, unwritten: [] };
}

/** Thrown where a description can't be written: caught per effect, and kept as the reason. */
class Unwritten extends Error {}

const unwritten = (what: string): never => {
  throw new Unwritten(what);
};

/** Each move's category: what it is declared and categorized as. */
const MOVE_CATEGORY: Partial<Record<S.MoveName, string>> = {
  TO_HAND: "TOHAND",
  SPECIAL_SUMMON: "SPECIAL_SUMMON",
  TO_GRAVE: "TOGRAVE",
  BANISH: "REMOVE",
  DESTROY: "DESTROY",
  DRAW: "DRAW",
  DAMAGE: "DAMAGE",
  GAIN_LP: "RECOVER",
  DISCARD: "HANDES",
  TO_DECK: "TODECK",
  NEGATE_ACTIVATION: "NEGATE",
  NEGATE_EFFECT: "DISABLE",
  TRIBUTE: "RELEASE",
};

/** The hint shown when a move's cards are selected. */
const HINTS: Partial<Record<S.MoveName, string>> = {
  TO_HAND: "HINTMSG_ATOHAND",
  SPECIAL_SUMMON: "HINTMSG_SPSUMMON",
  TO_GRAVE: "HINTMSG_TOGRAVE",
  BANISH: "HINTMSG_REMOVE",
  DESTROY: "HINTMSG_DESTROY",
  DISCARD: "HINTMSG_DISCARD",
  TRIBUTE: "HINTMSG_RELEASE",
  TO_DECK: "HINTMSG_TODECK",
  REVEAL: "HINTMSG_CONFIRM",
};

/** A filter's abilities, each as the check on c it is written as. */
const ABLE: Record<string, string> = {
  HAND: "IsAbleToHand()",
  HAND_AS_COST: "IsAbleToHandAsCost()",
  GRAVE: "IsAbleToGrave()",
  GRAVE_AS_COST: "IsAbleToGraveAsCost()",
  REMOVE: "IsAbleToRemove()",
  REMOVE_AS_COST: "IsAbleToRemoveAsCost()",
  DECK: "IsAbleToDeck()",
  DECK_AS_COST: "IsAbleToDeckAsCost()",
  EXTRA: "IsAbleToExtra()",
  EXTRA_AS_COST: "IsAbleToExtraAsCost()",
  SPECIAL_SUMMON: "IsCanBeSpecialSummoned(e,0,tp,false,false)",
  TARGET: "IsCanBeEffectTarget(e)",
  NEGATE: "IsCanBeDisabledByEffect(e)",
  CHANGE_POSITION: "IsCanChangePosition()",
  TURN_SET: "IsCanTurnSet()",
  ATTACH: "IsCanOverlay()",
  TAKE_CONTROL: "IsControlerCanBeChanged()",
  DESTROY: "IsDestructable()",
  FUSION_MATERIAL: "IsCanBeFusionMaterial()",
};
/** Abilities the reader reads as one, written apart by an effect and as a cost. */
const ABLE_BY_EFFECT: Record<string, string> = { DISCARD: "IsDiscardable(REASON_EFFECT)", TRIBUTE: "IsReleasableByEffect()" };
const ABLE_AS_COST: Record<string, string> = { DISCARD: "IsDiscardable()", TRIBUTE: "IsReleasable()" };
/** What a cost moving this card checks it can do. */
const COST_ABLE: Partial<Record<S.MoveName, string>> = {
  TO_GRAVE: "GRAVE_AS_COST",
  BANISH: "REMOVE_AS_COST",
  TO_HAND: "HAND_AS_COST",
  TO_DECK: "DECK_AS_COST",
  TRIBUTE: "TRIBUTE",
  DISCARD: "DISCARD",
};

/** A filter's states, each as its check. */
const STATES: Record<string, string> = {
  FACEUP: "c:IsFaceup()",
  FACEDOWN: "c:IsFacedown()",
  FACEUP_OR_HIDDEN_ZONE: "c:IsFaceupEx()",
  NEGATED: "c:IsDisabled()",
  REVEALED: "c:IsPublic()",
  FORBIDDEN: "c:IsForbidden()",
  IN_BATTLE: "c:IsRelateToBattle()",
  STILL_ON_CHAIN: "c:IsRelateToEffect(e)",
  IMMUNE_TO_THIS: "c:IsImmuneToEffect(e)",
  ONLY_ONE_ALLOWS: "c:CheckUniqueOnField(tp)",
  HAS_FUSION_MATERIALS: "c:CheckFusionMaterial()",
  NOT_SELF: "c~=e:GetHandler()",
  LEAVES_FREE_MZONE: "Duel.GetMZoneCount(tp,c)>0",
  BY_OPPONENT: "c:GetReasonPlayer()==1-tp",
  LINKED: "c:IsLinkState()",
  LINKED_TO_THIS: "e:GetHandler():GetLinkedGroup():IsContains(c)",
  GEMINI_STATUS: "c:IsDualState()",
};

/** Numbers checked with Is<Name>(n), Is<Name>Above and Is<Name>Below; the others are compared as Get<Name>(). */
const RANGE_METHODS: Partial<Record<S.CardNumber, string>> = { LEVEL: "Level", RANK: "Rank", LINK: "Link", ATTACK: "Attack", DEFENSE: "Defense" };
const GET_METHODS: Partial<Record<S.CardNumber, string>> = {
  BASE_ATTACK: "BaseAttack",
  BASE_DEFENSE: "BaseDefense",
  PRINTED_ATTACK: "TextAttack",
  PRINTED_DEFENSE: "TextDefense",
  MATERIALS: "OverlayCount",
  SEQUENCE: "Sequence",
};

const DECK_PLACES: Record<string, string> = { DECKSHUFFLE: "SEQ_DECKSHUFFLE", DECKTOP: "SEQ_DECKTOP", DECKBOT: "SEQ_DECKBOTTOM" };

/** A continuous effect's type, by what it reaches; cards in places, players and the duel are a field effect's. */
const REACH_TYPES: Record<string, string> = { THIS_CARD: "SINGLE", EQUIPPED_MONSTER: "EQUIP", ATTACHED_TO: "XMATERIAL", CARD_IT_TARGETS: "TARGET", DUEL: "FIELD" };
/** A field effect's target range for players: SetTargetRange(1,0) is the effect's player. */
const PLAYER_RANGES: Record<S.Side, string> = { OWN: "1,0", OPPONENT: "0,1", BOTH: "1,1" };

/**
 * A value function's parameters, by the effect it is the value of: te, re or se is the effect it
 * checks, r why, st the summon's type, c a card (the one it applies to, or one it lets through).
 */
const VALUE_PARAMS: Record<string, string> = {
  SPSUMMON_CONDITION: "e,se,sp,st",
  IMMUNE_EFFECT: "e,te",
  INDESTRUCTABLE_EFFECT: "e,re,rp",
  CANNOT_BE_EFFECT_TARGET: "e,re,rp",
  INDESTRUCTABLE: "e,re,r,rp",
  INDESTRUCTABLE_COUNT: "e,re,r,rp",
  CANNOT_ACTIVATE: "e,re,tp",
};
/** What a function is given that an expression may use, besides e. */
const GIVEN = ["c", "te", "re", "se", "r", "rp", "st", "sp", "tp", "eg", "ep", "ev"];

/** The aux functions engines give as a value, by what RML reads each as: [the effects it is given to, its value and checks, the function]. */
const AUX_VALUES: [string[], Pick<S.Applied, "value" | "requires">, string][] = [
  [["SPSUMMON_CONDITION"], { value: {}, requires: [{ never: true }] }, "aux.FALSE"],
  ...(
    [
      ["FUSION", "aux.fuslimit"],
      ["RITUAL", "aux.ritlimit"],
      ["SYNCHRO", "aux.synlimit"],
      ["XYZ", "aux.xyzlimit"],
      ["LINK", "aux.linklimit"],
    ] as const
  ).map(([type, name]): [string[], Pick<S.Applied, "value" | "requires">, string] => [["SPSUMMON_CONDITION"], { value: {}, requires: [{ summonType: [type] }] }, name]),
  [["CANNOT_BE_EFFECT_TARGET"], { value: {}, requires: [{ player: { which: "REASON", is: "OPPONENT" } }] }, "aux.tgoval"],
  [["CANNOT_BE_EFFECT_TARGET"], { value: {}, requires: [{ player: { which: "REASON", is: "OWN" } }] }, "aux.tgsval"],
  [["INDESTRUCTABLE_EFFECT"], { value: {}, requires: [{ player: { which: "REASON", is: "OPPONENT" } }] }, "aux.indoval"],
  [["INDESTRUCTABLE_EFFECT"], { value: {}, requires: [{ player: { which: "REASON", is: "OWN" } }] }, "aux.indsval"],
];

/** The RESET_ events a reset needs RESET_EVENT for: RESETS_STANDARD's, and those after it. */
const EVENT_RESETS = [
  ...["TURN_SET", "TOGRAVE", "REMOVE", "TEMP_REMOVE", "TOHAND", "TODECK", "LEAVE", "TOFIELD"].map((name) => `RESET_${name}`),
  ...OTHER_RESETS.slice(0, 4),
];

/** Cards an effect knows wherever it is, by the reader's names for them. */
const KNOWN_CARDS: Partial<Record<S.Who, string>> = {
  ATTACKER: "Duel.GetAttacker()",
  ATTACK_TARGET: "Duel.GetAttackTarget()",
  BATTLE_TARGET: "e:GetHandler():GetBattleTarget()",
  EQUIPPED_MONSTER: "e:GetHandler():GetEquipTarget()",
  CARD_IT_TARGETS: "e:GetHandler():GetFirstCardTarget()",
};

const json = (value: unknown) => JSON.stringify(value);
/** Moves that keep something for later or limit the chain: what a script keeps track of, written wherever the effect makes them. */
const MARKS = new Set<S.MoveName>(["REMEMBER", "FORGET", "CHAIN_LIMIT", "END_EFFECT"]);
const COMPARE: Record<S.Comparison, string> = { EQUAL: "==", NOT_EQUAL: "~=", LESS: "<", AT_MOST: "<=", MORE: ">", AT_LEAST: ">=" };
const indent = (lines: string[]) => lines.map((line) => `\t${line}`);
const hex = (n: number) => `0x${n.toString(16)}`;
const player = (side: S.Side | undefined) => (side === "OPPONENT" ? "1-tp" : side === "BOTH" ? "PLAYER_ALL" : "tp");
const refOf = (move: S.Move) => (move.cards && "ref" in move.cards ? move.cards.ref : undefined);
const movesOf = (effect: S.EffectSchema) => (effect.does ?? []).flatMap((part) => part.moves ?? []);
/** Every memory an effect's description names. */
function memoriesOf(effect: S.EffectSchema): S.Memory[] {
  const out: S.Memory[] = [];
  const walk = (x: unknown) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") {
      const memory = (x as { memory?: S.Memory }).memory;
      if (memory && typeof memory === "object") out.push(memory);
      Object.values(x).forEach(walk);
    }
  };
  walk({ ...effect, labelObject: undefined });
  return out;
}

class Writer {
  functions: string[] = [];
  unwritten: string[] = [];
  private filters = new Map<string, string>();
  /** The next free string of the card, for the questions it asks ("you can"). */
  private strings = 0;
  /** The effect whose registration and functions are being written, by index. */
  current = 0;
  /**
   * Each effect's label object when it is another effect, by index: the one it says, or the one whose label it
   * reads when it says none (an effect reads another's label through its own label object).
   */
  private links = new Map<number, number>();

  constructor(
    readonly schema: S.CardSchema,
    readonly dialect: Dialect,
  ) {
    for (const effect of schema.effects ?? []) {
      if (effect.description !== undefined && Math.floor(effect.description / 16) === schema.code)
        this.strings = Math.max(this.strings, (effect.description % 16) + 1);
      const object = effect.labelObject;
      if (typeof object === "object" && "effect" in object && typeof object.effect === "number") this.links.set(effect.index, object.effect);
      else if (!object) {
        // Another effect whose memory it uses, read through its label object
        const others = new Set(memoriesOf(effect).flatMap((m) => ("effect" in m && typeof m.effect === "number" && m.effect !== effect.index ? [m.effect] : [])));
        if (others.size === 1 && !memoriesOf(effect).some((m) => "effect" in m && m.effect === effect.index && m.slot === "OBJECT")) this.links.set(effect.index, [...others][0]);
      }
    }
  }

  /** An effect as the function being written reaches it: e itself, or the one its label object holds. */
  effectAt(ref: S.EffectRef): string {
    if (ref === "THIS" || ref === this.current) return "e";
    if (ref === "CHAIN_LINK") return "re";
    if (typeof ref === "object") {
      const { memory } = ref;
      if (!("effect" in memory) || memory.slot !== "OBJECT") return unwritten(`an effect kept in ${json(memory)}`);
      return `${this.effectAt(memory.effect)}:GetLabelObject()`;
    }
    if (this.links.get(this.current) === ref) return "e:GetLabelObject()";
    return unwritten(`effect ${ref}'s label from effect ${this.current}`);
  }

  /** The effect an effect's label object holds when it is made: the one it says, or the one whose memory it uses. */
  linked = (index: number) => this.links.get(index);

  /** Where a filter's numbers are written: c is the card it checks, e and tp the effect's. */
  filterScope(): Scope {
    const scope = new Scope(this, "value");
    scope.refs.set("CHECKED_CARD", "c");
    return scope;
  }

  /** Whether an effect's label object is a group the card made for it to keep cards in. */
  keepsGroup(ref: S.EffectRef): boolean {
    const index = ref === "THIS" ? this.current : ref;
    const object = typeof index === "number" ? this.schema.effects?.find((effect) => effect.index === index)?.labelObject : undefined;
    return object === "GROUP" || (typeof object === "object" && "memory" in object);
  }

  flags = (prefix: string, names: string[]) => (names.length ? names.map((name) => `${prefix}${name}`).join("+") : "0");
  locations = (places: S.Place[] | undefined) => this.flags("LOCATION_", places ?? []);
  sides = (places: S.Places | undefined) => `${this.locations(places?.own)},${this.locations(places?.opponent)}`;
  codeText = (code: number) => (code === this.schema.code ? "id" : String(code));
  stringId = (description: number) => `aux.Stringid(${this.codeText(Math.floor(description / 16))},${description % 16})`;
  question = () => `aux.Stringid(id,${Math.min(this.strings++, 15)})`;
  flagId = (name: string) => this.dialect.flag(name) ?? unwritten(`the flag ${name}, which ${this.dialect.engine} has no id for`);

  /** When a flag or effect ends, as a reset: read/context.ts's resetFlags the other way. */
  reset(until: string[] | undefined): string {
    const events: string[] = [];
    const phases: string[] = [];
    const rest: string[] = [];
    for (const u of until ?? []) {
      if (u in STANDARD_RESETS) events.push(["RESETS_STANDARD", ...STANDARD_RESETS[u]].join("-"));
      else if (EVENT_RESETS.includes(u)) events.push(u);
      else if (u.endsWith("_PHASE")) phases.push(`PHASE_${u.slice(0, -"_PHASE".length)}`);
      else if (u === "CHAIN_END") rest.push("RESET_CHAIN");
      else if (OTHER_RESETS.includes(u)) rest.push(u);
      else unwritten(`until ${u}`);
    }
    const parts = [...(events.length ? ["RESET_EVENT", ...events] : []), ...(phases.length ? ["RESET_PHASE", ...phases] : []), ...rest];
    return parts.join("+") || "0";
  }

  /** A function the script needs once (a chain limit's), by name. */
  helper(name: string, lines: string[]): string {
    if (!this.functions.some((line) => line.startsWith(`function ${name}(`))) this.functions.push(...lines);
    return name;
  }

  /** initial_effect's lines; the card's functions go to functions. */
  card(): string[] {
    const { rules, summons = [], effects = [] } = this.schema;
    const lines: string[] = [];
    const attempt = (what: string, write: () => void) => {
      try {
        write();
      } catch (error) {
        if (!(error instanceof Unwritten)) throw error;
        this.unwritten.push(`${what}${error.message}`);
      }
    };
    attempt("", () => {
      if (rules.mustBeProperlySummoned) lines.push("c:EnableReviveLimit()");
      if (rules.onlyOne) unwritten("only one on the field");
      if (rules.summonLimit) unwritten("a summon limit");
      if (rules.counters?.length) unwritten("counters");
    });
    let procedures = 0;
    for (const summon of summons) {
      if (summon.method === "NORMAL" || summon.method === "TRIBUTE") continue;
      attempt(`summon ${summon.method}: `, () => {
        lines.push(this.procedure(summon));
        procedures++;
      });
    }
    for (const [i, effect] of effects.entries()) {
      attempt(`effect ${effect.index}: `, () => {
        if (effect.index !== i + 1) unwritten("effects out of order");
        // What a summon procedure registers is written by it (reading back checks it registered these),
        // and what a merged event's aux call registers by the effect waiting for the event, just after
        if (effect.fromProcedure && effects[i + 1]?.merged?.perCard) return;
        // INITIAL is ocgcore's own flag: a script has it only by copying the flags back once registered (e0:GetProperty())
        if (effect.fromProcedure && effect.flags?.includes("INITIAL")) unwritten("an aux procedure's effect, changed once registered");
        if (effect.fromProcedure) return procedures ? undefined : unwritten("an aux procedure's");
        lines.push(...this.effect(effect));
        // Earlier effects whose label object is this one, once it exists (Genex Ally Reliever's e1:SetLabelObject(e2))
        for (const earlier of effects.slice(0, i)) if (this.linked(earlier.index) === effect.index) lines.push(`e${earlier.index}:SetLabelObject(e${effect.index})`);
      });
    }
    return lines;
  }

  // ---- summon procedures ----

  /** A summon's aux procedure (procedure.lua), from what it is made of. */
  private procedure(summon: S.SummonMethod): string {
    if (summon.unread?.length) unwritten("unread");
    if (summon.cost?.length || summon.requires?.length || summon.extraMaterials?.length) unwritten("more than its materials");
    const materials = summon.materials ?? [];
    const counted = (m: S.Material | undefined) => (m && m.count !== "ALL" ? m.count : unwritten("materials of no count"));
    const f = (m: S.Material) => this.materialFilter(m.card, summon.method as MaterialMethod);
    switch (summon.method) {
      case "SYNCHRO": {
        // AddSynchroProcedure(c,f1,f2,minc,maxc): 1 Tuner and minc to maxc non-Tuners
        const [tuner, others, ...more] = materials;
        const [one, many] = [counted(tuner), counted(others)];
        if (more.length || tuner.role !== "TUNER" || others.role !== "NON_TUNER" || one.min !== 1 || one.max !== 1) unwritten("materials no Synchro procedure takes");
        // aux.NonTuner says they aren't Tuners: the filter it is given needn't
        const none = (others.card.none ?? []).filter((x) => JSON.stringify(x) !== JSON.stringify({ types: ["TUNER"] }));
        const nonTuner = this.materialFilter({ ...others.card, none: none.length ? none : undefined }, "SYNCHRO", true);
        return this.dialect.procedures.synchro(f(tuner), nonTuner, many.min, many.max);
      }
      case "XYZ": {
        // AddXyzProcedure(c,f,lv,ct,alterf,alterdesc,maxct): ct to maxct monsters of that Level
        const [m, ...more] = materials;
        const { min, max } = counted(m);
        const { LEVEL, ...numbers } = m.card.numbers ?? {};
        const [only] = LEVEL?.is ?? [];
        const level = LEVEL?.is?.length === 1 && typeof only === "number" && !LEVEL.min && !LEVEL.max && !LEVEL.not?.length ? only : unwritten("an Xyz Level not one number");
        if (more.length || m.role !== "ANY") unwritten("materials no Xyz procedure takes");
        const card = { ...m.card, numbers: Object.keys(numbers).length ? numbers : undefined };
        return this.dialect.procedures.xyz(this.materialFilter(card, "XYZ"), level, min, max);
      }
      case "LINK": {
        // AddLinkProcedure(c,f,min,max)
        const [m, ...more] = materials;
        const { min, max } = counted(m);
        if (more.length || m.role !== "ANY") unwritten("materials no Link procedure takes");
        return this.dialect.procedures.link(f(m), min, max);
      }
      case "FUSION": {
        const sub = Boolean(summon.substitutes);
        const insf = Boolean(summon.withoutMaterials);
        // A material that is one card by name, and nothing else about it
        const named = (m: S.Material) => {
          const { names, ...rest } = m.card;
          return names?.length === 1 && typeof names[0] === "number" && !Object.keys(rest).length ? names[0] : undefined;
        };
        if (materials.some((m) => m.role !== "ANY")) unwritten("materials no Fusion procedure takes");
        const counts = materials.map(counted);
        const codes = materials.map(named);
        // AddFusionProcCodeRep(c,code,cc,sub,insf): cc copies of one card
        if (materials.length === 1 && codes[0] !== undefined && counts[0].min === counts[0].max && counts[0].min > 1)
          return this.dialect.procedures.fusionCodeRep(this.codeText(codes[0]), counts[0].min, sub, insf);
        if (counts.some((c) => c.min !== 1 || c.max !== 1)) unwritten("Fusion materials of a count");
        // AddFusionProcCode2/3/4(c,code1,code2,...,sub,insf): one each of 2 to 4 cards
        if (codes.every((code) => code !== undefined) && codes.length >= 2 && codes.length <= 4)
          return this.dialect.procedures.fusionCodes(codes.map((code) => this.codeText(code!)), sub, insf);
        // AddFusionProcMix(c,sub,insf,...): one of each, by name or filter
        if (materials.length < 2) unwritten("one Fusion material");
        return this.dialect.procedures.fusionMix(sub, insf, materials.map((m, i) => (codes[i] !== undefined ? this.codeText(codes[i]!) : f(m))));
      }
    }
    return unwritten("its procedure");
  }

  /**
   * A material's filter, with each check as the summon checks it: a Link
   * Material's type and Attribute are its Link type and Link Attribute
   * (IsLinkType), which effects can change; nil when it can be any monster.
   */
  private materialFilter(card: S.CardFilter, method: MaterialMethod, nonTuner = false): string {
    const checks = this.checks(card, false);
    if (!checks.length) return "nil";
    const { params, body } = this.dialect.material(method, checks.join(" and "), nonTuner);
    const name = this.filters.get(body) ?? `s.matfilter${this.filters.size + 1}`;
    if (!this.filters.has(body)) {
      this.filters.set(body, name);
      this.functions.push(`function ${name}(${params})`, `\treturn ${body}`, "end");
    }
    return name;
  }

  // ---- registration ----

  private effect(effect: S.EffectSchema): string[] {
    const n = effect.index;
    if (effect.unread?.length) unwritten("unread");
    if (effect.fromProcedure || effect.inSummons) unwritten("a summon procedure's");
    if (effect.kind === "CONTINUOUS") return this.continuous(effect);
    // An effect that happens without a chain (CONTINUOUS with an event) only does what its operation does
    const auto = effect.kind === "AUTO";
    if (auto && (effect.legal?.length || effect.targets || effect.declares?.length || effect.cost?.length || effect.onActivation?.length))
      unwritten("an effect without a chain that checks or picks before it happens");
    if (effect.modes?.length) unwritten("modes");
    if (effect.applies?.length) unwritten(`applies ${effect.applies.map((a) => a.effect).join(",")}`);
    const e = `e${n}`;
    this.current = n;
    const lines: string[] = [];
    let event = effect.event && effect.event !== "MERGED" ? this.eventOf(effect.event) : undefined;
    if (effect.event === "MERGED") {
      const { events = [], perCard = false } = effect.merged ?? unwritten("a merged event of no events");
      const merged = this.dialect.merged(events.map((x) => this.eventOf(x)), perCard, `merged${n}`) ?? unwritten(`a merged event in ${this.dialect.engine}`);
      lines.push(...merged.lines);
      event = merged.code;
    }
    lines.push(`local ${e}=Effect.CreateEffect(c)`);
    if (effect.description !== undefined) lines.push(`${e}:SetDescription(${this.stringId(effect.description)})`);
    if (effect.categories?.length) lines.push(`${e}:SetCategory(${this.flags("CATEGORY_", effect.categories)})`);
    lines.push(`${e}:SetType(${this.typeOf(effect)})`);
    if (event) lines.push(`${e}:SetCode(${event})`);
    if (effect.flags?.length) lines.push(`${e}:SetProperty(${this.flags("EFFECT_FLAG_", effect.flags)})`);
    if (effect.from?.length) lines.push(`${e}:SetRange(${this.locations(effect.from)})`);
    if (effect.limit) lines.push(`${e}:SetCountLimit(${this.limitOf(effect.limit)})`);
    const { own = [], opponent = [] } = effect.offered;
    if (own.length || opponent.length) lines.push(`${e}:SetHintTiming(${this.flags("TIMING_", own)},${this.flags("TIMING_", opponent)})`);
    lines.push(...this.label(effect));
    const operation = new Operation(this, effect);
    if (effect.requires?.length || effect.whenChecked?.length) {
      lines.push(`${e}:SetCondition(s.con${n})`);
      const scope = new Scope(this, "condition");
      const holds = effect.requires?.length ? scope.conditions(effect.requires) : "true";
      // What it does each time it is checked comes after it has worked out whether it holds
      const writes = (effect.whenChecked ?? []).flatMap((move) => operation.marked(move, scope));
      const body = writes.length ? [`local res=${holds}`, ...writes, "return res"] : [`return ${holds}`];
      this.functions.push(`function s.con${n}(e,tp,eg,ep,ev,re,r,rp)`, ...indent(body), "end");
    }
    // The activation checks the cost makes are the cost function's, the rest the target function's
    const ofCost = new Set(operation.costLegal().map(json));
    const legal = effect.legal ?? [];
    const split = legal.findIndex((c) => !ofCost.has(json(c)));
    const [costLegal, targetLegal] = split === -1 ? [legal, []] : [legal.slice(0, split), legal.slice(split)];
    if (targetLegal.some((c) => ofCost.has(json(c)))) unwritten("a cost's checks after the target's");
    if (effect.cost?.length) {
      lines.push(`${e}:SetCost(s.cost${n})`);
      this.functions.push(...operation.costFunction(n, costLegal));
    } else if (costLegal.length) unwritten("a cost's checks without a cost");
    if (!auto && (targetLegal.length || effect.targets || effect.declares?.length || effect.onActivation?.length || effect.does?.length)) {
      lines.push(`${e}:SetTarget(s.tg${n})`);
      this.functions.push(...operation.targetFunction(n, targetLegal));
    }
    if (effect.does?.length) {
      lines.push(`${e}:SetOperation(s.op${n})`);
      this.functions.push(...operation.operationFunction(n));
    }
    if (!effect.held) lines.push(`c:RegisterEffect(${e})`);
    return lines;
  }

  /** What an effect's label holds when it is made: its numbers, and the effect it is linked to (an earlier one). */
  private label(effect: S.EffectSchema): string[] {
    const e = `e${effect.index}`;
    const lines: string[] = [];
    if (effect.label?.length) lines.push(`${e}:SetLabel(${effect.label.map((n) => (typeof n === "number" ? String(n) : unwritten(`a label ${json(n)} when the card is set up`))).join(",")})`);
    // A group made for it to keep cards in, or one an earlier effect was given
    const object = effect.labelObject;
    if (object === "GROUP") lines.push(`local g${effect.index}=Group.CreateGroup()`, `g${effect.index}:KeepAlive()`, `${e}:SetLabelObject(g${effect.index})`);
    else if (typeof object === "object" && "memory" in object && "effect" in object.memory && object.memory.slot === "OBJECT" && typeof object.memory.effect === "number" && object.memory.effect < effect.index)
      lines.push(`${e}:SetLabelObject(e${object.memory.effect}:GetLabelObject())`);
    else if (typeof object === "object" && !("effect" in object)) unwritten("cards in a label when the card is set up");
    // A link to a later effect is written once that one is (card)
    const linked = this.linked(effect.index);
    if (linked !== undefined && linked < effect.index) lines.push(`${e}:SetLabelObject(e${linked})`);
    return lines;
  }

  /** A CONTINUOUS effect: what it applies, to what, while its condition holds. */
  private continuous(effect: S.EffectSchema): string[] {
    const n = effect.index;
    const [applied, ...more] = effect.applies ?? [];
    if (!applied || more.length) unwritten("a continuous effect that applies no one thing");
    if (effect.cost?.length || effect.does?.length || effect.declares?.length || effect.legal?.length || effect.modes?.length || effect.onActivation?.length)
      unwritten("a continuous effect that does something");
    if (effect.event || effect.categories?.length || effect.targets) unwritten("a continuous effect with an event, categories or targets");
    if (!/^[A-Z][A-Z0-9_]*$/.test(applied.effect)) unwritten(`the effect ${applied.effect}`);
    const { to } = applied;
    // A grant gives the cards it reaches the effect its label object holds
    const grant = applied.effect === "GRANT";
    if (grant && (this.linked(n) === undefined || typeof to !== "object")) unwritten("a grant of no effect, or to no places");
    const e = `e${n}`;
    this.current = n;
    const lines = [`local ${e}=Effect.CreateEffect(c)`];
    if (effect.description !== undefined) lines.push(`${e}:SetDescription(${this.stringId(effect.description)})`);
    lines.push(`${e}:SetType(EFFECT_TYPE_${typeof to === "string" ? REACH_TYPES[to] : "FIELD"}${grant ? "+EFFECT_TYPE_GRANT" : ""})`);
    if (effect.flags?.length) lines.push(`${e}:SetProperty(${this.flags("EFFECT_FLAG_", effect.flags)})`);
    if (!grant) lines.push(`${e}:SetCode(EFFECT_${applied.effect})`);
    if (effect.from?.length) lines.push(`${e}:SetRange(${this.locations(effect.from)})`);
    if (typeof to === "object") lines.push(`${e}:SetTargetRange(${"places" in to ? this.sides(to.places) : PLAYER_RANGES[to.players]})`);
    if (effect.limit) lines.push(`${e}:SetCountLimit(${this.limitOf(effect.limit)})`);
    lines.push(...this.label(effect));
    if (effect.requires?.length) {
      lines.push(`${e}:SetCondition(s.con${n})`);
      this.functions.push(...this.given(`s.con${n}`, "e", [], effect.requires, "condition"));
    }
    // The checks of a value or target function that aren't about a card: the value function's, when it has one
    const valued = typeof applied.value === "object" && !("computed" in applied.value) && !("value" in applied.value) && !("fixed" in applied.value);
    if (applied.cards) {
      lines.push(`${e}:SetTarget(s.tg${n})`);
      this.functions.push(...this.given(`s.tg${n}`, "e,c", this.checks(applied.cards, false), valued ? [] : (applied.requires ?? []), "target"));
    } else if (!valued && applied.requires?.length) unwritten("checks of no value or target function");
    const value = this.valueOf(applied, n);
    if (value !== undefined) lines.push(`${e}:SetValue(${value})`);
    if (!effect.held) lines.push(`c:RegisterEffect(${e})`);
    return lines;
  }

  /** A continuous effect's value: a number, a constant, an aux function, or a function of its own. */
  private valueOf(applied: S.Applied, n: number): string | undefined {
    const { value, requires = [] } = applied;
    if (value === undefined) return undefined;
    if (typeof value === "number" || typeof value === "string") return String(value);
    if ("computed" in value) {
      this.functions.push(`function s.val${n}(e,c)`, `\treturn ${this.computed(value.computed)}`, "end");
      return `s.val${n}`;
    }
    if ("fixed" in value) return unwritten("a value fixed as an effect made while resolving is made");
    if ("value" in value) {
      const scope = new Scope(this, "value");
      scope.refs.set("AFFECTED_CARD", "c");
      this.functions.push(`function s.val${n}(e,c)`, `\treturn ${scope.value(value.value)}`, "end");
      return `s.val${n}`;
    }
    const known = AUX_VALUES.find(([effects, read]) => effects.includes(applied.effect) && json(read) === json({ value, requires }));
    const aux = known && this.dialect.aux(known[2]);
    if (aux) return aux;
    const params = VALUE_PARAMS[applied.effect] ?? "e,c";
    this.functions.push(...this.given(`s.val${n}`, params, this.checks(value, false), requires, "value"));
    return `s.val${n}`;
  }

  /**
   * A function of a continuous effect, which is given only what its parameters are: its checks of c, then
   * the rest. tp is the effect's player (e:GetHandlerPlayer()), unless the function is given a tp of its own.
   */
  private given(name: string, params: string, checks: string[], requires: S.Condition[], role: "condition" | "target" | "value"): string[] {
    const own = params.split(",");
    const scope = new Scope(this, role, own.find((p) => ["te", "re", "se"].includes(p)));
    if (own.includes("c")) scope.refs.set("AFFECTED_CARD", "c");
    const body = [...checks, ...(requires.length ? [scope.conditions(requires)] : [])].join(" and ");
    if (!body) unwritten(`a ${role} function that checks nothing`);
    const uses = (p: string) => new RegExp(`\\b${p}\\b`).test(body);
    const unknown = GIVEN.filter((p) => p !== "tp" && !own.includes(p) && uses(p));
    if (unknown.length) unwritten(`a ${role} function that isn't given ${unknown.join(", ")}`);
    // A tp it is given is another player (CANNOT_ACTIVATE's: the one activating)
    if (own.includes("tp") && uses("tp")) unwritten(`a ${role} function given a tp of its own`);
    const tp = !own.includes("tp") && uses("tp") ? ["\tlocal tp=e:GetHandlerPlayer()"] : [];
    return [`function ${name}(${params})`, ...tp, `\treturn ${body}`, "end"];
  }

  /** A number worked out as the effect applies (c: the card it applies to). */
  private computed({ times, per }: S.Computed): string {
    let counted: string;
    if ("matching" in per) {
      const { from, card, ofAffectedController } = per.matching;
      const whose = ofAffectedController ? "c:GetControler()" : "e:GetHandlerPlayer()";
      const checks = this.checks(card, false);
      if (checks.some((check) => /\b(e|tp)\b/.test(check))) unwritten("a count of cards checked against the effect or its player");
      counted = checks.length
        ? `Duel.GetMatchingGroupCount(${this.filter(card, false)},${whose},${this.sides(from)},nil)`
        : `Duel.GetFieldGroupCount(${whose},${this.sides(from)})`;
    } else {
      const ref = "number" in per ? per.of : per.on;
      const holder = "who" in ref && !ref.of && ref.who === "AFFECTED_CARD" ? "c" : "who" in ref && !ref.of && ref.who === "THIS_CARD" ? "e:GetHandler()" : unwritten(`a number of ${json(ref)}`);
      if ("number" in per) {
        const method = RANGE_METHODS[per.number] ?? GET_METHODS[per.number] ?? unwritten(`number ${per.number}`);
        counted = `${holder}:Get${method}()`;
      } else counted = `${holder}:GetCounter(${hex(per.counters)})`;
    }
    return times === 1 ? counted : times === -1 ? `-${counted}` : `${counted}*${times}`;
  }

  private typeOf(effect: S.EffectSchema): string {
    const t = (...names: string[]) => this.flags("EFFECT_TYPE_", names);
    const of = effect.eventOf === "SELF" ? ["SINGLE"] : effect.eventOf === "ANY" ? ["FIELD"] : [];
    const o = effect.mandatory ? "F" : "O";
    switch (effect.kind) {
      case "ACTIVATE":
        return t(...of, "ACTIVATE");
      case "IGNITION":
        return t(...of, "IGNITION");
      case "QUICK":
        return t(...of, `QUICK_${o}`);
      case "TRIGGER":
        // A "you can" Flip Effect registers no event: the flip is its own
        if (!effect.event && effect.eventOf === "SELF") return t("SINGLE", "FLIP", `TRIGGER_${o}`);
        if (!of.length) unwritten("a trigger on no card");
        return t(...of, `TRIGGER_${o}`);
      case "FLIP":
        return t("SINGLE", "FLIP");
      case "AUTO":
        if (!of.length) unwritten("an effect without a chain on no card");
        return t(...of, "CONTINUOUS");
    }
    return unwritten(`kind ${effect.kind}`);
  }

  private eventOf(event: string): string {
    // A phase's event is EVENT_PHASE with that phase's flag
    if (event.startsWith("PHASE_")) return `EVENT_PHASE+${this.flags("PHASE_", event.slice(6).split("|"))}`;
    return `EVENT_${event}`;
  }

  private limitOf(limit: S.Limit): string {
    if (limit.per !== "TURN" && limit.per !== "DUEL" && limit.per !== "CHAIN") unwritten(`a limit per ${limit.per}`);
    const kinds = [...(limit.oath ? ["OATH"] : []), ...(limit.per !== "TURN" ? [limit.per] : [])].map((kind) => `+EFFECT_COUNT_CODE_${kind}`);
    if (limit.shared === "COPY") {
      if (kinds.length) unwritten("a soft limit per duel, per chain or as an oath");
      return String(limit.count);
    }
    if (limit.shared === "CARD") return `${limit.count},EFFECT_COUNT_CODE_SINGLE`;
    const code = limit.shared === "NAME" ? (limit.counter ? `id+${limit.counter}` : "id") : String(limit.shared);
    return `${limit.count},${code}${kinds.join("")}`;
  }

  // ---- filters ----

  /** A filter function for these cards, called with (c,e,tp), or aux.TRUE; asCost: its abilities are a cost's. */
  filter(card: S.CardFilter | undefined, asCost: boolean): string {
    const { states = [], ...rest } = card ?? {};
    const checks = this.checks({ ...rest, states: states.filter((s) => s !== "NOT_NECRO_VALLEY") }, asCost);
    let name = "aux.TRUE";
    if (checks.length) {
      const body = checks.join(" and ");
      name = this.filters.get(body) ?? `s.filter${this.filters.size + 1}`;
      if (!this.filters.has(body)) {
        this.filters.set(body, name);
        this.functions.push(`function ${name}(c,e,tp)`, `\treturn ${body}`, "end");
      }
    }
    // A card in the GY that Necrovalley keeps there isn't one
    return states.includes("NOT_NECRO_VALLEY") ? `aux.NecroValleyFilter(${name})` : name;
  }

  /** A filter's checks of c, to be ANDed. */
  checks(f: S.CardFilter, asCost: boolean): string[] {
    const out: string[] = [];
    const flags = this.flags;
    for (const state of f.states ?? []) out.push(STATES[state] ?? unwritten(`state ${state}`));
    if (f.types?.length) out.push(`c:IsType(${flags("TYPE_", f.types)})`);
    if (f.allTypes?.length) out.push(this.dialect.allTypes("c", flags("TYPE_", f.allTypes)));
    if (f.exactTypes?.length) out.push(`c:GetType()==${flags("TYPE_", f.exactTypes)}`);
    if (f.fusionTypes?.length) out.push(`c:IsFusionType(${flags("TYPE_", f.fusionTypes)})`);
    // Every archetype listed must hold (each its own IsSetCard): any of several is an anyOf
    for (const archetype of f.archetypes ?? []) out.push(`c:IsSetCard(${hex(archetype)})`);
    for (const archetype of f.fusionArchetypes ?? []) out.push(`c:IsFusionSetCard(${hex(archetype)})`);
    if (f.names?.length) out.push(`c:IsCode(${f.names.map((name) => (typeof name === "number" ? this.codeText(name) : this.filterScope().value(name))).join(",")})`);
    if ((f.mentions?.length ?? 0) > 1) unwritten("mentions any of several");
    if (f.mentions?.length) out.push(this.dialect.mentions("c", this.codeText(f.mentions[0])));
    if ((f.listsAsMaterial?.length ?? 0) > 1) unwritten("lists any of several as material");
    if (f.listsAsMaterial?.length) out.push(`aux.IsMaterialListCode(c,${this.codeText(f.listsAsMaterial[0])})`);
    if (f.attributes?.length) out.push(`c:IsAttribute(${flags("ATTRIBUTE_", f.attributes)})`);
    if (f.races?.length) out.push(`c:IsRace(${flags("RACE_", f.races)})`);
    for (const [number, range] of Object.entries(f.numbers ?? {}) as [S.CardNumber, S.Range][]) out.push(...this.range(number, range));
    if (f.places?.length) out.push(`c:IsLocation(${this.locations(f.places)})`);
    if (f.wasIn?.length) out.push(`c:IsPreviousLocation(${this.locations(f.wasIn)})`);
    if (f.positions?.length) out.push(`c:IsPosition(${flags("POS_", f.positions)})`);
    if (f.wasPositions?.length) out.push(`c:IsPreviousPosition(${flags("POS_", f.wasPositions)})`);
    if (f.controller) out.push(`c:IsControler(${player(f.controller)})`);
    if (f.wasController) out.push(f.wasController === "OWN" ? "c:IsPreviousControler(tp)" : unwritten("was the opponent's"));
    if (f.summonedBy?.length) out.push(`c:IsSummonType(${flags("SUMMON_TYPE_", f.summonedBy)})`);
    if (f.summonedFrom?.length) out.push(`c:IsSummonLocation(${this.locations(f.summonedFrom)})`);
    if (f.summonedByPlayer) out.push(`c:IsSummonPlayer(${player(f.summonedByPlayer)})`);
    if (f.reasons?.length) out.push(`c:IsReason(${flags("REASON_", f.reasons)})`);
    if (f.statuses?.length) out.push(`c:IsStatus(${flags("STATUS_", f.statuses)})`);
    // An effect by its EFFECT_ name; a card's own effect code is given by the card's name, which isn't one
    for (const effect of f.hasEffects ?? []) out.push(/^[A-Z][A-Z0-9_]*$/.test(effect) ? `c:IsHasEffect(EFFECT_${effect})` : unwritten(`has the effect ${effect}`));
    for (const able of f.able ?? []) {
      // SET is a monster's Set (IsMSetable) or a Spell's or Trap's (IsSSetable), by what the card checks
      if (able === "SET") out.push(f.types?.join() === "MONSTER" ? "c:IsMSetable(true,nil)" : "c:IsSSetable()");
      else if (able.startsWith("SPECIAL_SUMMON")) out.push(this.specialSummonable(able));
      else out.push(`c:${(asCost ? ABLE_AS_COST : ABLE_BY_EFFECT)[able] ?? ABLE[able] ?? unwritten(`able ${able}`)}`);
    }
    for (const need of f.needs ?? []) out.push(this.need(need));
    if (f.except?.length) unwritten("cards excepted outside a call");
    // One of the cards the effect keeps (c==e:GetLabelObject(), or in a group it keeps)
    for (const among of f.among ?? []) {
      const kept = "memory" in among && "effect" in among.memory && among.memory.slot === "OBJECT" ? among.memory.effect : unwritten(`among ${json(among)}`);
      out.push(this.keepsGroup(kept) ? `${this.effectAt(kept)}:GetLabelObject():IsContains(c)` : `c==${this.effectAt(kept)}:GetLabelObject()`);
    }
    // Numbers compared, written where the filter is: c is the card it checks
    for (const { value, is, to } of f.compare ?? []) out.push(`${this.filterScope().value(value)}${COMPARE[is]}${this.filterScope().value(to)}`);
    if (f.counters?.length) unwritten("counters");
    for (const { flag, set } of f.flags ?? []) out.push(`c:GetFlagEffect(${this.flagId(flag)})${set ? "~=0" : "==0"}`);
    if (f.relations?.length) unwritten("relations");
    if (f.passes?.length) unwritten("passes");
    if (f.unread?.length) unwritten("unread");
    // The first "or" is the filter's anyOf, any after it are its allOf's
    if (f.anyOf?.length) out.push(this.alternatives(f.anyOf, asCost));
    for (const each of f.allOf ?? []) out.push(...this.checks(each, asCost));
    for (const not of f.none ?? []) {
      const checks = this.checks(not, asCost);
      if (checks.length !== 1) unwritten("none of several checks");
      // not binds tighter than a comparison: not (c:GetSequence()==5)
      out.push(atomic(checks[0]) ? `not ${checks[0]}` : `not (${checks[0]})`);
    }
    return out;
  }

  /** Checks of which any one holds: IsSetCard(a,b) for archetypes alone, else an "or". */
  private alternatives(anyOf: S.CardFilter[], asCost: boolean): string {
    const archetypes = anyOf.map((alternative) => (Object.keys(alternative).join() === "archetypes" && alternative.archetypes!.length === 1 ? alternative.archetypes![0] : undefined));
    if (archetypes.every((a) => a !== undefined)) return `c:IsSetCard(${archetypes.map((a) => hex(a!)).join(",")})`;
    const alternatives = anyOf.map((alternative) => {
      // An alternative that is itself an "or" is one of IsSetCard's archetypes, or flattened into this one by Lua
      if (Object.keys(alternative).join() === "anyOf") return this.alternatives(alternative.anyOf!, asCost);
      const checks = this.checks(alternative, asCost);
      if (!checks.length) unwritten("an alternative that checks nothing");
      return checks.length > 1 ? `(${checks.join(" and ")})` : checks[0];
    });
    if (alternatives.some((a) => a.startsWith("(") && a.includes(" or "))) unwritten("an alternative of alternatives");
    return `(${alternatives.join(" or ")})`;
  }

  private range(number: S.CardNumber, range: S.Range): string[] {
    // Each number as written in the filter: a literal, or worked out there (e:GetLabel())
    const v = (x: S.Value) => this.filterScope().value(x);
    const [min, max] = [range.min === undefined ? undefined : v(range.min), range.max === undefined ? undefined : v(range.max)];
    const [is, not] = [range.is?.map(v), range.not?.map(v)];
    if ((not?.length ?? 0) > 1) unwritten(`${number} none of several`);
    const method = RANGE_METHODS[number];
    if (method) {
      return [
        ...(is?.length ? [`c:Is${method}(${is.join(",")})`] : []),
        ...(min !== undefined ? [`c:Is${method}Above(${min})`] : []),
        ...(max !== undefined ? [`c:Is${method}Below(${max})`] : []),
        ...(not?.length ? [`c:Get${method}()~=${not[0]}`] : []),
      ];
    }
    const get = GET_METHODS[number] ?? unwritten(`number ${number}`);
    if ((is?.length ?? 0) > 1) unwritten(`${number} any of several`);
    return [
      ...(is?.length ? [`c:Get${get}()==${is[0]}`] : []),
      ...(min !== undefined ? [`c:Get${get}()>=${min}`] : []),
      ...(max !== undefined ? [`c:Get${get}()<=${max}`] : []),
      ...(not?.length ? [`c:Get${get}()~=${not[0]}`] : []),
    ];
  }

  /** c:IsCanBeSpecialSummoned, its arguments from the ability's name (SPECIAL_SUMMON_AS_FUSION_IGNORING_CONDITIONS...). */
  private specialSummonable(able: string): string {
    const m = able.match(/^SPECIAL_SUMMON(?:_AS_([A-Z]+))?(_IGNORING_CONDITIONS)?(_IGNORING_REVIVE_LIMIT)?(?:_IN_([A-Z_]+?))?(_TO_OPPONENT)?$/);
    if (!m) return unwritten(`able ${able}`);
    const [, type, nocheck, nolimit, position, opponent] = m;
    const args = ["e", type ? `SUMMON_TYPE_${type}` : "0", "tp", String(Boolean(nocheck)), String(Boolean(nolimit))];
    if (position || opponent) args.push(position ? this.flags("POS_", position.split("_FACE").map((p, i) => (i ? `FACE${p}` : p))) : "POS_FACEUP");
    if (opponent) args.push("1-tp");
    return `c:IsCanBeSpecialSummoned(${args.join(",")})`;
  }

  /** A filter, and the card a call leaves out for it (its exclude argument): nil, or what its except names here. */
  exclude(card: S.CardFilter | undefined, scope?: Scope): [S.CardFilter | undefined, string] {
    // Not this card, after the Necrovalley check that wraps the filter: the call leaves it out (exclude e:GetHandler())
    const states = card?.states ?? [];
    if (!card?.except?.length && states.includes("NOT_NECRO_VALLEY") && states.indexOf("NOT_SELF") > states.indexOf("NOT_NECRO_VALLEY"))
      return [{ ...card, states: states.filter((state) => state !== "NOT_SELF") }, "e:GetHandler()"];
    if (!card?.except?.length) return [card, "nil"];
    const { except, ...rest } = card;
    if (except.length > 1) unwritten("several cards excepted");
    const [ref] = except;
    // Inside a filter, the card it checks
    if ("who" in ref && ref.who === "CHECKED_CARD" && !scope) return [rest, "c"];
    return [rest, scope ? scope.cards(ref) : unwritten(`excepted ${json(ref)} in a filter`)];
  }

  /** At least count cards that match, in places from the effect's player's side. */
  need(need: S.Need, scope?: Scope): string {
    const call = need.targetable ? "Duel.IsExistingTarget" : "Duel.IsExistingMatchingCard";
    const [card, exclude] = this.exclude(need.card, scope);
    return `${call}(${this.filter(card, false)},tp,${this.sides(need.from)},${need.count},${exclude},e,tp)`;
  }
}

/** A function of an effect conditions are written in, with the cards it holds. */
class Scope {
  /** Cards the function holds, by the reader's ids (TARGET, CHOSEN1...). */
  refs = new Map<string, string>();
  /** A move's call, while the parts that depend on it are written in its "if". */
  moved = new Map<string, string>();

  constructor(
    readonly writer: Writer,
    readonly role: "condition" | "cost" | "target" | "operation" | "value",
    /** A value function's parameter for the effect it checks (te, re or se). */
    readonly checked?: string,
  ) {}

  conditions(conditions: S.Condition[]): string {
    return conditions.map((c) => this.condition(c)).join(" and ");
  }

  /** The card or cards a reference names, here. */
  cards(ref: S.CardRef): string {
    if ("who" in ref && !ref.of) {
      if (ref.who === "THIS_CARD") return this.refs.get("THIS_CARD") ?? "e:GetHandler()";
      const known = this.refs.get(ref.who) ?? KNOWN_CARDS[ref.who];
      if (known) return known;
      if (ref.who === "EVENT_CARDS") return "eg";
      if (ref.who === "CHAIN_LINK_CARD") return "re:GetHandler()";
    }
    if ("ref" in ref && !ref.plus?.length && !ref.minus?.length) {
      const variable = this.refs.get(ref.ref);
      if (variable) return variable;
    }
    // The cards an effect keeps in its label object
    if ("memory" in ref && "effect" in ref.memory && ref.memory.slot === "OBJECT") return `${this.writer.effectAt(ref.memory.effect)}:GetLabelObject()`;
    return unwritten(`cards ${json(ref)} in the ${this.role}`);
  }

  /** A number worked out when it is needed (cardSchema.ts Value). */
  value(v: S.Value): string {
    const w = this.writer;
    if (typeof v === "number") return String(v);
    const term = (x: S.Value) => {
      const written = this.value(x);
      return atomic(written) || /^-?\d+$/.test(written) ? written : `(${written})`;
    };
    if ("memory" in v) {
      const { memory, on, player: whose, seat, count } = v;
      if ("flag" in memory) {
        const method = count ? "GetFlagEffect" : "GetFlagEffectLabel";
        if (on) return `${this.cards(on)}:${method}(${w.flagId(memory.flag)})`;
        if (whose === "SUMMONING_PLAYER") unwritten("a flag on the player summoning");
        const holder = seat ?? player((whose as S.Side | undefined) ?? unwritten("a flag on no one"));
        return `Duel.${method}(${holder},${w.flagId(memory.flag)})`;
      }
      if (memory.slot !== "NUMBER" || memory.at) unwritten(`a number of ${json(memory)}`);
      return `${w.effectAt(memory.effect)}:GetLabel()`;
    }
    if ("number" in v) return `${this.cards(v.of)}:Get${RANGE_METHODS[v.number] ?? GET_METHODS[v.number] ?? unwritten(`number ${v.number}`)}()`;
    if ("code" in v) return `${this.cards(v.code)}:Get${v.original ? "Original" : ""}Code()`;
    if ("counters" in v) return `${this.cards(v.on)}:GetCounter(${hex(v.counters)})`;
    if ("countOf" in v && "cards" in v.countOf) return `#${this.cards(v.countOf.cards)}`;
    if ("fieldId" in v) return `${this.cards(v.fieldId)}:GetFieldID()`;
    if ("turn" in v) return "Duel.GetTurnCount()";
    if ("chainLinks" in v) return "Duel.GetCurrentChain()";
    if ("lifePoints" in v) return `Duel.GetLP(${player(v.lifePoints)})`;
    if ("holds" in v) return `(${this.conditions(v.holds)} and 1 or 0)`;
    if ("add" in v) return `${term(v.add[0])}+${term(v.add[1])}`;
    if ("subtract" in v) return `${term(v.subtract[0])}-${term(v.subtract[1])}`;
    if ("multiply" in v) return `${term(v.multiply[0])}*${term(v.multiply[1])}`;
    return unwritten(`a value ${json(v)}`);
  }

  condition(c: S.Condition): string {
    const w = this.writer;
    const group = (parts: string[], joiner: string) => (parts.length > 1 ? `(${parts.join(joiner)})` : parts[0]);
    if ("all" in c) return group((c.all ?? []).map((x) => this.condition(x)), " and ");
    if ("any" in c) return group((c.any ?? []).map((x) => this.condition(x)), " or ");
    if ("not" in c) {
      const inner = this.condition(c.not);
      return atomic(inner) ? `not ${inner}` : `not (${inner})`;
    }
    if ("atLeast" in c) {
      const { atLeast: n, of } = c;
      const atLeast = n === 1 ? ">0" : `>=${n}`;
      if ("matching" in of) {
        if (of.matching.count !== n) unwritten("a count unlike its need's");
        return w.need(of.matching, this);
      }
      if ("freeZones" in of) {
        const { own = [], opponent = [] } = of.freeZones;
        if (own.length === opponent.length) unwritten("free zones on both sides");
        const [who, zones] = own.length ? ["tp", own] : ["1-tp", opponent];
        if (of.forExtraDeck) return `Duel.GetLocationCountFromEx(${who})${atLeast}`;
        if (zones.join() !== "MZONE" && zones.join() !== "SZONE") unwritten(`free zones in ${zones.join()}`);
        return `Duel.GetLocationCount(${who},${w.locations(zones)})${atLeast}`;
      }
      if ("cards" in of) return `#${this.cards(of.cards)}${atLeast}`;
      if ("moved" in of) {
        const call = this.moved.get(of.moved);
        if (!call || n !== 1) unwritten(`moved ${of.moved} out of place`);
        return call!;
      }
      return unwritten(`at least ${json(of)}`);
    }
    if ("is" in c) {
      const subject = this.cards(c.is.cards);
      const checks = w.checks(c.is.filter, this.role === "cost");
      if (!checks.length) unwritten("a check of nothing");
      // One check is written on the card; several are a filter of the card, read back as one
      if (checks.length > 1 || c.is.filter.states?.includes("NOT_NECRO_VALLEY")) return `${w.filter(c.is.filter, this.role === "cost")}(${subject},e,tp)`;
      return checks[0].replace(/\bc(?=[:~])/g, subject);
    }
    if ("stillOnChain" in c) return `${this.cards(c.stillOnChain)}:IsRelateToEffect(e)`;
    if ("turn" in c) return `Duel.GetTurnPlayer()==${c.turn === "OWN" ? "tp" : "1-tp"}`;
    if ("phase" in c) {
      if (c.phase.length !== 1) unwritten("any of several phases");
      return `Duel.GetCurrentPhase()==PHASE_${c.phase[0]}`;
    }
    if ("chainLink" in c) {
      const { negatable, ...rest } = c.chainLink;
      if (!negatable || Object.keys(rest).length) unwritten(`chain link ${json(c.chainLink)}`);
      return negatable === "ACTIVATION" ? "Duel.IsChainNegatable(ev)" : "Duel.IsChainDisablable(ev)";
    }
    if ("player" in c) {
      if (c.player.is === "BOTH") unwritten("either player");
      return `${c.player.which === "REASON" ? "rp" : "ep"}==${player(c.player.is)}`;
    }
    if ("same" in c) return `${this.cards(c.same[0])}==${this.cards(c.same[1])}`;
    if ("sameEffect" in c) return `${w.effectAt(c.sameEffect[0])}==${w.effectAt(c.sameEffect[1])}`;
    if ("compare" in c) return `${this.value(c.compare.value)}${COMPARE[c.compare.is]}${this.value(c.compare.to)}`;
    if ("chainLinks" in c) return `Duel.GetCurrentChain()==${c.chainLinks}`;
    if ("chainNamesUnique" in c) return "Duel.CheckChainUniqueness()";
    if ("damageCalculated" in c) return "Duel.IsDamageCalculated()";
    if ("exists" in c) {
      const card = this.cards(c.exists);
      if (!Object.values(KNOWN_CARDS).includes(card)) unwritten(`that ${json(c.exists)} exists`);
      return card;
    }
    if ("never" in c) return "false";
    if ("summonType" in c) {
      if (c.summonType.length !== 1) unwritten("any of several summon types");
      return `st&SUMMON_TYPE_${c.summonType[0]}==SUMMON_TYPE_${c.summonType[0]}`;
    }
    if ("reasons" in c) return `r&${c.reasons.length > 1 ? `(${w.flags("REASON_", c.reasons)})` : w.flags("REASON_", c.reasons)}~=0`;
    if ("effect" in c) {
      const x = this.checked ?? unwritten("an effect's checks where no effect is given");
      const checks = Object.entries(c.effect);
      if (checks.length !== 1) unwritten(`an effect's checks ${json(c.effect)}, not one`);
      const [[key, v]] = checks;
      if (key === "otherCards") return `${x}:GetOwner()${v ? "~=" : "=="}e:GetOwner()`;
      if (key === "player" && v !== "BOTH") return `${x}:GetOwnerPlayer()${v === "OPPONENT" ? "~=" : "=="}tp`;
      if (key === "types") return `${x}:IsActiveType(${w.flags("TYPE_", v as string[])})`;
      if (key === "activated" && v) return `${x}:IsActivated()`;
      if (key === "effectTypes") return `${x}:IsHasType(${w.flags("EFFECT_TYPE_", v as string[])})`;
      return unwritten(`an effect's check ${json(c.effect)}`);
    }
    if ("fieldSpell" in c) {
      const { name, player: whose } = c.fieldSpell;
      if (whose === "BOTH") unwritten("a Field Spell of either player's");
      return `Duel.IsEnvironment(${w.codeText(name)}${whose ? `,${player(whose)}` : ""})`;
    }
    if ("canDraw" in c) return `Duel.IsPlayerCanDraw(${player(c.canDraw.player)}${c.canDraw.count !== undefined ? `,${c.canDraw.count}` : ""})`;
    return unwritten(`condition ${json(c)}`);
  }
}

/** A guard of a move: a condition written as an "if" around it, or a "you can" question. */
interface Guard {
  c: S.Condition;
  key: string;
  ask?: string;
}
interface Item {
  part: S.Part;
  move: S.Move;
  guards: Guard[];
}

/** One effect's cost, target and operation functions, written from its moves. */
class Operation {
  /** Each pick of the effect (by the reader's id): the variable its cards are kept in. */
  private picks = new Map<string, { variable: string; picked: boolean }>();

  constructor(
    private writer: Writer,
    private effect: S.EffectSchema,
  ) {
    if ((effect.does ?? []).some((part) => part.part === 0)) unwritten("moves of the target function");
    let groups = 0;
    for (const move of [...(effect.cost ?? []), ...movesOf(effect)]) {
      const ref = refOf(move);
      if (!ref || this.picks.has(ref)) continue;
      this.picks.set(ref, { variable: ref === "TARGET" ? (this.severalTargets() ? "tg" : "tc") : `g${++groups}`, picked: false });
    }
  }

  private severalTargets() {
    const targeted = movesOf(this.effect).find((move) => move.pick === "TARGETED");
    return targeted?.count !== undefined && (targeted.count === "ALL" || targeted.count.max > 1);
  }

  /** The checks the cost makes, as the reader reads the cost function written for it. */
  costLegal(): S.Condition[] {
    const out: S.Condition[] = [];
    for (const move of this.effect.cost ?? []) {
      if (move.pick === "THIS_CARD" && COST_ABLE[move.move]) out.push({ is: { cards: { who: "THIS_CARD" }, filter: { able: [COST_ABLE[move.move]!] } } });
      else if (move.pick === "CHOSEN" && move.count && move.count !== "ALL") {
        const need = { count: move.count.min, from: move.from ?? {}, card: move.card ?? {}, targetable: false };
        out.push({ atLeast: move.count.min, of: { matching: need } });
      }
    }
    return out;
  }

  // ---- cost ----

  costFunction(n: number, legal: S.Condition[]): string[] {
    const scope = new Scope(this.writer, "cost");
    const checks = legal.map((c) => scope.condition(c));
    const body: string[] = [];
    for (const move of this.effect.cost ?? []) {
      if (MARKS.has(move.move)) {
        body.push(...this.marked(move, scope));
        continue;
      }
      if (!move.reasons?.includes("COST")) unwritten("a cost not made as a cost");
      if (move.move === "PAY_LP") {
        const amount = scope.value(move.amount ?? unwritten("an amount of LP not given"));
        checks.push(`Duel.CheckLPCost(tp,${amount})`);
        body.push(`Duel.PayLPCost(tp,${amount})`);
      } else if (move.move === "DETACH") {
        const amount = scope.value(move.amount ?? unwritten("detaching a number of materials not given"));
        body.push(`e:GetHandler():RemoveOverlayCard(tp,${amount},${amount},REASON_COST)`);
      } else if (move.pick === "THIS_CARD") body.push(this.call(move, "e:GetHandler()", scope));
      else if (move.pick === "CHOSEN" && move.count && move.count !== "ALL") {
        const pick = this.picks.get(refOf(move)!)!;
        if (!pick.picked) {
          pick.picked = true;
          const [card, exclude] = this.writer.exclude(move.card, scope);
          const f = this.writer.filter(card, true);
          const { min, max } = move.count;
          // Discarding as a cost selects and discards in one call
          if (move.move === "DISCARD" && move.from?.own?.join() === "HAND" && !move.from.opponent?.length) {
            body.push(`Duel.DiscardHand(tp,${f},${min},${max},${this.reason(move)},${exclude},e,tp)`);
            continue;
          }
          if (!move.from) unwritten("cards picked from a group not given");
          if (move.by) unwritten("a cost the opponent picks");
          body.push(`Duel.Hint(HINT_SELECTMSG,tp,${HINTS[move.move] ?? "HINTMSG_SELECT"})`);
          body.push(`local ${pick.variable}=Duel.SelectMatchingCard(tp,${f},tp,${this.writer.sides(move.from)},${min},${max},${exclude},e,tp)`);
        }
        body.push(this.call(move, pick.variable, scope));
      } else unwritten(`a cost ${move.move} picked ${move.pick}`);
    }
    return [`function s.cost${n}(e,tp,eg,ep,ev,re,r,rp,chk)`, `\tif chk==0 then return ${checks.join(" and ") || "true"} end`, ...indent(body), "end"];
  }

  // ---- target ----

  targetFunction(n: number, legal: S.Condition[]): string[] {
    const w = this.writer;
    const scope = new Scope(w, "target");
    const targeted = movesOf(this.effect).find((move) => move.pick === "TARGETED");
    if (this.effect.targets !== Boolean(targeted)) unwritten("targets unlike its moves");
    const lines: string[] = [];
    let params = "chk";
    let select: string[] = [];
    if (targeted) {
      if (!targeted.count || targeted.count === "ALL") return unwritten("targets without a count");
      const { min, max } = targeted.count;
      const [card, exclude] = w.exclude(targeted.card, scope);
      const f = w.filter(card, false);
      const { own = [], opponent = [] } = targeted.from ?? {};
      const where = [...new Set([...own, ...opponent])];
      const at = where.join() === "ONFIELD" ? "chkc:IsOnField()" : `chkc:IsLocation(${w.locations(where)})`;
      const controller = !opponent.length ? " and chkc:IsControler(tp)" : !own.length ? " and chkc:IsControler(1-tp)" : "";
      params = "chk,chkc";
      lines.push(max === 1 ? `if chkc then return ${at}${controller} and ${f}(chkc,e,tp) end` : "if chkc then return false end");
      select = [
        `Duel.Hint(HINT_SELECTMSG,tp,${HINTS[targeted.move] ?? "HINTMSG_TARGET"})`,
        `local g=Duel.SelectTarget(tp,${f},tp,${w.sides(targeted.from)},${min},${max},${exclude},e,tp)`,
      ];
      scope.refs.set("TARGET", "g");
    }
    lines.push(`if chk==0 then return ${legal.map((c) => scope.condition(c)).join(" and ") || "true"} end`, ...select);
    lines.push(...this.declares(scope));
    for (const move of this.effect.onActivation ?? []) lines.push(...this.marked(move, scope));
    return [`function s.tg${n}(e,tp,eg,ep,ev,re,r,rp,${params})`, ...indent(lines), "end"];
  }

  /** What the effect tells responders it will do; and a player-targeting effect's player and number. */
  private declares(scope: Scope): string[] {
    const w = this.writer;
    const moves = movesOf(this.effect);
    const lines: string[] = [];
    const playerMove = this.playerMove();
    if (playerMove) lines.push(`Duel.SetTargetPlayer(${player(playerMove.player)})`, `Duel.SetTargetParam(${scope.value(playerMove.amount!)})`);
    for (const d of this.effect.declares ?? []) {
      const call = d.possible ? "Duel.SetPossibleOperationInfo" : "Duel.SetOperationInfo";
      const category = `CATEGORY_${d.category}`;
      // Which player isn't in the description: the one the declared move is made by or on
      const move = moves.find((m) => MOVE_CATEGORY[m.move] === d.category);
      let line: string;
      if (d.amount !== undefined) line = `${call}(0,${category},nil,0,${player(move?.player)},${scope.value(d.amount)})`;
      else if (d.cards) {
        const ref = "ref" in d.cards ? d.cards.ref : undefined;
        // A group made to be declared, which the operation makes again to move
        if (ref?.startsWith("ALL") && !scope.refs.has(ref)) lines.push(...this.declaredGroup(scope, ref, d.category));
        const cards = scope.cards(d.cards);
        const count = d.count === "ALL" ? `#${cards}` : d.count ? String(d.count.min) : unwritten("declared cards without a count");
        line = `${call}(0,${category},${cards},${count},0,${d.places?.length ? w.locations(d.places) : "0"})`;
      } else {
        if (!d.count || d.count === "ALL") unwritten("a declared count not given");
        const { own = [], opponent = [] } = move?.from ?? {};
        const who = own.length && opponent.length ? "PLAYER_ALL" : opponent.length ? "1-tp" : "tp";
        line = `${call}(0,${category},nil,${(d.count as { min: number }).min},${who},${d.places?.length ? w.locations(d.places) : "0"})`;
      }
      if (d.requires?.length) lines.push(`if ${scope.conditions(d.requires)} then`, `\t${line}`, "end");
      else lines.push(line);
    }
    return lines;
  }

  private declaredGroup(scope: Scope, ref: string, category: string): string[] {
    const taken = movesOf(this.effect).find((move) => move.pick === "ALL" && MOVE_CATEGORY[move.move] === category);
    if (!taken) unwritten(`declared ${ref}, which no move takes`);
    const variable = `sg${scope.refs.size + 1}`;
    scope.refs.set(ref, variable);
    const [card, exclude] = this.writer.exclude(taken!.card, scope);
    return [`local ${variable}=Duel.GetMatchingGroup(${this.writer.filter(card, false)},tp,${this.writer.sides(taken!.from)},${exclude},e,tp)`];
  }

  /** The draw, damage or gain of LP the effect targets a player for (PLAYER_TARGET). */
  private playerMove(): S.Move | undefined {
    if (!this.effect.flags?.includes("PLAYER_TARGET")) return undefined;
    const moves = movesOf(this.effect).filter((m) => ["DRAW", "DAMAGE", "GAIN_LP"].includes(m.move));
    if (moves.length !== 1 || moves[0].amount === undefined) unwritten("a player target for no one move");
    return moves[0];
  }

  // ---- operation ----

  operationFunction(n: number): string[] {
    const scope = new Scope(this.writer, "operation");
    const head: string[] = [];
    const parts = this.effect.does ?? [];
    if (parts.some((part) => part.link === "OTHERWISE")) unwritten("otherwise");
    if (parts.some((part) => part.mode !== undefined)) unwritten("modes");
    if (movesOf(this.effect).some((m) => m.cards && "who" in m.cards && m.cards.who === "THIS_CARD")) {
      head.push("local c=e:GetHandler()");
      scope.refs.set("THIS_CARD", "c");
    }
    const target = this.picks.get("TARGET");
    if (target) {
      head.push(`local ${target.variable}=${target.variable === "tc" ? "Duel.GetFirstTarget()" : this.writer.dialect.targets}`);
      scope.refs.set("TARGET", target.variable);
    }
    if (this.playerMove()) head.push("local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)");
    // Each move with what it needs, its part's then its own; a "you can" asks once its part's checks hold, before it picks
    const items: Item[] = parts.flatMap((part) =>
      (part.moves ?? []).map((move) => ({ part, move, guards: [...(part.requires ?? []), ...(move.requires ?? [])].map((c) => ({ c, key: json(c) })) })),
    );
    for (const part of parts.filter((p) => p.optional)) {
      const own = items.filter((item) => item.part === part);
      const picks = new Set(own.map((item) => refOf(item.move)).filter(Boolean));
      const at = Math.min(...own.map((item) => {
        const i = item.guards.findIndex((g) => refsOf(g.c).some((ref) => picks.has(ref) && ref !== "TARGET"));
        return i === -1 ? item.guards.length : i;
      }));
      const ask = { c: { optional: true } as S.Condition, key: `you can ${part.part}`, ask: `Duel.SelectYesNo(tp,${this.writer.question()})` };
      for (const item of own) item.guards.splice(at, 0, ask);
    }
    const body = this.emit(items, [], scope, new Set());
    return [`function s.op${n}(e,tp,eg,ep,ev,re,r,rp)`, ...indent([...head, ...body]), "end"];
  }

  /**
   * Moves whose guards begin with open: each next guard written once, as an
   * "if" around the moves that share it, and a move a later part depends on
   * ("if you do") as the "if" around that part.
   */
  private emit(items: Item[], open: string[], scope: Scope, started: Set<S.Part>): string[] {
    const lines: string[] = [];
    const next = (item: Item) => {
      if (item.guards.slice(0, open.length).some((g, i) => g.key !== open[i])) unwritten("parts whose checks can't nest");
      return item.guards[open.length];
    };
    // A part after a Duel.BreakEffect() starts with it, before what it picks and checks
    const start = (part: S.Part) => {
      if (started.has(part)) return;
      started.add(part);
      if (part.link === "THEN" || part.link === "ALSO_AFTER_THAT") lines.push("Duel.BreakEffect()");
    };
    const run = (i: number, key: string) => {
      let j = i;
      while (j < items.length && next(items[j])?.key === key) j++;
      return j;
    };
    for (let i = 0; i < items.length; ) {
      const item = items[i];
      const first = next(item);
      if (!first) {
        start(item.part);
        const discard = this.discard(item.move, scope);
        if (!discard) lines.push(...this.pick(item.move, scope));
        const call = discard ?? this.call(item.move, item.move.cards ? scope.cards(item.move.cards) : "", scope);
        const moved: S.Condition = { atLeast: 1, of: { moved: item.move.move } };
        const j = run(i + 1, json(moved));
        if (j > i + 1) {
          // NegateActivation and NegateEffect say whether they did; the others how many cards they moved
          scope.moved.set(item.move.move, /^Duel\.Negate/.test(call) ? call : `${call}>0`);
          lines.push(`if ${scope.condition(moved)} then`, ...indent(this.emit(items.slice(i + 1, j), [...open, json(moved)], scope, started)), "end");
          scope.moved.delete(item.move.move);
        } else lines.push(call);
        i = j;
        continue;
      }
      const j = run(i, first.key);
      const group = items.slice(i, j);
      if (!first.ask) {
        // What the check is about is picked first, by the part that picks it
        for (const ref of refsOf(first.c)) {
          const owner = items.find((x) => refOf(x.move) === ref);
          if (!owner) continue;
          start(owner.part);
          lines.push(...this.pick(owner.move, scope));
        }
        if (group.every((x) => x.part === group[0].part) && group[0].part.link !== "AND_IF_YOU_DO") start(group[0].part);
      }
      lines.push(`if ${first.ask ?? scope.condition(first.c)} then`, ...indent(this.emit(group, [...open, first.key], scope, started)), "end");
      i = j;
    }
    return lines;
  }

  /** Discarding cards picked from the hand, which nothing else is about, in one call that picks and discards them. */
  private discard(move: S.Move, scope: Scope): string | undefined {
    const ref = refOf(move);
    const pick = ref ? this.picks.get(ref) : undefined;
    if (move.move !== "DISCARD" || move.pick !== "CHOSEN" || !move.count || move.count === "ALL" || move.by) return;
    if (!pick || pick.picked || move.from?.own?.join() !== "HAND" || move.from.opponent?.length) return;
    if (refsOf(this.effect as S.Condition).filter((r) => r === ref).length > 1) return;
    pick.picked = true;
    const [card, exclude] = this.writer.exclude(move.card, scope);
    return `Duel.DiscardHand(tp,${this.writer.filter(card, false)},${move.count.min},${move.count.max},${this.reason(move)},${exclude},e,tp)`;
  }

  /** The selection of a move's cards, the first time the operation takes them. */
  private pick(move: S.Move, scope: Scope): string[] {
    const ref = refOf(move);
    const pick = ref && ref !== "TARGET" ? this.picks.get(ref) : undefined;
    if (!pick) return [];
    scope.refs.set(ref!, pick.variable);
    if (pick.picked) return [];
    pick.picked = true;
    const [card, exclude] = this.writer.exclude(move.card, scope);
    const f = this.writer.filter(card, false);
    const where = this.writer.sides(move.from);
    if (!move.from) unwritten("cards picked from a group not given");
    if (move.pick === "ALL") return [`local ${pick.variable}=Duel.GetMatchingGroup(${f},tp,${where},${exclude},e,tp)`];
    if (move.pick !== "CHOSEN" || !move.count || move.count === "ALL") return unwritten(`cards picked ${move.pick}`);
    const by = player(move.by);
    return [
      `Duel.Hint(HINT_SELECTMSG,${by},${HINTS[move.move] ?? "HINTMSG_SELECT"})`,
      `local ${pick.variable}=Duel.SelectMatchingCard(${by},${f},tp,${where},${move.count.min},${move.count.max},${exclude},e,tp)`,
    ];
  }

  /** A move's reasons (REASON_EFFECT+REASON_DISCARD), in their order. */
  private reason(move: S.Move): string {
    if (!move.reasons?.length) unwritten(`${move.move} for no reason`);
    return this.writer.flags("REASON_", move.reasons!);
  }

  /** Something kept for later or a chain limit outside the operation (a cost's flag, a limit on activation), within what it needs. */
  marked(move: S.Move, scope: Scope): string[] {
    if (!MARKS.has(move.move)) unwritten(`${move.move} on activation`);
    const call = this.mark(move, move.cards ? scope.cards(move.cards) : "", scope)!;
    return move.requires?.length ? [`if ${scope.conditions(move.requires)} then`, `\t${call}`, "end"] : [call];
  }

  /** Something kept for later: a flag put on cards g or a player, or taken off; numbers, cards g or an effect kept in a label; or a chain limit. */
  mark(move: S.Move, g: string, scope: Scope): string | undefined {
    const w = this.writer;
    const on = (method: string, ...args: string[]) =>
      g
        ? `${g}:${method}(${args.join(",")})`
        : move.player || move.seat !== undefined
          ? `Duel.${method}(${[move.seat ?? player(move.player), ...args].join(",")})`
          : unwritten(`${move.move} on nothing`);
    const memory = move.memory;
    switch (move.move) {
      case "REMEMBER":
      case "FORGET": {
        if (!memory) return unwritten(`${move.move} of nothing`);
        if ("flag" in memory) {
          if (move.move === "FORGET") return on("ResetFlagEffect", w.flagId(memory.flag));
          const [label, ...more] = move.numbers ?? [];
          if (more.length) unwritten("a flag of several numbers");
          const args = [w.flagId(memory.flag), w.reset(move.until), w.flags("EFFECT_FLAG_", move.flags ?? []), String(move.times ?? 1)];
          if (label !== undefined || move.description !== undefined) args.push(label === undefined ? "0" : scope.value(label));
          if (move.description !== undefined) args.push(w.stringId(move.description));
          return on("RegisterFlagEffect", ...args);
        }
        const holder = w.effectAt(memory.effect);
        if (memory.at) unwritten("one of a label's numbers");
        if (memory.slot === "NUMBER") {
          if (move.move === "FORGET" || !move.numbers?.length) return unwritten("a label of no numbers");
          return `${holder}:SetLabel(${move.numbers.map((n) => scope.value(n)).join(",")})`;
        }
        // A group it keeps: cards added to it, taken from it, or all let go
        const group = w.keepsGroup(memory.effect);
        const one = g === "tc" || /^(e|re):GetHandler\(\)$/.test(g) || Object.values(KNOWN_CARDS).includes(g);
        if (move.adding || (group && move.move === "FORGET" && move.cards)) {
          if (!group) unwritten("cards added to a label object that isn't a group");
          const method = move.adding ? (one ? "AddCard" : "Merge") : one ? "RemoveCard" : "Sub";
          return `${holder}:GetLabelObject():${method}(${g || unwritten(`${move.move} of no cards`)})`;
        }
        if (move.move === "FORGET") {
          if (move.cards) unwritten("some of the cards a label object keeps let go");
          return group ? `${holder}:GetLabelObject():Clear()` : `${holder}:SetLabelObject(nil)`;
        }
        if (group) unwritten("cards kept in place of a group's");
        if (move.keptEffect !== undefined) return `${holder}:SetLabelObject(${w.effectAt(move.keptEffect)})`;
        return `${holder}:SetLabelObject(${g || unwritten("a label object of nothing")})`;
      }
      case "END_EFFECT":
        return `${w.effectAt(move.ended ?? unwritten("an effect ended of no effect"))}:Reset()`;
      case "CHAIN_LIMIT": {
        const [until, ...more] = move.until ?? [];
        if (more.length || (until !== "CHAIN_END" && until !== "THIS_CHAIN_LINK")) unwritten(`a chain limit until ${move.until}`);
        const limit =
          move.canRespond === "NONE"
            ? (w.dialect.aux("aux.FALSE") ?? unwritten("aux.FALSE"))
            : move.canRespond === "YOU"
              ? w.helper("s.chainlm", ["function s.chainlm(e,rp,tp)", "\treturn tp==rp", "end"])
              : unwritten("a chain limit of no one");
        return `Duel.SetChainLimit${until === "CHAIN_END" ? "TillChainEnd" : ""}(${limit})`;
      }
    }
    return undefined;
  }

  /** A move's call on its cards g. */
  private call(move: S.Move, g: string, scope: Scope): string {
    const reason = () => this.reason(move);
    const position = this.writer.flags("POS_", move.position ?? []);
    const amount = () => scope.value(move.amount ?? unwritten(`${move.move} of an amount not given`));
    const byChainInfo = this.playerMove() === move;
    switch (move.move) {
      case "DRAW":
        return byChainInfo ? `Duel.Draw(p,d,${reason()})` : `Duel.Draw(${player(move.player)},${amount()},${reason()})`;
      case "DAMAGE":
        return byChainInfo ? `Duel.Damage(p,d,${reason()})` : `Duel.Damage(${player(move.player)},${amount()},${reason()})`;
      case "GAIN_LP":
        return byChainInfo ? `Duel.Recover(p,d,${reason()})` : `Duel.Recover(${player(move.player)},${amount()},${reason()})`;
      case "NEGATE_ACTIVATION":
        return "Duel.NegateActivation(ev)";
      case "NEGATE_EFFECT":
        return "Duel.NegateEffect(ev)";
    }
    const mark = this.mark(move, g, scope);
    if (mark) return mark;
    if (!g) unwritten(`${move.move} of no cards`);
    switch (move.move) {
      case "TO_HAND":
        return `Duel.SendtoHand(${g},${move.player ? player(move.player) : "nil"},${reason()})`;
      case "TO_GRAVE":
      case "DISCARD":
        return `Duel.SendtoGrave(${g},${reason()})`;
      case "BANISH":
        return `Duel.Remove(${g},${position},${reason()})`;
      case "DESTROY":
        return `Duel.Destroy(${g},${reason()})`;
      case "SPECIAL_SUMMON":
        if (move.summonType?.length) unwritten("a Special Summon of a type");
        if (!move.position?.length) unwritten("a Special Summon in no position");
        const ignoring = move.ignoring ?? [];
        return `Duel.SpecialSummon(${g},0,${player(move.by)},${player(move.player)},${ignoring.includes("SUMMON_CONDITIONS")},${ignoring.includes("REVIVE_LIMIT")},${position})`;
      case "TRIBUTE":
        return `Duel.Release(${g},${reason()})`;
      case "TO_DECK": {
        const [place = "DECKSHUFFLE", ...more] = move.deckPlace ?? [];
        if (more.length || !DECK_PLACES[place]) unwritten(`to the Deck at ${move.deckPlace}`);
        return `Duel.SendtoDeck(${g},${move.player ? player(move.player) : "nil"},${DECK_PLACES[place]},${reason()})`;
      }
      case "REVEAL":
        return `Duel.ConfirmCards(${player(move.player)},${g})`;
    }
    return unwritten(`move ${move.move}`);
  }
}

/** Whether an expression is a name or a call, which "not" can come before without parentheses (not binds tighter than ==). */
function atomic(expression: string): boolean {
  let depth = 0;
  for (const ch of expression) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (depth === 0 && !/[\w.:]/.test(ch)) return false;
  }
  return true;
}

/** The picks a condition is about: #g1>0 is about CHOSEN1. */
function refsOf(c: S.Condition): string[] {
  const out: string[] = [];
  const walk = (x: unknown) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") {
      if (typeof (x as { ref?: unknown }).ref === "string") out.push((x as { ref: string }).ref);
      Object.values(x).forEach(walk);
    }
  };
  walk(c);
  return out;
}
