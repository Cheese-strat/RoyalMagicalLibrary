# EnglishReader Grammar — Status Board & Parallel Task Queue

This file is the **living status board** on `main` for EnglishReader grammar progress, settled schema decisions, non-negotiable constraints, and active parallel tasks. Workers should treat this file as **read-only** while executing a parallel task; the coordinator updates the status table after each task merges.

## 1. Current Baseline & Status Board (2026-11-21)

- **Corpus (`official/ygopro-database/locales/en-US/cards.cdb`, 14,239 cards):**
  - **1,721** read completely (`readOk`)
  - **2,364** pre-PSCT (ignored by policy)
  - **266** `names`-stage stops (broken quoted names / ignored by policy)
  - **9,888** PSCT `sentences`-stage stops remaining
- **Verification baseline:** `npm run check` (`0` TS errors), `npm test` (`152/152` passing, `0` ambiguities, `0` non-`TextStop` errors).

| Task | Status | Scope / Target Slice | Exclusive Owned Files | Schema / Core Touch | Dedicated Test File |
| --- | --- | --- | --- | --- | --- |
| **Slice 3 (Destruction Replacements Core)** | **Done** | `"(Once per turn,) If {replacedCards} would be destroyed..., (you can) {resolution} instead"` (`1,708 -> 1,721`) | `grammar/effects.ts`, `finish.ts`, `cardSchema.ts` | `EffectSchema.replaces` | `test/konamiReader.test.ts` |
| **Task 1** | **Ready** | Card filters: `"that mentions {name}"`, `"that was Special Summoned from..."`, `"this card points to"` post-mod, compound places | `src/builders/EnglishReader/grammar/cards.ts` | None | `test/grammar_cards.test.ts` |
| **Task 2** | **Ready** | Continuous rules: `"The first time ... would be destroyed"` (`noTurnReset`), Link-arrow subjects, `AVOID_BATTLE_DAMAGE`, Pendulum locks, Gemini, attack rules | `src/builders/EnglishReader/grammar/rules.ts` | `src/lib/cardSchema.ts` (**ONLY** `Applied.noTurnReset?: true`) | `test/grammar_rules.test.ts` |
| **Task 3** | **Ready** | Summon procedures & limits: Rank-Up / `"also Xyz Summon"`, Contact Fusion (`"the above cards"`), material-only restrictions, `"activate up to N ... per turn"` | `src/builders/EnglishReader/grammar/text.ts` | `src/builders/EnglishReader/konamiReader.ts` (**ONLY** if wiring `"the above cards"` to `materials`) | `test/grammar_text.test.ts` |
| **Task 4** | **Ready** | Moves & picks: burn `DAMAGE` / `GAIN_LP` / `PAY_LP`, `", up to the number of"`, `"with different names"`, multi-picks, flip/mill/attach/direct-from-Deck, Kewl Tune Cue/Rotary moves | `src/builders/EnglishReader/grammar/moves.ts`, `src/builders/EnglishReader/grammar/act.ts` | None | `test/grammar_moves_act.test.ts` |
| **Task 5** | **Ready** | Events & generalized replacements: battle/attack/draw/GY/End-Phase triggers, Slice 3 destruction-replacement tail + `s.count` guard, non-destruction replacements (`COST_REPLACE` e.g. Witchcrafter Walpurgis, `SEND_REPLACE`, redirects) | `src/builders/EnglishReader/grammar/effects.ts`, `src/builders/EnglishReader/finish.ts` | `src/lib/cardSchema.ts` (**ONLY** `Replacement` union on `EffectSchema.replaces`) | `test/grammar_effects.test.ts` |

---

## 2. Settled Conventions & Resolved Schema Decisions

### Effect Classification (`finish.ts` `classOf` & `cardSchema.ts`)
- **`CONDITION`**: Non-effect card text (*効果外テキスト* — `summonCondition()`, `"Equip only to ..."`, Kewl Tune hand-Synchro). Always gets `CANNOT_DISABLE` and `UNCOPYABLE` from `finishEffect`; opt-out of `"use each effect"` limits.
- **`UNCLASSIFIED`**: Monster effect classed by Konami's FAQ as none of Ignition / Trigger / Quick / Continuous — inferred by `classOf` when a monster's passive (`CONTINUOUS` or `AUTO`) effect applies off the field too (`where` outside `ON_FIELD`, e.g., GY/hand replacements like Relinkuriboh / Multi-Threader, Gemini GY Normal Monster treatment) or is a Summon material treatment (`DOUBLE_TRIBUTE`, `NONTUNER`). Negatable; excluded from `"use each effect"` limits.
- **`AUTO`**: Non-chain event/operation effects (Clear Wing, Clown Crew Meteor, Nervedo, Fabled Realm's Revival, on-field monster & Spell/Trap/Pendulum replacements). Keep as `AUTO`; `"you can"` is represented as `does[0].optional = true` (since `mandatory` is only for `TRIGGER`/`QUICK`/`FLIP`).
- **Summons (`SummonMethod.kind?` / `ExtraMaterials.kind?: "UNCLASSIFIED" | "CONDITION"`)**:
  - `unclassifiedProcedure` ([shared.ts](grammar/shared.ts)): player-chosen Special Summon procedures (`"(If ...,) you can Special Summon this card (from your hand)"`) and no-Tribute Normal Summons (`ruling: special-summon-and-no-tribute-procedures-are-unclassified`).
  - `conditionProcedure`: `"Must (first) be ..."`, `"You can also Xyz Summon..."`, Contact Fusion procedures, and `"You can Tribute Summon this card by Tributing ..."`. Every new procedure pattern must use one of these two helpers.
- **`CardRules.onlyOne`**: Unclassified effect (negatable); documented on the type, no extra field needed.
- **Kept targets (Decision B, done)**: `"Activate this card by targeting ..."` (`act.ts`, `keptActivation` in `shared.ts`) sets `ACTIVATE` ending in `KEEP_TARGETING`, with rule-only resolutions as separate `CONTINUOUS` `to: "CARD_IT_TARGETS"` effects and link events as `AUTO` with `contains(EVENT_CARDS, CARD_IT_TARGETS)`.

### Destruction & Non-Destruction Replacements (Decision A — Extended 2026-11-21)
- **Destruction replacements (done in Slice 3)**: `event: "DESTROY_REPLACE"`, `eventOf: "SELF" | "ANY"`, `replaces: { card, count }`, `does` = what happens instead (`does[0].optional = true` for `"you can"`). `REASON_REPLACE` and `STATUS_DESTROY_CONFIRMED` are general game rules added by writers, not stored per card. Pronouns stop after a replacement of other cards.
  - **Known Slice 3 bug to fix in Task 5**: `replacedCards` passes `s.noun` from `{s:quantifiedCards}` to `nowOn(...)` without checking `s.count`, which would silently drop `"2 or more"` / `"all"` / `"up to N"`. Guard `nowOn` to accept only `s.count === one` (not `s.upTo`).
- **Non-destruction replacements (generalizing `EffectSchema.replaces` for `Witchcrafter Walpurgis` & others — Task 5)**:
  - **Unconditional redirects** (`"If this face-up card would leave the field, banish it instead"`, `"would be sent from the field to the GY, place it on top of the Deck instead"` — Floowandereeze & Robina, Archlord Kristya, Valkyrie Erda) stay **`CONTINUOUS` `Applied`** (`LEAVE_FIELD_REDIRECT` / `TO_GRAVE_REDIRECT`, matching existing `test/expected/97556336.json`).
  - **True replacements with an action/choice** generalize `EffectSchema.replaces?: Replacement` into a union without breaking Slice 3:
    ```ts
    export type Replacement =
      // event: "DESTROY_REPLACE" | "SEND_REPLACE" | "RELEASE_REPLACE"
      | {
          card: CardFilter;
          count: Count;
          /** SEND_REPLACE: intended destination (DECK, EXTRA, GRAVE, HAND, REMOVED). */
          to?: Place[];
        }
      // event: "COST_REPLACE" (Witchcrafter Walpurgis/Bystreet/Scroll, S-Force World Sorting/Retroactive,
      // Ursarctic Departure, Prank-Kids Meow-Meow-Mu, Naturia Camellia, Revealer of the Ice Barrier,
      // Xyz Unit/Override/Daruma Dropper, Magical Citadel of Endymion, Brain Research Lab)
      | {
          /** Cost move replaced: DISCARD, TRIBUTE, BANISH, DETACH, REMOVE_COUNTER, PAY_LP, TO_GRAVE. */
          cost: MoveName;
          /** Card(s) that would be paid, when the cost pays specific cards. */
          card?: CardFilter;
          /** Counter kind, for REMOVE_COUNTER (e.g. Spell Counter). */
          counter?: string;
          /** "ALL" ("instead"), or 1 ("instead of 1 of those cards/materials"). */
          count: Count;
          /** Activation whose cost is replaced ("to activate the effect of a 'Witchcrafter' monster you control"). */
          forEffect: { player?: Side; card?: CardFilter; types?: string[]; summon?: boolean };
        }
      // event: "DAMAGE_REPLACE" (Black-Winged Dragon, Muscle Medic)
      | {
          damage: { player: Side; reasons?: string[] };
        };
    ```
  - Never imitate YGOPRO's card-ID player flags (`e3:SetCode(32353566)` on Witchcrafter Walpurgis or `83289866` on Bystreet/Scroll). RML states the declarative replacement semantics; writers handle engine-specific emission.
  - Pure damage reflection / normal-draw count changes (`"draw 2 cards instead of 1"`) remain `CONTINUOUS` `Applied`; Summon-material substitutions (`Ignis Heat`, `Condemned Darklord`) remain in `SummonMethod` / `ExtraMaterials`.

### `"The first time ... would be destroyed"` (`EFFECT_INDESTRUCTABLE_COUNT` — Decision for Task 2)
- **Schema decision**: Add optional **`noTurnReset?: true`** on `Applied` in `src/lib/cardSchema.ts`.
  - Omitted (`undefined`) = count resets each turn (default for `INDESTRUCTABLE_COUNT`, preserving `test/expected/62368221.json` unchanged).
  - `noTurnReset: true` = count does not reset across turns (`EFFECT_FLAG_NO_TURN_RESET`), used when `"each turn"` (and single-turn `"this turn"`) is absent: both standalone continuous effects (`Empty Machine` `9409625`) and multi-turn / permanent `GIVE_EFFECT` rules (`Catoblepas` `45955628`, `Purrely Happy Memory` `82105704`, `Tyrant Dino Fusion` `15543940`, `Hundred Dragon` `90788081`).
  - **Per-card vs shared once-per-turn**: `"The first time each X would be destroyed ... each turn"` (`Witchcrafter Bystreet`, `62368221`) sets `value: n` with no `EffectSchema.limit`; `"Once per turn, the first time a(n) X would be destroyed..."` (`Fateful Adventure` `39568067`) sets `EffectSchema.limit: SOFT` (`SetCountLimit(1)` shared across matching cards) alongside `INDESTRUCTABLE_COUNT`.

---

## 3. Non-Negotiable Rules & Parallel Execution Ground Rules

1. **No `"words"` fallback; ignore broken & DB-contradicts-text cards**: Never store raw text in `CardSchema`. Ignore:
   - Pre-PSCT (pre-2014) wordings (`"Graveyard"`, `"Magic Card"`, `"Life Points"`, `"-Type"`, `"removed from play"`).
   - Broken quoted names (`22873798` `"Hyenas"` — `266` `names`-stage stops).
   - **DB-contradicts-text anomaly cards** (e.g., `Genex Gaia`, where Konami's FAQ restricts `"destroy 1 'Genex Controller' you control"` to Monster Zones despite standard PSCT wording): treat like old card text and **ignore** rather than distorting general grammar or name picks.
2. **Factor tails & prevent overlap**: Reuse `listPatterns` / `commaTailPatterns` ([shared.ts](grammar/shared.ts)), `cardPostMod` ([cards.ts](grammar/cards.ts)), `specialSummonMods` / `butClause` ([moves.ts](grammar/moves.ts)), `destructionCause` / `sentToGyTail` / `activatedKind` ([effects.ts](grammar/effects.ts)), and `specialSummonLock` / `extraNormalSummon` ([rules.ts](grammar/rules.ts), [shared.ts](grammar/shared.ts)). Guard overlaps with `undefined` or `NoReading` so ambiguities stay `0` and `located()` + `textAlone(card)` round-trips pass.
3. **Cross-check scripts with salt**: Inspect `official/ygopro-scripts/c<code>.lua` alongside `db-ygoresources-com/yugioh-faq-history`. Scripts contain human bugs (e.g., `c16387555.lua` `GetOriginalType()&TYPE_TUNER==0`, `Blockout Curtain` missing OPT); canonical PSCT text + Konami rulings win.
4. **Parallel Execution Isolation Rules (for running Tasks 1–5 concurrently)**:
   - **Read-only shared files during parallel work** (do NOT edit in worker branches; coordinator updates on merge):
     - `src/builders/EnglishReader/grammar/shared.ts` (keep new task-local helpers inside your owned file; hoist common helpers only after merge)
     - `src/builders/EnglishReader/phrases.ts`
     - `src/builders/EnglishReader/grammar.ts` (`together(...)` dynamically merges all 6 files; doc comment updated on merge)
     - `src/builders/EnglishReader/README.md`
     - `src/builders/EnglishReader/GRAMMAR_TASK.md`
     - `test/konamiReader.test.ts` (each worker adds its own `test/grammar_<task>.test.ts`, automatically discovered by `npm test` -> `tsx --test test/*.test.ts`)
     - `src/builders/scriptWriters/*`, `test/ygoproWriter.test.ts`, `src/cli.ts`, `src/pipeline.ts` (separate WIP — never touch)
   - **Schema isolation (`src/lib/cardSchema.ts`)**: ONLY Task 2 (`Applied.noTurnReset?: true`, around line ~778) and Task 5 (`Replacement` union on `EffectSchema.replaces`, around line ~310) edit `cardSchema.ts` — ~450 lines apart, zero merge conflict. Tasks 1, 3, and 4 do NOT touch `cardSchema.ts`.
   - **Unique new kind names**: Because `together(...)` in `grammar.ts` throws on duplicate kind names, each task must prefix/stick strictly to its reserved kind names listed below.

---

## 4. Active Parallel Tasks (5 Disjoint Jobs)

### Task 1 — Card Filters, Mentions, Link-Arrow Post-Mods & Compound Places (`grammar/cards.ts`)
- **Exclusive files**: `src/builders/EnglishReader/grammar/cards.ts`, `test/grammar_cards.test.ts` (NO `cardSchema.ts` changes: `mentions`, `LINKED_TO_THIS`, `summonedFrom`, `summonedBy` already exist in `CardFilter` and `pointedTo` already exists in `shared.ts`).
- **Reserved new kind names**: `cardMentionMod`, `cardSummonOriginMod`, `compoundPlace`.
- **Scope & live PSCT stop targets**:
  1. `"that mentions {x:cardName}"` in `cardPostMod` (**62** first-stop / **116** total: `821049` Visas Amritara, `1047075` Fighting Flame Swordsman, `3078380` Timaeus the United Dragon -> `{ mentions: x }`). Note: `CardFilter.mentions` is `number[]`, so skip `"that mentions it"` (pronoun) unless using `mentionedBy` where appropriate.
  2. `"that was Special Summoned from the {l:placeList}"` (**18** first-stop: `3723262` Wizard @Ignister, `5969957` Rokket Recharger -> `{ summonedFrom: l.places }`) and `"that was {k:summonKind} Summoned"` (`{ summonedBy: [k] }`) in `cardPostMod`.
  3. `"this card points to"` in `cardPostMod` (reusing `pointedTo` from `shared.ts` -> `{ states: ["LINKED_TO_THIS"] }`; unlocks `"a monster(s) you control this card points to"` and `pluralSubject`'s `cardPostMod` hook; bare `"Monsters this card points to..."` without a place is handled in Task 2 with zero overlap).
  4. Compound places & Kewl Tune card-noun gaps: `"in your field or GY"`, `"in your GY or banishment"`, `"on the field or in the GY"`, `"except a Level {n:number} {x:cardNoun}"`, `"other {x:cardNoun}"` / `"Other {x:cardNoun} you control"`.
- **Acceptance**: `npm run check`, `npm test`, `0` ambiguities, `0` cards lost, unit tests in `test/grammar_cards.test.ts` covering mentions, Extra-Deck-summoned post-mod, Link-arrow post-mod, and compound places.

### Task 2 — Continuous Rules: `"The first time"` (`noTurnReset`), Link Subjects, Battle Damage, Pendulum Locks & Gemini (`grammar/rules.ts`)
- **Exclusive files**: `src/builders/EnglishReader/grammar/rules.ts`, `test/grammar_rules.test.ts`, plus **ONLY** `Applied.noTurnReset?: true` in `src/lib/cardSchema.ts` (around line ~778).
- **Reserved new kind names**: `indestructableCause`, `firstTimeSubject`, `pendulumLockException`, `battleDamageSide`.
- **Scope & live PSCT stop targets**:
  1. **Schema**: Add `noTurnReset?: true` with JSDoc on `Applied` in `cardSchema.ts` (keep `62368221.json` unchanged).
  2. **`"The first time ... would be destroyed"` (`EFFECT_INDESTRUCTABLE_COUNT`)** (**28** first-stop / **59** total: `6180710` Dream Shark, `9409625` Empty Machine, `12197223` Shiina, `12501230` Combat Wheel, `4398189` Witch of the White Forest, `83289866` Witchcrafter Bystreet, `45955628` Catoblepas, `82105704` Purrely Happy Memory):
     - Subjects: `this card` (`singleSubject`), `this face-up card (on the field)`, `each {singularAffectedSubject}`, `each of {pluralSubject}`.
     - Causes: `by battle`, `by card effect`, `by an opponent's card effect`, `by battle or card effect` (with `"each turn"` either before or after cause, as in Bystreet's `"each turn, by battle or card effect"`).
     - With `"each turn"` or `"this turn"`: omit `noTurnReset`; without either (`Empty Machine`, `Catoblepas`, `Purrely Happy Memory`, `Hundred Dragon`): set `noTurnReset: true`.
  3. **Link-arrow rule subjects** (**80** first-stop / **154** total across cards/rules: `4914353` Space Insulator, `1948619` Xtra HERO Wonder Driver, `8264361` Dharc the Dark Charmer): `"{x:cardNoun} this card points to"` in `pluralSubject` and `"a(n) {x:cardNoun} this card points to"` in `singularAffectedSubject` (`FIELD("BOTH")` + `pointedTo`, disjoint from `pluralSubject`'s `{at:fromOrInPlaces} {m:cardPostMod}`).
  4. **Battle damage immunity** (**32** first-stop / **80** total: `1218214` Cubic Dharma, `6616912` Gabrion, `7733560` Michion): `"You take no battle damage from attacks involving this card"` / `"Neither player takes any battle damage from attacks involving this card"` (`AVOID_BATTLE_DAMAGE`).
  5. **Pendulum Summon locks** (**22** first-stop / **26** total: `6830480` Twilight Ninja Kagen, `7279373` Abyss Actor - Twinkle Little Star, `11609969` D/D Savant Kepler): `"You cannot Pendulum Summon monsters, except {e:lockException}"` (`CANNOT_SPECIAL_SUMMON` with `summonTypes: ["PENDULUM"]` — check existing `specialSummonLock` shape in `shared.ts`).
  6. **Gemini Normal Monster rule** (**9** first-stop / **10** total: `3918345` Magical Reflect Slime, `16146511` Evocator Eveque): `"This card is treated as a Normal Monster while face-up on the field or in the GY"` (`ADD_TYPE` `"NORMAL"`, auto-classed `UNCLASSIFIED` by `classOf` because `where` includes `GRAVE`).
  7. **Common attack/destruction predicates** (`cannot attack`, `cannot attack the turn it is Summoned`, `can make a second attack during each Battle Phase` for Kewl Tune).
- **Acceptance**: `npm run check`, `npm test`, `0` ambiguities, `0` cards lost, unit tests in `test/grammar_rules.test.ts` verifying `Empty Machine` (`noTurnReset: true`), `Dream Shark` (no `noTurnReset`), `Space Insulator`, `Twilight Ninja Kagen`, and `Magical Reflect Slime` (`UNCLASSIFIED`).

### Task 3 — Summon Procedures, Contact Fusion, Rank-Up & Multi-Activation Limits (`grammar/text.ts`)
- **Exclusive files**: `src/builders/EnglishReader/grammar/text.ts`, `test/grammar_text.test.ts` (and `src/builders/EnglishReader/konamiReader.ts` **ONLY** if needed to resolve `"the above cards"` against printed `materials`).
- **Reserved new kind names**: `altXyzSummon`, `contactFusionCost`, `materialRestriction`.
- **Scope & live PSCT stop targets**:
  1. **Rank-Up / Xyz Change (`conditionProcedure`)** (**63** first-stop / **67** total: `1269512` Full Armored Utopic Ray Lancer, `2530830` Galaxy-Eyes Cipher Blade Dragon, `5833929` Melffy Godmommy, `7628844` Number C32): `"(Once per turn,) You can also Xyz Summon this card / {x:cardName} by using {s:quantifiedCards} you control (as material). (Transfer its materials to this card.)"`, guarded against TY-PHON's existing pattern.
  2. **Contact Fusion (`conditionProcedure`)** (**40** first-stop / **54** total: `1561110` ABC-Dragon Buster, `2111707` XY-Dragon Cannon, `3779662` Gladiator Beast Andabata, `17032740` Elemental HERO Chaos Neos): `"Must (first) be Special Summoned (from your Extra Deck) by shuffling/banishing/sending the above cards you control (and/or in your GY) into the Deck / to the GY."` (Do not require `"Polymerization"`).
  3. **Material-only & Synchro material restrictions**:
     - `"A Fusion/Synchro/Xyz Summon of this card can only be done with the above Fusion/Synchro/Xyz Materials."` (**10** first-stop: `1546123` Cyber End Dragon, `6150044` Arcana Knight Joker).
     - `"Cannot be used as material for a Synchro Summon, except for the Synchro Summon of {x:cardPhrase}."` (**12** first-stop: `1662004` Brotherhood of the Fire Fist - Spirit, `5998840` XX-Saber Boggart Knight).
  4. **Multi-activation hard OPT**: `"You can activate up to {n:number} {x:cardName} per turn."` (needed by Kewl Tune & others -> `Limit` with `count: n, oath: true`).
- **Acceptance**: `npm run check`, `npm test`, `0` ambiguities, `0` cards lost, unit tests in `test/grammar_text.test.ts` checking `kind: "CONDITION"` on Rank-Up & Contact Fusion, material restrictions, and `"up to N per turn"` limits.

### Task 4 — Moves, Picks & Costs: Burn/LP, Variable Targets, Distinct Names, Flip/Mill/Attach & Kewl Tune Moves (`grammar/moves.ts`, `grammar/act.ts`)
- **Exclusive files**: `src/builders/EnglishReader/grammar/moves.ts`, `src/builders/EnglishReader/grammar/act.ts`, `test/grammar_moves_act.test.ts` (NO `cardSchema.ts` changes: `DAMAGE`, `GAIN_LP`, `PAY_LP`, `CHANGE_POSITION`, `TO_GRAVE`, `ATTACH`, `SET`, `PickCount`, `pickRequires`, `deckTop` already exist).
- **Reserved new kind names**: `damageAmount`, `distinctPick`, `multiTarget`, `excavateMove`.
- **Scope & live PSCT stop targets**:
  1. **Burn damage & LP moves** (**160** + **39** + **68** first-stop: `212652`, `324483` Ultimate Flame Swordsman, `4446672` Ancient Gear Explosive, `6556909` Red-Eyes Soul, `1527418` Wiz, `8842266` Poison of the Old Man, `197042` Exosister Returnia):
     - `"inflict {n:number} damage to your opponent"`, `"inflict damage to your opponent equal to {v:amount}"` (`DAMAGE`).
     - `"gain {n:number} LP"`, `"gain LP equal to {v:amount}"` (`GAIN_LP`).
     - Missing `PAY_LP` cost/activation forms (`"pay {n:number} LP"` in `act.ts` cost chains).
  2. **Variable targets & distinct-name / multi-picks**:
     - `", up to the number of {c:counted}"` WITH comma (**30** exact stop prefix / **45** first-stop: `464362` Frightfur Tiger, `13662809` Abyss Script, `5043010` Firewall Dragon; `act.ts` already handles without comma).
     - `"with different names"` on picks (**94** first-stop / **274** total: `938717` Boot-Up Corporal, `4837861` Meklord Astro Dragon Triskelion -> `pickRequires` using `{ different: { cards: THIS_PICK, by: "NAME" } }`, matching `moves.ts` line 177's `by: "PLACE"` pattern).
     - Two-group targets: `"{t1} and {t2}"` (`"1 ... you control and 1 card your opponent controls;"`, **14** exact stop prefix: `2759860` Graydle Impact).
  3. **High-frequency utility moves**:
     - `"change it/them/{pick} to face-down Defense Position"` / `"change its battle position"` (**58** + **8** first-stop: `359563` Evilswarm Nightmare, `38459905` F.A. Test Run -> `CHANGE_POSITION`).
     - `"send the top {n:number} cards of your Deck to the GY"` (**17** first-stop: `572850` Tearlaments Scheiren, `13171876` Laundry Dragonmaid -> `TO_GRAVE` on `deckTop`).
     - `"attach this card to it as material"` (**12** first-stop: `1735088` Wind-Up Zenmaintenance, `6812770` Performage Cup Tricker -> `ATTACH`).
     - `"Set / place {pick} directly from your Deck"` (**39** first-stop: `645794` Majespecter Toad, `6353603` Fire Fist - Bear).
  4. **Kewl Tune moves**:
     - `"for the rest of this turn you cannot ..."` without comma (unblocks `16387555` Kewl Tune Cue + 8 others).
     - Excavate top N cards (`"excavate the top {n} cards of ..."` **18** first-stop), place on top/bottom of Deck, reveal in hand (`16387555` Cue, `17209452` Rotary).
- **Acceptance**: `npm run check`, `npm test`, `0` ambiguities, `0` cards lost, unit tests in `test/grammar_moves_act.test.ts` covering burn/LP, `, up to the number of`, `with different names`, `CHANGE_POSITION` face-down, `deckTop` mill, `ATTACH`, and Kewl Tune Cue's no-comma lock.

### Task 5 — Events, Triggers & Generalized Replacements (`grammar/effects.ts`, `finish.ts`, `EffectSchema.replaces`)
- **Exclusive files**: `src/builders/EnglishReader/grammar/effects.ts`, `src/builders/EnglishReader/finish.ts`, `test/grammar_effects.test.ts`, plus **ONLY** the `Replacement` union / `EffectSchema.replaces` type in `src/lib/cardSchema.ts` (around line ~310, disjoint from Task 2's `Applied` at line ~778).
- **Reserved new kind names**: `replacedCost`, `replacedEffectOwner`, `replacedSend`, `battleTriggerEvent`, `gyTurnCondition`.
- **Scope & live PSCT stop targets**:
  1. **Schema (`cardSchema.ts`)**: Generalize `EffectSchema.replaces?: Replacement` to the 3-branch union defined in Section 2 (`DESTROY_REPLACE`/`SEND_REPLACE`/`RELEASE_REPLACE`, `COST_REPLACE`, `DAMAGE_REPLACE`). Verify zero diffs on Slice 3's 13 cards (`Dinomist Pteran`, `Blockout Curtain`, `Relinkuriboh`, etc.).
  2. **Slice 3 destruction-replacement cleanup**:
     - Fix `nowOn` in `effects.ts` to reject `s.count !== one || s.upTo` so `"2 or more"` / `"all"` never silently drop their count.
     - Add remaining Slice 3 destruction-replacement shapes: places after subject (`"in your Spell & Trap Zone"`, `"on the field"`), `"If it would be destroyed"` after equip (`Fighting Spirit`, `Legendary Ebon Steed`), trailing condition clauses (`"while this card is in your GY"`, `"except the turn this card was sent to the GY"`, `"while you control ..."`).
  3. **Non-destruction replacements**:
     - **Cost replacements (`COST_REPLACE`)**: `"if (you / {card}) would discard / Tribute / banish / detach ... to activate (the effect of {card} / an effect), you can {resolution} instead (of 1 of those cards/materials)."` — verify on **Witchcrafter Walpurgis** (`32353566`), **Witchcrafter Bystreet** (`83289866`), **Witchcrafter Scroll** (`19673561`), **S-Force World Sorting** (`11642993`), **S-Force Retroactive** (`53782828`), **Ursarctic Departure** (`16471775`), **Naturia Camellia** (`29942771`), **Xyz Override** (`32999573`), **Daruma Dropper** (`35394356`). Ensure off-field monsters (`S-Force Retroactive`, `Revealer of the Ice Barrier`, `Prank-Kids Meow-Meow-Mu`) classify as `UNCLASSIFIED` via `classOf`.
     - **Leave-field / send redirects** (`CONTINUOUS` `Applied` `LEAVE_FIELD_REDIRECT` / `TO_GRAVE_REDIRECT`): `"If this face-up card would leave the field, banish it instead."` (`18940725` Floowandereeze & Robina, `17827173` Toccan, `3806388` Core of Chaos) and `"If this face-up card would be sent from the field to the GY, ... instead."` (`59509952` Archlord Kristya).
  4. **High-frequency triggers & conditions**:
     - Battle triggers: `"When/If this card battles an opponent's monster,"` (**46** first-stop / **127** total: `122520`, `1580833` Dinomist Stegosaur, `2405631` Guoglim) and `"When an attack is declared"` / `"When an opponent's monster declares an attack"` (**32** first-stop: `1118137`, `7407724`).
     - Draw & GY triggers: `"When you draw this card: You can reveal it;"` (**13** first-stop: `5298175`, `6311717` Fortune Fairy Hikari), `"sent to the GY by (a) card effect:"` / `"discarded to the GY by card effect:"` (**23** first-stop: `3717252` Shaddoll Beast, `3289027` Parl), `"During the End Phase, if this card is in the GY because it was sent there this turn:"` (**10** first-stop: `19337371`, `31383545`).
     - Common conditions: `"except the turn this card was sent to the GY"` (**17** first-stop), `"while this card is in your GY"` (**13** first-stop), `"your LP are lower than your opponent's"` (**10** first-stop).
- **Acceptance**: `npm run check`, `npm test`, `0` ambiguities, `0` cards lost, unit tests in `test/grammar_effects.test.ts` covering `Witchcrafter Walpurgis` (`32353566`, `COST_REPLACE`), `Floowandereeze & Robina` (`LEAVE_FIELD_REDIRECT`), `Dinomist Stegosaur`, `Shaddoll Beast`, and the `nowOn` `s.count` guard.

---

## 5. Remaining Backlog (After Tasks 1–5 Merge)
- **Rest of `"Activate this card by ..."`**: `"declaring"` (**6**), `"choosing"` (**2**), `"placing N counters on it"` (**3**), targeting then equipping (`what-an-equip-by-effect-gives-the-monster`), Fiendish Chain / Fog Blade (`"negate the effects of that face-up monster while it is on the field"`), Shattered Axe (`"During each of your Standby Phases: It loses 500 ATK"`), plus decision on `notes/implied-kept-targets.md`.
- **Remaining Kewl Tune mechanics**: Crackle & Clip (look at opponent's Extra Deck + banish until End Phase), B2B / Remix (apply GY Synchro Material effect, choose 2 -> add 1 / Special Summon other).
- **Spell Counters & Trap Monsters**: `"place 1 Spell Counter on this card"` (**83** placeCounter / **50** Spell Counter), `"Special Summon this card as an Effect Monster"` (**23** first-stop).
- **Remaining non-destruction replacement families**: `SEND_REPLACE` with choice (`Madolche Chateau`, `Neos Fusion`), `DAMAGE_REPLACE` (`Black-Winged Dragon`, `Muscle Medic`), Draw Phase replacements (`"instead of conducting your normal draw"`).

---

## 6. Ideal Answer Format (Required for Every Completed Task)

Structure every task completion report into these **exact five sections**:

### 1. Scope & Target Kinds
- List modified/created files and exact grammar/schema kinds or ruling files.
- List target passcodes & card names (confirming pre-PSCT, broken-name, and DB-contradicts-text anomaly cards were excluded).

### 2. Pattern Design & Overlap / Classification Rationale
| Kind | Pattern / Combinator | Semantic Output (`Draft` / `Applied` / `Condition` / `CardFilter` / `Move`) | Classification (`CONDITION` / `UNCLASSIFIED` / `CONTINUOUS` / `AUTO` / `TRIGGER` / `QUICK` / `IGNITION` / `ACTIVATE`) | Reuse & Anti-Overlap Strategy |
| --- | --- | --- | --- | --- |
- Confirm: no `"words"` fallback; `0` previously reading cards lost or broken; proper kinds & flags; overlap guarded via shared combinators / factored tails / `undefined` or `NoReading`.

### 3. Script & Ruling Verification Notes
- Cite exact `official/ygopro-scripts/c<code>.lua` files and `db-ygoresources-com` FAQs / `rulings/*.json` inspected.
- Call out Lua script bugs or script-vs-text differences (confirming text + official rulings win).

### 4. Exact TypeScript Code Changes
- Summarize changes per file, keeping code modular, strictly typed, and concisely commented on non-obvious *why*.

### 5. Verification Results
- `npm run check` (`tsc --noEmit -p .`): exit code & error count (`0`).
- `npm test`: pass/fail counts (all fixtures, `rulings.test.ts` `textAlone`, new `test/grammar_<task>.test.ts`, full 14,239-card `cards.cdb` sweep with `0` ambiguities and `0` non-`TextStop` errors).
- Survey delta (`readOk` before -> after, `0` cards lost, RML diff on previously reading cards, and representative newly reading sample cards).
