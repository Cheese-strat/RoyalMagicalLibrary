import type { CardFlags, Flags } from "./readCard.js";

/** Flags as compact text: KEY=value, {nested}, [lists], a flag alone when it is true. */
export function flagText(value: unknown): string {
  if (value === true) return "";
  if (Array.isArray(value))
    return value.every((x) => typeof x !== "object") ? value.join("|") : `[${value.map(flagText).join(", ")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .map(([key, x]) => (x === true ? key : `${key}=${flagText(x)}`))
      .join(" ")}}`;
  }
  return String(value);
}

/**
 * A card as text, one line per effect and per step. A step's conditions
 * that repeat the step before's are written ^ (the same) or ^+[...] (the
 * same and more).
 */
export function cardText(card: CardFlags): string {
  const lines = [`=== ${card.NAME} (${card.CODE}) TYPE=${card.TYPE.join("|")}`];
  for (const setup of card.SETUP) lines.push(`  SETUP ${flagText(setup).slice(1, -1)}`);
  for (const effect of card.EFFECTS) {
    const { EFFECT, COST, TARGET, OPERATION, CONDITION, VALUE, APPLIES_TO, ...head } = effect;
    lines.push(`  #${EFFECT} ${flagText(head).slice(1, -1)}`);
    // A summon procedure's effect is aux's code, not the card's; SETUP already says what it takes
    if (head.FROM_PROCEDURE) continue;
    if (CONDITION) lines.push(`      CONDITION ${flagText(CONDITION)}`);
    if (VALUE) lines.push(`      VALUE ${flagText(VALUE)}`);
    if (APPLIES_TO) lines.push(`      APPLIES_TO ${flagText(APPLIES_TO)}`);
    for (const [role, part] of [
      ["COST", COST],
      ["TARGET", TARGET],
      ["OPERATION", OPERATION],
    ] as const) {
      if (!part) continue;
      if (typeof part === "string") {
        lines.push(`      ${role} ${part}`);
        continue;
      }
      for (const legal of part.LEGAL ?? []) lines.push(`      ${role}.LEGAL ${flagText(legal)}`);
      for (const mode of part.MODES ?? []) lines.push(`      ${role}.MODE ${flagText(mode)}`);
      let before: string[] = [];
      for (const action of (part.ACTIONS ?? []) as Flags[]) {
        const { IF = [], ...rest } = action;
        const now = (IF as Flags[]).map(flagText);
        const same = before.length > 0 && before.every((c, i) => now[i] === c);
        const extra = same ? now.slice(before.length) : now;
        const ifText = !now.length
          ? ""
          : same
            ? ` IF=^${extra.length ? `+[${extra.join(", ")}]` : ""}`
            : ` IF=[${now.join(", ")}]`;
        lines.push(`      ${role} ${flagText(rest)}${ifText}`);
        before = now;
      }
      for (const declared of part.DECLARES ?? []) lines.push(`      ${role}.DECLARES ${flagText(declared)}`);
    }
  }
  return lines.join("\n");
}
