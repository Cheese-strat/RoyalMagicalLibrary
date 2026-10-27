# Same feature, different scripts

Written 2026-10-27, Claude, at Cheesestrat's request. Every example is a real script from MyCard's data (the commits Sangan's `data/` is on), with RML's reading as of that date, cut to the lines that matter.

Many cards do the same thing, and their scripts are written in different ways: older scripts (`c<code>.` functions) and newer ones (`s.`), different people's habits, and ocgcore's own ways of doing one thing. This matters to Sangan because its description inputs (notes/rml-pipeline.md in Sangan, step 7) give one weight to everything with the same feature: that only works if the same feature reads the same however it is scripted. For each feature below: the ways scripts write it, how RML reads each, and whether they come out the same (**same**) or not (**differs**, with what it would take).

The labels used are in the README ("The labels of each part").

## 1. Add a card from the Deck to the hand

Three ways of checking that a card was found before adding it:

```lua
-- Thunder Dragondark (56713174), an older script
local g=Duel.SelectMatchingCard(tp,c56713174.filter,tp,LOCATION_DECK,0,1,1,nil)
if g:GetCount()>0 then
    Duel.SendtoHand(g,nil,REASON_EFFECT)
    Duel.ConfirmCards(1-tp,g)
end
-- Fighting Flame Swordsman (1047075), a newer one: the same with #g>0
-- Infernal Flame Banshee (29423048): one card, and a guard
local tc=Duel.SelectMatchingCard(tp,s.filter,tp,LOCATION_DECK,0,1,1,nil):GetFirst()
if not tc then return end
```

```
CHOOSE ID=CHOSEN1 COUNT=1 FROM={OWN=DECK} FILTER={CODE=THIS_CARD ABLE_TO=HAND}
TO_HAND SUBJECT={REF=CHOSEN1} PICK=CHOSEN IF=[{ANY={REF=CHOSEN1}}]       (g:GetCount()>0 and #g>0)
TO_HAND SUBJECT={REF=CHOSEN1} PICK=CHOSEN IF=[{EXISTS={REF=CHOSEN1}}]    (tc, and the guard)
REVEAL SUBJECT={REF=CHOSEN1} SHOWN_TO=OPPONENT                            (part of the move, not a part of its own)
```

**Same**, but for one word: `ANY` (a group has a card) and `EXISTS` (a variable holds a card) say one thing, that the pick found something. One name for both would be one input instead of two.

## 2. Once per turn

| Script | Card | RML |
| --- | --- | --- |
| `SetCountLimit(1,id)` on one effect | Ash Blossom & Joyous Spring | `LIMIT={COUNT=1 SHARED=HARD}` |
| the same `id` on several effects: "only 1 of these effects per turn" | Graff, Malebranche of the Burning Abyss; Thunder Dragondark (all three effects) | `SHARED=HARD` on each, one counter |
| `id` and `id+o` (or `id+1`): "each effect once per turn" | Fighting Flame Swordsman, Red Familiar | `SHARED=HARD` and `SHARED=HARD COUNTER=id+1` |
| `id+EFFECT_COUNT_CODE_OATH`: "activate 1 per turn" | Fire Ejection, Triple Tactics Talent | `SHARED=HARD KIND=OATH` |
| `SetCountLimit(1)`: this copy only | D/D Savant Kepler's Pendulum Effect | `SHARED=SOFT` |
| a player flag, checked in the activation check and set on activation | Radiant Typhoon Vision, once per turn for each of its two modes | `NO_PLAYER_FLAG=THIS_CARD` in each mode's `LEGAL`, `PLAYER_FLAG` steps |
| a player flag inside a function given to `aux.AddXyzProcedure` | P.U.N.K. JAM FEVER!, "once per turn, you can also Xyz Summon..." | not read: the function shows as `<closure>` in `SETUP` |

**Same** for every `SetCountLimit` (until today `id+1` read as another card's number, `SHARED=8372134`). **Differs** for flags: Radiant Typhoon Vision's limit is the same feature as a count limit, but reads as a flag check and a flag being set, and nothing says it is once per turn. A rule could read the idiom (a player flag of the card's own number, reset at the End Phase, set on activation and checked `==0` before it) as a `LIMIT` of its own: count 1, per turn, for that mode. The schema already expects this for summons (`CardRules.summonLimit`, "or the flag idiom Artmage Non-Finito uses"). The `aux` procedure's function would need reading as well.

## 3. "Choose 1 of these effects"

Four ways of writing the choice:

```lua
-- aux.SelectFromOptions: each option {legal, text, number}; without a number, its place from 1 (utility.lua)
local sel=aux.SelectFromOptions(tp,{b1,aux.Stringid(id,0)},{b2,aux.Stringid(id,1)},{true,aux.Stringid(id,2)})   -- Fire Ejection, on resolution
local op=aux.SelectFromOptions(tp,{tc:IsAbleToHand(),1190},{tc:IsAbleToGrave(),1191})                          -- Infernal Flame Banshee: hand or GY

-- Duel.SelectOption from 0, offering only the legal options, numbered with +1 (D/D Savant Kepler, on activation)
if b1 and b2 then op=Duel.SelectOption(tp,aux.Stringid(id,0),aux.Stringid(id,1))
elseif b1 then op=Duel.SelectOption(tp,aux.Stringid(id,0))
else op=Duel.SelectOption(tp,aux.Stringid(id,1))+1 end
e:SetLabel(op)

-- Tables of the legal options and their numbers (Triple Tactics Talent, on activation)
if b1 then ops[off]=aux.Stringid(id,0) opval[off-1]=1 off=off+1 end
...
local op=Duel.SelectOption(tp,table.unpack(ops))
e:SetLabel(opval[op])
```

```
Fire Ejection        OPERATION.MODE {MODE=1 TEXT=Inflict damage to your opponent LEGAL=[{IS={REF=CHOSEN1 LEVEL={MIN=1}}}]} ... {MODE=3 TEXT=Do nothing}
                     PART 2 LINK=THEN LEVEL=SUBSEQUENT MODE=1 CHOSEN_ON=RESOLUTION
                     PART 3 LINK=THEN LEVEL=SUBSEQUENT MODE=2 CHOSEN_ON=RESOLUTION
D/D Savant Kepler    TARGET.MODE {MODE=0 TEXT=Return 1 "D/D" card you control to your hand LEGAL=}
                     PART 1 LEVEL=EFFECT MODE=0 CHOSEN_ON=ACTIVATION
                     PART 2 LINK=OTHERWISE LEVEL=EFFECT
Triple Tactics T.    TARGET.MODE {MODE=0 TEXT=undefined}
                     PART 1 LEVEL=EFFECT MODE=1 CHOSEN_ON=ACTIVATION ... PART 3 MODE=3
```

**Same** in what matters most: each mode's parts get a `MODE` and when it was chosen. **Differs** in three ways:

- **Numbers:** `Duel.SelectOption` counts from 0, `aux.SelectFromOptions` from 1, and `opval` tables give whatever numbers they hold. A mode number only means something within its card, so it is fine as a label, but "mode 1" isn't one feature across cards.
- **The `else` branch:** Kepler's second mode is written `else`, so it reads `OTHERWISE` with no `MODE`. With exactly two modes, it could take the other number.
- **What each mode is and when it is legal:** read for `aux.SelectFromOptions` (its text and legal check are in the call). For `Duel.SelectOption` the text is read but the legality (`b1`, `b2` around each call) isn't. For the tables, neither is (`TEXT=undefined`): a rule pairing `ops[...]` and `opval[...]` assignments made under the same `if` would give both.

Fire Ejection also writes "you can apply 1 of these effects" as a third option, "Do nothing". That is a "you can" with no `SelectYesNo`, so it isn't `OPTIONAL`. A mode that does nothing could be read as one.

## 4. Targets

```lua
-- Called by the Grave: pick and target in one call
local g=Duel.SelectTarget(tp,c24224830.filter,tp,0,LOCATION_GRAVE,1,1,nil)
-- Lunalight Serenade Dance: target the event's card, or choose one of them and target it
if eg:GetCount()==1 then Duel.SetTargetCard(eg)
else local g=eg:FilterSelect(tp,c13935001.atkfilter,1,1,nil,e,tp) Duel.SetTargetCard(g) end
-- On resolution, three ways to get them back:
local tc=Duel.GetFirstTarget()                                                                     -- most scripts
local g=Duel.GetChainInfo(0,CHAININFO_TARGET_CARDS):Filter(Card.IsRelateToEffect,nil,e)            -- Branded Loss
local g=Duel.GetTargetsRelateToChain()
```

**Same**: every move on a target reads `PICK=TARGETED`, however it was targeted and however the operation got it back (`GetChainInfo` at the start of a chain read as unknown until today). Order matters: Downbeat tributes a monster as its cost and only then makes it the target (`Duel.SetTargetCard(g)`, so the operation can find a monster of its Type and Attribute, 1 Level lower). Its tribute reads `PICK=CHOSEN`, since a card is targeted only for the moves after it was made the target.

## 5. Discarding as a cost

```lua
Duel.SendtoGrave(e:GetHandler(),REASON_COST+REASON_DISCARD)                                         -- Ash Blossom, Thunder Dragondark
Duel.DiscardHand(tp,c1142880.cfilter,1,1,REASON_COST+REASON_DISCARD,e:GetHandler())                -- Cyber Dragon Nachster
```

**Same** (since today): both are `DISCARD ... LEVEL=COST`. Until today the first read `TO_GRAVE`; the engine counts both as discards (`REASON_DISCARD`), and that is what "when a card is discarded" effects see.

## 6. Costs paid in the target function

```lua
-- Downbeat (96540): the cost function only sets e:SetLabel(100); the target function pays
if chk==0 then
    if e:GetLabel()~=100 then return false end
    ...
end
local g=Duel.SelectReleaseGroup(tp,c96540.costfilter,1,1,nil,e,tp)
Duel.Release(g,REASON_COST)
```

Scripts do this when the cost and the target depend on each other (Tuspa Rocket sends a card as a cost and uses its Level). **Same**: the move reads `TARGET {ACTION=TRIBUTE ... REASON=COST LEVEL=COST}`, a cost by its reason wherever it is paid.

## 7. "Negate the activation, and if you do, destroy it"

```lua
-- Spell-Stopping Statute: the usual way
if Duel.NegateActivation(ev) and re:GetHandler():IsRelateToEffect(re) then Duel.Destroy(eg,REASON_EFFECT) end
-- Mannadium Reframing: a guard, then an optional destruction after a BreakEffect
if not Duel.NegateActivation(ev) then return end
if ... and Duel.SelectYesNo(tp,aux.Stringid(id,0)) then Duel.BreakEffect() Duel.Destroy(eg,REASON_EFFECT) end
```

```
Statute     PART 2 LINK=AND_IF_YOU_DO LEVEL=SUBSEQUENT   DESTROY ... IF=[{SUCCEEDED=NEGATE_ACTIVATION}, ...]
Mannadium   PART 2 LINK=THEN LEVEL=SUBSEQUENT OPTIONAL   DESTROY ... IF=[{SUCCEEDED=NEGATE_ACTIVATION}, ...]
```

**Same** dependence (the guard reads as the check it negates), and different links, as the two cards are different: Statute's old wording "Negate the activation ... and destroy it" means "and if you do", Mannadium's is "Negate the activation, then if ..., you can destroy that negated card". No script in the data negates in one statement and destroys under a separate check of its own.

## 8. Special Summon, and effects on what was Summoned

```lua
-- Red Familiar: "Special Summon it, but negate its effects", checking the Summon
if tc:IsRelateToEffect(e) and Duel.SpecialSummonStep(tc,0,tp,tp,false,false,POS_FACEUP_DEFENSE) then
    -- two effects negating it
end
Duel.SpecialSummonComplete()
-- Lavalval Exlord and Bug Emergency: the same for a group, without checking each Step
for tc in aux.Next(g) do Duel.SpecialSummonStep(tc,...) ... end          -- Lavalval Exlord
local tc=g:GetFirst() while tc do Duel.SpecialSummonStep(tc,...) ... tc=g:GetNext() end   -- Bug Emergency
```

```
Red Familiar   PART 2 LINK=AND_IF_YOU_DO LEVEL=SUBSEQUENT   GIVE_EFFECT TO={REF=TARGET} ... IF=[..., {SUCCEEDED=SPECIAL_SUMMON}]
Lavalval       SPECIAL_SUMMON SUBJECT={REF=CHOSEN1} ... then GIVE_EFFECT TO={REF=CHOSEN1}, in the same part
Bug Emergency  SPECIAL_SUMMON SUBJECT={REF=ALL1} ... then GIVE_EFFECT TO={REF=ALL1}, in the same part
```

**Same** for the two loops, which read as the whole group (`aux.Next` and `while ... GetNext()`). **Differs** between checking each Step and not: the same "but negate their effects" reads `AND_IF_YOU_DO` in one and `AND` (one part) in the other. The script is what ocgcore plays, and the effects are registered on the cards either way. Whether they do anything to a card that wasn't Summoned is an engine question to check before a rule treats both as dependent.

## 9. "Then", with and without a Duel.BreakEffect()

| Card | Text | Script | RML |
| --- | --- | --- | --- |
| Sky Striker Mobilize - Engage! | "..., then, if ..., you can draw 1 card" | `if g:GetCount()>0 then ... BreakEffect() Draw` | `THEN` `OPTIONAL` |
| Kaiju Capture Mission | "change it to face-down Defense Position, then place 1 Kaiju Counter" | `if Duel.ChangePosition(...)~=0 then AddCounter` | `AND_IF_YOU_DO` |
| Purple Poison Magician | "that monster gains 1200 ATK ..., then destroy this card" | `RegisterEffect(e1) BreakEffect() Destroy(c)` | `ALSO_AFTER_THAT` |

Same text, three scripts, three links: the links are what the scripts do, and `npm run text-check` lists cards like these (README, "Where scripts and card text may differ"). Kaiju Capture Mission's counter happens at the same moment as the position change. Purple Poison Magician's destruction happens even if the ATK gain didn't.

## 10. Fusion Summons

About 205 scripts copy one block of code for "Fusion Summon 1 Fusion Monster" (Polymerization, and monster effects such as Cyber Pharos's). It offers two ways: the card's own materials, or the materials another card's effect allows (Chain Material, `Duel.GetChainMaterial`):

```
PART 1 LEVEL=EFFECT              CHOOSE_FUSION_MATERIALS ... then TO_GRAVE SUBJECT={REF=MATERIALS5} REASON=EFFECT|MATERIAL|FUSION
PART 2 LINK=ALSO_AFTER_THAT      SPECIAL_SUMMON SUBJECT={REF=CHOSEN4} SUMMON_TYPE=FUSION        (after a BreakEffect)
PART 3 LINK=OTHERWISE            FUSION_SUMMON SUBJECT={REF=CHOSEN4} MATERIALS={REF=MATERIALS6} BY=CHAIN_MATERIAL
```

**Same** across the copies. As a reading of one feature, though, a Fusion Summon comes out as two parts: materials sent, then a summon that doesn't check they were. The text-check leaves those parts out of its comparison, since "Fusion Summon" is one action in the text. Whether the labels themselves should join them is a question about the rules (is the summon stopped if the materials aren't sent?), not about the script.

## Summary

| Feature | Ways written | Reads the same? |
| --- | --- | --- |
| Search from the Deck | 3 | yes; `ANY` and `EXISTS` are one fact under two names |
| Once per turn | 7 | count limits yes; flag limits read as flags, not as a limit; procedure flags not read |
| Choose 1 of these effects | 4 | modes and when they are chosen yes; numbering, `else` branches, and the tables' texts and legality no |
| Targets | 2 to pick, 3 to get back | yes |
| Discard as a cost | 2 | yes |
| Cost paid in the target function | 1 idiom | yes |
| Negate, and if you do, destroy | 2 | yes |
| Effects on what was Special Summoned | checked or not | no: `AND_IF_YOU_DO` or one part |
| "Then" | `BreakEffect` and a check, either, or both | follows the script, by design |
| Fusion Summon | 1 template | yes; two parts for one action |
