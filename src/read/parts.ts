import type { Level, Link, ModeChosenOn, Pick } from "../cardSchema.js";
import type { Flags } from "./context.js";

/**
 * The parts of an effect, and the labels for what modifies each: where in
 * the effect it happens (its level), how it hangs on the parts before it
 * (its link), "you can", its mode, and how each move's cards are picked.
 *
 * Every label is read from the script, never the card text: ocgcore runs
 * the script, so a script that differs from its card's text is played as
 * the script says (`npm run text-check` lists where they may differ).
 *
 * - LEVEL is for what an effect does, by what stops it, strongest first.
 *   COST is paid to activate, and only "cannot activate" stops it: the cost
 *   function's moves, and any move made as a cost wherever the script makes
 *   it (REASON_COST, Duel.PayLPCost: some scripts pay in the target
 *   function, so the cost can depend on the targets). ON_ACTIVATION is done
 *   on activation without being paid (a reveal, an effect set up for a
 *   later turn), stopped the same way. EFFECT happens on resolution, also
 *   stopped by negating the effect. SUBSEQUENT happens only if an earlier
 *   part did, so it is also stopped by that part failing.
 * - What is decided on activation isn't a level: it does nothing itself, it
 *   picks the branch the effect goes down. Which cards is PICK=TARGETED,
 *   which mode is MODE with CHOSEN_ON=ACTIVATION; the checks that allow the
 *   activation (LEGAL, CONDITION) are requirements, kept apart.
 * - LINK is how a part of the resolution follows the parts before it, by two
 *   facts of the script: whether a Duel.BreakEffect() comes between them
 *   (sequential: what the first part did has happened, and can trigger
 *   effects, before the second starts), and whether the part sits under a
 *   check on what an earlier part did (dependent: a move's result, or a
 *   card an earlier move moved).
 *     AND_IF_YOU_DO    dependent, at the same time
 *     THEN             dependent, after
 *     ALSO_AFTER_THAT  independent, after
 *     AND              independent, at the same time
 *     OTHERWISE        instead of an earlier part, when that part's check fails (if ... else)
 * - OPTIONAL is "you can": the player decides on resolution (SelectYesNo).
 * - MODE is the "choose 1 of these effects" choice the part belongs to, and
 *   CHOSEN_ON when the choice is made: on ACTIVATION the opponent knows it
 *   before responding, on RESOLUTION it is made after the chain has resolved
 *   down to it.
 * - PICK is how a move's cards were picked: THIS_CARD, TARGETED (on
 *   activation, and it targets), CHOSEN (on resolution, without targeting),
 *   RANDOM, ALL (every card that matches, no choice), EVENT_CARDS (the cards
 *   the event was about), CHAIN_LINK (the effect responded to), DECK_TOP. BY
 *   is who picks, when it isn't the player of the effect.
 */
/** A part's labels, in the schema's words (cardSchema.ts: Part, Link, Level, ModeChosenOn). */
export interface PartLabels {
  PART: number;
  LEVEL: Extract<Level, "EFFECT" | "SUBSEQUENT">;
  LINK?: Link;
  OPTIONAL?: true;
  MODE?: number;
  CHOSEN_ON?: ModeChosenOn;
}

/** The level of a step of a cost or target function (a resolution's steps take their part's). */
export function stepLevel(role: "COST" | "TARGET", action: Flags, activated: boolean): Level {
  if (role === "COST" || (action.REASON ?? []).includes("COST") || action.ACTION === "PAY_LP") return "COST";
  // An effect that isn't activated (a replacement effect) does what its target function does
  return activated ? "ON_ACTIVATION" : "EFFECT";
}

/** Steps that keep track of the effect rather than doing something to cards or players. */
const BOOKKEEPING_STEPS = [
  "CHOOSE",
  "GROUP",
  "TARGET",
  "CHOOSE_FUSION_MATERIALS",
  "REMEMBER",
  "CHANGE_CATEGORY",
  "CHANGE_PROPERTY",
  "FLAG",
  "PLAYER_FLAG",
  "CLEAR_FLAG",
  "CHAIN_LIMIT",
  "END_THIS_EFFECT",
] as const;

export type Bookkeeping = (typeof BOOKKEEPING_STEPS)[number];

/** The bookkeeping steps, to look one up. */
export const BOOKKEEPING = new Set<string>(BOOKKEEPING_STEPS);

/** Every REF in a record, as the ids it names. */
function refs(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((x) => refs(x, found));
  else if (value && typeof value === "object") {
    for (const [key, x] of Object.entries(value)) {
      if (key === "REF") found.push(String(x));
      else if (key !== "IF") refs(x, found);
    }
  }
  return found;
}

/** The cards a step works on: the ids it names, and this card or the event's cards by name. */
const cardsOf = (action: Flags) => [
  ...refs({ ...action, IF: undefined }),
  ...[action.SUBJECT?.WHO, action.TO?.WHO].filter((who) => who && who !== "RAW").map((who) => `WHO:${who}`),
];

/** Whether a condition, anywhere inside it, has a key that holds (OPTIONAL, MODE...). */
function has(value: unknown, test: (key: string, x: unknown) => boolean): boolean {
  if (Array.isArray(value)) return value.some((x) => has(x, test));
  if (value && typeof value === "object")
    return Object.entries(value).some(([key, x]) => test(key, x) || has(x, test));
  return false;
}

const isOptional = (condition: Flags) => condition.OPTIONAL === true;
const isMode = (condition: Flags) => condition.MODE !== undefined;
const same = (a: Flags, b: Flags) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Splits a resolution's steps into parts, writing each step's PART, and
 * returns the parts' labels. A step opens a new part when it leaves the
 * block the step before was in, when its own checks add "you can", a mode,
 * or a check on what an earlier part did (or on a card this part moved, for
 * a step about something else), or when a Duel.BreakEffect()
 * comes between it and a step that did something. Picking cards does
 * nothing on its own, so a part that has only picked so far takes the next
 * step in, whatever it opens with: a pick belongs to the move it is for.
 */
export function labelParts(actions: Flags[]): PartLabels[] {
  type Part = { PART: number; opening: Flags[]; dependent: boolean; sequential: boolean; moved: Set<string> };
  const parts: Part[] = [];
  /** The ids of the cards the parts before the current one moved. */
  const earlier = new Set<string>();
  let before: Flags[] = [];
  for (const action of actions) {
    const conds: Flags[] = action.IF ?? [];
    const inside = before.every((c, i) => conds[i] && same(c, conds[i]));
    const added = inside ? conds.slice(before.length) : conds;
    let current = parts.at(-1);
    // Showing cards an earlier step moved (a searched card, a face-down Summon) belongs to that move
    const shown = action.ACTION === "REVEAL" ? cardsOf({ SUBJECT: action.SUBJECT }) : [];
    if (current && shown.length && shown.every((id) => earlier.has(id) || current!.moved.has(id))) {
      action.PART = current.PART;
      continue;
    }
    const onEarlier = (c: Flags, ids: Set<string>) =>
      has(c, (key) => key === "SUCCEEDED") || refs(c).some((id) => ids.has(id));
    // A check on a card this part moved is a new part when the step does something to something else
    // (Thestalos: "then, if it was a Monster Card, inflict damage"), not when it goes on with that card
    // (Rhapsodia: "if it is a Trap Monster, also negate that")
    const own = new Set(cardsOf(action));
    const onThisPart = (c: Flags) => refs(c).some((id) => current?.moved.has(id) && !own.has(id));
    const gate = (c: Flags) =>
      onEarlier(c, earlier) || onThisPart(c) || has(c, (key, x) => (key === "OPTIONAL" && x === true) || key === "MODE");
    if (!current || !inside || added.some(gate) || (action.THEN && current.moved.size)) {
      if (current?.moved.size) for (const id of current.moved) earlier.add(id);
      const opened = { opening: conds, dependent: conds.some((c) => onEarlier(c, earlier)), sequential: Boolean(action.THEN) };
      if (current && !current.moved.size) Object.assign(current, opened);
      else parts.push((current = { PART: parts.length + 1, moved: new Set(), ...opened }));
    } else if (action.THEN) {
      current.sequential = true;
    }
    action.PART = current.PART;
    if (!BOOKKEEPING.has(action.ACTION)) {
      // A move with no card (a draw, damage) still did something
      current.moved.add("");
      for (const id of cardsOf(action)) current.moved.add(id);
    }
    before = conds;
  }

  return parts.map(({ PART, opening, dependent, sequential }, i) => {
    const mode = modeOf(opening);
    const labels = { ...(opening.some(isOptional) ? { OPTIONAL: true as const } : {}), ...(mode !== undefined ? { MODE: mode } : {}) };
    // A mode's part follows the parts before it outside the other modes: two modes never both happen,
    // and their numbers already say they are alternatives
    const before = parts.slice(0, i).filter((part) => mode === undefined || [undefined, mode].includes(modeOf(part.opening)));
    if (!before.length) return { PART, LEVEL: "EFFECT", ...labels };
    // A part that needs an earlier part's checks not to hold ("not (A and B)") is that part's "else",
    // unless it sits inside the part just before it (an "if" within that part's own block)
    const inside = before[before.length - 1].opening.every((c) => opening.some((o) => same(o, c)));
    const elseOf = (o: Flags, part: (typeof parts)[number]) =>
      o.NOT?.length && !(mode !== undefined && o.NOT.every(isMode)) && o.NOT.every((n: Flags) => part.opening.some((c) => same(c, n)));
    const otherwise = !inside && before.some((part) => opening.some((o) => elseOf(o, part)));
    const link = otherwise
      ? "OTHERWISE"
      : dependent
        ? sequential
          ? "THEN"
          : "AND_IF_YOU_DO"
        : sequential
          ? "ALSO_AFTER_THAT"
          : "AND";
    return { PART, LINK: link, LEVEL: dependent && !otherwise ? "SUBSEQUENT" : "EFFECT", ...labels };
  });
}

const modeOf = (conds: Flags[]): number | undefined => conds.find(isMode)?.MODE;

/** How a move's cards were picked, from its subject and the effect's picks so far, by id. */
export function pickLabel(subject: Flags | undefined, picks: Map<string, Flags>): { PICK: Pick; BY?: string } | undefined {
  if (!subject || typeof subject !== "object") return undefined;
  // Cards made the target with Duel.SetTargetCard, kept by what they are
  const targeted = picks.get(JSON.stringify(subject))?.ACTION === "TARGET";
  if (subject.REF) {
    const pick = picks.get(subject.REF);
    if (!pick) return undefined;
    const by = pick.BY ? { BY: pick.BY } : {};
    if (pick.ACTION === "TARGET" || targeted) return { PICK: "TARGETED", ...by };
    if (pick.ACTION === "GROUP") return { PICK: "ALL" };
    if (pick.RANDOM) return { PICK: "RANDOM", ...by };
    if (pick.ACTION === "CHOOSE" || pick.ACTION === "CHOOSE_FUSION_MATERIALS") return { PICK: "CHOSEN", ...by };
    return undefined;
  }
  if (targeted) return { PICK: "TARGETED" };
  const kinds: Record<string, Pick> = {
    SELF: "THIS_CARD",
    EVENT_CARDS: "EVENT_CARDS",
    CHAIN_LINK_RESPONDED_TO: "CHAIN_LINK",
    RESPONDED_CARD: "CHAIN_LINK",
    DECK_TOP: "DECK_TOP",
  };
  return kinds[subject.WHO] ? { PICK: kinds[subject.WHO] } : undefined;
}
