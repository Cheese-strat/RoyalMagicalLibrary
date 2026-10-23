/** A condition as written in the script, or its negation. */
export type Written = { expr: string; not?: boolean };

/**
 * The if-blocks of a function, so that each call in it can be given the
 * conditions it sits under.
 *
 * - Enclosing ifs stack up. An elseif or else adds the earlier branches,
 *   negated.
 * - A guard ("if X then return end") adds "not X" for the lines after it.
 * - "if chk==0 then ..." is the activation check. What it returns goes in
 *   legalChecks (null when it spans several lines), and calls inside it
 *   aren't steps of the effect.
 * - "if chkc then ..." checks whether a card can be the target again, for
 *   effects that change targets. It isn't read.
 */
export function ifBlocks(body: string) {
  type Frame = { conds: Written[]; legal?: boolean; guards: Written[]; texts: string[] };
  type Event = {
    at: number;
    end: number;
    kind: "IF" | "ELSEIF" | "ELSE" | "END" | "OPEN";
    expr?: string;
    exprStart?: number;
    exprEnd?: number;
    rest?: string;
  };

  const events: Event[] = [];
  for (const m of body.matchAll(/^[ \t]*(if|elseif)\s+([\s\S]*?)\s+then\b([^\n]*)/gm)) {
    const exprStart = m.index! + m[0].indexOf(m[2], m[0].indexOf(m[1]) + m[1].length);
    events.push({
      at: m.index!,
      end: m.index! + m[0].length,
      kind: m[1] === "if" ? "IF" : "ELSEIF",
      expr: m[2].replace(/\s+/g, " "),
      exprStart,
      exprEnd: exprStart + m[2].length,
      rest: m[3].trim(),
    });
  }
  for (const m of body.matchAll(/^[ \t]*else[ \t]*$/gm))
    events.push({ at: m.index!, end: m.index! + m[0].length, kind: "ELSE" });
  for (const m of body.matchAll(/^[ \t]*end\b/gm))
    events.push({ at: m.index!, end: m.index! + m[0].length, kind: "END" });
  for (const m of body.matchAll(/\b(?:do|function\s*\([^)\n]*\))[ \t]*$/gm)) {
    events.push({ at: m.index!, end: m.index! + m[0].length, kind: "OPEN" });
  }
  events.sort((a, b) => a.at - b.at);

  const isLegal = (expr: string) => /^chk\s*==\s*0$/.test(expr);
  const isRetarget = (expr: string) => /^chkc$/.test(expr);

  const legalChecks: (string | null)[] = [];
  for (const event of events) {
    if (event.kind !== "IF" || !isLegal(event.expr!)) continue;
    const oneLine = /\bend$/.test(event.rest!);
    legalChecks.push(oneLine ? event.rest!.replace(/^return\s+/, "").replace(/\s*end$/, "") : null);
  }

  /** The written text of an expression from its start up to a position, without a dangling and/or/not. */
  const upTo = (start: number, pos: number) =>
    body
      .slice(start, pos)
      .replace(/\s+/g, " ")
      .replace(/\s*(and|or|not)?\s*$/, "");

  /** The conditions at a position in the function, and whether the position is inside the activation check. */
  function stateAt(pos: number) {
    const frames: Frame[] = [{ conds: [], guards: [], texts: [] }];
    const extra: Written[] = [];
    let legal = false;

    for (const event of events) {
      if (event.at >= pos) break;
      const top = frames[frames.length - 1];
      const special = event.expr !== undefined && (isLegal(event.expr) || isRetarget(event.expr));
      const insideExpr = event.exprStart !== undefined && pos >= event.exprStart && pos < event.exprEnd!;
      const insideRest = event.exprEnd !== undefined && pos >= event.exprEnd && pos < event.end;

      if (event.kind === "IF") {
        // A call inside an if's own expression runs after the checks written before it
        if (insideExpr) {
          extra.push({ expr: upTo(event.exprStart!, pos) });
          break;
        }
        const oneLine = /\bend$/.test(event.rest!);
        if (special && (insideRest || !oneLine)) legal = true;
        if (oneLine) {
          if (insideRest && !special) extra.push({ expr: event.expr! });
          else if (!insideRest && !special && /^return\b/.test(event.rest!))
            top.guards.push({ expr: event.expr!, not: true });
          if (!special || !insideRest) continue;
        }
        if (!oneLine)
          frames.push({
            conds: special ? [] : [{ expr: event.expr! }],
            legal: special,
            guards: [],
            texts: [event.expr!],
          });
      } else if (event.kind === "ELSEIF") {
        const earlier = top.texts.map((expr) => ({ expr, not: true }));
        if (insideExpr) {
          top.conds = earlier;
          extra.push({ expr: upTo(event.exprStart!, pos) });
          break;
        }
        top.conds = [...earlier, { expr: event.expr! }];
        top.texts.push(event.expr!);
      } else if (event.kind === "ELSE") {
        top.conds = top.texts.map((expr) => ({ expr, not: true }));
      } else if (event.kind === "END") {
        if (frames.length > 1) frames.pop();
      } else {
        frames.push({ conds: [], guards: [], texts: [] });
      }
    }

    const conds = [...frames.flatMap((frame) => [...frame.guards, ...frame.conds]), ...extra];
    return { conds, legal: legal || frames.some((frame) => frame.legal) };
  }

  return { stateAt, legalChecks };
}
