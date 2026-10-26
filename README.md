# Royal Magical Library

Turns Yu-Gi-Oh! card scripts into data you can work with.

Every card in YGOPro has a Lua script that tells the game engine (ocgcore) what the card does. This project reads those scripts and describes each card's effects as structured records: what it costs, what it targets, what it does step by step, how often it can be used and what it needs to be activated. It works from the scripts and the card database only, never the card text.

It's early days. Right now the reader prints each card as a set of flag records (shown below). The format it's heading towards, one JSON file per card, is sketched in [src/cardSchema.ts](src/cardSchema.ts) but isn't written yet.

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
npm run parse-check                     # check every script parses as Lua 5.3
npm run check                           # type check
```

## Reading the output

Here's one effect of Elfnotes: Rhapsodia of Madness:

```
=== Elfnotes: Rhapsodia of Madness (24092792) TYPE=TRAP|CONTINUOUS
  #4 TYPE=QUICK_O ON=FREE_CHAIN TEXT=Special Summon CATEGORY=SPECIAL_SUMMON|DISABLE PROPERTY=CARD_TARGET RANGE=SZONE LIMIT={COUNT=1 SHARED=HARD} TIMING={OWN=END_PHASE}
      COST {ACTION=CHOOSE ID=CHOSEN1 COUNT=1 FROM={OWN=HAND|MZONE} FILTER={TYPE=MONSTER ABLE_TO=GRAVE_AS_COST LEAVES_FREE_MZONE NEEDS=[...]}}
      COST {ACTION=TO_GRAVE SUBJECT={REF=CHOSEN1} REASON=COST}
      TARGET {ACTION=TARGET ID=TARGET COUNT=1 FROM={OWN=GRAVE} FILTER={SETCODE=Elfnote ORIGINAL_ATTRIBUTE_DIFFERS_FROM={ORIGINAL_ATTRIBUTE_OF={REF=CHOSEN1}} CAN_SPECIAL_SUMMON}}
      OPERATION {ACTION=SPECIAL_SUMMON SUBJECT={REF=TARGET} POSITION=FACEUP} IF=[{STILL_ON_CHAIN={REF=TARGET}}, {NOT_NECRO_VALLEY}]
      OPERATION {ACTION=CHOOSE ID=CHOSEN2 COUNT=1 FROM={OPPONENT=ONFIELD} FILTER={FACEUP NEGATABLE}} IF=^+[{SUCCEEDED=SPECIAL_SUMMON}, ..., {OPTIONAL}]
      OPERATION {ACTION=NEGATE_ON_CHAIN SUBJECT={REF=CHOSEN2} THEN} IF=^+[{EXISTS={REF=CHOSEN2}}]
```

The first line is the effect itself, as registered with the engine. Each line after it is one step of its cost, target or operation. A few things to know:

- Names come from the engine's `constant.lua`, without their prefix (`MZONE` rather than `LOCATION_MZONE`).
- When an effect picks a card it gets an `ID`, and later steps point back to it with `REF`.
- `IF` lists what must be true for a step to happen. `^` means "same as the step above" and `^+[...]` means "same, plus these".
- `THEN` marks a "then" in the card's wording; `OPTIONAL` marks a "you can".
- `LEGAL` lines are the checks for whether the effect can be activated at all, `MODE` lines are choices made on activation, and `DECLARES` lines are what the effect announces it will do (what cards like Ash Blossom look at).
- `RAW` is anything the reader didn't understand, left exactly as the script wrote it. A card counts as fully read when it has no `RAW` left.

## How it works

There are two halves.

**What the card registers** ([src/registration.ts](src/registration.ts)). The card is loaded into the engine with its effect setup calls intercepted, so we see exactly what it registers: every `Effect.Set*` call, its summon procedures, and other setup like "only one on the field". Because the engine runs the script itself, this part doesn't care how the script is written.

**What its functions do** ([src/read/](src/read/)). Each effect points to Lua functions for its condition, cost, target and operation. These are read from the script text, call by call, keeping track of which cards each step picks and which `if` it sits inside.

The second half is the weak spot. It handles the way most scripts are written, and anything unusual comes out as `RAW`. Every script parses cleanly with [luaparse](https://github.com/fstirlitz/luaparse), so the plan is to move to reading syntax trees, then to recognise the patterns many scripts copy (the standard Fusion Summon code, summon procedures, once-per-turn tricks) and describe each as a single property.

The engine is currently run through [koishipro-core.js](https://www.npmjs.com/package/koishipro-core.js). That's a stopgap; it will be replaced by building ocgcore directly.

## How much is understood

`npm run survey` reads every card and writes its findings to `survey/`, which isn't committed:

- `cards.tsv`: how much of each card is unread, and where.
- `failed.tsv`: cards the reader crashed on.
- `patterns.tsv`: the most common things it couldn't read.

As of 2026-10-24, across 13,554 cards: none failed, 1,660 (12.2%) had everything that matters for a card's value read (its costs, targets, operations, values and what its continuous effects apply to), and 686 (5.1%) were read completely. The biggest gap is activation checks written over several lines, followed by free-zone and face-up checks.

## Project layout

| Path                                       | What's there                                                        |
| ------------------------------------------ | ------------------------------------------------------------------- |
| [src/cli.ts](src/cli.ts)                   | the `read` and `survey` commands                                    |
| [src/library.ts](src/library.ts)           | loads the engine and the card data                                  |
| [src/registration.ts](src/registration.ts) | what a card registers, straight from the engine                     |
| [src/readCard.ts](src/readCard.ts)         | puts a card's records together                                      |
| [src/read/](src/read/)                     | reading effect functions: filters, conditions, steps, and if-blocks |
| [src/lua.ts](src/lua.ts)                   | helpers for reading Lua text                                        |
| [src/constants.ts](src/constants.ts)       | names and values from `constant.lua`                                |
| [src/format.ts](src/format.ts)             | printing records as text                                            |
| [src/survey.ts](src/survey.ts)             | the survey over every card                                          |
| [src/cardSchema.ts](src/cardSchema.ts)     | the structured format this is working towards                       |
| [tools/parseAll.ts](tools/parseAll.ts)     | the luaparse check                                                  |
