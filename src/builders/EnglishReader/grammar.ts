/**
 * The grammar: for each kind of phrase, the ways card text writes it and what each means (engine.ts reads with it).
 *
 * A pattern is the words as printed, with {name:kind} where a phrase of a kind goes ({kind} when the name is the
 * kind's). Its meaning is made from the meanings of those phrases, and a meaning of undefined is no reading (a name
 * code that isn't an archetype doesn't read as one). Meanings are drafts (phrases.ts), finished once the whole text is
 * read: what a pattern leaves out (an effect's speed, its categories, the ids of its picks) follows from what is there.
 *
 * A list's bullets are the list's: {name:●kind} is a bullet (●) and a phrase of the kind, one or more times, so the
 * words before a list say what its bullets hold, and no kind's own patterns have a bullet.
 *
 * The six families and their main kinds:
 * - TEXT (text.ts): `text`, `sentence`, `materialsLine`, `limitation`, `limitFrequency`/`limitPeriod`, `summonText`, `equippable`, `ritualOf`/`ritualTributes`, `materials`/`material`.
 * - EFFECTS (effects.ts): `effect`, `header`, `headerClauses`/`headerClause`, `phaseOrTurn`, `battleStepPoint`, `event`/`eventSuffix`/`eventSuffixes`/`happening`/`destructionCause`/`sentToGyTail`, `chainEvent`/`activatedKind`, `condition`/`conditionClause`, `selfPlaces`.
 * - ACT (act.ts): `act`, `resolution`/`links`/`clause`/`modal`, `target`, `counted`/`amount`/`cardsAmount`, `mode`/`modeChoice`/`threshold`/`declared`/`attributeGrant`/`countGrant`.
 * - MOVES (moves.ts): `moves`/`move`, `specialSummonMods`/`specialSummonMod`, `butClause`, `cardEffectDuration` (`until the end of this turn`), `lingeringPlayerMove`, `afterCardResolves`, `moved`/`revealed`.
 * - RULES (rules.ts): `rule`, `applied`, `predicate`, `singleSubject`, `pluralSubject`, `singularAffectedSubject`, `effectSourceFilter`, `extraNormalSummonTail`, `lockedSpecialSummons`/`lockException`.
 * - CARDS (cards.ts): `quantifiedCards`/`quantifiedCardsOr`, `cardPhrase`/`cardPostMod`, `cardNoun`/`cardBaseNoun`/`cardPrefixMod`, `fromOrInPlaces`/`placeList`/`placeListTail`/`place`, `monsterZoneFilter`, plus attribute/frame/race/archetype/cardName lists.
 */
import type { Grammar } from "./engine.js";
import { TEXT } from "./grammar/text.js";
import { EFFECTS } from "./grammar/effects.js";
import { ACT } from "./grammar/act.js";
import { MOVES } from "./grammar/moves.js";
import { RULES } from "./grammar/rules.js";
import { CARDS } from "./grammar/cards.js";

/** The families' kinds together: a kind is written in one family only. */
function together(...families: Grammar[]): Grammar {
  const grammar: Grammar = {};
  for (const family of families)
    for (const [kind, patterns] of Object.entries(family)) {
      if (kind in grammar) throw new Error(`the kind ${kind} is written twice`);
      grammar[kind] = patterns;
    }
  return grammar;
}

export const GRAMMAR: Grammar = together(
  TEXT,
  EFFECTS,
  ACT,
  MOVES,
  RULES,
  CARDS,
);

export { twins } from "./grammar/shared.js";
