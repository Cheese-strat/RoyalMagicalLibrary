import { names } from "../constants.js";
import { splitArgs, stripParens } from "../lua.js";
import { DUEL_ACTIONS, flagName, merge, type CardContext, type Flags } from "./context.js";
import { filterFlags, termFlags } from "./filters.js";

/** What the variables of the function being read hold: this card, the target, a chosen card... */
export type Variables = Map<string, Flags>;

/** What a variable holds, or a RAW record when the reader doesn't know. */
export function who(vars: Variables, name: string): Flags {
  return vars.get(name.trim()) ?? { WHO: "RAW", EXPR: name.trim() };
}

/** An if's or a return's expression as a list of condition records (all of which must hold). */
export function conditions(context: CardContext, expression: string, vars: Variables): Flags[] {
  expression = stripParens(expression.replace(/\s+/g, " "));
  if (!expression) return [];
  const alternatives = splitArgs(expression, " or ");
  if (alternatives.length > 1) return [{ ANY_OF: alternatives.map((part) => conditions(context, part, vars)) }];
  return splitArgs(expression, " and ").flatMap((term) => condition(context, stripParens(term), vars));
}

/** One term of a condition. */
export function condition(context: CardContext, term: string, vars: Variables): Flags[] {
  if (splitArgs(term, " or ").length > 1 || splitArgs(term, " and ").length > 1) return conditions(context, term, vars);
  if (term === "true") return [];
  if (term.startsWith("not ")) return [{ NOT: condition(context, stripParens(term.slice(4)), vars) }];
  const held = (name: string) => vars.get(name.trim());
  let m: RegExpMatchArray | null;

  // What happened earlier in the same effect
  if ((m = term.match(/^Duel\.(\w+)\(.*\)\s*(~=|>)\s*0$/)) && DUEL_ACTIONS[m[1]])
    return [{ SUCCEEDED: DUEL_ACTIONS[m[1]] }];
  if ((m = term.match(/^(\w+):IsRelateTo(Chain|Effect)\(/))) return [{ STILL_ON_CHAIN: who(vars, m[1]) }];
  if (/^aux\.NecroValleyFilter\(\)\(/.test(term)) return [{ NOT_NECRO_VALLEY: true }];
  if (/^aux\.NecroValleyNegateCheck\(/.test(term)) return [{ NECRO_VALLEY_STOPS_IT: true }];
  if (/^Duel\.Select(Effect)?YesNo\(/.test(term)) return [{ OPTIONAL: true }];
  if ((m = term.match(/^(?:e:GetLabel\(\)|(\w+))\s*==\s*(\d+)$/)) && (!m[1] || held(m[1])?.MODE_CHOICE)) {
    return [{ MODE: Number(m[2]) }];
  }
  if (/^e:IsCostChecked\(\)$/.test(term)) return [{ COST_CHECKED: true }];
  if ((m = term.match(/^e:IsHasType\((.+)\)$/))) return [{ EFFECT_IS: names(m[1], "EFFECT_TYPE_") }];

  // Cards and groups held in variables
  if ((m = term.match(/^(?:#(\w+)|(\w+):GetCount\(\))\s*>\s*0$/))) return [{ ANY: who(vars, m[1] ?? m[2]) }];
  if ((m = term.match(/^(\w+)$/))) return held(m[1])?.CONDITION ?? [{ EXISTS: who(vars, m[1]) }];
  if ((m = term.match(/^(\w+)\s*~=\s*nil$/))) return [{ EXISTS: who(vars, m[1]) }];
  if ((m = term.match(/^(\w+):IsType\((.+)\)$/)) && held(m[1])) {
    return [{ IS: { ...who(vars, m[1]), TYPE: names(m[2], "TYPE_") } }];
  }
  if ((m = term.match(/^(\w+):IsLocation\((.+)\)$/)) && held(m[1])) {
    return [{ IS: { ...who(vars, m[1]), LOCATION: names(m[2], "LOCATION_") } }];
  }
  // aux.gfcheck: the group holds one card of each of two kinds
  if ((m = term.match(/^(\w+):CheckSubGroup\(aux\.gfcheck,\s*2,\s*2,\s*Card\.IsAttribute,\s*(\w+),\s*(\w+)\)$/))) {
    const attributes = [...names(m[2], "ATTRIBUTE_"), ...names(m[3], "ATTRIBUTE_")];
    return [{ ONE_OF_EACH: { IN: who(vars, m[1]), ATTRIBUTE: attributes } }];
  }

  // The card itself
  if (
    (m = term.match(/^e:GetHandler\(\):|^(\w+):/)) &&
    (m[0].startsWith("e:GetHandler") || held(m[1] ?? "")?.WHO === "SELF")
  ) {
    return [{ THIS_CARD: termFlags(context, term.replace(/^e:GetHandler\(\)|^\w+/, "c"), new Map()) }];
  }

  // The duel
  if (/^Duel\.IsExisting(MatchingCard|Target)\(/.test(term)) return [termFlags(context, term, vars)];
  if ((m = term.match(/^Duel\.GetTurnPlayer\(\)\s*==\s*(1-tp|tp)$/)))
    return [{ TURN: m[1] === "tp" ? "YOURS" : "OPPONENTS" }];
  if ((m = term.match(/^Duel\.GetFlagEffect\((tp|sp),\s*([\w+*]+)\)\s*(==|>|~=)\s*0$/))) {
    const key = m[3] === "==" ? "NO_PLAYER_FLAG" : "PLAYER_FLAG";
    return [{ [key]: flagName(context, m[2]), ...(m[1] === "sp" ? { PLAYER: "SUMMONING_PLAYER" } : {}) }];
  }
  if ((m = term.match(/^Duel\.GetCurrentChain\(\)\s*==\s*(\d+)$/))) return [{ CHAIN_LINKS: Number(m[1]) }];
  if ((m = term.match(/^eg:IsExists\(([\w.]+),\s*(\d+),\s*nil(.*)\)$/))) {
    const params = splitArgs(m[3].replace(/^,/, "")).map((p) => ({ EXPR: p }));
    return [{ EVENT_CARDS_INCLUDE: { COUNT: m[2], FILTER: filterFlags(context, m[1], params) } }];
  }
  if ((m = term.match(/^(?:bit\.band\((\w+),\s*(\w+)\)|(\w+)\s*&\s*(\w+))\s*==\s*(\w+)$/))) {
    const [name, mask] = m[1] ? [m[1], m[2]] : [m[3], m[4]];
    const declared = held(name)?.DECLARED_PARAM_OF;
    if (declared) return [{ DECLARED_FROM: { CATEGORY: declared, LOCATION: names(mask, "LOCATION_") } }];
    if (name === "st") return [{ SUMMON_TYPE: names(mask, "SUMMON_TYPE_") }];
  }

  // The chain link being responded to (Ash Blossom, Ghost Belle)
  if ((m = term.match(/^(\w+):IsExists\(([\w.]+),\s*(\d+),\s*nil(.*)\)$/)) && held(m[1])?.DECLARED_CARDS_OF) {
    const filter =
      m[2] === "Card.IsLocation"
        ? { LOCATION: names(m[4].replace(/^,/, ""), "LOCATION_") }
        : filterFlags(context, m[2]);
    return [{ DECLARED_CARDS: { CATEGORY: held(m[1])!.DECLARED_CARDS_OF, COUNT: m[3], FILTER: filter } }];
  }
  if (/^Duel\.IsChainDisablable\(ev\)$/.test(term)) return [{ CHAIN_LINK_EFFECT_NEGATABLE: true }];
  if (/^Duel\.IsChainNegatable\(ev\)$/.test(term)) return [{ CHAIN_LINK_ACTIVATION_NEGATABLE: true }];
  if ((m = term.match(/^re:IsHasCategory\((.+)\)$/))) return [{ CHAIN_LINK_CATEGORY: names(m[1], "CATEGORY_") }];

  return [{ RAW: term }];
}

/**
 * A condition or value function, read from its last return expression. The
 * lines before it are read where a rule knows them (the operation info Ash
 * Blossom checks, for one) and kept as RAW_LINES otherwise.
 *
 * Read as a filter (a value function's card), checks on c become a filter
 * record and any other checks go under IF.
 */
export function returned(context: CardContext, name: string, asFilter: boolean): Flags[] {
  const body = context.functions.get(name) ?? "";
  const vars: Variables = new Map([
    ["c", { WHO: "SELF" }],
    ["eg", { WHO: "EVENT_CARDS" }],
    ["re", { WHO: "RESPONDED_EFFECT" }],
  ]);
  const lines = body
    .split("\n")
    .slice(1, -1)
    .map((line) => line.trim())
    .filter(Boolean);
  const last = lines.map((line) => line.startsWith("return")).lastIndexOf(true);
  const expression = lines
    .slice(last)
    .join(" ")
    .replace(/^return\s+/, "")
    .replace(/\s+/g, " ")
    .trim();

  const unread: string[] = [];
  let m: RegExpMatchArray | null;
  for (const line of lines.slice(0, last)) {
    if ((m = line.match(/^local\s+(\w+)\s*=\s*e:GetHandler\(\)$/))) {
      vars.set(m[1], { WHO: "SELF" });
    } else if ((m = line.match(/^local\s+([\w,]+)\s*=\s*Duel\.GetOperationInfo\(ev,\s*(\w+)\)$/))) {
      // What the chain link being responded to says it will do
      const [exists, cards, , , parameter] = m[1].split(",");
      const category = names(m[2], "CATEGORY_");
      vars.set(exists, { CONDITION: [{ CHAIN_LINK_DECLARES: category }] });
      if (cards) vars.set(cards, { DECLARED_CARDS_OF: category, CONDITION: [] });
      if (parameter) vars.set(parameter, { DECLARED_PARAM_OF: category });
    } else if ((m = line.match(/^local\s+(\w+)\s*=\s*(re:IsHasCategory\(.+\))$/))) {
      vars.set(m[1], { CONDITION: condition(context, m[2], vars) });
    } else {
      unread.push(line);
    }
  }
  const extra = unread.length ? [{ RAW_LINES: unread }] : [];
  if (!asFilter) return [...extra, ...conditions(context, expression, vars)];

  if (splitArgs(expression, " or ").length > 1) return [...extra, { RAW: expression }];
  const terms = splitArgs(expression, " and ").map((term) => stripParens(term));
  const checks = terms.map((term) =>
    /^(not\s+)?c:/.test(term) ? termFlags(context, term, new Map()) : { IF: condition(context, term, vars) },
  );
  return [...extra, merge(...checks)];
}
