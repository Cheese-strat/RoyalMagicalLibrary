import luaparse from "luaparse";
import type { Expression, FunctionDeclaration, Node, Statement } from "luaparse";

export type { Expression, FunctionDeclaration, Statement } from "luaparse";

/**
 * Reading Lua through its syntax tree (luaparse, Lua 5.3; every card script
 * parses, see tools/parseAll.ts): a script's functions, expressions printed
 * back as text, and the calls an expression makes.
 */

/**
 * A script's functions by name: "function s.name(" (or "function
 * c<code>.name("), "s.name = function(", and "s.name = s.other". "c<code>"
 * is read as "s", so both styles of script read the same.
 */
export function scriptFunctions(script: string, code: number) {
  const chunk = luaparse.parse(script.replace(new RegExp(`\\bc${code}\\b`, "g"), "s"), { luaVersion: "5.3" });
  const ownName = (node: Node | null) =>
    node?.type === "MemberExpression" && node.base.type === "Identifier" && node.base.name === "s"
      ? node.identifier.name
      : undefined;
  const functions = new Map<string, FunctionDeclaration>();
  const aliases: [name: string, of: string][] = [];
  for (const statement of chunk.body) {
    if (statement.type === "FunctionDeclaration" && ownName(statement.identifier)) {
      functions.set(ownName(statement.identifier)!, statement);
    } else if (statement.type === "AssignmentStatement") {
      statement.variables.forEach((variable, i) => {
        const name = ownName(variable);
        const init = statement.init[i];
        if (!name || !init) return;
        if (init.type === "FunctionDeclaration") functions.set(name, init);
        else if (ownName(init)) aliases.push([name, ownName(init)!]);
      });
    }
  }
  for (const [name, of] of aliases) if (functions.has(of)) functions.set(name, functions.get(of)!);
  return functions;
}

/** Lua's operator precedence, lowest first; unary operators bind at 11. */
const PRECEDENCE: Record<string, number> = {
  or: 1,
  and: 2,
  "<": 3,
  ">": 3,
  "<=": 3,
  ">=": 3,
  "~=": 3,
  "==": 3,
  "|": 4,
  "~": 5,
  "&": 6,
  "<<": 7,
  ">>": 7,
  "..": 8,
  "+": 9,
  "-": 9,
  "*": 10,
  "/": 10,
  "//": 10,
  "%": 10,
  "^": 12,
};
const UNARY = 11;

const precedence = (node: Node) =>
  node.type === "BinaryExpression" || node.type === "LogicalExpression"
    ? PRECEDENCE[node.operator]
    : node.type === "UnaryExpression"
      ? UNARY
      : 100;

/**
 * An expression as text, in one form whatever the script's layout: no
 * comments, no spaces but around and/or/not, brackets only where they are
 * needed. "c<code>" reads "s" (see scriptFunctions).
 */
export function text(node: Node): string {
  const wrap = (child: Node, min: number) => (precedence(child) < min ? `(${text(child)})` : text(child));
  switch (node.type) {
    case "Identifier":
      return node.name;
    case "NumericLiteral":
    case "StringLiteral":
    case "BooleanLiteral":
    case "NilLiteral":
    case "VarargLiteral":
      return node.raw;
    case "MemberExpression":
      return `${wrap(node.base, 100)}${node.indexer}${node.identifier.name}`;
    case "IndexExpression":
      return `${wrap(node.base, 100)}[${text(node.index)}]`;
    case "CallExpression":
      return `${wrap(node.base, 100)}(${node.arguments.map(text).join(",")})`;
    case "StringCallExpression":
      return `${wrap(node.base, 100)}(${text(node.argument)})`;
    case "TableCallExpression":
      return `${wrap(node.base, 100)}(${text(node.arguments)})`;
    case "TableConstructorExpression":
      return `{${node.fields
        .map((field) =>
          field.type === "TableKey"
            ? `[${text(field.key)}]=${text(field.value)}`
            : field.type === "TableKeyString"
              ? `${field.key.name}=${text(field.value)}`
              : text(field.value),
        )
        .join(",")}}`;
    case "UnaryExpression":
      return `${node.operator === "not" ? "not " : node.operator}${wrap(node.argument, UNARY)}`;
    case "BinaryExpression":
    case "LogicalExpression": {
      const p = PRECEDENCE[node.operator];
      // .. and ^ group to the right, every other operator to the left
      const right = node.operator === ".." || node.operator === "^";
      const operator = node.type === "LogicalExpression" ? ` ${node.operator} ` : node.operator;
      return `${wrap(node.left, right ? p + 1 : p)}${operator}${wrap(node.right, right ? p : p + 1)}`;
    }
    case "FunctionDeclaration":
      return "function";
    default:
      return node.type;
  }
}

/** One call: Duel.Destroy(g,REASON_EFFECT), tc:IsFaceup(), fop(ce,e,tp)... */
export interface Call {
  /** "Duel", "aux", "Card", "Effect", "Group", "s" (the script's own table), a variable for a method call (tc:IsFaceup()), "@" for a call chained to the one before (a:B():C()), or "" for a bare call (fop(ce,e,tp)). */
  object: string;
  name: string;
  args: Expression[];
  text: string;
  /** The call expression itself, with the calls it is chained to. */
  node: Expression;
}

/**
 * The calls of a call expression in the order they run: a chain
 * Duel.GetMatchingGroup(...):GetFirst() is two calls, the second on "@".
 * Calls inside the arguments aren't included. Not a call: [].
 */
export function chain(node: Expression): Call[] {
  if (node.type !== "CallExpression" && node.type !== "StringCallExpression" && node.type !== "TableCallExpression")
    return [];
  const args =
    node.type === "CallExpression" ? node.arguments : node.type === "StringCallExpression" ? [node.argument] : [node.arguments];
  const base = node.base;
  if (base.type === "Identifier") return [{ object: "", name: base.name, args, text: text(node), node }];
  if (base.type !== "MemberExpression") return [{ object: "", name: text(base), args, text: text(node), node }];
  const before = chain(base.base);
  const object = before.length ? "@" : text(base.base);
  return [...before, { object, name: base.identifier.name, args, text: text(node), node }];
}

/** An expression from text: c:IsType(TYPE_SPELL) for a filter given as Card.IsType with TYPE_SPELL. */
export function parseExpression(source: string): Expression {
  try {
    const [statement] = luaparse.parse(`return ${source}`, { luaVersion: "5.3" }).body;
    return (statement as Statement & { type: "ReturnStatement" }).arguments[0];
  } catch {
    // Text that isn't Lua (a function printed as "function") reads as a name no rule knows
    return { type: "Identifier", name: source };
  }
}

/** A function's parameters by name, the first (the card, for a filter) included. */
export const parametersOf = (fn: FunctionDeclaration) =>
  fn.parameters.map((p) => (p.type === "Identifier" ? p.name : "..."));
