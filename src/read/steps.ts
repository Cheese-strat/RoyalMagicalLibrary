import { names } from "../constants.js";
import { chain, text, type Call, type Expression, type Statement } from "../lua.js";
import {
  CARD_ACTIONS,
  codeName,
  DUEL_ACTIONS,
  flagName,
  places,
  resetFlags,
  stringText,
  zoneNames,
  type CardContext,
  type Flags,
} from "./context.js";
import { conditions, countOf, effectVariables, returnedExpression, sides, who, type Variables } from "./conditions.js";
import { filterFlags } from "./filters.js";
import type { PartLabels } from "./parts.js";

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
  /** A resolution's parts and their labels, each step naming its PART (read/parts.ts). */
  PARTS?: PartLabels[];
}

/** Effect types a player activates, plus continuous ones, which happen on an event rather than just applying. */
export const HAPPENS = ["ACTIVATE", "IGNITION", "TRIGGER_O", "TRIGGER_F", "QUICK_O", "QUICK_F", "FLIP", "CONTINUOUS"];

/** Effect types a player activates. */
export const ACTIVATED = HAPPENS.filter((type) => type !== "CONTINUOUS");

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
  "SpecialSummonComplete",
  // The engine's own bookkeeping
  "DisableShuffleCheck",
  "AdjustAll",
  "AdjustInstantly",
  "ShuffleExtra",
]);

/** Calls that pick cards or make a choice: inside an if's condition they are still steps. */
const PICKS = new Set(["SelectMatchingCard", "SelectTarget", "Select", "SelectUnselect", "SelectSubGroup", "SelectOption"]);

/** Reads a cost, target or operation function of the card's script. */
export function steps(context: CardContext, name: string, seen = new Set<string>()): Steps {
  const fn = context.functions.get(name);
  const effect = context.effect;
  seen.add(name);

  const vars: Variables = effectVariables();
  const out: Steps = { LEGAL: [], ACTIONS: [], DECLARES: [] };
  /** The activation checks' bodies, read last so that variables they use (b1, b2...) are known. */
  const legalChecks: Statement[][] = [];

  let then = false;
  let previous: Flags | undefined;
  const created = new Map<string, Flags>();

  /** Adds a step. */
  const act = (conds: Flags[], flags: Flags) => {
    const record: Flags = { ...flags };
    if (then) {
      record.THEN = true;
      then = false;
    }
    if (conds.length) record.IF = conds;
    out.ACTIONS.push(record);
  };

  /** The conditions under which X doesn't hold: "not X" is X's own. */
  const negation = (node: Expression): Flags[] => {
    if (node.type === "UnaryExpression" && node.operator === "not") return conditions(context, node.argument, vars);
    const read = conditions(context, node, vars);
    return read.length === 1 && read[0].NOT ? read[0].NOT : [{ NOT: read }];
  };

  /** A card or group the effect picks, with a new id. */
  const pickOf = (
    kind: string,
    filter: Expression | undefined,
    player?: Expression,
    own?: Expression,
    opponent?: Expression,
    min?: Expression,
    max?: Expression,
    params: Expression[] = [],
  ): Flags => ({
    ID: kind === "TARGET" ? "TARGET" : `${kind}${++effect.picks}`,
    ...(min ? { COUNT: countText(min, max) } : {}),
    FROM: sides(vars, player, own, opponent),
    FILTER: filterFlags(
      context,
      filter,
      params.map((p) => vars.get(text(p)) ?? { EXPR: text(p) }),
    ),
  });
  /** The options of a choice made on resolution (Duel.SelectOption), numbered as the choice returns them, from offset. */
  const addModes = (options: Expression[], offset: number) => {
    out.MODES ??= [];
    options.forEach((option, i) => {
      if (!out.MODES!.some((mode) => mode.MODE === i + offset))
        out.MODES!.push({ MODE: i + offset, TEXT: stringText(context, text(option)), LEGAL: [] });
    });
  };
  /** Who picks, when it isn't you ("your opponent chooses"). */
  const pickedBy = (player?: Expression): Flags => (player && who(vars, player).WHO === "OPPONENT" ? { BY: "OPPONENT" } : {});
  const ref = (pick: Flags): Flags => ({ REF: pick.ID });
  /** What a call works on: a variable, or "@" for the result of the call it is chained to. */
  const subject = (node?: Expression) => (node === undefined ? {} : who(vars, node));

  /** What earlier steps of the effect left for later ones: its target, its label. */
  const remember = () => {
    vars.set("Duel.GetFirstTarget()", effect.target);
    vars.set("Duel.GetTargetsRelateToChain()", effect.target);
    vars.set("e:GetLabel()", effect.label);
    vars.set("e:GetLabelObject()", { WHO: "LABEL_OBJECT" });
  };
  remember();

  /** One Set* call on an effect the function creates. */
  function describeCreated(made: Flags, call: Call) {
    const [a0, a1] = call.args.map(text);
    const happens = (made.TYPE ?? []).some((type: string) => HAPPENS.includes(type));
    switch (call.name) {
      case "SetType":
        made.TYPE = names(a0, "EFFECT_TYPE_");
        break;
      case "SetCode":
        made.CODE = happens || /^EVENT_/.test(a0 ?? "") ? names(a0, "EVENT_") : names(a0, "EFFECT_");
        break;
      case "SetValue":
        made.VALUE = /^s\.\w+$/.test(a0 ?? "") ? filterFlags(context, call.args[0]) : a0;
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
        made.APPLIES_TO = /^s\.\w+$/.test(a0 ?? "") ? filterFlags(context, call.args[0]) : a0;
        break;
      case "SetOperation": {
        // An effect that happens later (at the End Phase, on an event) is read like any other operation
        const fn = a0?.match(/^s\.(\w+)$/)?.[1];
        made.OPERATION = fn && !seen.has(fn) ? steps(context, fn, seen).ACTIONS : a0;
        break;
      }
      default:
        made[call.name.slice(3).toUpperCase()] = call.args.map(text).join(",");
    }
  }

  /** A Duel call that does something: summon, send, banish, draw... */
  function duelAction(call: Call): Flags {
    const [a0, a1, a2, a3, , , a6, a7] = call.args;
    const n = call.name;
    const flags: Flags = { ACTION: DUEL_ACTIONS[n] };
    const [, , , , a4] = call.args;
    if (["Draw", "Damage", "Recover", "PayLPCost", "SetLP", "TossCoin", "TossDice"].includes(n)) {
      flags.PLAYER = who(vars, a0 ?? "nil").WHO ?? text(a0);
      flags.AMOUNT = (a1 && vars.get(text(a1))?.EXPR) ?? (a1 && text(a1));
    } else if (["SSet", "ConfirmCards", "Summon", "MSet", "SpecialSummonRule", "SynchroSummon", "XyzSummon", "LinkSummon"].includes(n)) {
      // The player first, then the card
      flags.SUBJECT = subject(a1);
      if (n === "ConfirmCards") flags.SHOWN_TO = who(vars, a0).WHO;
    } else if (n === "ConfirmDecktop" || n === "DiscardDeck") {
      flags.SUBJECT = { WHO: "DECK_TOP", PLAYER: who(vars, a0).WHO, COUNT: textOf(a1) };
    } else if (n === "Equip") {
      flags.SUBJECT = subject(a1);
      flags.TO = subject(a2);
    } else if (n === "Overlay") {
      flags.SUBJECT = subject(a1);
      flags.TO = subject(a0);
    } else if (n === "RemoveOverlayCard" || n === "RemoveCounter") {
      // Duel.RemoveOverlayCard(tp,s,o,min,max,reason): from any of your (s) or their (o) Xyz Monsters
      flags.SUBJECT = { FROM: sides(vars, a0, a1, a2) };
      if (n === "RemoveOverlayCard") flags.COUNT = countText(a3, a4);
      else Object.assign(flags, { COUNTER: textOf(a3), COUNT: textOf(a4) });
    } else if (n === "DiscardHand") {
      flags.SUBJECT = pickOf("CHOSEN", a1, a0, HAND, undefined, a2, a3);
    } else {
      flags.SUBJECT = subject(a0);
    }
    const reason = call.args.map(text).find((arg) => /REASON_/.test(arg));
    if (reason) flags.REASON = names(reason, "REASON_");
    // Sending a card from the hand to the GY with REASON_DISCARD is a discard to the engine, as Duel.DiscardHand is
    if (n === "SendtoGrave" && flags.REASON?.includes("DISCARD")) flags.ACTION = "DISCARD";
    if (n === "SpecialSummon" || n === "SpecialSummonStep") {
      if (a1 && text(a1) !== "0") flags.SUMMON_TYPE = names(text(a1), "SUMMON_TYPE_");
      if (a6) flags.POSITION = names(text(a6), "POS_");
      if (a7) flags.ZONE = zoneNames(context, text(a7));
    }
    if (n === "Remove" && a1) flags.POSITION = names(text(a1), "POS_");
    if (n === "SendtoDeck" && a2) flags.SEQUENCE = names(text(a2), "SEQ_");
    return flags;
  }

  /**
   * One call: what it does (a step), what it gives a variable, or nothing.
   * assigned are the variables its result goes to.
   */
  function handle(call: Call, assigned: string[] | undefined, conds: Flags[], legal: boolean) {
    const [a0, a1, a2, a3, a4, a5, a6] = call.args;
    const key = `${call.object}.${call.name}`;
    const set = (value: Flags) => {
      previous = value;
      for (const v of assigned ?? []) vars.set(v, value);
    };
    const on = () => (call.object === "@" ? (previous ?? { WHO: "RAW" }) : who(vars, call.object));

    // Inside the activation check nothing happens: only what variables hold matters
    if (legal) {
      if (!assigned) return;
      const count = countOf(context, parseCall(call), vars);
      if (count) return set({ COUNT_OF: count });
      if (isCheck(parseCall(call))) return set({ CONDITION: conditions(context, parseCall(call), vars) });
      const known = who(vars, call.text);
      return set(known.WHO === "RAW" ? { WHO: "RAW", EXPR: call.text } : known);
    }

    // Chain Material and cards like it: another card's effect that lets a Fusion Summon use other
    // materials, which the standard Fusion Summon code offers as a second way (Duel.GetChainMaterial)
    if (key === "Duel.GetChainMaterial") return set({ WHO: "CHAIN_MATERIAL" });
    if (vars.get(call.object)?.WHO === "CHAIN_MATERIAL" && /^Get(Target|Value|Operation|Description)$/.test(call.name))
      return set({ WHO: "CHAIN_MATERIAL", PART: call.name.slice(3).toUpperCase() });
    const held = call.object === "" ? vars.get(call.name) : undefined;
    if (held?.WHO === "CHAIN_MATERIAL" && held.PART === "TARGET") return set({ WHO: "CHAIN_MATERIAL_MATERIALS" });
    if (held?.WHO === "CHAIN_MATERIAL" && held.PART === "OPERATION") {
      return act(conds, { ACTION: "FUSION_SUMMON", SUBJECT: subject(a3), MATERIALS: subject(a4), BY: "CHAIN_MATERIAL" });
    }

    // A function of the script's own called as a step (Triple Tactics Talent's s.draw(e,tp,eg,ep,ev,re,r,rp)): its steps, here
    if (call.object === "s" && !assigned && context.functions.has(call.name) && !seen.has(call.name)) {
      const inner = steps(context, call.name, new Set(seen));
      for (const { IF = [], ...action } of inner.ACTIONS) act([...conds, ...IF], action);
      out.DECLARES.push(...inner.DECLARES);
      if (inner.MODES) out.MODES = [...(out.MODES ?? []), ...inner.MODES];
      return;
    }

    // What cost and target pass on to the operation
    if (key === "e.GetHandler") return set({ WHO: "SELF" });
    if (key === "e.GetLabel") return set(effect.label);
    if (key === "e.GetLabelObject") return set({ WHO: "LABEL_OBJECT" });
    if (key === "e.SetLabel") {
      // The mode chosen on activation, kept for the operation, which compares the label with each mode's number
      if (a0 && who(vars, a0).MODE_CHOICE) {
        effect.label = { MODE_CHOICE: true };
        return remember();
      }
      const attribute = a0 && text(a0).match(/^(\w+):GetOriginalAttribute\(\)$/);
      effect.label = attribute ? { ORIGINAL_ATTRIBUTE_OF: who(vars, attribute[1]) } : { EXPR: a0 && text(a0) };
      remember();
      return act(conds, { ACTION: "REMEMBER", VALUE: effect.label });
    }
    if (key === "e.SetLabelObject") return act(conds, { ACTION: "REMEMBER", VALUE: who(vars, a0) });
    if (key === "e.SetCategory") return act(conds, { ACTION: "CHANGE_CATEGORY", CATEGORY: names(a0 && text(a0), "CATEGORY_") });
    if (key === "e.SetProperty")
      return act(conds, { ACTION: "CHANGE_PROPERTY", PROPERTY: names(a0 && text(a0), "EFFECT_FLAG_") });
    if (key === "Duel.SetTargetPlayer") {
      effect.chainPlayer = { WHO: who(vars, a0).WHO === "YOU" ? "YOU" : "OPPONENT" };
      return;
    }
    if (key === "Duel.SetTargetParam") {
      effect.chainParam = { EXPR: a0 && text(a0) };
      return;
    }
    if (key === "Duel.GetChainInfo") {
      // Duel.GetChainInfo(0, ...): what the chain link keeps, a value for each info asked
      const kept: Record<string, Flags> = {
        CHAININFO_TARGET_PLAYER: effect.chainPlayer,
        CHAININFO_TARGET_PARAM: effect.chainParam,
        CHAININFO_TARGET_CARDS: effect.target,
      };
      const values = call.args.slice(1).map((info) => kept[text(info)] ?? { EXPR: text(info) });
      values.forEach((value, i) => assigned?.[i] && vars.set(assigned[i], value));
      previous = values[0];
      return;
    }
    if (key === "Duel.GetFirstTarget") return set(effect.target);

    // Picking cards
    if (call.name === "GetFirst") return set(on());
    if (key === "Duel.SelectMatchingCard" || key === "Duel.SelectTarget") {
      const targets = key === "Duel.SelectTarget";
      const pick = { ...pickOf(targets ? "TARGET" : "CHOSEN", a1, a2, a3, a4, a5, a6, call.args.slice(8)), ...pickedBy(a0) };
      if (targets) {
        effect.target = ref(pick);
        remember();
      }
      act(conds, { ACTION: targets ? "TARGET" : "CHOOSE", ...pick });
      return set(ref(pick));
    }
    if (key === "Duel.GetMatchingGroup") {
      const group = pickOf("ALL", a0, a1, a2, a3, undefined, undefined, call.args.slice(5));
      act(conds, { ACTION: "GROUP", ...group });
      return set(ref(group));
    }
    if (key === "Duel.GetFieldGroup") {
      const group = pickOf("ALL", undefined, a0, a1, a2);
      act(conds, { ACTION: "GROUP", ...group });
      return set(ref(group));
    }
    if (key === "Duel.GetFirstMatchingCard") {
      const group = { ...pickOf("ALL", a0, a1, a2, a3, undefined, undefined, call.args.slice(5)), COUNT: "1" };
      act(conds, { ACTION: "GROUP", ...group });
      return set(ref(group));
    }
    if (key === "Duel.SelectReleaseGroup" || key === "Duel.SelectReleaseGroupEx" || key === "Duel.SelectTribute") {
      // SelectTribute(tp,c,min,max): Tributes for c; SelectReleaseGroup(tp,f,min,max,ex,...): Tributes that pass f
      const tribute = key === "Duel.SelectTribute";
      const pick = {
        ID: `CHOSEN${++effect.picks}`,
        COUNT: countText(a2, a3),
        FROM: { WHO: "TRIBUTABLE" },
        FILTER: tribute ? {} : filterFlags(context, a1, call.args.slice(5).map((p) => vars.get(text(p)) ?? { EXPR: text(p) })),
      };
      act(conds, { ACTION: "CHOOSE", ...pick });
      return set(ref(pick));
    }
    if (key === "Duel.SetTargetCard") {
      effect.target = who(vars, a0);
      remember();
      return act(conds, { ACTION: "TARGET", SUBJECT: effect.target });
    }
    if (key === "Duel.CreateToken") return set({ WHO: "TOKEN", NAME: a1 && codeName(context, text(a1).replace(/^id\b.*/, "id")) });
    if (key === "Duel.GetDecktopGroup") return set({ WHO: "DECK_TOP", PLAYER: who(vars, a0).WHO, COUNT: textOf(a1) });
    if (key === "Duel.GetFieldCard")
      return set({ WHO: "CARD_IN_ZONE", FROM: sides(vars, a0, a1), ZONE: textOf(a2) });
    if (key === "Group.CreateGroup") return set({ CARDS: [] });
    if (key === "Group.FromCards") return set({ CARDS: call.args.map((arg) => who(vars, arg)) });
    if (call.name === "AddCard" || call.name === "Merge" || call.name === "RemoveCard" || call.name === "Sub") {
      // A group made bigger or smaller, by a card or another group
      const group = vars.get(call.object);
      const key = call.name === "AddCard" || call.name === "Merge" ? "PLUS" : "MINUS";
      if (group) vars.set(call.object, { ...group, [key]: [...(group[key] ?? []), who(vars, a0)] });
      return;
    }
    if (call.name === "GetOverlayGroup") return set({ WHO: "MATERIALS_OF", OF: on() });
    if (call.name === "GetMaxGroup" || call.name === "GetMinGroup") {
      const by = textOf(a0)?.replace(/^Card\.Get/, "").toUpperCase();
      return set({ WHO: call.name === "GetMaxGroup" ? "HIGHEST" : "LOWEST", BY: by, OF: on() });
    }
    if (call.name === "RandomSelect" || call.name === "FilterSelect" || call.name === "CancelableSelect") {
      // RandomSelect(p,n); FilterSelect(p,f,min,max,ex,...); CancelableSelect(p,min,max,ex)
      const pick: Flags = { ID: `CHOSEN${++effect.picks}`, FROM: on(), ...pickedBy(a0) };
      if (call.name === "RandomSelect") Object.assign(pick, { COUNT: textOf(a1), RANDOM: true });
      if (call.name === "FilterSelect") {
        const params = call.args.slice(5).map((p) => vars.get(text(p)) ?? { EXPR: text(p) });
        Object.assign(pick, { COUNT: countText(a2, a3), FILTER: filterFlags(context, a1, params) });
      }
      if (call.name === "CancelableSelect") Object.assign(pick, { COUNT: countText(a1, a2), CANCELABLE: true });
      act(conds, { ACTION: "CHOOSE", ...pick });
      return set(ref(pick));
    }
    if (key === "Duel.GetFusionMaterial") return set({ WHO: "YOUR_FUSION_MATERIALS" });
    if (key === "Duel.GetReleaseGroup") return set({ WHO: "TRIBUTABLE" });
    if (key === "Duel.SelectFusionMaterial") {
      const pick = { ID: `MATERIALS${++effect.picks}`, FROM: who(vars, a2 ?? "nil"), FOR: who(vars, a1 ?? "nil") };
      act(conds, { ACTION: "CHOOSE_FUSION_MATERIALS", ...pick });
      return set(ref(pick));
    }
    if (call.name === "Select" || call.name === "SelectUnselect" || call.name === "SelectSubGroup") {
      const [min, max] = call.name === "Select" ? [a1, a2] : call.name === "SelectUnselect" ? [a4, a5] : [a3, a4];
      const pick = { ID: `CHOSEN${++effect.picks}`, COUNT: countText(min, max), FROM: on(), ...pickedBy(a0) };
      act(conds, { ACTION: "CHOOSE", ...pick });
      return set(ref(pick));
    }
    if (call.name === "Filter") {
      const params = call.args.slice(2).map((p) => vars.get(text(p)) ?? { EXPR: text(p) });
      const group = { ID: `ALL${++effect.picks}`, FROM: on(), FILTER: filterFlags(context, a0, params) };
      act(conds, { ACTION: "GROUP", ...group });
      return set(ref(group));
    }
    if (call.name === "Clone" && vars.has(call.object)) return set(vars.get(call.object)!);

    // Declarations, modes, and checks kept in variables
    if (key === "Duel.SetOperationInfo" || key === "Duel.SetPossibleOperationInfo") {
      // SetOperationInfo(chain, category, cards, count, player, parameter).
      // A draw, damage or LP change gives its amount as the parameter.
      const [, category, cards, count, , parameter] = call.args.map((arg) => arg && text(arg));
      const amount = count === "0" && parameter && parameter !== "0" && !/LOCATION_/.test(parameter) ? parameter : undefined;
      out.DECLARES.push({
        ...(key.includes("Possible") ? { POSSIBLE: true } : {}),
        CATEGORY: names(category, "CATEGORY_"),
        ...(amount ? { AMOUNT: amount } : { COUNT: /:GetCount\(\)$|^#/.test(count ?? "") ? "ALL" : count }),
        ...(cards && cards !== "nil" ? { CARDS: who(vars, a2) } : {}),
        ...(parameter && /LOCATION_/.test(parameter) ? { FROM: names(parameter, "LOCATION_") } : {}),
        ...(conds.length ? { IF: conds } : {}),
      });
      return;
    }
    if (key === "Duel.SelectOption") {
      addModes(call.args.slice(1), 0);
      return set({ MODE_CHOICE: true });
    }
    if (key === "aux.SelectFromOptions") {
      out.MODES = call.args.slice(1).map((option, i) => {
        // {legal, text, number}; without a number an option is numbered by its place, from 1 (utility.lua)
        const [legal, description, n] =
          option.type === "TableConstructorExpression" ? option.fields.map((field) => field.value) : [];
        const legalCheck = (legal && vars.get(text(legal))?.CONDITION) ?? conditions(context, legal, vars);
        return { MODE: n ? Number(text(n)) : i + 1, TEXT: stringText(context, description ? text(description) : ""), LEGAL: legalCheck };
      });
      return set({ MODE_CHOICE: true });
    }
    if (key === "Duel.IsExistingMatchingCard" || key === "Duel.IsExistingTarget") {
      if (assigned) set({ CONDITION: conditions(context, parseCall(call), vars) });
      return;
    }
    if (key === "Duel.BreakEffect") {
      then = true;
      return;
    }
    if (key === "Duel.SetChainLimitTillChainEnd" || key === "Duel.SetChainLimit") {
      const fn = a0 && text(a0).match(/^s\.(\w+)$/)?.[1];
      const limit = fn && context.functions.get(fn);
      const expression = limit ? returnedExpression(context, limit.body, new Map()).expression : a0;
      const until = key.endsWith("TillChainEnd") ? "CHAIN_END" : "THIS_CHAIN_LINK";
      const t = expression ? text(expression) : "";
      const only = t === "tp==rp" ? "SAME_PLAYER_CAN_RESPOND" : { RAW: t };
      return act(conds, { ACTION: "CHAIN_LIMIT", UNTIL: until, ONLY: only });
    }

    // Flags
    if (call.name === "RegisterFlagEffect") {
      const onPlayer = call.object === "Duel";
      const [flag, reset, , count, label] = (onPlayer ? call.args.slice(1) : call.args).map(text);
      return act(conds, {
        ACTION: onPlayer ? "PLAYER_FLAG" : "FLAG",
        ...(onPlayer ? { PLAYER: who(vars, a0).WHO === "YOU" ? "YOU" : "OPPONENT" } : { ON: on() }),
        FLAG: flagName(context, flag ?? ""),
        RESET: resetFlags(reset ?? ""),
        ...(count && count !== "1" ? { TURNS: Number(count) } : {}),
        ...(label ? { LABEL: label === "Duel.GetTurnCount()" ? "TURN_COUNT" : label } : {}),
      });
    }
    if (call.name === "ResetFlagEffect") return act(conds, { ACTION: "CLEAR_FLAG", FLAG: flagName(context, a1 ? text(a1) : "") });

    // Effects created while resolving: given to a card, to a player, or to happen later
    if (key === "Effect.CreateEffect") {
      for (const v of assigned ?? []) created.set(v, {});
      return;
    }
    if (call.name === "Clone" && created.has(call.object)) {
      for (const v of assigned ?? []) created.set(v, { ...created.get(call.object) });
      return;
    }
    if (created.has(call.object) && call.name.startsWith("Set")) return describeCreated(created.get(call.object)!, call);
    if (key === "Duel.RegisterEffect" && a0 && created.has(text(a0))) {
      const player = who(vars, a1).WHO === "YOU" ? "YOU" : "OPPONENT";
      return act(conds, { ACTION: "PLAYER_EFFECT", PLAYER: player, EFFECT: created.get(text(a0)) });
    }
    if (call.name === "RegisterEffect" && a0 && created.has(text(a0))) {
      return act(conds, { ACTION: "GIVE_EFFECT", TO: on(), EFFECT: created.get(text(a0)) });
    }
    if (key === "e.Reset") return act(conds, { ACTION: "END_THIS_EFFECT" });

    // Actions on cards and players. What a move returns is how many cards it moved
    if (call.object === "Duel" && DUEL_ACTIONS[call.name]) {
      act(conds, duelAction(call));
      return assigned && set({ COUNT_OF: countOf(context, parseCall(call), vars) });
    }
    if (call.object !== "Duel" && CARD_ACTIONS[call.name]) {
      const [, min, max] = call.args;
      const flags: Flags = { ACTION: CARD_ACTIONS[call.name], SUBJECT: on() };
      // c:RemoveOverlayCard(tp,min,max,reason); c:AddCounter(counter,n); c:RemoveCounter(tp,counter,n,reason); c:SetCardTarget(tc)
      if (call.name === "RemoveOverlayCard") flags.COUNT = countText(min, max);
      if (call.name === "AddCounter") Object.assign(flags, { COUNTER: textOf(a0), COUNT: textOf(a1) ?? "1" });
      if (call.name === "RemoveCounter") Object.assign(flags, { COUNTER: textOf(a1), COUNT: textOf(a2) });
      if (call.name === "SetCardTarget") flags.TARGET = who(vars, a0);
      const reason = call.args.map(text).find((arg) => /REASON_/.test(arg));
      if (reason) flags.REASON = names(reason, "REASON_");
      return act(conds, flags);
    }
    // A Spell or Trap that stays on the field once it has resolved
    if (call.name === "CancelToGrave") return textOf(a0) === "false" ? undefined : act(conds, { ACTION: "STAYS_ON_FIELD", SUBJECT: on() });

    const count = assigned && countOf(context, parseCall(call), vars);
    if (count) return set({ COUNT_OF: count });
    const known = who(vars, parseCall(call));
    if (known.WHO !== "RAW") return set(known);
    if (QUIET.has(call.name)) return;
    if (assigned) return set({ WHO: "RAW", EXPR: call.text });
    act(conds, { ACTION: "RAW", CALL: call.text.length > 80 ? `${call.text.slice(0, 77)}...` : call.text });
  }

  /** An expression's calls in order, the last one's result going to assigned. */
  function evaluate(node: Expression, assigned: string[] | undefined, conds: Flags[], legal: boolean) {
    const calls = chain(node);
    calls.forEach((call, i) => handle(call, i === calls.length - 1 ? assigned : undefined, conds, legal));
  }

  /**
   * What a variable is given: a call's result, another variable, a
   * condition, a number. "a and b or c", Lua's way of writing "b if a,
   * else c", gives the variable b, got only when a holds.
   */
  function assign(name: string, init: Expression, conds: Flags[], legal: boolean) {
    if (chain(init).length) return evaluate(init, [name], conds, legal);
    // op=Duel.SelectOption(tp,aux.Stringid(id,1))+1: the options numbered from 1
    const selected = init.type === "BinaryExpression" && init.operator === "+" ? chain(init.left).at(-1) : undefined;
    if (selected?.object === "Duel" && selected.name === "SelectOption" && init.type === "BinaryExpression") {
      addModes(selected.args.slice(1), Number(text(init.right)) || 0);
      return vars.set(name, { MODE_CHOICE: true });
    }
    const choice =
      init.type === "LogicalExpression" && init.operator === "or" && init.left.type === "LogicalExpression"
        ? init.left
        : undefined;
    if (choice?.operator === "and" && !isCheck(choice.right))
      return assign(name, choice.right, [...conds, ...conditions(context, choice.left, vars)], legal);
    const count = countOf(context, init, vars);
    if (count) vars.set(name, { COUNT_OF: count });
    else if (isCheck(init)) vars.set(name, { CONDITION: conditions(context, init, vars) });
    else if (init.type === "Identifier") vars.set(name, vars.get(init.name) ?? { WHO: "RAW", EXPR: init.name });
    else vars.set(name, who(vars, init).WHO === "RAW" ? { EXPR: text(init) } : who(vars, init));
  }

  /** Whether an expression is true or false rather than a value: a comparison, a "not", an Is... or Check... call. */
  function isCheck(node: Expression): boolean {
    if (node.type === "LogicalExpression") return isCheck(node.left) || isCheck(node.right);
    if (node.type === "UnaryExpression") return node.operator === "not";
    if (node.type === "BinaryExpression") return ["==", "~=", "<", ">", "<=", ">="].includes(node.operator);
    if (node.type === "BooleanLiteral") return true;
    if (node.type === "Identifier") return Boolean(vars.get(node.name)?.CONDITION);
    const last = chain(node).at(-1);
    return Boolean(last && /^(Is|Check|Can)|YesNo$/.test(last.name));
  }

  /**
   * The calls in an if's condition that do something (a move, a pick), in
   * the order they run: "if Duel.Destroy(g,REASON_EFFECT)>0 then" destroys.
   * A call after "a and" runs only if a holds, one after "a or" only if it doesn't.
   */
  function conditionCalls(node: Expression, conds: Flags[], legal: boolean) {
    if (node.type === "LogicalExpression") {
      conditionCalls(node.left, conds, legal);
      const left = node.operator === "and" ? conditions(context, node.left, vars) : negation(node.left);
      return conditionCalls(node.right, [...conds, ...left], legal);
    }
    if (node.type === "UnaryExpression") return conditionCalls(node.argument, conds, legal);
    if (node.type === "BinaryExpression") {
      conditionCalls(node.left, conds, legal);
      return conditionCalls(node.right, conds, legal);
    }
    const calls = chain(node);
    if (calls.some((call) => (call.object === "Duel" && DUEL_ACTIONS[call.name]) || PICKS.has(call.name)))
      evaluate(node, undefined, conds, legal);
  }

  /** An if statement; what it returns is the conditions it leaves for the statements after it. */
  function ifStatement(statement: Statement & { type: "IfStatement" }, conds: Flags[], legal: boolean): Flags[] {
    const earlier: Flags[] = [];
    let everyBranchReturns = true;
    for (const clause of statement.clauses) {
      if (clause.type === "ElseClause") {
        everyBranchReturns = walk(clause.body, [...conds, ...earlier], legal) && everyBranchReturns;
        continue;
      }
      const when = clause.condition;
      // "if chk==0 then ... end" is the activation check; "if chkc then ... end" checks a new target (not read)
      if (/^chk==0$/.test(text(when))) {
        legalChecks.push(clause.body);
        walk(clause.body, conds, true);
        return [];
      }
      if (text(when) === "chkc") return [];
      conditionCalls(when, [...conds, ...earlier], legal);
      const ends = walk(clause.body, [...conds, ...earlier, ...conditions(context, when, vars)], legal);
      everyBranchReturns = ends && everyBranchReturns;
      earlier.push(...negation(when));
    }
    // A guard, "if X then return end": what follows happens only when X doesn't hold
    const [first] = statement.clauses;
    return statement.clauses.length === 1 && everyBranchReturns && first.type !== "ElseClause"
      ? negation(first.condition)
      : [];
  }

  /** A block of statements, in order. True when it ends by returning. */
  function walk(statements: Statement[], conds: Flags[], legal: boolean): boolean {
    const guards: Flags[] = [];
    for (const statement of statements) {
      const here = [...conds, ...guards];
      switch (statement.type) {
        case "CallStatement":
          evaluate(statement.expression, undefined, here, legal);
          break;
        case "LocalStatement":
        case "AssignmentStatement": {
          const variables = statement.variables.map(text);
          const [init] = statement.init;
          if (statement.init.length === 1 && chain(init).length) evaluate(init, variables, here, legal);
          else statement.init.forEach((value, i) => variables[i] && assign(variables[i], value, here, legal));
          break;
        }
        case "IfStatement":
          guards.push(...ifStatement(statement, here, legal));
          break;
        case "ForGenericStatement": {
          // for tc in aux.Next(g): each card of g, read as g
          const [iterator] = statement.iterators;
          const over = iterator && chain(iterator).at(-1);
          const group = over && ["Next", "ipairs", "pairs"].includes(over.name) ? who(vars, over.args[0]) : who(vars, iterator);
          for (const variable of statement.variables) vars.set(variable.name, group);
          walk(statement.body, here, legal);
          break;
        }
        case "WhileStatement":
          // while tc do ... tc=g:GetNext() end: each card of the group, read as the group
          walk(statement.body, statement.condition.type === "Identifier" ? here : [...here, ...conditions(context, statement.condition, vars)], legal);
          break;
        case "ForNumericStatement":
        case "RepeatStatement":
        case "DoStatement":
          walk(statement.body, here, legal);
          break;
        case "ReturnStatement":
          for (const value of statement.arguments) conditionCalls(value, here, legal);
          return true;
      }
    }
    return false;
  }

  if (fn) walk(fn.body, [], false);

  for (const body of legalChecks) {
    const { expression, unread } = returnedExpression(context, body, vars);
    if (unread.length) out.LEGAL.push({ RAW: unread.join("; ") });
    out.LEGAL.push(...conditions(context, expression, vars));
  }
  return out;
}

/** A call as an expression again, for reading it as a condition. */
const parseCall = (call: Call): Expression => call.node;

const textOf = (node?: Expression) => node && text(node);

/** How many cards a pick takes: "1", or "1-3" for 1 to 3. */
const countText = (min?: Expression, max?: Expression) =>
  !max || textOf(min) === textOf(max) ? textOf(min) : `${textOf(min)}-${textOf(max)}`;

const HAND: Expression = { type: "Identifier", name: "LOCATION_HAND" };
