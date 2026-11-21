# Claude's konamiReader

A card's text read into RML, written by Claude (2026-11-14). It replaced the first text reader (src/builders/konamiReader.ts and konamiEffectReader.ts, removed 2026-11-17), whose stages and pattern design it keeps, and it is the reader `npm run build`, `report` and `inspect` use ([pipeline.ts](../../pipeline.ts)). It has two stages: the names stage, then the sentences stage, and the first part a stage can't read ends the reading with a `TextStop`. Its grammar reads whole effects and their materials, and what follows from an effect's words is worked out once the text is read.

It reads all 65 cards of two of Sangan's decks into the RML written by hand for them in [test/expected/](../../../test/expected/): the 39 of `ARS_MAGNA_ELFNOTE` (Elfnote and Ars Magna, with its hand traps and Extra Deck), and the 26 more of `CLOWN_CREW` (Clown Crew, Nouvelles and Patissciel, with theirs). That RML is the spec. Its conventions are below, and each one has a reason.

```ts
import { konamiReader, type TextWarning } from "./src/builders/EnglishReader/konamiReader.js";
const warnings: TextWarning[] = [];
const card = konamiReader(await openLibrary(), 14558127, "claude-1", warnings); // throws a TextStop where it can't read
```

RML says what the text says. RML's aim is the technically correct card. When a text says a card can do what a general rule forbids, the text wins, as the game's rules say (Cheesestrat, 2026-11-16: Ritual Monsters and Banished face-down, below). The archetype names, setcodes, categories and scripts are all written by people and can be wrong, so differences are left for a person to decide. A warning is something reading found for a person to decide, and it doesn't stop the reading. It names the part of the text it is about, if it is about one:

- **A shortcut the text doesn't say.** Ravenous Crocodragon Archethys draws for "the number of non-Tuners used for its Synchro Summon". RML counts the materials used as non-Tuners. Its materials line has exactly 1 Tuner, so that is also its materials minus 1. That's what YGOPro's scripts count, and what an engine that doesn't keep the role each material was used as can count instead.
- **The database's setcodes, where they aren't the archetypes the name and text give.** Number 90's name has "Number". strings.conf names two archetypes "Number": 0x48, the Number monsters, and 0x16a, the "Numbers" cards (Numbers Eveil, Number Wall). The database gives Number 90 only 0x48. The English name can't tell them apart; its Japanese name has only the first (No.).
- **The Pendulum Scale, where the text's isn't the database's.** RML has the text's, or the database's when the text has none. No card in the database has this warning.
- **A Token's stats, where the text's aren't its database row's** ("Special Summon 1 "Sheep Token" (Beast/EARTH/Level 1/ATK 0/DEF 0)"), or a card Special Summoned as a Token that the database doesn't make one. The printed stats only repeat the Token's row, so RML names the Token (`{ token }`) and leaves them out. No card that reads has this warning.

No other card of the 65 warns. `npx tsx --test test/konamiReader.test.ts` checks every expected card and the warnings each gives, and that every card in the database reads or stops; `npm test` runs it with the rest.

## Files

| File | What it is |
| --- | --- |
| [engine.ts](engine.ts) | Reads a token sequence with a grammar of patterns. |
| [grammar.ts](grammar.ts) | The grammar: the patterns for each kind of phrase, and what each means, put together from the files of [grammar/](grammar/) (a kind written in two of them is an error). |
| [grammar/text.ts](grammar/text.ts) | A part of a card's text: its sentences, the limitations and riders among them, how the card is Summoned, and its materials. |
| [grammar/effects.ts](grammar/effects.ts) | An effect, and what comes before its colon: when it can be used (events, conditions, phases). |
| [grammar/act.ts](grammar/act.ts) | What comes after the colon: what an effect costs, targets and does, its modes, and its resolution's parts. |
| [grammar/moves.ts](grammar/moves.ts) | Moves: what a resolution or a cost does to cards and players. |
| [grammar/rules.ts](grammar/rules.ts) | Rules: what a continuous effect, or an effect on a player, applies, as a subject and a predicate. |
| [grammar/cards.ts](grammar/cards.ts) | Cards: how many, of what, from where. |
| [grammar/shared.ts](grammar/shared.ts) | What the grammar's files share: the shapes of phrases, the printed words for frames, Types and Attributes, and helpers. |
| [phrases.ts](phrases.ts) | The drafts the meanings are made of, and the helpers that build them, including the face-up rule. |
| [finish.ts](finish.ts) | What follows once an effect is read: its kind, speed, event, range, flags, categories, and pick ids. |
| [parts.ts](parts.ts) | A card's text in parts, the names stage (`replaceNames`), and the `TextStop` that ends a reading. |
| [konamiReader.ts](konamiReader.ts) | A card, in order: its printed data, parts, names and sentences; then its limitations, Summons and rules. |
| [GRAMMAR_TASK.md](GRAMMAR_TASK.md) | Grammar expansion guide: unclassified effects vs. conditions, overlap reduction, kind reference, survey backlog, and ideal answer format. |

## Reading a card

1. **Printed data.** Taken from the database, and the parts from the text's layout. An Extra Deck monster's first line is its materials unless it starts with "(" or ends with ".".
2. **Names.** parts.ts's `replaceNames` turns quoted names into codes.
3. **Sentences.** Each part is read whole, as `text`, or as `materialsLine` for a materials line. A text means something only when it reads exactly one way. Otherwise the reader stops at the furthest token any pattern reached, and says what was expected there.
4. **The card.** In konamiReader.ts's `assemble`:
   - Limitations are given to the effects they name, and modes with limits of their own get theirs, with counters numbered in printed order across parts.
   - Riders add to the effect before them: a move at its end, what activating it does and needs, or the kind of Summon its last Special Summon is ("(This is treated as a Fusion Summon.)").
   - A sentence about "It" is about the card the sentence before it did something to. After a sentence that equips this card (an Equip Spell's "Equip only to a Warrior monster.", or an effect that equips it), that is the monster this card equips, for as long as it does: "It gains 700 ATK." is a continuous effect on EQUIPPED_MONSTER. After an activation that keeps its target ("Activate this card by targeting …"), it is that target, for as long as this card targets it: CARD_IT_TARGETS (Dimension Guardian's "It cannot be destroyed by battle or card effects."). After any other sentence it stops the reading.
   - Words about the card this card targets (CARD_IT_TARGETS: "that target" or "that monster" in its links, "the targeted monster") stop a card whose activation doesn't say it keeps a target. Release from Stone, Escape from the Dark Dimension and Miraculous Descent ("Target 1 of your banished … monsters; Special Summon it. When this card leaves the field, destroy that monster.") stop there: their scripts keep the target, but their texts don't say so.
   - Effects with two events ("Normal or Special Summoned") are split into twins, each with what its own event needs (Enigmaster Packbit's "Synchro Summoned, or sent to the GY": only the Summon's twin needs a Synchro Summon).
   - The Summons and rules are put together.
5. **Each effect.** Finished as described below. A part whose words read but don't make sense together stops the reading too, as a whole part: a limitation with no effect to limit, a pronoun with no card before it, or a second sentence that is the card's activation.

### The engine

The engine follows the first reader's design (Cheesestrat's): a pattern is the printed words with `{kind}` slots, every reading is tried, and a pattern can't start with its own kind. It adds five things:

- **Named slots.** `{a:places}` lets a pattern hold two phrases of one kind.
- **Bulleted lists.** `{m:●mode}` is a bullet (●) and a phrase of the kind, one or more times, and means those phrases' meanings in order. The bullet belongs to the list, not to what it lists: the words before a list say what kind its bullets hold ("You can activate 1 of these effects; {m:●mode}"), and that kind's patterns are written without the bullet.
- **Equal meanings count once.** Two readings that mean the same thing are one reading: patterns that agree are not ambiguous.
- **No reading.** A meaning of `undefined` is no reading, so a meaning can check what it was given. So is a meaning that throws `NoReading`, from however deep: filters that contradict each other (two values of one check) mean nothing.
- **Capitals.** A word's first letter matches either case, since a sentence's first word is capitalised.

### The grammar

A bulleted list (●) holds what the words before it say, and only those words start one: `{b:●effect}` after "You can only use each of the following effects of X once per turn.", where the bullets are effects of their own and end the part; anywhere else a sentence's modes (`●mode`), the effects it applies (`●effect` again, after "apply these effects this turn.") or grants (`●attributeGrant`, `●countGrant`), the parts it applies by a number (`●threshold`), or what it responds to (`●declared`). So a bullet can't start a sentence: if it could, a two-mode list would read two ways, as two modes, or as one mode and then an effect of its own.

A sentence is read from parts that combine, so that a wording read on one card reads on every card that writes it, in any combination with the rest:

- **Rules are a subject and a predicate** ([rules.ts](grammar/rules.ts)). A predicate is written once, in the singular ("gains 500 ATK", "cannot be destroyed by battle or card effects", "cannot be targeted by your opponent's card effects", "can make a second attack during each Battle Phase", "is unaffected by Spell effects"), and read in the plural too ("FIRE monsters you control gain 500 ATK"). The subject is a card that bears the rule ("this card", "the equipped monster"), the cards in places it reaches, or "each" of them.
- **A move takes what it moves as one phrase** (`moved`): a pick ("1 Spell/Trap on the field"), "this card" (and where it is), "it" and "that card" (one card), "them", "that target" and "those targets". So "destroy", "banish", "send … to the GY", "return … to the hand", "shuffle … into the Deck", "Special Summon" and the rest are each one pattern, and "equip X to Y" takes two.
- **A rule a move gives for a while** is the card, a rule's predicate, and how long (`cardEffectDuration`): "this card gains ATK equal to the destroyed monster's original ATK until the end of this turn", "it loses 1500 ATK until the end of this turn". The predicates are the rules' own, so one written for a continuous effect reads here too. A number the predicate works out is worked out once, as the effect resolves (`fixed`), where a continuous effect's is worked out as it applies.
- **A limitation** is what it limits (`limited`: "this effect", "each of these effects", "the following effects", "each of the preceding effects"), how often (`limitFrequency`: "once per turn", "twice per turn", "once per Chain", "once per Duel"), and whether a use or an activation counts.
- **A Summon condition** is one of its kinds: "Cannot be Normal Summoned/Set", "Cannot be Special Summoned (from places)", "Must (first) be Special Summoned … by" and what it does ("banishing 1 …", "sending … to the GY"), "Must be Special Summoned with X", and "You can only control 1 X" (`only`, when X is this card).
- **A list is one shape** ([shared.ts](grammar/shared.ts) `listPatterns`): "X", "X and Y", "X, Y and Z" (or "or", where the list allows it), with the items after the first in a kind of their own (the tail), so a list has one reading however long it is. Attributes, frames, Types, names, archetypes, places, gerunds, happenings and Summon kinds are all read with it.
- **A card noun takes what follows it** (`cardPostMod`, so `cardPhrase` is a noun and at most one of these): "with 2000 or more ATK", "with 1500 or less original DEF", "with a different original Attribute", "with a different original Level", "Special Summoned from the Extra Deck". A material is "{number} {cardPhrase}", and one that is only "Tuner" is the TUNER role.
- **A Special Summon is the move and its modifiers** (`specialSummonMods`, each at most once, in any order): "in Defense Position" (and the other positions), "to your zone a Link Monster points to", "to your opponent's field", "(this is treated as a … Summon)", "ignoring its Summoning conditions". After it, ", but" adds what happens to what it Summoned (`butClause`): "banish it when it leaves the field", "negate its effects", "their effects are negated".
- **A happening is a move and its cause** ([effects.ts](grammar/effects.ts)): "sent {sentToGyTail}" (to the GY, your GY, your opponent's GY), "destroyed by {destructionCause}" (battle, a card effect, your opponent's card effect, battle or card effect, and the rest), "destroyed (by …) and sent to the GY". What is activated ("a monster effect", "a Spell/Trap Card", "a card or effect", "a Spell/Trap Card, or monster effect") is `activatedKind`, and "{activatedKind} is activated (that targets …)" an event.
- **A Special Summon lock** is "you cannot Special Summon" with what it locks (`lockedSpecialSummons`: "monsters", "monsters from the Extra Deck") and what it spares (`lockException`: ", except Tuners", ", except from the GY"), one CANNOT_SPECIAL_SUMMON (`specialSummonLock`). "for the rest of this turn after this card resolves, …" (`afterCardResolves`) puts it, or any rule, on the player once the card has resolved, as a part of its own after the activation's (a rider when it is a sentence of its own: Extinguishing the Ashened).
- **A Token is its name and its stats** (`moved`: "1 "Sheep Token" (Beast/EARTH/Level 1/ATK 0/DEF 0)"), so any move of cards Summons one, with its modifiers.
- **A Summon procedure of the card's own** is a sentence of `summonText`: "You can Special Summon this card (from your hand) by {gerunds}" (its cost), "(If …,) you can Normal Summon this card without Tributing" (NORMAL, face-up only: "Normal Summon" isn't a Set, as Konami's FAQ of these cards says too), "You can Tribute Summon this card (face-up) by Tributing …" (a Tribute Set too without "face-up"). The first two are unclassified effects (`kind: "UNCLASSIFIED"`, `unclassifiedProcedure`); the Tribute Summon, and a "Must (first) be Special Summoned … by" procedure, are no effect (`kind: "CONDITION"`, `conditionProcedure`; Summons, below).
- **An extra Normal Summon** ("you can Normal Summon 1 Tuner …, in addition to your Normal Summon/Set") is one EXTRA_SUMMON_COUNT (`extraNormalSummon`); as a rule while the card is on the field, or for a turn as a move.
- **A Continuous Trap that keeps its target** ([act.ts](grammar/act.ts), `keptActivation` in [shared.ts](grammar/shared.ts)): "Activate this card by targeting {target}" is the card's activation, which keeps targeting it (KEEP_TARGETING, the scripts' c:SetCardTarget) once it has done what it says: nothing more (Dimension Guardian), or a Special Summon of it, after which it keeps it only if it Summoned it ("and if you do": Call of the Haunted's script sets the target only then). Rules its resolution gives the target ("it cannot attack or change its battle position", `keptRules`) are a CONTINUOUS effect on CARD_IT_TARGETS from this card's zone, as the scripts' EFFECT_TYPE_TARGET effects are (Spellbinding Circle, Shadow Spell). Its links have no colon and no chain, so are AUTO: "When this card leaves the field, destroy that target" (its own LEAVE_FIELD), and "When that monster is destroyed / leaves the field, destroy this card" (DESTROYED or LEAVE_FIELD of any card, which must include CARD_IT_TARGETS). Only those events read with "When" and no colon: old texts write triggers that way too ("When this card is Normal Summoned, …"). An activation that moves its target elsewhere (banishes, Tributes or equips it) doesn't read yet.
- **A replacement** ([effects.ts](grammar/effects.ts), `replaced`, `replacedCards`, `instead`): "(Once per turn,) If {cards} would be destroyed (by battle | by {cause}), (you can) {resolution} instead." is an AUTO effect on DESTROY_REPLACE whose `replaces` says whose destruction it replaces: this card's (SELF: "this (face-up) card (on the field)"), the equipped monster's, or every card that matches ("a "Dinomist" card(s) you control", as it is now: on its controller's field, face-up where a face-down card wouldn't show it), all of them at once (ruling `a-replacement-replaces-every-destruction-it-names`), or one ("instead of 1 of those cards"). "You can" makes its first part optional; without it, it always replaces. A monster's replacement from the GY or hand is UNCLASSIFIED (`classOf`, as its FAQs say). A pronoun after a replacement of other cards stops: the event's cards are all those about to be destroyed, not only the ones it keeps. What the rules forbid every replacement (replacing a replacement's destruction, or replacing with a card about to be destroyed too) is left to writers (`EffectSchema.replaces`).
- **A cost of the activation** ([act.ts](grammar/act.ts)): "Activate this card by {gerunds}" is the card's activation with those gerunds as its cost (Toon World's "by paying 1000 LP"), alone or before "; {resolution}"; "Activate this card by {gerunds}, then target {target}; {resolution}" also keeps the target (Premature Burial's form). "Declaring", "choosing" and "placing counters" aren't gerunds yet.
- **A battle position** is a card noun's prefix: "Attack Position" (FACEUP_ATTACK), "Defense Position" (either), "face-down Defense Position"; a face-down monster shows its position, so it adds no FACEUP.
- **An old Ritual Spell** is what it Ritual Summons (the monsters it names, or "any X Ritual Monster", and from where), where its Tributes come from, and how their total Level compares with the Ritual Monster's.

The grammar still has patterns that only one card says, and those are what will least carry over to other cards:

- Nervedo's response to a chain;
- Ash Blossom's list of effects;
- the Mulcharmy limit on other "Mulcharmy" effects, and the shuffle that leaves the hand with a number of cards (its effects are otherwise read from parts: "Each time" an event, "you must" after the clauses that say when);
- Past Lull's chain limit;
- Chaos Angel's grants by Attribute and Medicurius's grants by count;
- Zalen's non-Tuner sentence;
- Super Starslayer TY-PHON's Xyz Summon by one monster, with its reminder and its "If you do";
- Nibiru's Token's ATK/DEF from the Tributed monsters';
- Fydraulis Harmonia's effects by the number revealed, and its lock "until the end of your next turn ..., except Synchro Monsters";
- Enigmaster Packbit's monster placed as a Continuous Trap, and Concours de Cuisine's material lock;
- Gravity Controller's return of "both that opponent's monster and this card";
- Clown Crew Diabolo's "same Attribute but different Types";
- Clown Crew Matinee Operatics's count of card types.

The [rest of the pool](#2-a-sentence-the-reader-doesnt-read-yet) is where the next parts come from: a survey of the sentences of every card that stops counts how often each one, and each point where reading stops, appears.

## Rulings

A ruling is a rule of the game that decides what a card does where its text alone doesn't. Rulings are JSON files under [rulings/](../../../rulings/) (`general/` for OCG base rulings, `tcg/` for TCG overrides, and `cards/` for card-specific overrides), validated against [rulings.schema.json](../../../rulings/rulings.schema.json) and [rulingSchema.ts](../../lib/rulingSchema.ts), and loaded automatically on RML startup inside [library.ts](../../lib/library.ts) (`openLibrary`). `id` defaults to the filename, `region` defaults to `"TCG"` inside `tcg/` (otherwise `"OCG"`), `status` defaults to `"APPLIED"`, and `sources` defaults to `[]`, so adding or updating a ruling takes minimal JSON.

A ruling wins over a card's text, and the text over a script. The TCG plays by the OCG's rulings, except those a TCG ruling `replaces`: a head judge's ruling taken as precedent, or a card's TCG text that plays differently (a mistranslation is played as printed until Konami's database says otherwise, and the database's text is played before it is reprinted; Cheesestrat, 2026-11-17). RML loads TCG rulings by default; pass `--region OCG` (or `--rulings DIR`) on the CLI, or `region: "OCG"` to `openLibrary`. Setting `"status": "WAITING"` in a ruling's JSON disables it immediately on the next startup.

There are three kinds:

- **MEANING:** what words of the text mean ("If" doesn't miss timing). The grammar/finisher checks `holds("<id>")` directly, so flipping `status` or switching regions in JSON takes effect immediately. What it gives a card is the text's own.
- **ADDITION:** what the rules give a card that no word of its text says (a Ritual Monster cannot be Normal Summoned; a Trap's Trigger Effect is Spell Speed 2). Most declare their effect directly in JSON via `gives` (with `sets`, `unsets`, `adds`, `priority`, and `Like` matchers such as `$in`, `$nin`, `$lte`, `$gte`, `$exists`, `$has`, `$only`, `$pick`); the few that depend on dynamic parsing (Equip Spells, face-down visibility) check `holds("<id>")` in code.
- **CARD:** what named cards do in place of what their text reads as (its `gives`). It needs no code: a new one is a new file in `rulings/cards/`. One that sets what the text already reads as is warned of, as the text has caught up with it (a reprint) and the ruling can be deleted.

What an ADDITION or CARD ruling gives a card is tagged in the card's `ruled`: the path of the value, the rulings that give it, and what the text alone reads as there (`without`). Every other value is the text's own. Clown Crew New Face's second effect has:

```json
{ "path": "effects/1/speed", "rulings": ["a-traps-trigger-effects-are-spell-speed-2"], "without": 1 }
```

`textAlone(card)` undoes the tags. It is what a writer of card text writes from, so that it writes no rule, and a script that differs from RML at a tagged value differs from the ruling named there. [test/rulings.test.ts](../../../test/rulings.test.ts) checks:

- on every card that reads, that `textAlone` is the card read with no ADDITION ruling;
- that each ruling's example cards show it, tagged where it gives something;
- that this folder's code references every ruling it follows, and `rulings.schema.json` matches the validator.

To add or update a ruling, edit or drop a `.json` file into `rulings/general/`, `rulings/tcg/`, or `rulings/cards/` (with `"$schema": "../rulings.schema.json"` for autocomplete). It is loaded automatically the next time RML starts; run `npx tsx --test test/rulings.test.ts` to verify.

## What follows from the words (finish.ts)

- **Kind:**
  - its words' kind, if they give one;
  - with an event, the activation of a Spell or Trap on the field that doesn't stay there (ACTIVATE on that event: Malefic Tune, Beetrooper Fly & Sting); otherwise TRIGGER, which a phase is too ("During the End Phase:"), and such a trigger is activated in an open game state during that phase, as ocgcore offers it;
  - IGNITION for a monster's effect;
  - for a Spell's or Trap's effect in the GY or banished, or a Continuous, Field or Equip card's effects on the field: QUICK for a Trap, whose effects are Spell Speed 2 (Clown Crew Finale's and Soiree Operations's GY effects), IGNITION for a Spell;
  - otherwise ACTIVATE, the card's own activation.

  An effect that is never activated says how Konami's FAQ classes it (`classOf`). CONDITION is words that are no effect, which its words decide: a Summoning condition, what an Equip Spell can equip, a Kewl Tune's hand Synchro Material (rulings: summoning-and-equip-conditions-are-not-effects, hand-synchro-material-is-not-an-effect). A monster's CONTINUOUS effect is UNCLASSIFIED when it applies off the field too (Cyber Dragon Core's name "while on the field or in the GY"; ruling: a-monster-effect-that-applies-off-the-field-is-unclassified), or when it is how the card can be used for a Summon (2 Tributes, a non-Tuner; ruling: tribute-and-synchro-material-treatments-are-unclassified). The FAQ classes a Spell's, Trap's or Pendulum Effect's effects only by whether they make a chain link, so those stay CONTINUOUS, as does a monster card's effect while it is a Continuous Trap (Centur-Ion Primera). AUTO stays AUTO: the FAQ calls the AUTO effects that read Continuous Effects (Clown Crew Meteor's, Clear Wing Synchro Dragon's) or effects that make no chain link (Fabled Realm's Revival's, Nervedo's Pendulum Effect), and an AUTO effect it calls unclassified ("After this card is Synchro Summoned, it gains ATK …") has the same words as one it calls Continuous ("If this card's effect destroys a monster, this card gains ATK …"), so the text can't tell them apart. A Summon procedure of the card's own text is kept in `summons`, with the same `kind`: UNCLASSIFIED or CONDITION (Summons, below).
- **Speed**, by the rules: 1 for IGNITION, 2 for QUICK. A TRIGGER is 1, or 2 for a Trap's (Clown Crew New Face's), a trigger on a phase included: it is activated in an open game state during that phase at its card's speed (rulings: a-phase-trigger-is-activated-in-an-open-game-state, a-traps-trigger-effects-are-spell-speed-2; Matinee Operatics's "During the End Phase:" is 1, New Face's "During the Standby Phase:" 2). ACTIVATE is 1 for a Spell, 2 for a Quick-Play Spell or a Trap, and 3 for a Counter Trap.
- **Event:** FREE_CHAIN for a QUICK or ACTIVATE effect without an event of its own.
- **Range (`from`):**
  - none for ACTIVATE;
  - otherwise where its words say this card is;
  - otherwise none for a trigger on its own card's event, which finds the card wherever it went;
  - otherwise the zone its card's effects are in: FZONE for a Field Spell, SZONE for another Spell or a Trap, PZONE in a Pendulum Effect, MZONE otherwise.

  "Field" in the words means that same zone.
- **Flags**, from the text only:
  - CARD_TARGET when it targets;
  - DAMAGE_STEP when the rules let it be activated in the Damage Step, and DAMAGE_CAL when during damage calculation too:
    - a negation of an activation: both;
    - an effect whose event happens there: a battle's, from the start of the Damage Step on (both, for damage calculation's), or one its words say can happen by battle ("destroyed by battle or card effect": Wind Pegasus @Ignister);
    - an optional trigger or Flip Effect on its own card being moved to another place, flipped face-up or changing its battle position, unless it Normal or Fusion Summons (ruling: own-move-triggers-activate-in-the-damage-step). Scrap Recycler's "When this card is Normal or Special Summoned: You can …" can be activated when it is Summoned in the Damage Step. An optional trigger on another card's event that can happen outside the Damage Step can't be activated there, and neither can one whose text says "(except during the Damage Step)".

    A trigger or Flip Effect that must be activated is activated whenever its event happens, the Damage Step included, so it has neither. Counter Traps, and cards that change ATK or DEF, which the rules also let be activated there, don't read yet.
  - DELAY for an optional "If" trigger, which doesn't miss timing. "When" triggers can (Linkuriboh's), and a trigger on a phase ("During the End Phase") has no event to miss.
- **Mandatory:** a TRIGGER or QUICK effect without "You can".
- **Categories:** what its chain link says it does, from the moves of its resolution and the moves and rules of the effects those moves give. Mulcharmy Fuwalos draws, as Maxx "C"'s script says it does, which is how Ash Blossom can negate it.
  - CONTINUOUS, AUTO, UNCLASSIFIED and CONDITION effects have none, because they are never activated, so no chain link reads them.
  - Where a move takes its cards from counts too:
    - SEARCH and DECKDES for adding and sending from the Deck;
    - out of the GY, each as the one card that reads it says: GRAVE_SPSUMMON for a Special Summon and GRAVE_ACTION for adding to the hand, Deck or Extra Deck or banishing, which are Ghost Belle & Haunted Mansion's list; LEAVE_GRAVE for any other move out of it (attached, equipped, placed, Set, returned to the field), which Necrovalley negates with the rest;
    - no TODECK for cards already in the Deck (Dragite's excavated cards, put on the bottom, which only reorders it);
    - TOEXTRA, not TODECK, for a card returned to the Deck that can only go to the Extra Deck: this card, when it is a Fusion, Synchro, Xyz or Link Monster, or cards that can only be those (the Clown Crew returns; 21 of the 25 scripts that return them say TOEXTRA);
    - FUSION_SUMMON for a Special Summon "treated as a Fusion Summon".
  - RELEASE for a Tribute as it resolves (Nibiru), not as a cost; TOKEN for a Token's Special Summon; SPECIAL_SUMMON for a Ritual Summon; SUMMON for a Tribute Summon, and MSET too unless it is said to be face-up; POSITION for a change of battle position; EQUIP for an equip; SSET for a Set of a Spell or Trap (this card, when it is one), MSET for a monster's.
  - A trigger on its own card's event takes that card from where the event left it, when that is one place: sent to the GY, banished, added to the hand, or destroyed (the GY, or the Extra Deck face-up for a Pendulum Monster). Clown Crew New Face placed from the GY has LEAVE_GRAVE.
  - A place counts only when the effect, as it is activated, includes taking cards from there. A pick made as the effect resolves could still come from any of its places. A target, or this card, is already somewhere, so a place counts only if it can be nowhere else. S:P Little Knight's "1 card on the field or in either GY" has no GRAVE_ACTION, because Ghost Belle can't negate it while it targets a card on the field.
- **Pick ids:** TARGET, then CHOSEN1, ALL1, DECK_TOP1, RANDOM1, numbered in the order the effect makes them. Its conditions' counted cards are COUNTED1, COUNTED2, and so on.
  - The order is conditions, cost, targets, then the resolution's parts; each mode starts from where the modes begin.
  - A pronoun is the cards mentioned last, and agrees with them in number: "them" is whatever was mentioned last, "it" and "that card" the last mention that can be one card. Parametalfoes Azortless's "shuffle 2 face-up Pendulum Monsters … into the Deck, and if you do, destroy that card" destroys its target, not the 2 monsters. Before anything is mentioned, a pronoun is what the event mentions: this card for its own event (Golden Cloud Beast - Malong's "increase or decrease its Level"), the attacking monster for an attack declaration, the chain link's card for an activation, otherwise the cards the event happened to.
  - "That monster" is the monsters mentioned last: Enigmaster Packbit's "discard 1 card, and if you do, place that monster" places its target, not the discarded card. "That target" is the effect's target, whatever was mentioned after it. On a card whose activation keeps its target, "that target" in an effect without one of its own, and "that monster" where this card, a Spell or Trap, can't be meant, are the card it targets (Call of the Haunted's "When this card leaves the field, destroy that target"). "That monster" is the event's card only until the effect picks something: after a pick its words don't say are monsters, it stops the reading, since those may be the monster meant (Blue Rose Dragon's "1 "Black Rose Dragon" or 1 Plant monster in your GY; Special Summon that monster": a name doesn't say what its card is).
  - "The excavated cards", "the detached material" and "the Tributed monsters" are the last pick of that kind of move; "the number revealed" counts every card the effect revealed (Fydraulis Harmonia: itself and the Synchro Monsters).
  - References in an effect a move gives are to this effect's cards (Nibiru's Token gets the Tributed monsters' ATK).
  - A pick's count, places and filter are written on the first move that takes its cards on each path through the modes; later moves name it by its id alone.
  - A target that no move takes as its cards (the monster an equip goes to, its `to`) is described in `legal`, as what activating the effect needs: that many such cards there to target.
- **What a card's effect gives that card** is lost when its effects are negated: its `until` gets RESET_DISABLE after LEAVES_FIELD_OR_FLIPS (Clear Wing Synchro Dragon's ATK, Malong's Level; their scripts reset the same way).
- **REVIVE_LIMIT** is ignored by a Special Summon whose words name a Ritual Monster in the hand or Deck (Ritual Monsters, below), or whose pronoun refers to one picked there: "send 1 Ritual Monster from your Deck to the GY, then Special Summon it" Summons one that hasn't been Summoned properly since. The reading stops where the places mix ("from your hand or GY": one move can't ignore it from one place and not the other), and where a monster picked elsewhere was taken by another move first, which could have put it in the hand or Deck ("add 1 Ritual Monster from your GY to your hand, then Special Summon it"): where it is by then isn't followed. No card in the database has either.
- **Mode limits:** each mode with a limit of its own gets the limit, its counter numbered with the card's others in printed order.

### Face-up (`located` in phrases.ts)

A card that could be face-down where it is must be face-up when the filter checks something a face-down card doesn't show.

- **What a face-down card shows.** On the field it still shows what kind of card it is: a monster in a Monster Zone, and a Spell or Trap in a Spell & Trap Zone. So Mystical Space Typhoon's "1 Spell/Trap on the field" can be a Set card, and so can Diabell's cost.
- **Banished face-down.** A face-down banished card shows nothing, so only an effect that names nothing but "banished cards" can choose one (Kashtira Arise-Heart's "Attach 1 banished card to this card as material"), unless its words say it can (Gizmek Naganaki, the Sunrise Signaler's "1 of your banished face-down Machine monsters whose ATK equals its own DEF"; Cheesestrat, 2026-11-16). Neither card reads yet.
- **Pendulum Zone.** A card there is always face-up.
- **The GY.** Every card there is face-up already.
- **Places that needn't be face-up.** When the cards can also come from places where they needn't be face-up (the hand), the filter is "from those places, or face-up".
- **"Monster" says nothing** where only monsters can be: the Monster Zone, the Extra Deck, materials, and Summons.
- **Revealed as it is used.** The game reveals its player's own monsters as it uses them as a Tribute or Fusion Material, so those can be face-down whatever the filter checks, and only the words ("face-up") make them face-up (ruling: own-monsters-are-revealed-as-they-are-used). The opponent's face-down monsters show nothing (Cheesestrat, 2026-11-16), so when another effect lets a player Tribute them, a filter that checks what a face-down card doesn't show needs them face-up: the filter is "its player's own in the Monster Zone, or face-up". Linkuriboh's "Tribute 1 Level 1 monster" can Tribute a Set one of its player's, and only a face-up one of the opponent's.

## Conventions of the expected RML

- **Left out because it follows from the rest:**
  - `declares`: the moves say what is moved, and from where.
  - `legal` and `costChecks`: an effect can be activated only if it can do what it says. `legal` only describes a target no move describes (above).
  - The `reasons` of moves: whether it is a cost or the resolution.
  - The REVEAL after adding from the Deck: the rules show the card.
  - Checks the rules make.
- **Left out because they aren't in the text:** `description` and `label`.
- **Limits:**
  - "You can only use … once per turn" is hard (shared by NAME, oath false): it counts once the effect is activated, whether the activation or the effect is negated after.
  - "You can only activate …" is an oath: it counts once the effect is activated too, but negating that activation gives the count back (ruling: activate-limits-are-oaths-use-limits-are-not; ocgcore's oath does the same). "… this way" is an oath as well, as the scripts write it: what it limits isn't activated, so nothing gives it back.
  - "Once per turn" is soft (COPY), and "Once while face-up" is WHILE_FACE_UP. A turn limit on the same effect goes in `alsoLimit`.
  - "each" gives every named effect its own counter, and "1 X effect per turn" gives them one counter between them.
  - "You can activate 1 of these effects (but you can only use each effect of X once per turn)" gives each mode a hard limit of its own (`Mode.limit`); the effect has none.
  - Twins share their counter. Counters run in printed order across parts, Summon limits and mode limits included.
  - "You can only activate 1 X per turn" and "You can only activate X once per turn" limit the card's activation. When that is the rules' activation (a Continuous, Field or Equip card's), the limit goes on the ACTIVATE the rules give it.
- **Continuous Spells and Traps, and Field Spells:** the first effect is its activation, ACTIVATE, with nothing else: activating it puts it on the field, where its effects work. A text that says what activating it does ("When this card is activated: …") is that activation instead. Any other Spell or Trap has one activation, so a second sentence that would be one stops the reading.
- **Equip Spells:** the rules give the activation, as aux.AddEquipProcedure writes it: target 1 face-up monster on the field (on the side "Equip only to … you control" says) and equip this card to it, with CARD_TARGET and CONTINUOUS_TARGET. "Equip only to X" is an EQUIP_LIMIT (X, or any monster) of kind CONDITION, which is no effect: CANNOT_DISABLE and UNCOPYABLE. An effect that reaches the equipped monster has no range of its own: it works while this card is equipped, which is only on the field.
- **Summons, in this order:**
  1. the materials' method, or RITUAL from the hand for a Ritual Monster;
  2. the text's procedures (only in `summons`, not in `effects`), such as Clown Crew Biancaviso's Tribute Summon by Tributing one monster, face-up only (`positions`). One its player can choose, "(If …,) you can Special Summon this card (from your hand)" or "you can Normal Summon this card without Tributing", is an effect of the card to Konami, unclassified, so negating the card's effects stops it: `kind: "UNCLASSIFIED"` (ruling: special-summon-and-no-tribute-procedures-are-unclassified; Elfnote Lucina's, Power Invader's). The text's other procedures are no effect, which nothing negates: `kind: "CONDITION"` on a Summoning condition's procedure ("Must (first) be Special Summoned … by"), "You can Tribute Summon this card by Tributing …" (Biancaviso's, which Konami's Japanese text never numbers as an effect; The Great Gallant Bandit's extra Tributes too, on its `extraMaterials`) and TY-PHON's "you can also Xyz Summon this card" (ruling: summoning-and-equip-conditions-are-not-effects). The two are written apart, not as "an effect or not", so that a wording found to be the other can move alone (Cheesestrat, 2026-11-21: Tribute procedures may turn out to be both: Pyrotech Mech - Shiryu's FAQ calls its one unclassified). The rules' Summons and a materials line's have no kind. The scripts give UNCLASSIFIED procedures UNCOPYABLE only, and CONDITION ones CANNOT_DISABLE too;
  3. PENDULUM, from the hand and the Extra Deck, or only the Extra Deck for an Extra Deck Pendulum Monster (Patissciel Couverture);
  4. NORMAL, or TRIBUTE by Level (one Tribute for 5–6, two for 7+, with any extra Tributes the text allows).

  A monster that "Must be Special Summoned … by" a procedure (not "must first be") has a SPSUMMON_CONDITION effect that only that procedure passes, so it can't be Pendulum Summoned. "You can only control 1 X" and "There can only be 1 X on the field" are `onlyOne` (on its player's field, or on the field): of this card when X is its name, or of the cards that match X (`card`: "There can only be 1 face-up "Malefic" monster on the field"). A sentence that names another card this way stops the reading: it would be a rule of that card. Konami's FAQ classes `onlyOne` as an unclassified effect (all 52 FAQs that class it), so negating the card's effects lifts it, as SetUniqueOnField has it.
- **Ritual Monsters**, by the rules, can't be Normal Summoned or Set, and must be Ritual Summoned before they can be Special Summoned another way (`cannotNormalSummon`, `mustBeProperlySummoned`). "You can Ritual Summon this card with a "Clown Crew" card." reads as nothing: it reminds that the archetype's cards can Ritual Summon it, which the rules allow anyway.
  - From the hand or Deck, a Ritual Monster can only be Ritual Summoned, Special Summoned "treated as a Ritual Summon", which is the same, or Special Summoned "ignoring its Summoning conditions", which Summons it improperly, unless the Special Summon's words name a Ritual Monster: the card says it can, so it ignores REVIVE_LIMIT (Poissonniere de Nouvelles's "Special Summon 1 "Nouvelles" Ritual Monster from your hand"). That Summon isn't proper either, so the monster still can't be revived after (ruling: words-that-name-a-ritual-monster-can-summon-it). From the GY or banishment the words are met by a Ritual Monster that was Summoned properly, so they ignore nothing: Dragon Master Magia can't revive a Ritual Monster that wasn't Summoned properly (Cheesestrat, 2026-11-16), and its script agrees.
  - "Ritual Monster" is `{ types: ["RITUAL"], allTypes: ["MONSTER"] }`, and a list of frames with Ritual in it gets `allTypes: ["MONSTER"]` too, because Ritual Spells are TYPE_RITUAL as well. "Ritual Spell" is `{ types: ["RITUAL"], allTypes: ["SPELL"] }`.
  - A Ritual Summon (Clown Crew Rehearsal's) is the RITUAL_SUMMON move: `to` is the monsters it can Tribute, and `levels` how their Levels compare with the Ritual Monster's.
  - An old Ritual Spell says it in two sentences: "This card is used to Ritual Summon X. You must also Tribute monsters from your hand or field whose total Levels equal or exceed the Level of the Ritual Monster you Ritual Summon." That is the same RITUAL_SUMMON. Where it prints the total as a number ("whose total Levels equal 8 or more"; 13 cards), the number stays 8 when an effect changes the Ritual Monster's Level: `levelTotal` is that number, which `levels` compares with in place of the Ritual Monster's Level (the scripts use GetOriginalLevel there, and GetLevel for "the Level of the Ritual Monster"). Older texts that put the places last ("whose total Levels equal 8 or more from the field or your hand") aren't read: RML doesn't include old texts (Cheesestrat, 2026-11-16).
- **Tribute Summons:**
  - "Tribute Summoned" is `summonedBy: ["ADVANCE"]`; "If this card is Tributed" is the RELEASE event.
  - "Tribute Summon" without "face-up" is a Tribute Set too (ruling: a-tribute-set-is-a-tribute-summon): New Face's "If you Tribute Summon a monster" and Meteor's "when you Tribute Summon a monster" are twins on SUMMON_SUCCESS and MSET, and Biancaviso's "Tribute Summon 1 monster" has MSET as a category. Soul Exchange's, Escalation of the Monarchs's and Biancaviso's own scripts allow a Tribute Set, and the scripts of cards that say "face-up" don't. A trigger on the Tribute Summon of a monster that must be something a face-down monster doesn't show ("If you Tribute Summon a LIGHT monster") isn't on its Tribute Set, as a Set one doesn't show it. "Tribute Summon … face-up" is a NORMAL_SUMMON with `position: ["FACEUP"]`. A Tribute Set isn't a Normal Summon ("If a monster is Normal Summoned"), as in the OCG (below).
  - "the number of monsters Tributed" (for its Tribute Summon) counts the Summoned monster's materials, `SUMMON_MATERIALS`: a Tribute Summon's materials are its Tributes.
- **A Tribute takes monsters**, from a Monster Zone unless the text says the hand too, whatever its words name ("Tribute 1 "Gearfried the Iron Knight""), face-down too when they are its player's own (Face-up, above).
- **"If this card is banished:"** is its banishment, the REMOVE event; "while this card is banished" is where it is, as "If this card is in your GY:" is.
- **Moves joined by "and"** ("Banish … and Special Summon …", "banish this card, and Tribute 1 …") are one part, done together.
- **Counts:** "up to N" is 1 to N, and "any number of" is 1 to 99. Two picks made as one ("1 X and 1 Y") take each one's count among them; "up to 1 X and up to 1 Y" is 1 or 2 cards, at most 1 of each (a card that is both can be either).
- **Places:** PLACE puts a card in its owner's zone unless the text says whose, and `zones` says which when it could be either: PZONE ("in your Pendulum Zone") or SZONE ("in its owner's Spell & Trap Zone").
- **Locks:**
  - "until the end of the next turn after this effect resolves" is END_PHASE twice; "until the end of your next turn" is OWN_NEXT_TURN_END.
  - What its player can't use as material is an effect on the player (Concours de Cuisine's CANNOT_BE_FUSION_MATERIAL and the rest), with `cards` the monsters it reaches.
  - A lock whose subject is a player is an effect on players, and a monster unaffected by card effects doesn't escape it: Elfnote June Pride's "neither player can declare attacks, except with monsters in their center Main Monster Zones" and Terminus's "you cannot declare attacks …, except with "Power Patron" monsters". One whose subject is monsters is an effect on them, which doesn't reach an unaffected one: S:P Little Knight's "your monsters cannot attack directly" (ruling: a-lock-on-players-binds-unaffected-monsters).
- **Synchro materials:**
  - Every slot after a Synchro Monster's first has role NON_TUNER, as its materials line says.
  - "Treat 1 X as a Tuner" lets the first slot be a Tuner or an X.
- **Crocodragon's draw:** "the number of non-Tuners used for its Synchro Summon" counts its Summon's materials used as non-Tuners (`role: "NON_TUNER"`). A material's role is what it was used as, whatever its type: Zalen treated as a non-Tuner counts, and Ib's Normal Monster treated as a Tuner doesn't. That they are its materials minus its 1 Tuner is a warning, not RML: the text doesn't say it.
- **"and if" makes what follows depend on what came before.** ", and if *condition*," is "and if you do" with a condition: Number 90 destroys the monster only if it negated its effect, and only if the detached material was a "Galaxy" card. Cheesestrat confirmed this for Number 90 (ruling: and-if-makes-what-follows-depend). The scripts read the wording the same way on other cards: Magical Trick Mirror and Invincible Demise Lord do the second action only if the first succeeded. A clause that doesn't depend on another is written with "also".
- **"when" is the last thing to happen.** "Your opponent cannot activate cards or effects when that monster is Special Summoned" (Theorealize Past Lull) applies only if the Summon is the last thing to happen: outside a chain, or as chain link 1 resolves, the chain's last (ruling: when-is-the-last-thing-to-happen, which Clown Crew Meteor's FAQ in Konami's database says of it). The condition is `chainLinks` at most 1. Clown Crew Meteor's "when you Tribute Summon a monster" is read the same way, and its script does the same.
- **`mustBeProperlySummoned`:** true for Extra Deck monsters and Ritual Monsters, and for text that says "Must be Special Summoned".
- **Archetypes:**
  - Each archetype name anywhere in the card's name, its first letter in either case, in order of where it starts: "Linkuriboh" is a "Kuriboh" card. Read this way, the names of the database's 14,239 cards give their setcodes for 13,499, against 13,300 when a name must start a word. A name inside another one is left out: "Synchro Dragon" is already "Synchro".
  - Then the archetypes the text says it is "always treated as".

## Schema additions ([cardSchema.ts](../../lib/cardSchema.ts))

All are optional:

- **New fields:**
  - CardSchema `ruled`: what the rulings give the card that its text doesn't say ([Rulings](#rulings));
  - SummonMethod and ExtraMaterials `kind` (UNCLASSIFIED or CONDITION: whether the text's procedure is an effect), `zones`, `limit`, `materialsRequire` (what its materials must be together: Diabolo's) and `positions` (Biancaviso's face-up Tribute Summon);
  - ExtraMaterials `positions`;
  - EffectSchema `alsoLimit`;
  - Mode `limit`;
  - Move `pickRequires`, and `levels` and `levelTotal` for RITUAL_SUMMON;
  - CardFilter `originalTypes` (what it is as printed: Packbit's "Monster Card") and `reasonPlayer` (Wind Pegasus's "an opponent's card effect").
- **New values:**
  - EffectKind `UNCLASSIFIED` and `CONDITION` (Kind, above);
  - CardRules `onlyOne.card` (Malefic's "There can only be 1 face-up "Malefic" monster on the field");
  - Condition.chainLink `card` ("Special Summoned by the effect of a "Drytron" monster");
  - Value `activations` and `sum` (Nibiru's "the combined original ATK");
  - Counted `cardTypes` (Matinee's "the number of different card types");
  - MoveName `SWAP_ZONES` and `RITUAL_SUMMON`;
  - the state ARRIVED_THIS_TURN ("except the turn it was sent there", "the turn it is Link Summoned");
  - `until` OWN_NEXT_TURN_END; PLACE `zones` PZONE and SZONE; SPECIAL_SUMMON `player: "BOTH"`, one card to each field;
  - CardNumber `ORIGINAL_LEVEL`;
  - CardFilter `originalArchetypes` and `originalAttributes`;
  - Who `PREVIOUS_CHAIN_LINK`, `PREVIOUS_CHAIN_LINK_CARD` and `SUMMON_MATERIALS`;
  - Property `PLACE`;
  - Condition.effect `card`;
  - Condition.chainLink `link: "PREVIOUS"`;
  - CardRef `{ all: { from, card } }`, `{ happened: { events, card, turnsAgo } }` (the cards events happened to this turn or before: Nibiru's and TY-PHON's counts of the opponent's Summons), `role` for SUMMON_MATERIALS used as a role, and `by` for HIGHEST and LOWEST (TY-PHON's "with the highest ATK");
  - CHAIN_LIMIT's `until: SUMMON`;
  - the ACTIVATE_AS_QUICK rule;
  - the COUNTED ids.

## Where it differs from the scripts

Each difference between this reader's RML and what MyCard's scripts register has one of these reasons. The list covers every card that reads, as of 2026-11-16: 1,329 of the database's 14,239. That is 690 Normal Monsters, 13 other monsters without effects, and 626 cards with effects: the 65 in test/expected and 561 more. Two checks were made:

- **Registration**, on every one: each RML effect against the script's registered effect: kind, speed, event, range, flags, categories and limits.
- **Moves:** what each effect does, read by hand against the text, for the 257 that read on 2026-11-15, and for the rest where registration showed a difference. There is no RML-to-script writer yet to compare operations with.

### 1. A game rule

RML says how the card works, rules included. Each rule is a ruling ([Rulings](#rulings), above), and its file says how the scripts differ from it (`scripts`). As of 2026-11-21 the reader follows 31 rulings, and 6 wait.

**What the rules give a card that its text doesn't say.** These are tagged in the card's `ruled`. The count is of the 1,329 cards that read:

| Ruling | Cards tagged |
| --- | --- |
| `monsters-are-normal-summoned-by-level` | 1,010 |
| `own-move-triggers-activate-in-the-damage-step` | 185 |
| `a-face-down-card-shows-only-its-kind` | 133 |
| `extra-deck-monsters-are-summoned-properly-first` | 59 |
| `own-monsters-are-revealed-as-they-are-used` | 28 |
| `continuous-and-field-cards-are-activated-first` | 27 |
| `equip-spells-are-activated-on-a-monster` | 19 |
| `pendulum-monsters-are-pendulum-summoned` | 16 |
| `ritual-monsters-are-ritual-summoned` | 16 |
| `a-traps-trigger-effects-are-spell-speed-2` | 8 |
| `what-an-effect-gives-its-own-card-ends-when-negated` | 2 |

**What words mean.** These aren't tagged: what they give is the text's own.

- `an-activation-declares-everything-it-does`
- `to-face-down-defense-is-a-change-of-position`
- `if-triggers-do-not-miss-timing`
- `when-is-the-last-thing-to-happen`
- `and-if-makes-what-follows-depend`
- `a-phase-trigger-is-activated-in-an-open-game-state`
- `activate-limits-are-oaths-use-limits-are-not`
- `once-per-chain-activation-limits-are-by-name-and-oaths`
- `each-mode-is-limited-on-its-own`
- `a-lock-on-players-binds-unaffected-monsters`
- `a-tribute-set-is-a-tribute-summon`
- `a-tribute-set-is-not-a-normal-summon`
- `a-tribute-takes-monsters-from-the-monster-zone`
- `a-synchro-monsters-other-materials-are-non-tuners`
- `words-that-name-a-ritual-monster-can-summon-it`
- `hand-synchro-material-is-not-an-effect`: "If this card on the field would be used as Synchro Material, 1 Tuner in your hand can be used as 1 of the other materials" is not an effect (Konami's FAQ of the Kewl Tune cards), so it can't be negated and isn't copied: RML gives it kind CONDITION, with CANNOT_DISABLE and UNCOPYABLE, as the scripts do.
- `summoning-and-equip-conditions-are-not-effects`: a Summoning condition and "Equip only to …" aren't effects either (Konami's FAQ of Vidolium, Gem-Knight Seraphinite and Dark Energy): kind CONDITION, as above.
- `a-monster-effect-that-applies-off-the-field-is-unclassified` and `tribute-and-synchro-material-treatments-are-unclassified`: which of a monster's effects that aren't activated Konami classes as neither Continuous nor any other kind (UNCLASSIFIED; Kind, above).
- `special-summon-and-no-tribute-procedures-are-unclassified`: "you can Special Summon this card (from your hand)" and "you can Normal Summon this card without Tributing" are unclassified effects (The Tricky's, Power Invader's and Elfnote Lucina's FAQs): `kind: "UNCLASSIFIED"` on the summon. Pyrotech Mech - Shiryu's FAQ calls its Tribute Summon by 1 Tribute one too, where 26 FAQs of the same wording call it no effect: the file leaves it to a person.

**Waiting.** Each file has its question, and what the reader does meanwhile:

- `which-effects-target-a-player`
- `a-monster-that-only-cannot-be-normal-summoned` (Rare Metal Dragon)
- `what-an-equip-by-effect-gives-the-monster`
- `a-special-summon-from-the-deck-is-declared`
- `tcg-a-tribute-set-is-a-normal-summon`, which would replace the OCG's `a-tribute-set-is-not-a-normal-summon` in the TCG
- `a-halved-atk-is-set-or-final`

**Where they come from.** Six of the 27 have an entry of Konami's database as a source, read on 2026-11-16 (the sixth on 2026-11-20): the hand Synchro Material (the FAQ of Kewl Tune Cue and five more Kewl Tune cards), the Damage Step ruling (the FAQ of Scrap Recycler, Clown Crew Meteor and Clown Crew New Face), "when" (Clown Crew Meteor's FAQ), the Tribute Set as a Tribute Summon (Q&A 9667, 14943, 6339 and 22554) and not as a Normal Summon (Q&A 21127), and each mode's own limit (Q&A 23977). Eight name the rulebook's section from memory: neither the page nor the wording has been checked against it. The other 13 rest on a person's statement (Cheesestrat's, or Claude's reading) until a source is found for each.

### 2. A sentence the reader doesn't read yet

The other 12,910 cards stop with a `TextStop`: 266 at the names stage and 12,644 at the sentences stage. Of the sentences of the cards that stop, 31.4% read (10,808 of 34,424). The stop names the part, where reading got to, and what was expected there. A part also stops when its words read but don't make sense together, or say what RML can't:

- a second sentence that is the card's activation (above), which old texts have: Six Scrolls of the Samurai and Attack Reflector Unit ("Tribute 1 "Cyber Dragon". Special Summon …"), whose scripts make the first sentence a cost. RML doesn't include old texts (Cheesestrat, 2026-11-16), and the grammar has no patterns for their words, such as an old Ritual Spell's "from the field or your hand" or "This card can only be Special Summoned by";
- "It" starting a sentence after one that doesn't equip this card (Cyber Revsystem's "It cannot be destroyed by card effects", after a Special Summon), or after an effect that equips it (above);
- a pronoun with no card before it to refer to (Enneacraft Release);
- words about the card this card targets, on a card whose activation doesn't say it keeps one (Release from Stone; Reading a card, above), and "that monster" after a pick its words don't say are monsters (Blue Rose Dragon; pick ids, above);
- an old Ritual Spell's total of Levels printed as a number (Ritual Monsters, above);
- a Ritual Monster Special Summoned from the hand or Deck and from elsewhere at once, or picked elsewhere and taken by another move first (REVIVE_LIMIT, above).

### 3. A bug in the script, or a preference of its host

Each of these is for a person to inspect. A preference can be ignored there.

- **The Ars Magna Quick Effects.** The scripts give each "Ars Magna" monster a Quick copy of its effect that checks for Citrinitas. RML says it where the text does: Citrinitas's continuous ACTIVATE_AS_QUICK.
- **Crocodragon's draw.** The script counts its materials minus 1, the shortcut the warning gives.
- **Checks the text doesn't make:**
  - Patissciel Couverture's trigger also needs it to have been face-up.
  - Fydraulis Harmonia lets 5 Synchro Monsters be revealed only while the opponent controls a monster.
  - Linkuriboh's first effect needs the attacker's ATK to be more than 0.
  - Wind Pegasus @Ignister's trigger needs it not to be among the destroyed cards.
- **A check the rules make that a script doesn't:** Clown Crew Fiends's Set doesn't check for a free Spell & Trap Zone.
- **A limit the text gives that a script doesn't:** Dotscaper's "You can only use 1 "Dotscaper" effect per turn" (its script has only "once per Duel"). RML's reading is right (Cheesestrat, 2026-11-16).
- **A cost in its categories:** The Fabled Kokkator's discard is a cost, and its script's categories have HANDES_SELF.
- **How it is worked out:**
  - Nibiru's Token gets the Tributed monsters' printed ATK/DEF (GetTextAttack), not their original ATK/DEF, which a monster's own effect can change.
  - Linkuriboh sets the attacker's ATK with SET_ATTACK_FINAL. RML's SET_ATTACK is the change "to 0", applied in timestamp order.
  - Packbit's monster stays a Continuous Trap until it leaves the field. The script's reset (RESETS_STANDARD-RESET_TURN_SET) also ends it when it is flipped face-down.
- **Preferences:** descriptions and hint timings (check.ts ignores SetDescription and SetHintTiming), and Broken Bamboo Sword's "gains 0 ATK", which its script doesn't register.

**Encoding.** The same card, written another way. A writer from RML that writes it the scripts' way removes each of these. They are preferences in the sense above:

- Summon procedures as effects (SPSUMMON_PROC, SUMMON_PROC, ADD_EXTRA_TRIBUTE), where RML has them in `summons`.
- The scripts' helper effects (MATERIAL_CHECK, an AUTO on SPSUMMON_SUCCESS).
- UNCOPYABLE on an Equip Spell's EQUIP_LIMIT, which RML gives every CONDITION and aux.AddEquipProcedure leaves out: nothing copies an equip limit, so it changes nothing.
- SINGLE_RANGE, and a range on an effect of the card itself (Chaos Angel, Gravity Controller, Peten, and the EQUIP_LIMIT of 18 Equip Spells).
- A FLIP effect without "You can" is mandatory, which ocgcore's EFFECT_TYPE_FLIP doesn't mark (19 cards).
- An event written another way: "If this card on the field is destroyed" as LEAVE_FIELD with a destruction check (T.G. Power Gladiator), "If this card destroys an opponent's monster by battle" as the destroyed monster's BATTLE_DESTROYED (Masked HERO Dian).
- What the rules give, written as an effect: Gem-Knight Prismaura's "Must first be Fusion Summoned" as a Summon condition from the Extra Deck, and the name a card has on the field ("This card's name becomes …") registered by a helper (Proto-Cyber Dragon, Blaze Accelerator Reload).
- A card that changes itself to face-down Defense Position "Once per turn" (Des Lacooda, Swarm of Scarabs, Golem Sentry, Geargiarmor, Guardian Sphinx: 8 cards): the scripts keep a flag the flip resets, where RML's soft limit and the rule that a card flipped face-down is a new card give the same.
- CARD_TARGET set as the effect is activated, for a target it may not take (Fire Formation - Yoko).
- One effect with two rules, where the scripts write two effects: ATK and DEF (Muka Muka, Enraged Muka Muka, Crocodragon); Rhapsodia's two attack locks.
- Merged events, CHAIN_END and custom event codes, where RML has twins (New Face, Meteor, Droll & Lock Bird).
- How limits are written:
  - counters numbered another way (Lucina, Fortuna, Nervedo, Psiics);
  - a player flag for a limit (Nervedo's negation);
  - NO_TURN_RESET for "Once while face-up" (Citrinitas, Wind-Up Kitten);
  - counters numbered from the script's own ids (Meklord Assembly).
- EVENT_FREE_CHAIN as the code of an Ignition Effect (Code Igniter, Clown Crew Rehearsal, Fiendsmith's Tract).
- Categories set for the chosen mode as it is activated (Poissonniere, Meteor).

### And two more reasons

**The database's text.** The text read may not be the card's:

- Ritual Sealing, Anti-Fusion Device and Nobleman-Eater Bug have an old text ("Destroy 1 face-up …", "FLIP: Destroy 2 monsters on the field.") that doesn't target, and their scripts target.
- 48 cards warn where the archetypes their name gives aren't the database's setcodes, or the other way round. Examples: "Puppet" for Junk Puppet, "Rose" for Rose Bell of Revelation, "Warrior" for Warrior Elimination, "LV" for Magnet Circle LV2.

**This reader's bugs.** The review on 2026-11-15 found seven:

- **Fixed:**
  - "If this card is banished:" read as where the card is, not as its banishment (Psiics, Metaphys Ascension).
  - A Field Spell had no activation, and worked from a Spell & Trap Zone (Fortissimo the Mobile Fortress).
  - "up to 1 X and up to 1 Y" took exactly 2 cards (Evil★Twin's Trouble Sunny).
  - A Tribute of a named card could take it from a Spell & Trap Zone (Release Restraint, Rose Bud).
- **Now stops:**
  - Six Scrolls of the Samurai and Attack Reflector Unit read as two activations.
  - Cyber Revsystem's "It" was read as the Spell itself.
  - Enneacraft Release threw a plain Error.

Comparing each new reading since found more, all fixed:

- Parametalfoes Azortless's "destroy that card" destroyed the 2 shuffled monsters: pronouns didn't agree in number.
- Fire Formation - Domei's trigger got "You can only activate 1 "Fire Formation - Domei" per turn", which limits the card's activation.
- A continuous effect lost its "while this card is in …" (`where`).
- Plunder Patroll Shipyarrrd's Set of itself, a Field Spell, was an MSET.
- Moves out of the GY that Ghost Belle doesn't name (attached, equipped, placed, Set, returned to the field) had GRAVE_ACTION, which would let Ghost Belle negate them. They have LEAVE_GRAVE (Clown Crew New Face's expected RML changed with it).
- An old Ritual Spell's printed total was first read as the Ritual Monster's Level, checked against its printed Level; that is wrong once an effect changes its Level, so those now stop (above).

A test reads every card in the database: each one reads or stops, and nothing else is thrown. The Errors left are of two kinds:

- a code that isn't a card the database can describe (no text row, no data row, no frame, no kind);
- a grammar that is itself wrong, which that test would show.

### Sangan's RML from the scripts

Sangan's data/rml was read from the scripts at 8bb7ed02. It says whatever the scripts register, so it carries the script bugs above: the Ars Magna Quick copies (with the Citrinitas check `unread`), Fleur Synchron without DELAY, Flair's MSET, New Face's triggers at Spell Speed 1. It also misses what a reader of scripts can't see, because ocgcore or another card's script applies it: Flair's rules as a Ritual Monster, and its Ritual Summon. And it misses some things its converter didn't read:

- TY-PHON's Xyz Summon by one monster;
- the Pendulum Zone that Poissonniere and Couverture place themselves in (its PLACE moves have no `zones`);
- that Couverture can't be Pendulum Summoned from the hand: it gives every Pendulum Monster a Pendulum Summon from the hand.

## What's left

- **The grammar reads a tenth of the pool.** It was written for the 65 cards, and reads 561 more with effects. On 2026-11-21, 1,721 cards read, from 1,686 the day before (Continuous Traps that keep their target, battle positions as card prefixes, "that monster" as what a move takes, activations with a cost, destruction replacements), and from 1,474 on 2026-11-19: lists, tails and card postmodifiers read with one shape each (above), and Extra Deck monsters without effects read. Another card will most likely stop at the sentences stage, which is the reader doing its job: it says where, and what it expected. The commonest sentences that stop, from the survey: Xyz Monsters' gained effects ("(You can only gain this effect once per turn.)", "Transfer its materials to this card."), Gemini monsters ("This card is treated as a Normal Monster while face-up on the field or in the GY."), "This effect cannot be negated.", the old Equip Traps' "When this card leaves the field, destroy that monster.", the replacements that don't read yet ("If it would be destroyed", "exactly 1 … would be destroyed") and "The first time … would be destroyed … each turn, it is not destroyed", and the rest of "Activate this card by …" (by declaring or choosing; targeting, then equipping or banishing). The patterns written for one card are the first to generalise.
- **Not wired in.** The reader isn't an option of the CLI or of pipeline.ts yet, and Sangan can't yet choose between the scripts and RML read from text (the scripts for real-life play, RML for self-play and learning).
- **Rulings:**
  - Nothing uses the tags yet: there is no writer of card text, and no writer of scripts from RML to compare with the scripts value by value. `textAlone` is checked against the reader only.
  - 13 rulings rest on a person's statement, and 8 name the rulebook's section without having been checked against it (above).
  - Clown Crew New Face's FAQ in Konami's database says a Continuous Trap can be activated with one of its effects in the same Chain Link ("the card can be activated on its own, or with its ① or ② effect in the same Chain Link"). RML has the activation and the effects apart, and no ruling for it yet.
  - The rulings aren't an option of the CLI: nothing lists which cards a ruling tags, or reads for the OCG, but the tests.
