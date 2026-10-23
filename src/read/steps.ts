import { names } from "../constants.js";
import { callsOf, splitArgs, type Call } from "../lua.js";
import {
  DUEL_ACTIONS,
  flagName,
  places,
  resetFlags,
  stringText,
  zoneNames,
  type CardContext,
  type Flags,
} from "./context.js";
import { conditions, who, type Variables } from "./conditions.js";
import { filterFlags } from "./filters.js";
import { ifBlocks, type Written } from "./ifBlocks.js";

/** A cost, target or operation function, read step by step. */
export interface Steps {
  /** The activation check (chk==0). */
  LEGAL: Flags[];
  /** Choices made on activation (aux.SelectFromOptions). */
  MODES?: Flags[];
  /** What it does, in order, each step with the conditions it sits under. */
  ACTIONS: Flags[];
  /** What it tells responders it will do (SetOperationInfo). */
  DECLARES: Flags[];
}

/** Effect types a player activates, plus continuous ones, which happen on an event rather than just applying. */
export const HAPPENS = ["ACTIVATE", "IGNITION", "TRIGGER_O", "TRIGGER_F", "QUICK_O", "QUICK_F", "FLIP", "CONTINUOUS"];

/** Calls that only show something, check something read elsewhere, or tidy up. They leave no record. */
const QUIET = new Set([
  "Hint",
  "HintSelection",
  "ShuffleHand",
  "ShuffleDeck",
  "CompleteProcedure",
  "KeepAlive",
  "DeleteGroup",
  "SetMaterial",
  "Sub",
  "Merge",
  "IsContains",
  "IsExists",
  "GetCount",
  "CheckSubGroup",
  "GetTurnCount",
  "GetCurrentChain",
  "IsRelateToChain",
  "IsRelateToEffect",
  "IsLocation",
  "IsType",
  "GetTarget",
  "GetValue",
  "GetOperation",
  "GetDescription",
  "GetControler",
  "GetChainMaterial",
  "IsHasType",
  "IsCostChecked",
  "GetFlagEffect",
  "SelectYesNo",
  "Stringid",
  "NecroValleyFilter",
  "NecroValleyNegateCheck",
  "GetFlagEffectLabel",
  "IsSummonType",
  "IsPreviousLocation",
  "IsPreviousControler",
  "GetReasonPlayer",
  "SetChainLimit",
]);

/** Reads a cost, target or operation function of the card's script. */
export function steps(context: CardContext, name: string, seen = new Set<string>()): Steps {
  const body = context.functions.get(name) ?? "";
  const effect = context.effect;
  seen.add(name);

  const vars: Variables = new Map([
    ["ev", { WHO: "CHAIN_LINK_RESPONDED_TO" }],
    ["c", { WHO: "SELF" }],
    ["eg", { WHO: "EVENT_CARDS" }],
    ["re", { WHO: "RESPONDED_EFFECT" }],
  ]);
  const out: Steps = { LEGAL: [], ACTIONS: [], DECLARES: [] };
  const blocks = ifBlocks(body);

  /** The conditions a call sits under, and whether it is inside the activation check. */
  const conditionsAt = (call: Call) => {
    const { conds, legal } = blocks.stateAt(call.at);
    const read = (written: Written) => {
      if (!written.not) return conditions(context, written.expr, vars);
      if (written.expr.startsWith("not ")) return conditions(context, written.expr.slice(4), vars);
      return [{ NOT: conditions(context, written.expr, vars) }];
    };
    return { conds: conds.flatMap(read), legal };
  };

  let then = false;
  let previous: Flags | undefined;
  const created = new Map<string, Flags>();

  /** Adds a step, unless it is inside the activation check. */
  const act = (call: Call, flags: Flags) => {
    const { conds, legal } = conditionsAt(call);
    if (legal) return;
    const record: Flags = { ...flags };
    if (then) {
      record.THEN = true;
      then = false;
    }
    if (conds.length) record.IF = conds;
    out.ACTIONS.push(record);
  };

  /** A card or group the effect picks, with a new id. */
  const pickOf = (
    kind: string,
    filter: string,
    own?: string,
    opponent?: string,
    min?: string,
    max?: string,
    params: string[] = [],
  ): Flags => ({
    ID: kind === "TARGET" ? "TARGET" : `${kind}${++effect.picks}`,
    ...(min ? { COUNT: min === max || !max ? min : `${min}-${max}` } : {}),
    FROM: places(own, opponent),
    FILTER: filterFlags(
      context,
      filter ?? "nil",
      params.map((p) => vars.get(p.trim()) ?? { EXPR: p.trim() }),
    ),
  });
  const ref = (pick: Flags): Flags => ({ REF: pick.ID });
  /** What a call works on: a variable, or "@" for the result of the call it is chained to. */
  const subject = (text?: string) =>
    text === undefined ? {} : text === "@" ? (previous ?? { WHO: "RAW" }) : who(vars, text);

  /** One Set* call on an effect the function creates. */
  function describeCreated(made: Flags, call: Call) {
    const [a0, a1] = call.args;
    const happens = (made.TYPE ?? []).some((type: string) => HAPPENS.includes(type));
    switch (call.name) {
      case "SetType":
        made.TYPE = names(a0, "EFFECT_TYPE_");
        break;
      case "SetCode":
        made.CODE = happens || /^EVENT_/.test(a0 ?? "") ? names(a0, "EVENT_") : names(a0, "EFFECT_");
        break;
      case "SetValue":
        made.VALUE = /^s\.\w+$/.test(a0 ?? "") ? filterFlags(context, a0) : a0;
        break;
      case "SetReset":
        made.RESET = resetFlags(a0 ?? "");
        break;
      case "SetTargetRange":
        made.REACHES = places(a0 === "1" ? "PLAYER" : a0, a1 === "1" ? "PLAYER" : a1);
        break;
      case "SetProperty":
        made.PROPERTY = names(a0, "EFFECT_FLAG_");
        break;
      case "SetCountLimit":
        made.COUNT_LIMIT = Number(a0);
        break;
      case "SetTarget":
        made.APPLIES_TO = /^s\.\w+$/.test(a0 ?? "") ? filterFlags(context, a0) : a0;
        break;
      case "SetOperation": {
        // An effect that happens later (at the End Phase, on an event) is read like any other operation
        const fn = a0?.match(/^s\.(\w+)$/)?.[1];
        made.OPERATION = fn && !seen.has(fn) ? steps(context, fn, seen).ACTIONS : a0;
        break;
      }
      default:
        made[call.name.slice(3).toUpperCase()] = call.args.join(",");
    }
  }

  /** A Duel call that does something: summon, send, banish, draw... */
  function duelAction(call: Call): Flags {
    const [a0, a1, a2, a3, , , a6, a7] = call.args;
    const n = call.name;
    const flags: Flags = { ACTION: DUEL_ACTIONS[n] };
    if (["Draw", "Damage", "Recover"].includes(n)) {
      flags.PLAYER = who(vars, a0 ?? "nil").WHO ?? a0;
      flags.AMOUNT = vars.get(a1)?.EXPR ?? a1;
    } else if (n === "SSet") {
      flags.SUBJECT = subject(a1);
    } else if (n === "DiscardHand") {
      flags.SUBJECT = pickOf("CHOSEN", a1, "LOCATION_HAND", "0", a2, a3);
    } else {
      flags.SUBJECT = subject(a0);
    }
    const reason = call.args.find((arg) => /REASON_/.test(arg));
    if (reason) flags.REASON = names(reason, "REASON_");
    if (n === "SpecialSummon") {
      if (a1 && a1 !== "0") flags.SUMMON_TYPE = names(a1, "SUMMON_TYPE_");
      if (a6) flags.POSITION = names(a6, "POS_");
      if (a7) flags.ZONE = zoneNames(context, a7);
    }
    if (n === "Remove" && a1) flags.POSITION = names(a1, "POS_");
    if (n === "SendtoDeck" && a2) flags.SEQUENCE = names(a2, "SEQ_");
    return flags;
  }

  // The first line is the function's own header
  for (const call of callsOf(body).filter((c) => c.at > body.indexOf("\n"))) {
    const [a0, a1, a2, a3, a4, a5, a6, a7] = call.args;
    const key = `${call.object}.${call.name}`;
    const set = (value: Flags) => {
      previous = value;
      for (const v of call.assigned ?? []) vars.set(v, value);
    };

    if (conditionsAt(call).legal && key !== "Effect.CreateEffect") {
      if (call.assigned) set({ WHO: "RAW", EXPR: call.text });
      continue;
    }

    // What cost and target pass on to the operation
    if (key === "e.GetHandler") {
      set({ WHO: "SELF" });
      continue;
    }
    if (key === "e.GetLabel") {
      set(effect.label);
      continue;
    }
    if (key === "e.GetLabelObject") {
      set({ WHO: "LABEL_OBJECT" });
      continue;
    }
    if (key === "e.SetLabel") {
      if (vars.get(a0?.trim() ?? "")?.MODE_CHOICE) continue;
      const attribute = a0?.match(/^(\w+):GetOriginalAttribute\(\)$/);
      effect.label = attribute ? { ORIGINAL_ATTRIBUTE_OF: who(vars, attribute[1]) } : { EXPR: a0 };
      act(call, { ACTION: "REMEMBER", VALUE: effect.label });
      continue;
    }
    if (key === "e.SetLabelObject") {
      act(call, { ACTION: "REMEMBER", VALUE: who(vars, a0) });
      continue;
    }
    if (key === "e.SetCategory") {
      act(call, { ACTION: "CHANGE_CATEGORY", CATEGORY: names(a0, "CATEGORY_") });
      continue;
    }
    if (key === "e.SetProperty") {
      act(call, { ACTION: "CHANGE_PROPERTY", PROPERTY: names(a0, "EFFECT_FLAG_") });
      continue;
    }
    if (key === "Duel.SetTargetPlayer") {
      effect.chainPlayer = { WHO: a0 === "tp" ? "YOU" : "OPPONENT" };
      continue;
    }
    if (key === "Duel.SetTargetParam") {
      effect.chainParam = { EXPR: a0 };
      continue;
    }
    if (key === "Duel.GetChainInfo") {
      call.args.slice(1).forEach((info, i) => {
        const v = call.assigned?.[i];
        if (!v) return;
        if (info === "CHAININFO_TARGET_PLAYER") vars.set(v, effect.chainPlayer);
        else if (info === "CHAININFO_TARGET_PARAM") vars.set(v, effect.chainParam);
        else vars.set(v, { EXPR: info });
      });
      continue;
    }
    if (key === "Duel.GetFirstTarget") {
      set(effect.target);
      continue;
    }

    // Picking cards
    if (call.name === "GetFirst") {
      set(subject(call.object));
      continue;
    }
    if (key === "Duel.SelectMatchingCard" || key === "Duel.SelectTarget") {
      const targets = key === "Duel.SelectTarget";
      const pick = pickOf(targets ? "TARGET" : "CHOSEN", a1, a3, a4, a5, a6, call.args.slice(8));
      if (targets) effect.target = ref(pick);
      act(call, { ACTION: targets ? "TARGET" : "CHOOSE", ...pick });
      set(ref(pick));
      continue;
    }
    if (key === "Duel.GetMatchingGroup") {
      const group = pickOf("ALL", a0, a2, a3, undefined, undefined, call.args.slice(5));
      act(call, { ACTION: "GROUP", ...group });
      set(ref(group));
      continue;
    }
    if (key === "Duel.GetFusionMaterial") {
      set({ WHO: "YOUR_FUSION_MATERIALS" });
      continue;
    }
    if (key === "Duel.GetReleaseGroup") {
      set({ WHO: "TRIBUTABLE" });
      continue;
    }
    if (key === "Duel.SelectFusionMaterial") {
      const pick = { ID: `MATERIALS${++effect.picks}`, FROM: who(vars, a2 ?? "nil"), FOR: who(vars, a1 ?? "nil") };
      act(call, { ACTION: "CHOOSE_FUSION_MATERIALS", ...pick });
      set(ref(pick));
      continue;
    }
    if (call.name === "Select" || call.name === "SelectUnselect" || call.name === "SelectSubGroup") {
      const [min, max] = call.name === "Select" ? [a1, a2] : call.name === "SelectUnselect" ? [a4, a5] : [a3, a4];
      const pick = {
        ID: `CHOSEN${++effect.picks}`,
        COUNT: min === max ? min : `${min}-${max}`,
        FROM: subject(call.object),
      };
      act(call, { ACTION: "CHOOSE", ...pick });
      set(ref(pick));
      continue;
    }
    if (call.name === "Filter") {
      const params = call.args.slice(2).map((p) => vars.get(p) ?? { EXPR: p });
      const group = {
        ID: `ALL${++effect.picks}`,
        FROM: subject(call.object),
        FILTER: filterFlags(context, a0 ?? "nil", params),
      };
      act(call, { ACTION: "GROUP", ...group });
      set(ref(group));
      continue;
    }
    if (call.name === "Clone" && vars.has(call.object)) {
      set(vars.get(call.object)!);
      continue;
    }

    // Declarations, modes, and checks kept in variables
    if (key === "Duel.SetOperationInfo" || key === "Duel.SetPossibleOperationInfo") {
      // SetOperationInfo(chain, category, cards, count, player, parameter).
      // A draw, damage or LP change gives its amount as the parameter.
      const amount = a3 === "0" && a5 && a5 !== "0" && !/LOCATION_/.test(a5) ? a5 : undefined;
      const { conds } = conditionsAt(call);
      out.DECLARES.push({
        ...(key.includes("Possible") ? { POSSIBLE: true } : {}),
        CATEGORY: names(a1, "CATEGORY_"),
        ...(amount ? { AMOUNT: amount } : { COUNT: /:GetCount\(\)$|^#/.test(a3 ?? "") ? "ALL" : a3 }),
        ...(a2 && a2 !== "nil" ? { CARDS: who(vars, a2) } : {}),
        ...(a5 && /LOCATION_/.test(a5) ? { FROM: names(a5, "LOCATION_") } : {}),
        ...(conds.length ? { IF: conds } : {}),
      });
      continue;
    }
    if (key === "aux.SelectFromOptions") {
      out.MODES = call.args.slice(1).map((option) => {
        const [legal, text, n] = splitArgs(option.replace(/^\{|\}$/g, ""));
        const legalCheck = vars.get(legal)?.CONDITION ?? conditions(context, legal ?? "", vars);
        return { MODE: Number(n), TEXT: stringText(context, text ?? ""), LEGAL: legalCheck };
      });
      set({ MODE_CHOICE: true });
      continue;
    }
    if (key === "Duel.IsExistingMatchingCard" || key === "Duel.IsExistingTarget") {
      // "local b1 = Duel.IsExisting...(...) and (...)": the whole expression is the variable's condition
      if (call.assigned) {
        const line = body.slice(body.lastIndexOf("\n", call.at) + 1);
        const expression = line.slice(line.indexOf("=") + 1).split(/\n\s*(?:local|if|Duel|e:|return)\b/)[0];
        set({ CONDITION: conditions(context, expression, vars) });
      }
      continue;
    }
    if (key === "Duel.BreakEffect") {
      then = true;
      continue;
    }
    if (key === "Duel.SetChainLimitTillChainEnd" || key === "Duel.SetChainLimit") {
      const fn = a0?.match(/^s\.(\w+)$/)?.[1];
      const expression = fn
        ? context.functions
            .get(fn)
            ?.match(/return\s+(.+)/)?.[1]
            .trim()
        : a0;
      const until = key.endsWith("TillChainEnd") ? "CHAIN_END" : "THIS_CHAIN_LINK";
      const only = expression === "tp==rp" ? "SAME_PLAYER_CAN_RESPOND" : { RAW: expression };
      act(call, { ACTION: "CHAIN_LIMIT", UNTIL: until, ONLY: only });
      continue;
    }

    // Flags
    if (call.name === "RegisterFlagEffect") {
      const onPlayer = call.object === "Duel";
      const [flag, reset = "", , count, label] = onPlayer ? call.args.slice(1) : call.args;
      act(call, {
        ACTION: onPlayer ? "PLAYER_FLAG" : "FLAG",
        ...(onPlayer ? { PLAYER: a0 === "tp" ? "YOU" : "OPPONENT" } : { ON: subject(call.object) }),
        FLAG: flagName(context, flag ?? ""),
        RESET: resetFlags(reset),
        ...(count && count !== "1" ? { TURNS: Number(count) } : {}),
        ...(label ? { LABEL: label === "Duel.GetTurnCount()" ? "TURN_COUNT" : label } : {}),
      });
      continue;
    }
    if (call.name === "ResetFlagEffect") {
      act(call, { ACTION: "CLEAR_FLAG", FLAG: flagName(context, a1 ?? "") });
      continue;
    }

    // Effects created while resolving: given to a card, to a player, or to happen later
    if (key === "Effect.CreateEffect") {
      for (const v of call.assigned ?? []) created.set(v, {});
      continue;
    }
    if (call.name === "Clone" && created.has(call.object)) {
      for (const v of call.assigned ?? []) created.set(v, { ...created.get(call.object) });
      continue;
    }
    if (created.has(call.object) && call.name.startsWith("Set")) {
      describeCreated(created.get(call.object)!, call);
      continue;
    }
    if (key === "Duel.RegisterEffect" && created.has(a0 ?? "")) {
      act(call, { ACTION: "PLAYER_EFFECT", PLAYER: a1 === "tp" ? "YOU" : "OPPONENT", EFFECT: created.get(a0) });
      continue;
    }
    if (call.name === "RegisterEffect" && created.has(a0 ?? "")) {
      act(call, { ACTION: "GIVE_EFFECT", TO: subject(call.object), EFFECT: created.get(a0) });
      continue;
    }
    if (key === "e.Reset") {
      act(call, { ACTION: "END_THIS_EFFECT" });
      continue;
    }

    // Actions on cards and players
    if (call.object === "Duel" && DUEL_ACTIONS[call.name]) {
      act(call, duelAction(call));
      continue;
    }

    if (QUIET.has(call.name)) continue;
    if (call.assigned) {
      set({ WHO: "RAW", EXPR: call.text });
      continue;
    }
    act(call, { ACTION: "RAW", CALL: call.text.length > 80 ? `${call.text.slice(0, 77)}...` : call.text });
  }

  // Read last, so that variables the checks use (b1, b2...) are known
  for (const check of blocks.legalChecks) {
    out.LEGAL.push(
      ...(check === null ? [{ RAW: "a check over several lines, not read" }] : conditions(context, check, vars)),
    );
  }
  return out;
}
