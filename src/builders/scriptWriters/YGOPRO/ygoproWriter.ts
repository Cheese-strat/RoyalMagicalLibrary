import type { CardSchema } from "../../../lib/cardSchema.js";

// YGOPro writer (being written): RML to MyCard's ygopro-scripts (c<code>.lua), which koishipro-core.js runs.
// Unlike the EDOPro writer it writes `c<code>.initial_effect` and MyCard's aux.* procedures, and its scripts are
// checked against MyCard's own.

/** The script: its text, null when the card needs none, undefined when it isn't written. */
export type Written = string | null | undefined;

/** Not written yet: every card is undefined. */
export function ygoproWriter(_input: CardSchema, _cardID: number): Written {
  return undefined;
}
