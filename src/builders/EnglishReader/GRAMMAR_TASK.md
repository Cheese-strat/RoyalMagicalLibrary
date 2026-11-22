# EnglishReader Grammar — Status Board & Parallel Task Queue

This file is the **living status board** on `main` for EnglishReader grammar progress, settled schema decisions, non-negotiable constraints, and active parallel tasks. Workers should treat this file as **read-only** while executing a parallel task; the coordinator updates the status table and shared docs (`grammar.ts`, `README.md`, `GRAMMAR_TASK.md`) after each wave merges.

## 1. Current Baseline & Status Board (2026-11-22)

- **Corpus (`official/ygopro-database/locales/en-US/cards.cdb`, 14,239 cards):**
  - **1,953** read completely (`readOk`, up **+232** from 1,721 after Tasks 1–5 combined)
  - **2,364** pre-PSCT (ignored by policy)
  - **266** `names`-stage stops (broken quoted names / ignored by policy)
  - **9,656** PSCT `sentences`-stage stops remaining
- **Verification baseline:** `npm run check` (`0` TS errors), `npm test` (`215/215` passing across `test/*.test.ts`, `0` ambiguities, `0` non-`TextStop` errors).

| Task | Status | Scope / Target Slice | Exclusive Owned Files | Schema / Core / Ruling Touch | Dedicated Test File |
| --- | --- | --- | --- | --- | --- |
| **Slice 3** | **Done (`131912a2`)** | Destruction replacements (`1,708 -> 1,721`) | `grammar/effects.ts`, `finish.ts`, `cardSchema.ts` | `Replacement` (destruction) | `test/konamiReader.test.ts` |
| **Task 1** | **Done (uncommitted)** | `cards.ts`: `"that mentions X"`, `"Special Summoned from..."`, `"this card points to"` post-mod, compound places (`1,721 -> 1,742` solo) | `grammar/cards.ts` | None | `test/grammar_cards.test.ts` |
| **Task 2** | **Done (uncommitted)** | `rules.ts`: `"The first time"` (`noTurnReset`), Link subjects, `AVOID_BATTLE_DAMAGE`, Pendulum locks, Gemini rule, `DEFENSE_ATTACK` | `grammar/rules.ts` | `cardSchema.ts`: `Applied.noTurnReset` | `test/grammar_rules.test.ts` |
| **Task 3** | **Done (uncommitted)** | `text.ts`: Rank-Up (`57` FAQs), Contact Fusion (`"the above cards"`), material restrictions (`CONDITION`), `up to N per turn` | `grammar/text.ts`, `konamiReader.ts`, `phrases.ts` | `rulings/general/material-restrictions-are-not-effects.json` | `test/grammar_text.test.ts` |
| **Task 4** | **Done (uncommitted)** | `moves.ts` + `act.ts`: burn `DAMAGE` / `GAIN_LP` (round UP), `", up to the number of"`, `"with different names"`, multi-targets, face-down flip, mill, `ATTACH`, direct Deck Set, Kewl Tune Rotary | `grammar/moves.ts`, `grammar/act.ts` | None | `test/grammar_moves_act.test.ts` |
| **Task 5** | **Done (uncommitted)** | `effects.ts` + `finish.ts`: `COST_REPLACE` (Walpurgis/Bystreet/Scroll/S-Force/Ursarctic), redirects (`UNCLASSIFIED`), battle/draw/GY triggers, `nowOn` count guard | `grammar/effects.ts`, `finish.ts` | `cardSchema.ts`: `Replacement` union; `rulings/general/a-redirect-applies-as-the-card-leaves.json` | `test/grammar_effects.test.ts` |
| **Task 6 (Wave 2)** | **Ready** | `text.ts` + `konamiReader.ts`: `"This effect cannot be negated."`, Gemini reminder, after-equip `"If it would be destroyed"`, `named-fusion-materials-allow-substitutes` ruling | `src/builders/EnglishReader/grammar/text.ts`, `src/builders/EnglishReader/konamiReader.ts` | `rulings/general/named-fusion-materials-allow-substitutes.json` | `test/grammar_w2_text.test.ts` |
| **Task 7 (Wave 2)** | **Ready** | `effects.ts` + `finish.ts`: Gemini `selfPlaces`, `"Cannot attack the turn it is Summoned"`, battle rules with no moment, remaining `COST_REPLACE` (detach, `"Tribute itself"`, Revealer, Camellia), `"change that Special Summoned"` | `src/builders/EnglishReader/grammar/effects.ts`, `src/builders/EnglishReader/finish.ts` | None | `test/grammar_w2_effects.test.ts` |
| **Task 8 (Wave 2)** | **Ready** | `cards.ts`: `"for each monster they control"`, `"in/to your Spell & Trap Zone"` (`as a Continuous Spell/Trap`), `"ATK less than or equal to"`, compound GY/banish/field places | `src/builders/EnglishReader/grammar/cards.ts` | None | `test/grammar_w2_cards.test.ts` |
| **Task 9 (Wave 2)** | **Ready** | `moves.ts` + `act.ts`: `"pay half your LP"` (`fractions-round-up`), top-or-bottom `deckPlace` (`Kewl Tune Cue`), `"destroy those monsters"` (`Dinomist Stegosaur`), move-level `"first time"` (`Tyrant Dino Fusion` / `Purrely Happy Memory`), `"Activate 1 X directly from your Deck"` (`ACTIVATE_CARD`) | `src/builders/EnglishReader/grammar/moves.ts`, `src/builders/EnglishReader/grammar/act.ts` | `src/lib/cardSchema.ts` (**ONLY** `MoveName` `"ACTIVATE_CARD"` & `deckPlace` JSDoc); `rulings/general/fractions-round-up.json` | `test/grammar_w2_moves_act.test.ts` |
| **Task 10 (Wave 2)** | **Ready** | `rules.ts`: shared-limit `"Once per turn, the first time a(n) X..."` (`Fateful Adventure`), `"an Equip Card, the equipped monster"`, `"while face-up on the field, this card is also..."`, `"this card cannot be destroyed"`, hand-activation & Runick skips | `src/builders/EnglishReader/grammar/rules.ts` | None | `test/grammar_w2_rules.test.ts` |

---

## 2. Settled Conventions & Resolved Schema Decisions

### Effect Classification (`finish.ts` `classOf` & `cardSchema.ts`)
- **`CONDITION`**: Non-effect card text (*効果外テキスト* — `summonCondition()`, `"Equip only to ..."`, Kewl Tune hand-Synchro, material restrictions per `material-restrictions-are-not-effects`). Always gets `CANNOT_DISABLE` and `UNCOPYABLE` from `finishEffect`; opt-out of `"use each effect"` limits.
- **`UNCLASSIFIED`**: Monster effect classed by Konami's FAQ as none of Ignition / Trigger / Quick / Continuous — inferred by `classOf` when a monster's passive (`CONTINUOUS` or `AUTO`) effect applies off the field too (`where` outside `ON_FIELD`, e.g. GY/hand replacements or Gemini GY Normal Monster treatment), is a Summon material treatment (`DOUBLE_TRIBUTE`, `NONTUNER`), or is a leave-field/GY redirect (`a-redirect-applies-as-the-card-leaves`, which also gets `CANNOT_DISABLE` and no `from` range because it applies even under Skill Drain or in a Spell & Trap Zone). Negatable (except redirects); excluded from `"use each effect"` limits.
- **`AUTO`**: Non-chain event/operation effects (Clear Wing, Clown Crew Meteor, Nervedo, Fabled Realm's Revival, on-field monster & Spell/Trap/Pendulum replacements, and Spell/Trap cost replacements like Witchcrafter Walpurgis / Bystreet / Scroll). `"you can"` is `does[0].optional = true` (since `mandatory` is only for `TRIGGER`/`QUICK`/`FLIP`).
- **Summons (`SummonMethod.kind?` / `ExtraMaterials.kind?: "UNCLASSIFIED" | "CONDITION"`)**:
  - `unclassifiedProcedure` ([shared.ts](grammar/shared.ts)): player-chosen Special Summon procedures (`"(If ...,) you can Special Summon this card (from your hand)"`) and no-Tribute Normal Summons (`special-summon-and-no-tribute-procedures-are-unclassified`).
  - `conditionProcedure`: `"Must (first) be ..."`, `"You can also Xyz Summon..."` (Rank-Up), Contact Fusion procedures (`"the above cards"`, defaulting `from: ["EXTRA"]` when `"from your Extra Deck"` is omitted), and `"You can Tribute Summon this card by Tributing ..."`. Keep Contact Fusion's uniform `located()` face-up check (no special-case simplifier).
- **`CardRules.onlyOne`**: Unclassified effect (negatable); documented on the type.
- **Kept targets (Decision B)**: `"Activate this card by targeting ..."` (`act.ts`, `keptActivation`) sets `ACTIVATE` ending in `KEEP_TARGETING`, with rule-only resolutions as `CONTINUOUS` `to: "CARD_IT_TARGETS"` and link events as `AUTO` with `contains(EVENT_CARDS, CARD_IT_TARGETS)`.

### Replacements & Redirects
- **Destruction replacements (`DESTROY_REPLACE`)**: `eventOf: "SELF" | "ANY"`, `replaces: { card, count }`, `does` = what happens instead. `REASON_REPLACE` and `STATUS_DESTROY_CONFIRMED` are general rules emitted by writers. `nowOn` rejects `s.count !== one || s.upTo`.
- **Cost replacements (`COST_REPLACE`)**: `replaces: { cost, card?, count, forEffect }` (Witchcrafter Walpurgis, Bystreet, Scroll, S-Force World Sorting / Retroactive, Ursarctic Departure). Never imitate YGOPRO's card-ID player flags (`32353566`, `83289866`) in RML — RML stays declarative and script writers emit engine-specific hooks.
- **Redirects (`LEAVE_FIELD_REDIRECT` / `TO_GRAVE_REDIRECT`)**: `"If this face-up card would leave the field, banish it instead"` (`Floowandereeze & Robina`, `Core of Chaos`) and `"would be sent from the field to the GY, place it on top of the Deck instead"` (`Archlord Kristya`) stay `CONTINUOUS` `Applied` (becoming `UNCLASSIFIED` with `CANNOT_DISABLE` and no `from` range on monsters per `a-redirect-applies-as-the-card-leaves`). Keep `TO_GRAVE_REDIRECT` on Kristya — YGOPRO writers convert it to `LEAVE_FIELD_REDIRECT` + GY destination check.

### `"The first time ... would be destroyed"` (`EFFECT_INDESTRUCTABLE_COUNT`)
- **`Applied.noTurnReset?: true`** (done in Task 2): Omitted = resets each turn (`Dream Shark`, `Witchcrafter Bystreet`, `62368221.json`); `true` = never resets across turns (`EFFECT_FLAG_NO_TURN_RESET`: `Empty Machine`, `Purrely Happy Memory`, `Tyrant Dino Fusion`).
- **Correction**: `Catoblepas` (`45955628`) is `"once, until the end of the next turn, that card cannot be destroyed"`, not `"the first time"`.
- **Shared limit (`Fateful Adventure`, Task 10)**: `"Once per turn, the first time a(n) X would be destroyed..."` sets `INDESTRUCTABLE_COUNT` alongside `EffectSchema.limit: SOFT` (one shared count across matching cards per turn).

### Wave 2 Resolved Schema & Ruling Decisions (2026-11-22)
1. **Halving & LP rounding (`fractions-round-up` ruling — Task 9):**
   - Under Konami's *Perfect Rulebook*, fractional values resulting from halving round **up** (`ceil`):
     - Halving ATK / DEF / burn damage / LP gain (`"equal to half its original ATK"`): `round: "UP"` (`math.ceil(x / 2)` — Task 4 is right; older Lua scripts like `c4446672.lua` / `c53981499.lua` using `math.floor` are script bugs, while `c24689197.lua` uses `math.ceil`).
     - **`"pay half your LP"`**: **remaining** LP rounds up (`ceil(LP / 2)`, so 1 LP stays 1 LP), which means the **cost paid** (`PAY_LP.amount`) is **`round: "DOWN"`** (`{ divide: [{ lifePoints: "OWN" }, 2], round: "DOWN" }`, matching `c41420027.lua` Solemn Judgment and `c8949584.lua` A Hero Lives).
2. **Top-or-bottom Deck choice (`Move.deckPlace` — Task 9):**
   - For Kewl Tune Cue (`16387555`) and the other `"place ... on the top or bottom of the Deck"` cards (**18** stops), two-valued `deckPlace: ["DECKTOP", "DECKBOT"]` means the player chooses top or bottom as the move resolves (paralleling `Move.position: ["FACEUP_ATTACK", "FACEUP_DEFENSE"]`). Clarify in `cardSchema.ts` JSDoc; no `modes` inside move lists needed.
3. **Activating a card directly from Deck/GY (`MoveName` `"ACTIVATE_CARD"` — Task 9):**
   - Add `"ACTIVATE_CARD"` to `MoveName` in `src/lib/cardSchema.ts` (distinct from `"PLACE"`: puts the card in its zone as an activation and runs its activation legality/cost/Field Spell activation events, matching `c7496001.lua` Springans Booty and `c22900598.lua` Vampire Takeover).
4. **Fusion Substitutes (`named-fusion-materials-allow-substitutes` — Task 6):**
   - Add an `ADDITION` ruling setting `substitutes: true` on `FUSION` summons whose materials name specific cards, unless the card's text sets `substitutes: false` (`"can only be done with the above Fusion Materials"`). Unblocks the YGOPRO writer's Fusion substitute check cleanly.
5. **Kewl Tune Rotary (`17209452`)**: Keep `NOT_SELF` on the revealed Tuner (script agrees) and keep Normal Summon hand-only (Gemini Monster Zone re-summon belongs to general Gemini rules).

---

## 3. Non-Negotiable Rules & Parallel Execution Ground Rules

1. **No `"words"` fallback; ignore broken, pre-PSCT & DB-contradicts-text cards**:
   - Ignore pre-PSCT (pre-2014) wordings (`"Graveyard"`, `"Magic Card"`, `"Life Points"`, `"-Type"`, `"removed from play"`), broken quoted names (`22873798` `"Hyenas"` — `266` `names`-stage stops), and DB-contradicts-text anomalies (`Genex Gaia`). Also skip one-off archaic/unique texts listed in Task 3 (`Gaiodiaz`, `Yaguramaru`, `Trishula`, `Armed Dragon Catapult Cannon`).
2. **Factor tails & prevent overlap**: Reuse `listPatterns` / `commaTailPatterns` ([shared.ts](grammar/shared.ts)) and existing combinators. Guard overlaps with `undefined` or `NoReading` so ambiguities stay `0` and `located()` + `textAlone(card)` round-trips pass.
3. **Cross-check scripts with salt**: Check `official/ygopro-scripts/c<code>.lua` alongside `db-ygoresources-com/yugioh-faq-history`; card text + official rulings win over script bugs (e.g. `c4446672.lua` floor rounding, `c16387555.lua` `GetOriginalType()`, `Blockout Curtain` missing OPT).
4. **Parallel Execution Isolation Rules (Wave 2: Tasks 6–10):**
   - **Read-only shared files during parallel work** (coordinator updates after merge):
     - `src/builders/EnglishReader/grammar/shared.ts`
     - `src/builders/EnglishReader/phrases.ts` (if Task 6 doesn't need to edit `phrases.ts`, keep helpers in `text.ts`/`konamiReader.ts`; otherwise note explicitly)
     - `src/builders/EnglishReader/grammar.ts`
     - `src/builders/EnglishReader/README.md`
     - `src/builders/EnglishReader/GRAMMAR_TASK.md`
     - `test/konamiReader.test.ts`
     - `src/builders/scriptWriters/*`, `test/ygoproWriter.test.ts`, `src/cli.ts`, `src/pipeline.ts` (never touch)
   - **Schema isolation (`src/lib/cardSchema.ts`)**: ONLY **Task 9** edits `cardSchema.ts` in Wave 2 (`MoveName` `"ACTIVATE_CARD"` + `deckPlace` JSDoc). Tasks 6, 7, 8, and 10 do NOT touch `cardSchema.ts`.
   - **Unique new kind names**: Every worker must use only its reserved new kind names (guaranteed disjoint from all existing kinds and sibling tasks).

---

## 4. Active Parallel Tasks — Wave 2 (5 Disjoint Jobs)

### Task 6 — Negation Riders, Gemini Reminder, Equip Follow-ups & Fusion Substitutes (`grammar/text.ts`, `konamiReader.ts`)
- **Exclusive files**: `src/builders/EnglishReader/grammar/text.ts`, `src/builders/EnglishReader/konamiReader.ts`, `rulings/general/named-fusion-materials-allow-substitutes.json`, `test/grammar_w2_text.test.ts`.
- **Reserved new kind names**: `cannotBeNegatedRider`, `geminiReminder`, `equipFollowup`.
- **Scope & live PSCT stop targets**:
  1. **Unnegatable effect riders**: `"This effect cannot be negated."` and `"(this effect cannot be negated)"` (**29** cards remaining — unblocks ~21 Pendulum-lock cards incl. `6830480` Twilight Ninja Kagen and `7279373` Abyss Actor - Twinkle Little Star; sets `flags: ["CANNOT_NEGATE"]` / appropriate flag via `rider` -> `konamiReader.ts`).
  2. **Gemini reminder sentence**: `"While this card is a Normal Monster on the field, you can Normal Summon it to have it become an Effect Monster with this effect."` (**9** PSCT Gemini cards + `Mokey Mokey Adrift` — pairs with Task 7's `selfPlaces` to complete all Gemini cards).
  3. **Equip follow-up replacement/protection**: `"If it would be destroyed"` immediately after an equip sentence (`6178850` Fighting Spirit, `1200843` Mirror of Yata, `12324546` Legendary Ebon Steed — **5** cards; resolves `"It"` to `EQUIPPED_MONSTER` in `konamiReader.ts` / `sentence` context).
  4. **Fusion substitutes ruling**: `rulings/general/named-fusion-materials-allow-substitutes.json` (`ADDITION`, `APPLIED`: gives named Fusion materials `substitutes: true` unless `substitutes: false`).
  5. **Independent persistence rider**: `"(even if this card leaves the field)"` (**9** stops).
- **Acceptance**: `npm run check`, `npm test`, `0` ambiguities, `0` cards lost, unit tests in `test/grammar_w2_text.test.ts`.

### Task 7 — Gemini `selfPlaces`, Summon-Turn Locks, Battle Rules & Remaining Cost Replacements (`grammar/effects.ts`, `finish.ts`)
- **Exclusive files**: `src/builders/EnglishReader/grammar/effects.ts`, `src/builders/EnglishReader/finish.ts`, `test/grammar_w2_effects.test.ts`.
- **Reserved new kind names**: `battleNoMomentRule`, `summonedThisTurnLock`, `equippedHeader`, `detachReplacedCost`.
- **Scope & live PSCT stop targets**:
  1. **Gemini `selfPlaces`**: `"face-up on the field or in the GY"` -> `["ONFIELD", "GRAVE"]` (**9** stops: `3918345` Magical Reflect Slime, `16146511` Evocator Eveque; pairs with Task 6's reminder).
  2. **Summon-turn attack locks**: `"Cannot attack the turn it is (Normal/Special/Flip) Summoned."` (**18** cards: `7171149` Toon Ancient Gear Golem, etc. — condition on effect as `summonedThisTurn` / `TURN` check, paralleling `"Cannot be used as material the turn it is Summoned"`).
  3. **Battle rules with no moment**: `"If this card battles, your opponent cannot activate cards or effects until the end of the Damage Step."` (**8–9** cards: `7782069` Gouki The Tyrant Ogre, `22900219` Dinowrestler Chimera T Wrextle).
  4. **Remaining cost replacements (`COST_REPLACE`)**:
     - `"Tribute itself"` (`25725326` Prank-Kids Meow-Meow-Mu, `84012625` Cosmic Flare — **2** cards);
     - Detach costs (`32999573` Xyz Override, `35394356` Daruma Dropper, `55067058` Number 19: Freezadon, `Zoodiac Gathering` — **4** cards);
     - Multi-cost / mill replacements (`18319762` Revealer of the Ice Barrier, `29942771` Naturia Camellia).
  5. **High-frequency trigger/condition headers**: `"If this card is equipped to a monster:"` (**9** stops), `"was activated this turn:"` (**9** stops), `"was Normal or Special Summoned this turn"` (**8** stops), and `"change that Special Summoned monster(s)"` event referent (`359563` Evilswarm Nightmare).
- **Acceptance**: `npm run check`, `npm test`, `0` ambiguities, `0` cards lost, unit tests in `test/grammar_w2_effects.test.ts`.

### Task 8 — Card Filters: `"they control"`, Spell & Trap Zone Targets & ATK Comparisons (`grammar/cards.ts`)
- **Exclusive files**: `src/builders/EnglishReader/grammar/cards.ts`, `test/grammar_w2_cards.test.ts`.
- **Reserved new kind names**: `theyControlPlace`, `szoneAsCardMod`, `atkCompareMod`.
- **Scope & live PSCT stop targets**:
  1. `"for each monster they control"` (**5** cards: `2316186` Princess Curran, `20264508` Thunder Short, `24068492` Just Desserts) and `"they control"` place variants.
  2. Spell & Trap Zone places & Continuous Spell/Trap post-mods: `"in your Spell & Trap Zone"` / `"to your Spell & Trap Zone"` / `"in your Spell & Trap Zone as a Continuous Spell/Trap"` (**12** + **11** + **10** + **8** stops: `8571567` Blackwing - Shamal, `17947697` Maiden of White, `4160316` Centur-Ion Bonds, `3574681` Golden Rule).
  3. Dynamic ATK/DEF comparisons: `"ATK less than or equal to {v:amount}"` / `"whose ATK is less than or equal to ..."` (**8** stops: `14602126` Xyz Import).
  4. Remaining compound places (`"or in your GY"` / `"in your hand or GY"` variants missed in Task 1 — **8** stops).
- **Acceptance**: `npm run check`, `npm test`, `0` ambiguities, `0` cards lost, unit tests in `test/grammar_w2_cards.test.ts`.

### Task 9 — Moves & Costs: Half-LP Costs, Top-or-Bottom Deck Choice, Kewl Tune Cue & `Dinomist Stegosaur` (`grammar/moves.ts`, `grammar/act.ts`, `cardSchema.ts`)
- **Exclusive files**: `src/builders/EnglishReader/grammar/moves.ts`, `src/builders/EnglishReader/grammar/act.ts`, `rulings/general/fractions-round-up.json`, `test/grammar_w2_moves_act.test.ts`, plus **ONLY** `MoveName` `"ACTIVATE_CARD"` and `Move.deckPlace` JSDoc in `src/lib/cardSchema.ts`.
- **Reserved new kind names**: `halfLpCost`, `deckPlaceChoice`, `activateCardMove`, `firstTimeMoveRule`.
- **Scope & live PSCT stop targets**:
  1. **Ruling & `"pay half your LP"`** (**38** cards: `402416`, `2333466` Gandora-G, `4538826`, `41420027` Solemn Judgment, `8949584` A Hero Lives): add `rulings/general/fractions-round-up.json`, set `PAY_LP` amount `{ divide: [{ lifePoints: "OWN" }, 2], round: "DOWN" }`.
  2. **Top-or-bottom `deckPlace` (`"DECKTOP", "DECKBOT"`)** (**18** cards: `16387555` **Kewl Tune Cue**, `10406322` Alsei, `10807219` Newbee!): `"place (the rest / it / ...) on the top or bottom of the Deck"` -> `deckPlace: ["DECKTOP", "DECKBOT"]`.
  3. **`"destroy those monsters"`** (**8** cards — completes **`1580833` Dinomist Stegosaur**, `13744068` Berserk Archfiend, `19406822` Kotodama).
  4. **Move-level `"the first time ..."`** (**8** cards: `15543940` Tyrant Dino Fusion, `82105704` Purrely Happy Memory, `90788081` Hundred Dragon, `30552375` Grid Rod): `"the first time it / that face-up monster would be destroyed (by battle or card effect) (this turn | until the end of the next turn), it is not destroyed"` inside `GIVE_EFFECT` moves (`noTurnReset: true` when neither `"each turn"` nor `"this turn"`).
  5. **`"Activate 1 X directly from your Deck"` (`MoveName: "ACTIVATE_CARD"`)** (**6** cards: `7496001` Springans Booty, `22900598` Vampire Takeover).
  6. **End Phase & multi-effect tails**: `"during the End Phase of this turn"` (**14** stops) and `", then activate 1 of these effects;"` (**9** stops: `1006081` Junk Changer, `34721681` Heavy Forward).
- **Acceptance**: `npm run check`, `npm test`, `0` ambiguities, `0` cards lost, unit tests in `test/grammar_w2_moves_act.test.ts` including **Kewl Tune Cue** (`16387555`), **Dinomist Stegosaur** (`1580833`), and `pay half your LP`.

### Task 10 — Shared-Limit `"First Time"`, Equip/Field Conditions, Type Additions & Runick Skips (`grammar/rules.ts`)
- **Exclusive files**: `src/builders/EnglishReader/grammar/rules.ts`, `test/grammar_w2_rules.test.ts`.
- **Reserved new kind names**: `sharedFirstTimeRule`, `equippedConditionRule`, `alsoAttributeTypeRule`, `handActivateRule`.
- **Scope & live PSCT stop targets**:
  1. **Shared-limit `"first time"`** (**2** cards: `39568067` Fateful Adventure, `55610199` Gem-Knight Lady Rose Diamond): `"Once per (opponent's) turn, the first time a(n) X would be destroyed..., it is not destroyed"` -> `INDESTRUCTABLE_COUNT` with `EffectSchema.limit: SOFT`.
  2. **Conditional / equip rule openers**:
     - `"While this card is equipped to a monster"` / `"(While) an Equip Card, the equipped monster..."` (**8** stops: `8660395` Ninaruru, `21351206` Infernoble Knight Ogier);
     - `"As long as this card remains face-up on the field, ..."` (**8** stops: `7489323` Milus Radiant, `8201910` Star Boy);
     - `"While face-up on the field, this card is also [Attribute / Type]-Monster"` (**10** stops: `11366199` Dark Simorgh, `18859369` Chaos Grepher);
     - `"this card cannot be destroyed by..."` in rule contexts (**10** stops: `27240101` Kikinagashi Fucho, `30860696` Rocket Warrior).
  3. **Hand activation & Runick skips**:
     - `"During your opponent's turn, you can activate X Spell/Trap Cards from your hand"` (**8** stops: `3287359` Magical Musket);
     - `", but skip your next Battle Phase"` / `"skip your next Battle Phase"` (**8** stops: `20618850` Runick Golden Droplet).
- **Acceptance**: `npm run check`, `npm test`, `0` ambiguities, `0` cards lost, unit tests in `test/grammar_w2_rules.test.ts`.

---

## 5. Remaining Backlog (After Wave 2)
- **Remaining Kewl Tune cards**: Crackle & Clip (look at opponent's Extra Deck + banish until End Phase), Playlist / Loudness War / B2B / Synchro / Remix (`apply these effects in sequence`, apply GY Synchro Material effect, choose 2 -> add 1 / Special Summon other).
- **Rest of `"Activate this card by ..."`**: `"declaring"` (**6**), `"choosing"` (**2**), `"placing N counters on it"` (**3**), Shattered Axe, and `notes/implied-kept-targets.md`.
- **Spell Counters & Trap Monsters**: `"place 1 Spell Counter on this card"` (**87** stops), `"Special Summon this card as an Effect Monster"` (**24** stops), E.C. Counters (`Enneacraft` **10** stops).
- **Remaining non-destruction replacements**: `SEND_REPLACE` with choice (`Madolche Chateau`, `Neos Fusion`), `DAMAGE_REPLACE` (`Black-Winged Dragon`, `Muscle Medic`), Draw Phase replacements (`"instead of conducting your normal draw"`).

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
- `npm test`: pass/fail counts (all fixtures, `rulings.test.ts` `textAlone`, new `test/grammar_w2_<task>.test.ts`, full 14,239-card `cards.cdb` sweep with `0` ambiguities and `0` non-`TextStop` errors).
- Survey delta (`readOk` before -> after, `0` cards lost, RML diff on previously reading cards, and representative newly reading sample cards).
