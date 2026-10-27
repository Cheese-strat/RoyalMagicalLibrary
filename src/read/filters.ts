import { names } from "../constants.js";
import { chain, parametersOf, parseExpression, text, type Expression } from "../lua.js";
import { alternatives, returnedExpression } from "./conditions.js";
import { codeName, effectName, flagName, merge, places, zoneNames, type CardContext, type Flags } from "./context.js";

/**
 * A filter function as a record of what a card has to be: one key per check
 * its return expression joins with "and", and ANY_OF for an "or". A check no
 * rule below knows is kept as RAW.
 *
 * params are the values of the filter's extra parameters (after the card),
 * from the call that uses the filter, in order.
 */
export function filterFlags(context: CardContext, filter: Expression | undefined, params: Flags[] = []): Flags {
  if (!filter) return {};
  const t = text(filter);
  if (t === "aux.TRUE" || t === "nil") return {};
  if (t === "aux.FALSE") return { NONE: true };
  const known = AUX_FILTERS[t];
  if (known) return known;

  const [call, ...chained] = chain(filter);
  if (call && !chained.length && call.object === "aux") {
    if (call.name === "AND") return merge(...call.args.map((part) => filterFlags(context, part, params)));
    // Not a card in the GY while Necrovalley applies
    if (call.name === "NecroValleyFilter")
      return merge(filterFlags(context, call.args[0], params), { NOT_NECRO_VALLEY: true });
    if (call.name === "NOT") return negate(filterFlags(context, call.args[0], params));
    // aux.FilterBoolFunction(Card.IsType,TYPE_FUSION): c:IsType(TYPE_FUSION)
    if ((call.name === "FilterBoolFunction" || call.name === "TargetBoolFunction") && call.args[0]) {
      const [method, ...values] = call.args;
      return filterFlags(context, method, values.map((value) => ({ EXPR: text(value) })));
    }
  }

  const cardMethod = t.match(/^Card\.(\w+)$/);
  if (cardMethod) {
    const check = parseExpression(`c:${cardMethod[1]}(${params.map((p) => p.EXPR ?? "nil").join(",")})`);
    return termFlags(context, check, new Map());
  }

  const own = t.match(/^s\.(\w+)$/);
  const fn = own ? context.functions.get(own[1]) : undefined;
  if (!fn) return { RAW: [t] };
  const [, ...declared] = parametersOf(fn);
  const scope = new Map<string, Flags>(declared.slice(0, params.length).map((p, i) => [p, params[i]]));
  const { expression, unread } = returnedExpression(context, fn.body, scope);
  return merge(unread.length ? { RAW: unread } : {}, expression ? checksOf(context, expression, scope) : {});
}

/** aux's ready-made filters (utility.lua), as the checks they make. */
const AUX_FILTERS: Record<string, Flags> = {
  "aux.NegateAnyFilter": { FACEUP: true, NEGATABLE: true },
  "aux.NegateMonsterFilter": { FACEUP: true, NEGATABLE: true, TYPE: ["EFFECT"] },
  "aux.NegateEffectMonsterFilter": { FACEUP: true, NEGATABLE: true, TYPE: ["EFFECT"] },
  "aux.nzatk": { FACEUP: true, ATTACK: { MIN: 1 } },
  "aux.nzdef": { FACEUP: true, DEFENSE: { MIN: 1 } },
};

/** Every check of a filter turned around: NOT_ before each key, or back. */
const negate = (flags: Flags): Flags =>
  Object.fromEntries(
    Object.entries(flags).map(([k, v]) => (k.startsWith("NOT_") ? [k.slice(4), v] : [`NOT_${k}`, v])),
  );

/** A filter's expression: checks joined with "and" in one record, an "or" as ANY_OF. */
function checksOf(context: CardContext, node: Expression, scope: Map<string, Flags>): Flags {
  if (node.type === "LogicalExpression" && node.operator === "or") {
    const parts = alternatives(node);
    // "not f or f(c)": a filter the caller may pass in as a parameter, which then applies
    const [first, second] = parts.map(text);
    const passed = first?.match(/^not (\w+)$/)?.[1];
    if (parts.length === 2 && passed && second?.startsWith(`${passed}(c`) && scope.has(passed)) {
      const given = scope.get(passed)!;
      if (!given.EXPR) return { ALSO_PASSES: given };
      return given.EXPR === "nil" ? {} : filterFlags(context, parseExpression(given.EXPR));
    }
    return { ANY_OF: parts.map((part) => checksOf(context, part, scope)) };
  }
  if (node.type !== "LogicalExpression") return termFlags(context, node, scope);
  const [left, right] = [checksOf(context, node.left, scope), checksOf(context, node.right, scope)];
  // A second "or" in the same filter can't share ANY_OF with the first
  if (left.ANY_OF && right.ANY_OF) {
    const { ANY_OF, ...rest } = right;
    return merge(left, rest, { ALL_OF: [{ ANY_OF }] });
  }
  return merge(left, right);
}

/** One check of a filter (c:IsType(TYPE_MONSTER), not c:IsCode(id)...) as a record. */
export function termFlags(context: CardContext, node: Expression, scope: Map<string, Flags>): Flags {
  const { library } = context;
  const not = node.type === "UnaryExpression" && node.operator === "not";
  const checked = not ? node.argument : node;
  const t = text(checked);
  const negated = (flags: Flags): Flags => (not ? negate(flags) : flags);
  const ref = (text: string) => scope.get(text.trim()) ?? { EXPR: text.trim() };
  // Names as a script writes them, or a number given at runtime (an aux.FilterBoolFunction's argument)
  const flagNames = (written: string, prefix: string) =>
    /^\d+$/.test(written) ? library.constants.flags(prefix, Number(written)) : names(written, prefix);
  let m: RegExpMatchArray | null;

  if (checked.type === "LogicalExpression") return negated(checksOf(context, checked, scope));

  // What the card is
  // IsType(TYPE_SPELL+TYPE_TRAP) is either; IsAllTypes(TYPE_MONSTER+TYPE_EFFECT) is both
  if ((m = t.match(/:IsAllTypes\((.+)\)$/))) return negated({ ALL_TYPES: flagNames(m[1], "TYPE_") });
  if ((m = t.match(/:IsTypes?\((.+)\)$/))) return negated({ TYPE: flagNames(m[1], "TYPE_") });
  if ((m = t.match(/:IsFusionType\((.+)\)$/))) return negated({ FUSION_TYPE: flagNames(m[1], "TYPE_") });
  if ((m = t.match(/:Is(Fusion|Link|Original)?SetCard\(((?:0x[0-9a-fA-F]+|\d+)(?:,(?:0x[0-9a-fA-F]+|\d+))*)\)$/))) {
    // Several archetypes are any one of them, while two IsSetCard checks are both
    const key = m[1] ? `${m[1].toUpperCase()}_SETCODE` : "SETCODE";
    const archetypes = m[2].split(",").map((code) => ({ [key]: [library.archetypeName(Number(code))] }));
    return negated(archetypes.length === 1 ? archetypes[0] : { ANY_OF: archetypes });
  }
  if ((m = t.match(/:IsAttribute\((.+)\)$/))) return negated({ ATTRIBUTE: flagNames(m[1], "ATTRIBUTE_") });
  if ((m = t.match(/:IsRace\((.+)\)$/))) return negated({ RACE: flagNames(m[1], "RACE_") });
  // c:GetAttribute()~=ATTRIBUTE_WIND, c:GetType()==TYPE_TRAP: exactly that, or not
  if ((m = t.match(/:Get(Attribute|Race|Type)\(\)(==|~=)([A-Z_]+)$/))) {
    const key = m[1].toUpperCase();
    const prefix = `${key}_`;
    const check = { [key === "TYPE" ? "EXACT_TYPE" : key]: names(m[3], prefix) };
    return negated(m[2] === "==" ? check : negate(check));
  }

  // Face-up or face-down, and what can be done with it
  if (/:IsFaceupEx\(/.test(t)) return negated({ FACEUP_OR_HIDDEN_ZONE: true });
  if (/:IsFaceup\(/.test(t)) return negated({ FACEUP: true });
  if (/:IsFacedown\(/.test(t)) return negated({ FACEDOWN: true });
  if ((m = t.match(/:IsAbleTo(\w+?)(AsCost)?\(/))) {
    return negated({ ABLE_TO: [`${m[1].toUpperCase()}${m[2] ? "_AS_COST" : ""}`] });
  }
  if (/:IsDiscardable\(/.test(t)) return negated({ DISCARDABLE: true });
  if (/:IsReleasable\(/.test(t)) return negated({ RELEASABLE: true });
  if (/:IsSSetable\(/.test(t)) return negated({ SETTABLE: true });
  // What else can be done with it, by the move it allows
  const able = Object.entries(ABLE).find(([method]) => t.includes(`:${method}(`));
  if (able) return negated({ ABLE_TO: [able[1]] });
  if ((m = t.match(/:IsCanBe(Fusion|Synchro|Xyz|Link|Ritual)Material\(/))) return negated({ CAN_BE_MATERIAL: [m[1].toUpperCase()] });
  if ((m = t.match(/:Is(Synchro|Xyz|Link)Summonable\(/))) return negated({ CAN_SUMMON_NOW: [m[1].toUpperCase()] });
  if (/:IsCanBeEffectTarget\(/.test(t)) return negated({ TARGETABLE: true });
  if (/:IsCanBeDisabledByEffect\(|:IsNegatable\w*\(/.test(t)) return negated({ NEGATABLE: true });
  if (/:IsDisabled\(\)/.test(t)) return negated({ NEGATED: true });
  if (/:IsLinkState\(\)/.test(t)) return negated({ LINKED: true });
  if (/:IsForbidden\(\)/.test(t)) return negated({ FORBIDDEN: true });
  if (/:IsPublic\(\)/.test(t)) return negated({ REVEALED: true });
  // Can be placed without breaking its "only one on the field"
  if (/:CheckUniqueOnField\(/.test(t)) return negated({ ONLY_ONE_ALLOWS: true });
  if ((m = t.match(/:IsCanAddCounter\((\w+)/))) return negated({ CAN_HOLD_COUNTER: m[1] });
  if ((m = t.match(/:IsCanBeSpecialSummoned\(\w+,([^,]+)/))) {
    return negated({ CAN_SPECIAL_SUMMON: m[1].trim() === "0" ? true : flagNames(m[1], "SUMMON_TYPE_") });
  }
  if (/:CheckFusionMaterial\(/.test(t)) return negated({ HAS_FUSION_MATERIALS: true });
  if (/^Duel\.GetMZoneCount\(/.test(t)) return { LEAVES_FREE_MZONE: true };
  if (checked.type === "CallExpression" || checked.type === "BinaryExpression") {
    const [first] = chain(checked.type === "BinaryExpression" ? checked.left : checked);
    if (first?.object === "Duel" && first.name === "GetLocationCountFromEx") {
      const zone = first.args[4];
      return { LEAVES_FREE_EXTRA_DECK_ZONE: zone ? zoneNames(context, text(zone)) : true };
    }
  }

  // Where it is, its name, Level and how it was summoned, and comparisons with another card
  if ((m = t.match(/:GetOriginalAttribute\(\)&(\w+)==0$/))) {
    return { ORIGINAL_ATTRIBUTE_DIFFERS_FROM: ref(m[1]) };
  }
  if ((m = t.match(/:GetSequence\(\)(==|~=|<|>|<=|>=)(\d)$/))) {
    const keys: Record<string, string> = {
      "==": "SEQUENCE",
      "~=": "NOT_SEQUENCE",
      "<": "SEQUENCE_BELOW",
      ">": "SEQUENCE_ABOVE",
      "<=": "SEQUENCE_AT_MOST",
      ">=": "SEQUENCE_AT_LEAST",
    };
    return { [keys[m[1]]]: Number(m[2]) };
  }
  if ((m = t.match(/:IsLocation\((.+)\)$/))) return negated({ LOCATION: flagNames(m[1], "LOCATION_") });
  if (/:IsOnField\(\)/.test(t)) return negated({ LOCATION: ["ONFIELD"] });
  if (/:IsControler\(tp\)$/.test(t)) return negated({ YOURS: true });
  if (/:IsControler\(1-tp\)$/.test(t)) return negated({ NOT_YOURS: true });
  // A list of names is any one of them (a card has one name)
  if ((m = t.match(/:IsCode\(([\w,+]+)\)$/))) return negated({ CODE: m[1].split(",").map((code) => codeName(context, code)) });
  if ((m = t.match(/^(?:aux\.IsCodeListed|aux\.IsCodeOrListed)\(c,(\w+)\)$/))) return negated({ MENTIONS: [codeName(context, m[1])] });
  // Level, Rank, Link, ATK and DEF, as a range (Above and Below include the number)
  const range = rangeOf(checked, scope);
  if (range) return negated(range);
  if ((m = t.match(/:IsPosition\((.+)\)$/))) return negated({ POSITION: flagNames(m[1], "POS_") });
  if (/:IsAttackPos\(\)$/.test(t)) return negated({ POSITION: ["ATTACK"] });
  if (/:IsDefensePos\(\)$/.test(t)) return negated({ POSITION: ["DEFENSE"] });
  if ((m = t.match(/:IsPreviousPosition\((.+)\)$/))) return negated({ WAS_POSITION: flagNames(m[1], "POS_") });
  if ((m = t.match(/:IsReason\((.+)\)$/))) return negated({ REASON: flagNames(m[1], "REASON_") });
  if ((m = t.match(/:IsStatus\((.+)\)$/))) return negated({ STATUS: flagNames(m[1], "STATUS_") });
  if ((m = t.match(/:IsSummonLocation\((.+)\)$/))) return negated({ SUMMONED_FROM: flagNames(m[1], "LOCATION_") });
  if ((m = t.match(/:IsSummonPlayer\((1-tp|tp)\)$/))) return negated({ SUMMONED_BY_PLAYER: m[1] === "tp" ? "YOU" : "OPPONENT" });
  if ((m = t.match(/:IsHasEffect\((\w+)/))) return negated({ HAS_EFFECT: effectName(context, m[1]) });
  if (/:IsRelateTo(Effect|Chain)\(/.test(t)) return negated({ STILL_ON_CHAIN: true });
  if (/:IsRelateToBattle\(\)$/.test(t)) return negated({ IN_BATTLE: true });
  if (/^c~=e:GetHandler\(\)$/.test(t)) return { NOT_SELF: true };
  if ((m = t.match(/:IsSummonType\((.+)\)$/))) return negated({ SUMMONED_BY: flagNames(m[1], "SUMMON_TYPE_") });
  if (/:IsImmuneToEffect\(e\)/.test(t)) return negated({ IMMUNE_TO_THIS: true });
  if ((m = t.match(/^aux\.IsMaterialListCode\(\w+,(\w+)\)$/))) return negated({ LISTS_MATERIAL: codeName(context, m[1]) });

  // Flags set on it by earlier effects
  if ((m = t.match(/:GetFlagEffect\(([\w+*]+)\)==0$/))) return negated({ NO_FLAG: flagName(context, m[1]) });
  if ((m = t.match(/:GetFlagEffect\(([\w+*]+)\)>0$/))) return negated({ FLAG: flagName(context, m[1]) });
  if ((m = t.match(/:GetFlagEffectLabel\(([\w+*]+)\)~=Duel\.GetTurnCount\(\)-1$/))) {
    return { FLAG_NOT_SET_LAST_TURN: flagName(context, m[1]) };
  }

  // Where it was
  if ((m = t.match(/:IsPreviousLocation\((.+)\)$/))) return negated({ WAS_IN: flagNames(m[1], "LOCATION_") });
  if (/:IsPreviousControler\(tp\)$/.test(t)) return negated({ WAS_YOURS: true });
  if (/:GetReasonPlayer\(\)==1-tp$/.test(t)) return { BY_OPPONENT: true };

  // Other cards it needs
  const [call, ...chained] = chain(checked);
  if (call && !chained.length && call.object === "Duel" && /^IsExisting(MatchingCard|Target)$/.test(call.name)) {
    const [filter, , own, opponent, count, , ...rest] = call.args;
    // A partner card compared with the card being checked, like "an Elfnote with a different original Attribute"
    const partnerParams = rest.map((p) =>
      /^\w+:GetOriginalAttribute\(\)$/.test(text(p)) ? { ORIGINAL_ATTRIBUTE_OF: "CHECKED_CARD" } : ref(text(p)),
    );
    const need = {
      ...(call.name === "IsExistingTarget" ? { TARGETABLE: true } : {}),
      COUNT: count && text(count),
      FROM: places(own && text(own), opponent && text(opponent)),
      FILTER: filterFlags(context, filter, partnerParams),
    };
    return { [not ? "NEEDS_NONE" : "NEEDS"]: [need] };
  }

  return { RAW: [text(node)] };
}

/** Checks that a move can be made with the card, by the name the move has in a record. */
const ABLE: Record<string, string> = {
  IsCanChangePosition: "CHANGE_POSITION",
  IsCanTurnSet: "TURN_SET",
  IsCanOverlay: "ATTACH",
  IsControlerCanBeChanged: "TAKE_CONTROL",
  IsSummonable: "NORMAL_SUMMON",
  IsMSetable: "SET",
  IsDestructable: "DESTROY",
};

/** The card's numbers a range can be about, by the method that reads each. */
const NUMBERS: Record<string, string> = {
  Level: "LEVEL",
  Rank: "RANK",
  Link: "LINK",
  Attack: "ATTACK",
  Defense: "DEFENSE",
  BaseAttack: "BASE_ATTACK",
  BaseDefense: "BASE_DEFENSE",
  TextAttack: "PRINTED_ATTACK",
  TextDefense: "PRINTED_DEFENSE",
  OverlayCount: "MATERIALS",
};

/**
 * A range check on one of the card's numbers: c:IsLevel(4), c:IsAttackBelow(1500),
 * c:GetLevel()>=5... as { LEVEL: { IS: [4] } }, { ATTACK: { MAX: 1500 } }, { LEVEL: { MIN: 5 } }.
 */
function rangeOf(node: Expression, scope: Map<string, Flags>): Flags | undefined {
  const t = text(node);
  const value = (v: string) => (/^\d+$/.test(v) ? Number(v) : (scope.get(v) ?? { EXPR: v }));
  let m = t.match(/:Is(Level|Rank|Link|Attack|Defense)(Above|Below)?\(([\w,]+)\)$/);
  if (m) {
    const values = m[3].split(",").map(value);
    const range = m[2] === "Above" ? { MIN: values[0] } : m[2] === "Below" ? { MAX: values[0] } : { IS: values };
    return { [NUMBERS[m[1]]]: range };
  }
  m = t.match(/:Get(\w+)\(\)(==|~=|<|>|<=|>=)(\d+)$/);
  if (!m || !NUMBERS[m[1]]) return undefined;
  const n = Number(m[3]);
  const ranges: Record<string, Flags> = {
    "==": { IS: [n] },
    "~=": { NOT: [n] },
    "<": { MAX: n - 1 },
    ">": { MIN: n + 1 },
    "<=": { MAX: n },
    ">=": { MIN: n },
  };
  return { [NUMBERS[m[1]]]: ranges[m[2]] };
}
