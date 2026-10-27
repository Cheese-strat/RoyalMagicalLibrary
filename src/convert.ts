import type * as S from "./cardSchema.js";
import { flagText } from "./format.js";
import type { Library } from "./library.js";
import { BOOKKEEPING, labelParts } from "./read/parts.js";
import { ACTIVATED } from "./read/steps.js";
import type { CardFlags, Flags } from "./readCard.js";

/**
 * A card in the schema's format (cardSchema.ts): its printed data from the
 * card database, and its effects from the reader's records (readCard.ts).
 * Whatever the reader recorded that no rule here knows goes to the effect's
 * unread, as the record's text, never guessed: a record the reader couldn't
 * read (RAW) is unread here too.
 */
export function convert(library: Library, card: CardFlags, readerVersion: string): S.CardSchema {
  const at = new Converter(library, card.CODE);
  const printed = printedOf(library, card.CODE);
  const effects = card.EFFECTS.map((effect) => at.effect(effect));
  return strip({
    code: card.CODE,
    name: card.NAME,
    printed,
    rules: at.rules(card, printed),
    summons: at.summons(card, printed),
    effects,
    source: { readerVersion, scriptHash: library.scriptHash(card.CODE) },
  });
}

type Role = S.Unread["role"];
const ROLES: Record<string, Role> = {
  CONDITION: "condition",
  COST: "cost",
  TARGET: "target",
  OPERATION: "operation",
  VALUE: "value",
  APPLIES_TO: "value",
};
const PLACES = new Set<S.Place>(["HAND", "MZONE", "SZONE", "FZONE", "PZONE", "GRAVE", "REMOVED", "DECK", "EXTRA", "OVERLAY", "ONFIELD"]);
const NUMBERS = new Set<S.CardNumber>([
  "LEVEL",
  "RANK",
  "LINK",
  "ATTACK",
  "DEFENSE",
  "BASE_ATTACK",
  "BASE_DEFENSE",
  "PRINTED_ATTACK",
  "PRINTED_DEFENSE",
  "MATERIALS",
]);
/** The reader's names for cards it names, and the schema's. */
const WHO: Record<string, S.Who> = {
  SELF: "THIS_CARD",
  EVENT_CARDS: "EVENT_CARDS",
  CHAIN_LINK_RESPONDED_TO: "CHAIN_LINK",
  RESPONDED_CARD: "CHAIN_LINK_CARD",
  ATTACKER: "ATTACKER",
  ATTACK_TARGET: "ATTACK_TARGET",
  BATTLE_TARGET: "BATTLE_TARGET",
  EQUIPPED_MONSTER: "EQUIPPED_MONSTER",
  CARD_IT_TARGETS: "CARD_IT_TARGETS",
  MOVED_BY_LAST_STEP: "MOVED_BY_LAST_STEP",
  TRIBUTABLE: "TRIBUTABLE",
  YOUR_FUSION_MATERIALS: "FUSION_MATERIALS",
  CHAIN_MATERIAL: "CHAIN_MATERIAL",
  CHAIN_MATERIAL_MATERIALS: "CHAIN_MATERIAL_MATERIALS",
  LABEL_OBJECT: "LABEL_OBJECT",
  CARD_IN_ZONE: "CARD_IN_ZONE",
  CHECKED_CARD: "CHECKED_CARD",
  MATERIALS_OF: "MATERIALS_OF",
  HIGHEST: "HIGHEST",
  LOWEST: "LOWEST",
};
/** Filter checks that the card is in a state, by the reader's name. */
const STATES = new Set([
  "FACEUP",
  "FACEDOWN",
  "FACEUP_OR_HIDDEN_ZONE",
  "NEGATED",
  "REVEALED",
  "FORBIDDEN",
  "IN_BATTLE",
  "STILL_ON_CHAIN",
  "IMMUNE_TO_THIS",
  "ONLY_ONE_ALLOWS",
  "HAS_FUSION_MATERIALS",
  "NOT_SELF",
  "LEAVES_FREE_MZONE",
  "NOT_NECRO_VALLEY",
  "NONE",
  "BY_OPPONENT",
  "LINKED",
]);

const side = (who: unknown): S.Side | undefined => (who === "YOU" ? "OWN" : who === "OPPONENT" ? "OPPONENT" : undefined);
const list = <T>(value: unknown): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]) as T[];
const numberOf = (value: unknown): number | undefined =>
  typeof value === "number" ? value : typeof value === "string" && /^-?\d+$/.test(value) ? Number(value) : undefined;
/** A filter's lists, all there to fill in; the ones that stay empty are left out of the output (strip). */
type ListKey = { [K in keyof S.CardFilter]-?: NonNullable<S.CardFilter[K]> extends unknown[] ? K : never }[keyof S.CardFilter];
type Filling = S.CardFilter & { [K in ListKey]-?: NonNullable<S.CardFilter[K]> };
const emptyFilter = (): Filling => ({
  types: [],
  allTypes: [],
  exactTypes: [],
  fusionTypes: [],
  archetypes: [],
  fusionArchetypes: [],
  names: [],
  mentions: [],
  listsAsMaterial: [],
  attributes: [],
  races: [],
  places: [],
  wasIn: [],
  positions: [],
  wasPositions: [],
  able: [],
  states: [],
  summonedBy: [],
  summonedFrom: [],
  reasons: [],
  statuses: [],
  hasEffects: [],
  flags: [],
  counters: [],
  needs: [],
  relations: [],
  passes: [],
  allOf: [],
  anyOf: [],
  none: [],
  unread: [],
});

/** The conversion of one card, with the unread it finds. */
class Converter {
  /** Where unread things found now are listed, and under which role. */
  private sink: S.Unread[];
  private role: Role = "operation";

  constructor(
    private library: Library,
    private code: number,
  ) {
    this.sink = [];
  }

  private unread(text: string): string {
    this.sink.push({ role: this.role, text });
    return text;
  }

  // ---- references, places, counts ----

  private cardCode(name: unknown): number | undefined {
    if (name === "THIS_CARD") return this.code;
    const code = (typeof name === "string" ? this.library.cardCode(name) : numberOf(name)) ?? undefined;
    if (code === undefined) this.unread(`card ${String(name)}`);
    return code;
  }

  private archetype(name: unknown): number | undefined {
    const code = this.library.archetypeCode(String(name)) ?? undefined;
    if (code === undefined) this.unread(`archetype ${String(name)}`);
    return code;
  }

  places(value: Flags | undefined): Required<S.Places> {
    const pick = (names: unknown): S.Place[] =>
      list<string>(names).filter((place) => (PLACES.has(place as S.Place) ? true : (this.unread(`place ${place}`), false))) as S.Place[];
    return { own: pick(value?.OWN), opponent: pick(value?.OPPONENT) };
  }

  count(value: unknown): S.Count | undefined {
    if (value === undefined || value === null) return undefined;
    if (value === "ALL") return "ALL";
    const m = String(value).match(/^(\d+)(?:-(\d+))?$/);
    if (m) return { min: Number(m[1]), max: Number(m[2] ?? m[1]) };
    this.unread(`count ${String(value)}`);
    return undefined;
  }

  cards(who: Flags | undefined): S.CardRef | undefined {
    if (!who || typeof who !== "object") return undefined;
    const all = (x: unknown) => list<Flags>(x).map((y) => this.cards(y)).filter((y): y is S.CardRef => y !== undefined);
    if (who.REF !== undefined) return { ref: String(who.REF), plus: all(who.PLUS), minus: all(who.MINUS) };
    if (who.CARDS) return { cards: all(who.CARDS) };
    const token = who.WHO === "TOKEN" && who.NAME ? this.cardCode(who.NAME) : undefined;
    if (token !== undefined) return { token };
    if (who.WHO === "DECK_TOP") return { deckTop: { player: side(who.PLAYER), count: numberOf(who.COUNT) } };
    if (WHO[who.WHO]) return { who: WHO[who.WHO], of: who.OF ? this.cards(who.OF) : undefined };
    return { unread: this.unread(flagText(who)) };
  }

  // ---- filters ----

  filter(record: Flags | undefined): S.CardFilter {
    return this.fill(record);
  }

  private fill(record: Flags | undefined): Filling {
    const f = emptyFilter();
    for (const [key, value] of Object.entries(record ?? {})) {
      if (key.startsWith("NOT_") && key !== "NOT_SELF" && key !== "NOT_YOURS" && key !== "NOT_NECRO_VALLEY") {
        f.none.push(this.filter({ [key.slice(4)]: value }));
        continue;
      }
      switch (key) {
        case "TYPE": f.types.push(...list<string>(value)); break;
        case "ALL_TYPES": f.allTypes.push(...list<string>(value)); break;
        case "EXACT_TYPE": f.exactTypes.push(...list<string>(value)); break;
        case "FUSION_TYPE": f.fusionTypes.push(...list<string>(value)); break;
        case "SETCODE":
        case "LINK_SETCODE":
        case "ORIGINAL_SETCODE":
          f.archetypes.push(...list(value).map((name) => this.archetype(name)).filter((x): x is number => x !== undefined));
          break;
        case "FUSION_SETCODE":
          f.fusionArchetypes.push(...list(value).map((name) => this.archetype(name)).filter((x): x is number => x !== undefined));
          break;
        case "CODE": f.names.push(...list(value).map((name) => this.cardCode(name)).filter((x): x is number => x !== undefined)); break;
        case "MENTIONS": f.mentions.push(...list(value).map((name) => this.cardCode(name)).filter((x): x is number => x !== undefined)); break;
        case "LISTS_MATERIAL": f.listsAsMaterial.push(...list(value).map((name) => this.cardCode(name)).filter((x): x is number => x !== undefined)); break;
        case "ATTRIBUTE": f.attributes.push(...list<string>(value)); break;
        case "RACE": f.races.push(...list<string>(value)); break;
        case "LOCATION": f.places.push(...this.places({ OWN: value }).own); break;
        case "WAS_IN": f.wasIn.push(...this.places({ OWN: value }).own); break;
        case "POSITION": f.positions.push(...list<string>(value)); break;
        case "WAS_POSITION": f.wasPositions.push(...list<string>(value)); break;
        case "ABLE_TO": f.able.push(...list<string>(value)); break;
        case "DISCARDABLE": f.able.push("DISCARD"); break;
        case "RELEASABLE": f.able.push("TRIBUTE"); break;
        case "SETTABLE": f.able.push("SET"); break;
        case "TARGETABLE": f.able.push("TARGET"); break;
        case "NEGATABLE": f.able.push("NEGATE"); break;
        case "CAN_SPECIAL_SUMMON":
          f.able.push(...(value === true ? ["SPECIAL_SUMMON"] : list<string>(value).map((type) => `SPECIAL_SUMMON_AS_${type}`)));
          break;
        case "CAN_BE_MATERIAL": f.able.push(...list<string>(value).map((type) => `${type}_MATERIAL`)); break;
        case "CAN_SUMMON_NOW": f.able.push(...list<string>(value).map((type) => `${type}_SUMMON_NOW`)); break;
        case "LEAVES_FREE_EXTRA_DECK_ZONE":
          f.states.push(value === true ? "LEAVES_FREE_EXTRA_DECK_ZONE" : "LEAVES_FREE_EXTRA_MONSTER_ZONE");
          break;
        case "YOURS": f.controller = "OWN"; break;
        case "NOT_YOURS": f.controller = "OPPONENT"; break;
        case "WAS_YOURS": f.wasController = "OWN"; break;
        case "SUMMONED_BY": f.summonedBy.push(...list<string>(value)); break;
        case "SUMMONED_FROM": f.summonedFrom.push(...this.places({ OWN: value }).own); break;
        case "SUMMONED_BY_PLAYER": f.summonedByPlayer = side(value); break;
        case "REASON": f.reasons.push(...list<string>(value)); break;
        case "STATUS": f.statuses.push(...list<string>(value)); break;
        case "HAS_EFFECT": f.hasEffects.push(String(value)); break;
        case "FLAG": f.flags.push({ flag: String(value), set: true }); break;
        case "NO_FLAG": f.flags.push({ flag: String(value), set: false }); break;
        case "CAN_HOLD_COUNTER": f.counters.push(String(value)); break;
        case "NEEDS": f.needs.push(...list<Flags>(value).map((need) => this.need(need))); break;
        case "NEEDS_NONE": f.none.push({ needs: list<Flags>(value).map((need) => this.need(need)) }); break;
        case "ORIGINAL_ATTRIBUTE_DIFFERS_FROM": {
          const of = value?.ORIGINAL_ATTRIBUTE_OF;
          const differsFrom = of === "CHECKED_CARD" ? { who: "CHECKED_CARD" as const } : this.cards(of);
          if (differsFrom) f.relations.push({ property: "ORIGINAL_ATTRIBUTE", differsFrom });
          break;
        }
        case "ALSO_PASSES": {
          const passes = this.cards(value);
          if (passes) f.passes.push(passes);
          break;
        }
        case "ANY_OF": f.anyOf.push(...list<Flags>(value).map((x) => this.filter(x))); break;
        case "ALL_OF": f.allOf.push(...list<Flags>(value).map((x) => this.filter(x))); break;
        case "RAW":
        case "RAW_LINES":
          f.unread.push(...list<string>(value).map((text) => this.unread(String(text))));
          break;
        default:
          if (STATES.has(key)) f.states.push(key);
          else if (NUMBERS.has(key as S.CardNumber)) f.numbers = { ...f.numbers, [key]: this.range(value) };
          else if (key.startsWith("SEQUENCE")) f.numbers = { ...f.numbers, SEQUENCE: { ...f.numbers?.SEQUENCE, ...this.sequence(key, value) } };
          else f.unread.push(this.unread(flagText({ [key]: value }).slice(1, -1)));
      }
    }
    return f;
  }

  private need(need: Flags): S.Need {
    return { count: numberOf(need.COUNT) ?? 1, from: this.places(need.FROM), card: this.filter(need.FILTER), targetable: Boolean(need.TARGETABLE) };
  }

  private range(value: Flags): S.Range {
    const one = (x: unknown) => {
      const n = numberOf(x);
      if (n === undefined && x !== undefined) this.unread(`range ${flagText(x)}`);
      return n;
    };
    const values = (x: unknown) => list(x).map(one).filter((n): n is number => n !== undefined);
    const [min, max, is, not] = [one(value?.MIN), one(value?.MAX), values(value?.IS), values(value?.NOT)];
    return {
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(is.length ? { is } : {}),
      ...(not.length ? { not } : {}),
    };
  }

  private sequence(key: string, value: unknown): Partial<S.Range> {
    const n = Number(value);
    switch (key) {
      case "SEQUENCE": return { is: [n] };
      case "SEQUENCE_BELOW": return { max: n - 1 };
      case "SEQUENCE_ABOVE": return { min: n + 1 };
      case "SEQUENCE_AT_MOST": return { max: n };
      case "SEQUENCE_AT_LEAST": return { min: n };
    }
    return {};
  }

  // ---- conditions ----

  conditions(records: unknown): S.Condition[] {
    return list<Flags>(records).flatMap((record) => this.condition(record));
  }

  private all(records: unknown): S.Condition {
    const read = this.conditions(records);
    return read.length === 1 ? read[0] : { all: read };
  }

  private condition(c: Flags): S.Condition[] {
    if (!c || typeof c !== "object") return [{ unread: this.unread(String(c)) }];
    const counted = (n: number, of: S.Counted): S.Condition => ({ atLeast: n, of });
    const [key] = Object.keys(c);
    const v = c[key];
    switch (key) {
      case "ANY_OF": return [{ any: list(v).map((alternative) => this.all(alternative)) }];
      case "NOT": return [{ not: this.all(v) }];
      case "SUCCEEDED": return [counted(numberOf(c.AT_LEAST) ?? 1, { moved: v })];
      case "ANY": return [counted(1, { cards: this.cards(v)! })];
      case "CARDS": {
        const { AT_LEAST, ...cards } = v;
        return [counted(AT_LEAST, { cards: this.cards(cards)! })];
      }
      case "NEEDS": return list<Flags>(v).map((need) => counted(numberOf(need.COUNT) ?? 1, { matching: this.need(need) }));
      case "NEEDS_NONE": return list<Flags>(v).map((need) => ({ not: counted(1, { matching: this.need(need) }) }));
      case "FREE_ZONES":
      case "FREE_ZONES_FOR_EXTRA_DECK": {
        const { AT_LEAST, ...places } = v;
        return [counted(AT_LEAST, { freeZones: this.places(places), forExtraDeck: key !== "FREE_ZONES" })];
      }
      case "RESULT": return [counted(v.AT_LEAST, { result: v.OF })];
      case "EXISTS": return [{ exists: this.cards(v)! }];
      case "THIS_CARD": return [{ is: { cards: { who: "THIS_CARD" }, filter: this.filter(v) } }];
      case "IS": {
        const { REF, PLUS, MINUS, WHO: who, OF, NAME, PLAYER, COUNT, CARDS, ...checks } = v;
        const cards = this.cards({ REF, PLUS, MINUS, WHO: who, OF, NAME, PLAYER, COUNT, CARDS });
        return [{ is: { cards: cards!, filter: this.filter(checks) } }];
      }
      case "STILL_ON_CHAIN": return [{ stillOnChain: this.cards(v)! }];
      case "CONTAINS": return [{ contains: { group: this.cards(v.GROUP)!, card: this.cards(v.CARD)! } }];
      case "ONE_OF_EACH": return [{ oneOfEach: { in: this.cards(v.IN)!, attributes: list(v.ATTRIBUTE) } }];
      case "EVENT_CARDS_INCLUDE": return [{ eventCards: { count: numberOf(v.COUNT) ?? 1, card: this.filter(v.FILTER) } }];
      case "TURN": return [{ turn: v === "YOURS" ? "OWN" : "OPPONENT" }];
      case "PHASE": return [{ phase: list(v) }];
      case "DAMAGE_CALCULATED": return [{ damageCalculated: true }];
      case "CHAIN_LINK_DECLARES": return [{ chainLink: { declares: list(v) } }];
      case "DECLARED_FROM": return [{ chainLink: { declaredFrom: { category: list(v.CATEGORY), places: this.places({ OWN: v.LOCATION }).own } } }];
      case "DECLARED_CARDS":
        return [{ chainLink: { declaredCards: { category: list(v.CATEGORY), count: numberOf(v.COUNT) ?? 1, card: this.filter(v.FILTER) } } }];
      case "CHAIN_LINK_CATEGORY": return [{ chainLink: { categories: list(v) } }];
      case "CHAIN_LINK_TYPE": return [{ chainLink: { types: list(v) } }];
      case "CHAIN_LINK_EFFECT_IS": return [{ chainLink: { effectTypes: list(v) } }];
      case "CHAIN_LINK_EFFECT_NEGATABLE": return [{ chainLink: { negatable: "EFFECT" } }];
      case "CHAIN_LINK_ACTIVATION_NEGATABLE": return [{ chainLink: { negatable: "ACTIVATION" } }];
      case "CHAIN_LINKS": return [{ chainLinks: Number(v) }];
      case "REASON_PLAYER":
      case "EVENT_PLAYER":
        return [{ player: { which: key === "REASON_PLAYER" ? "REASON" : "EVENT", is: side(v) ?? "BOTH" } }];
      case "PLAYER_FLAG":
      case "NO_PLAYER_FLAG":
        return [{ playerFlag: { flag: String(v), set: key === "PLAYER_FLAG", player: c.PLAYER === "SUMMONING_PLAYER" ? "SUMMONING_PLAYER" : "OWN" } }];
      case "PLAYER_AFFECTED_BY": return [{ playerAffectedBy: { player: side(v.PLAYER), effect: String(v.EFFECT) } }];
      case "CAN_DRAW": return [{ canDraw: { player: side(v.PLAYER), count: numberOf(v.COUNT) } }];
      case "NOT_NECRO_VALLEY": return [{ necroValley: "DOESNT_APPLY" }];
      case "NECRO_VALLEY_STOPS_IT": return [{ necroValley: "STOPS_IT" }];
      case "COST_CHECKED": return [{ costChecked: true }];
      case "NEVER": return [{ never: true }];
      case "EFFECT_IS": return [{ effectIs: list(v) }];
      case "SUMMON_TYPE": return [{ summonType: list(v) }];
      case "MODE": return [{ mode: Number(v) }];
      case "OPTIONAL": return [{ optional: true }];
      case "RAW": return [{ unread: this.unread(String(v)) }];
      case "RAW_LINES": return list<string>(v).map((line) => ({ unread: this.unread(line) }));
    }
    return [{ unread: this.unread(flagText(c)) }];
  }

  // ---- effects ----

  effect(e: Flags): S.EffectSchema {
    const unread: S.Unread[] = [];
    const [outer, outerRole] = [this.sink, this.role];
    this.sink = unread;
    // An aux summon procedure's effect is described by the card's summons, not here
    if (e.FROM_PROCEDURE) e = { EFFECT: e.EFFECT, FROM_PROCEDURE: true, TYPE: e.TYPE, APPLIES: e.APPLIES, RANGE: e.RANGE, PROPERTY: e.PROPERTY, DESCRIPTION: e.DESCRIPTION };
    const types = list<string>(e.TYPE);
    const activated = types.some((type) => ACTIVATED.includes(type));
    const happens = activated || types.includes("CONTINUOUS");
    const roles = (["COST", "TARGET", "OPERATION"] as const).map((role) => [role, e[role]] as const);
    const steps = (role: string): Flags | undefined => (typeof e[role] === "object" ? e[role] : undefined);
    // What an aux function did (a cost or a target written for many cards) isn't read
    for (const [role, value] of [...roles, ["CONDITION", e.CONDITION] as const]) {
      if (typeof value !== "string") continue;
      this.role = ROLES[role];
      this.unread(value);
    }
    // A pick of the effect by its id, from any function: a target is picked on activation and moved on resolution
    const picks = new Map<string, Flags>();
    for (const [, value] of roles) for (const action of list<Flags>(typeof value === "object" ? value.ACTIONS : [])) if (action.ID) picks.set(action.ID, action);

    this.role = "condition";
    const requires = Array.isArray(e.CONDITION) ? this.conditions(e.CONDITION) : [];
    const legal = roles.flatMap(([role]) => {
      this.role = ROLES[role];
      return this.conditions(steps(role)?.LEGAL);
    });
    const modes = roles.flatMap(([role]) => {
      this.role = ROLES[role];
      return list<Flags>(steps(role)?.MODES).map(
        (mode): S.Mode => ({
          mode: Number(mode.MODE),
          description: numberOf(mode.DESCRIPTION),
          legal: this.conditions(mode.LEGAL),
          chosenOn: role === "OPERATION" ? "RESOLUTION" : "ACTIVATION",
        }),
      );
    });
    const declares = roles.flatMap(([role]) => {
      this.role = ROLES[role];
      return list<Flags>(steps(role)?.DECLARES).flatMap((declared) => this.declared(declared));
    });

    const cost: S.Move[] = [];
    const onActivation: S.Move[] = [];
    const before: S.Move[] = [];
    for (const role of ["COST", "TARGET"] as const) {
      this.role = ROLES[role];
      for (const action of list<Flags>(steps(role)?.ACTIONS)) {
        const move = this.move(action, picks, []);
        if (!move) continue;
        if (action.LEVEL === "COST") cost.push(move);
        else if (action.LEVEL === "ON_ACTIVATION") onActivation.push(move);
        else before.push(move);
      }
    }
    this.role = "operation";
    const operation = steps("OPERATION");
    const does = [
      ...(before.length ? [{ part: 0, link: undefined, level: "EFFECT" as const, optional: false, mode: undefined, requires: [], moves: before }] : []),
      ...this.parts(list(operation?.ACTIONS), list(operation?.PARTS), picks),
    ];

    this.role = "value";
    const applies = happens || !e.APPLIES || e.FROM_PROCEDURE ? [] : [this.applied(e, types)];
    const limit = e.LIMIT ? this.limit(e.LIMIT) : undefined;
    [this.sink, this.role] = [outer, outerRole];
    outer.push(...unread);
    return {
      index: Number(e.EFFECT),
      kind: kindOf(types),
      fromProcedure: Boolean(e.FROM_PROCEDURE),
      mandatory: types.includes("TRIGGER_F") || types.includes("QUICK_F"),
      speed: activated ? this.speed(types) : undefined,
      event: happens ? (list<string>(e.ON)[0] ?? undefined) : undefined,
      eventOf: happens && types.includes("SINGLE") ? "SELF" : happens && types.includes("FIELD") ? "ANY" : undefined,
      from: this.places({ OWN: e.RANGE }).own,
      limit,
      targets: list(e.PROPERTY).includes("CARD_TARGET"),
      flags: list(e.PROPERTY),
      offered: { own: list(e.TIMING?.OWN), opponent: list(e.TIMING?.OPPONENT) },
      description: numberOf(e.DESCRIPTION),
      categories: list(e.CATEGORY),
      declares,
      modes,
      cost,
      onActivation,
      does,
      applies,
      requires,
      legal,
      unread,
    };
  }

  /** Spell Speed by what is activated: a Counter Trap 3, a Quick-Play Spell, a Trap or a Quick Effect 2, everything else 1. */
  private speed(types: string[]): 1 | 2 | 3 {
    if (types.includes("QUICK_O") || types.includes("QUICK_F")) return 2;
    if (!types.includes("ACTIVATE")) return 1;
    const card = this.library.db.exec("SELECT type FROM datas WHERE id = ?", [this.code])[0]?.values[0][0];
    const cardTypes = this.library.constants.flags("TYPE_", Number(card ?? 0));
    if (cardTypes.includes("COUNTER")) return 3;
    return cardTypes.includes("TRAP") || cardTypes.includes("QUICKPLAY") ? 2 : 1;
  }

  private limit(l: Flags): S.Limit {
    const kinds = list<string>(l.KIND);
    const shared: S.Limit["shared"] =
      l.SHARED === "SOFT" ? "COPY" : l.SHARED === "SINGLE" ? "CARD" : l.SHARED === "HARD" ? "NAME" : (numberOf(l.SHARED_CODE) ?? "NAME");
    return {
      count: Number(l.COUNT),
      per: kinds.includes("DUEL") ? "DUEL" : kinds.includes("CHAIN") ? "CHAIN" : "TURN",
      shared,
      counter: Number(String(l.COUNTER ?? "id+0").replace("id+", "")),
      oath: kinds.includes("OATH"),
    };
  }

  private declared(d: Flags): S.Declared[] {
    return list<string>(d.CATEGORY).map((category) => ({
      category,
      count: d.COUNT === undefined ? undefined : this.count(d.COUNT),
      cards: d.CARDS ? this.cards(d.CARDS) : undefined,
      places: this.places({ OWN: d.FROM }).own,
      amount: numberOf(d.AMOUNT),
      possible: Boolean(d.POSSIBLE),
      requires: this.conditions(d.IF),
    }));
  }

  /** A resolution's steps, as the parts read/parts.ts labelled. */
  private parts(actions: Flags[], labels: Flags[], picks: Map<string, Flags>): S.Part[] {
    return labels.map((label) => {
      const steps = actions.filter((action) => action.PART === label.PART);
      // What every move of the part needs is the part's; the rest is each move's own
      const ifs = steps.filter((step) => !BOOKKEEPING.has(step.ACTION)).map((step) => list<Flags>(step.IF));
      const shared = ifs.length ? ifs[0].filter((c, i) => ifs.every((other) => JSON.stringify(other[i]) === JSON.stringify(c))) : [];
      const own = (c: Flags) => !c.OPTIONAL && c.MODE === undefined;
      return {
        part: Number(label.PART),
        link: label.LINK ?? undefined,
        level: label.LEVEL,
        optional: Boolean(label.OPTIONAL),
        mode: label.MODE ?? undefined,
        requires: this.conditions(shared.filter(own)),
        moves: steps
          .map((step) => this.move(step, picks, list<Flags>(step.IF).slice(shared.length).filter(own)))
          .filter((move): move is S.Move => move !== undefined),
      };
    });
  }

  /** A step that does something, as a move; null for a bookkeeping step. */
  private move(step: Flags, picks: Map<string, Flags>, requires: Flags[]): S.Move | undefined {
    if (BOOKKEEPING.has(step.ACTION)) return undefined;
    if (step.ACTION === "RAW") {
      this.unread(String(step.CALL));
      return undefined;
    }
    const given = step.ACTION === "GIVE_EFFECT";
    const subject: Flags | undefined = given ? step.TO : step.SUBJECT;
    // DiscardHand picks the cards in the move itself
    const inline = subject?.ID ? subject : undefined;
    const pick = inline ?? (subject?.REF ? picks.get(subject.REF) : undefined);
    const group = pick?.FROM?.REF ? picks.get(pick.FROM.REF) : undefined;
    const card = group
      ? { ...this.filter(group.FILTER), allOf: pick?.FILTER ? [this.filter(pick.FILTER)] : [] }
      : pick?.FILTER
        ? this.filter(pick.FILTER)
        : undefined;
    const from = group ? this.places(group.FROM) : pick?.FROM && !pick.FROM.REF && !pick.FROM.WHO ? this.places(pick.FROM) : undefined;
    const to = given ? undefined : (step.TO ?? step.TARGET ?? step.MATERIALS);
    const amount = step.AMOUNT ?? (step.ACTION === "ADD_COUNTER" || step.ACTION === "REMOVE_COUNTER" ? step.COUNT : undefined);
    if (amount !== undefined && numberOf(amount) === undefined) this.unread(`amount ${String(amount)}`);
    return {
      move: step.ACTION,
      cards: inline ? { ref: String(inline.ID), plus: [], minus: [] } : this.cards(subject && Object.keys(subject).length ? subject : undefined),
      pick: step.PICK ?? undefined,
      by: step.BY === "OPPONENT" ? "OPPONENT" : undefined,
      count: pick ? (pick.ACTION === "GROUP" && !pick.COUNT ? "ALL" : this.count(pick.COUNT)) : undefined,
      from,
      card,
      to: to ? this.cards(to) : undefined,
      amount: numberOf(amount),
      player: side(step.PLAYER ?? step.SHOWN_TO),
      reasons: list(step.REASON),
      position: list<string>(step.POSITION).filter(Boolean),
      summonType: list(step.SUMMON_TYPE),
      zones: list(step.ZONE),
      deckPlace: list(step.SEQUENCE),
      counter: step.COUNTER ? String(step.COUNTER) : undefined,
      effect: step.EFFECT ? this.given(step.EFFECT) : undefined,
      until: list(step.EFFECT?.RESET),
      requires: this.conditions(requires),
    };
  }

  /** An effect an effect creates and gives to a card or a player, read as an effect of its own. */
  private given(made: Flags): S.EffectSchema {
    const types = list<string>(made.TYPE);
    const happens = types.some((type) => ACTIVATED.includes(type) || type === "CONTINUOUS");
    const operation = Array.isArray(made.OPERATION) ? made.OPERATION : undefined;
    const flags: Flags = {
      EFFECT: 0,
      TYPE: types,
      ...(happens ? { ON: made.CODE } : { APPLIES: made.CODE }),
      PROPERTY: made.PROPERTY,
      REACHES: made.REACHES,
      VALUE: made.VALUE,
      APPLIES_TO: made.APPLIES_TO === undefined || typeof made.APPLIES_TO === "string" ? made.APPLIES_TO : [made.APPLIES_TO],
      ...(made.COUNT_LIMIT ? { LIMIT: { COUNT: made.COUNT_LIMIT, SHARED: "SOFT" } } : {}),
      ...(operation ? { OPERATION: { ACTIONS: operation, PARTS: labelParts(operation) } } : {}),
      ...(typeof made.OPERATION === "string" ? { OPERATION: made.OPERATION } : {}),
      ...(typeof made.CONDITION === "string" ? { CONDITION: made.CONDITION } : {}),
    };
    return this.effect(flags);
  }

  private applied(e: Flags, types: string[]): S.Applied {
    const reaches: Flags | undefined = e.REACHES;
    const players = list(reaches?.OWN).includes("PLAYER") || list(reaches?.OPPONENT).includes("PLAYER");
    const to: S.Applied["to"] = players
      ? { players: list(reaches?.OWN).includes("PLAYER") ? (list(reaches?.OPPONENT).includes("PLAYER") ? "BOTH" : "OWN") : "OPPONENT" }
      : reaches
        ? { places: this.places(reaches) }
        : types.includes("EQUIP")
          ? "EQUIPPED_MONSTER"
          : "THIS_CARD";
    const requires: S.Condition[] = [];
    // A value or target function's checks: those on the card are a filter, any others go to requires
    const filterOf = (value: unknown): S.CardFilter | undefined => {
      if (value === undefined) return undefined;
      if (typeof value === "string") {
        this.unread(value);
        return undefined;
      }
      const { IF, ...checks } = Object.assign({}, ...list<Flags>(value));
      requires.push(...this.conditions(IF));
      return this.filter(checks);
    };
    // A number, a constant (RESET_TURN_SET, LOCATION_REMOVED: where a card goes instead), or a function's checks
    const constant = typeof e.VALUE === "string" && /^[A-Z][A-Z_]*(?:[+|][A-Z][A-Z_]*)*$/.test(e.VALUE) ? e.VALUE : undefined;
    const value =
      numberOf(e.VALUE) ?? constant ?? (typeof e.VALUE === "string" ? (this.unread(e.VALUE), undefined) : filterOf(e.VALUE));
    return { effect: list<string>(e.APPLIES)[0], to, cards: filterOf(e.APPLIES_TO), value, requires };
  }

  // ---- the card ----

  rules(card: CardFlags, printed: S.Printed): S.CardRules {
    const setup = (name: string) => card.SETUP.find((s) => name in s)?.[name];
    const only = setup("ONLY_ONE_ON_FIELD");
    const once = setup("SetSPSummonOnce");
    return {
      mustBeProperlySummoned: Boolean(setup("MUST_BE_PROPERLY_SUMMONED")),
      cannotNormalSummon:
        (printed.types ?? []).includes("SPSUMMON") || card.EFFECTS.some((e) => list(e.APPLIES).some((x) => x === "CANNOT_SUMMON" || x === "CANNOT_MSET")),
      onlyOne: only ? { side: only.OWN && only.OPPONENT ? "BOTH" : only.OWN ? "OWN" : "OPPONENT" } : undefined,
      summonLimit: once ? { count: 1, per: "TURN", shared: "NAME", counter: 0, oath: false } : undefined,
      counters: list<string>(setup("EnableCounterPermit")).slice(0, 1).map((counter) => Number(counter)),
    };
  }

  summons(card: CardFlags, printed: S.Printed): S.SummonMethod[] {
    this.role = "summon";
    const methods: S.SummonMethod[] = [];
    const method = (name: S.SummonMethodName, from: S.Place[], materials: S.Material[] = [], unread: S.Unread[] = []): S.SummonMethod => ({
      method: name,
      from,
      materials,
      cost: [],
      requires: [],
      unread,
    });
    for (const setup of card.SETUP) {
      if (setup.SUMMON_PROCEDURE) methods.push(this.procedure(setup));
      else if ("aux.EnablePendulumAttribute" in setup) methods.push(method("PENDULUM", ["HAND", "EXTRA"]));
    }
    // The card's own ways of Special Summoning itself (SPSUMMON_PROC effects it registers itself)
    for (const e of card.EFFECTS) {
      if (e.FROM_PROCEDURE || !list(e.APPLIES).includes("SPSUMMON_PROC")) continue;
      const unread: S.Unread[] = [];
      const outer = this.sink;
      this.sink = unread;
      const picks = new Map<string, Flags>(list<Flags>(e.OPERATION?.ACTIONS).filter((a) => a.ID).map((a) => [a.ID, a]));
      const cost = list<Flags>(e.OPERATION?.ACTIONS)
        .map((action) => this.move(action, picks, list(action.IF)))
        .filter((m): m is S.Move => m !== undefined);
      const requires = Array.isArray(e.CONDITION) ? this.conditions(e.CONDITION) : [];
      if (typeof e.CONDITION === "string") this.unread(e.CONDITION);
      this.sink = outer;
      methods.push({ ...method("PROCEDURE", this.places({ OWN: e.RANGE }).own, [], unread), cost, requires });
    }
    const monster = printed.monster;
    const main = monster && !["FUSION", "SYNCHRO", "XYZ", "LINK", "RITUAL", "TOKEN"].includes(monster.frame);
    if (main && !this.rules(card, printed).cannotNormalSummon) {
      const level = monster.level ?? 0;
      const tributes = level >= 7 ? 2 : level >= 5 ? 1 : 0;
      methods.push(
        tributes
          ? method("TRIBUTE", ["HAND"], [{ count: { min: tributes, max: tributes }, role: "ANY", card: {} }])
          : method("NORMAL", ["HAND"]),
      );
    }
    return methods;
  }

  /** An aux summon procedure: what its materials are, by how each procedure takes its arguments (procedure.lua). */
  private procedure(setup: Flags): S.SummonMethod {
    const unread: S.Unread[] = [];
    const outer = this.sink;
    this.sink = unread;
    const kind = setup.SUMMON_PROCEDURE as S.SummonMethodName;
    const via = String(setup.VIA ?? "").replace(/^Add/, "");
    const args: unknown[] = list(setup.ARGS);
    const material = (value: unknown, count: S.Count = { min: 1, max: 1 }, role: S.Material["role"] = "ANY"): S.Material => ({
      count,
      role,
      card: this.materialFilter(value),
    });
    const n = (value: unknown) => numberOf(value) ?? 1;
    let materials: S.Material[] = [];
    if (kind === "SYNCHRO") {
      const max = setup.MAX === undefined || setup.MAX === "99" ? 99 : n(setup.MAX);
      materials = [material(setup.TUNER, { min: 1, max: 1 }, "TUNER"), material(setup.NON_TUNERS, { min: n(setup.MIN), max }, "NON_TUNER")];
    } else if (via === "XyzProcedure") {
      const [filter, level, count] = args;
      materials = [{ ...material(filter, { min: n(count), max: n(count) }), card: { ...this.materialFilter(filter), numbers: { LEVEL: { is: [n(level)] } } } }];
    } else if (via === "LinkProcedure") {
      const [filter, min, max] = args;
      materials = [material(filter, { min: n(min), max: numberOf(max) ?? 99 })];
    } else if (/^FusionProcCode[234]$/.test(via)) {
      materials = args.slice(0, Number(via.slice(-1))).map((name) => material(name));
    } else if (via === "FusionProcMix") {
      materials = args.slice(2).map((name) => material(name));
    } else if (via === "FusionProcFun2") {
      materials = args.slice(0, 2).map((name) => material(name));
    } else if (via === "FusionProcCodeRep" || via === "FusionProcFunRep") {
      const [what, count] = args;
      materials = [material(what, { min: n(count), max: n(count) })];
    } else if (via === "FusionProcCodeFun") {
      const [name, filter, count] = args;
      materials = [material(name), material(filter, { min: n(count), max: n(count) })];
    } else {
      this.unread(`${via || kind} ${args.map((arg) => flagText(arg)).join(",")}`);
    }
    this.sink = outer;
    return { method: kind, from: kind === "RITUAL" ? ["HAND"] : ["EXTRA"], materials, cost: [], requires: [], unread };
  }

  /** A material as the reader wrote it: ANY, NON_TUNER, a card's name, or a filter record. */
  private materialFilter(value: unknown): S.CardFilter {
    if (value === undefined || value === "ANY" || value === "NON_TUNER") return {};
    if (typeof value === "string") {
      const code = this.library.cardCode(value);
      return code !== null ? { names: [code] } : { unread: [this.unread(value)] };
    }
    return this.filter(value as Flags);
  }
}

/** The card with every empty list and null left out (cardSchema.ts: absent is empty, or none). */
function strip<T>(value: T): T {
  if (Array.isArray(value)) return value.map(strip) as T;
  if (!value || typeof value !== "object") return value;
  const kept = Object.entries(value).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length));
  return Object.fromEntries(kept.map(([k, v]) => [k, strip(v)])) as T;
}

function kindOf(types: string[]): S.EffectKind {
  if (types.includes("ACTIVATE")) return "ACTIVATE";
  if (types.includes("IGNITION")) return "IGNITION";
  if (types.includes("QUICK_O") || types.includes("QUICK_F")) return "QUICK";
  if (types.includes("TRIGGER_O") || types.includes("TRIGGER_F")) return "TRIGGER";
  if (types.includes("FLIP")) return "FLIP";
  return types.includes("CONTINUOUS") ? "AUTO" : "CONTINUOUS";
}

/** What cards.cdb prints on a card, decoded. */
function printedOf(library: Library, code: number): S.Printed {
  const [row] =
    library.db.exec(
      `SELECT type, atk, def, level, race, attribute,
         setcode & 65535, (setcode >> 16) & 65535, (setcode >> 32) & 65535, (setcode >> 48) & 65535
       FROM datas WHERE id = ?`,
      [code],
    )[0]?.values ?? [];
  const [type, atk, def, level, race, attribute, ...setcodes] = (row ?? []).map(Number);
  const { constants } = library;
  const types = constants.flags("TYPE_", type);
  const kind: S.CardKind = types.includes("MONSTER") ? "MONSTER" : types.includes("SPELL") ? "SPELL" : "TRAP";
  const archetypes = setcodes.filter((setcode) => setcode > 0);
  if (kind !== "MONSTER") {
    const spellTrap = (["QUICKPLAY", "CONTINUOUS", "EQUIP", "FIELD", "RITUAL", "COUNTER"] as const).find((t) => types.includes(t)) ?? "NORMAL";
    return { kind, types, spellTrap, monster: undefined, archetypes };
  }
  const frame = (["TOKEN", "LINK", "XYZ", "SYNCHRO", "FUSION", "RITUAL", "EFFECT"] as const).find((t) => types.includes(t)) ?? "NORMAL";
  const abilityTypes: [string, S.MonsterAbility][] = [
    ["TUNER", "TUNER"],
    ["PENDULUM", "PENDULUM"],
    ["FLIP", "FLIP"],
    ["DUAL", "GEMINI"],
    ["UNION", "UNION"],
    ["SPIRIT", "SPIRIT"],
    ["TOON", "TOON"],
    ["SPSUMMON", "SPECIAL_SUMMON_ONLY"],
  ];
  const stars = level & 0xff;
  const markers: [number, S.LinkMarker][] = [
    [0x1, "BOTTOM_LEFT"],
    [0x2, "BOTTOM"],
    [0x4, "BOTTOM_RIGHT"],
    [0x8, "LEFT"],
    [0x20, "RIGHT"],
    [0x40, "TOP_LEFT"],
    [0x80, "TOP"],
    [0x100, "TOP_RIGHT"],
  ];
  const isLink = frame === "LINK";
  const monster: S.PrintedMonster = {
    frame,
    abilities: abilityTypes.filter(([t]) => types.includes(t)).map(([, ability]) => ability),
    attribute: constants.flags("ATTRIBUTE_", attribute)[0] ?? "",
    race: constants.flags("RACE_", race)[0] ?? "",
    level: frame === "XYZ" || isLink ? undefined : stars,
    rank: frame === "XYZ" ? stars : undefined,
    link: isLink ? stars : undefined,
    atk: atk === -2 ? undefined : atk,
    def: isLink || def === -2 ? undefined : def,
    linkMarkers: isLink ? markers.filter(([bit]) => def & bit).map(([, marker]) => marker) : [],
    scales: types.includes("PENDULUM") ? { left: (level >> 24) & 0xff, right: (level >> 16) & 0xff } : undefined,
  };
  return { kind, types, spellTrap: undefined, monster, archetypes };
}
