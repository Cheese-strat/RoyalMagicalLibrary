import { names } from "../constants.js";
import { splitArgs, stripParens } from "../lua.js";
import { codeName, flagName, merge, places, zoneNames, type CardContext, type Flags } from "./context.js";

/**
 * A filter function as a record of what a card has to be: one key per check
 * its return expression joins with "and". A filter with an "or" in it, or a
 * check no rule below knows, is kept as RAW.
 *
 * params are the values of the filter's extra parameters (after the card),
 * from the call that uses the filter.
 */
export function filterFlags(context: CardContext, filter: string, params: Flags[] = []): Flags {
  filter = filter.trim();
  if (filter === "aux.TRUE" || filter === "nil") return {};

  const and = filter.match(/^aux\.AND\((.*)\)$/);
  if (and) return merge(...splitArgs(and[1]).map((part) => filterFlags(context, part, params)));
  if (filter === "aux.NegateAnyFilter") return { FACEUP: true, NEGATABLE: true };

  const cardMethod = filter.match(/^Card\.(\w+)$/);
  if (cardMethod) {
    return termFlags(context, `c:${cardMethod[1]}(${params.map((p) => p.EXPR ?? "?").join(",")})`, new Map());
  }

  const own = filter.match(/^s\.(\w+)$/);
  const body = own ? context.functions.get(own[1]) : undefined;
  if (!body) return { RAW: [filter] };

  const declared = body
    .match(/^function\s+\S+?\(([^)]*)\)/)![1]
    .split(",")
    .map((p) => p.trim())
    .slice(1);
  const scope = new Map<string, Flags>(declared.slice(declared.length - params.length).map((p, i) => [p, params[i]]));
  const expression =
    body
      .match(/return\s+([\s\S]*?)\s*\n?end\s*$/)?.[1]
      .replace(/\s+/g, " ")
      .trim() ?? "";
  if (splitArgs(expression, " or ").length > 1) return { RAW: [expression] };

  const lines = body
    .split("\n")
    .slice(1, -1)
    .map((line) => line.trim())
    .filter(Boolean);
  const before = lines.slice(
    0,
    lines.findIndex((line) => line.startsWith("return")),
  );
  const checks = splitArgs(expression, " and ").map((term) => termFlags(context, stripParens(term), scope));
  return merge(before.length ? { RAW: before } : {}, ...checks);
}

/** One check of a filter (c:IsType(TYPE_MONSTER), not c:IsCode(id)...) as a record. */
export function termFlags(context: CardContext, term: string, scope: Map<string, Flags>): Flags {
  const { library } = context;
  const not = term.startsWith("not ");
  const t = not ? term.slice(4).trim() : term;
  const negated = (flags: Flags): Flags =>
    not ? Object.fromEntries(Object.entries(flags).map(([k, v]) => [`NOT_${k}`, v])) : flags;
  const ref = (text: string) => scope.get(text.trim()) ?? { EXPR: text.trim() };
  let m: RegExpMatchArray | null;

  // The order matters: a check written as "a or b" is read by the first rule that matches it.

  // What the card is
  if ((m = t.match(/:Is(?:All)?Types?\((.+)\)$/))) return negated({ TYPE: names(m[1], "TYPE_") });
  if ((m = t.match(/:IsFusionType\((.+)\)$/))) return negated({ FUSION_TYPE: names(m[1], "TYPE_") });
  if ((m = t.match(/:Is(Fusion)?SetCard\((0x[0-9a-fA-F]+)\)$/))) {
    return negated({ [m[1] ? "FUSION_SETCODE" : "SETCODE"]: [library.archetypeName(Number(m[2]))] });
  }
  if ((m = t.match(/:IsAttribute\((.+)\)$/))) return negated({ ATTRIBUTE: names(m[1], "ATTRIBUTE_") });
  if ((m = t.match(/:IsRace\((.+)\)$/))) return negated({ RACE: names(m[1], "RACE_") });

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
  if ((m = t.match(/:IsCanBeSpecialSummoned\(\s*\w+\s*,\s*([^,]+)/))) {
    return negated({ CAN_SPECIAL_SUMMON: m[1].trim() === "0" ? true : names(m[1], "SUMMON_TYPE_") });
  }
  if (/:IsCanBeFusionMaterial\(/.test(t)) return negated({ CAN_BE_FUSION_MATERIAL: true });
  if (/:CheckFusionMaterial\(/.test(t)) return negated({ HAS_FUSION_MATERIALS: true });
  if (/^Duel\.GetMZoneCount\(/.test(t)) return { LEAVES_FREE_MZONE: true };
  if ((m = t.match(/^Duel\.GetLocationCountFromEx\(([^)]*)\)/))) {
    const zone = splitArgs(m[1])[4];
    return { LEAVES_FREE_EXTRA_DECK_ZONE: zone ? zoneNames(context, zone) : true };
  }

  // Where it is, its name, Level and how it was summoned, and comparisons with another card
  if ((m = t.match(/:GetOriginalAttribute\(\)\s*&\s*(\w+)\s*==\s*0$/))) {
    return { ORIGINAL_ATTRIBUTE_DIFFERS_FROM: ref(m[1]) };
  }
  if ((m = t.match(/:GetSequence\(\)\s*(==|~=|<|>|<=|>=)\s*(\d)$/))) {
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
  if ((m = t.match(/:IsLocation\((.+)\)$/))) return negated({ LOCATION: names(m[1], "LOCATION_") });
  if (/:IsOnField\(\)/.test(t)) return negated({ LOCATION: ["ONFIELD"] });
  if (/:IsControler\(tp\)$/.test(t)) return negated({ YOURS: true });
  if ((m = t.match(/:IsCode\((\w+)\)$/))) return negated({ CODE: codeName(context, m[1]) });
  if ((m = t.match(/:IsLevel(Above|Below)\((\d+)\)$/)))
    return negated({ [`LEVEL_${m[1].toUpperCase()}`]: Number(m[2]) });
  if ((m = t.match(/:IsSummonType\((.+)\)$/))) return negated({ SUMMONED_BY: names(m[1], "SUMMON_TYPE_") });
  if (/:IsImmuneToEffect\(e\)/.test(t)) return negated({ IMMUNE_TO_THIS: true });
  if ((m = t.match(/^aux\.IsMaterialListCode\(\w+,\s*(\w+)\)$/)))
    return negated({ LISTS_MATERIAL: codeName(context, m[1]) });

  // Flags set on it by earlier effects
  if ((m = t.match(/:GetFlagEffect\(([\w+*]+)\)\s*==\s*0$/))) return negated({ NO_FLAG: flagName(context, m[1]) });
  if ((m = t.match(/:GetFlagEffect\(([\w+*]+)\)\s*>\s*0$/))) return negated({ FLAG: flagName(context, m[1]) });
  if ((m = t.match(/:GetFlagEffectLabel\(([\w+*]+)\)\s*~=\s*Duel\.GetTurnCount\(\)\s*-\s*1$/))) {
    return { FLAG_NOT_SET_LAST_TURN: flagName(context, m[1]) };
  }

  // Where it was
  if ((m = t.match(/:IsPreviousLocation\((.+)\)$/))) return negated({ WAS_IN: names(m[1], "LOCATION_") });
  if (/:IsPreviousControler\(tp\)$/.test(t)) return negated({ WAS_YOURS: true });
  if (/:GetReasonPlayer\(\)\s*==\s*1-tp$/.test(t)) return { BY_OPPONENT: true };

  // Other cards it needs
  if ((m = t.match(/^Duel\.IsExisting(MatchingCard|Target)\(/))) {
    const [filter, , own, opponent, count, , ...rest] = splitArgs(t.slice(t.indexOf("(") + 1, t.lastIndexOf(")")));
    // A partner card compared with the card being checked, like "an Elfnote with a different original Attribute"
    const partnerParams = rest.map((p) =>
      /^\w+:GetOriginalAttribute\(\)$/.test(p) ? { ORIGINAL_ATTRIBUTE_OF: "CHECKED_CARD" } : ref(p),
    );
    const need = {
      ...(m[1] === "Target" ? { TARGETABLE: true } : {}),
      COUNT: count,
      FROM: places(own, opponent),
      FILTER: filterFlags(context, filter ?? "nil", partnerParams),
    };
    return { [not ? "NEEDS_NONE" : "NEEDS"]: [need] };
  }

  return { RAW: [term] };
}
