# Royal Magical Library

Turns Yu-Gi-Oh! card scripts into data you can work with.

Every card in YGOPro has a Lua script that tells the game engine (ocgcore) what the card does. This project reads those scripts and describes each card's effects as structured records: what it costs, what it targets, what it does step by step, how often it can be used and what it needs to be activated. It works from the scripts and the card database only, never the card text: ocgcore plays the script, so a script that does something its card doesn't say is still what the card does here (the separate `text-check` lists where the two may differ, for the scripts' maintainers).

It's early days. Right now the reader prints each card as a set of flag records (shown below), with each part of an effect labelled by what modifies it. The format it's heading towards, one JSON file per card, is sketched in [src/cardSchema.ts](src/cardSchema.ts) but isn't written yet.

## Getting started

You'll need Node 18 or newer.

```sh
npm install
git clone --depth 1 https://github.com/mycard/ygopro-scripts.git data/ygopro-scripts
git clone --depth 1 https://github.com/mycard/ygopro-database.git data/ygopro-database
```

Use MyCard's scripts and MyCard's database together. They're kept in step with each other; mixing in data from another fork can break things quietly (archetype codes differ between databases) or not so quietly (ProjectIgnis scripts crash this engine).

If your card data lives somewhere else, point at it with `--scripts DIR`, `--database FILE` (the `cards.cdb`) and `--strings FILE` (the `strings.conf`).

## Usage

```sh
npm run read -- 24092792                # one card, by its code
npm run read -- "Ash Blossom" --json    # or by part of its name, as JSON
npm run survey                          # read every card and report how much was understood
npm run text-check                      # list the cards whose script and text may differ
npm run parse-check                     # check every script parses as Lua 5.3
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

A resolution's parts are printed as `OPERATION.PART` lines when there is more than one, or one with a label of its own; in the JSON they are `PARTS`, and each step names its `PART`.

## How it works

There are two halves.

**What the card registers** ([src/registration.ts](src/registration.ts)). The card is loaded into the engine with its effect setup calls intercepted, so we see exactly what it registers: every `Effect.Set*` call, its summon procedures, and other setup like "only one on the field". Because the engine runs the script itself, this part doesn't care how the script is written.

**What its functions do** ([src/read/](src/read/)). Each effect points to Lua functions for its condition, cost, target and operation. These are parsed with [luaparse](https://github.com/fstirlitz/luaparse) (every script parses, `npm run parse-check`) and read statement by statement, keeping track of which cards each step picks and which `if` it sits inside. A call inside an `if`'s condition is a check, unless it moves cards or picks them (`if Duel.Destroy(g,REASON_EFFECT)>0 then` destroys). An `if chk==0 then ... end` block is the activation check, however many lines it takes, and a guard (`if not tc:IsRelateToEffect(e) then return end`) applies to everything after it.

Each step, check and filter is then matched against rules for the way scripts write things: the calls of the engine, the idioms of `aux` (`aux.NecroValleyFilter`, `aux.FilterBoolFunction`), Lua's "a and b or c", the "choose one of these effects" ways of writing modes, and the standard Fusion Summon code's second way of using materials another card's effect allows (Chain Material). Anything no rule knows comes out as `RAW`.

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

As of 2026-10-27, across 13,554 cards: none failed, 7,047 (52.0%) had everything that matters for a card's value read (its costs, targets, operations, values and what its continuous effects apply to), and 4,090 (30.2%) were read completely. Of the 328 cards of the decks Sangan plays, 142 (43.3%) had every valued part read.

The biggest gaps left: value functions, which take their own parameters (`efilter(e,te)` checks an effect, `indes(e,c)` the card being battled) and are read as if they were an effect's; checks on a number held in a variable that no rule knows (`ct>0`, `atk>0`); and calls that set up later effects (`te:UseCountLimit`, `Duel.RaiseSingleEvent`).

Moving to syntax trees on 2026-10-27 also showed what the old text reader got wrong: after an `if chk==0 then ... end` or `if chkc then ... end` block it couldn't find the end of, it took the rest of the function to be the activation check and read nothing more of it, and a filter like `IsSetCard(...) and (IsLocation(LOCATION_GRAVE) or IsFaceup())` was read as `FACEUP`. Those steps and checks are read now, which is why some cards have more `RAW` than before.

## Project layout

| Path                                       | What's there                                                        |
| ------------------------------------------ | ------------------------------------------------------------------- |
| [src/cli.ts](src/cli.ts)                   | the `read`, `survey` and `text-check` commands                      |
| [src/library.ts](src/library.ts)           | loads the engine and the card data                                  |
| [src/registration.ts](src/registration.ts) | what a card registers, straight from the engine                     |
| [src/readCard.ts](src/readCard.ts)         | puts a card's records together                                      |
| [src/read/](src/read/)                     | reading effect functions: steps, conditions, filters                |
| [src/read/parts.ts](src/read/parts.ts)     | a resolution's parts and the labels of each                         |
| [src/lua.ts](src/lua.ts)                   | a script's syntax tree: its functions, expressions as text, calls   |
| [src/constants.ts](src/constants.ts)       | names and values from `constant.lua`                                |
| [src/format.ts](src/format.ts)             | printing records as text                                            |
| [src/survey.ts](src/survey.ts)             | the survey over every card                                          |
| [src/textCheck.ts](src/textCheck.ts)       | where scripts and card text may differ                              |
| [src/cardSchema.ts](src/cardSchema.ts)     | the structured format this is working towards                       |
| [tools/parseAll.ts](tools/parseAll.ts)     | the luaparse check                                                  |
| [notes/](notes/)                           | write-ups: how scripts write the same feature ([script-idioms.md](notes/script-idioms.md)) |
