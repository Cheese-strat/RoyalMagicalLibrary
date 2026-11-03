# Royal Magical Library

Describes Yu-Gi-Oh! cards in one format every engine's scripts can be written from.

RML's format ([src/cardSchema.ts](src/cardSchema.ts)) is a universal, more exact version of a card's text: what each effect costs, targets and does, step by step. Each card is `cards/<passcode>.json`, and a script for each engine is written from it into `scripts/<engine>/c<passcode>.lua` ([Scripts for each engine](#scripts-for-each-engine)). The aim is for the card text to be the source of the description, with each engine's script derived from it. For now the description is read from MyCard's scripts, and the text is read for the cards its rules cover and compared with them.

Every card in YGOPro has a Lua script that tells the game engine (ocgcore) what the card does. This project reads those scripts and describes each card's effects as structured records: what it costs, what it targets, what it does step by step, how often it can be used and what it needs to be activated. Today the release comes from the scripts and the card database only: ocgcore plays the script, so a script that does something its card doesn't say is still what the card does here.

It also reads a second way, from the card text: Konami's wording is read by rules into effects, those are written as a script, and that script is read by the same reader. The two readings are compared ([Card text as a script](#card-text-as-a-script)). Where they differ, the reader, the text's rules or the card's script is wrong. Both are kept to look at, and neither is chosen silently.

The output is one JSON file per card in [cards/](cards/), in the format [src/cardSchema.ts](src/cardSchema.ts) describes; Sangan reads both through its RML submodule. A release is a commit of `cards/`, made by `npm run export`. To read a card yourself, `npm run read` prints the reader's own records (shown below), with each part of an effect labelled by what modifies it.

## Getting started

You'll need Node 18 or newer.

```sh
npm install
git submodule update --init
```

The card data is in submodules under `data/`, each pinned to a commit: [YGOPro's scripts](https://github.com/Fluorohydride/ygopro-scripts) (`data/ygopro-scripts`, the same commit Sangan uses), [MyCard's database](https://github.com/mycard/ygopro-database) (`data/ygopro-database`), and [EDOPro's scripts](https://github.com/ProjectIgnis/CardScripts) (`data/edopro-scripts`). EDOPro's scripts are only used for their names and calls when writing EDOPro scripts: they are never read as cards.

Use MyCard's scripts and MyCard's database together. They're kept in step with each other; mixing in data from another fork can break things quietly (archetype codes differ between databases) or not so quietly (ProjectIgnis scripts crash this engine).

If your card data lives somewhere else, point at it with `--scripts DIR`, `--database FILE` (the `cards.cdb`) and `--strings FILE` (the `strings.conf`).

## Usage

```sh
npm run read -- 24092792                # one card, by its code
npm run read -- "Ash Blossom" --json    # or by part of its name, in the schema's format
npm run export                          # every card into cards/, one JSON file each
npm run survey                          # read every card and report how much was understood
npm run text-check                      # list the cards whose script and text may differ
npm run script -- "Pot of Greed"        # the script written from a card's text (--read: its reading)
npm run compare -- 55144522             # a card's two readings, and where they differ
npm run compare                         # every card, into survey/compare.tsv and survey/unparsed.tsv
npm run write                           # a script for each engine from every card in cards/, into scripts/<engine>/
npm run write -- 55144522 --engine edopro   # one card, one engine
npm run parse-check                     # check every script parses as Lua 5.3
npm test                                # the conversion and the text's reading, on cards that show each plainly
npm run check                           # type check
```

## Reading the output

Here's one effect of Elfnotes: Rhapsodia of Madness (long lines cut short):

```
=== Elfnotes: Rhapsodia of Madness (24092792) TYPE=TRAP|CONTINUOUS
  #4 TYPE=QUICK_O ON=FREE_CHAIN TEXT=Special Summon CATEGORY=SPECIAL_SUMMON|DISABLE PROPERTY=CARD_TARGET RANGE=SZONE LIMIT={COUNT=1 SHARED=HARD} TIMING={OWN=END_PHASE}
      COST.LEGAL {NEEDS=[{COUNT=1 FROM={OWN=HAND|MZONE} FILTER={TYPE=MONSTER ABLE_TO=GRAVE_AS_COST LEAVES_FREE_MZONE NEEDS=[...]}}]}
      COST {ACTION=CHOOSE ID=CHOSEN1 COUNT=1 FROM={OWN=HAND|MZONE} FILTER={TYPE=MONSTER ABLE_TO=GRAVE_AS_COST LEAVES_FREE_MZONE NEEDS=[...]}}
      COST {ACTION=TO_GRAVE SUBJECT={REF=CHOSEN1} REASON=COST PICK=CHOSEN}
      TARGET {ACTION=TARGET ID=TARGET COUNT=1 FROM={OWN=GRAVE} FILTER={SETCODE=Elfnote ORIGINAL_ATTRIBUTE_DIFFERS_FROM={ORIGINAL_ATTRIBUTE_OF={REF=CHOSEN1}} CAN_SPECIAL_SUMMON}}
      OPERATION.PART 1 LEVEL=EFFECT
      OPERATION {ACTION=SPECIAL_SUMMON SUBJECT={REF=TARGET} POSITION=FACEUP PICK=TARGETED} IF=[{STILL_ON_CHAIN={REF=TARGET}}, {NOT_NECRO_VALLEY}]
      OPERATION.PART 2 LINK=THEN LEVEL=SUBSEQUENT OPTIONAL
      OPERATION {ACTION=CHOOSE ID=CHOSEN2 COUNT=1 FROM={OPPONENT=ONFIELD} FILTER={FACEUP NEGATABLE}} IF=[..., {SUCCEEDED=SPECIAL_SUMMON}, ..., {OPTIONAL}]
      OPERATION {ACTION=NEGATE_ON_CHAIN SUBJECT={REF=CHOSEN2} THEN PICK=CHOSEN} IF=^+[{EXISTS={REF=CHOSEN2}}]
```

The first line is the effect itself, as registered with the engine. Each line after it is one step of its cost, target or operation. A few things to know:

- Names come from the engine's `constant.lua`, without their prefix (`MZONE` rather than `LOCATION_MZONE`).
- When an effect picks a card it gets an `ID`, and later steps point back to it with `REF`.
- `IF` lists what must be true for a step to happen. `^` means "same as the step above" and `^+[...]` means "same, plus these".
- `THEN` on a step marks a `Duel.BreakEffect()` just before it; `OPTIONAL` marks a "you can".
- Counts are "at least": `NEEDS=[{COUNT=3 ...}]` is 3 or more such cards, `ANY` is at least one card of a group, `SUCCEEDED` is a move that moved at least one card, and `FREE_ZONES={OWN=MZONE AT_LEAST=1}` a free zone. "Fewer than" is the `NOT` of one.
- Ranges are inclusive: `LEVEL={MIN=5}` is Level 5 or higher, `ATTACK={MAX=1500}` 1500 or less, `LEVEL={IS=[4]}` exactly 4. A list of `CODE`s is any one of those names.
- `LEGAL` lines are the checks for whether the effect can be activated at all, `MODE` lines are the choices of a "choose one of these effects" (made on activation in `TARGET`, on resolution in `OPERATION`), and `DECLARES` lines are what the effect announces it will do (what cards like Ash Blossom look at).
- `RAW` is anything the reader didn't understand, left as the script wrote it. A card counts as fully read when it has no `RAW` left.

### The labels of each part

What modifies a part of an effect is labelled ([src/read/parts.ts](src/read/parts.ts)). Every label is read from the script, never the card text.

**Level** is for what an effect does, by what stops it, strongest first. Costs and the steps done on activation carry it on each step; resolutions are split into parts, each with its own level.

| Level | What | Stopped by |
| --- | --- | --- |
| `COST` | paid to activate: the cost function's moves, and any move made as a cost wherever the script makes it (`REASON_COST`, `Duel.PayLPCost`; some scripts pay in the target function, so the cost can depend on the targets) | only "cannot activate" |
| `ON_ACTIVATION` | done on activation without being paid: a reveal, an effect set up for a later turn | only "cannot activate" |
| `EFFECT` | `OPERATION` parts that don't depend on an earlier part | also negating the effect |
| `SUBSEQUENT` | `OPERATION` parts that happen only if an earlier part did | also that part failing |

What is decided on activation isn't a level: it does nothing itself, it picks the branch the effect goes down. Which cards is `PICK=TARGETED`, which mode is `MODE` with `CHOSEN_ON=ACTIVATION`, and the checks that allow the activation (`LEGAL`, `CONDITION`) are requirements, kept apart.

**Link** is how a part follows the parts before it, by two facts of the script: whether a `Duel.BreakEffect()` comes between them (sequential: what the first did has happened, and can trigger effects, before the second starts), and whether the part sits under a check on what an earlier part did (dependent: a move's result, or a card an earlier move moved).

| Link | Dependent | Sequential |
| --- | --- | --- |
| `AND_IF_YOU_DO` | yes | no |
| `THEN` | yes | yes |
| `ALSO_AFTER_THAT` | no | yes |
| `AND` | no | no |
| `OTHERWISE` | instead of an earlier part, when that part's check fails (`if ... else`) | |

**`OPTIONAL`** is "you can": the player decides on resolution. **`MODE`** is the "choose one of these effects" choice a part belongs to, and **`CHOSEN_ON`** when it is made: on `ACTIVATION` the opponent knows it before responding, on `RESOLUTION` it is made once the chain has resolved down to it. A mode's parts are linked to the parts before them outside the other modes, since two modes never both happen.

**Pick** is how a move's cards were picked: `THIS_CARD`, `TARGETED` (on activation, and it targets), `CHOSEN` (on resolution, without targeting), `RANDOM`, `ALL` (every card that matches, no choice), `EVENT_CARDS` (the cards the event was about), `CHAIN_LINK` (the effect responded to, or its card), `DECK_TOP`. `BY=OPPONENT` is when your opponent picks.

The labels' words are the schema's (`Level`, `Link`, `Pick`, `ModeChosenOn` and `MoveName` in [src/cardSchema.ts](src/cardSchema.ts)), and the reader is typed by them: a move or label the schema doesn't have fails the type check, so the two can't drift apart.

A resolution's parts are printed as `OPERATION.PART` lines when there is more than one, or one with a label of its own; in the JSON they are `PARTS`, and each step names its `PART`.

## The output

`npm run export` reads every card and writes `cards/<code>.json`, each a `CardSchema` ([src/cardSchema.ts](src/cardSchema.ts), made by [src/convert.ts](src/convert.ts) from the reader's records). Each file says which reader made it (`source.readerVersion`, RML's commit, with `+changes` if the reader had changes not committed) and from which script (`source.scriptHash`, the sha256 of its bytes), so a user of the data can tell a card whose script has changed since.

A field with nothing in it (an empty list, or null) is left out, so absent is empty, or none; booleans are always there. Whatever the reader couldn't read, or recorded in a way no rule of the conversion knows, is in its effect's `unread` (and a summon's), as it was written: never guessed. As of 2026-10-27, 17,914 of 33,370 effects have nothing unread.

A card's `summons` are its ways of being summoned: the Normal or Tribute Summon the rules give it, the aux procedures it sets up (Synchro, Xyz, Link, Fusion, Ritual, Pendulum), and the procedures it registers itself, read as summons: a Special Summon (`SPSUMMON_PROC`, `PROCEDURE`) or a Normal Summon (`SUMMON_PROC`; `LIMIT_SUMMON_PROC` is then its only one), with the procedure's condition as what it `requires` and what its operation does as its `cost`, the cards as its target function picked them. What its other effects do to its summons is there too: what summoning it costs (`SPSUMMON_COST`, `SUMMON_COST`) and Tributes from elsewhere (`ADD_EXTRA_TRIBUTE`, its `extraMaterials`). Those effects are still listed as effects, marked `inSummons`, so a reader counts them once.

The reader's vocabularies are the schema's: its moves and labels are typed by `MoveName`, `Link`, `Level`, `Pick` and `ModeChosenOn`, and the conversion by the whole schema, so a change to what the reader records that the schema doesn't have fails the type check.

## How it works

There are two halves.

**What the card registers** ([src/registration.ts](src/registration.ts)). The card is loaded into the engine with its effect setup calls intercepted, so we see exactly what it registers: every `Effect.Set*` call, its summon procedures, and other setup like "only one on the field". Because the engine runs the script itself, this part doesn't care how the script is written.

**What its functions do** ([src/read/](src/read/)). Each effect points to Lua functions for its condition, cost, target and operation. These are parsed with [luaparse](https://github.com/fstirlitz/luaparse) (every script parses, `npm run parse-check`) and read statement by statement, keeping track of which cards each step picks and which `if` it sits inside. A call inside an `if`'s condition is a check, unless it moves cards or picks them (`if Duel.Destroy(g,REASON_EFFECT)>0 then` destroys). An `if chk==0 then ... end` block is the activation check, however many lines it takes, and a guard (`if not tc:IsRelateToEffect(e) then return end`) applies to everything after it.

The functions of `aux` (`utility.lua`, `procedure.lua`) are read the same way as a script's own, so an effect whose cost is `aux.bfgcost` banishes this card as a cost. Each step, check and filter is then matched against rules for the way scripts write things: the calls of the engine, the filters aux builds (`aux.FilterBoolFunction`, `aux.TargetBoolFunction`), Lua's "a and b or c", the "choose one of these effects" ways of writing modes, and the standard Fusion Summon code's second way of using materials another card's effect allows (Chain Material). Anything no rule knows comes out as `RAW`.

The engine is currently run through [koishipro-core.js](https://www.npmjs.com/package/koishipro-core.js). That's a stopgap; it will be replaced by building ocgcore directly.

## How much is understood

`npm run survey` reads every card and writes its findings to `survey/`, which isn't committed:

- `cards.tsv`: how much of each card is unread, and where.
- `failed.tsv`: cards the reader crashed on.
- `patterns.tsv`: the most common things it couldn't read.

## Where scripts and card text may differ

`npm run text-check` writes `survey/text.tsv`: the cards whose text says something the script's labels don't, or the other way round, for "and if you do", "then", "also, after that", a "you can" inside an effect, and targeting. It is the only place the card text is read, and nothing it finds changes the reader's output: ocgcore plays the script, and fixing a script is for its maintainers.

The text is read with a few rules about Konami's wording ("condition: cost or target; effect"), card by card rather than effect by effect, since a card's text and its registered effects don't line up one to one (a trigger is often registered twice). So a row is something to look at, not a proven difference: the wording rule, the reader or the script may be what's wrong. Each row says how much of the card was read and whether its text is in the current wording (with `:` and `;`) or the old one, which uses "and" and "then" loosely; a fully read card in the current wording is the likeliest to be a script that differs.

As of 2026-10-27 there are 534 rows for cards with every valued part read in the current wording. Some that are differences in the script: Kaiju Capture Mission and Armed Rebeellion say "then" with no `Duel.BreakEffect()` (read `AND_IF_YOU_DO`); Purple Poison Magician says "then" with no check that the first part happened (read `ALSO_AFTER_THAT`); Madolche Tea Break's destruction doesn't depend on the negation it follows "then"; Performapal Monkeyboard's "reveal ..., and if you do" never checks the reveal.

As of 2026-10-27, across 13,554 cards: none failed, 7,033 (51.9%) had everything that matters for a card's value read (its costs, targets, operations, values and what its continuous effects apply to), and 4,095 (30.2%) were read completely. Of the 328 cards of the decks Sangan plays, 140 (42.7%) had every valued part read. (aux's functions are read since then, and counted: before, an effect using one wasn't counted as unread at all.)

The biggest gaps left: value functions, which take their own parameters (`efilter(e,te)` checks an effect, `indes(e,c)` the card being battled) and are read as if they were an effect's; checks on a number held in a variable that no rule knows (`ct>0`, `atk>0`); and calls that set up later effects (`te:UseCountLimit`, `Duel.RaiseSingleEvent`).

Moving to syntax trees on 2026-10-27 also showed what the old text reader got wrong: after an `if chk==0 then ... end` or `if chkc then ... end` block it couldn't find the end of, it took the rest of the function to be the activation check and read nothing more of it, and a filter like `IsSetCard(...) and (IsLocation(LOCATION_GRAVE) or IsFaceup())` was read as `FACEUP`. Those steps and checks are read now, which is why some cards have more `RAW` than before.

## Card text as a script

A card's text, read into effects ([src/text/effects.ts](src/text/effects.ts)), is written as a script ([src/text/script.ts](src/text/script.ts)), and that script is given to the engine and the reader in place of the card's own (`Library.withScript`), so both readings come from the same reader and the same conversion. This is the start of three things: checking the scripts against their text (now), filling in what the reader can't read of a script, and giving a card with no script one.

**Reading the text.** Each sentence is read by Konami's wording, "condition: cost or target; effect": the condition says the kind of effect, its event, where it works and its conditions ("If this card is Normal or Special Summoned", "(Quick Effect)", "During your opponent's turn", "If you control no monsters"); the activation clause its costs and its target; the resolution its parts, with the links between them ("and if you do", "then", "also, after that", "also") and any "you can" or "if ..." of a part. Cards are named by phrases ([src/text/cards.ts](src/text/cards.ts)): "1 Level 4 or lower Warrior monster from your Deck", "up to 2 "Sky Striker" cards in your GY", "1 face-up Continuous Spell you control". A "You can only use ..." sentence limits the effect just before it ("this effect"), or every effect of its section. Old texts say "Graveyard"; it is read as "GY".

A sentence no rule reads is kept with the words where reading stopped, and the card gets no script from its text: nothing is guessed. An Extra Deck monster's materials and "(This card is always treated as ...)" are left out for now (`skipped`): its summons aren't compared yet. Continuous effects, summon conditions, "choose 1 of these effects" lists (●), Equip Cards and modes aren't read yet.

**Writing the script.** Each effect is written the way MyCard's scripts write it: `Duel.SelectMatchingCard` then the move, `Duel.GetFirstTarget()` (or `Duel.GetTargetsRelateToChain()`) for a target, an `if` on a move's result for "and if you do", `Duel.BreakEffect()` for "then", `Duel.SelectYesNo` for a "you can", the same effect cloned for "Normal or Special Summoned", `aux.NecroValleyFilter` for a card moved from the GY. Its string ids and hint timings are placeholders.

**Comparing.** `npm run compare` lines each of the text's effects up with the script's of the same kind, event and range ([src/compare.ts](src/compare.ts)), and compares what text can say: kind, Spell Speed, mandatory, event, range, limit, targeting, "If" or "When" (a trigger that can miss its timing), modes, costs, the parts of the resolution and their moves, and conditions. It leaves out what a script words its own way (string ids, hint timings, categories and what it declares, activation checks) and the checks that only make a move safe (the pick found a card, the target is still on the chain, the player can draw, a free zone, Necrovalley, a re-check that the target is still face-up). Checks worded differently that say the same are compared as one: a "monster" in a Monster Zone or the Extra Deck, or Special Summoned; a Spell/Trap's "on the field" and Spell & Trap Zone; `IsType(TYPE_QUICKPLAY)` and a Quick-Play Spell; a card added to the hand being shown; picks numbered differently.

Each card is `NO_EFFECTS` (a Normal Monster's flavor), `UNPARSED`, `SAME`, `DIFFERS`, or `TEXT_UNREAD` when the reader can't read something of the written script that it can of the card's own (the writer's mistake). `survey/compare.tsv` has one row per difference, with whether the card's own script had something unread and whether its text is in the current wording; `survey/unparsed.tsv` counts where reading stopped, most common first: the rules to write next.

As of 2026-11-02, of 13,554 cards: 387 are compared, 329 the same and 58 different (23 of them with their own script fully read); 13,095 have something not read yet. Since the reader records what a pick leaves out, the text's script says when the card itself is left out: from a Spell's or Trap's activation's picks on the field ("Target 1 Spell/Trap on the field" is any but itself), and from the picks of an effect that also does something to the card ("discard 1 card; Special Summon this card"). It is not left out once a cost has moved the card away, and not when it couldn't be one of them by its types, archetypes or zone. "Tribute 1 monster" by an effect that does nothing else to the card can Tribute itself (Cannon Soldier). Eight cards differ only by a script leaving out the card where it can't be anyway: Mezuki leaves itself out of a target in its GY after banishing itself, and Remove Trap (a Spell) leaves itself out of "1 face-up Trap". Most differences are old texts that say less than their scripts (Ritual Sealing's "Destroy 1 face-up Ritual Monster" targets), gaps the reader has in the card's own script (`bit.band(c:GetType(),0x20004)==0x20004`, `bit.band(r,REASON_EFFECT+REASON_BATTLE)~=0`), and differences in the script: Vortex Trooper's draw doesn't depend on the cards shuffled in its text's "then"; Strategist of the Ice Barrier's cost can banish instead of sending to the GY.

Comparing found four reader mistakes, fixed on 2026-11-02, which change the release when it is next exported: `if not X then return false end` in a filter was read as `not X` (Branded Fusion's "a Fusion Monster" was read as not one); `Duel.DiscardHand` without `REASON_DISCARD` was read as a discard (78 of the 84 cards with one say "send ... from your hand to the GY"); the targets filtered to those still on the chain (`Duel.GetChainInfo(0,CHAININFO_TARGET_CARDS):Filter(Card.IsRelateToEffect,nil,e)`) were read as a new group of every card that matches; `tp==Duel.GetTurnPlayer()`, `IsReleasableByEffect` and `Duel.DiscardHand`'s filter values weren't read. The survey went from 7,033 cards with every valued part read and 4,095 read completely to 7,045 and 4,166.

## Scripts for each engine

`npm run write` writes a script from each card's description in `cards/`, for each engine ([src/write/](src/write/)): `scripts/ygopro/`, `scripts/edopro/` and `scripts/omega/`, each `c<passcode>.lua`. A card is written only when every part of its description is written by some rule. Otherwise it is listed in `survey/unwritten.tsv` with what isn't written yet: a script that does part of what its card does is never written.

Each engine says the same things a little differently ([src/write/dialects.ts](src/write/dialects.ts)). The writer writes YGOPro's calls, and each constant is renamed to the engine's name for the same value, from the engine's own `constant.lua`: EDOPro's `RACE_WINGEDBEAST` is YGOPro's `RACE_WINDBEAST`, and its `TYPE_GEMINI` is YGOPro's `TYPE_DUAL`. EDOPro has no `IsAllTypes`, `aux.IsCodeListed` or `Duel.GetTargetsRelateToChain`, so it gets its own calls for those, and its scripts begin `local s,id=GetID()`.

Summon procedures are each engine's own. YGOPro uses `aux.AddSynchroProcedure`, `aux.AddXyzProcedure`, `aux.AddLinkProcedure` and `aux.AddFusionProcCode2`/`CodeRep`/`Mix`. EDOPro uses `Synchro.AddProcedure`, `Xyz.AddProcedure`, `Link.AddProcedure` and `Fusion.AddProcMix`/`AddProcMixN`. A material's filter checks it as a material:
- YGOPro: `IsLinkRace`, `IsLinkType`, `IsFusionSetCard`, `IsXyzType`...
- EDOPro: the card's own checks given the summon's card, type and player (`c:IsRace(RACE_DRAGON,sc,st,tp)`, `c:IsSummonCode(sc,st,tp,code)`), with a non-Tuner filter checking `IsNotTuner` itself, as `Synchro.NonTuner` does.

Pendulum, Ritual and the procedures a card writes itself aren't written yet.

A continuous effect is written from what it applies (`applies`):
- Its type comes from what it reaches. `THIS_CARD` is a card's own effect (SINGLE), `EQUIPPED_MONSTER` an Equip's, `ATTACHED_TO` an Xyz Material's (XMATERIAL) and `CARD_IT_TARGETS` a TARGET effect's. Cards in places, players and `DUEL` are a field effect's, with its target range.
- Its condition is written as a function given only `e`. Its cards become its target function.
- Its value is a number, a value worked out as it applies (`computed`: `Duel.GetMatchingGroupCount(...)*200`), or the aux function the engines use for it (`aux.fuslimit`, `aux.tgoval`, `aux.indoval`; EDOPro's `aux.lnklimit`).
- Any other value is a function of its own, with the parameters the engine passes to that effect's value: `e,se,sp,st` for `SPSUMMON_CONDITION`, `e,te` for `IMMUNE_EFFECT`, `e,c` for a card.
- A function that isn't given `tp` gets it as `local tp=e:GetHandlerPlayer()`.

Effects that happen on an event without a chain (`AUTO`) aren't written yet.

YGO Omega runs YGOPro's scripts. Its card database has YGOPro's `constant.lua` and `utility.lua` byte for byte, and its core is ocgcore built into the game, with the same functions YGOPro's has. So its scripts are YGOPro's. It adds functions of its own in `proc_omega.lua`, which the writer doesn't use. Omega isn't public, so it has no submodule.

**Checking what is written.** A YGOPro script (and so an Omega one) is read back by the reader in place of the card's own, and must give back exactly the description it was written from. Only the source and how its picks are numbered may differ. A card that reads back differently is the writer's mistake, and it is not written. An EDOPro script can't be run here: EDOPro's ocgcore for Node ([ocgcore-wasm](https://www.npmjs.com/package/ocgcore-wasm)) isn't installed. So it is checked statically instead: every function it calls must be one that EDOPro's own scripts call or define.

As of 2026-11-03, from a fresh export of every card:
- 1,333 cards are written for YGOPro and Omega, and every one reads back the same. 91 of them are Fusion, Synchro, Xyz or Link Monsters, and each procedure's numbers and Fusion flags match the card's own script.
- Each of the 755 continuous effects written registers the same type, code, flags, range, target range and count limit as the card's own script. Each also has a condition, target, value and operation exactly where the original does.
- 1,303 are written for EDOPro. The other 22 call YGOPro functions EDOPro doesn't have (`IsFaceupEx`, `IsFusionSetCard`) or use constants EDOPro has no name for (`CATEGORY_HANDES_OPPO`), so they aren't written for it.
- Of the 3,585 cards whose description has nothing unread, most aren't written for these reasons: summon procedures (Pendulum, Ritual, the card's own), effects given to other cards, conditions on a target existing, and effects that happen without a chain.

`npm run write` writes from `cards/` as committed, so its counts follow the last release.

Reading back can't notice an argument the reader ignores, since it would be ignored in both scripts. Checking each written script against its card's own for these found arguments the reader dropped. They are read now, and change the release when it is next exported (2026-11-02):
- the card left out of a pick or check (`aux.ExceptThisCard(e)`, `e:GetHandler()`, a card held in a variable), as `NOT_SELF` or the new `except`;
- who Special Summons and to whose field, and whether it ignores summon conditions or the revival limit (`Move.by`, `Move.player`, the new `Move.ignoring`);
- whose hand or Deck a card is sent to;
- `IsCanBeSpecialSummoned`'s every argument, as `SPECIAL_SUMMON_IN_FACEUP_DEFENSE`, `SPECIAL_SUMMON_IGNORING_CONDITIONS` and so on.

More reader fixes from the same checks:
- `Duel.IsExistingMatchingCard` checked from the opponent's side (`1-tp,LOCATION_DECK,0`) was read as your own.
- A pick from a group with cards merged into it (Card of Fate's `g1:Merge(og1)`) was described as a pick from the group's first places. It is unread now.
- A summon procedure's material filter of the card's own (`c10547580.mfilter`) was unread (`<closure>`): the registration hook only knew the card once it registered an effect, and a procedure is set up before. It is read now. With the material checks below, 37 more cards have nothing unread (3,290 to 3,327).
- What a procedure takes that a summon has no field for is unread instead of dropped: Xyz's alternative material, Link's check of the materials together, and Synchro Mix procedures, whose arguments were read as a plain Synchro procedure's. Xyz's maximum number of materials ("2 or more") is read, and Fusion's substitutes and summoning without materials are kept (`substitutes`, `withoutMaterials`).
- A material's Link or Fusion checks (`IsLinkRace`, `IsLinkAttribute`, `IsFusionAttribute`, `IsLinkCode`, `IsFusionCode`) are read as its race, Attribute and name, as its Link type and archetypes already were.

Writing continuous effects, and checking each against its card's own registration, found more that the reader dropped or read wrongly (2026-11-03):
- What aux calls other than summon procedures register was marked as a summon procedure's and not read. These are `aux.EnableChangeCode`'s name change, `aux.EnableDualAttribute`'s Gemini effects, `aux.AddContactFusionProcedure` and the like. They are read now as the card's own effects. Only what Fusion, Synchro, Xyz, Link, Ritual and Pendulum procedures register is left to `summons`.
- A continuous effect's type was lost: XMATERIAL, TARGET and field effects with no target range were all read as the card's own. They are `ATTACHED_TO`, `CARD_IT_TARGETS` and `DUEL` now. A target range on a card's own effect, and a field effect that is also XMATERIAL, are unread.
- A value worked out as it applies (`c:GetLevel()*200`, `Duel.GetMatchingGroupCount(...)*500`) was read as a value of no checks (`{}`). It is `computed` now.
- A card's own effect's target function (`TUNER_MATERIAL_LIMIT`: the Synchro Monsters it can be material for) was read as activation steps and lost. It is the effect's `cards` now.
- `DISABLE_FIELD`'s operation, which picks the zones, was read as steps and lost. It is unread now.
- `not` before a sequence check (`not c:GetSequence()==5`) was dropped.
- A Type, Attribute or race given as an expression (`te:GetHandler():GetAttribute()`) was read as a name. It is unread now.

New reader rules for continuous effects take those with unread from 3,031 of 7,367 to 2,447 of 7,738 (the 371 more are the aux calls' effects above):
- a value's checks of the effect it is given (`te:GetOwner()~=e:GetOwner()`, `re:IsActiveType`, `se:IsHasType`), as `effect`;
- why it would happen (`r&REASON_BATTLE~=0`), as `reasons`;
- two known cards being the same one (`Duel.GetAttacker()==e:GetHandler()`), as `same`;
- a Field Spell applying (`Duel.IsEnvironment`), as `fieldSpell`;
- ranges of phases, the turn player held in a variable, a known card being there (`e:GetHandler():GetBattleTarget()`);
- the monsters a Link Monster points to (`LINKED_TO_THIS`) and a Gemini monster's status (`GEMINI_STATUS`);
- `aux.tkfcon`'s `tp` given or not, and `c:IsControler(e:GetHandlerPlayer())`.

Effects with nothing unread went from 17,872 to 18,574, and cards from 3,327 to 3,585.

## Project layout

| Path                                       | What's there                                                        |
| ------------------------------------------ | ------------------------------------------------------------------- |
| [src/cli.ts](src/cli.ts)                   | the `read`, `export`, `survey`, `text-check`, `script`, `compare` and `write` commands |
| [src/library.ts](src/library.ts)           | loads the engine and the card data                                  |
| [src/registration.ts](src/registration.ts) | what a card registers, straight from the engine                     |
| [src/readCard.ts](src/readCard.ts)         | puts a card's records together                                      |
| [src/convert.ts](src/convert.ts)           | a card's records in the schema's format                             |
| [cards/](cards/)                           | the output: every card, one JSON file each                          |
| `scripts/<engine>/`                        | scripts written from `cards/` for YGOPro, EDOPro and YGO Omega       |
| [src/write/](src/write/)                   | writing a script from a description ([script.ts](src/write/script.ts)), each engine's names and calls ([dialects.ts](src/write/dialects.ts)), the checks ([check.ts](src/write/check.ts)) |
| `data/`                                    | the card data: YGOPro's and EDOPro's scripts and MyCard's database, as submodules |
| [src/read/](src/read/)                     | reading effect functions: steps, conditions, filters                |
| [src/read/parts.ts](src/read/parts.ts)     | a resolution's parts and the labels of each                         |
| [src/lua.ts](src/lua.ts)                   | a script's syntax tree: its functions, expressions as text, calls   |
| [src/constants.ts](src/constants.ts)       | names and values from `constant.lua`                                |
| [src/format.ts](src/format.ts)             | printing records as text                                            |
| [src/survey.ts](src/survey.ts)             | the survey over every card                                          |
| [src/textCheck.ts](src/textCheck.ts)       | where scripts and card text may differ                              |
| [src/text/](src/text/)                     | card text read into effects ([effects.ts](src/text/effects.ts), [cards.ts](src/text/cards.ts)) and written as a script ([script.ts](src/text/script.ts)) |
| [src/textScript.ts](src/textScript.ts)     | a card's script from its text, read and compared with its own       |
| [src/compare.ts](src/compare.ts)           | two readings of a card, and where they differ                       |
| [src/cardSchema.ts](src/cardSchema.ts)     | the output's format                                                 |
| [tools/parseAll.ts](tools/parseAll.ts)     | the luaparse check                                                  |
| [notes/](notes/)                           | write-ups: how scripts write the same feature ([script-idioms.md](notes/script-idioms.md)) |
