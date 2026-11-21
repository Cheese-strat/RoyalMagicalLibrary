# EnglishReader Grammar — Remaining Task & Ideal Answer Format

Current baseline (2026-11-20): **1,686** of **14,239** cards read completely in `cards.cdb`, with **141/141** tests passing and **0** TypeScript errors.
This file tracks **only what remains to be done**, resolved schema decisions ready to implement, non-negotiable constraints, and the ideal answer format for small slices.

---

## 1. Settled Conventions & Resolved Schema Decisions

### Settled Effect Classification (`finish.ts` `classOf` & `cardSchema.ts`)
- **`CONDITION`**: Non-effect card text (*効果外テキスト* — `summonCondition()`, `"Equip only to ..."`, Kewl Tune hand-Synchro). Always gets `CANNOT_DISABLE` and `UNCOPYABLE` from `finishEffect`; opt-out of `"use each effect"` limits.
- **`UNCLASSIFIED`**: Monster effect classed by Konami's FAQ as none of Ignition / Trigger / Quick / Continuous — inferred by `classOf` when a monster's passive effect applies off the field too (`where` outside `ON_FIELD`) or is a Summon material treatment (`DOUBLE_TRIBUTE`, `NONTUNER`). Negatable; excluded from `"use each effect"` limits.
- **`AUTO`**: Non-chain event/operation effects (e.g., Clear Wing, Clown Crew Meteor, Nervedo, Fabled Realm's Revival). Keep as `AUTO`.

### Decision A: Replacement Effects (`"If ... would be destroyed ..., you can ... instead"` — 42 cards)
- Add `replaceCount?: Count` on `EffectSchema` (`"ALL"` for `"card(s)"` vs `{ min: 1, max: 1 }` for `"a"` / `"1"` monster).
- Parse replacement effects as `kind: "AUTO"` (unless an off-field monster rule promotes to `"UNCLASSIFIED"`), `event: "DESTROY_REPLACE"`, `eventOf: "SELF" | "ANY"`.
- Put the protected-card / cause criteria in `requires` (matching `c2881864.lua`, `c1580833.lua`, `c5067884.lua`: `REASON_BATTLE + REASON_EFFECT`, `not REASON_REPLACE`), and put the replacement cost/action in `does` (`optional: true` for `"you can"`, with `reasons: ["REPLACE"]` on replacement destructions/detaches/banishes per `c93854893.lua` / `c6853254.lua`).

### Decision B: Persistent Targeting (`"Activate this card by targeting ..."` — 70 cards)
- **No new `CardSchema` types required** — reuse existing `MoveName: "KEEP_TARGETING"`, `Applied.to: "CARD_IT_TARGETS"`, and `Who: "CARD_IT_TARGETS"`:
  1. `"Activate this card by targeting {t:target}"` emits `MOVE "KEEP_TARGETING"` with `cards: THIS_CARD`, `to: TARGET` alongside any immediate activation moves (`Call of the Haunted` `c97077563.lua` `SetCardTarget`, `Two Toads` `c6203182.lua`, `Spellbinding Circle` `c18807108.lua`).
  2. Continuous predicates targeting that kept card (e.g. `"It cannot attack..."`) emit `to: "CARD_IT_TARGETS"`.
  3. Subsequent sentences referencing `"that target"` / `"that monster"` resolve via `{ who: "CARD_IT_TARGETS" }` in `assemble()` (mirroring `EQUIP` / `EQUIPPED_MONSTER`, while Equip Spells keep using `EQUIP` / `EQUIPPED_MONSTER`; Lua's omitted `UNCOPYABLE` on `EQUIP_LIMIT` is harmless because equip limits are never copied).

### Decision C: Unclassified Summon Procedures & `onlyOne` Negatability
- **`CardRules.onlyOne`**: `SetUniqueOnField` (`c1710476.lua`) never sets `CANNOT_DISABLE`, so it is always negatable on the field (and everywhere via name negation). Keeping `onlyOne` in `CardRules` is complete once documented as negatable.
- **`SummonMethod.kind?: "UNCLASSIFIED" | "CONDITION"`**: Optional card-text procedures (`"You can Special Summon this card (from your hand)..."` `c70095154.lua` `UNCOPYABLE` only, `"You can Normal Summon this card without Tributing"`) are negatable **Unclassified Effects** (`UNCLASSIFIED`), whereas `"Must (first) be ..."` / `"You can also Xyz Summon this card by using ..."` procedures (`c72989439.lua`, `TY-PHON`) are non-negatable **Summoning Conditions** (`CONDITION`). Tag card-text `PROCEDURE` and custom `NORMAL`/`TRIBUTE` `SummonMethod` entries with `kind` rather than duplicating them into `effects[]`.

---

## 2. Prioritized Small Backlog Slices

Ignore broken pre-PSCT texts and broken quoted names (`~266` `names`-stage stops). Implement one small slice at a time (~20–70 cards each):

| Slice | Target Feature | Counts / Passcodes | Primary Files |
| --- | --- | --- | --- |
| **1. Summon `kind` + `onlyOne` doc** | Add `SummonMethod.kind?: "UNCLASSIFIED" \| "CONDITION"` in [cardSchema.ts](../../lib/cardSchema.ts) + `finishSummon` ([finish.ts](finish.ts)) for custom card-text procedures (`UNCLASSIFIED` for optional procs/Normal/Tribute; `CONDITION` for `Must...`/`also Xyz`); verify `Gemini` stays queued for Slice 9. | All existing procedure cards (`Power Invader`, `The Tricky`, `TY-PHON`, `Vidolium`) | `cardSchema.ts`, `finish.ts`, `text.ts`, `rulings/` |
| **2. `"Activate this card by ..."` & `KEEP_TARGETING`** | `"Activate this card by targeting {t:target}..."`, `KEEP_TARGETING` (`to: TARGET`), `CARD_IT_TARGETS` pronoun carryover across sentences, `"When this card leaves the field, destroy that target"` / `"paying"` / `"declaring"`. | **70** (`"this card by"`: `296499`, `6203182`, `6556178`, `18807108`, `97077563`) | `act.ts`, `effects.ts`, `rules.ts`, `konamiReader.ts` |
| **3. Destruction replacements** | Add `EffectSchema.replaceCount?: Count`; `"If ... would be destroyed by ..., you can ... instead"` (`DESTROY_REPLACE`, `reasons: ["REPLACE"]`). | **42** (`"would be destroyed"`: `1580833`, `2881864`, `5067884`, `6853254`, `93854893`) | `cardSchema.ts`, `effects.ts`, `moves.ts` |
| **4. Remaining 9 Kewl Tune cards** | Cue (`"for the rest of this turn you cannot..."` without comma, excavate 2 top opponent's Deck + banish 1 + place other top/bottom), Rotary (`"reveal this card and 1 Tuner in your hand"`, place on bottom of Deck, look at opponent's hand), Crackle & Clip (look at opponent's Extra Deck + banish face-up random/chosen until End Phase), Playlist / Loudness War / B2B / Synchro / Remix (`in your field or GY`, `in your GY or banishment`, `except a Level N Tuner`, `Other Tuners you control`, `make a second attack`, `You can activate up to 2 {name} per turn`, choose 2 + add 1 / Special Summon other, apply GY Synchro Material effect). | **9** (`16387555`, `17209452`, `39576656`, `40847034`, `41069676`, `43904702`, `65961304`, `78058681`, `88170262`) | `cards.ts`, `effects.ts`, `moves.ts`, `rules.ts`, `text.ts` |
| **5. Mentions & Link arrows** | `"that mentions {name}"`, `"{name} from your..."` patterns, and `"Monsters this card points to..."` / `this card points to` predicates/picks. | **33** + **32** + **43** (`821049`, `1047075`, `4914353`, `8264361`) | `cards.ts`, `rules.ts`, `effects.ts` |
| **6. Variable targets & distinct names** | `", up to the number of {counted}"`, `"with different names"`, `"and 1 card your..."` multi-pick comma patterns, `"cards in your..."` / `"from your Extra Deck, ..."`. | **30** + **32** + **29** + **24** (`464362`, `13662809`, `4837861`, `10125011`) | `act.ts`, `cards.ts`, `moves.ts` |
| **7. Battle triggers & damage rules** | `"When this card battles an opponent's monster,"`, `"When an attack is declared..."`, `"You take no battle damage from..."` (`AVOID_BATTLE_DAMAGE`). | **32** + **25** + **23** (`5846183`, `1118137`, `1218214`) | `effects.ts`, `rules.ts` |
| **8. Contact Fusion & Rank-Up / Xyz Change** | `"by banishing/sending the above cards you control..."` (`"the above cards"`), `"You can also Xyz Summon this card / {name} by using..."` (`57`), `"during the End Phase"`. | **34** + **57** + **22** (`1561110`, `2111707`, `1269512`, `2530830`) | `text.ts`, `effects.ts` |
| **9. Pendulum locks, Trap Monsters, Gemini, Counters, Direct Deck** | `"You cannot Pendulum Summon monsters, except..."` (**23**), `"directly from your"` (**26**), Trap Monsters (`as an Effect Monster` **22**), Gemini (`"treated as a Normal Monster while face-up on the field or in the GY"` -> `UNCLASSIFIED` via off-field `classOf`), Spell Counters, burn damage. | `6830480`, `645794`, `3918345`, `70791313` | `rules.ts`, `effects.ts`, `moves.ts` |

*(Bucket counts are upper bounds from the 2026-11-20 `cards.cdb` survey, excluding pre-PSCT texts; one card can stop on multiple features in sequence.)*

---

## 3. Non-Negotiable Rules & Kind Placement Reference

1. **No `"words"` fallback & ignore broken pre-PSCT**: Never store raw card text inside `CardSchema`. Pre-2014 wording (`"Graveyard"`, `"Magic Card"`, `"Life Points"`, `"removed from play"`, old non-PSCT phrasing) and broken quoted names (`22873798` `"Hyenas"`) remain `TextStop`s.
2. **Factor tails & prevent overlap**: Reuse `listPatterns` / `commaTailPatterns` ([shared.ts](grammar/shared.ts)), `cardPostMod` ([cards.ts](grammar/cards.ts)), `specialSummonMods` / `butClause` ([moves.ts](grammar/moves.ts)), `destructionCause` / `sentToGyTail` / `activatedKind` ([effects.ts](grammar/effects.ts)), and `specialSummonLock` / `extraNormalSummon` ([rules.ts](grammar/rules.ts), [shared.ts](grammar/shared.ts)). Guard any overlapping pattern with `undefined` or `NoReading` so every reading stays unique (`0` ambiguities) and preserves [located()](phrases.ts) + `textAlone(card)` round-trips.
3. **Cross-check scripts with salt**: Inspect `official/ygopro-scripts/c<code>.lua` alongside `db-ygoresources-com/yugioh-faq-history`. Scripts have human bugs (e.g., `c16387555.lua` checking `GetOriginalType()&TYPE_TUNER==0`); card text + Konami rulings win.

| File | Main Kinds |
| --- | --- |
| [cards.ts](grammar/cards.ts) | `quantifiedCards`, `quantifiedCardsOr`, `cardPhrase`, `cardPostMod`, `cardNoun`, `cardBaseNoun`, `cardPrefixMod`, `fromOrInPlaces`, `placeList`, `placeListTail`, `monsterZoneFilter`, `attributes`, `frames`/`frameList`, `races`/`raceList`, `archetypes`/`archetypeList`, `cardNames` |
| [effects.ts](grammar/effects.ts) | `effect`, `header`, `headerClauses`/`headerClause`, `phaseOrTurn`, `battleStepPoint`, `event`, `eventSuffixes`/`eventSuffix`, `subject`, `happening`, `destructionCause`, `sentToGyTail`, `doing`, `summonKind`, `chainEvent`, `activatedKind`, `condition`, `conditionClause`, `selfPlaces` |
| [act.ts](grammar/act.ts) | `act`, `modeChoice`, `target`, `counted`, `amount`, `cardsAmount`, `mode`, `threshold`, `declared`, `attributeGrant`, `countGrant`, `resolution`, `links`, `link`, `firstClause`, `clause`, `modal` |
| [moves.ts](grammar/moves.ts) | `moves`, `move`, `specialSummonMods`, `specialSummonMod`, `butClause`, `cardEffectDuration`, `lingeringPlayerMove`, `afterCardResolves`, `usable`, `moved`, `revealed` |
| [rules.ts](grammar/rules.ts) | `rule`, `applied`, `predicate`, `predicates`, `singleSubject`, `pluralSubject`, `singularAffectedSubject`, `stats`, `effectSourceFilter`, `extraNormalSummonTail`, `lockedSpecialSummons`, `lockException`, `piercing` |
| [text.ts](grammar/text.ts) | `text`, `sentence`, `limitation`, `limited`, `limitedAll`, `limitFrequency`, `limitPeriod`, `rider`, `summonText`, `gerunds`, `gerund`, `ritualOf`, `ritualWhich`, `ritualTributes`, `ritualTotal`, `equippable`, `materialsLine`, `materials`, `material`, `materialsRelation` |

---

## 4. Ideal Answer Format

Structure every future slice completion or proposal into these **exact five sections**:

### 1. Scope & Target Kinds
- List modified files and exact grammar/schema kinds or ruling files.
- List target passcodes & card names (confirming pre-PSCT and broken-name cards were excluded).

### 2. Pattern Design & Overlap / Classification Rationale
- Markdown table documenting each added pattern or combinator:

| Kind | Pattern / Combinator | Semantic Output (`Draft` / `Applied` / `Condition` / `CardFilter` / `Move`) | Classification (`CONDITION` / `UNCLASSIFIED` / `CONTINUOUS` / `AUTO` / `TRIGGER` / `QUICK` / `IGNITION` / `ACTIVATE`) | Reuse & Anti-Overlap Strategy |
| --- | --- | --- | --- | --- |

- Explicitly confirm:
  - No `"words"` fallback added; `0` previously reading cards lost or broken.
  - Proper kinds & flags (`CONDITION` -> `CANNOT_DISABLE` + `UNCOPYABLE`; `UNCLASSIFIED` via `classOf` / negatable without `CANNOT_DISABLE`).
  - Overlap prevented via shared combinators / factored tails / `undefined` or `NoReading` guards.

### 3. Script & Ruling Verification Notes
- Cite exact `official/ygopro-scripts/c<code>.lua` files and `db-ygoresources-com` FAQs / `rulings/*.json` inspected.
- Call out any Lua script bugs or script-vs-text differences (confirming RML follows text + official rulings).

### 4. Exact TypeScript Code Changes
- Summarize changes per file, keeping code modular, strictly typed, and concisely commented on non-obvious *why*.

### 5. Verification Results
- Report exact post-edit check results:
  - `npm run check` (`tsc --noEmit -p .`): exit code & error count (`0`).
  - `npm test`: pass/fail counts (all `test/expected/*.json`, `rulings.test.ts` `textAlone`, and full `14,239`-card `cards.cdb` sweep with `0` ambiguities and `0` non-`TextStop` errors).
  - Survey delta (`readOk` before -> after, cards lost `0`, RML diff on previously reading cards, and representative newly reading sample cards).
