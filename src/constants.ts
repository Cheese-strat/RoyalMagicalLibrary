/**
 * The numbers of constant.lua by name, both ways: LOCATION_GRAVE is 0x10,
 * and 0x10 under LOCATION_ is GRAVE. Names are given without their prefix.
 */
export class Constants {
  private readonly entries: (readonly [string, number])[];

  constructor(constantLua: string) {
    this.entries = [...constantLua.matchAll(/^([A-Z_0-9]+)\s*=\s*(0x[0-9a-fA-F]+|\d+)/gm)].map(
      ([, name, value]) => [name, Number(value)] as const,
    );
  }

  /** The value of an expression of names and numbers joined by + or |, e.g. "LOCATION_DECK+LOCATION_EXTRA"; unknown names count 0. */
  value(expression: string) {
    return expression
      .split(/[+|]/)
      .map((part) => part.trim())
      .reduce(
        (total, part) =>
          total +
          (/^(0x[0-9a-fA-F]+|\d+)$/.test(part)
            ? Number(part)
            : (this.entries.find(([name]) => name === part)?.[1] ?? 0)),
        0,
      );
  }

  /** The names of the flags set in value, e.g. ("CATEGORY_", 0x200) → ["SPECIAL_SUMMON"]. */
  flags(prefix: string, value: number): string[] {
    const group = this.group(prefix);
    const out: string[] = [];
    // Categories go past 32 bits, so bits are checked arithmetically rather than with &
    for (let bit = 1; bit <= value; bit *= 2) {
      if (Math.floor(value / bit) % 2)
        out.push(group.find(([, v]) => v === bit)?.[0].slice(prefix.length) ?? `0x${bit.toString(16)}`);
    }
    return out;
  }

  /** The name of one value, e.g. ("EVENT_", 1002) → "FREE_CHAIN"; the number as text when no name has it. */
  name(prefix: string, value: number) {
    return (
      this.group(prefix)
        .find(([, v]) => v === value)?.[0]
        .slice(prefix.length) ?? String(value)
    );
  }

  private group(prefix: string) {
    // EFFECT_TYPE_, EFFECT_FLAG_ and EFFECT_COUNT_CODE_ names also start with EFFECT_ but aren't effect codes
    // (EFFECT_FLAG2_REPEAT_UPDATE is 1, the same number as EFFECT_IMMUNE_EFFECT)
    return this.entries.filter(
      ([name]) =>
        name.startsWith(prefix) && !(prefix === "EFFECT_" && /^EFFECT_(TYPE|FLAG|FLAG2|COUNT_CODE)_/.test(name)),
    );
  }
}

/** Constant names as a script writes them, without their prefix: "LOCATION_GRAVE+LOCATION_MZONE" → ["GRAVE", "MZONE"]. */
export function names(expression: string | undefined, prefix: string): string[] {
  if (!expression || expression.trim() === "0") return [];
  return expression.split(/[+|]/).map((part) => part.trim().replace(prefix, ""));
}
