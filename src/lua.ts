/**
 * Reading Lua text without a parser: matching brackets, splitting arguments,
 * and the calls a function makes. Good enough for the way card scripts are
 * written; a script laid out differently reads as unread (RAW), not wrongly.
 */

/** The index of the bracket closing the one at open, or the text's end. */
export function closing(text: string, open: number) {
  for (let depth = 0, i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return i;
  }
  return text.length;
}

/** Splits at a separator outside brackets and braces: "f(a,b),c" → ["f(a,b)", "c"]. */
export function splitArgs(text: string, separator = ",") {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if ("({".includes(text[i])) depth++;
    else if (")}".includes(text[i])) depth--;
    else if (depth === 0 && text.startsWith(separator, i)) {
      parts.push(text.slice(start, i).trim());
      start = i + separator.length;
      i += separator.length - 1;
    }
  }
  if (text.trim()) parts.push(text.slice(start).trim());
  return parts;
}

/** The text without brackets around all of it: "((a and b))" → "a and b". */
export function stripParens(text: string) {
  let t = text.trim();
  while (t.startsWith("(") && closing(t, 0) === t.length - 1) t = t.slice(1, -1).trim();
  return t;
}

/** One call in a function's text. */
export interface Call {
  /** Where it starts and ends in the text. */
  at: number;
  end: number;
  /** "Duel", "aux", "Card", "Effect", "Group", "s" (the script's own table), a variable for a method call (tc:IsFaceup()), "@" for a call chained to the one before (a:B():C()), or "" for a bare call (fop(ce,e,tp)). */
  object: string;
  name: string;
  args: string[];
  /** The variables it is assigned to: "local p,d=Duel.GetChainInfo(...)" → ["p", "d"]. */
  assigned?: string[];
  text: string;
}

const KEYWORDS = /^(if|and|or|not|return|function|then|elseif|while|until|bit)$/;

/** The calls of a function's text in order, leaving out those inside another call's arguments. */
export function callsOf(text: string): Call[] {
  const out: Call[] = [];
  for (const m of text.matchAll(/(?:\b(Duel|aux|Card|Effect|Group|s)\.|\b(\w+):|(?<![.:\w]))(\w+)\(/g)) {
    if (!m[1] && !m[2] && KEYWORDS.test(m[3])) continue;
    let at = m.index!;
    if (out.some((call) => at > call.at && at < call.end)) continue;
    const lineStart = text.lastIndexOf("\n", at) + 1;
    const assigned = text
      .slice(lineStart, at)
      .match(/^\s*(?:local\s+)?(\w+(?:\s*,\s*\w+)*)\s*=(?!=)/)?.[1]
      .split(",")
      .map((name) => name.trim());
    let object = m[1] ?? m[2] ?? "";
    let name = m[3];
    let open = at + m[0].length - 1;
    const chain: Call[] = [];
    for (;;) {
      const end = closing(text, open);
      chain.push({ at, end, object, name, args: splitArgs(text.slice(open + 1, end)), text: text.slice(at, end + 1) });
      const next = text.slice(end + 1).match(/^:(\w+)\(/);
      if (!next) break;
      at = end + 1;
      object = "@";
      name = next[1];
      open = end + next[0].length;
    }
    chain[chain.length - 1].assigned = assigned;
    chain[0].end = chain[chain.length - 1].end;
    out.push(...chain);
  }
  return out;
}

/**
 * A script's functions by name, from "function s.name(" (or "function
 * c<code>.name(") to the "end" closing it. "c<code>." is written "s." in the
 * text returned, so both styles of script read the same.
 */
export function scriptFunctions(script: string, code: number) {
  const text = script.replace(new RegExp(`\\bc${code}\\.`, "g"), "s.");
  const bodies = new Map<string, string>();
  for (const m of text.matchAll(/^function\s+s\.(\w+)\s*\(([\s\S]*?)^end\b/gm)) bodies.set(m[1], m[0]);
  return bodies;
}
