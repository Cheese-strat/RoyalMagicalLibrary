import type { MoveName } from "../cardSchema.js";
import type { CardPhrase, TextFilter, TextPlaces, TextRange } from "./cards.js";
import type { TextAction, TextCard, TextCondition, TextEffect, TextPart } from "./effects.js";

/**
 * A card's text effects (effects.ts) as a card script, written the way
 * MyCard's scripts write each thing, so the reader reads it as it reads
 * theirs: ocgcore registers it, and its functions are read the same way.
 */
export function scriptOf(card: TextCard, name: string): string {
  const writer = new Writer(card);
  const setup = card.effects.flatMap((effect, i) => writer.effect(effect, i));
  return [
    `--${name} (written from its text by RML)`,
    "local s,id,o=GetID()",
    "function s.initial_effect(c)",
    ...setup.map((line) => `\t${line}`),
    "end",
    ...writer.functions,
    "",
  ].join("\n");
}

const CATEGORIES: Partial<Record<MoveName, string>> = {
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

const HINTS: Partial<Record<MoveName, string>> = {
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

/** What a card must be able to have done to it, for a move by an effect and as a cost. */
const ABLE: Partial<Record<MoveName, [effect: string, cost: string]>> = {
  TO_HAND: ["IsAbleToHand()", "IsAbleToHandAsCost()"],
  TO_GRAVE: ["IsAbleToGrave()", "IsAbleToGraveAsCost()"],
  BANISH: ["IsAbleToRemove()", "IsAbleToRemoveAsCost()"],
  TO_DECK: ["IsAbleToDeck()", "IsAbleToDeckAsCost()"],
  SPECIAL_SUMMON: ["IsCanBeSpecialSummoned(e,0,tp,false,false)", "IsCanBeSpecialSummoned(e,0,tp,false,false)"],
  DISCARD: ["IsDiscardable(REASON_EFFECT)", "IsDiscardable()"],
  TRIBUTE: ["IsReleasableByEffect()", "IsReleasable()"],
};

/** The check that card can have the move done to it, or undefined when nothing is checked. */
function able(move: MoveName, isCost: boolean, card: string, position?: string): string | undefined {
  if (move === "REVEAL") return `not ${card}:IsPublic()`;
  if (move === "SPECIAL_SUMMON" && position) return `${card}:IsCanBeSpecialSummoned(e,0,tp,false,false,POS_${position})`;
  const method = ABLE[move]?.[isCost ? 1 : 0];
  return method && `${card}:${method}`;
}

/** A move's call on cards g, for a reason (REASON_EFFECT, REASON_COST). */
function moveCall(move: MoveName, g: string, reason: string, position = "POS_FACEUP"): string {
  switch (move) {
    case "TO_HAND":
      return `Duel.SendtoHand(${g},nil,${reason})`;
    case "TO_GRAVE":
      return `Duel.SendtoGrave(${g},${reason})`;
    case "DISCARD":
      return `Duel.SendtoGrave(${g},${reason}+REASON_DISCARD)`;
    case "BANISH":
      return `Duel.Remove(${g},POS_FACEUP,${reason})`;
    case "DESTROY":
      return `Duel.Destroy(${g},${reason})`;
    case "SPECIAL_SUMMON":
      return `Duel.SpecialSummon(${g},0,tp,tp,false,false,${position})`;
    case "TRIBUTE":
      return `Duel.Release(${g},${reason})`;
    case "TO_DECK":
      return `Duel.SendtoDeck(${g},nil,SEQ_DECKSHUFFLE,${reason})`;
    case "REVEAL":
      return `Duel.ConfirmCards(1-tp,${g})`;
  }
  throw new Error(`no call for ${move}`);
}

const locations = (places: string[]) => (places.length ? places.map((p) => `LOCATION_${p}`).join("+") : "0");
const sides = (places: TextPlaces) => `${locations(places.own)},${locations(places.opponent)}`;
const hex = (n: number) => `0x${n.toString(16)}`;

/** A move's code: what comes before it, what it needs, its call, and what follows it. */
interface Emitted {
  setup: string[];
  guard?: string;
  call: string;
  /** Whether it did something, for a part that depends on it. */
  result: string;
  after: string[];
}

class Writer {
  functions: string[] = [];
  private strings = 0;

  constructor(private card: TextCard) {}

  private stringId = () => `aux.Stringid(id,${Math.min(this.strings++, 15)})`;
  private codeText = (code: number) => (code === this.card.code ? "id" : String(code));

  /** The registration of one text effect, and its functions (into functions). */
  effect(effect: TextEffect, i: number): string[] {
    const n = i + 1;
    const e = `e${n}`;
    const lines = [`local ${e}=Effect.CreateEffect(c)`];
    lines.push(`${e}:SetDescription(${this.stringId()})`);
    const categories = [...new Set(effect.parts.flatMap((p) => p.actions).map((a) => CATEGORIES[a.move]).filter(Boolean))];
    if (categories.length) lines.push(`${e}:SetCategory(${categories.map((c) => `CATEGORY_${c}`).join("+")})`);
    lines.push(`${e}:SetType(${this.typeOf(effect)})`);
    if (effect.events.length) lines.push(`${e}:SetCode(EVENT_${effect.events[0]})`);
    const properties = [...(effect.target ? ["CARD_TARGET"] : []), ...(effect.delay ? ["DELAY"] : [])];
    if (properties.length) lines.push(`${e}:SetProperty(${properties.map((p) => `EFFECT_FLAG_${p}`).join("+")})`);
    if (effect.range) lines.push(`${e}:SetRange(${locations(effect.range)})`);
    if (effect.limit) lines.push(`${e}:SetCountLimit(${this.limitOf(effect.limit)})`);
    if (effect.conditions.length) {
      lines.push(`${e}:SetCondition(s.con${n})`);
      this.functions.push(`function s.con${n}(e,tp,eg,ep,ev,re,r,rp)`, `\treturn ${this.conditions(effect.conditions, n)}`, "end");
    }
    if (effect.cost.length) {
      lines.push(`${e}:SetCost(s.cost${n})`);
      this.cost(effect, n);
    }
    if (effect.parts.length || effect.target) {
      lines.push(`${e}:SetTarget(s.tg${n})`, `${e}:SetOperation(s.op${n})`);
      this.target(effect, n);
      this.operation(effect, n);
    }
    lines.push(`c:RegisterEffect(${e})`);
    // The same effect on another event ("Normal or Special Summoned")
    effect.events.slice(1).forEach((event, k) => {
      const clone = `${e}${"bcdefg"[k]}`;
      lines.push(`local ${clone}=${e}:Clone()`, `${clone}:SetCode(EVENT_${event})`, `c:RegisterEffect(${clone})`);
    });
    return lines;
  }

  private typeOf(effect: TextEffect): string {
    const o = effect.optional ? "O" : "F";
    switch (effect.kind) {
      case "ACTIVATE":
        return "EFFECT_TYPE_ACTIVATE";
      case "IGNITION":
        return "EFFECT_TYPE_IGNITION";
      case "QUICK":
        return `EFFECT_TYPE_QUICK_${o}`;
      case "TRIGGER":
        return `EFFECT_TYPE_${effect.single ? "SINGLE" : "FIELD"}+EFFECT_TYPE_TRIGGER_${o}`;
      case "FLIP":
        return effect.optional ? "EFFECT_TYPE_SINGLE+EFFECT_TYPE_FLIP+EFFECT_TYPE_TRIGGER_O" : "EFFECT_TYPE_SINGLE+EFFECT_TYPE_FLIP";
    }
  }

  private limitOf(limit: NonNullable<TextEffect["limit"]>): string {
    if (limit.counter === undefined) return String(limit.count);
    const code = limit.counter ? `id+${limit.counter}` : "id";
    const kind = limit.oath ? "+EFFECT_COUNT_CODE_OATH" : limit.duel ? "+EFFECT_COUNT_CODE_DUEL" : "";
    return `${limit.count},${code}${kind}`;
  }

  // ---- filters ----

  private filters = 0;

  /** A filter function for these cards, for a move (its ability, as a cost or not); its name. */
  private filter(n: number, card: TextFilter, move?: MoveName, isCost = false, position?: string): string {
    const checks = this.checks(card);
    const check = move && able(move, isCost, "c", position);
    if (check) checks.push(check);
    if (!checks.length) return "aux.TRUE";
    const name = `s.filter${n}_${++this.filters}`;
    this.functions.push(`function ${name}(c,e,tp)`, `\treturn ${checks.join(" and ")}`, "end");
    return name;
  }

  private checks(f: TextFilter): string[] {
    const out: string[] = [];
    const range = (method: string, r: TextRange | undefined) => {
      if (!r) return;
      if (r.is !== undefined) out.push(`c:Is${method}(${r.is})`);
      if (r.max !== undefined) out.push(`c:Is${method}Below(${r.max})`);
      if (r.min !== undefined) out.push(`c:Is${method}Above(${r.min})`);
    };
    if (f.faceup) out.push("c:IsFaceup()");
    if (f.facedown) out.push("c:IsFacedown()");
    if (f.archetypes) out.push(`c:IsSetCard(${f.archetypes.map(hex).join(",")})`);
    if (f.names) out.push(`c:IsCode(${f.names.map(this.codeText).join(",")})`);
    if (f.mentions !== undefined) out.push(`aux.IsCodeListed(c,${this.codeText(f.mentions)})`);
    if (f.types) out.push(`c:IsType(${f.types.map((t) => `TYPE_${t}`).join("+")})`);
    if (f.allTypes) out.push(`c:IsAllTypes(${f.allTypes.map((t) => `TYPE_${t}`).join("+")})`);
    if (f.attributes) out.push(`c:IsAttribute(${f.attributes.map((a) => `ATTRIBUTE_${a}`).join("+")})`);
    if (f.races) out.push(`c:IsRace(${f.races.map((r) => `RACE_${r}`).join("+")})`);
    range("Level", f.level);
    range("Rank", f.rank);
    range("Attack", f.atk);
    range("Defense", f.def);
    if (f.except) out.push(`not c:IsCode(${f.except.map(this.codeText).join(",")})`);
    return out;
  }

  // ---- conditions ----

  private conditions(conditions: TextCondition[], n: number): string {
    return conditions.map((c) => this.condition(c, n)).join(" and ");
  }

  private condition(c: TextCondition, n: number): string {
    if ("turn" in c) return `Duel.GetTurnPlayer()==${c.turn === "OWN" ? "tp" : "1-tp"}`;
    if ("phase" in c) return `(${c.phase.map((p) => `Duel.GetCurrentPhase()==PHASE_${p}`).join(" or ")})`;
    if ("thisCard" in c) {
      const { wasIn, isIn, reasons, summonType, summonedFrom } = c.thisCard;
      const checks = [
        ...(wasIn ? [`e:GetHandler():IsPreviousLocation(${locations(wasIn)})`] : []),
        ...(isIn ? [`e:GetHandler():IsLocation(${locations(isIn)})`] : []),
        ...(summonedFrom ? [`e:GetHandler():IsSummonLocation(${locations(summonedFrom)})`] : []),
        ...(reasons ? [`e:GetHandler():IsReason(${reasons.map((r) => `REASON_${r}`).join("+")})`] : []),
        ...(summonType ? [`e:GetHandler():IsSummonType(SUMMON_TYPE_${summonType})`] : []),
      ];
      return checks.join(" and ");
    }
    if ("chainLink" in c) {
      const { negatable, byOpponent } = c.chainLink;
      const checks = [negatable === "ACTIVATION" ? "Duel.IsChainNegatable(ev)" : "Duel.IsChainDisablable(ev)"];
      if (byOpponent) checks.unshift("rp==1-tp");
      return checks.join(" and ");
    }
    const { places, atLeast, none, card } = c.cards;
    if (!card) return `Duel.GetFieldGroupCount(tp,${sides(places)})${none ? "==0" : `>=${atLeast}`}`;
    const exists = `Duel.IsExistingMatchingCard(${this.filter(n, card)},tp,${sides(places)},${atLeast},nil,e,tp)`;
    return none ? `not ${exists}` : exists;
  }

  // ---- cost ----

  private cost(effect: TextEffect, n: number) {
    const legal: string[] = [];
    const body: string[] = [];
    for (const action of effect.cost) {
      const { cards } = action;
      if (action.move === "PAY_LP") {
        legal.push(`Duel.CheckLPCost(tp,${action.amount})`);
        body.push(`Duel.PayLPCost(tp,${action.amount})`);
      } else if (action.move === "DETACH") {
        legal.push(`e:GetHandler():CheckRemoveOverlayCard(tp,${action.amount},REASON_COST)`);
        body.push(`e:GetHandler():RemoveOverlayCard(tp,${action.amount},${action.amount},REASON_COST)`);
      } else if (cards && "self" in cards) {
        const check = able(action.move, true, "e:GetHandler()");
        if (check) legal.push(check);
        body.push(moveCall(action.move, "e:GetHandler()", "REASON_COST"));
      } else if (cards && "pick" in cards) {
        const { count, filter, from } = cards.pick as CardPhrase & { count: { min: number; max: number } };
        const f = this.filter(n, filter, action.move, true);
        const self = this.excludesItself(effect, cards.pick, "BEFORE_COST") ? "e:GetHandler()" : "nil";
        legal.push(`Duel.IsExistingMatchingCard(${f},tp,${sides(from!)},${count.min},${self},e,tp)`);
        if (action.move === "DISCARD") body.push(`Duel.DiscardHand(tp,${f},${count.min},${count.max},REASON_COST+REASON_DISCARD,${self},e,tp)`);
        else {
          body.push(`Duel.Hint(HINT_SELECTMSG,tp,${HINTS[action.move] ?? "HINTMSG_SELECT"})`);
          body.push(`local g=Duel.SelectMatchingCard(tp,${f},tp,${sides(from!)},${count.min},${count.max},${self},e,tp)`);
          body.push(moveCall(action.move, "g", "REASON_COST"));
        }
      } else throw new Error(`cost ${action.move} on ${JSON.stringify(cards)}`);
    }
    this.functions.push(
      `function s.cost${n}(e,tp,eg,ep,ev,re,r,rp,chk)`,
      `\tif chk==0 then return ${legal.join(" and ") || "true"} end`,
      ...body.map((line) => `\t${line}`),
      "end",
    );
  }

  // ---- target ----

  private targetFilter = new Map<number, string>();

  private target(effect: TextEffect, n: number) {
    const lines: string[] = [];
    const legal: string[] = [];
    let params = "chk";
    if (effect.target) {
      params = "chk,chkc";
      const { from, filter, count } = effect.target as CardPhrase & { count: { min: number; max: number } };
      // What the target must be able to have done to it: the first move on it
      const action = effect.parts.flatMap((p) => p.actions).find((a) => a.cards && "target" in a.cards);
      const f = this.filter(n, filter, action?.move, false, action?.position);
      this.targetFilter.set(n, f);
      const where = [...new Set([...from!.own, ...from!.opponent])];
      const controller = !from!.opponent.length ? " and chkc:IsControler(tp)" : !from!.own.length ? " and chkc:IsControler(1-tp)" : "";
      const self = this.excludesItself(effect, effect.target, "BEFORE_COST") ? "e:GetHandler()" : "nil";
      const notSelf = this.excludesItself(effect, effect.target, "AFTER_COST") ? " and chkc~=e:GetHandler()" : "";
      lines.push(`if chkc then return chkc:IsLocation(${locations(where)})${controller} and ${f}(chkc,e,tp)${notSelf} end`);
      legal.push(`Duel.IsExistingTarget(${f},tp,${sides(from!)},${count.min},${self},e,tp)`);
    }
    // What the first part needs to be able to do, unless it is a "you can"
    if (!effect.parts[0]?.optional) for (const action of effect.parts[0]?.actions ?? []) legal.push(...this.legal(effect, action, n));
    lines.push(`if chk==0 then return ${legal.join(" and ") || "true"} end`);
    if (effect.target) {
      const { from, count } = effect.target as CardPhrase & { count: { min: number; max: number } };
      const move = effect.parts.flatMap((p) => p.actions).find((a) => a.cards && "target" in a.cards)?.move;
      lines.push(`Duel.Hint(HINT_SELECTMSG,tp,${(move && HINTS[move]) ?? "HINTMSG_TARGET"})`);
      const self = this.excludesItself(effect, effect.target, "AFTER_COST") ? "e:GetHandler()" : "nil";
      lines.push(`local g=Duel.SelectTarget(tp,${this.targetFilter.get(n)},tp,${sides(from!)},${count.min},${count.max},${self},e,tp)`);
    }
    for (const action of effect.parts.flatMap((p) => p.actions)) {
      const info = this.info(effect, action);
      if (info) lines.push(info);
    }
    this.functions.push(`function s.tg${n}(e,tp,eg,ep,ev,re,r,rp,${params})`, ...lines.map((l) => `\t${l}`), "end");
  }

  /** What a move needs to be possible, for the activation check. */
  private legal(effect: TextEffect, action: TextAction, n: number): string[] {
    const { cards } = action;
    if (action.move === "DRAW") return [`Duel.IsPlayerCanDraw(tp,${action.amount})`];
    const zone = action.move === "SPECIAL_SUMMON" ? ["Duel.GetLocationCount(tp,LOCATION_MZONE)>0"] : [];
    if (cards && "self" in cards) {
      const check = able(action.move, false, "e:GetHandler()");
      return [...zone, ...(check ? [check] : [])];
    }
    if (cards && ("pick" in cards || "all" in cards)) {
      const phrase = "pick" in cards ? cards.pick : cards.all;
      const min = phrase.count === "ALL" ? 1 : phrase.count.min;
      const f = this.pickFilter(effect, action, phrase, n);
      const self = this.excludesItself(effect, phrase, "BEFORE_COST") ? "e:GetHandler()" : "nil";
      return [...zone, `Duel.IsExistingMatchingCard(${f},tp,${sides(phrase.from!)},${min},${self},e,tp)`];
    }
    return zone;
  }

  /**
   * Whether cards an effect picks leave out the card itself: when it could
   * be one of them, and the effect is its activation (a Spell or Trap can't
   * pick itself as it activates) or also does something to it ("discard 1
   * card; Special Summon this card"). "Tribute 1 monster" by a monster's
   * effect that does nothing else to it can Tribute itself. Once a cost has
   * moved the card ("banish this card from your GY, then target ..."), it is
   * no longer there to leave out; what is checked before the cost still is.
   */
  private excludesItself(effect: TextEffect, phrase: CardPhrase, when: "BEFORE_COST" | "AFTER_COST"): boolean {
    const onItself = (actions: TextAction[]) => actions.some((a) => a.cards && "self" in a.cards);
    const costMovesIt = onItself(effect.cost);
    if (when === "AFTER_COST" && costMovesIt) return false;
    const actsOnItself = costMovesIt || onItself(effect.parts.flatMap((p) => p.actions));
    return (effect.kind === "ACTIVATE" || actsOnItself) && couldBeItself(this.card, effect, phrase);
  }

  /** Each pick's filter, one per move. */
  private picked = new Map<TextAction, string>();
  private pickFilter(effect: TextEffect, action: TextAction, phrase: CardPhrase, n: number): string {
    let f = this.picked.get(action);
    if (!f) {
      f = this.filter(n, phrase.filter, action.move, false, action.position);
      this.picked.set(action, f);
    }
    return f;
  }

  /** The move's SetOperationInfo. */
  private info(effect: TextEffect, action: TextAction): string | undefined {
    const category = CATEGORIES[action.move];
    if (!category) return undefined;
    const { cards } = action;
    if (action.move === "DRAW") return `Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,${action.amount})`;
    if (action.move === "DAMAGE") return `Duel.SetOperationInfo(0,CATEGORY_DAMAGE,nil,0,1-tp,${action.amount})`;
    if (action.move === "GAIN_LP") return `Duel.SetOperationInfo(0,CATEGORY_RECOVER,nil,0,tp,${action.amount})`;
    if (action.move === "NEGATE_ACTIVATION" || action.move === "NEGATE_EFFECT") return `Duel.SetOperationInfo(0,CATEGORY_${category},eg,1,0,0)`;
    if (!cards) return undefined;
    if ("self" in cards) return `Duel.SetOperationInfo(0,CATEGORY_${category},e:GetHandler(),1,0,0)`;
    if ("target" in cards) return `Duel.SetOperationInfo(0,CATEGORY_${category},g,#g,0,0)`;
    if ("chainLinkCard" in cards) return `Duel.SetOperationInfo(0,CATEGORY_${category},eg,1,0,0)`;
    if ("pick" in cards || "all" in cards) {
      const phrase = "pick" in cards ? cards.pick : cards.all;
      const count = phrase.count === "ALL" ? 1 : phrase.count.min;
      const own = phrase.from!.own.length ? "tp" : "1-tp";
      const where = locations([...new Set([...phrase.from!.own, ...phrase.from!.opponent])]);
      return `Duel.SetOperationInfo(0,CATEGORY_${category},nil,${count},${phrase.from!.own.length && phrase.from!.opponent.length ? "PLAYER_ALL" : own},${where})`;
    }
    return undefined;
  }

  // ---- operation ----

  private operation(effect: TextEffect, n: number) {
    const state: OperationState = { n, effect, groups: 0, last: undefined, usesSelf: false, usesTarget: false };
    const body = this.parts(effect.parts, 0, state, true);
    const head = [
      ...(state.usesSelf ? ["local c=e:GetHandler()"] : []),
      ...(state.usesTarget ? ["local tc=Duel.GetFirstTarget()"] : []),
    ];
    this.functions.push(`function s.op${n}(e,tp,eg,ep,ev,re,r,rp)`, ...[...head, ...body].map((l) => `\t${l}`), "end");
  }

  /** Part i and the parts after it: each in the block of the part it depends on. */
  private parts(parts: TextPart[], i: number, state: OperationState, first: boolean): string[] {
    const part = parts[i];
    const lines: string[] = [];
    const checks = part.conditions.map((c) => this.condition(c, state.n));
    if (part.optional) checks.push(`Duel.SelectYesNo(tp,${this.stringId()})`);
    const brk = part.link === "THEN" || part.link === "ALSO_AFTER_THAT" ? ["Duel.BreakEffect()"] : [];
    const inner = [...brk, ...this.partBody(parts, i, state, first && !checks.length)];
    if (checks.length) lines.push(`if ${checks.join(" and ")} then`, ...indent(inner), "end");
    else lines.push(...inner);
    return lines;
  }

  private partBody(parts: TextPart[], i: number, state: OperationState, first: boolean): string[] {
    const part = parts[i];
    const next = parts[i + 1];
    const action = part.actions[0];
    const em = this.emit(action, state, first);
    const lines = [...em.setup];
    const rest = next ? this.parts(parts, i + 1, state, false) : [];
    if (next && (next.link === "AND_IF_YOU_DO" || next.link === "THEN")) {
      const cond = [em.guard, em.result].filter(Boolean).join(" and ");
      lines.push(`if ${cond} then`, ...indent([...em.after, ...rest]), "end");
    } else {
      if (em.guard) lines.push(`if ${em.guard} then`, ...indent([em.call, ...em.after]), "end");
      else lines.push(em.call, ...em.after);
      lines.push(...rest);
    }
    return lines;
  }

  private emit(action: TextAction, state: OperationState, first: boolean): Emitted {
    const { cards } = action;
    const position = action.position === "FACEUP_DEFENSE" ? "POS_FACEUP_DEFENSE" : "POS_FACEUP";
    const reason = "REASON_EFFECT";
    const counted = (call: string, after: string[] = [], setup: string[] = [], guard?: string): Emitted => ({
      setup,
      guard,
      call,
      result: `${call}>0`,
      after,
    });
    switch (action.move) {
      case "DRAW":
        return counted(`Duel.Draw(tp,${action.amount},${reason})`);
      case "DAMAGE":
        return counted(`Duel.Damage(1-tp,${action.amount},${reason})`);
      case "GAIN_LP":
        return counted(`Duel.Recover(tp,${action.amount},${reason})`);
      case "NEGATE_ACTIVATION":
        return { setup: [], call: "Duel.NegateActivation(ev)", result: "Duel.NegateActivation(ev)", after: [] };
      case "NEGATE_EFFECT":
        return { setup: [], call: "Duel.NegateEffect(ev)", result: "Duel.NegateEffect(ev)", after: [] };
    }
    if (!cards) throw new Error(`no cards for ${action.move}`);
    const confirm = (g: string) => (action.move === "TO_HAND" ? [`Duel.ConfirmCards(1-tp,${g})`] : []);
    if ("self" in cards) {
      state.usesSelf = true;
      state.last = "c";
      return counted(moveCall(action.move, "c", reason, position), [], [], "c:IsRelateToEffect(e)");
    }
    if ("target" in cards) {
      // One target, or the targets still on the chain
      const several = state.effect.target!.count !== "ALL" && state.effect.target!.count.max > 1;
      if (several) {
        state.last = "tg";
        return counted(moveCall(action.move, "tg", reason, position), [], ["local tg=Duel.GetTargetsRelateToChain()"], "#tg>0");
      }
      state.usesTarget = true;
      state.last = "tc";
      return counted(moveCall(action.move, "tc", reason, position), [], [], "tc:IsRelateToEffect(e)");
    }
    if ("chainLinkCard" in cards)
      return counted(moveCall(action.move, "eg", reason, position), [], [], "re:GetHandler():IsRelateToEffect(re)");
    if ("previous" in cards) {
      if (!state.last) throw new Error("no cards before");
      return counted(moveCall(action.move, state.last, reason, position));
    }
    const phrase = "pick" in cards ? cards.pick : cards.all;
    const g = `g${++state.groups}`;
    state.last = g;
    let f = this.pickFilter(state.effect, action, phrase, state.n);
    // A card in the GY moved by an effect isn't while Necrovalley applies
    if (phrase.from!.own.includes("GRAVE") || phrase.from!.opponent.includes("GRAVE")) f = `aux.NecroValleyFilter(${f})`;
    const zone = action.move === "SPECIAL_SUMMON" ? (first ? ["if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end"] : []) : [];
    const guardZone = action.move === "SPECIAL_SUMMON" && !first ? "Duel.GetLocationCount(tp,LOCATION_MZONE)>0" : undefined;
    const self = this.excludesItself(state.effect, phrase, "AFTER_COST") ? "aux.ExceptThisCard(e)" : "nil";
    if ("all" in cards) {
      const setup = [...zone, `local ${g}=Duel.GetMatchingGroup(${f},tp,${sides(phrase.from!)},${self},e,tp)`];
      return counted(moveCall(action.move, g, reason, position), [], setup, guardZone);
    }
    const { min, max } = phrase.count as { min: number; max: number };
    const setup = [
      ...zone,
      `Duel.Hint(HINT_SELECTMSG,tp,${HINTS[action.move] ?? "HINTMSG_SELECT"})`,
      `local ${g}=Duel.SelectMatchingCard(tp,${f},tp,${sides(phrase.from!)},${min},${max},${self},e,tp)`,
    ];
    const guard = [guardZone, `#${g}>0`].filter(Boolean).join(" and ");
    return counted(moveCall(action.move, g, reason, position), confirm(g), setup, guard);
  }
}

interface OperationState {
  n: number;
  effect: TextEffect;
  groups: number;
  /** The variable holding the cards of the move before. */
  last: string | undefined;
  usesSelf: boolean;
  usesTarget: boolean;
}

const indent = (lines: string[]) => lines.map((l) => `\t${l}`);

/** Monster-only parts of a filter: a Spell or Trap has none of these. */
const MONSTER_ONLY: (keyof TextFilter)[] = ["attributes", "races", "level", "rank", "atk", "def"];

/** The places a place name covers: the field is each zone on it, and a Spell & Trap Zone includes the Field and Pendulum Zones. */
const covers = (place: string) =>
  place === "ONFIELD" ? ["MZONE", "SZONE", "FZONE", "PZONE"] : place === "SZONE" ? ["SZONE", "FZONE", "PZONE"] : [place];

/**
 * Whether the card itself could be one of the cards a phrase picks: it is
 * where they are (its zone as it is activated, or where its effect is used
 * from), and it is one of them by its types, archetypes and
 * name. Face-down, it isn't, as it is face-up when it uses its effect.
 */
function couldBeItself(card: TextCard, effect: TextEffect, phrase: CardPhrase): boolean {
  // A Spell or Trap activated from the hand is on the field by its cost, as ocgcore places it first
  const itself = effect.kind === "ACTIVATE" ? [card.types.includes("FIELD") ? "FZONE" : "SZONE"] : (effect.range ?? []);
  const there = new Set(itself);
  if (!phrase.from?.own.flatMap(covers).some((place) => there.has(place))) return false;
  const f = phrase.filter;
  // ocgcore's IsSetCard: the same archetype, or a sub-archetype of it
  const isSet = (setcode: number) => card.archetypes.some((own) => (own & 0xfff) === (setcode & 0xfff) && (own & setcode) === setcode);
  if (f.facedown) return false;
  if (f.types?.length && !f.types.some((type) => card.types.includes(type))) return false;
  if (f.allTypes?.some((type) => !card.types.includes(type))) return false;
  if (f.archetypes && !f.archetypes.some(isSet)) return false;
  if (f.names && !f.names.includes(card.code)) return false;
  if (f.except?.includes(card.code)) return false;
  return card.types.includes("MONSTER") || !MONSTER_ONLY.some((key) => f[key] !== undefined);
}
