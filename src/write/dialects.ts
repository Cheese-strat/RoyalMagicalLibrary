import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Constants } from "../constants.js";

/**
 * The engines RML writes scripts for, and what each says differently. The
 * writer (script.ts) writes YGOPro's names and calls; a dialect has the
 * engine's for the few calls that differ, and puts each constant in the
 * engine's own name for its value (EDOPro's RACE_WINGEDBEAST for YGOPro's
 * RACE_WINDBEAST), and each of Card's methods in the engine's name for it
 * (EDOPro's IsGeminiStatus for YGOPro's IsDualState).
 *
 * YGO Omega runs YGOPro's scripts: its constant.lua and utility.lua are
 * YGOPro's, its core is ocgcore built into the game, and it adds its own
 * functions in proc_omega.lua.
 */
export type Engine = "ygopro" | "edopro" | "omega";
export const ENGINES: Engine[] = ["ygopro", "edopro", "omega"];

export interface Dialect {
  engine: Engine;
  /** The script's first line: the card's table and number (YGOPro's GetID also gives o, a second number for count limits). */
  header: string;
  /** All of these types (types: their sum, as written). */
  allTypes(card: string, types: string): string;
  /** Its text mentions this card. */
  mentions(card: string, code: string): string;
  /** The effect's targets still on the chain. */
  targets: string;
  /** The script with every constant and Card method in the engine's name for it, or the constants the engine has no name for. */
  finish(script: string): { script: string; unknown: string[] };
  /** Summon procedures, from their materials' filters (a function's name, or nil for any monster). */
  procedures: Procedures;
  /** A material filter's parameters, and its checks as the summon makes them (written as the card's own checks); nonTuner: a Synchro Summon's non-Tuners. */
  material(method: MaterialMethod, checks: string, nonTuner?: boolean): { params: string; body: string };
  /** The engine's aux function for one of YGOPro's (aux.fuslimit), or undefined when it has none. */
  aux(name: string): string | undefined;
  /** A flag's id as the script writes it (Move.flag: THIS_CARD+1 is id+1), or undefined when the engine has no such flag. */
  flag(name: string): string | undefined;
  /** A merged event of these events (EVENT_ names): what registers it, and the event code an effect waits for; undefined when the engine has no way. */
  merged(events: string[], perCard: boolean, variable: string): { lines: string[]; code: string } | undefined;
}

/** YGOPro's merged events: utility.lua's aux.RegisterMergedDelayedEvent raises EVENT_CUSTOM+code; the _ToSingleCard one gives its own code. */
function ygoproMerged(events: string[], perCard: boolean, variable: string) {
  if (perCard) {
    const which = events.length > 1 ? `{${events.join(",")}}` : events[0];
    return { lines: [`local ${variable}=aux.RegisterMergedDelayedEvent_ToSingleCard(c,id,${which})`], code: variable };
  }
  return events.length === 1 ? { lines: [`aux.RegisterMergedDelayedEvent(c,id,${events[0]})`], code: "EVENT_CUSTOM+id" } : undefined;
}

/** A flag of the card's own, or another card's number: the same in every engine. */
const ownFlag = (name: string) => (name === "THIS_CARD" ? "id" : name.replace(/^THIS_CARD\+/, "id+"));

/** The flags scripts share, as EDOPro's scripts write them: aux.chainreg's is 1, and EDOPro keeps the others some other way. */
const EDOPRO_FLAGS: Record<string, string | undefined> = { FLAG_ID_CHAINING: "1" };

export type MaterialMethod = "SYNCHRO" | "XYZ" | "LINK" | "FUSION";

export interface Procedures {
  /** 1 Tuner and min to max non-Tuners (nonTuner: their filter from material(..., true), or nil for any). */
  synchro(tuner: string, nonTuner: string, min: number, max: number): string;
  xyz(f: string, level: number, min: number, max: number): string;
  link(f: string, min: number, max: number): string;
  /** count copies of one card. */
  fusionCodeRep(code: string, count: number, sub: boolean, insf: boolean): string;
  /** One each of 2 to 4 cards. */
  fusionCodes(codes: string[], sub: boolean, insf: boolean): string;
  /** One of each, by name or filter. */
  fusionMix(sub: boolean, insf: boolean, materials: string[]): string;
}

/** YGOPro's material checks in place of a card's own (procedure.lua's filters use these): a Link Material's type is its Link type, which effects can change. */
const MATERIAL_CHECKS: Record<MaterialMethod, Record<string, string>> = {
  LINK: { IsType: "IsLinkType", IsRace: "IsLinkRace", IsAttribute: "IsLinkAttribute", IsSetCard: "IsLinkSetCard", IsCode: "IsLinkCode" },
  FUSION: { IsAttribute: "IsFusionAttribute", IsSetCard: "IsFusionSetCard", IsCode: "IsFusionCode" },
  SYNCHRO: { IsType: "IsSynchroType" },
  XYZ: { IsType: "IsXyzType" },
};

/** EDOPro's names for Card's methods where they are named otherwise. */
const EDOPRO_METHODS: Record<string, string> = { IsDualState: "IsGeminiStatus", IsLinkState: "IsLinked" };

/** EDOPro's aux functions where they are named otherwise, or undefined where it has none. */
const EDOPRO_AUX: Record<string, string | undefined> = { "aux.linklimit": "aux.lnklimit", "aux.tgsval": undefined };

/** Where each engine's constant.lua is (data/, from their submodules). */
export const CONSTANTS: Record<Engine, string> = {
  ygopro: "data/ygopro-scripts/constant.lua",
  omega: "data/ygopro-scripts/constant.lua",
  edopro: "data/edopro-scripts/constant.lua",
};

/** Constant names by the prefix a value is looked up under, longest first. */
const PREFIXES = [
  "EFFECT_COUNT_CODE_",
  "EFFECT_TYPE_",
  "EFFECT_FLAG2_",
  "EFFECT_FLAG_",
  "SUMMON_TYPE_",
  "CHAININFO_",
  "ATTRIBUTE_",
  "LOCATION_",
  "CATEGORY_",
  "HINTMSG_",
  "STATUS_",
  "EFFECT_",
  "TIMING_",
  "REASON_",
  "PLAYER_",
  "EVENT_",
  "PHASE_",
  "HINT_",
  "RACE_",
  "TYPE_",
  "POS_",
  "SEQ_",
];
const CONSTANT = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;

export function dialect(engine: Engine, root = "."): Dialect {
  const text = readFileSync(join(root, CONSTANTS[engine]), "utf8");
  const own = new Constants(text);
  // Some are given as an expression of others (EDOPro's LOCATION_ONFIELD = LOCATION_MZONE|LOCATION_SZONE)
  const defined = new Set([...text.matchAll(/^([A-Z_0-9]+)\s*=/gm)].map(([, name]) => name));
  const ygopro = engine === "edopro" ? new Constants(readFileSync(join(root, CONSTANTS.ygopro), "utf8")) : own;
  const finish = (script: string) => {
    const unknown = new Set<string>();
    const methods = engine === "edopro" ? script.replace(/:(\w+)\(/g, (all, name: string) => (EDOPRO_METHODS[name] ? `:${EDOPRO_METHODS[name]}(` : all)) : script;
    const renamed = methods.replace(CONSTANT, (name) => {
      if (defined.has(name)) return name;
      // The engine's name for the same value under the same prefix
      const prefix = PREFIXES.find((p) => name.startsWith(p));
      const value = ygopro.has(name) ? ygopro.value(name) : undefined;
      const same = prefix && value !== undefined ? own.named(prefix, value) : undefined;
      if (same) return same;
      unknown.add(name);
      return name;
    });
    return { script: renamed, unknown: [...unknown] };
  };
  if (engine === "edopro") {
    return {
      engine,
      header: "local s,id=GetID()",
      allTypes: (card, types) => `${card}:GetType()&(${types})==${types}`,
      mentions: (card, code) => `${card}:ListsCode(${code})`,
      targets: "Duel.GetTargetCards(e)",
      finish,
      aux: (name) => (name in EDOPRO_AUX ? EDOPRO_AUX[name] : name),
      flag: (name) => (name.startsWith("FLAG_ID_") ? EDOPRO_FLAGS[name] : ownFlag(name)),
      // EDOPro's core merges delayed events itself, in its own way: not written until it is checked to be the same
      merged: () => undefined,
      // proc_synchro.lua, proc_xyz.lua, proc_link.lua, proc_fusion.lua
      procedures: {
        // A non-Tuners' filter checks IsNotTuner itself, as Synchro.NonTuner's does, with the summon's arguments
        synchro: (tuner, nonTuner, min, max) =>
          `Synchro.AddProcedure(c,${tuner},1,1,${nonTuner === "nil" ? "Synchro.NonTuner(nil)" : nonTuner},${min},${max})`,
        xyz: (f, level, min, max) => `Xyz.AddProcedure(c,${f},${level},${min}${max === min ? "" : `,nil,nil,${max}`})`,
        link: (f, min, max) => `Link.AddProcedure(c,${f},${min}${max === 99 ? "" : `,${max}`})`,
        fusionCodeRep: (code, count, sub, insf) => `Fusion.AddProcMixN(c,${sub},${insf},${code},${count})`,
        fusionCodes: (codes, sub, insf) => `Fusion.AddProcMix(c,${sub},${insf},${codes.join(",")})`,
        fusionMix: (sub, insf, materials) => `Fusion.AddProcMix(c,${sub},${insf},${materials.join(",")})`,
      },
      // A material is checked with the summon's card, type and player: c:IsRace(RACE_DRAGON,sc,st,tp), c:IsSummonCode(sc,st,tp,code)
      material: (_method, checks, nonTuner) => ({
        params: "c,sc,st,tp",
        body: (nonTuner ? "c:IsNotTuner(sc,tp) and " : "") +
          checks
            .replace(/:(IsType|IsRace|IsAttribute|IsSetCard)\(([^()]*)\)/g, ":$1($2,sc,st,tp)")
            .replace(/:IsCode\(([^()]*)\)/g, ":IsSummonCode(sc,st,tp,$1)"),
      }),
    };
  }
  return {
    engine,
    header: "local s,id,o=GetID()",
    allTypes: (card, types) => `${card}:IsAllTypes(${types})`,
    mentions: (card, code) => `aux.IsCodeListed(${card},${code})`,
    targets: "Duel.GetTargetsRelateToChain()",
    finish,
    aux: (name) => name,
    flag: ownFlag,
    merged: ygoproMerged,
    // procedure.lua
    procedures: {
      synchro: (tuner, nonTuner, min, max) => `aux.AddSynchroProcedure(c,${tuner},aux.NonTuner(${nonTuner}),${min}${max === 99 ? "" : `,${max}`})`,
      xyz: (f, level, min, max) => `aux.AddXyzProcedure(c,${f},${level},${min}${max === min ? "" : `,nil,nil,${max}`})`,
      link: (f, min, max) => `aux.AddLinkProcedure(c,${f},${min}${max === 99 ? "" : `,${max}`})`,
      fusionCodeRep: (code, count, sub, insf) => `aux.AddFusionProcCodeRep(c,${code},${count},${sub},${insf})`,
      fusionCodes: (codes, sub, insf) => `aux.AddFusionProcCode${codes.length}(c,${codes.join(",")},${sub},${insf})`,
      fusionMix: (sub, insf, materials) => `aux.AddFusionProcMix(c,${sub},${insf},${materials.join(",")})`,
    },
    material: (method, checks) => ({
      params: "c",
      body: checks.replace(/:(Is(?:Type|Race|Attribute|SetCard|Code))\(/g, (all, name: string) =>
        MATERIAL_CHECKS[method][name] ? `:${MATERIAL_CHECKS[method][name]}(` : all,
      ),
    }),
  };
}
