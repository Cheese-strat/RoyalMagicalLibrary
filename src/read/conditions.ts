import { names } from "../constants.js";
import { chain, parametersOf, text, type Expression, type Statement } from "../lua.js";
import { codeName, DUEL_ACTIONS, effectName, flagName, merge, places, type CardContext, type Flags } from "./context.js";
import { excluded, filterFlags, termFlags } from "./filters.js";

/** What the variables of the function being read hold: this card, the target, a chosen card... */
export type Variables = Map<string, Flags>;

/** The variables an effect function is given (e,tp,eg,ep,ev,re,r,rp): what each holds. */
export const effectVariables = (): Variables =>
  new Map([
    ["tp", { WHO: "YOU" }],
    ["c", { WHO: "SELF" }],
    ["eg", { WHO: "EVENT_CARDS" }],
    ["re", { WHO: "RESPONDED_EFFECT" }],
    ["ev", { WHO: "CHAIN_LINK_RESPONDED_TO" }],
  ]);

/**
 * A check of the effect a value function is given (te in IMMUNE_EFFECT's value(e,te)): whose it is,
 * what kind, whether activated. Undefined for anything else.
 */
function checkedEffect(node: Expression, vars: Variables): Flags[] | undefined {
  const t = text(node);
  const m = t.match(/^(\w+):/);
  if (!m || vars.get(m[1])?.WHO !== "CHECKED_EFFECT") return undefined;
  const x = m[1];
  const is = (flags: Flags, holds: boolean) => (holds ? [{ CHECKED_EFFECT: flags }] : [{ NOT: [{ CHECKED_EFFECT: flags }] }]);
  let n: RegExpMatchArray | null;
  // Not this card's own: te:GetOwner()~=e:GetOwner(), te:GetHandler()~=e:GetHandler()
  if ((n = t.match(new RegExp(`^${x}:Get(?:Owner|Handler)\\(\\)(~=|==)e:Get(?:Owner|Handler)\\(\\)$`)))) return is({ OTHER_CARDS: true }, n[1] === "~=");
  // Whose: te:GetOwnerPlayer()~=e:GetHandlerPlayer() is the opponent's, te:GetOwnerPlayer()==1-tp too
  if ((n = t.match(new RegExp(`^${x}:Get(?:Owner|Handler)Player\\(\\)(~=|==)(.+)$`)))) {
    const player = who(vars, n[2]).WHO;
    if (player !== "YOU" && player !== "OPPONENT") return undefined;
    return [{ CHECKED_EFFECT: { PLAYER: (player === "YOU") === (n[1] === "==") ? "YOU" : "OPPONENT" } }];
  }
  if ((n = t.match(new RegExp(`^${x}:IsActiveType\\((.+)\\)$`)))) return is({ TYPES: names(n[1], "TYPE_") }, true);
  if (t === `${x}:IsActivated()`) return is({ ACTIVATED: true }, true);
  if ((n = t.match(new RegExp(`^${x}:IsHasType\\((.+)\\)$`)))) return is({ EFFECT_TYPES: names(n[1], "EFFECT_TYPE_") }, true);
  return undefined;
}

/** The phases of a turn in order (PHASE_DRAW 0x01 to PHASE_END 0x200). */
const PHASE_VALUES = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x100, 0x200];

/** What the reader names cards by (who), for comparing two of them. */
const CARDS = new Set(["SELF", "ATTACKER", "ATTACK_TARGET", "BATTLE_TARGET", "EQUIPPED_MONSTER", "CARD_IT_TARGETS", "RESPONDED_CARD"]);

/** Expressions that always hold the same thing, whatever the function. */
const KNOWN: Record<string, Flags> = {
  "e:GetHandler()": { WHO: "SELF" },
  // The card whose script created the effect: this card, since every effect read here is this card's
  "e:GetOwner()": { WHO: "SELF" },
  "e:GetHandlerPlayer()": { WHO: "YOU" },
  "e:GetOwnerPlayer()": { WHO: "YOU" },
  "re:GetHandler()": { WHO: "RESPONDED_CARD" },
  "Duel.GetAttacker()": { WHO: "ATTACKER" },
  "Duel.GetAttackTarget()": { WHO: "ATTACK_TARGET" },
  "Duel.GetOperatedGroup()": { WHO: "MOVED_BY_LAST_STEP" },
  "Duel.GetCurrentPhase()": { WHO: "PHASE" },
  "Duel.GetTurnPlayer()": { WHO: "TURN_PLAYER" },
  "e:GetHandler():GetBattleTarget()": { WHO: "BATTLE_TARGET" },
  "c:GetBattleTarget()": { WHO: "BATTLE_TARGET" },
  "e:GetHandler():GetEquipTarget()": { WHO: "EQUIPPED_MONSTER" },
  "c:GetEquipTarget()": { WHO: "EQUIPPED_MONSTER" },
  "e:GetHandler():GetFirstCardTarget()": { WHO: "CARD_IT_TARGETS" },
  "c:GetFirstCardTarget()": { WHO: "CARD_IT_TARGETS" },
};

/**
 * The places a call names for a player and the other: "tp,LOCATION_HAND,0"
 * is your hand, "1-tp,LOCATION_HAND,0" your opponent's.
 */
export function sides(vars: Variables, player: Expression | undefined, own?: Expression, opponent?: Expression) {
  const [mine, theirs] = [own && text(own), opponent && text(opponent)];
  return player && who(vars, player).WHO === "OPPONENT" ? places(theirs, mine) : places(mine, theirs);
}

/**
 * What a number counts, when a rule knows: free zones (Duel.GetLocationCount),
 * cards in a group (#g), cards that match (Duel.GetMatchingGroupCount),
 * cards a move moved (Duel.Destroy returns how many it destroyed), a coin's or die's result.
 */
export function countOf(context: CardContext, node: Expression, vars: Variables): Flags | undefined {
  if (node.type === "Identifier") return vars.get(node.name)?.COUNT_OF;
  if (node.type === "UnaryExpression" && node.operator === "#") return { CARDS: who(vars, node.argument) };
  const calls = chain(node);
  const [call] = calls;
  if (calls.length !== 1) return undefined;
  if (call.name === "GetCount" && call.object !== "Duel") return { CARDS: who(vars, call.object) };
  if (call.object !== "Duel") return undefined;
  const [a0, a1, a2, a3, a4, ...rest] = call.args;
  // A coin or a die gives its result, which picks what happens next, not how many cards moved
  if (call.name === "TossCoin" || call.name === "TossDice") return { RESULT: { OF: DUEL_ACTIONS[call.name] } };
  if (DUEL_ACTIONS[call.name]) return { MOVED: DUEL_ACTIONS[call.name] };
  if (call.name === "GetLocationCount") return { FREE_ZONES: sides(vars, a0, a1, undefined) };
  if (call.name === "GetMZoneCount") return { FREE_ZONES: sides(vars, a0, parseLocation("LOCATION_MZONE")) };
  if (call.name === "GetLocationCountFromEx") return { FREE_ZONES_FOR_EXTRA_DECK: sides(vars, a0, parseLocation("LOCATION_MZONE")) };
  if (call.name === "GetFieldGroupCount") return { NEEDS: { FROM: sides(vars, a0, a1, a2), FILTER: {} } };
  if (call.name === "GetMatchingGroupCount") {
    const given = rest.map((p) => vars.get(text(p)) ?? { EXPR: text(p) });
    return { NEEDS: { FROM: sides(vars, a1, a2, a3), FILTER: merge(filterFlags(context, a0, given), excluded(a4, vars)) } };
  }
  return undefined;
}

const parseLocation = (name: string): Expression => ({ type: "Identifier", name });

/** At least n of what a count counts: NEEDS takes a COUNT, at least one card of a group is ANY, a move that moved at least one SUCCEEDED. */
function atLeast(count: Flags, n: number): Flags {
  const [[key, what]] = Object.entries(count);
  if (key === "NEEDS") return { NEEDS: [{ COUNT: String(n), ...what }] };
  if (key === "CARDS" && n === 1) return { ANY: what };
  if (key === "MOVED") return n === 1 ? { SUCCEEDED: what } : { SUCCEEDED: what, AT_LEAST: n };
  return { [key]: { ...what, AT_LEAST: n } };
}

/** A count compared with a number, as "at least" and its negation: "ft<=0" is not at least 1. */
function compared(count: Flags, operator: string, n: number): Flags[] | undefined {
  const not = (flags: Flags[]): Flags => ({ NOT: flags });
  switch (operator) {
    case ">=":
      return [atLeast(count, n)];
    case ">":
      return [atLeast(count, n + 1)];
    case "<":
      return [not([atLeast(count, n)])];
    case "<=":
      return [not([atLeast(count, n + 1)])];
    case "==":
      return n === 0 ? [not([atLeast(count, 1)])] : [atLeast(count, n), not([atLeast(count, n + 1)])];
    case "~=":
      return n === 0 ? [atLeast(count, 1)] : [not([atLeast(count, n), not([atLeast(count, n + 1)])])];
  }
  // Not a comparison (a count times a number is a value): not read here
  return undefined;
}

/** A card's numbers by the method that gives them (c:GetLevel()), as CardNumber names. */
const NUMBERS: Record<string, string> = {
  GetLevel: "LEVEL",
  GetRank: "RANK",
  GetLink: "LINK",
  GetAttack: "ATTACK",
  GetDefense: "DEFENSE",
  GetBaseAttack: "BASE_ATTACK",
  GetBaseDefense: "BASE_DEFENSE",
  GetTextAttack: "PRINTED_ATTACK",
  GetTextDefense: "PRINTED_DEFENSE",
  GetOverlayCount: "MATERIALS",
};

/**
 * A value function's number, worked out as it applies: a count or one of a
 * card's numbers, times a number ("Duel.GetMatchingGroupCount(f,c:GetControler(),
 * LOCATION_EXTRA,0,nil)*500", "c:GetLevel()*200", "c:GetCounter(0x1)*-100").
 * c is the card the effect applies to; undefined when it is anything else.
 */
export function computedOf(context: CardContext, node: Expression, vars: Variables): Flags | undefined {
  const literal = (n: Expression): number | undefined =>
    n.type === "NumericLiteral"
      ? n.value
      : n.type === "UnaryExpression" && n.operator === "-" && n.argument.type === "NumericLiteral"
        ? -n.argument.value
        : undefined;
  let times = 1;
  let counted = node;
  if (node.type === "BinaryExpression" && node.operator === "*") {
    const [left, right] = [literal(node.left), literal(node.right)];
    if (right !== undefined) [times, counted] = [right, node.left];
    else if (left !== undefined) [times, counted] = [left, node.right];
    else return undefined;
  } else if (node.type === "UnaryExpression" && node.operator === "-") [times, counted] = [-1, node.argument];
  const per = perOf(context, counted, vars);
  return per && { COMPUTED: { TIMES: times, PER: per } };
}

function perOf(context: CardContext, node: Expression, vars: Variables): Flags | undefined {
  const calls = chain(node);
  const call = calls.at(-1);
  if (!call) return undefined;
  const t = text(node);
  if (call.object !== "Duel" && t.includes(":")) {
    // A number of the card it applies to (c:GetLevel()) or of this card (e:GetHandler():GetCounter(0x1))
    const holder = t.slice(0, t.lastIndexOf(":"));
    const of = holder === "c" ? { WHO: "AFFECTED_CARD" } : KNOWN[holder]?.WHO === "SELF" ? { WHO: "SELF" } : undefined;
    if (!of) return undefined;
    if (NUMBERS[call.name] && !call.args.length) return { NUMBER: NUMBERS[call.name], OF: of };
    const [counter] = call.args;
    if (call.name === "GetCounter" && call.args.length === 1 && counter.type === "NumericLiteral") return { COUNTER: counter.value, ON: of };
    return undefined;
  }
  if (calls.length !== 1 || call.object !== "Duel") return undefined;
  if (call.name !== "GetMatchingGroupCount" && call.name !== "GetFieldGroupCount") return undefined;
  const [player, own, opponent] = call.name === "GetFieldGroupCount" ? call.args : call.args.slice(1);
  // Whose places: the effect's player's, or the controller of the card it applies to (c:GetControler())
  const view = text(player) === "c:GetControler()" ? "AFFECTED_CONTROLLER" : who(vars, player).WHO === "YOU" ? "YOU" : undefined;
  if (!view) return undefined;
  const from = places(own && text(own), opponent && text(opponent));
  if (call.name === "GetFieldGroupCount") return { MATCHING: { FROM: from, FILTER: {} }, VIEW: view };
  const [filter, , , , exclude, ...rest] = call.args;
  const given = rest.map((p) => vars.get(text(p)) ?? { EXPR: text(p) });
  return { MATCHING: { FROM: from, FILTER: merge(filterFlags(context, filter, given), excluded(exclude, vars)) }, VIEW: view };
}

/** What an expression holds (a card, a group, a player), or a RAW record when the reader doesn't know. */
export function who(vars: Variables, node: Expression | string | undefined): Flags {
  if (node === undefined) return { WHO: "RAW", EXPR: "" };
  const t = typeof node === "string" ? node.trim() : text(node);
  if (vars.has(t)) return vars.get(t)!;
  if (KNOWN[t]) return KNOWN[t];
  // 1-tp: the other player
  if (typeof node !== "string" && node.type === "BinaryExpression" && node.operator === "-" && text(node.left) === "1") {
    const player = who(vars, node.right).WHO;
    if (player === "YOU" || player === "OPPONENT") return { WHO: player === "YOU" ? "OPPONENT" : "YOU" };
  }
  // opval[op], where op is a choice: the mode chosen, by the number the table gives it
  if (typeof node !== "string" && node.type === "IndexExpression" && who(vars, node.index).MODE_CHOICE)
    return { MODE_CHOICE: true };
  // g:GetFirst() as an argument is g's card; Group.FromCards(c,tc) is those cards
  const calls = typeof node === "string" ? [] : chain(node);
  const last = calls.at(-1);
  if (last && ["GetFirst", "GetNext", "Clone"].includes(last.name) && typeof node !== "string" && node.type === "CallExpression") {
    const base = node.base.type === "MemberExpression" ? who(vars, node.base.base) : undefined;
    if (base && base.WHO !== "RAW") return base;
  }
  if (calls.length === 1 && last?.object === "Group" && last.name === "FromCards")
    return { CARDS: last.args.map((arg) => who(vars, arg)) };
  return { WHO: "RAW", EXPR: t };
}

/** A condition expression as a list of condition records, all of which must hold. */
export function conditions(context: CardContext, node: Expression | undefined, vars: Variables): Flags[] {
  if (!node) return [];
  if (node.type === "LogicalExpression" && node.operator === "and") {
    const both = [...conditions(context, node.left, vars), ...conditions(context, node.right, vars)];
    // Phases both checks allow: ph>=PHASE_BATTLE_START and ph<=PHASE_BATTLE
    const phases = both.filter((c) => Object.keys(c).length === 1 && Array.isArray(c.PHASE));
    if (phases.length < 2) return both;
    const common = phases.map((c) => c.PHASE as string[]).reduce((a, b) => a.filter((phase) => b.includes(phase)));
    return [...both.filter((c) => !phases.includes(c)), { PHASE: common }];
  }
  if (node.type === "LogicalExpression" && node.operator === "or")
    return [{ ANY_OF: alternatives(node).map((part) => conditions(context, part, vars)) }];
  return condition(context, node, vars);
}

/** What a check is about: tc in tc:IsFaceup() and in tc:GetAttack()>=2000, e:GetHandler() in e:GetHandler():IsFaceup(). */
function subjectOf(node: Expression): Expression | undefined {
  if (node.type === "BinaryExpression") return subjectOf(node.left);
  if (node.type === "CallExpression" && node.base.type === "MemberExpression" && node.base.indexer === ":")
    return node.base.base;
  return undefined;
}

/** The parts of "a or b or c". */
export const alternatives = (node: Expression): Expression[] =>
  node.type === "LogicalExpression" && node.operator === "or"
    ? [...alternatives(node.left), ...alternatives(node.right)]
    : [node];

/** One term of a condition. */
function condition(context: CardContext, node: Expression, vars: Variables): Flags[] {
  if (node.type === "LogicalExpression") return conditions(context, node, vars);
  if (node.type === "BooleanLiteral") return node.value ? [] : [{ NEVER: true }];
  if (node.type === "UnaryExpression" && node.operator === "not")
    return [{ NOT: conditions(context, node.argument, vars) }];
  const term = text(node);
  const held = (name: string) => vars.get(name.trim());
  let m: RegExpMatchArray | null;

  const call = chain(node).at(-1);
  const subject = subjectOf(node);
  const holder = subject && who(vars, subject);

  // Counts: free zones, cards, cards moved by an earlier step ("if Duel.Destroy(g,REASON_EFFECT)>0")
  if (node.type === "BinaryExpression" && node.right.type === "NumericLiteral") {
    const count = countOf(context, node.left, vars);
    const compares = count && compared(count, node.operator, node.right.value);
    if (compares) return compares;
  }
  // A move given as a condition did something: NegateActivation returns whether it negated
  if (call && chain(node).length === 1 && call.object === "Duel" && DUEL_ACTIONS[call.name])
    return [{ SUCCEEDED: DUEL_ACTIONS[call.name] }];

  // What happened earlier in the same effect
  if (holder && /^IsRelateTo(Chain|Effect)$/.test(call?.name ?? "")) return [{ STILL_ON_CHAIN: holder }];
  if (/^aux\.NecroValleyFilter\(\)\(/.test(term)) return [{ NOT_NECRO_VALLEY: true }];
  if (/^aux\.NecroValleyNegateCheck\(/.test(term)) return [{ NECRO_VALLEY_STOPS_IT: true }];
  if (/^Duel\.Select(Effect)?YesNo\(/.test(term)) return [{ OPTIONAL: true }];
  // A mode: the choice itself, or the label it was kept in, compared with the mode's number
  if (node.type === "BinaryExpression" && node.operator === "==" && node.right.type === "NumericLiteral") {
    if (text(node.left) === "e:GetLabel()" || who(vars, node.left).MODE_CHOICE) return [{ MODE: node.right.value }];
  }
  if (/^e:IsCostChecked\(\)$/.test(term)) return [{ COST_CHECKED: true }];
  const checked = checkedEffect(node, vars);
  if (checked) return checked;
  // Whose turn, with the turn player held in a variable: local tp=Duel.GetTurnPlayer() ... tp==e:GetHandlerPlayer()
  if (node.type === "BinaryExpression" && (node.operator === "==" || node.operator === "~=")) {
    const [a, b] = [who(vars, node.left).WHO, who(vars, node.right).WHO];
    const player = a === "TURN_PLAYER" ? b : b === "TURN_PLAYER" ? a : undefined;
    if (player === "YOU" || player === "OPPONENT")
      return [{ TURN: (player === "YOU") === (node.operator === "==") ? "YOURS" : "OPPONENTS" }];
  }
  // Two cards the effect knows compared: Duel.GetAttacker()==e:GetHandler() (this card is attacking)
  if (node.type === "BinaryExpression" && (node.operator === "==" || node.operator === "~=")) {
    const [a, b] = [who(vars, node.left), who(vars, node.right)];
    if (CARDS.has(String(a.WHO)) && CARDS.has(String(b.WHO))) return node.operator === "==" ? [{ SAME: [a, b] }] : [{ NOT: [{ SAME: [a, b] }] }];
  }
  // Why it would happen (a value function's r): bit.band(r,REASON_BATTLE)~=0, r&REASON_EFFECT~=0
  if ((m = term.match(/^(?:bit\.band\(r,([\w+|]+)\)|r&\(?([\w+|]+)\)?)(~=|>)0$/)))
    return [{ REASONS: names(m[1] ?? m[2], "REASON_") }];
  if ((m = term.match(/^(?:bit\.band\(r,([\w+|]+)\)|r&\(?([\w+|]+)\)?)==0$/)))
    return [{ NOT: [{ REASONS: names(m[1] ?? m[2], "REASON_") }] }];
  // A Field Spell applies: Duel.IsEnvironment(code[,player])
  if (call?.object === "Duel" && call.name === "IsEnvironment" && chain(node).length === 1 && call.args.length <= 2) {
    const [code, player] = call.args;
    const whose = player === undefined || text(player) === "PLAYER_ALL" ? {} : { PLAYER: who(vars, player).WHO };
    return [{ FIELD_SPELL: { NAME: codeName(context, text(code)), ...whose } }];
  }
  if ((m = term.match(/^e:IsHasType\((.+)\)$/))) return [{ EFFECT_IS: names(m[1], "EFFECT_TYPE_") }];

  // Cards and groups held in variables
  if ((m = term.match(/^(\w+)$/))) return held(m[1])?.CONDITION ?? [{ EXISTS: who(vars, m[1]) }];
  if ((m = term.match(/^(\w+)~=nil$/))) return [{ EXISTS: who(vars, m[1]) }];
  if ((m = term.match(/^(\w+)==nil$/))) return [{ NOT: [{ EXISTS: who(vars, m[1]) }] }];
  if (call?.name === "IsContains" && chain(node).length === 1 && held(call.object))
    return [{ CONTAINS: { GROUP: who(vars, call.object), CARD: who(vars, call.args[0]) } }];
  if ((m = term.match(/^Duel\.SelectOption\(.*\)==(\d+)$/))) return [{ MODE: Number(m[1]) }];
  // A filter of the script's own, used on one card: s.cfilter(tc,tp)
  if (node.type === "CallExpression" && call?.object === "s" && chain(node).length === 1 && node.arguments[0]) {
    const card = who(vars, node.arguments[0]);
    const params = node.arguments.slice(1).map((arg) => vars.get(text(arg)) ?? { EXPR: text(arg) });
    if (card.WHO !== "RAW") {
      const filter = filterFlags(context, node.base, params);
      return [card.WHO === "SELF" ? { THIS_CARD: filter } : { IS: { ...card, ...filter } }];
    }
  }
  // aux.gfcheck: the group holds one card of each of two kinds
  if ((m = term.match(/^(\w+):CheckSubGroup\(aux\.gfcheck,2,2,Card\.IsAttribute,(\w+),(\w+)\)$/))) {
    const attributes = [...names(m[2], "ATTRIBUTE_"), ...names(m[3], "ATTRIBUTE_")];
    return [{ ONE_OF_EACH: { IN: who(vars, m[1]), ATTRIBUTE: attributes } }];
  }

  // A card the effect knows, as a check: it is there (c:GetEquipTarget(): this card is equipped to a monster)
  if (KNOWN[term] && CARDS.has(String(KNOWN[term].WHO)) && KNOWN[term].WHO !== "SELF") return [{ EXISTS: KNOWN[term] }];

  // The card itself, or another card held in a variable, checked the way a filter checks a card
  if (holder?.WHO === "SELF") return [{ THIS_CARD: termFlags(context, node, new Map()) }];
  if (holder && holder.WHO !== "RAW") {
    const check = termFlags(context, node, new Map());
    if (!check.RAW) return [{ IS: { ...holder, ...check } }];
  }

  // The duel
  if (call && /^IsExisting(MatchingCard|Target)$/.test(call.name) && call.object === "Duel")
    return [termFlags(context, node, vars)];
  if ((m = term.match(/^Duel\.GetTurnPlayer\(\)==(1-tp|tp)$|^(1-tp|tp)==Duel\.GetTurnPlayer\(\)$/)))
    return [{ TURN: (m[1] ?? m[2]) === "tp" ? "YOURS" : "OPPONENTS" }];
  if ((m = term.match(/^Duel\.GetFlagEffect\((tp|sp),([\w+*]+)\)(==|>|~=)0$/))) {
    const key = m[3] === "==" ? "NO_PLAYER_FLAG" : "PLAYER_FLAG";
    return [{ [key]: flagName(context, m[2]), ...(m[1] === "sp" ? { PLAYER: "SUMMONING_PLAYER" } : {}) }];
  }
  if ((m = term.match(/^Duel\.GetCurrentChain\(\)==(\d+)$/))) return [{ CHAIN_LINKS: Number(m[1]) }];
  // Another card's effect applies to a player (Blue-Eyes Spirit Dragon's 59822133: no summoning 2 or more at once)
  if (call?.object === "Duel" && call.name === "IsPlayerAffectedByEffect") {
    const [player, effect] = call.args.map(text);
    return [{ PLAYER_AFFECTED_BY: { PLAYER: who(vars, call.args[0]).WHO ?? player, EFFECT: effectName(context, effect) } }];
  }
  if (call?.object === "Duel" && call.name === "IsPlayerCanDraw") {
    const [player, count] = call.args;
    return [{ CAN_DRAW: { PLAYER: who(vars, player).WHO, COUNT: count ? text(count) : "1" } }];
  }
  // The player who caused it (rp) or the event's (ep), compared with a player: rp==1-tp, rp==1-e:GetHandlerPlayer()
  if (node.type === "BinaryExpression" && ["==", "~="].includes(node.operator) && node.left.type === "Identifier" && ["rp", "ep"].includes(node.left.name)) {
    const player = who(vars, node.right).WHO;
    if (player === "YOU" || player === "OPPONENT") {
      const same = node.operator === "==";
      return [{ [node.left.name === "rp" ? "REASON_PLAYER" : "EVENT_PLAYER"]: same === (player === "YOU") ? "YOU" : "OPPONENT" }];
    }
  }
  // The phase, as the duel says it now (Duel.GetCurrentPhase(), or a variable holding it)
  if (node.type === "BinaryExpression" && ["==", "~="].includes(node.operator) && who(vars, node.left).WHO === "PHASE") {
    const phases = names(text(node.right), "PHASE_");
    return node.operator === "==" ? [{ PHASE: phases }] : [{ NOT: [{ PHASE: phases }] }];
  }
  // A range of phases, by their order: ph>=PHASE_BATTLE_START and ph<=PHASE_BATTLE is the Battle Phase
  if (node.type === "BinaryExpression" && [">=", ">", "<=", "<"].includes(node.operator) && who(vars, node.left).WHO === "PHASE") {
    const { constants } = context.library;
    const bound = constants.value(text(node.right));
    const op = node.operator;
    const holds = (v: number) => (op === ">=" ? v >= bound : op === ">" ? v > bound : op === "<=" ? v <= bound : v < bound);
    const phases = PHASE_VALUES.filter(holds).map((v) => constants.name("PHASE_", v));
    if (bound && constants.named("PHASE_", bound)) return [{ PHASE: phases }];
  }
  if (term === "Duel.IsDamageCalculated()") return [{ DAMAGE_CALCULATED: true }];
  if ((m = term.match(/^Duel\.GetTurnPlayer\(\)~=(1-tp|tp)$|^(1-tp|tp)~=Duel\.GetTurnPlayer\(\)$/)))
    return [{ TURN: (m[1] ?? m[2]) === "tp" ? "OPPONENTS" : "YOURS" }];
  // What kind of effect the chain link being responded to is
  if ((m = term.match(/^re:IsActiveType\((.+)\)$/))) return [{ CHAIN_LINK_TYPE: names(m[1], "TYPE_") }];
  if ((m = term.match(/^re:IsHasType\((.+)\)$/))) return [{ CHAIN_LINK_EFFECT_IS: names(m[1], "EFFECT_TYPE_") }];
  if (node.type === "CallExpression" && call?.name === "IsExists" && who(vars, call.object).WHO === "EVENT_CARDS") {
    const [filter, count, , ...params] = node.arguments;
    if (text(count) && filter) {
      const given = params.map((p) => ({ EXPR: text(p) }));
      return [{ EVENT_CARDS_INCLUDE: { COUNT: text(count), FILTER: filterFlags(context, filter, given) } }];
    }
  }
  if ((m = term.match(/^(?:bit\.band\((\w+),(\w+)\)|(\w+)&(\w+))==(\w+)$/))) {
    const [name, mask] = m[1] ? [m[1], m[2]] : [m[3], m[4]];
    const declared = held(name)?.DECLARED_PARAM_OF;
    if (declared) return [{ DECLARED_FROM: { CATEGORY: declared, LOCATION: names(mask, "LOCATION_") } }];
    // The type of the summon checked: SPSUMMON_CONDITION's st, CANNOT_SPECIAL_SUMMON's sumtype
    if (name === "st" || name === "sumtype") return [{ SUMMON_TYPE: names(mask, "SUMMON_TYPE_") }];
  }

  // The chain link being responded to (Ash Blossom, Ghost Belle)
  if (node.type === "CallExpression" && call?.name === "IsExists" && held(call.object)?.DECLARED_CARDS_OF) {
    const [filter, count, , ...rest] = node.arguments;
    const filterText = text(filter);
    const found =
      filterText === "Card.IsLocation"
        ? { LOCATION: names(rest.map(text).join(","), "LOCATION_") }
        : filterFlags(context, filter);
    return [{ DECLARED_CARDS: { CATEGORY: held(call.object)!.DECLARED_CARDS_OF, COUNT: text(count), FILTER: found } }];
  }
  if (/^Duel\.IsChainDisablable\(ev\)$/.test(term)) return [{ CHAIN_LINK_EFFECT_NEGATABLE: true }];
  if (/^Duel\.IsChainNegatable\(ev\)$/.test(term)) return [{ CHAIN_LINK_ACTIVATION_NEGATABLE: true }];
  if ((m = term.match(/^re:IsHasCategory\((.+)\)$/))) return [{ CHAIN_LINK_CATEGORY: names(m[1], "CATEGORY_") }];

  return [{ RAW: term }];
}

/**
 * A function's body as the one expression it returns: "if X then return
 * false end" before the last return adds "not X", and "if X then return
 * true end" adds "X or". Locals the rules below know are bound in vars
 * (the operation info Ash Blossom checks, for one); every other statement
 * is kept in unread, as written.
 */
export function returnedExpression(context: CardContext, body: Statement[], vars: Variables) {
  const unread: string[] = [];
  const read = (statements: Statement[]): Expression | undefined => {
    const [first, ...rest] = statements;
    if (!first) return undefined;
    if (first.type === "ReturnStatement") return first.arguments[0];
    if (first.type === "IfStatement" && first.clauses.length === 1 && first.clauses[0].type === "IfClause") {
      const [{ condition: when, body: then }] = first.clauses;
      const returns = then.length === 1 && then[0].type === "ReturnStatement" ? then[0].arguments[0] : undefined;
      if (returns?.type === "BooleanLiteral") {
        const after = read(rest);
        if (returns.value) return after ? or(when, after) : when;
        // "if not X then return false end" adds X itself, not "not not X"
        const not: Expression =
          when.type === "UnaryExpression" && when.operator === "not" ? when.argument : { type: "UnaryExpression", operator: "not", argument: when };
        return after ? and(not, after) : not;
      }
    }
    // tp made the effect's player when it isn't given (aux.tkfcon): it is the effect's player either way
    if (
      first.type === "IfStatement" &&
      first.clauses.length === 1 &&
      first.clauses[0].type === "IfClause" &&
      /^tp==nil( and e~=nil)?$/.test(text(first.clauses[0].condition)) &&
      first.clauses[0].body.length === 1 &&
      statementText(first.clauses[0].body[0]) === "tp=e:GetHandlerPlayer()"
    )
      return read(rest);
    // A local the activation check's own walk already gave a value to (steps.ts) is known too
    if (first.type === "LocalStatement" && (bind(context, first, vars) || first.variables.every((v) => vars.has(v.name))))
      return read(rest);
    unread.push(statementText(first));
    return read(rest);
  };
  return { expression: read(body), unread };
}

const and = (left: Expression, right: Expression): Expression => ({ type: "LogicalExpression", operator: "and", left, right });
const or = (left: Expression, right: Expression): Expression => ({ type: "LogicalExpression", operator: "or", left, right });

/** A statement as one line of text, for unread records. */
function statementText(statement: Statement): string {
  switch (statement.type) {
    case "LocalStatement":
      return `local ${statement.variables.map(text).join(",")}=${statement.init.map(text).join(",")}`;
    case "AssignmentStatement":
      return `${statement.variables.map(text).join(",")}=${statement.init.map(text).join(",")}`;
    case "CallStatement":
      return text(statement.expression);
    case "ReturnStatement":
      return `return ${statement.arguments.map(text).join(",")}`;
    case "IfStatement":
      return `if ${statement.clauses[0].type === "ElseClause" ? "" : text(statement.clauses[0].condition)} then ... end`;
    default:
      return statement.type;
  }
}

/** A local of a condition function that a rule knows, bound in vars; false when no rule knows it. */
function bind(context: CardContext, statement: Statement & { type: "LocalStatement" }, vars: Variables) {
  const [init] = statement.init;
  const variables = statement.variables.map((v) => v.name);
  if (!init || statement.init.length > 1) return false;
  const t = text(init);
  let m: RegExpMatchArray | null;
  if (KNOWN[t] && variables.length === 1) {
    vars.set(variables[0], KNOWN[t]);
    return true;
  }
  if ((m = t.match(/^Duel\.GetOperationInfo\(ev,(\w+)\)$/))) {
    // What the chain link being responded to says it will do
    const [exists, cards, , , parameter] = variables;
    const category = names(m[1], "CATEGORY_");
    vars.set(exists, { CONDITION: [{ CHAIN_LINK_DECLARES: category }] });
    if (cards) vars.set(cards, { DECLARED_CARDS_OF: category, CONDITION: [] });
    if (parameter) vars.set(parameter, { DECLARED_PARAM_OF: category });
    return true;
  }
  if (variables.length === 1 && (init.type === "LogicalExpression" || /^re:IsHasCategory\(/.test(t))) {
    vars.set(variables[0], { CONDITION: conditions(context, init, vars) });
    return true;
  }
  return false;
}

/**
 * A condition or value function, read from what it returns (see
 * returnedExpression). Read as a filter (a value function's card), checks on
 * c become a filter record and any other checks go under IF.
 */
export function returned(context: CardContext, name: string, asFilter: boolean): Flags[] {
  const fn = context.functions.get(name);
  if (!fn) return [{ RAW: `s.${name}` }];
  const vars = effectVariables();
  // A value function given an effect (IMMUNE_EFFECT's value(e,te), INDESTRUCTABLE_EFFECT's value(e,re,rp)) checks that effect
  const [, second] = parametersOf(fn);
  if (asFilter && (second === "te" || second === "re" || second === "se")) vars.set(second, { WHO: "CHECKED_EFFECT" });
  const { expression, unread } = returnedExpression(context, fn.body, vars);
  const extra = unread.length ? [{ RAW_LINES: unread }] : [];
  if (!asFilter) return [...extra, ...conditions(context, expression, vars)];
  if (!expression) return extra;
  // A number worked out as it applies (an ATK gain for each card), not a check
  const computed = computedOf(context, expression, vars);
  if (computed) return [...extra, computed];
  const terms = (node: Expression): Expression[] =>
    node.type === "LogicalExpression" && node.operator === "and" ? [...terms(node.left), ...terms(node.right)] : [node];
  // A check of the card c: c:IsFaceup(), c~=e:GetHandler(), e:GetHandler():GetLinkedGroup():IsContains(c)
  const aboutCard = (node: Expression) => /^(not )?(c:|c~=|c==)/.test(text(node)) || /:IsContains\(c\)$/.test(text(node));
  if (alternatives(expression).length > 1) return [...extra, { RAW: text(expression) }];
  const checks = terms(expression).map((term) =>
    aboutCard(term) ? termFlags(context, term, new Map()) : { IF: conditions(context, term, vars) },
  );
  return [...extra, merge(...checks)];
}
