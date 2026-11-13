# Elfnote and Ars Magna: every effect, where it isn't translated

Made 2026-11-06 by the reader at 7748fe39+changes. Every card of the Elfnote and Ars Magna archetypes (the Elfnote setcode 0x1d8 and Ars Magna's 0x1e6), through each way RML translates. This is a record: it describes what is partly handled, which no output file does (README, “The output”).

For each card: its text, how each way went, and each effect. For each effect:

- **Text**: the sentences of the card text that are this effect. No tool joins a sentence to a script effect yet; this join is made by hand. A sentence like “You can only use each effect … once per turn” belongs to every effect it limits.
- **Lua**: the functions its script registers for it.
- A table of each way, from which format to which: read or written, or where it stops.
- **Raw data**: the input (the sentence, the engine's record of the registration, the Lua) and the output (the effect's RML), side by side, to join.

The ways: card text → RML (the PSCT reader, src/text/), YGOPro script → RML (the reader, src/read/ and src/convert.ts), RML → YGOPro, EDOPro and YGO Omega scripts (src/write/), RML → card text (src/write/text.ts). YGO Omega's script of each of these cards is byte for byte YGOPro's, so it reads the same. EDOPro's scripts aren't read yet.

## By topic

The same gap on several cards, together. Each line is a card's effect, the way that stops, and what stops it. Script → RML is what the reader leaves unread; RML → scripts is what the writer has no rule for (in an effect fully read); text → RML is where the PSCT reader stopped in a sentence.

### Limits: “You can only …”, “Once while face-up”, “not in the same Chain”

- Elfnote Lucina effect 1: text → RML: not read, stopped at: “You can only Special Summon "Elfnote Lucina" once per turn this way.”
- Elfnote Tinia effect 1: text → RML: not read, stopped at: “You can only Special Summon "Elfnote Tinia" once per turn this way.”
- Elfnote Fortuna effect 1: text → RML: not read, stopped at: “You can only Special Summon "Elfnote Fortuna" once per turn this way.”
- Elfnotes: Aristeia of Trust effect 2: text → RML: not read, stopped at: “You cannot activate these effects of "Elfnotes: Aristeia of Trust" in the same Chain.”
- Elfnotes: Aristeia of Trust effect 3: text → RML: not read, stopped at: “You cannot activate these effects of "Elfnotes: Aristeia of Trust" in the same Chain.”
- Ars Magna - "Citrinitas" effect 3: text → RML: not read, stopped at: “Once while face-up on the field”
- Ars Magna - "Citrinitas" effect 3: text → RML: not read, stopped at: “You can only use this effect of "Ars Magna - "Citrinitas"" once per turn.”
- Ars Magna - "Philosophirum" effect 1: text → RML: not read, stopped at: “You can only use 1 "Ars Magna - "Philosophirum"" effect per turn, and only once that turn.”
- Ars Magna - "Philosophirum" effect 2: text → RML: not read, stopped at: “You can only use 1 "Ars Magna - "Philosophirum"" effect per turn, and only once that turn.”

### Summoning to a chosen zone (a procedure's zone value)

- Elfnote Lucina effect 1: text → RML: not read, stopped at: “You can Special Summon this card (from your hand) to your center Main Monster Zone.”
- Elfnote Lucina effect 1: script → RML: value: {WHO=RAW EXPR=0}
- Elfnote Tinia effect 1: text → RML: not read, stopped at: “You can Special Summon this card (from your hand) to your center Main Monster Zone.”
- Elfnote Tinia effect 1: script → RML: value: {WHO=RAW EXPR=0}
- Elfnote Fortuna effect 1: text → RML: not read, stopped at: “You can Special Summon this card (from your hand) to your center Main Monster Zone.”
- Elfnote Fortuna effect 1: script → RML: value: {WHO=RAW EXPR=0}

### The center Main Monster Zone, and moving between zones

- Elfnote June Pride effect 2: text → RML: not read, stopped at: “While this card is in the center Main Monster Zone, neither player can declare attacks, except with monsters in their center Main Monster Zones.”
- Elfnote June Pride effect 3: text → RML: not read, stopped at: “if this card is in the center Main Monster Zone (Quick Effect)”
- Elfnote Power Patron effect 2: text → RML: not read, stopped at: “target 1 monster in your center Main Monster Zone”
- Elfnote Lucina effect 3: text → RML: not read, stopped at: “switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone”
- Elfnote Lucina effect 3: script → RML: operation: cs>4
- Elfnote Lucina effect 3: script → RML: operation: cs==2
- Elfnote Lucina effect 3: script → RML: operation: Duel.SwapSequence(c,tc)
- Elfnote Lucina effect 3: script → RML: operation: c:GetSequence()==cs
- Elfnote Tinia effect 3: text → RML: not read, stopped at: “switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone”
- Elfnote Tinia effect 3: script → RML: operation: cs>4
- Elfnote Tinia effect 3: script → RML: operation: cs==2
- Elfnote Tinia effect 3: script → RML: operation: Duel.SwapSequence(c,tc)
- Elfnote Tinia effect 3: script → RML: operation: c:GetSequence()==cs
- Elfnote Fortuna effect 3: text → RML: not read, stopped at: “switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone”
- Elfnote Fortuna effect 3: script → RML: operation: cs>4
- Elfnote Fortuna effect 3: script → RML: operation: cs==2
- Elfnote Fortuna effect 3: script → RML: operation: Duel.SwapSequence(c,tc)
- Elfnote Fortuna effect 3: script → RML: operation: c:GetSequence()==cs
- Elfnote Seraphim Strelitzia effect 2: text → RML: not read, stopped at: “This card's original ATK becomes 3000, while in the center Main Monster Zone.”
- Elfnote Regina effect 2: text → RML: not read, stopped at: “If this card is Normal or Special Summoned to the center Main Monster Zone”
- Elfnote Regina effect 3: text → RML: not read, stopped at: “If this card is Normal or Special Summoned to the center Main Monster Zone”
- Elfnotes: Rhapsodia of Madness effect 2: text → RML: not read, stopped at: “While you control a monster in your center Main Monster Zone, your opponent's monsters cannot attack, except to attack that monster.”
- Elfnotes: Rhapsodia of Madness effect 3: text → RML: not read, stopped at: “While you control a monster in your center Main Monster Zone, your opponent's monsters cannot attack, except to attack that monster.”
- Elfnotes: Aristeia of Trust effect 2: text → RML: not read, stopped at: “move that monster you control to another of your Main Monster Zones”
- Elfnotes: Aristeia of Trust effect 2: script → RML: operation: Duel.MoveSequence(tc,nseq)
- Elfnotes: Quatrain of Succession effect 2: text → RML: not read, stopped at: “The monster in your center Main Monster Zone cannot be banished by your opponent's card effects.”
- Elfnotes: Welcome Home effect 2: text → RML: not read, stopped at: “The monster in your center Main Monster Zone cannot be destroyed by card effects.”
- Elfnotes: A Plea for Help effect 2: text → RML: not read, stopped at: “Your opponent cannot target the monster in your center Main Monster Zone with card effects.”

### “During the Main Phase” (either player's)

- Elfnote June Pride effect 3: script → RML: condition: Duel.IsMainPhase()
- Elfnote Power Patron effect 2: script → RML: condition: Duel.IsMainPhase()
- Elfnote Seraphim Strelitzia effect 3: script → RML: condition: Duel.IsMainPhase()

### Ars Magna - “Citrinitas”: effects activated as Quick Effects

- Ars Magna - "Citrinitas" effect 2: text → RML: not read, stopped at: “You can activate the effects of monsters you control with "Ars Magna" in their original names as Quick Effects while you control a "Power Patron" Link Monster.”
- Ars Magna - "Citrinitas" effect 2: RML → scripts: the effect 37279096
- Ars Magna of Infinity and Finity effect 3: script → RML: condition: aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
- Ars Magna of Infinity and Finity effect 4: script → RML: condition: aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
- Ars Magna of Purification and Corruption effect 3: script → RML: condition: aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
- Ars Magna of Purification and Corruption effect 4: script → RML: condition: aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
- Ars Magna of Unification and Separation effect 3: script → RML: condition: aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
- Ars Magna of Unification and Separation effect 4: script → RML: condition: aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)

### Triggers on other monsters being Special Summoned (while banished, or in the Pendulum Zone)

- Junoldo the Shadespirit Power Patron effect 3: text → RML: not read, stopped at: “If a "Power Patron" or "Elfnote" monster(s) is Special Summoned to your field, while this card is in your Pendulum Zone (except during the Damage Step)”
- Junoldo the Shadespirit Power Patron effect 3: RML → scripts: condition {"eventCards":{"count":1,"card":{"states":["FACEUP"],"anyOf":[{"archetypes":[462]},{"archetypes":[472]}],"controller":"OWN"}}}
- Ars Magna of Infinity and Finity effect 2: text → RML: not read, stopped at: “If a Fusion and/or Link Monster(s) is Special Summoned while this card is banished (except during the Damage Step)”
- Ars Magna of Infinity and Finity effect 2: RML → scripts: condition {"eventCards":{"count":1,"card":{"types":["FUSION","LINK"],"states":["FACEUP","NOT_SELF"]}}}
- Ars Magna of Purification and Corruption effect 2: text → RML: not read, stopped at: “If an Xyz and/or Link Monster(s) is Special Summoned while this card is banished (except during the Damage Step)”
- Ars Magna of Purification and Corruption effect 2: RML → scripts: condition {"eventCards":{"count":1,"card":{"types":["XYZ","LINK"],"states":["FACEUP","NOT_SELF"]}}}
- Ars Magna of Unification and Separation effect 2: text → RML: not read, stopped at: “If a Synchro and/or Link Monster(s) is Special Summoned while this card is banished (except during the Damage Step)”
- Ars Magna of Unification and Separation effect 2: RML → scripts: condition {"eventCards":{"count":1,"card":{"types":["SYNCHRO","LINK"],"states":["FACEUP","NOT_SELF"]}}}

### “Sent to the GY as Synchro Material”

- Elfnote Power Patron effect 3: text → RML: not read, stopped at: “If this card is sent to the GY as Synchro Material”
- Elfnote Power Patron effect 3: script → RML: condition: r==REASON_SYNCHRO
- Elfnote Regina effect 4: text → RML: not read, stopped at: “If this card is sent to the GY as Synchro Material”
- Elfnote Regina effect 4: script → RML: condition: r==REASON_SYNCHRO

### Costs from “your hand or (face-up) field”

- Elfnote Regina effect 1: text → RML: not read, stopped at: “TO_GRAVE: 1 other "Elfnote" card from your hand or face-up field”
- Elfnotes: Rhapsodia of Madness effect 4: text → RML: not read, stopped at: “TO_GRAVE: 1 monster from your hand or field”
- Elfnotes: Quatrain of Succession effect 3: text → RML: not read, stopped at: “TO_GRAVE: 1 other Spell/Trap from your hand or field”
- Elfnotes: Welcome Home effect 3: text → RML: not read, stopped at: “TO_GRAVE: 1 monster from your hand or field”

### A card chosen earlier still being there

- Elfnote Tinia effect 2: RML → scripts: that {"ref":"CHOSEN1"} exists
- Elfnote Fortuna effect 2: RML → scripts: that {"ref":"CHOSEN1"} exists
- Ars Magna of Infinity and Finity effect 1: RML → scripts: that {"ref":"CHOSEN1"} exists

### Moves made in a target function

- Elfnotes: Aristeia of Trust effect 3: RML → scripts: moves of the target function
- Ars Magna - "Citrinitas" effect 3: RML → scripts: moves of the target function

### Pendulum procedure

- Junoldo the Shadespirit Power Patron effect 1: RML → scripts: an aux procedure's
- Junoldo the Shadespirit Power Patron effect 2: RML → scripts: an aux procedure's

### A different original Attribute

- Elfnotes: Welcome Home effect 3: script → RML: cost: c:GetOriginalAttribute()~=ec:GetOriginalAttribute()
- Elfnotes: Welcome Home effect 3: script → RML: operation: c:GetOriginalAttribute()~=ec:GetOriginalAttribute()

### Declaring a Level, and the Token it makes

- Elfnotes: Quatrain of Succession effect 2: RML → scripts: a target function that isn't given r, rp
- Elfnotes: Quatrain of Succession effect 3: text → RML: not read, stopped at: “While that Token is in the Monster Zone, the player who Summoned it cannot Special Summon from the Extra Deck, except "Elfnote" monsters.”
- Elfnotes: Quatrain of Succession effect 3: script → RML: target: if e:IsCostChecked() then ... end
- Elfnotes: Quatrain of Succession effect 3: script → RML: target: Duel.AnnounceNumber(tp,table.unpack(lvt))

### A Summon treated as a Synchro Summon, and banishing face-down as a cost

- Junoldo the Shadespirit Power Patron effect 4: text → RML: not read, stopped at: “BANISH: the top 3 cards of your Deck, face-down”
- Junoldo the Shadespirit Power Patron effect 4: script → RML: target: aux.MustMaterialCheck(nil,tp,EFFECT_MUST_BE_SMATERIAL)
- Junoldo the Shadespirit Power Patron effect 4: script → RML: cost: te:UseCountLimit(tp)
- Junoldo the Shadespirit Power Patron effect 4: script → RML: operation: aux.MustMaterialCheck(nil,tp,EFFECT_MUST_BE_SMATERIAL)
- Junoldo the Shadespirit Power Patron effect 4: script → RML: operation: tc:SetMaterial(nil)

### Up to N cards, N counted while resolving

- Ars Magna of Purification and Corruption effect 3: text → RML: not read, stopped at: “target Spells/Traps on the field up to the number of "Power Patron" Link Monsters you control”
- Ars Magna of Purification and Corruption effect 4: text → RML: not read, stopped at: “target Spells/Traps on the field up to the number of "Power Patron" Link Monsters you control”
- Ars Magna - "Philosophirum" effect 1: text → RML: not read, stopped at: “Target up to 3 "Ars Magna" monsters in your field and/or GY”
- Ars Magna - "Philosophirum" effect 1: script → RML: target: {WHO=RAW EXPR=aux.SelectTargetFromFieldFirst(tp,s.rmfilter,tp,LOCATION_MZONE+LOCATION_GRAVE,0,1,3,nil)}
- Ars Magna - "Philosophirum" effect 1: script → RML: operation: ct>0
- Ars Magna - "Philosophirum" effect 1: script → RML: operation: count {MIN=1 MAX={RAW=ct}}

### Battle indestructibility a number of times

- Ars Magna of Purification and Corruption effect 1: text → RML: not read, stopped at: “until the end of the next turn, the first 3 times each of your "Power Patron" Link Monsters would be destroyed by battle each turn, it is not destroyed”
- Ars Magna of Purification and Corruption effect 1: script → RML: value: if bit.band(r,REASON_BATTLE)~=0 then ... end

### Effects on players with no cards

- Ars Magna of Unification and Separation effect 1: RML → scripts: PLAYER_EFFECT of no cards

### The Extra Deck: returning a card to it, a card added to it face-up

- Junoldo the Shadespirit Power Patron effect 5: text → RML: not read, stopped at: “If this card is added to your Extra Deck face-up”
- Ars Magna - "Philosophirum" effect 2: text → RML: not read, stopped at: “return 1 "Power Patron" Link Monster from your GY into the Extra Deck”
- Ars Magna - "Philosophirum" effect 2: RML → scripts: moved TO_DECK out of place

### Attack restrictions

- Elfnotes: Rhapsodia of Madness effect 4: RML → scripts: relations

### “You cannot Special Summon from the Extra Deck, except …”

- Elfnote Power Patron effect 1: text → RML: not read, stopped at: “You cannot Special Summon from the Extra Deck, except Synchro Monsters.”

### Placing a card face-up from the Deck

- Elfnote Tinia effect 2: text → RML: not read, stopped at: “place 1 "Elfnote" Continuous Spell from your Deck face-up on your field”
- Elfnote Fortuna effect 2: text → RML: not read, stopped at: “place 1 "Elfnote" Continuous Trap from your hand or Deck, face-up on your field”

### Effects listed by Attribute (●)

- Elfnotes: A Plea for Help effect 3: text → RML: not read, stopped at: “a list (●)”
- Elfnotes: A Plea for Help effect 4: text → RML: not read, stopped at: “a list (●)”
- Elfnotes: A Plea for Help effect 5: text → RML: not read, stopped at: “a list (●)”

### “When your opponent activates …, while you control …”

- Elfnotes: Aristeia of Trust effect 3: text → RML: not read, stopped at: “When your opponent activates a Spell/Trap Card, while you control 3 or more "Elfnote" monsters”

### “non-<Type>” filters

- Ars Magna of Infinity and Finity effect 1: text → RML: not read, stopped at: “TO_HAND: 1 non-Warrior "Ars Magna" monster from your Deck”
- Ars Magna of Unification and Separation effect 1: text → RML: not read, stopped at: “SPECIAL_SUMMON: 1 non-Spellcaster "Ars Magna" monster from your GY or banishment”

### Others

- Elfnote Seraphim Strelitzia effect 3: text → RML: not read, stopped at: “reduce the Levels of all Level 4 or higher monsters on the field by 3 until the end of this turn”

## Elfnote June Pride (5559570)

> 1 Tuner + 1 non-Tuner Spellcaster monster
> While this card is in the center Main Monster Zone, neither player can declare attacks, except with monsters in their center Main Monster Zones. During the Main Phase, if this card is in the center Main Monster Zone (Quick Effect): You can return this card to the Extra Deck, and if you do, Special Summon up to 1 "Elfnote" monster each from your hand, Deck, and GY. You can only use this effect of "Elfnote June Pride" once per turn.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 2 sentence(s)                                         |
| YGOPro script → RML    | unread in 2 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (2 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>RML: <code>summons</code></summary>

```json
[
  {
    "method": "SYNCHRO",
    "from": ["EXTRA"],
    "materials": [
      {
        "count": {
          "min": 1,
          "max": 1
        },
        "role": "TUNER",
        "card": {}
      },
      {
        "count": {
          "min": 1,
          "max": 1
        },
        "role": "NON_TUNER",
        "card": {
          "races": ["SPELLCASTER"],
          "none": [
            {
              "types": ["TUNER"]
            }
          ]
        }
      }
    ]
  }
]
```

</details>

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--synchro summon
	aux.AddSynchroProcedure(c,nil,aux.NonTuner(Card.IsRace,RACE_SPELLCASTER),1,1)
	c:EnableReviveLimit()
	--cannot announce
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetRange(LOCATION_MZONE)
	e1:SetCode(EFFECT_CANNOT_ATTACK_ANNOUNCE)
	e1:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE)
	e1:SetTargetRange(LOCATION_MZONE,LOCATION_MZONE)
	e1:SetCondition(s.ancondition)
	e1:SetTarget(s.antarget)
	c:RegisterEffect(e1)
	--special summon
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,0))
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_TOEXTRA)
	e2:SetType(EFFECT_TYPE_QUICK_O)
	e2:SetCode(EVENT_FREE_CHAIN)
	e2:SetRange(LOCATION_MZONE)
	e2:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_MAIN_END)
	e2:SetCountLimit(1,id)
	e2:SetCondition(s.spcon)
	e2:SetTarget(s.sptg)
	e2:SetOperation(s.spop)
	c:RegisterEffect(e2)
end
```

</details>

### Effect 1: CONTINUOUS, from an aux procedure

Text: “1 Tuner + 1 non-Tuner Spellcaster monster…”

Lua: `aux.SynCondition(nil,aux.NonTuner(Card.IsRace,2),1,1)`, `aux.SynTarget(nil,aux.NonTuner(Card.IsRace,2),1,1)`, `aux.SynOperation(nil,aux.NonTuner(Card.IsRace,2),1,1)`

| From → to                           | Result                             | Where it stops                                |
| ----------------------------------- | ---------------------------------- | --------------------------------------------- |
| Card text → RML                     | read                               |                                               |
| YGOPro script → RML                 | read                               |                                               |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it    | the card's other parts stop it                |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above |

<details><summary>Raw data for effect 1</summary>

**Card text** (input)

> 1 Tuner + 1 non-Tuner Spellcaster monster

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1164)
e:SetType(2)
e:SetCode(34)
e:SetProperty(263168)
e:SetRange(64)
e:SetCondition(aux.SynCondition(nil,aux.NonTuner(Card.IsRace,2),1,1))
e:SetTarget(aux.SynTarget(nil,aux.NonTuner(Card.IsRace,2),1,1))
e:SetOperation(aux.SynOperation(nil,aux.NonTuner(Card.IsRace,2),1,1))
e:SetValue(1174405120)
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "CONTINUOUS",
  "fromProcedure": true,
  "inSummons": false,
  "mandatory": false,
  "from": ["EXTRA"],
  "targets": false,
  "flags": ["CANNOT_DISABLE", "UNCOPYABLE"],
  "offered": {},
  "description": 1164
}
```

</details>

### Effect 2: CONTINUOUS (CANNOT_ATTACK_ANNOUNCE)

Text: “While this card is in the center Main Monster Zone, neither player…”

Lua: `s.ancondition`, `s.antarget`

| From → to                           | Result                          | Where it stops                                                                                                                                                           |
| ----------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Card text → RML                     | **not read**                    | not read, stopped at: “While this card is in the center Main Monster Zone, neither player can declare attacks, except with monsters in their center Main Monster Zones.” |
| YGOPro script → RML                 | read                            |                                                                                                                                                                          |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it | the card's other parts stop it                                                                                                                                           |
| RML → card text                     | **not written**                 | applies                                                                                                                                                                  |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> While this card is in the center Main Monster Zone, neither player can declare attacks, except with monsters in their center Main Monster Zones.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetRange(4)
e:SetCode(86)
e:SetProperty(128)
e:SetTargetRange(4,4)
e:SetCondition(s.ancondition)
e:SetTarget(s.antarget)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.ancondition(e,tp,eg,ep,ev,re,r,rp)
	return e:GetHandler():GetSequence()==2
end
function s.antarget(e,c)
	return c:GetSequence()~=2
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "from": ["MZONE"],
  "targets": false,
  "flags": ["IGNORE_IMMUNE"],
  "offered": {},
  "applies": [
    {
      "effect": "CANNOT_ATTACK_ANNOUNCE",
      "to": {
        "places": {
          "own": ["MZONE"],
          "opponent": ["MZONE"]
        }
      },
      "cards": {
        "none": [
          {
            "numbers": {
              "SEQUENCE": {
                "is": [2]
              }
            }
          }
        ]
      }
    }
  ],
  "requires": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "numbers": {
            "SEQUENCE": {
              "is": [2]
            }
          }
        }
      }
    }
  ]
}
```

</details>

### Effect 3: QUICK FREE_CHAIN

Text: “During the Main Phase, if this card…” + “You can only use this effect of "Elfnote June Pride"…”

Lua: `s.spcon`, `s.sptg`, `s.spop`

| From → to                           | Result          | Where it stops                                                                         |
| ----------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “if this card is in the center Main Monster Zone (Quick Effect)” |
| YGOPro script → RML                 | **unread**      | condition: Duel.IsMainPhase()                                                          |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                 |
| RML → card text                     | **not written** | unread                                                                                 |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> During the Main Phase, if this card is in the center Main Monster Zone (Quick Effect): You can return this card to the Extra Deck, and if you do, Special Summon up to 1 "Elfnote" monster each from your hand, Deck, and GY.
>
> You can only use this effect of "Elfnote June Pride"

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(88953120)
e:SetCategory(2147484160)
e:SetType(256)
e:SetCode(1002)
e:SetRange(4)
e:SetHintTiming(0,452)
e:SetCountLimit(1,5559570)
e:SetCondition(s.spcon)
e:SetTarget(s.sptg)
e:SetOperation(s.spop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcon(e,tp,eg,ep,ev,re,r,rp)
	return Duel.IsMainPhase() and e:GetHandler():GetSequence()==2
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	local c=e:GetHandler()
	if chk==0 then return e:GetHandler():IsAbleToExtra()
		and Duel.GetMZoneCount(tp,c)>0
		and Duel.IsExistingMatchingCard(s.spfilter,tp,LOCATION_DECK+LOCATION_HAND+LOCATION_GRAVE,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK+LOCATION_HAND+LOCATION_GRAVE)
	Duel.SetOperationInfo(0,CATEGORY_TOEXTRA,c,1,0,0)
end
function s.spfilter(c,e,tp)
	return c:IsSetCard(0x1d8) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if c:IsRelateToChain() and Duel.SendtoDeck(c,nil,SEQ_DECKSHUFFLE,REASON_EFFECT)>0
		and c:IsLocation(LOCATION_EXTRA)
		and Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and Duel.IsExistingMatchingCard(aux.NecroValleyFilter(s.spfilter),tp,LOCATION_DECK+LOCATION_HAND+LOCATION_GRAVE,0,1,nil,e,tp) then
		local g=Duel.GetMatchingGroup(aux.NecroValleyFilter(s.spfilter),tp,LOCATION_DECK+LOCATION_HAND+LOCATION_GRAVE,0,nil,e,tp)
		local ft=Duel.GetLocationCount(tp,LOCATION_MZONE)
		if ft>0 and #g>0 then
			if Duel.IsPlayerAffectedByEffect(tp,59822133) then ft=1 end
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
			local sg=g:SelectSubGroup(tp,s.gcheck,false,1,ft)
			if sg then
				Duel.SpecialSummon(sg,0,tp,tp,false,false,POS_FACEUP)
			end
		end
	end
end
function s.gcheck(g)
	if #g==1 then return true end
	return g:FilterCount(Card.IsLocation,nil,LOCATION_DECK)<=1
		and g:FilterCount(Card.IsLocation,nil,LOCATION_HAND)<=1
		and g:FilterCount(Card.IsLocation,nil,LOCATION_GRAVE)<=1
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {
    "opponent": ["MAIN_END", "SUMMON", "SPSUMMON", "FLIPSUMMON"]
  },
  "description": 88953120,
  "categories": ["SPECIAL_SUMMON", "TOEXTRA"],
  "declares": [
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["DECK", "HAND", "GRAVE"],
      "possible": false
    },
    {
      "category": "TOEXTRA",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "who": "THIS_CARD"
      },
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "stillOnChain": {
            "who": "THIS_CARD"
          }
        }
      ],
      "moves": [
        {
          "move": "TO_DECK",
          "cards": {
            "who": "THIS_CARD"
          },
          "pick": "THIS_CARD",
          "reasons": ["EFFECT"],
          "deckPlace": ["DECKSHUFFLE"]
        }
      ]
    },
    {
      "part": 2,
      "link": "AND_IF_YOU_DO",
      "level": "SUBSEQUENT",
      "optional": false,
      "requires": [
        {
          "stillOnChain": {
            "who": "THIS_CARD"
          }
        },
        {
          "atLeast": 1,
          "of": {
            "moved": "TO_DECK"
          }
        },
        {
          "is": {
            "cards": {
              "who": "THIS_CARD"
            },
            "filter": {
              "places": ["EXTRA"]
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": false
          }
        },
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "own": ["DECK", "HAND", "GRAVE"]
              },
              "card": {
                "archetypes": [472],
                "able": ["SPECIAL_SUMMON"],
                "states": ["NOT_NECRO_VALLEY"]
              },
              "targetable": false
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": false
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "ALL1"
            }
          }
        },
        {
          "exists": {
            "ref": "CHOSEN2"
          }
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": {
              "when": [
                {
                  "atLeast": 1,
                  "of": {
                    "freeZones": {
                      "own": ["MZONE"]
                    },
                    "forExtraDeck": false
                  }
                },
                {
                  "atLeast": 1,
                  "of": {
                    "cards": {
                      "ref": "ALL1"
                    }
                  }
                },
                {
                  "playerAffectedBy": {
                    "player": "OWN",
                    "effect": "Blue-Eyes Spirit Dragon"
                  }
                }
              ],
              "then": 1,
              "otherwise": {
                "countOf": {
                  "freeZones": {
                    "own": ["MZONE"]
                  },
                  "forExtraDeck": false
                }
              }
            }
          },
          "from": {
            "own": ["DECK", "HAND", "GRAVE"]
          },
          "card": {
            "archetypes": [472],
            "able": ["SPECIAL_SUMMON"],
            "states": ["NOT_NECRO_VALLEY"]
          },
          "position": ["FACEUP"]
        }
      ]
    }
  ],
  "requires": [
    {
      "unread": "Duel.IsMainPhase()"
    },
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "numbers": {
            "SEQUENCE": {
              "is": [2]
            }
          }
        }
      }
    }
  ],
  "legal": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "able": ["EXTRA"]
        }
      }
    },
    {
      "atLeast": 1,
      "of": {
        "freeZones": {
          "own": ["MZONE"]
        },
        "forExtraDeck": false
      }
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["DECK", "HAND", "GRAVE"]
          },
          "card": {
            "archetypes": [472],
            "able": ["SPECIAL_SUMMON"]
          },
          "targetable": false
        }
      }
    }
  ],
  "unread": [
    {
      "role": "condition",
      "text": "Duel.IsMainPhase()"
    }
  ]
}
```

</details>

## Junoldo the Shadespirit Power Patron (10266279)

> Pendulum Scale = 1
> [ Pendulum Effect ]
> If a "Power Patron" or "Elfnote" monster(s) is Special Summoned to your field, while this card is in your Pendulum Zone (except during the Damage Step): You can destroy this card, and if you do, draw 2 cards, then discard 1 card. You can only use this effect of "Junoldo the Shadespirit Power Patron" once per turn.
>
> ---
>
> [ Monster Effect ]
> (This card is always treated as an "Elfnote" card.)
> You can banish the top 3 cards of your Deck, face-down; destroy this card, and if you do, Special Summon 1 "Junora the Power Patron of Tuning" from your Extra Deck (this is treated as a Synchro Summon). If this card is added to your Extra Deck face-up: You can add 1 "Power Patron" or "Elfnote" card from your face-up Extra Deck or GY to your hand, except "Junoldo the Shadespirit Power Patron". You can only use each effect of "Junoldo the Shadespirit Power Patron" once per turn.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 3 sentence(s)                                         |
| YGOPro script → RML    | unread in 5 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (3 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

Not tied to one effect:

- RML → scripts: summon PENDULUM: its procedure

<details><summary>RML: <code>summons</code></summary>

```json
[
  {
    "method": "PENDULUM",
    "from": ["HAND", "EXTRA"]
  },
  {
    "method": "TRIBUTE",
    "from": ["HAND"],
    "materials": [
      {
        "count": {
          "min": 2,
          "max": 2
        },
        "role": "ANY",
        "card": {}
      }
    ]
  }
]
```

</details>

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	aux.AddCodeList(c,10266279,5914858)
	--pendulum summon
	aux.EnablePendulumAttribute(c)
	--draw
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_DRAW+CATEGORY_HANDES_SELF+CATEGORY_DESTROY)
	e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e1:SetProperty(EFFECT_FLAG_DELAY)
	e1:SetCode(EVENT_SPSUMMON_SUCCESS)
	e1:SetRange(LOCATION_PZONE)
	e1:SetCountLimit(1,id)
	e1:SetCondition(s.drcon)
	e1:SetTarget(s.drtg)
	e1:SetOperation(s.drop)
	c:RegisterEffect(e1)
	--synchro summon
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_DESTROY)
	e2:SetType(EFFECT_TYPE_IGNITION)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCountLimit(1,id+o)
	e2:SetCost(s.spcost)
	e2:SetTarget(s.sptg)
	e2:SetOperation(s.spop)
	c:RegisterEffect(e2)
	--search
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,2))
	e3:SetCategory(CATEGORY_TOHAND)
	e3:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e3:SetCode(EVENT_TO_DECK)
	e3:SetProperty(EFFECT_FLAG_DELAY)
	e3:SetCountLimit(1,id+o*2)
	e3:SetCondition(s.thcon)
	e3:SetTarget(s.thtg)
	e3:SetOperation(s.thop)
	c:RegisterEffect(e3)
end
```

</details>

### Effect 1: CONTINUOUS, from an aux procedure

Text: (Pendulum Scale; no sentence)

Lua: `aux.PendCondition`, `aux.PendOperation`

| From → to                           | Result                             | Where it stops                                               |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Card text → RML                     | —                                  | nothing in the text says this; it comes from the card's type |
| YGOPro script → RML                 | read                               |                                                              |
| RML → YGOPro, EDOPro, Omega scripts | **not written**                    | an aux procedure's                                           |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above                |

<details><summary>Raw data for effect 1</summary>

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1163)
e:SetType(2)
e:SetCode(320)
e:SetProperty(263168)
e:SetRange(512)
e:SetCondition(aux.PendCondition)
e:SetOperation(aux.PendOperation)
e:SetValue(1241513984)
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "CONTINUOUS",
  "fromProcedure": true,
  "inSummons": false,
  "mandatory": false,
  "from": ["PZONE"],
  "targets": false,
  "flags": ["CANNOT_DISABLE", "UNCOPYABLE"],
  "offered": {},
  "description": 1163
}
```

</details>

### Effect 2: ACTIVATE, from an aux procedure

Text: (activating it as a Pendulum Scale; no sentence)

Lua: set up in `s.initial_effect` only

| From → to                           | Result                             | Where it stops                                               |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Card text → RML                     | —                                  | nothing in the text says this; it comes from the card's type |
| YGOPro script → RML                 | read                               |                                                              |
| RML → YGOPro, EDOPro, Omega scripts | **not written**                    | an aux procedure's                                           |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above                |

<details><summary>Raw data for effect 2</summary>

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1160)
e:SetType(16)
e:SetCode(1002)
e:SetRange(2)
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "ACTIVATE",
  "fromProcedure": true,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["HAND"],
  "targets": false,
  "offered": {},
  "description": 1160
}
```

</details>

### Effect 3: TRIGGER SPSUMMON_SUCCESS

Text: “If a "Power Patron" or "Elfnote" monster(s) is Special Summoned to your field…” + “You can only use this effect of "Junoldo…”

Lua: `s.drcon`, `s.drtg`, `s.drop`

| From → to                           | Result          | Where it stops                                                                                                                                                                  |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “If a "Power Patron" or "Elfnote" monster(s) is Special Summoned to your field, while this card is in your Pendulum Zone (except during the Damage Step)” |
| YGOPro script → RML                 | read            |                                                                                                                                                                                 |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | condition {"eventCards":{"count":1,"card":{"states":["FACEUP"],"anyOf":[{"archetypes":[462]},{"archetypes":[472]}],"controller":"OWN"}}}                                        |
| RML → card text                     | **not written** | a condition {"eventCards":{"count":1,"card":{"states":["FACEUP"],"anyOf":[{"archetypes":[462]},{"archetypes":[472]}],"controller":"OWN"}}}                                      |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> If a "Power Patron" or "Elfnote" monster(s) is Special Summoned to your field, while this card is in your Pendulum Zone (except during the Damage Step): You can destroy this card, and if you do, draw 2 cards, then discard 1 card.
>
> You can only use this effect of "Junoldo

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(164260464)
e:SetCategory(65665)
e:SetType(130)
e:SetProperty(65536)
e:SetCode(1102)
e:SetRange(512)
e:SetCountLimit(1,10266279)
e:SetCondition(s.drcon)
e:SetTarget(s.drtg)
e:SetOperation(s.drop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.drcon(e,tp,eg,ep,ev,re,r,rp)
	return eg:IsExists(s.cfilter,1,nil,tp)
end
function s.cfilter(c,tp)
	return c:IsControler(tp) and c:IsSetCard(0x1ce,0x1d8) and c:IsFaceup()
end
function s.drtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsPlayerCanDraw(tp,2) end
	Duel.SetTargetPlayer(tp)
	Duel.SetTargetParam(2)
	Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,2)
	Duel.SetOperationInfo(0,CATEGORY_HANDES_SELF,nil,0,tp,1)
	Duel.SetOperationInfo(0,CATEGORY_DESTROY,e:GetHandler(),1,0,0)
end
function s.drop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if not c:IsRelateToChain() or Duel.Destroy(c,REASON_EFFECT)==0 then return end
	local p=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER)
	if Duel.Draw(p,2,REASON_EFFECT)==2 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DISCARD)
		local dg=Duel.SelectMatchingCard(tp,Card.IsDiscardable,tp,LOCATION_HAND,0,1,1,nil,REASON_EFFECT)
		Duel.ShuffleHand(tp)
		if dg:GetCount()>0 then
			Duel.BreakEffect()
			Duel.SendtoGrave(dg,REASON_EFFECT+REASON_DISCARD)
		end
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "TRIGGER",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "event": "SPSUMMON_SUCCESS",
  "eventOf": "ANY",
  "from": ["PZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "flags": ["DELAY"],
  "offered": {},
  "description": 164260464,
  "categories": ["DESTROY", "HANDES_SELF", "DRAW"],
  "declares": [
    {
      "category": "DRAW",
      "amount": 2,
      "possible": false
    },
    {
      "category": "HANDES_SELF",
      "amount": 1,
      "possible": false
    },
    {
      "category": "DESTROY",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "who": "THIS_CARD"
      },
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "stillOnChain": {
            "who": "THIS_CARD"
          }
        }
      ],
      "moves": [
        {
          "move": "DESTROY",
          "cards": {
            "who": "THIS_CARD"
          },
          "pick": "THIS_CARD",
          "reasons": ["EFFECT"]
        }
      ]
    },
    {
      "part": 2,
      "link": "AND_IF_YOU_DO",
      "level": "SUBSEQUENT",
      "optional": false,
      "requires": [
        {
          "not": {
            "any": [
              {
                "not": {
                  "stillOnChain": {
                    "who": "THIS_CARD"
                  }
                }
              },
              {
                "not": {
                  "atLeast": 1,
                  "of": {
                    "moved": "DESTROY"
                  }
                }
              }
            ]
          }
        }
      ],
      "moves": [
        {
          "move": "DRAW",
          "amount": 2,
          "player": "OWN",
          "reasons": ["EFFECT"]
        }
      ]
    },
    {
      "part": 3,
      "link": "THEN",
      "level": "SUBSEQUENT",
      "optional": false,
      "requires": [
        {
          "not": {
            "any": [
              {
                "not": {
                  "stillOnChain": {
                    "who": "THIS_CARD"
                  }
                }
              },
              {
                "not": {
                  "atLeast": 1,
                  "of": {
                    "moved": "DESTROY"
                  }
                }
              }
            ]
          }
        },
        {
          "atLeast": 2,
          "of": {
            "moved": "DRAW"
          }
        },
        {
          "not": {
            "atLeast": 3,
            "of": {
              "moved": "DRAW"
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "CHOSEN1"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "DISCARD",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["HAND"]
          },
          "card": {
            "able": ["DISCARD"]
          },
          "reasons": ["EFFECT", "DISCARD"]
        }
      ]
    }
  ],
  "requires": [
    {
      "eventCards": {
        "count": 1,
        "card": {
          "states": ["FACEUP"],
          "anyOf": [
            {
              "archetypes": [462]
            },
            {
              "archetypes": [472]
            }
          ],
          "controller": "OWN"
        }
      }
    }
  ],
  "legal": [
    {
      "canDraw": {
        "player": "OWN",
        "count": 2
      }
    }
  ]
}
```

</details>

### Effect 4: IGNITION

Text: “You can banish the top 3 cards…” + “You can only use each effect of "Junoldo…”

Lua: `s.spcost`, `s.sptg`, `s.spop`

| From → to                           | Result          | Where it stops                                                                                                                                                                                |
| ----------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “BANISH: the top 3 cards of your Deck, face-down”                                                                                                                       |
| YGOPro script → RML                 | **unread**      | target: aux.MustMaterialCheck(nil,tp,EFFECT_MUST_BE_SMATERIAL); cost: te:UseCountLimit(tp); operation: aux.MustMaterialCheck(nil,tp,EFFECT_MUST_BE_SMATERIAL); operation: tc:SetMaterial(nil) |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                                                                                                                        |
| RML → card text                     | **not written** | unread                                                                                                                                                                                        |

<details><summary>Raw data for effect 4</summary>

**Card text** (input)

> You can banish the top 3 cards of your Deck, face-down; destroy this card, and if you do, Special Summon 1 "Junora the Power Patron of Tuning" from your Extra Deck (this is treated as a Synchro Summon).
>
> You can only use each effect of "Junoldo

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(164260465)
e:SetCategory(513)
e:SetType(64)
e:SetRange(4)
e:SetCountLimit(1,10266280)
e:SetCost(s.spcost)
e:SetTarget(s.sptg)
e:SetOperation(s.spop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcost(e,tp,eg,ep,ev,re,r,rp,chk)
	local g=Duel.GetDecktopGroup(tp,3)
	if chk==0 then return g:FilterCount(Card.IsAbleToRemoveAsCost,nil,POS_FACEDOWN)==3
		and Duel.GetFieldGroupCount(tp,LOCATION_DECK,0)>=3
		or Duel.IsExistingMatchingCard(s.costfilter,tp,LOCATION_GRAVE,0,1,nil,e,tp) end
	if g:FilterCount(Card.IsAbleToRemoveAsCost,nil,POS_FACEDOWN)==3
		and Duel.GetFieldGroupCount(tp,LOCATION_DECK,0)>=3
		and (not Duel.IsExistingMatchingCard(s.costfilter,tp,LOCATION_GRAVE,0,1,nil,e,tp)
		or not Duel.SelectYesNo(tp,aux.Stringid(99311889,1))) then
		Duel.DisableShuffleCheck()
		Duel.Remove(g,POS_FACEDOWN,REASON_COST)
	else
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
		local sg=Duel.SelectMatchingCard(tp,s.costfilter,tp,LOCATION_GRAVE,0,1,1,nil,e,tp)
		local tc=sg:GetFirst()
		local te=tc:IsHasEffect(99311889,tp)
		if te then
			te:UseCountLimit(tp)
			Duel.Remove(tc,POS_FACEUP,REASON_COST+REASON_REPLACE)
		end
	end
end
function s.costfilter(c,e,tp)
	return e:GetHandler():IsSetCard(0x1ce) and c:IsAbleToRemove() and c:IsHasEffect(99311889,tp)
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	local c=e:GetHandler()
	if chk==0 then return aux.MustMaterialCheck(nil,tp,EFFECT_MUST_BE_SMATERIAL)
		and Duel.IsExistingMatchingCard(s.spfilter,tp,LOCATION_EXTRA,0,1,nil,e,tp,c) end
	Duel.SetOperationInfo(0,CATEGORY_DESTROY,e:GetHandler(),1,0,0)
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_EXTRA)
end
function s.spfilter(c,e,tp,mc)
	return c:IsType(TYPE_SYNCHRO) and c:IsCode(5914858)
		and c:IsCanBeSpecialSummoned(e,SUMMON_TYPE_SYNCHRO,tp,false,false) and Duel.GetLocationCountFromEx(tp,tp,mc,c)>0
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if not c:IsRelateToChain() or Duel.Destroy(c,REASON_EFFECT)==0 then return end
	if not aux.MustMaterialCheck(nil,tp,EFFECT_MUST_BE_SMATERIAL) then return end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g=Duel.SelectMatchingCard(tp,s.spfilter,tp,LOCATION_EXTRA,0,1,1,nil,e,tp,nil)
	local tc=g:GetFirst()
	if not tc then return end
	tc:SetMaterial(nil)
	Duel.SpecialSummon(tc,SUMMON_TYPE_SYNCHRO,tp,tp,false,false,POS_FACEUP)
	tc:CompleteProcedure()
end
```

**RML** (output of script → RML)

```json
{
  "index": 4,
  "kind": "IGNITION",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 1,
    "oath": false
  },
  "targets": false,
  "offered": {},
  "description": 164260465,
  "categories": ["DESTROY", "SPECIAL_SUMMON"],
  "declares": [
    {
      "category": "DESTROY",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "who": "THIS_CARD"
      },
      "possible": false
    },
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["EXTRA"],
      "possible": false
    }
  ],
  "cost": [
    {
      "move": "KEEP_DECK_ORDER"
    },
    {
      "move": "BANISH",
      "cards": {
        "deckTop": {
          "player": "OWN",
          "count": 3
        }
      },
      "pick": "DECK_TOP",
      "reasons": ["COST"],
      "position": ["FACEDOWN"]
    },
    {
      "move": "BANISH",
      "cards": {
        "ref": "CHOSEN1"
      },
      "pick": "CHOSEN",
      "count": {
        "min": 1,
        "max": 1
      },
      "from": {
        "own": ["GRAVE"]
      },
      "card": {
        "archetypes": [462],
        "able": ["REMOVE"],
        "hasEffects": ["Prohibitive Power Patron Purview - Vilaea"]
      },
      "reasons": ["COST", "REPLACE"],
      "position": ["FACEUP"]
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "stillOnChain": {
            "who": "THIS_CARD"
          }
        }
      ],
      "moves": [
        {
          "move": "DESTROY",
          "cards": {
            "who": "THIS_CARD"
          },
          "pick": "THIS_CARD",
          "reasons": ["EFFECT"]
        }
      ]
    },
    {
      "part": 2,
      "link": "AND_IF_YOU_DO",
      "level": "SUBSEQUENT",
      "optional": false,
      "requires": [
        {
          "not": {
            "any": [
              {
                "not": {
                  "stillOnChain": {
                    "who": "THIS_CARD"
                  }
                }
              },
              {
                "not": {
                  "atLeast": 1,
                  "of": {
                    "moved": "DESTROY"
                  }
                }
              }
            ]
          }
        },
        {
          "unread": "aux.MustMaterialCheck(nil,tp,EFFECT_MUST_BE_SMATERIAL)"
        },
        {
          "exists": {
            "ref": "CHOSEN2"
          }
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["EXTRA"]
          },
          "card": {
            "types": ["SYNCHRO"],
            "names": [5914858],
            "able": ["SPECIAL_SUMMON_AS_SYNCHRO"],
            "states": ["LEAVES_FREE_EXTRA_DECK_ZONE"]
          },
          "position": ["FACEUP"],
          "summonType": ["SYNCHRO"]
        },
        {
          "move": "PROPERLY_SUMMONED",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["EXTRA"]
          },
          "card": {
            "types": ["SYNCHRO"],
            "names": [5914858],
            "able": ["SPECIAL_SUMMON_AS_SYNCHRO"],
            "states": ["LEAVES_FREE_EXTRA_DECK_ZONE"]
          }
        }
      ]
    }
  ],
  "legal": [
    {
      "unread": "aux.MustMaterialCheck(nil,tp,EFFECT_MUST_BE_SMATERIAL)"
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["EXTRA"]
          },
          "card": {
            "types": ["SYNCHRO"],
            "names": [5914858],
            "able": ["SPECIAL_SUMMON_AS_SYNCHRO"],
            "states": ["LEAVES_FREE_EXTRA_DECK_ZONE"]
          },
          "targetable": false
        }
      }
    }
  ],
  "costChecks": [
    {
      "any": [
        {
          "all": [
            {
              "atLeast": 3,
              "of": {
                "among": {
                  "cards": {
                    "deckTop": {
                      "player": "OWN",
                      "count": 3
                    }
                  },
                  "card": {
                    "able": ["REMOVE_AS_COST"]
                  }
                }
              }
            },
            {
              "not": {
                "atLeast": 4,
                "of": {
                  "among": {
                    "cards": {
                      "deckTop": {
                        "player": "OWN",
                        "count": 3
                      }
                    },
                    "card": {
                      "able": ["REMOVE_AS_COST"]
                    }
                  }
                }
              }
            },
            {
              "atLeast": 3,
              "of": {
                "matching": {
                  "count": 3,
                  "from": {
                    "own": ["DECK"]
                  },
                  "card": {},
                  "targetable": false
                }
              }
            }
          ]
        },
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "own": ["GRAVE"]
              },
              "card": {
                "archetypes": [462],
                "able": ["REMOVE"],
                "hasEffects": ["Prohibitive Power Patron Purview - Vilaea"]
              },
              "targetable": false
            }
          }
        }
      ]
    }
  ],
  "unread": [
    {
      "role": "target",
      "text": "aux.MustMaterialCheck(nil,tp,EFFECT_MUST_BE_SMATERIAL)"
    },
    {
      "role": "cost",
      "text": "te:UseCountLimit(tp)"
    },
    {
      "role": "operation",
      "text": "aux.MustMaterialCheck(nil,tp,EFFECT_MUST_BE_SMATERIAL)"
    },
    {
      "role": "operation",
      "text": "tc:SetMaterial(nil)"
    }
  ]
}
```

</details>

### Effect 5: TRIGGER TO_DECK

Text: “If this card is added to your Extra Deck face-up…” + “You can only use each effect of "Junoldo…”

Lua: `s.thcon`, `s.thtg`, `s.thop`

| From → to                           | Result                          | Where it stops                                                           |
| ----------------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| Card text → RML                     | **not read**                    | not read, stopped at: “If this card is added to your Extra Deck face-up” |
| YGOPro script → RML                 | read                            |                                                                          |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it | the card's other parts stop it                                           |
| RML → card text                     | **not written**                 | a check of this card {"states":["FACEUP"]}                               |

<details><summary>Raw data for effect 5</summary>

**Card text** (input)

> If this card is added to your Extra Deck face-up: You can add 1 "Power Patron" or "Elfnote" card from your face-up Extra Deck or GY to your hand, except "Junoldo the Shadespirit Power Patron".
>
> You can only use each effect of "Junoldo

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(164260466)
e:SetCategory(8)
e:SetType(129)
e:SetCode(1013)
e:SetProperty(65536)
e:SetCountLimit(1,10266281)
e:SetCondition(s.thcon)
e:SetTarget(s.thtg)
e:SetOperation(s.thop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.thcon(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	return c:IsLocation(LOCATION_EXTRA)
		and c:IsFaceup()
end
function s.thtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_GRAVE+LOCATION_EXTRA,0,1,nil) end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_GRAVE+LOCATION_EXTRA)
end
function s.thfilter(c)
	return not c:IsCode(id) and c:IsSetCard(0x1ce,0x1d8) and c:IsAbleToHand()
		and c:IsFaceupEx()
end
function s.thop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
	local g=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(s.thfilter),tp,LOCATION_GRAVE+LOCATION_EXTRA,0,1,1,nil)
	if g:GetCount()>0 then
		Duel.SendtoHand(g,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,g)
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 5,
  "kind": "TRIGGER",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "event": "TO_DECK",
  "eventOf": "SELF",
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 2,
    "oath": false
  },
  "targets": false,
  "flags": ["DELAY"],
  "offered": {},
  "description": 164260466,
  "categories": ["TOHAND"],
  "declares": [
    {
      "category": "TOHAND",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["GRAVE", "EXTRA"],
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "CHOSEN1"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "TO_HAND",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["GRAVE", "EXTRA"]
          },
          "card": {
            "able": ["HAND"],
            "states": ["FACEUP_OR_HIDDEN_ZONE", "NOT_NECRO_VALLEY"],
            "anyOf": [
              {
                "archetypes": [462]
              },
              {
                "archetypes": [472]
              }
            ],
            "none": [
              {
                "names": [10266279]
              }
            ]
          },
          "reasons": ["EFFECT"]
        },
        {
          "move": "REVEAL",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["GRAVE", "EXTRA"]
          },
          "card": {
            "able": ["HAND"],
            "states": ["FACEUP_OR_HIDDEN_ZONE", "NOT_NECRO_VALLEY"],
            "anyOf": [
              {
                "archetypes": [462]
              },
              {
                "archetypes": [472]
              }
            ],
            "none": [
              {
                "names": [10266279]
              }
            ]
          },
          "player": "OPPONENT"
        }
      ]
    }
  ],
  "requires": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "places": ["EXTRA"]
        }
      }
    },
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "states": ["FACEUP"]
        }
      }
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["GRAVE", "EXTRA"]
          },
          "card": {
            "able": ["HAND"],
            "states": ["FACEUP_OR_HIDDEN_ZONE"],
            "anyOf": [
              {
                "archetypes": [462]
              },
              {
                "archetypes": [472]
              }
            ],
            "none": [
              {
                "names": [10266279]
              }
            ]
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

## Elfnote Power Patron (12375297)

> You cannot Special Summon from the Extra Deck, except Synchro Monsters. You can only use each of the following effects of "Elfnote Power Patron" once per turn. During the Main Phase (Quick Effect): You can target 1 monster in your center Main Monster Zone; increase its Level by 3 (until the end of this turn), then immediately after this effect resolves, you can Synchro Summon 1 "Elfnote" Synchro Monster or 1 "Junora the Power Patron of Tuning". If this card is sent to the GY as Synchro Material: You can add 1 "Elfnote" card from your Deck to your hand.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 3 sentence(s)                                         |
| YGOPro script → RML    | unread in 4 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (3 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>RML: <code>summons</code></summary>

```json
[
  {
    "method": "NORMAL",
    "from": ["HAND"]
  }
]
```

</details>

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	aux.AddCodeList(c,5914858)
	--splimit
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetRange(LOCATION_MZONE)
	e1:SetTargetRange(1,0)
	e1:SetTarget(s.splimit)
	c:RegisterEffect(e1)
	--lv up
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,0))
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e2:SetType(EFFECT_TYPE_QUICK_O)
	e2:SetCode(EVENT_FREE_CHAIN)
	e2:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e2:SetRange(LOCATION_MZONE)
	e2:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_MAIN_END)
	e2:SetCountLimit(1,id)
	e2:SetCondition(s.lvcon)
	e2:SetTarget(s.lvtg)
	e2:SetOperation(s.lvop)
	c:RegisterEffect(e2)
	--search
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,1))
	e3:SetCategory(CATEGORY_SEARCH+CATEGORY_TOHAND)
	e3:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e3:SetProperty(EFFECT_FLAG_DELAY)
	e3:SetCode(EVENT_BE_MATERIAL)
	e3:SetCountLimit(1,id+o)
	e3:SetCondition(s.thcon)
	e3:SetTarget(s.thtg)
	e3:SetOperation(s.thop)
	c:RegisterEffect(e3)
end
```

</details>

### Effect 1: CONTINUOUS (CANNOT_SPECIAL_SUMMON)

Text: “You cannot Special Summon from the Extra Deck, except Synchro Monsters.…”

Lua: `s.splimit`

| From → to                           | Result                          | Where it stops                                                                                  |
| ----------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**                    | not read, stopped at: “You cannot Special Summon from the Extra Deck, except Synchro Monsters.” |
| YGOPro script → RML                 | read                            |                                                                                                 |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it | the card's other parts stop it                                                                  |
| RML → card text                     | **not written**                 | applies                                                                                         |

<details><summary>Raw data for effect 1</summary>

**Card text** (input)

> You cannot Special Summon from the Extra Deck, except Synchro Monsters.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetCode(22)
e:SetProperty(2048)
e:SetRange(4)
e:SetTargetRange(1,0)
e:SetTarget(s.splimit)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.splimit(e,c)
	return not c:IsType(TYPE_SYNCHRO) and c:IsLocation(LOCATION_EXTRA)
end
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "from": ["MZONE"],
  "targets": false,
  "flags": ["PLAYER_TARGET"],
  "offered": {},
  "applies": [
    {
      "effect": "CANNOT_SPECIAL_SUMMON",
      "to": {
        "players": "OWN"
      },
      "cards": {
        "places": ["EXTRA"],
        "none": [
          {
            "types": ["SYNCHRO"]
          }
        ]
      }
    }
  ]
}
```

</details>

### Effect 2: QUICK FREE_CHAIN

Text: “During the Main Phase (Quick Effect): You can target 1 monster in your center…” + “You can only use each of the following effects…”

Lua: `s.lvcon`, `s.lvtg`, `s.lvop`

| From → to                           | Result          | Where it stops                                                            |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “target 1 monster in your center Main Monster Zone” |
| YGOPro script → RML                 | **unread**      | condition: Duel.IsMainPhase()                                             |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                    |
| RML → card text                     | **not written** | unread                                                                    |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> During the Main Phase (Quick Effect): You can target 1 monster in your center Main Monster Zone; increase its Level by 3 (until the end of this turn), then immediately after this effect resolves, you can Synchro Summon 1 "Elfnote" Synchro Monster or 1 "Junora the Power Patron of Tuning".
>
> You can only use each of the following effects

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(198004752)
e:SetCategory(512)
e:SetType(256)
e:SetCode(1002)
e:SetProperty(16)
e:SetRange(4)
e:SetHintTiming(0,452)
e:SetCountLimit(1,12375297)
e:SetCondition(s.lvcon)
e:SetTarget(s.lvtg)
e:SetOperation(s.lvop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.lvcon(e,tp,eg,ep,ev,re,r,rp)
	return Duel.IsMainPhase()
end
function s.lvtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chkc then return false end
	if chk==0 then return Duel.IsExistingMatchingCard(s.lvfilter,tp,LOCATION_MZONE,0,1,nil,e) end
	local g=Duel.GetMatchingGroup(s.lvfilter,tp,LOCATION_MZONE,0,nil,e)
	if g:GetCount()==1 then
		Duel.SetTargetCard(g)
	else
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FACEUP)
		Duel.SelectTarget(tp,s.lvfilter,tp,LOCATION_MZONE,0,1,1,nil,e)
	end
end
function s.lvfilter(c,e)
	return c:GetSequence()==2 and c:IsFaceup() and c:IsLevelAbove(1)
		and c:IsCanBeEffectTarget(e)
end
function s.lvop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local tc=Duel.GetFirstTarget()
	if tc:IsFaceup() and tc:IsRelateToChain() and not tc:IsImmuneToEffect(e) then
		local e1=Effect.CreateEffect(c)
		e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
		e1:SetType(EFFECT_TYPE_SINGLE)
		e1:SetCode(EFFECT_UPDATE_LEVEL)
		e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
		e1:SetValue(3)
		tc:RegisterEffect(e1)
		Duel.AdjustAll()
		if Duel.IsExistingMatchingCard(s.syncfilter,tp,LOCATION_EXTRA,0,1,nil,tp) and Duel.SelectYesNo(tp,aux.Stringid(id,2)) then
			Duel.BreakEffect()
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
			local g=Duel.SelectMatchingCard(tp,s.syncfilter,tp,LOCATION_EXTRA,0,1,1,nil,tp)
			Duel.SynchroSummon(tp,g:GetFirst(),nil)
		end
	end
end
function s.syncfilter(c,tp)
	return (c:IsSetCard(0x1d8) or c:IsCode(5914858)) and c:IsType(TYPE_SYNCHRO) and c:IsSynchroSummonable(nil)
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": true,
  "flags": ["CARD_TARGET"],
  "offered": {
    "opponent": ["MAIN_END", "SUMMON", "SPSUMMON", "FLIPSUMMON"]
  },
  "description": 198004752,
  "categories": ["SPECIAL_SUMMON"],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "is": {
            "cards": {
              "ref": "TARGET"
            },
            "filter": {
              "states": ["FACEUP"]
            }
          }
        },
        {
          "stillOnChain": {
            "ref": "TARGET"
          }
        },
        {
          "not": {
            "is": {
              "cards": {
                "ref": "TARGET"
              },
              "filter": {
                "states": ["IMMUNE_TO_THIS"]
              }
            }
          }
        }
      ],
      "moves": [
        {
          "move": "GIVE_EFFECT",
          "cards": {
            "ref": "TARGET"
          },
          "pick": "TARGETED",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "able": ["TARGET"],
            "states": ["FACEUP"],
            "numbers": {
              "SEQUENCE": {
                "is": [2]
              },
              "LEVEL": {
                "min": 1
              }
            }
          },
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "flags": ["CANNOT_DISABLE"],
            "offered": {},
            "applies": [
              {
                "effect": "UPDATE_LEVEL",
                "to": "THIS_CARD",
                "value": 3
              }
            ]
          },
          "until": ["LEAVES_FIELD_OR_FLIPS", "END_PHASE"]
        },
        {
          "move": "ADJUST_ALL"
        }
      ]
    },
    {
      "part": 2,
      "link": "THEN",
      "level": "SUBSEQUENT",
      "optional": true,
      "requires": [
        {
          "is": {
            "cards": {
              "ref": "TARGET"
            },
            "filter": {
              "states": ["FACEUP"]
            }
          }
        },
        {
          "stillOnChain": {
            "ref": "TARGET"
          }
        },
        {
          "not": {
            "is": {
              "cards": {
                "ref": "TARGET"
              },
              "filter": {
                "states": ["IMMUNE_TO_THIS"]
              }
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "own": ["EXTRA"]
              },
              "card": {
                "types": ["SYNCHRO"],
                "able": ["SYNCHRO_SUMMON_NOW"],
                "anyOf": [
                  {
                    "archetypes": [472]
                  },
                  {
                    "names": [5914858]
                  }
                ]
              },
              "targetable": false
            }
          }
        }
      ],
      "moves": [
        {
          "move": "SYNCHRO_SUMMON",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["EXTRA"]
          },
          "card": {
            "types": ["SYNCHRO"],
            "able": ["SYNCHRO_SUMMON_NOW"],
            "anyOf": [
              {
                "archetypes": [472]
              },
              {
                "names": [5914858]
              }
            ]
          }
        }
      ]
    }
  ],
  "requires": [
    {
      "unread": "Duel.IsMainPhase()"
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "able": ["TARGET"],
            "states": ["FACEUP"],
            "numbers": {
              "SEQUENCE": {
                "is": [2]
              },
              "LEVEL": {
                "min": 1
              }
            }
          },
          "targetable": false
        }
      }
    }
  ],
  "unread": [
    {
      "role": "condition",
      "text": "Duel.IsMainPhase()"
    }
  ]
}
```

</details>

### Effect 3: TRIGGER BE_MATERIAL

Text: “If this card is sent to the GY as Synchro Material: You can add 1…” + “You can only use each of the following effects…”

Lua: `s.thcon`, `s.thtg`, `s.thop`

| From → to                           | Result          | Where it stops                                                             |
| ----------------------------------- | --------------- | -------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “If this card is sent to the GY as Synchro Material” |
| YGOPro script → RML                 | **unread**      | condition: r==REASON_SYNCHRO                                               |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                     |
| RML → card text                     | **not written** | unread                                                                     |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> If this card is sent to the GY as Synchro Material: You can add 1 "Elfnote" card from your Deck to your hand.
>
> You can only use each of the following effects

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(198004753)
e:SetCategory(131080)
e:SetType(129)
e:SetProperty(65536)
e:SetCode(1108)
e:SetCountLimit(1,12375298)
e:SetCondition(s.thcon)
e:SetTarget(s.thtg)
e:SetOperation(s.thop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.thcon(e,tp,eg,ep,ev,re,r,rp)
	return e:GetHandler():IsLocation(LOCATION_GRAVE) and r==REASON_SYNCHRO
end
function s.thtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_DECK,0,1,nil) end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function s.thfilter(c)
	return c:IsSetCard(0x1d8) and c:IsAbleToHand()
end
function s.thop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
	local g=Duel.SelectMatchingCard(tp,s.thfilter,tp,LOCATION_DECK,0,1,1,nil)
	if g:GetCount()>0 then
		Duel.SendtoHand(g,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,g)
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "TRIGGER",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "event": "BE_MATERIAL",
  "eventOf": "SELF",
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 1,
    "oath": false
  },
  "targets": false,
  "flags": ["DELAY"],
  "offered": {},
  "description": 198004753,
  "categories": ["TOHAND", "SEARCH"],
  "declares": [
    {
      "category": "TOHAND",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["DECK"],
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "CHOSEN1"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "TO_HAND",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "archetypes": [472],
            "able": ["HAND"]
          },
          "reasons": ["EFFECT"]
        },
        {
          "move": "REVEAL",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "archetypes": [472],
            "able": ["HAND"]
          },
          "player": "OPPONENT"
        }
      ]
    }
  ],
  "requires": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "places": ["GRAVE"]
        }
      }
    },
    {
      "unread": "r==REASON_SYNCHRO"
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "archetypes": [472],
            "able": ["HAND"]
          },
          "targetable": false
        }
      }
    }
  ],
  "unread": [
    {
      "role": "condition",
      "text": "r==REASON_SYNCHRO"
    }
  ]
}
```

</details>

## Elfnote Lucina (13597785)

> You can Special Summon this card (from your hand) to your center Main Monster Zone. You can only Special Summon "Elfnote Lucina" once per turn this way. You can only use each of the following effects of "Elfnote Lucina" once per turn. During your Main Phase: You can add 1 "Elfnote" monster from your Deck to your hand, except "Elfnote Lucina". During your opponent's turn (Quick Effect): You can switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone, then you can return 1 Level 6 or lower monster your opponent controls to the hand.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 3 sentence(s)                                         |
| YGOPro script → RML    | unread in 9 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (1 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

Not tied to one effect:

- RML → scripts: summon PROCEDURE: more than its materials

<details><summary>RML: <code>summons</code></summary>

```json
[
  {
    "method": "PROCEDURE",
    "from": ["HAND"],
    "requires": [
      {
        "atLeast": 1,
        "of": {
          "freeZones": {
            "own": ["MZONE"]
          },
          "forExtraDeck": false
        }
      }
    ]
  },
  {
    "method": "TRIBUTE",
    "from": ["HAND"],
    "materials": [
      {
        "count": {
          "min": 1,
          "max": 1
        },
        "role": "ANY",
        "card": {}
      }
    ]
  }
]
```

</details>

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--special summon
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_SPSUMMON_PROC)
	e1:SetProperty(EFFECT_FLAG_UNCOPYABLE)
	e1:SetRange(LOCATION_HAND)
	e1:SetCountLimit(1,id+EFFECT_COUNT_CODE_OATH)
	e1:SetCondition(s.spcon)
	e1:SetValue(s.spval)
	c:RegisterEffect(e1)
	--tohand
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,0))
	e2:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)
	e2:SetType(EFFECT_TYPE_IGNITION)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCountLimit(1,id)
	e2:SetTarget(s.thtg)
	e2:SetOperation(s.thop)
	c:RegisterEffect(e2)
	--switch locations
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,1))
	e3:SetCategory(CATEGORY_TOHAND)
	e3:SetType(EFFECT_TYPE_QUICK_O)
	e3:SetCode(EVENT_FREE_CHAIN)
	e3:SetRange(LOCATION_MZONE)
	e3:SetCountLimit(1,id+o)
	e3:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_MAIN_END+TIMING_END_PHASE)
	e3:SetCondition(s.chcon)
	e3:SetTarget(s.chtg)
	e3:SetOperation(s.chop)
	c:RegisterEffect(e3)
end
```

</details>

### Effect 1: CONTINUOUS (SPSUMMON_PROC)

Text: “You can Special Summon this card (from your hand) to your center…” + “You can only Special Summon "Elfnote Lucina"…”

Lua: `s.spcon`, `s.spval`

| From → to                           | Result                             | Where it stops                                                                                                                                                                                            |
| ----------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**                       | not read, stopped at: “You can Special Summon this card (from your hand) to your center Main Monster Zone.”; not read, stopped at: “You can only Special Summon "Elfnote Lucina" once per turn this way.” |
| YGOPro script → RML                 | **unread**                         | value: {WHO=RAW EXPR=0}                                                                                                                                                                                   |
| RML → YGOPro, EDOPro, Omega scripts | **not written**                    | unread                                                                                                                                                                                                    |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above                                                                                                                                                             |

<details><summary>Raw data for effect 1</summary>

**Card text** (input)

> You can Special Summon this card (from your hand) to your center Main Monster Zone.
>
> You can only Special Summon "Elfnote Lucina" once per turn this way.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetCode(34)
e:SetProperty(262144)
e:SetRange(2)
e:SetCountLimit(1,282033241)
e:SetCondition(s.spcon)
e:SetValue(s.spval)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcon(e,c)
	if c==nil then return true end
	local tp=c:GetControler()
	return Duel.GetLocationCount(tp,LOCATION_MZONE,tp,LOCATION_REASON_TOFIELD,0x4)>0
end
function s.spval(e,c)
	return 0,0x4
end
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": true,
  "mandatory": false,
  "from": ["HAND"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": true
  },
  "targets": false,
  "flags": ["UNCOPYABLE"],
  "offered": {},
  "applies": [
    {
      "effect": "SPSUMMON_PROC",
      "to": "DUEL",
      "value": {},
      "requires": [
        {
          "exists": {
            "unread": "{WHO=RAW EXPR=0}"
          }
        }
      ]
    }
  ],
  "requires": [
    {
      "any": [
        {
          "not": {
            "exists": {
              "who": "THIS_CARD"
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": false
          }
        }
      ]
    }
  ],
  "unread": [
    {
      "role": "value",
      "text": "{WHO=RAW EXPR=0}"
    }
  ]
}
```

</details>

### Effect 2: IGNITION

Text: “During your Main Phase: You can add 1…” + “You can only use each of the following effects…”

Lua: `s.thtg`, `s.thop`

| From → to                           | Result                             | Where it stops                                |
| ----------------------------------- | ---------------------------------- | --------------------------------------------- |
| Card text → RML                     | read                               |                                               |
| YGOPro script → RML                 | read                               |                                               |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it    | the card's other parts stop it                |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> During your Main Phase: You can add 1 "Elfnote" monster from your Deck to your hand, except "Elfnote Lucina".
>
> You can only use each of the following effects

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(217564560)
e:SetCategory(131080)
e:SetType(64)
e:SetRange(4)
e:SetCountLimit(1,13597785)
e:SetTarget(s.thtg)
e:SetOperation(s.thop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.thtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_DECK,0,1,nil) end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function s.thfilter(c)
	return not c:IsCode(id) and c:IsSetCard(0x1d8) and c:IsType(TYPE_MONSTER) and c:IsAbleToHand()
end
function s.thop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
	local g=Duel.SelectMatchingCard(tp,s.thfilter,tp,LOCATION_DECK,0,1,1,nil)
	if #g>0 then
		Duel.SendtoHand(g,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,g)
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "IGNITION",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {},
  "description": 217564560,
  "categories": ["TOHAND", "SEARCH"],
  "declares": [
    {
      "category": "TOHAND",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["DECK"],
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "CHOSEN1"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "TO_HAND",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "types": ["MONSTER"],
            "archetypes": [472],
            "able": ["HAND"],
            "none": [
              {
                "names": [13597785]
              }
            ]
          },
          "reasons": ["EFFECT"]
        },
        {
          "move": "REVEAL",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "types": ["MONSTER"],
            "archetypes": [472],
            "able": ["HAND"],
            "none": [
              {
                "names": [13597785]
              }
            ]
          },
          "player": "OPPONENT"
        }
      ]
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "types": ["MONSTER"],
            "archetypes": [472],
            "able": ["HAND"],
            "none": [
              {
                "names": [13597785]
              }
            ]
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

### Effect 3: QUICK FREE_CHAIN

Text: “During your opponent's turn (Quick Effect)…” + “You can only use each of the following effects…”

Lua: `s.chcon`, `s.chtg`, `s.chop`

| From → to                           | Result          | Where it stops                                                                                                                           |
| ----------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone”     |
| YGOPro script → RML                 | **unread**      | operation: cs>4; operation: cs==2; operation: Duel.SwapSequence(c,tc); operation: cs>4; operation: cs==2; operation: c:GetSequence()==cs |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                                                                   |
| RML → card text                     | **not written** | unread                                                                                                                                   |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> During your opponent's turn (Quick Effect): You can switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone, then you can return 1 Level 6 or lower monster your opponent controls to the hand.
>
> You can only use each of the following effects

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(217564561)
e:SetCategory(8)
e:SetType(256)
e:SetCode(1002)
e:SetRange(4)
e:SetCountLimit(1,13597786)
e:SetHintTiming(0,484)
e:SetCondition(s.chcon)
e:SetTarget(s.chtg)
e:SetOperation(s.chop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.chcon(e,tp,eg,ep,ev,re,r,rp)
	return e:GetHandler():GetSequence()<5 and Duel.GetTurnPlayer()==1-tp
end
function s.chtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.chfilter,tp,LOCATION_MZONE,0,1,e:GetHandler()) end
end
function s.chfilter(c)
	return c:GetSequence()==2
end
function s.chop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local cs=c:GetSequence()
	if not c:IsRelateToChain() or not c:IsControler(tp) or cs>4 or cs==2 then return end
	local g=Duel.GetMatchingGroup(s.chfilter,tp,LOCATION_MZONE,0,nil)
	if g:GetCount()==1 then
		local tc=g:GetFirst()
		Duel.SwapSequence(c,tc)
		if c:GetSequence()==cs then return end
		if Duel.IsExistingMatchingCard(s.rthfilter,tp,0,LOCATION_MZONE,1,nil)
			and Duel.SelectYesNo(tp,aux.Stringid(id,2)) then
			Duel.BreakEffect()
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RTOHAND)
			local rg=Duel.SelectMatchingCard(tp,s.rthfilter,tp,0,LOCATION_MZONE,1,1,nil)
			Duel.HintSelection(rg)
			Duel.SendtoHand(rg,nil,REASON_EFFECT)
		end
	end
end
function s.rthfilter(c)
	return c:IsFaceup() and c:IsAbleToHand() and c:IsLevelBelow(6)
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 1,
    "oath": false
  },
  "targets": false,
  "offered": {
    "opponent": ["MAIN_END", "END_PHASE", "SUMMON", "SPSUMMON", "FLIPSUMMON"]
  },
  "description": 217564561,
  "categories": ["TOHAND"],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "not": {
            "any": [
              {
                "not": {
                  "stillOnChain": {
                    "who": "THIS_CARD"
                  }
                }
              },
              {
                "not": {
                  "is": {
                    "cards": {
                      "who": "THIS_CARD"
                    },
                    "filter": {
                      "controller": "OWN"
                    }
                  }
                }
              },
              {
                "unread": "cs>4"
              },
              {
                "unread": "cs==2"
              }
            ]
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "ALL1"
            }
          }
        },
        {
          "not": {
            "atLeast": 2,
            "of": {
              "cards": {
                "ref": "ALL1"
              }
            }
          }
        }
      ]
    },
    {
      "part": 2,
      "link": "ALSO_AFTER_THAT",
      "level": "EFFECT",
      "optional": true,
      "requires": [
        {
          "not": {
            "any": [
              {
                "not": {
                  "stillOnChain": {
                    "who": "THIS_CARD"
                  }
                }
              },
              {
                "not": {
                  "is": {
                    "cards": {
                      "who": "THIS_CARD"
                    },
                    "filter": {
                      "controller": "OWN"
                    }
                  }
                }
              },
              {
                "unread": "cs>4"
              },
              {
                "unread": "cs==2"
              }
            ]
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "ALL1"
            }
          }
        },
        {
          "not": {
            "atLeast": 2,
            "of": {
              "cards": {
                "ref": "ALL1"
              }
            }
          }
        },
        {
          "not": {
            "is": {
              "cards": {
                "who": "THIS_CARD"
              },
              "filter": {
                "unread": ["c:GetSequence()==cs"]
              }
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "opponent": ["MZONE"]
              },
              "card": {
                "able": ["HAND"],
                "states": ["FACEUP"],
                "numbers": {
                  "LEVEL": {
                    "max": 6
                  }
                }
              },
              "targetable": false
            }
          }
        }
      ],
      "moves": [
        {
          "move": "TO_HAND",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "opponent": ["MZONE"]
          },
          "card": {
            "able": ["HAND"],
            "states": ["FACEUP"],
            "numbers": {
              "LEVEL": {
                "max": 6
              }
            }
          },
          "reasons": ["EFFECT"]
        }
      ]
    }
  ],
  "requires": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "numbers": {
            "SEQUENCE": {
              "max": 4
            }
          }
        }
      }
    },
    {
      "turn": "OPPONENT"
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "states": ["NOT_SELF"],
            "numbers": {
              "SEQUENCE": {
                "is": [2]
              }
            }
          },
          "targetable": false
        }
      }
    }
  ],
  "unread": [
    {
      "role": "operation",
      "text": "cs>4"
    },
    {
      "role": "operation",
      "text": "cs==2"
    },
    {
      "role": "operation",
      "text": "Duel.SwapSequence(c,tc)"
    },
    {
      "role": "operation",
      "text": "cs>4"
    },
    {
      "role": "operation",
      "text": "cs==2"
    },
    {
      "role": "operation",
      "text": "c:GetSequence()==cs"
    }
  ]
}
```

</details>

## Elfnote Tinia (59581480)

> You can Special Summon this card (from your hand) to your center Main Monster Zone. You can only Special Summon "Elfnote Tinia" once per turn this way. You can only use each of the following effects of "Elfnote Tinia" once per turn. During your Main Phase: You can place 1 "Elfnote" Continuous Spell from your Deck face-up on your field. During your opponent's turn (Quick Effect): You can switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone, then you can banish (face-up) 1 random card from your opponent's hand, until the End Phase.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 4 sentence(s)                                         |
| YGOPro script → RML    | unread in 9 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (2 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

Not tied to one effect:

- RML → scripts: summon PROCEDURE: more than its materials

<details><summary>RML: <code>summons</code></summary>

```json
[
  {
    "method": "PROCEDURE",
    "from": ["HAND"],
    "requires": [
      {
        "atLeast": 1,
        "of": {
          "freeZones": {
            "own": ["MZONE"]
          },
          "forExtraDeck": false
        }
      }
    ]
  },
  {
    "method": "TRIBUTE",
    "from": ["HAND"],
    "materials": [
      {
        "count": {
          "min": 1,
          "max": 1
        },
        "role": "ANY",
        "card": {}
      }
    ]
  }
]
```

</details>

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--special summon
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_SPSUMMON_PROC)
	e1:SetProperty(EFFECT_FLAG_UNCOPYABLE)
	e1:SetRange(LOCATION_HAND)
	e1:SetCountLimit(1,id+EFFECT_COUNT_CODE_OATH)
	e1:SetCondition(s.spcon)
	e1:SetValue(s.spval)
	c:RegisterEffect(e1)
	--place
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,0))
	e2:SetType(EFFECT_TYPE_IGNITION)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCountLimit(1,id)
	e2:SetTarget(s.ptg)
	e2:SetOperation(s.pop)
	c:RegisterEffect(e2)
	--switch locations
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,1))
	e3:SetCategory(CATEGORY_REMOVE)
	e3:SetType(EFFECT_TYPE_QUICK_O)
	e3:SetCode(EVENT_FREE_CHAIN)
	e3:SetRange(LOCATION_MZONE)
	e3:SetCountLimit(1,id+o)
	e3:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_MAIN_END+TIMING_END_PHASE)
	e3:SetCondition(s.chcon)
	e3:SetTarget(s.chtg)
	e3:SetOperation(s.chop)
	c:RegisterEffect(e3)
end
```

</details>

### Effect 1: CONTINUOUS (SPSUMMON_PROC)

Text: “You can Special Summon this card (from your hand) to your center…” + “You can only Special Summon "Elfnote Tinia"…”

Lua: `s.spcon`, `s.spval`

| From → to                           | Result                             | Where it stops                                                                                                                                                                                           |
| ----------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**                       | not read, stopped at: “You can Special Summon this card (from your hand) to your center Main Monster Zone.”; not read, stopped at: “You can only Special Summon "Elfnote Tinia" once per turn this way.” |
| YGOPro script → RML                 | **unread**                         | value: {WHO=RAW EXPR=0}                                                                                                                                                                                  |
| RML → YGOPro, EDOPro, Omega scripts | **not written**                    | unread                                                                                                                                                                                                   |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above                                                                                                                                                            |

<details><summary>Raw data for effect 1</summary>

**Card text** (input)

> You can Special Summon this card (from your hand) to your center Main Monster Zone.
>
> You can only Special Summon "Elfnote Tinia" once per turn this way.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetCode(34)
e:SetProperty(262144)
e:SetRange(2)
e:SetCountLimit(1,328016936)
e:SetCondition(s.spcon)
e:SetValue(s.spval)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcon(e,c)
	if c==nil then return true end
	local tp=c:GetControler()
	return Duel.GetLocationCount(tp,LOCATION_MZONE,tp,LOCATION_REASON_TOFIELD,0x4)>0
end
function s.spval(e,c)
	return 0,0x4
end
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": true,
  "mandatory": false,
  "from": ["HAND"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": true
  },
  "targets": false,
  "flags": ["UNCOPYABLE"],
  "offered": {},
  "applies": [
    {
      "effect": "SPSUMMON_PROC",
      "to": "DUEL",
      "value": {},
      "requires": [
        {
          "exists": {
            "unread": "{WHO=RAW EXPR=0}"
          }
        }
      ]
    }
  ],
  "requires": [
    {
      "any": [
        {
          "not": {
            "exists": {
              "who": "THIS_CARD"
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": false
          }
        }
      ]
    }
  ],
  "unread": [
    {
      "role": "value",
      "text": "{WHO=RAW EXPR=0}"
    }
  ]
}
```

</details>

### Effect 2: IGNITION

Text: “During your Main Phase: You can place 1 "Elfnote" Continuous Spell…” + “You can only use each of the following effects…”

Lua: `s.ptg`, `s.pop`

| From → to                           | Result          | Where it stops                                                                                  |
| ----------------------------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “place 1 "Elfnote" Continuous Spell from your Deck face-up on your field” |
| YGOPro script → RML                 | read            |                                                                                                 |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | that {"ref":"CHOSEN1"} exists                                                                   |
| RML → card text                     | **not written** | the move PLACE                                                                                  |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> During your Main Phase: You can place 1 "Elfnote" Continuous Spell from your Deck face-up on your field.
>
> You can only use each of the following effects

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(953303680)
e:SetType(64)
e:SetRange(4)
e:SetCountLimit(1,59581480)
e:SetTarget(s.ptg)
e:SetOperation(s.pop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.ptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_SZONE)>0
		and Duel.IsExistingMatchingCard(s.pfilter,tp,LOCATION_DECK,0,1,nil,tp) end
end
function s.pfilter(c,tp)
	return c:IsAllTypes(TYPE_CONTINUOUS+TYPE_SPELL) and c:IsSetCard(0x1d8)
		and not c:IsForbidden() and c:CheckUniqueOnField(tp)
end
function s.pop(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetLocationCount(tp,LOCATION_SZONE)<=0 then return end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOFIELD)
	local tc=Duel.SelectMatchingCard(tp,s.pfilter,tp,LOCATION_DECK,0,1,1,nil,tp):GetFirst()
	if tc then Duel.MoveToField(tc,tp,tp,LOCATION_SZONE,POS_FACEUP,true) end
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "IGNITION",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {},
  "description": 953303680,
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["SZONE"]
            },
            "forExtraDeck": false
          }
        },
        {
          "exists": {
            "ref": "CHOSEN1"
          }
        }
      ],
      "moves": [
        {
          "move": "PLACE",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "allTypes": ["CONTINUOUS", "SPELL"],
            "archetypes": [472],
            "states": ["ONLY_ONE_ALLOWS"],
            "none": [
              {
                "states": ["FORBIDDEN"]
              }
            ]
          }
        }
      ]
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "freeZones": {
          "own": ["SZONE"]
        },
        "forExtraDeck": false
      }
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "allTypes": ["CONTINUOUS", "SPELL"],
            "archetypes": [472],
            "states": ["ONLY_ONE_ALLOWS"],
            "none": [
              {
                "states": ["FORBIDDEN"]
              }
            ]
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

### Effect 3: QUICK FREE_CHAIN

Text: “During your opponent's turn (Quick Effect)…” + “You can only use each of the following effects…”

Lua: `s.chcon`, `s.chtg`, `s.chop`

| From → to                           | Result          | Where it stops                                                                                                                           |
| ----------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone”     |
| YGOPro script → RML                 | **unread**      | operation: cs>4; operation: cs==2; operation: Duel.SwapSequence(c,tc); operation: cs>4; operation: cs==2; operation: c:GetSequence()==cs |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                                                                   |
| RML → card text                     | **not written** | unread                                                                                                                                   |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> During your opponent's turn (Quick Effect): You can switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone, then you can banish (face-up) 1 random card from your opponent's hand, until the End Phase.
>
> You can only use each of the following effects

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(953303681)
e:SetCategory(4)
e:SetType(256)
e:SetCode(1002)
e:SetRange(4)
e:SetCountLimit(1,59581481)
e:SetHintTiming(0,484)
e:SetCondition(s.chcon)
e:SetTarget(s.chtg)
e:SetOperation(s.chop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.chcon(e,tp,eg,ep,ev,re,r,rp)
	return e:GetHandler():GetSequence()<5 and Duel.GetTurnPlayer()==1-tp
end
function s.chtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.chfilter,tp,LOCATION_MZONE,0,1,e:GetHandler()) end
end
function s.chfilter(c)
	return c:GetSequence()==2
end
function s.chop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local cs=c:GetSequence()
	if not c:IsRelateToChain() or not c:IsControler(tp) or cs>4 or cs==2 then return end
	local g=Duel.GetMatchingGroup(s.chfilter,tp,LOCATION_MZONE,0,nil)
	if g:GetCount()==1 then
		local tc=g:GetFirst()
		Duel.SwapSequence(c,tc)
		if c:GetSequence()==cs then return end
		if Duel.IsExistingMatchingCard(Card.IsAbleToRemove,tp,0,LOCATION_HAND,1,nil)
			and Duel.SelectYesNo(tp,aux.Stringid(id,2)) then
			Duel.BreakEffect()
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RTOHAND)
			local rg=Duel.GetMatchingGroup(Card.IsAbleToRemove,tp,0,LOCATION_HAND,nil):RandomSelect(tp,1)
			Duel.HintSelection(rg)
			local rc=rg:GetFirst()
			Duel.SendtoHand(rg,nil,REASON_EFFECT)
			Duel.Remove(rc,POS_FACEUP,REASON_EFFECT)
			Duel.ShuffleHand(1-tp)
			local fid=c:GetFieldID()
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
			e1:SetCode(EVENT_PHASE+PHASE_END)
			e1:SetCountLimit(1)
			e1:SetLabel(fid)
			e1:SetLabelObject(rc)
			e1:SetCondition(s.retcon)
			e1:SetOperation(s.retop)
			e1:SetReset(RESET_PHASE+PHASE_END)
			Duel.RegisterEffect(e1,tp)
			rc:RegisterFlagEffect(id,RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END,EFFECT_FLAG_CLIENT_HINT,1,fid,aux.Stringid(id,3))
		end
	end
end
function s.retcon(e,tp,eg,ep,ev,re,r,rp)
	local tc=e:GetLabelObject()
	if tc:GetFlagEffectLabel(id)==e:GetLabel() then
		return true
	else
		e:Reset()
		return false
	end
end
function s.retop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_CARD,0,id)
	local tc=e:GetLabelObject()
	Duel.SendtoHand(tc,nil,REASON_EFFECT)
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 1,
    "oath": false
  },
  "targets": false,
  "offered": {
    "opponent": ["MAIN_END", "END_PHASE", "SUMMON", "SPSUMMON", "FLIPSUMMON"]
  },
  "description": 953303681,
  "categories": ["REMOVE"],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "not": {
            "any": [
              {
                "not": {
                  "stillOnChain": {
                    "who": "THIS_CARD"
                  }
                }
              },
              {
                "not": {
                  "is": {
                    "cards": {
                      "who": "THIS_CARD"
                    },
                    "filter": {
                      "controller": "OWN"
                    }
                  }
                }
              },
              {
                "unread": "cs>4"
              },
              {
                "unread": "cs==2"
              }
            ]
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "ALL1"
            }
          }
        },
        {
          "not": {
            "atLeast": 2,
            "of": {
              "cards": {
                "ref": "ALL1"
              }
            }
          }
        }
      ]
    },
    {
      "part": 2,
      "link": "ALSO_AFTER_THAT",
      "level": "EFFECT",
      "optional": true,
      "requires": [
        {
          "not": {
            "any": [
              {
                "not": {
                  "stillOnChain": {
                    "who": "THIS_CARD"
                  }
                }
              },
              {
                "not": {
                  "is": {
                    "cards": {
                      "who": "THIS_CARD"
                    },
                    "filter": {
                      "controller": "OWN"
                    }
                  }
                }
              },
              {
                "unread": "cs>4"
              },
              {
                "unread": "cs==2"
              }
            ]
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "ALL1"
            }
          }
        },
        {
          "not": {
            "atLeast": 2,
            "of": {
              "cards": {
                "ref": "ALL1"
              }
            }
          }
        },
        {
          "not": {
            "is": {
              "cards": {
                "who": "THIS_CARD"
              },
              "filter": {
                "unread": ["c:GetSequence()==cs"]
              }
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "opponent": ["HAND"]
              },
              "card": {
                "able": ["REMOVE"]
              },
              "targetable": false
            }
          }
        }
      ],
      "moves": [
        {
          "move": "TO_HAND",
          "cards": {
            "ref": "CHOSEN3"
          },
          "pick": "RANDOM",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "opponent": ["HAND"]
          },
          "card": {
            "able": ["REMOVE"]
          },
          "reasons": ["EFFECT"]
        },
        {
          "move": "BANISH",
          "cards": {
            "ref": "CHOSEN3"
          },
          "pick": "RANDOM",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "opponent": ["HAND"]
          },
          "card": {
            "able": ["REMOVE"]
          },
          "reasons": ["EFFECT"],
          "position": ["FACEUP"]
        },
        {
          "move": "PLAYER_EFFECT",
          "player": "OWN",
          "effect": {
            "index": 0,
            "kind": "AUTO",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "event": "PHASE_END",
            "eventOf": "ANY",
            "limit": {
              "count": 1,
              "per": "TURN",
              "shared": "COPY",
              "counter": 0,
              "oath": false
            },
            "targets": false,
            "label": [
              {
                "fieldId": {
                  "who": "THIS_CARD"
                }
              }
            ],
            "labelObject": {
              "ref": "CHOSEN3"
            },
            "offered": {},
            "does": [
              {
                "part": 1,
                "level": "EFFECT",
                "optional": false,
                "moves": [
                  {
                    "move": "TO_HAND",
                    "cards": {
                      "memory": {
                        "effect": "THIS",
                        "slot": "OBJECT"
                      }
                    },
                    "reasons": ["EFFECT"]
                  }
                ]
              }
            ],
            "requires": [
              {
                "any": [
                  {
                    "compare": {
                      "value": {
                        "memory": {
                          "flag": "THIS_CARD"
                        },
                        "on": {
                          "memory": {
                            "effect": "THIS",
                            "slot": "OBJECT"
                          }
                        }
                      },
                      "is": "EQUAL",
                      "to": {
                        "memory": {
                          "effect": "THIS",
                          "slot": "NUMBER"
                        }
                      }
                    }
                  },
                  {
                    "never": true
                  }
                ]
              }
            ],
            "whenChecked": [
              {
                "move": "END_EFFECT",
                "ended": "THIS",
                "requires": [
                  {
                    "not": {
                      "compare": {
                        "value": {
                          "memory": {
                            "flag": "THIS_CARD"
                          },
                          "on": {
                            "memory": {
                              "effect": "THIS",
                              "slot": "OBJECT"
                            }
                          }
                        },
                        "is": "EQUAL",
                        "to": {
                          "memory": {
                            "effect": "THIS",
                            "slot": "NUMBER"
                          }
                        }
                      }
                    }
                  }
                ]
              }
            ]
          },
          "until": ["END_PHASE"]
        },
        {
          "move": "REMEMBER",
          "cards": {
            "ref": "CHOSEN3"
          },
          "memory": {
            "flag": "THIS_CARD"
          },
          "numbers": [
            {
              "fieldId": {
                "who": "THIS_CARD"
              }
            }
          ],
          "until": ["LEAVES_FIELD_OR_FLIPS", "END_PHASE"],
          "flags": ["CLIENT_HINT"],
          "description": 953303683
        }
      ]
    }
  ],
  "requires": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "numbers": {
            "SEQUENCE": {
              "max": 4
            }
          }
        }
      }
    },
    {
      "turn": "OPPONENT"
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "states": ["NOT_SELF"],
            "numbers": {
              "SEQUENCE": {
                "is": [2]
              }
            }
          },
          "targetable": false
        }
      }
    }
  ],
  "unread": [
    {
      "role": "operation",
      "text": "cs>4"
    },
    {
      "role": "operation",
      "text": "cs==2"
    },
    {
      "role": "operation",
      "text": "Duel.SwapSequence(c,tc)"
    },
    {
      "role": "operation",
      "text": "cs>4"
    },
    {
      "role": "operation",
      "text": "cs==2"
    },
    {
      "role": "operation",
      "text": "c:GetSequence()==cs"
    }
  ]
}
```

</details>

## Elfnote Fortuna (85976588)

> You can Special Summon this card (from your hand) to your center Main Monster Zone. You can only Special Summon "Elfnote Fortuna" once per turn this way. You can only use each of the following effects of "Elfnote Fortuna" once per turn. During your Main Phase: You can place 1 "Elfnote" Continuous Trap from your hand or Deck, face-up on your field. During your opponent's turn (Quick Effect): You can switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone, then you can return 1 face-up Spell/Trap on the field to the hand.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 4 sentence(s)                                         |
| YGOPro script → RML    | unread in 9 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (2 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

Not tied to one effect:

- RML → scripts: summon PROCEDURE: more than its materials

<details><summary>RML: <code>summons</code></summary>

```json
[
  {
    "method": "PROCEDURE",
    "from": ["HAND"],
    "requires": [
      {
        "atLeast": 1,
        "of": {
          "freeZones": {
            "own": ["MZONE"]
          },
          "forExtraDeck": false
        }
      }
    ]
  },
  {
    "method": "TRIBUTE",
    "from": ["HAND"],
    "materials": [
      {
        "count": {
          "min": 1,
          "max": 1
        },
        "role": "ANY",
        "card": {}
      }
    ]
  }
]
```

</details>

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--special summon
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_SPSUMMON_PROC)
	e1:SetProperty(EFFECT_FLAG_UNCOPYABLE)
	e1:SetRange(LOCATION_HAND)
	e1:SetCountLimit(1,id+EFFECT_COUNT_CODE_OATH)
	e1:SetCondition(s.spcon)
	e1:SetValue(s.spval)
	c:RegisterEffect(e1)
	--place
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,0))
	e2:SetType(EFFECT_TYPE_IGNITION)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCountLimit(1,id)
	e2:SetTarget(s.ptg)
	e2:SetOperation(s.pop)
	c:RegisterEffect(e2)
	--switch locations
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,1))
	e3:SetCategory(CATEGORY_TOHAND)
	e3:SetType(EFFECT_TYPE_QUICK_O)
	e3:SetCode(EVENT_FREE_CHAIN)
	e3:SetRange(LOCATION_MZONE)
	e3:SetCountLimit(1,id+o)
	e3:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_MAIN_END+TIMING_END_PHASE)
	e3:SetCondition(s.chcon)
	e3:SetTarget(s.chtg)
	e3:SetOperation(s.chop)
	c:RegisterEffect(e3)
end
```

</details>

### Effect 1: CONTINUOUS (SPSUMMON_PROC)

Text: “You can Special Summon this card (from your hand) to your center…” + “You can only Special Summon "Elfnote Fortuna"…”

Lua: `s.spcon`, `s.spval`

| From → to                           | Result                             | Where it stops                                                                                                                                                                                             |
| ----------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**                       | not read, stopped at: “You can Special Summon this card (from your hand) to your center Main Monster Zone.”; not read, stopped at: “You can only Special Summon "Elfnote Fortuna" once per turn this way.” |
| YGOPro script → RML                 | **unread**                         | value: {WHO=RAW EXPR=0}                                                                                                                                                                                    |
| RML → YGOPro, EDOPro, Omega scripts | **not written**                    | unread                                                                                                                                                                                                     |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above                                                                                                                                                              |

<details><summary>Raw data for effect 1</summary>

**Card text** (input)

> You can Special Summon this card (from your hand) to your center Main Monster Zone.
>
> You can only Special Summon "Elfnote Fortuna" once per turn this way.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetCode(34)
e:SetProperty(262144)
e:SetRange(2)
e:SetCountLimit(1,354412044)
e:SetCondition(s.spcon)
e:SetValue(s.spval)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcon(e,c)
	if c==nil then return true end
	local tp=c:GetControler()
	return Duel.GetLocationCount(tp,LOCATION_MZONE,tp,LOCATION_REASON_TOFIELD,0x4)>0
end
function s.spval(e,c)
	return 0,0x4
end
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": true,
  "mandatory": false,
  "from": ["HAND"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": true
  },
  "targets": false,
  "flags": ["UNCOPYABLE"],
  "offered": {},
  "applies": [
    {
      "effect": "SPSUMMON_PROC",
      "to": "DUEL",
      "value": {},
      "requires": [
        {
          "exists": {
            "unread": "{WHO=RAW EXPR=0}"
          }
        }
      ]
    }
  ],
  "requires": [
    {
      "any": [
        {
          "not": {
            "exists": {
              "who": "THIS_CARD"
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": false
          }
        }
      ]
    }
  ],
  "unread": [
    {
      "role": "value",
      "text": "{WHO=RAW EXPR=0}"
    }
  ]
}
```

</details>

### Effect 2: IGNITION

Text: “During your Main Phase: You can place 1 "Elfnote" Continuous Trap…” + “You can only use each of the following effects…”

Lua: `s.ptg`, `s.pop`

| From → to                           | Result          | Where it stops                                                                                          |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “place 1 "Elfnote" Continuous Trap from your hand or Deck, face-up on your field” |
| YGOPro script → RML                 | read            |                                                                                                         |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | that {"ref":"CHOSEN1"} exists                                                                           |
| RML → card text                     | **not written** | the move PLACE                                                                                          |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> During your Main Phase: You can place 1 "Elfnote" Continuous Trap from your hand or Deck, face-up on your field.
>
> You can only use each of the following effects

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1375625408)
e:SetType(64)
e:SetRange(4)
e:SetCountLimit(1,85976588)
e:SetTarget(s.ptg)
e:SetOperation(s.pop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.ptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_SZONE)>0
		and Duel.IsExistingMatchingCard(s.pfilter,tp,LOCATION_HAND+LOCATION_DECK,0,1,nil,tp) end
end
function s.pfilter(c,tp)
	return c:IsType(TYPE_CONTINUOUS) and c:IsType(TYPE_TRAP) and c:IsSetCard(0x1d8)
		and not c:IsForbidden() and c:CheckUniqueOnField(tp)
end
function s.pop(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetLocationCount(tp,LOCATION_SZONE)<=0 then return end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOFIELD)
	local tc=Duel.SelectMatchingCard(tp,s.pfilter,tp,LOCATION_HAND+LOCATION_DECK,0,1,1,nil,tp):GetFirst()
	if tc then Duel.MoveToField(tc,tp,tp,LOCATION_SZONE,POS_FACEUP,true) end
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "IGNITION",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {},
  "description": 1375625408,
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["SZONE"]
            },
            "forExtraDeck": false
          }
        },
        {
          "exists": {
            "ref": "CHOSEN1"
          }
        }
      ],
      "moves": [
        {
          "move": "PLACE",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["HAND", "DECK"]
          },
          "card": {
            "types": ["CONTINUOUS"],
            "archetypes": [472],
            "states": ["ONLY_ONE_ALLOWS"],
            "allOf": [
              {
                "types": ["TRAP"]
              }
            ],
            "none": [
              {
                "states": ["FORBIDDEN"]
              }
            ]
          }
        }
      ]
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "freeZones": {
          "own": ["SZONE"]
        },
        "forExtraDeck": false
      }
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["HAND", "DECK"]
          },
          "card": {
            "types": ["CONTINUOUS"],
            "archetypes": [472],
            "states": ["ONLY_ONE_ALLOWS"],
            "allOf": [
              {
                "types": ["TRAP"]
              }
            ],
            "none": [
              {
                "states": ["FORBIDDEN"]
              }
            ]
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

### Effect 3: QUICK FREE_CHAIN

Text: “During your opponent's turn (Quick Effect)…” + “You can only use each of the following effects…”

Lua: `s.chcon`, `s.chtg`, `s.chop`

| From → to                           | Result          | Where it stops                                                                                                                           |
| ----------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone”     |
| YGOPro script → RML                 | **unread**      | operation: cs>4; operation: cs==2; operation: Duel.SwapSequence(c,tc); operation: cs>4; operation: cs==2; operation: c:GetSequence()==cs |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                                                                   |
| RML → card text                     | **not written** | unread                                                                                                                                   |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> During your opponent's turn (Quick Effect): You can switch the locations of this card in your Main Monster Zone and the monster in your center Main Monster Zone, then you can return 1 face-up Spell/Trap on the field to the hand.
>
> You can only use each of the following effects

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1375625409)
e:SetCategory(8)
e:SetType(256)
e:SetCode(1002)
e:SetRange(4)
e:SetCountLimit(1,85976589)
e:SetHintTiming(0,484)
e:SetCondition(s.chcon)
e:SetTarget(s.chtg)
e:SetOperation(s.chop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.chcon(e,tp,eg,ep,ev,re,r,rp)
	return e:GetHandler():GetSequence()<5 and Duel.GetTurnPlayer()==1-tp
end
function s.chtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.chfilter,tp,LOCATION_MZONE,0,1,e:GetHandler()) end
end
function s.chfilter(c)
	return c:GetSequence()==2
end
function s.chop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local cs=c:GetSequence()
	if not c:IsRelateToChain() or not c:IsControler(tp) or cs>4 or cs==2 then return end
	local g=Duel.GetMatchingGroup(s.chfilter,tp,LOCATION_MZONE,0,nil)
	if g:GetCount()==1 then
		local tc=g:GetFirst()
		Duel.SwapSequence(c,tc)
		if c:GetSequence()==cs then return end
		if Duel.IsExistingMatchingCard(s.rthfilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil)
			and Duel.SelectYesNo(tp,aux.Stringid(id,2)) then
			Duel.BreakEffect()
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_RTOHAND)
			local rg=Duel.SelectMatchingCard(tp,s.rthfilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,1,nil)
			Duel.HintSelection(rg)
			Duel.SendtoHand(rg,nil,REASON_EFFECT)
		end
	end
end
function s.rthfilter(c)
	return c:IsFaceup() and c:IsAbleToHand() and c:IsType(TYPE_SPELL+TYPE_TRAP)
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 1,
    "oath": false
  },
  "targets": false,
  "offered": {
    "opponent": ["MAIN_END", "END_PHASE", "SUMMON", "SPSUMMON", "FLIPSUMMON"]
  },
  "description": 1375625409,
  "categories": ["TOHAND"],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "not": {
            "any": [
              {
                "not": {
                  "stillOnChain": {
                    "who": "THIS_CARD"
                  }
                }
              },
              {
                "not": {
                  "is": {
                    "cards": {
                      "who": "THIS_CARD"
                    },
                    "filter": {
                      "controller": "OWN"
                    }
                  }
                }
              },
              {
                "unread": "cs>4"
              },
              {
                "unread": "cs==2"
              }
            ]
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "ALL1"
            }
          }
        },
        {
          "not": {
            "atLeast": 2,
            "of": {
              "cards": {
                "ref": "ALL1"
              }
            }
          }
        }
      ]
    },
    {
      "part": 2,
      "link": "ALSO_AFTER_THAT",
      "level": "EFFECT",
      "optional": true,
      "requires": [
        {
          "not": {
            "any": [
              {
                "not": {
                  "stillOnChain": {
                    "who": "THIS_CARD"
                  }
                }
              },
              {
                "not": {
                  "is": {
                    "cards": {
                      "who": "THIS_CARD"
                    },
                    "filter": {
                      "controller": "OWN"
                    }
                  }
                }
              },
              {
                "unread": "cs>4"
              },
              {
                "unread": "cs==2"
              }
            ]
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "ALL1"
            }
          }
        },
        {
          "not": {
            "atLeast": 2,
            "of": {
              "cards": {
                "ref": "ALL1"
              }
            }
          }
        },
        {
          "not": {
            "is": {
              "cards": {
                "who": "THIS_CARD"
              },
              "filter": {
                "unread": ["c:GetSequence()==cs"]
              }
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "own": ["ONFIELD"],
                "opponent": ["ONFIELD"]
              },
              "card": {
                "types": ["SPELL", "TRAP"],
                "able": ["HAND"],
                "states": ["FACEUP"]
              },
              "targetable": false
            }
          }
        }
      ],
      "moves": [
        {
          "move": "TO_HAND",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["ONFIELD"],
            "opponent": ["ONFIELD"]
          },
          "card": {
            "types": ["SPELL", "TRAP"],
            "able": ["HAND"],
            "states": ["FACEUP"]
          },
          "reasons": ["EFFECT"]
        }
      ]
    }
  ],
  "requires": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "numbers": {
            "SEQUENCE": {
              "max": 4
            }
          }
        }
      }
    },
    {
      "turn": "OPPONENT"
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "states": ["NOT_SELF"],
            "numbers": {
              "SEQUENCE": {
                "is": [2]
              }
            }
          },
          "targetable": false
        }
      }
    }
  ],
  "unread": [
    {
      "role": "operation",
      "text": "cs>4"
    },
    {
      "role": "operation",
      "text": "cs==2"
    },
    {
      "role": "operation",
      "text": "Duel.SwapSequence(c,tc)"
    },
    {
      "role": "operation",
      "text": "cs>4"
    },
    {
      "role": "operation",
      "text": "cs==2"
    },
    {
      "role": "operation",
      "text": "c:GetSequence()==cs"
    }
  ]
}
```

</details>

## Elfnote Seraphim Strelitzia (42302563)

> 1 Tuner + 1+ non-Tuners
> This card's original ATK becomes 3000, while in the center Main Monster Zone. During the Main Phase (Quick Effect): You can Special Summon 1 Level 6 or lower "Elfnote" monster from your hand or GY, then you can reduce the Levels of all Level 4 or higher monsters on the field by 3 until the end of this turn, also you cannot Special Summon from the Extra Deck for the rest of this turn, except Synchro Monsters. You can only use this effect of "Elfnote Seraphim Strelitzia" once per turn.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 2 sentence(s)                                         |
| YGOPro script → RML    | unread in 2 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (2 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>RML: <code>summons</code></summary>

```json
[
  {
    "method": "SYNCHRO",
    "from": ["EXTRA"],
    "materials": [
      {
        "count": {
          "min": 1,
          "max": 1
        },
        "role": "TUNER",
        "card": {}
      },
      {
        "count": {
          "min": 1,
          "max": 99
        },
        "role": "NON_TUNER",
        "card": {}
      }
    ]
  }
]
```

</details>

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--Synchro summon
	aux.AddSynchroProcedure(c,nil,aux.NonTuner(nil),1)
	c:EnableReviveLimit()
	--atkup
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_SINGLE)
	e1:SetProperty(EFFECT_FLAG_SINGLE_RANGE)
	e1:SetRange(LOCATION_MZONE)
	e1:SetCode(EFFECT_SET_BASE_ATTACK)
	e1:SetCondition(s.atkcon)
	e1:SetValue(3000)
	c:RegisterEffect(e1)
	--special summon
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,0))
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e2:SetType(EFFECT_TYPE_QUICK_O)
	e2:SetCode(EVENT_FREE_CHAIN)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCountLimit(1,id)
	e2:SetHintTiming(0,TIMING_MAIN_END)
	e2:SetCondition(s.spcon)
	e2:SetTarget(s.sptg)
	e2:SetOperation(s.spop)
	c:RegisterEffect(e2)
end
```

</details>

### Effect 1: CONTINUOUS, from an aux procedure

Text: “1 Tuner + 1+ non-Tuners…”

Lua: `aux.SynCondition(nil,aux.NonTuner(nil),1,6)`, `aux.SynTarget(nil,aux.NonTuner(nil),1,6)`, `aux.SynOperation(nil,aux.NonTuner(nil),1,6)`

| From → to                           | Result                             | Where it stops                                |
| ----------------------------------- | ---------------------------------- | --------------------------------------------- |
| Card text → RML                     | read                               |                                               |
| YGOPro script → RML                 | read                               |                                               |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it    | the card's other parts stop it                |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above |

<details><summary>Raw data for effect 1</summary>

**Card text** (input)

> 1 Tuner + 1+ non-Tuners

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1164)
e:SetType(2)
e:SetCode(34)
e:SetProperty(263168)
e:SetRange(64)
e:SetCondition(aux.SynCondition(nil,aux.NonTuner(nil),1,6))
e:SetTarget(aux.SynTarget(nil,aux.NonTuner(nil),1,6))
e:SetOperation(aux.SynOperation(nil,aux.NonTuner(nil),1,6))
e:SetValue(1174405120)
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "CONTINUOUS",
  "fromProcedure": true,
  "inSummons": false,
  "mandatory": false,
  "from": ["EXTRA"],
  "targets": false,
  "flags": ["CANNOT_DISABLE", "UNCOPYABLE"],
  "offered": {},
  "description": 1164
}
```

</details>

### Effect 2: CONTINUOUS (SET_BASE_ATTACK)

Text: “This card's original ATK becomes 3000…”

Lua: `s.atkcon`

| From → to                           | Result                          | Where it stops                                                                                        |
| ----------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**                    | not read, stopped at: “This card's original ATK becomes 3000, while in the center Main Monster Zone.” |
| YGOPro script → RML                 | read                            |                                                                                                       |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it | the card's other parts stop it                                                                        |
| RML → card text                     | **not written**                 | applies                                                                                               |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> This card's original ATK becomes 3000, while in the center Main Monster Zone.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(1)
e:SetProperty(131072)
e:SetRange(4)
e:SetCode(103)
e:SetCondition(s.atkcon)
e:SetValue(3000)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.atkcon(e)
	return e:GetHandler():GetSequence()==2
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "from": ["MZONE"],
  "targets": false,
  "flags": ["SINGLE_RANGE"],
  "offered": {},
  "applies": [
    {
      "effect": "SET_BASE_ATTACK",
      "to": "THIS_CARD",
      "value": 3000
    }
  ],
  "requires": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "numbers": {
            "SEQUENCE": {
              "is": [2]
            }
          }
        }
      }
    }
  ]
}
```

</details>

### Effect 3: QUICK FREE_CHAIN

Text: “During the Main Phase (Quick Effect): You can Special Summon 1 Level 6…” + “You can only use this effect of "Elfnote Seraphim…”

Lua: `s.spcon`, `s.sptg`, `s.spop`

| From → to                           | Result          | Where it stops                                                                                                           |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Card text → RML                     | **not read**    | not read, stopped at: “reduce the Levels of all Level 4 or higher monsters on the field by 3 until the end of this turn” |
| YGOPro script → RML                 | **unread**      | condition: Duel.IsMainPhase()                                                                                            |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                                                   |
| RML → card text                     | **not written** | unread                                                                                                                   |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> During the Main Phase (Quick Effect): You can Special Summon 1 Level 6 or lower "Elfnote" monster from your hand or GY, then you can reduce the Levels of all Level 4 or higher monsters on the field by 3 until the end of this turn, also you cannot Special Summon from the Extra Deck for the rest of this turn, except Synchro Monsters.
>
> You can only use this effect of "Elfnote Seraphim

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(676841008)
e:SetCategory(512)
e:SetType(256)
e:SetCode(1002)
e:SetRange(4)
e:SetCountLimit(1,42302563)
e:SetHintTiming(0,4)
e:SetCondition(s.spcon)
e:SetTarget(s.sptg)
e:SetOperation(s.spop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcon(e,tp,eg,ep,ev,re,r,rp)
	return Duel.IsMainPhase()
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and Duel.IsExistingMatchingCard(s.spfilter,tp,LOCATION_HAND+LOCATION_GRAVE,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_HAND+LOCATION_GRAVE)
end
function s.spfilter(c,e,tp)
	return c:IsSetCard(0x1d8) and c:IsLevelBelow(6) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetLocationCount(tp,LOCATION_MZONE)>0 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(s.spfilter),tp,LOCATION_HAND+LOCATION_GRAVE,0,1,1,nil,e,tp)
		local tc=g:GetFirst()
		if tc and Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)~=0 then
			Duel.AdjustAll()
			if Duel.IsExistingMatchingCard(s.lvfilter,tp,LOCATION_MZONE,LOCATION_MZONE,1,nil)
				and Duel.SelectYesNo(tp,aux.Stringid(id,1)) then
				Duel.BreakEffect()
				local lg=Duel.GetMatchingGroup(s.lvfilter,tp,LOCATION_MZONE,LOCATION_MZONE,nil)
				for lc in aux.Next(lg) do
					local e1=Effect.CreateEffect(e:GetHandler())
					e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
					e1:SetType(EFFECT_TYPE_SINGLE)
					e1:SetCode(EFFECT_UPDATE_LEVEL)
					e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
					e1:SetValue(-3)
					lc:RegisterEffect(e1)
				end
			end
		end
	end
	local e2=Effect.CreateEffect(e:GetHandler())
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)
	e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e2:SetTargetRange(1,0)
	e2:SetTarget(s.splimit)
	e2:SetReset(RESET_PHASE+PHASE_END)
	Duel.RegisterEffect(e2,tp)
end
function s.lvfilter(c)
	return c:IsFaceup() and c:IsLevelAbove(4)
end
function s.splimit(e,c)
	return not c:IsType(TYPE_SYNCHRO) and c:IsLocation(LOCATION_EXTRA)
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {
    "opponent": ["MAIN_END"]
  },
  "description": 676841008,
  "categories": ["SPECIAL_SUMMON"],
  "declares": [
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["HAND", "GRAVE"],
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": false
          }
        },
        {
          "exists": {
            "ref": "CHOSEN1"
          }
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["HAND", "GRAVE"]
          },
          "card": {
            "archetypes": [472],
            "able": ["SPECIAL_SUMMON"],
            "states": ["NOT_NECRO_VALLEY"],
            "numbers": {
              "LEVEL": {
                "max": 6
              }
            }
          },
          "position": ["FACEUP"]
        }
      ]
    },
    {
      "part": 2,
      "link": "AND_IF_YOU_DO",
      "level": "SUBSEQUENT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": false
          }
        },
        {
          "exists": {
            "ref": "CHOSEN1"
          }
        },
        {
          "atLeast": 1,
          "of": {
            "moved": "SPECIAL_SUMMON"
          }
        }
      ],
      "moves": [
        {
          "move": "ADJUST_ALL"
        }
      ]
    },
    {
      "part": 3,
      "link": "THEN",
      "level": "SUBSEQUENT",
      "optional": true,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": false
          }
        },
        {
          "exists": {
            "ref": "CHOSEN1"
          }
        },
        {
          "atLeast": 1,
          "of": {
            "moved": "SPECIAL_SUMMON"
          }
        },
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "own": ["MZONE"],
                "opponent": ["MZONE"]
              },
              "card": {
                "states": ["FACEUP"],
                "numbers": {
                  "LEVEL": {
                    "min": 4
                  }
                }
              },
              "targetable": false
            }
          }
        }
      ],
      "moves": [
        {
          "move": "GIVE_EFFECT",
          "cards": {
            "ref": "ALL2"
          },
          "pick": "ALL",
          "count": "ALL",
          "from": {
            "own": ["MZONE"],
            "opponent": ["MZONE"]
          },
          "card": {
            "states": ["FACEUP"],
            "numbers": {
              "LEVEL": {
                "min": 4
              }
            }
          },
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "flags": ["CANNOT_DISABLE"],
            "offered": {},
            "applies": [
              {
                "effect": "UPDATE_LEVEL",
                "to": "THIS_CARD",
                "value": -3
              }
            ]
          },
          "until": ["LEAVES_FIELD_OR_FLIPS", "END_PHASE"]
        }
      ]
    },
    {
      "part": 4,
      "link": "AND",
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "PLAYER_EFFECT",
          "player": "OWN",
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "flags": ["PLAYER_TARGET"],
            "offered": {},
            "applies": [
              {
                "effect": "CANNOT_SPECIAL_SUMMON",
                "to": {
                  "players": "OWN"
                },
                "cards": {
                  "places": ["EXTRA"],
                  "none": [
                    {
                      "types": ["SYNCHRO"]
                    }
                  ]
                }
              }
            ]
          },
          "until": ["END_PHASE"]
        }
      ]
    }
  ],
  "requires": [
    {
      "unread": "Duel.IsMainPhase()"
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "freeZones": {
          "own": ["MZONE"]
        },
        "forExtraDeck": false
      }
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["HAND", "GRAVE"]
          },
          "card": {
            "archetypes": [472],
            "able": ["SPECIAL_SUMMON"],
            "numbers": {
              "LEVEL": {
                "max": 6
              }
            }
          },
          "targetable": false
        }
      }
    }
  ],
  "unread": [
    {
      "role": "condition",
      "text": "Duel.IsMainPhase()"
    }
  ]
}
```

</details>

## Elfnote Regina (56651978)

> If this card is in your hand (Quick Effect): You can send 1 other "Elfnote" card from your hand or face-up field to the GY; Special Summon this card. If this card is Normal or Special Summoned to the center Main Monster Zone: You can Special Summon 1 "Elfnote" monster from your Deck, except "Elfnote Regina". If this card is sent to the GY as Synchro Material: You can add this card to your hand. You can only use each effect of "Elfnote Regina" once per turn.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 3 sentence(s)                                         |
| YGOPro script → RML    | unread in 2 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (3 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>RML: <code>summons</code></summary>

```json
[
  {
    "method": "TRIBUTE",
    "from": ["HAND"],
    "materials": [
      {
        "count": {
          "min": 1,
          "max": 1
        },
        "role": "ANY",
        "card": {}
      }
    ]
  }
]
```

</details>

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--special summon
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_QUICK_O)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetRange(LOCATION_HAND)
	e1:SetCountLimit(1,id)
	e1:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_MAIN_END+TIMING_END_PHASE)
	e1:SetCost(s.spcost)
	e1:SetTarget(s.sptg)
	e1:SetOperation(s.spop)
	c:RegisterEffect(e1)
	--special summon from deck
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e2:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e2:SetCode(EVENT_SUMMON_SUCCESS)
	e2:SetProperty(EFFECT_FLAG_DELAY)
	e2:SetCountLimit(1,id+o)
	e2:SetCondition(s.spcon2)
	e2:SetTarget(s.sptg2)
	e2:SetOperation(s.spop2)
	c:RegisterEffect(e2)
	local e3=e2:Clone()
	e3:SetCode(EVENT_SPSUMMON_SUCCESS)
	c:RegisterEffect(e3)
	--to hand
	local e4=Effect.CreateEffect(c)
	e4:SetDescription(aux.Stringid(id,2))
	e4:SetCategory(CATEGORY_TOHAND)
	e4:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_O)
	e4:SetProperty(EFFECT_FLAG_DELAY)
	e4:SetCode(EVENT_BE_MATERIAL)
	e4:SetCountLimit(1,id+o*2)
	e4:SetCondition(s.thcon)
	e4:SetTarget(s.thtg)
	e4:SetOperation(s.thop)
	c:RegisterEffect(e4)
end
```

</details>

### Effect 1: QUICK FREE_CHAIN

Text: “If this card is in your hand (Quick Effect)…” + “You can only use each effect of "Elfnote Regina"…”

Lua: `s.spcost`, `s.sptg`, `s.spop`

| From → to                           | Result                          | Where it stops                                                                           |
| ----------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**                    | not read, stopped at: “TO_GRAVE: 1 other "Elfnote" card from your hand or face-up field” |
| YGOPro script → RML                 | read                            |                                                                                          |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it | the card's other parts stop it                                                           |
| RML → card text                     | **not written**                 | a card that is FACEUP_OR_HIDDEN_ZONE                                                     |

<details><summary>Raw data for effect 1</summary>

**Card text** (input)

> If this card is in your hand (Quick Effect): You can send 1 other "Elfnote" card from your hand or face-up field to the GY; Special Summon this card.
>
> You can only use each effect of "Elfnote Regina"

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(906431648)
e:SetCategory(512)
e:SetType(256)
e:SetCode(1002)
e:SetRange(2)
e:SetCountLimit(1,56651978)
e:SetHintTiming(0,484)
e:SetCost(s.spcost)
e:SetTarget(s.sptg)
e:SetOperation(s.spop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.costfilter,tp,LOCATION_ONFIELD+LOCATION_HAND,0,1,e:GetHandler(),tp) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
	local g=Duel.SelectMatchingCard(tp,s.costfilter,tp,LOCATION_ONFIELD+LOCATION_HAND,0,1,1,e:GetHandler(),tp)
	Duel.SendtoGrave(g,REASON_COST)
end
function s.costfilter(c,tp)
	return c:IsSetCard(0x1d8) and c:IsFaceupEx()
		and c:IsAbleToGraveAsCost() and Duel.GetMZoneCount(tp,c)>0
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return e:GetHandler():IsCanBeSpecialSummoned(e,0,tp,false,false) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if c:IsRelateToChain() then
		Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP)
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["HAND"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {
    "opponent": ["MAIN_END", "END_PHASE", "SUMMON", "SPSUMMON", "FLIPSUMMON"]
  },
  "description": 906431648,
  "categories": ["SPECIAL_SUMMON"],
  "declares": [
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "who": "THIS_CARD"
      },
      "possible": false
    }
  ],
  "cost": [
    {
      "move": "TO_GRAVE",
      "cards": {
        "ref": "CHOSEN1"
      },
      "pick": "CHOSEN",
      "count": {
        "min": 1,
        "max": 1
      },
      "from": {
        "own": ["ONFIELD", "HAND"]
      },
      "card": {
        "archetypes": [472],
        "able": ["GRAVE_AS_COST"],
        "states": ["FACEUP_OR_HIDDEN_ZONE", "LEAVES_FREE_MZONE", "NOT_SELF"]
      },
      "reasons": ["COST"]
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "stillOnChain": {
            "who": "THIS_CARD"
          }
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "who": "THIS_CARD"
          },
          "pick": "THIS_CARD",
          "position": ["FACEUP"]
        }
      ]
    }
  ],
  "legal": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "able": ["SPECIAL_SUMMON"]
        }
      }
    }
  ],
  "costChecks": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["ONFIELD", "HAND"]
          },
          "card": {
            "archetypes": [472],
            "able": ["GRAVE_AS_COST"],
            "states": ["FACEUP_OR_HIDDEN_ZONE", "LEAVES_FREE_MZONE", "NOT_SELF"]
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

### Effect 2: TRIGGER SUMMON_SUCCESS

Text: “If this card is Normal or Special Summoned to the center…” + “You can only use each effect of "Elfnote Regina"…”

Lua: `s.spcon2`, `s.sptg2`, `s.spop2`

| From → to                           | Result                          | Where it stops                                                                                     |
| ----------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**                    | not read, stopped at: “If this card is Normal or Special Summoned to the center Main Monster Zone” |
| YGOPro script → RML                 | read                            |                                                                                                    |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it | the card's other parts stop it                                                                     |
| RML → card text                     | **not written**                 | a check of this card {"numbers":{"SEQUENCE":{"is":[2]}}}                                           |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> If this card is Normal or Special Summoned to the center Main Monster Zone: You can Special Summon 1 "Elfnote" monster from your Deck, except "Elfnote Regina".
>
> You can only use each effect of "Elfnote Regina"

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(906431649)
e:SetCategory(512)
e:SetType(129)
e:SetCode(1100)
e:SetProperty(65536)
e:SetCountLimit(1,56651979)
e:SetCondition(s.spcon2)
e:SetTarget(s.sptg2)
e:SetOperation(s.spop2)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcon2(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	return c:GetSequence()==2
end
function s.sptg2(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and Duel.IsExistingMatchingCard(s.spfilter2,tp,LOCATION_DECK,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK)
end
function s.spfilter2(c,e,tp)
	return not c:IsCode(id) and c:IsSetCard(0x1d8) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.spop2(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g=Duel.SelectMatchingCard(tp,s.spfilter2,tp,LOCATION_DECK,0,1,1,nil,e,tp)
	if g:GetCount()>0 then
		Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "TRIGGER",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "event": "SUMMON_SUCCESS",
  "eventOf": "SELF",
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 1,
    "oath": false
  },
  "targets": false,
  "flags": ["DELAY"],
  "offered": {},
  "description": 906431649,
  "categories": ["SPECIAL_SUMMON"],
  "declares": [
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["DECK"],
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": false
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "CHOSEN1"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "archetypes": [472],
            "able": ["SPECIAL_SUMMON"],
            "none": [
              {
                "names": [56651978]
              }
            ]
          },
          "position": ["FACEUP"]
        }
      ]
    }
  ],
  "requires": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "numbers": {
            "SEQUENCE": {
              "is": [2]
            }
          }
        }
      }
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "freeZones": {
          "own": ["MZONE"]
        },
        "forExtraDeck": false
      }
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "archetypes": [472],
            "able": ["SPECIAL_SUMMON"],
            "none": [
              {
                "names": [56651978]
              }
            ]
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

### Effect 3: TRIGGER SPSUMMON_SUCCESS

Text: “If this card is Normal or Special Summoned to the center…” + “You can only use each effect of "Elfnote Regina"…”

Lua: `s.spcon2`, `s.sptg2`, `s.spop2`

| From → to                           | Result                             | Where it stops                                                                                     |
| ----------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**                       | not read, stopped at: “If this card is Normal or Special Summoned to the center Main Monster Zone” |
| YGOPro script → RML                 | read                               |                                                                                                    |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it    | the card's other parts stop it                                                                     |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above                                                      |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> If this card is Normal or Special Summoned to the center Main Monster Zone: You can Special Summon 1 "Elfnote" monster from your Deck, except "Elfnote Regina".
>
> You can only use each effect of "Elfnote Regina"

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(906431649)
e:SetCategory(512)
e:SetType(129)
e:SetCode(1100)
e:SetProperty(65536)
e:SetCountLimit(1,56651979)
e:SetCondition(s.spcon2)
e:SetTarget(s.sptg2)
e:SetOperation(s.spop2)
e:SetCode(1102)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcon2(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	return c:GetSequence()==2
end
function s.sptg2(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and Duel.IsExistingMatchingCard(s.spfilter2,tp,LOCATION_DECK,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK)
end
function s.spfilter2(c,e,tp)
	return not c:IsCode(id) and c:IsSetCard(0x1d8) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.spop2(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0 then return end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g=Duel.SelectMatchingCard(tp,s.spfilter2,tp,LOCATION_DECK,0,1,1,nil,e,tp)
	if g:GetCount()>0 then
		Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "TRIGGER",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "event": "SPSUMMON_SUCCESS",
  "eventOf": "SELF",
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 1,
    "oath": false
  },
  "targets": false,
  "flags": ["DELAY"],
  "offered": {},
  "description": 906431649,
  "categories": ["SPECIAL_SUMMON"],
  "declares": [
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["DECK"],
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": false
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "CHOSEN1"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "archetypes": [472],
            "able": ["SPECIAL_SUMMON"],
            "none": [
              {
                "names": [56651978]
              }
            ]
          },
          "position": ["FACEUP"]
        }
      ]
    }
  ],
  "requires": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "numbers": {
            "SEQUENCE": {
              "is": [2]
            }
          }
        }
      }
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "freeZones": {
          "own": ["MZONE"]
        },
        "forExtraDeck": false
      }
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "archetypes": [472],
            "able": ["SPECIAL_SUMMON"],
            "none": [
              {
                "names": [56651978]
              }
            ]
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

### Effect 4: TRIGGER BE_MATERIAL

Text: “If this card is sent to the GY as Synchro Material: You can add this card…” + “You can only use each effect of "Elfnote Regina"…”

Lua: `s.thcon`, `s.thtg`, `s.thop`

| From → to                           | Result          | Where it stops                                                             |
| ----------------------------------- | --------------- | -------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “If this card is sent to the GY as Synchro Material” |
| YGOPro script → RML                 | **unread**      | condition: r==REASON_SYNCHRO                                               |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                     |
| RML → card text                     | **not written** | unread                                                                     |

<details><summary>Raw data for effect 4</summary>

**Card text** (input)

> If this card is sent to the GY as Synchro Material: You can add this card to your hand.
>
> You can only use each effect of "Elfnote Regina"

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(906431650)
e:SetCategory(8)
e:SetType(129)
e:SetProperty(65536)
e:SetCode(1108)
e:SetCountLimit(1,56651980)
e:SetCondition(s.thcon)
e:SetTarget(s.thtg)
e:SetOperation(s.thop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.thcon(e,tp,eg,ep,ev,re,r,rp)
	return e:GetHandler():IsLocation(LOCATION_GRAVE) and r==REASON_SYNCHRO
end
function s.thtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return e:GetHandler():IsAbleToHand() end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,e:GetHandler(),1,0,0)
end
function s.thop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if c:IsRelateToChain() and aux.NecroValleyFilter()(c) then
		Duel.SendtoHand(c,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,c)
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 4,
  "kind": "TRIGGER",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "event": "BE_MATERIAL",
  "eventOf": "SELF",
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 2,
    "oath": false
  },
  "targets": false,
  "flags": ["DELAY"],
  "offered": {},
  "description": 906431650,
  "categories": ["TOHAND"],
  "declares": [
    {
      "category": "TOHAND",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "who": "THIS_CARD"
      },
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "stillOnChain": {
            "who": "THIS_CARD"
          }
        },
        {
          "necroValley": "DOESNT_APPLY"
        }
      ],
      "moves": [
        {
          "move": "TO_HAND",
          "cards": {
            "who": "THIS_CARD"
          },
          "pick": "THIS_CARD",
          "reasons": ["EFFECT"]
        },
        {
          "move": "REVEAL",
          "cards": {
            "who": "THIS_CARD"
          },
          "pick": "THIS_CARD",
          "player": "OPPONENT"
        }
      ]
    }
  ],
  "requires": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "places": ["GRAVE"]
        }
      }
    },
    {
      "unread": "r==REASON_SYNCHRO"
    }
  ],
  "legal": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "able": ["HAND"]
        }
      }
    }
  ],
  "unread": [
    {
      "role": "condition",
      "text": "r==REASON_SYNCHRO"
    }
  ]
}
```

</details>

## Elfnotes: Rhapsodia of Madness (24092792)

> While you control a monster in your center Main Monster Zone, your opponent's monsters cannot attack, except to attack that monster. You can send 1 monster from your hand or field to the GY, then target 1 "Elfnote" monster in your GY with a different original Attribute; Special Summon it, then if you control a Synchro Monster, you can negate the effects of 1 face-up card your opponent controls until the end of this turn. You can only use this effect of "Elfnotes: Rhapsodia of Madness" once per turn.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 2 sentence(s)                                         |
| YGOPro script → RML    | read completely                                                 |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (3 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e1)
	--cannot attack
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetCode(EFFECT_CANNOT_SELECT_BATTLE_TARGET)
	e2:SetRange(LOCATION_SZONE)
	e2:SetTargetRange(0,LOCATION_MZONE)
	e2:SetCondition(s.atkcon)
	e2:SetValue(s.atklimit)
	c:RegisterEffect(e2)
	local e3=e2:Clone()
	e3:SetCode(EFFECT_CANNOT_DIRECT_ATTACK)
	e3:SetValue(1)
	c:RegisterEffect(e3)
	--spsummon
	local e4=Effect.CreateEffect(c)
	e4:SetDescription(aux.Stringid(id,0))
	e4:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_DISABLE)
	e4:SetType(EFFECT_TYPE_QUICK_O)
	e4:SetCode(EVENT_FREE_CHAIN)
	e4:SetRange(LOCATION_SZONE)
	e4:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e4:SetHintTiming(TIMING_END_PHASE)
	e4:SetCountLimit(1,id)
	e4:SetCost(s.spcost)
	e4:SetTarget(s.sptg)
	e4:SetOperation(s.spop)
	c:RegisterEffect(e4)
end
```

</details>

### Effect 1: ACTIVATE FREE_CHAIN

Text: (activating the Continuous Spell; no sentence)

Lua: set up in `s.initial_effect` only

| From → to                           | Result                             | Where it stops                                               |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Card text → RML                     | —                                  | nothing in the text says this; it comes from the card's type |
| YGOPro script → RML                 | read                               |                                                              |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it    | the card's other parts stop it                               |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above                |

<details><summary>Raw data for effect 1</summary>

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(16)
e:SetCode(1002)
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "ACTIVATE",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "targets": false,
  "offered": {}
}
```

</details>

### Effect 2: CONTINUOUS (CANNOT_SELECT_BATTLE_TARGET)

Text: “While you control a monster in your center Main Monster Zone…”

Lua: `s.atkcon`, `s.atklimit`

| From → to                           | Result                          | Where it stops                                                                                                                                               |
| ----------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Card text → RML                     | **not read**                    | not read, stopped at: “While you control a monster in your center Main Monster Zone, your opponent's monsters cannot attack, except to attack that monster.” |
| YGOPro script → RML                 | read                            |                                                                                                                                                              |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it | the card's other parts stop it                                                                                                                               |
| RML → card text                     | **not written**                 | applies                                                                                                                                                      |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> While you control a monster in your center Main Monster Zone, your opponent's monsters cannot attack, except to attack that monster.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetCode(332)
e:SetRange(8)
e:SetTargetRange(0,4)
e:SetCondition(s.atkcon)
e:SetValue(s.atklimit)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.atkcon(e)
	return Duel.IsExistingMatchingCard(s.atkfilter,e:GetHandlerPlayer(),LOCATION_MZONE,0,1,nil)
end
function s.atkfilter(c)
	return c:GetSequence()==2
end
function s.atklimit(e,c)
	return c:GetSequence()~=2
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "from": ["SZONE"],
  "targets": false,
  "offered": {},
  "applies": [
    {
      "effect": "CANNOT_SELECT_BATTLE_TARGET",
      "to": {
        "places": {
          "opponent": ["MZONE"]
        }
      },
      "value": {
        "none": [
          {
            "numbers": {
              "SEQUENCE": {
                "is": [2]
              }
            }
          }
        ]
      }
    }
  ],
  "requires": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "numbers": {
              "SEQUENCE": {
                "is": [2]
              }
            }
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

### Effect 3: CONTINUOUS (CANNOT_DIRECT_ATTACK)

Text: “While you control a monster in your center Main Monster Zone…”

Lua: `s.atkcon`, `s.atklimit`

| From → to                           | Result                          | Where it stops                                                                                                                                               |
| ----------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Card text → RML                     | **not read**                    | not read, stopped at: “While you control a monster in your center Main Monster Zone, your opponent's monsters cannot attack, except to attack that monster.” |
| YGOPro script → RML                 | read                            |                                                                                                                                                              |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it | the card's other parts stop it                                                                                                                               |
| RML → card text                     | **not written**                 | applies                                                                                                                                                      |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> While you control a monster in your center Main Monster Zone, your opponent's monsters cannot attack, except to attack that monster.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetCode(332)
e:SetRange(8)
e:SetTargetRange(0,4)
e:SetCondition(s.atkcon)
e:SetValue(s.atklimit)
e:SetCode(73)
e:SetValue(1)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.atkcon(e)
	return Duel.IsExistingMatchingCard(s.atkfilter,e:GetHandlerPlayer(),LOCATION_MZONE,0,1,nil)
end
function s.atkfilter(c)
	return c:GetSequence()==2
end
function s.atklimit(e,c)
	return c:GetSequence()~=2
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "from": ["SZONE"],
  "targets": false,
  "offered": {},
  "applies": [
    {
      "effect": "CANNOT_DIRECT_ATTACK",
      "to": {
        "places": {
          "opponent": ["MZONE"]
        }
      },
      "value": 1
    }
  ],
  "requires": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "numbers": {
              "SEQUENCE": {
                "is": [2]
              }
            }
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

### Effect 4: QUICK FREE_CHAIN

Text: “You can send 1 monster from your hand or field to the GY, then target…” + “You can only use this effect of "Elfnotes: Rhapsodia…”

Lua: `s.spcost`, `s.sptg`, `s.spop`

| From → to                           | Result          | Where it stops                                                      |
| ----------------------------------- | --------------- | ------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “TO_GRAVE: 1 monster from your hand or field” |
| YGOPro script → RML                 | read            |                                                                     |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | relations                                                           |
| RML → card text                     | **not written** | a card that is needs                                                |

<details><summary>Raw data for effect 4</summary>

**Card text** (input)

> You can send 1 monster from your hand or field to the GY, then target 1 "Elfnote" monster in your GY with a different original Attribute; Special Summon it, then if you control a Synchro Monster, you can negate the effects of 1 face-up card your opponent controls until the end of this turn.
>
> You can only use this effect of "Elfnotes: Rhapsodia

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(385484672)
e:SetCategory(16896)
e:SetType(256)
e:SetCode(1002)
e:SetRange(8)
e:SetProperty(16)
e:SetHintTiming(32)
e:SetCountLimit(1,24092792)
e:SetCost(s.spcost)
e:SetTarget(s.sptg)
e:SetOperation(s.spop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.costfilter,tp,LOCATION_HAND+LOCATION_MZONE,0,1,nil,e,tp) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
	local g=Duel.SelectMatchingCard(tp,s.costfilter,tp,LOCATION_HAND+LOCATION_MZONE,0,1,1,nil,e,tp)
	local tc=g:GetFirst()
	e:SetLabel(tc:GetOriginalAttribute())
	Duel.SendtoGrave(tc,REASON_COST)
end
function s.costfilter(c,e,tp)
	return c:IsType(TYPE_MONSTER) and c:IsAbleToGraveAsCost() and Duel.GetMZoneCount(tp,c)>0
		and Duel.IsExistingTarget(s.spfilter,tp,LOCATION_GRAVE,0,1,nil,e,tp,c:GetOriginalAttribute())
end
function s.spfilter(c,e,tp,attr)
	return c:IsSetCard(0x1d8) and c:GetOriginalAttribute()&attr==0 and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	local attr=e:GetLabel()
	if chkc then return chkc:IsLocation(LOCATION_GRAVE) and chkc:IsControler(tp) and s.spfilter(chkc,e,tp,attr) end
	if chk==0 then return e:IsCostChecked() end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
	local g=Duel.SelectTarget(tp,s.spfilter,tp,LOCATION_GRAVE,0,1,1,nil,e,tp,attr)
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,g,1,0,0)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local tc=Duel.GetFirstTarget()
	if tc:IsRelateToChain() and aux.NecroValleyFilter()(tc)
		and Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)~=0
		and Duel.IsExistingMatchingCard(aux.AND(Card.IsFaceup,Card.IsAllTypes),tp,LOCATION_MZONE,0,1,nil,TYPE_SYNCHRO+TYPE_MONSTER)
		and Duel.IsExistingMatchingCard(aux.NegateAnyFilter,tp,0,LOCATION_ONFIELD,1,nil)
		and Duel.SelectYesNo(tp,aux.Stringid(id,1)) then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DISABLE)
		local g=Duel.SelectMatchingCard(tp,aux.NegateAnyFilter,tp,0,LOCATION_ONFIELD,1,1,nil)
		local dc=g:GetFirst()
		if dc then
			Duel.HintSelection(g)
			Duel.BreakEffect()
			Duel.NegateRelatedChain(dc,RESET_TURN_SET)
			local e1=Effect.CreateEffect(c)
			e1:SetType(EFFECT_TYPE_SINGLE)
			e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
			e1:SetCode(EFFECT_DISABLE)
			e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
			dc:RegisterEffect(e1)
			local e2=Effect.CreateEffect(c)
			e2:SetType(EFFECT_TYPE_SINGLE)
			e2:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
			e2:SetCode(EFFECT_DISABLE_EFFECT)
			e2:SetValue(RESET_TURN_SET)
			e2:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
			dc:RegisterEffect(e2)
			if dc:IsType(TYPE_TRAPMONSTER) then
				local e3=Effect.CreateEffect(c)
				e3:SetType(EFFECT_TYPE_SINGLE)
				e3:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
				e3:SetCode(EFFECT_DISABLE_TRAPMONSTER)
				e3:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
				dc:RegisterEffect(e3)
			end
		end
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 4,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["SZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": true,
  "flags": ["CARD_TARGET"],
  "offered": {
    "own": ["END_PHASE"],
    "opponent": ["END_PHASE"]
  },
  "description": 385484672,
  "categories": ["SPECIAL_SUMMON", "DISABLE"],
  "declares": [
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "ref": "TARGET"
      },
      "possible": false
    }
  ],
  "cost": [
    {
      "move": "TO_GRAVE",
      "cards": {
        "ref": "CHOSEN1"
      },
      "pick": "CHOSEN",
      "count": {
        "min": 1,
        "max": 1
      },
      "from": {
        "own": ["HAND", "MZONE"]
      },
      "card": {
        "types": ["MONSTER"],
        "able": ["GRAVE_AS_COST"],
        "states": ["LEAVES_FREE_MZONE"],
        "needs": [
          {
            "count": 1,
            "from": {
              "own": ["GRAVE"]
            },
            "card": {
              "archetypes": [472],
              "able": ["SPECIAL_SUMMON"],
              "relations": [
                {
                  "property": "ORIGINAL_ATTRIBUTE",
                  "differsFrom": {
                    "who": "CHECKED_CARD"
                  }
                }
              ]
            },
            "targetable": true
          }
        ]
      },
      "reasons": ["COST"]
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "stillOnChain": {
            "ref": "TARGET"
          }
        },
        {
          "necroValley": "DOESNT_APPLY"
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "ref": "TARGET"
          },
          "pick": "TARGETED",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["GRAVE"]
          },
          "card": {
            "archetypes": [472],
            "able": ["SPECIAL_SUMMON"],
            "relations": [
              {
                "property": "ORIGINAL_ATTRIBUTE",
                "differsFrom": {
                  "ref": "CHOSEN1"
                }
              }
            ]
          },
          "position": ["FACEUP"]
        }
      ]
    },
    {
      "part": 2,
      "link": "THEN",
      "level": "SUBSEQUENT",
      "optional": true,
      "requires": [
        {
          "stillOnChain": {
            "ref": "TARGET"
          }
        },
        {
          "necroValley": "DOESNT_APPLY"
        },
        {
          "atLeast": 1,
          "of": {
            "moved": "SPECIAL_SUMMON"
          }
        },
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "own": ["MZONE"]
              },
              "card": {
                "allTypes": ["SYNCHRO", "MONSTER"],
                "states": ["FACEUP"]
              },
              "targetable": false
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "opponent": ["ONFIELD"]
              },
              "card": {
                "able": ["NEGATE"],
                "states": ["FACEUP"]
              },
              "targetable": false
            }
          }
        },
        {
          "exists": {
            "ref": "CHOSEN2"
          }
        }
      ],
      "moves": [
        {
          "move": "NEGATE_ON_CHAIN",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "opponent": ["ONFIELD"]
          },
          "card": {
            "able": ["NEGATE"],
            "states": ["FACEUP"]
          }
        },
        {
          "move": "GIVE_EFFECT",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "opponent": ["ONFIELD"]
          },
          "card": {
            "able": ["NEGATE"],
            "states": ["FACEUP"]
          },
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "flags": ["CANNOT_DISABLE"],
            "offered": {},
            "applies": [
              {
                "effect": "DISABLE",
                "to": "THIS_CARD"
              }
            ]
          },
          "until": ["LEAVES_FIELD_OR_FLIPS", "END_PHASE"]
        },
        {
          "move": "GIVE_EFFECT",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "opponent": ["ONFIELD"]
          },
          "card": {
            "able": ["NEGATE"],
            "states": ["FACEUP"]
          },
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "flags": ["CANNOT_DISABLE"],
            "offered": {},
            "applies": [
              {
                "effect": "DISABLE_EFFECT",
                "to": "THIS_CARD",
                "value": "RESET_TURN_SET"
              }
            ]
          },
          "until": ["LEAVES_FIELD_OR_FLIPS", "END_PHASE"]
        },
        {
          "move": "GIVE_EFFECT",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "opponent": ["ONFIELD"]
          },
          "card": {
            "able": ["NEGATE"],
            "states": ["FACEUP"]
          },
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "flags": ["CANNOT_DISABLE"],
            "offered": {},
            "applies": [
              {
                "effect": "DISABLE_TRAPMONSTER",
                "to": "THIS_CARD"
              }
            ]
          },
          "until": ["LEAVES_FIELD_OR_FLIPS", "END_PHASE"],
          "requires": [
            {
              "is": {
                "cards": {
                  "ref": "CHOSEN2"
                },
                "filter": {
                  "types": ["TRAPMONSTER"]
                }
              }
            }
          ]
        }
      ]
    }
  ],
  "legal": [
    {
      "costChecked": true
    }
  ],
  "costChecks": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["HAND", "MZONE"]
          },
          "card": {
            "types": ["MONSTER"],
            "able": ["GRAVE_AS_COST"],
            "states": ["LEAVES_FREE_MZONE"],
            "needs": [
              {
                "count": 1,
                "from": {
                  "own": ["GRAVE"]
                },
                "card": {
                  "archetypes": [472],
                  "able": ["SPECIAL_SUMMON"],
                  "relations": [
                    {
                      "property": "ORIGINAL_ATTRIBUTE",
                      "differsFrom": {
                        "who": "CHECKED_CARD"
                      }
                    }
                  ]
                },
                "targetable": true
              }
            ]
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

## Elfnotes: Aristeia of Trust (50590801)

> Once per turn: You can target 1 face-up monster you control; move that monster you control to another of your Main Monster Zones. When your opponent activates a Spell/Trap Card, while you control 3 or more "Elfnote" monsters: You can negate that effect, then if you control a Synchro Monster, you can destroy that card. You can only use this effect of "Elfnotes: Aristeia of Trust" once per turn. You cannot activate these effects of "Elfnotes: Aristeia of Trust" in the same Chain.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 3 sentence(s)                                         |
| YGOPro script → RML    | unread in 1 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (2 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e1)
	--move
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,0))
	e2:SetType(EFFECT_TYPE_QUICK_O)
	e2:SetCode(EVENT_FREE_CHAIN)
	e2:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e2:SetRange(LOCATION_SZONE)
	e2:SetHintTiming(TIMING_END_PHASE)
	e2:SetCountLimit(1)
	e2:SetTarget(s.mvtg)
	e2:SetOperation(s.mvop)
	c:RegisterEffect(e2)
	--disable
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,1))
	e3:SetCategory(CATEGORY_DISABLE+CATEGORY_DESTROY)
	e3:SetType(EFFECT_TYPE_QUICK_O)
	e3:SetRange(LOCATION_SZONE)
	e3:SetCode(EVENT_CHAINING)
	e3:SetCountLimit(1,id)
	e3:SetCondition(s.discon)
	e3:SetTarget(s.distg)
	e3:SetOperation(s.disop)
	c:RegisterEffect(e3)
end
```

</details>

### Effect 1: ACTIVATE FREE_CHAIN

Text: (activating the Continuous Trap; no sentence)

Lua: set up in `s.initial_effect` only

| From → to                           | Result                             | Where it stops                                               |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Card text → RML                     | —                                  | nothing in the text says this; it comes from the card's type |
| YGOPro script → RML                 | read                               |                                                              |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it    | the card's other parts stop it                               |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above                |

<details><summary>Raw data for effect 1</summary>

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(16)
e:SetCode(1002)
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "ACTIVATE",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "targets": false,
  "offered": {}
}
```

</details>

### Effect 2: QUICK FREE_CHAIN

Text: “Once per turn: You can target 1 face-up monster you control…” + “You cannot activate these effects…”

Lua: `s.mvtg`, `s.mvop`

| From → to                           | Result          | Where it stops                                                                                                                                                                                             |
| ----------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “move that monster you control to another of your Main Monster Zones”; not read, stopped at: “You cannot activate these effects of "Elfnotes: Aristeia of Trust" in the same Chain.” |
| YGOPro script → RML                 | **unread**      | operation: Duel.MoveSequence(tc,nseq)                                                                                                                                                                      |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                                                                                                                                     |
| RML → card text                     | **not written** | unread                                                                                                                                                                                                     |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> Once per turn: You can target 1 face-up monster you control; move that monster you control to another of your Main Monster Zones.
>
> You cannot activate these effects of "Elfnotes: Aristeia of Trust" in the same Chain.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(809452816)
e:SetType(256)
e:SetCode(1002)
e:SetProperty(16)
e:SetRange(8)
e:SetHintTiming(32)
e:SetCountLimit(1)
e:SetTarget(s.mvtg)
e:SetOperation(s.mvop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.mvtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsControler(tp) and chkc:IsFaceup() end
	if chk==0 then return Duel.IsExistingTarget(Card.IsFaceup,tp,LOCATION_MZONE,0,1,nil)
		and Duel.GetLocationCount(tp,LOCATION_MZONE,PLAYER_NONE,0)>0
		and Duel.GetFlagEffect(tp,id+o)==0 end
	Duel.RegisterFlagEffect(tp,id,RESET_CHAIN,0,1)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TARGET)
	Duel.SelectTarget(tp,Card.IsFaceup,tp,LOCATION_MZONE,0,1,1,nil)
end
function s.mvop(e,tp,eg,ep,ev,re,r,rp)
	local tc=Duel.GetFirstTarget()
	if not tc:IsRelateToChain() or not tc:IsLocation(LOCATION_MZONE) or tc:IsControler(1-tp)
		or Duel.GetLocationCount(tp,LOCATION_MZONE,PLAYER_NONE,0)<=0 then return end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOZONE)
	local seq=Duel.SelectDisableField(tp,1,LOCATION_MZONE,0,0)
	local nseq=math.log(seq,2)
	Duel.MoveSequence(tc,nseq)
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["SZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "COPY",
    "counter": 0,
    "oath": false
  },
  "targets": true,
  "flags": ["CARD_TARGET"],
  "offered": {
    "own": ["END_PHASE"],
    "opponent": ["END_PHASE"]
  },
  "description": 809452816,
  "does": [
    {
      "part": 0,
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "REMEMBER",
          "player": "OWN",
          "memory": {
            "flag": "THIS_CARD"
          },
          "until": ["CHAIN_END"]
        }
      ]
    },
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "not": {
            "any": [
              {
                "not": {
                  "stillOnChain": {
                    "ref": "TARGET"
                  }
                }
              },
              {
                "not": {
                  "is": {
                    "cards": {
                      "ref": "TARGET"
                    },
                    "filter": {
                      "places": ["MZONE"]
                    }
                  }
                }
              },
              {
                "is": {
                  "cards": {
                    "ref": "TARGET"
                  },
                  "filter": {
                    "controller": "OPPONENT"
                  }
                }
              },
              {
                "not": {
                  "atLeast": 1,
                  "of": {
                    "freeZones": {
                      "own": ["MZONE"]
                    },
                    "forExtraDeck": false
                  }
                }
              }
            ]
          }
        }
      ]
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "states": ["FACEUP"]
          },
          "targetable": true
        }
      }
    },
    {
      "atLeast": 1,
      "of": {
        "freeZones": {
          "own": ["MZONE"]
        },
        "forExtraDeck": false
      }
    },
    {
      "compare": {
        "value": {
          "memory": {
            "flag": "THIS_CARD+1"
          },
          "player": "OWN",
          "count": true
        },
        "is": "EQUAL",
        "to": 0
      }
    }
  ],
  "unread": [
    {
      "role": "operation",
      "text": "Duel.MoveSequence(tc,nseq)"
    }
  ]
}
```

</details>

### Effect 3: QUICK CHAINING

Text: “When your opponent activates a Spell/Trap Card…” + “You can only use this effect of "Elfnotes: Aristeia…” + “You cannot activate these effects…”

Lua: `s.discon`, `s.distg`, `s.disop`

| From → to                           | Result          | Where it stops                                                                                                                                                                                                                        |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “When your opponent activates a Spell/Trap Card, while you control 3 or more "Elfnote" monsters”; not read, stopped at: “You cannot activate these effects of "Elfnotes: Aristeia of Trust" in the same Chain.” |
| YGOPro script → RML                 | read            |                                                                                                                                                                                                                                       |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | moves of the target function                                                                                                                                                                                                          |
| RML → card text                     | **not written** | a condition {"chainLink":{"effectTypes":["ACTIVATE"]}}                                                                                                                                                                                |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> When your opponent activates a Spell/Trap Card, while you control 3 or more "Elfnote" monsters: You can negate that effect, then if you control a Synchro Monster, you can destroy that card.
>
> You can only use this effect of "Elfnotes: Aristeia
>
> You cannot activate these effects of "Elfnotes: Aristeia of Trust" in the same Chain.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(809452817)
e:SetCategory(16385)
e:SetType(256)
e:SetRange(8)
e:SetCode(1027)
e:SetCountLimit(1,50590801)
e:SetCondition(s.discon)
e:SetTarget(s.distg)
e:SetOperation(s.disop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.discon(e,tp,eg,ep,ev,re,r,rp)
	return rp==1-tp and re:IsHasType(EFFECT_TYPE_ACTIVATE) and Duel.IsChainNegatable(ev)
		and Duel.IsExistingMatchingCard(s.cfilter,tp,LOCATION_MZONE,0,3,nil)
end
function s.cfilter(c)
	return c:IsFaceup() and c:IsSetCard(0x1d8)
end
function s.distg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetFlagEffect(tp,id)==0 end
	Duel.RegisterFlagEffect(tp,id+o,RESET_CHAIN,0,1)
	Duel.SetOperationInfo(0,CATEGORY_DISABLE,eg,1,0,0)
end
function s.disop(e,tp,eg,ep,ev,re,r,rp)
	local rc=re:GetHandler()
	if Duel.NegateEffect(ev) and rc:IsRelateToChain(ev) and rc:IsDestructable()
		and Duel.IsExistingMatchingCard(s.cdfilter,tp,LOCATION_MZONE,0,1,nil)
		and Duel.SelectYesNo(tp,aux.Stringid(id,2)) then
		Duel.BreakEffect()
		Duel.Destroy(rc,REASON_EFFECT)
	end
end
function s.cdfilter(c)
	return c:IsFaceup() and c:IsType(TYPE_SYNCHRO)
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "CHAINING",
  "from": ["SZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {},
  "description": 809452817,
  "categories": ["DESTROY", "DISABLE"],
  "declares": [
    {
      "category": "DISABLE",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "who": "EVENT_CARDS"
      },
      "possible": false
    }
  ],
  "does": [
    {
      "part": 0,
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "REMEMBER",
          "player": "OWN",
          "memory": {
            "flag": "THIS_CARD+1"
          },
          "until": ["CHAIN_END"]
        }
      ]
    },
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "NEGATE_EFFECT",
          "cards": {
            "who": "CHAIN_LINK"
          },
          "pick": "CHAIN_LINK"
        }
      ]
    },
    {
      "part": 2,
      "link": "THEN",
      "level": "SUBSEQUENT",
      "optional": true,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "moved": "NEGATE_EFFECT"
          }
        },
        {
          "stillOnChain": {
            "who": "CHAIN_LINK_CARD"
          }
        },
        {
          "is": {
            "cards": {
              "who": "CHAIN_LINK_CARD"
            },
            "filter": {
              "able": ["DESTROY"]
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "own": ["MZONE"]
              },
              "card": {
                "types": ["SYNCHRO"],
                "states": ["FACEUP"]
              },
              "targetable": false
            }
          }
        }
      ],
      "moves": [
        {
          "move": "DESTROY",
          "cards": {
            "who": "CHAIN_LINK_CARD"
          },
          "pick": "CHAIN_LINK",
          "reasons": ["EFFECT"]
        }
      ]
    }
  ],
  "requires": [
    {
      "player": {
        "which": "REASON",
        "is": "OPPONENT"
      }
    },
    {
      "chainLink": {
        "effectTypes": ["ACTIVATE"]
      }
    },
    {
      "chainLink": {
        "negatable": "ACTIVATION"
      }
    },
    {
      "atLeast": 3,
      "of": {
        "matching": {
          "count": 3,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "archetypes": [472],
            "states": ["FACEUP"]
          },
          "targetable": false
        }
      }
    }
  ],
  "legal": [
    {
      "compare": {
        "value": {
          "memory": {
            "flag": "THIS_CARD"
          },
          "player": "OWN",
          "count": true
        },
        "is": "EQUAL",
        "to": 0
      }
    }
  ]
}
```

</details>

## Elfnotes: Quatrain of Succession (58809685)

> The monster in your center Main Monster Zone cannot be banished by your opponent's card effects. You can send 1 other Spell/Trap from your hand or field to the GY, then declare a Level from 1 to 4; Special Summon 1 "Elfnote Seraphim Token" (Plant/Tuner/FIRE/ATK 0/DEF 0) with the declared Level. While that Token is in the Monster Zone, the player who Summoned it cannot Special Summon from the Extra Deck, except "Elfnote" monsters. You can only use this effect of "Elfnotes: Quatrain of Succession" once per turn.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 3 sentence(s)                                         |
| YGOPro script → RML    | unread in 4 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (2 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e1)
	--Cannot Banish
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetCode(EFFECT_CANNOT_REMOVE)
	e2:SetRange(LOCATION_SZONE)
	e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e2:SetTargetRange(1,1)
	e2:SetTarget(s.rmlimit)
	c:RegisterEffect(e2)
	--special summon
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,1))
	e3:SetCategory(CATEGORY_SPECIAL_SUMMON+CATEGORY_TOKEN)
	e3:SetType(EFFECT_TYPE_QUICK_O)
	e3:SetCode(EVENT_FREE_CHAIN)
	e3:SetRange(LOCATION_SZONE)
	e3:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)
	e3:SetCountLimit(1,id)
	e3:SetCost(s.spcost)
	e3:SetTarget(s.sptg)
	e3:SetOperation(s.spop)
	c:RegisterEffect(e3)
end
```

</details>

### Effect 1: ACTIVATE FREE_CHAIN

Text: (activating the Continuous Spell; no sentence)

Lua: set up in `s.initial_effect` only

| From → to                           | Result                             | Where it stops                                               |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Card text → RML                     | —                                  | nothing in the text says this; it comes from the card's type |
| YGOPro script → RML                 | read                               |                                                              |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it    | the card's other parts stop it                               |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above                |

<details><summary>Raw data for effect 1</summary>

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(16)
e:SetCode(1002)
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "ACTIVATE",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "targets": false,
  "offered": {}
}
```

</details>

### Effect 2: CONTINUOUS (CANNOT_REMOVE)

Text: “The monster in your center Main Monster Zone cannot be banished…”

Lua: `s.rmlimit`

| From → to                           | Result          | Where it stops                                                                                                           |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Card text → RML                     | **not read**    | not read, stopped at: “The monster in your center Main Monster Zone cannot be banished by your opponent's card effects.” |
| YGOPro script → RML                 | read            |                                                                                                                          |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | a target function that isn't given r, rp                                                                                 |
| RML → card text                     | **not written** | applies                                                                                                                  |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> The monster in your center Main Monster Zone cannot be banished by your opponent's card effects.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetCode(67)
e:SetRange(8)
e:SetProperty(2048)
e:SetTargetRange(1,1)
e:SetTarget(s.rmlimit)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.rmlimit(e,c,rp,r,re)
	local tp=e:GetHandlerPlayer()
	return c:IsControler(tp) and c:IsLocation(LOCATION_MZONE) and c:GetSequence()==2
		and r&REASON_EFFECT~=0 and r&REASON_REDIRECT==0 and rp==1-tp
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "from": ["SZONE"],
  "targets": false,
  "flags": ["PLAYER_TARGET"],
  "offered": {},
  "applies": [
    {
      "effect": "CANNOT_REMOVE",
      "to": {
        "players": "BOTH"
      },
      "cards": {
        "places": ["MZONE"],
        "controller": "OWN",
        "numbers": {
          "SEQUENCE": {
            "is": [2]
          }
        }
      },
      "requires": [
        {
          "reasons": ["EFFECT"]
        },
        {
          "not": {
            "reasons": ["REDIRECT"]
          }
        },
        {
          "player": {
            "which": "REASON",
            "is": "OPPONENT"
          }
        }
      ]
    }
  ]
}
```

</details>

### Effect 3: QUICK FREE_CHAIN

Text: “You can send 1 other Spell/Trap…” + “While that Token is in the Monster Zone…” + “You can only use this effect of "Elfnotes: Quatrain…”

Lua: `s.spcost`, `s.sptg`, `s.spop`

| From → to                           | Result          | Where it stops                                                                                                                                                                                                                                  |
| ----------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “TO_GRAVE: 1 other Spell/Trap from your hand or field”; not read, stopped at: “While that Token is in the Monster Zone, the player who Summoned it cannot Special Summon from the Extra Deck, except "Elfnote" monsters.” |
| YGOPro script → RML                 | **unread**      | target: if e:IsCostChecked() then ... end; target: Duel.AnnounceNumber(tp,table.unpack(lvt))                                                                                                                                                    |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                                                                                                                                                                          |
| RML → card text                     | **not written** | unread                                                                                                                                                                                                                                          |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> You can send 1 other Spell/Trap from your hand or field to the GY, then declare a Level from 1 to 4; Special Summon 1 "Elfnote Seraphim Token" (Plant/Tuner/FIRE/ATK 0/DEF 0) with the declared Level.
>
> While that Token is in the Monster Zone, the player who Summoned it cannot Special Summon from the Extra Deck, except "Elfnote" monsters.
>
> You can only use this effect of "Elfnotes: Quatrain

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(940954961)
e:SetCategory(1536)
e:SetType(256)
e:SetCode(1002)
e:SetRange(8)
e:SetHintTiming(0,480)
e:SetCountLimit(1,58809685)
e:SetCost(s.spcost)
e:SetTarget(s.sptg)
e:SetOperation(s.spop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.cfilter,tp,LOCATION_HAND+LOCATION_ONFIELD,0,1,e:GetHandler(),tp) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
	local g=Duel.SelectMatchingCard(tp,s.cfilter,tp,LOCATION_HAND+LOCATION_ONFIELD,0,1,1,e:GetHandler(),tp)
	Duel.SendtoGrave(g,REASON_COST)
end
function s.cfilter(c,tp)
	return c:IsType(TYPE_SPELL+TYPE_TRAP) and Duel.GetMZoneCount(tp,c)>0 and c:IsAbleToGraveAsCost()
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	local lvt={}
	for i=1,4 do
		if Duel.IsPlayerCanSpecialSummonMonster(tp,id+o,0x1d8,TYPES_TOKEN_MONSTER,0,0,i,RACE_PLANT,ATTRIBUTE_FIRE) then
			lvt[i]=i
		end
	end
	if chk==0 then
		if e:IsCostChecked() then
			return next(lvt)~=nil
		else
			return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
				and next(lvt)~=nil
		end
	end
	local pc=1
	for i=1,4 do
		if lvt[i] then lvt[i]=nil lvt[pc]=i pc=pc+1 end
	end
	lvt[pc]=nil
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_LVRANK)
	e:SetLabel(Duel.AnnounceNumber(tp,table.unpack(lvt)))
	Duel.SetOperationInfo(0,CATEGORY_TOKEN,nil,1,0,0)
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,0)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	local lv=e:GetLabel()
	if Duel.GetLocationCount(tp,LOCATION_MZONE)<=0
		or not Duel.IsPlayerCanSpecialSummonMonster(tp,id+o,0x1d8,TYPES_TOKEN_MONSTER,0,0,lv,RACE_PLANT,ATTRIBUTE_FIRE) then return end
	local token=Duel.CreateToken(tp,id+o)
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_SINGLE)
	e1:SetCode(EFFECT_CHANGE_LEVEL)
	e1:SetReset(RESET_EVENT+RESETS_STANDARD-RESET_TOFIELD)
	e1:SetValue(lv)
	token:RegisterEffect(e1,true)
	Duel.SpecialSummonStep(token,0,tp,tp,false,false,POS_FACEUP)
	local e2=Effect.CreateEffect(e:GetHandler())
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)
	e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e2:SetRange(LOCATION_MZONE)
	e2:SetAbsoluteRange(tp,1,0)
	e2:SetTarget(s.splimit)
	e2:SetReset(RESET_EVENT+RESETS_STANDARD)
	token:RegisterEffect(e2,true)
	Duel.SpecialSummonComplete()
end
function s.splimit(e,c)
	return not c:IsSetCard(0x1d8) and c:IsLocation(LOCATION_EXTRA)
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["SZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {
    "opponent": ["END_PHASE", "SUMMON", "SPSUMMON", "FLIPSUMMON"]
  },
  "description": 940954961,
  "categories": ["SPECIAL_SUMMON", "TOKEN"],
  "declares": [
    {
      "category": "TOKEN",
      "count": {
        "min": 1,
        "max": 1
      },
      "possible": false
    },
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "possible": false
    }
  ],
  "cost": [
    {
      "move": "TO_GRAVE",
      "cards": {
        "ref": "CHOSEN1"
      },
      "pick": "CHOSEN",
      "count": {
        "min": 1,
        "max": 1
      },
      "from": {
        "own": ["HAND", "ONFIELD"]
      },
      "card": {
        "types": ["SPELL", "TRAP"],
        "able": ["GRAVE_AS_COST"],
        "states": ["LEAVES_FREE_MZONE", "NOT_SELF"]
      },
      "reasons": ["COST"]
    }
  ],
  "does": [
    {
      "part": 0,
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "REMEMBER",
          "memory": {
            "effect": 3,
            "slot": "NUMBER"
          },
          "numbers": [
            {
              "unread": "Duel.AnnounceNumber(tp,table.unpack(lvt))"
            }
          ]
        }
      ]
    },
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "not": {
            "any": [
              {
                "not": {
                  "atLeast": 1,
                  "of": {
                    "freeZones": {
                      "own": ["MZONE"]
                    },
                    "forExtraDeck": false
                  }
                }
              },
              {
                "not": {
                  "playerCan": {
                    "player": "OWN",
                    "move": {
                      "move": "SPECIAL_SUMMON"
                    },
                    "monster": {
                      "name": 58809686,
                      "archetypes": [472],
                      "types": ["MONSTER", "NORMAL", "TOKEN"],
                      "attack": 0,
                      "defense": 0,
                      "level": {
                        "memory": {
                          "effect": 3,
                          "slot": "NUMBER"
                        }
                      },
                      "races": ["PLANT"],
                      "attributes": ["FIRE"]
                    }
                  }
                }
              }
            ]
          }
        }
      ],
      "moves": [
        {
          "move": "GIVE_EFFECT",
          "cards": {
            "token": 58809686
          },
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "offered": {},
            "applies": [
              {
                "effect": "CHANGE_LEVEL",
                "to": "THIS_CARD",
                "value": {
                  "fixed": {
                    "memory": {
                      "effect": 3,
                      "slot": "NUMBER"
                    }
                  }
                }
              }
            ]
          },
          "until": ["LEAVES_FIELD_EXCEPT_TO_FIELD"]
        },
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "token": 58809686
          },
          "position": ["FACEUP"],
          "together": true
        },
        {
          "move": "GIVE_EFFECT",
          "cards": {
            "token": 58809686
          },
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "flags": ["PLAYER_TARGET"],
            "offered": {},
            "applies": [
              {
                "effect": "CANNOT_SPECIAL_SUMMON",
                "to": "DUEL",
                "cards": {
                  "places": ["EXTRA"],
                  "none": [
                    {
                      "archetypes": [472]
                    }
                  ]
                }
              }
            ]
          },
          "until": ["LEAVES_FIELD_OR_FLIPS"]
        },
        {
          "move": "SUMMONS_COMPLETE"
        }
      ]
    }
  ],
  "legal": [
    {
      "unread": "if e:IsCostChecked() then ... end"
    }
  ],
  "costChecks": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["HAND", "ONFIELD"]
          },
          "card": {
            "types": ["SPELL", "TRAP"],
            "able": ["GRAVE_AS_COST"],
            "states": ["LEAVES_FREE_MZONE", "NOT_SELF"]
          },
          "targetable": false
        }
      }
    }
  ],
  "unread": [
    {
      "role": "target",
      "text": "if e:IsCostChecked() then ... end"
    },
    {
      "role": "target",
      "text": "Duel.AnnounceNumber(tp,table.unpack(lvt))"
    }
  ]
}
```

</details>

## Elfnotes: Welcome Home (64491754)

> The monster in your center Main Monster Zone cannot be destroyed by card effects. You can send 1 monster from your hand or field to the GY; Special Summon 1 "Elfnote" monster with a different original Attribute from your Deck in Defense Position, also you cannot Special Summon from the Extra Deck for the rest of this turn, except Synchro Monsters. You can only use this effect of "Elfnotes: Welcome Home" once per turn.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 2 sentence(s)                                         |
| YGOPro script → RML    | unread in 3 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (2 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e1)
	--indes
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
	e2:SetProperty(EFFECT_FLAG_SET_AVAILABLE)
	e2:SetRange(LOCATION_SZONE)
	e2:SetTargetRange(LOCATION_MZONE,0)
	e2:SetTarget(s.indtg)
	e2:SetValue(1)
	c:RegisterEffect(e2)
	--special summon
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,0))
	e3:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e3:SetType(EFFECT_TYPE_IGNITION)
	e3:SetRange(LOCATION_SZONE)
	e3:SetCountLimit(1,id)
	e3:SetCost(s.spcost)
	e3:SetTarget(s.sptg)
	e3:SetOperation(s.spop)
	c:RegisterEffect(e3)
end
```

</details>

### Effect 1: ACTIVATE FREE_CHAIN

Text: (activating the Continuous Spell; no sentence)

Lua: set up in `s.initial_effect` only

| From → to                           | Result                             | Where it stops                                               |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Card text → RML                     | —                                  | nothing in the text says this; it comes from the card's type |
| YGOPro script → RML                 | read                               |                                                              |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it    | the card's other parts stop it                               |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above                |

<details><summary>Raw data for effect 1</summary>

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(16)
e:SetCode(1002)
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "ACTIVATE",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "event": "FREE_CHAIN",
  "targets": false,
  "offered": {}
}
```

</details>

### Effect 2: CONTINUOUS (INDESTRUCTABLE_EFFECT)

Text: “The monster in your center Main Monster Zone cannot be destroyed…”

Lua: `s.indtg`

| From → to                           | Result                          | Where it stops                                                                                            |
| ----------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**                    | not read, stopped at: “The monster in your center Main Monster Zone cannot be destroyed by card effects.” |
| YGOPro script → RML                 | read                            |                                                                                                           |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it | the card's other parts stop it                                                                            |
| RML → card text                     | **not written**                 | applies                                                                                                   |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> The monster in your center Main Monster Zone cannot be destroyed by card effects.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetCode(41)
e:SetProperty(256)
e:SetRange(8)
e:SetTargetRange(4,0)
e:SetTarget(s.indtg)
e:SetValue(1)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.indtg(e,c)
	return c:GetSequence()==2
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "from": ["SZONE"],
  "targets": false,
  "flags": ["SET_AVAILABLE"],
  "offered": {},
  "applies": [
    {
      "effect": "INDESTRUCTABLE_EFFECT",
      "to": {
        "places": {
          "own": ["MZONE"]
        }
      },
      "cards": {
        "numbers": {
          "SEQUENCE": {
            "is": [2]
          }
        }
      },
      "value": 1
    }
  ]
}
```

</details>

### Effect 3: IGNITION

Text: “You can send 1 monster from your hand or field to the GY; Special Summon…” + “You can only use this effect of "Elfnotes: Welcome…”

Lua: `s.spcost`, `s.sptg`, `s.spop`

| From → to                           | Result          | Where it stops                                                                                                                                                                       |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Card text → RML                     | **not read**    | not read, stopped at: “TO_GRAVE: 1 monster from your hand or field”                                                                                                                  |
| YGOPro script → RML                 | **unread**      | cost: c:GetOriginalAttribute()~=ec:GetOriginalAttribute(); cost: c:GetOriginalAttribute()~=ec:GetOriginalAttribute(); operation: c:GetOriginalAttribute()~=ec:GetOriginalAttribute() |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                                                                                                               |
| RML → card text                     | **not written** | unread                                                                                                                                                                               |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> You can send 1 monster from your hand or field to the GY; Special Summon 1 "Elfnote" monster with a different original Attribute from your Deck in Defense Position, also you cannot Special Summon from the Extra Deck for the rest of this turn, except Synchro Monsters.
>
> You can only use this effect of "Elfnotes: Welcome

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1031868064)
e:SetCategory(512)
e:SetType(64)
e:SetRange(8)
e:SetCountLimit(1,64491754)
e:SetCost(s.spcost)
e:SetTarget(s.sptg)
e:SetOperation(s.spop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.cfilter,tp,LOCATION_HAND+LOCATION_MZONE,0,1,nil,e,tp) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
	local g=Duel.SelectMatchingCard(tp,s.cfilter,tp,LOCATION_HAND+LOCATION_MZONE,0,1,1,nil,e,tp)
	Duel.SendtoGrave(g,REASON_COST)
	e:SetLabelObject(g:GetFirst())
end
function s.cfilter(c,e,tp)
	return c:IsAbleToGraveAsCost() and c:IsType(TYPE_MONSTER)
		and Duel.GetMZoneCount(tp,c)>0
		and Duel.IsExistingMatchingCard(s.spfilter,tp,LOCATION_DECK,0,1,nil,e,tp,c)
end
function s.spfilter(c,e,tp,ec)
	return c:IsSetCard(0x1d8) and c:GetOriginalAttribute()~=ec:GetOriginalAttribute()
		and c:IsCanBeSpecialSummoned(e,0,tp,false,false,POS_FACEUP_DEFENSE)
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return e:IsCostChecked() end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_DECK)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetLocationCount(tp,LOCATION_MZONE)>0 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g=Duel.SelectMatchingCard(tp,s.spfilter,tp,LOCATION_DECK,0,1,1,nil,e,tp,e:GetLabelObject())
		if g:GetCount()>0 then
			Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP_DEFENSE)
		end
	end
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_CANNOT_SPECIAL_SUMMON)
	e1:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e1:SetTargetRange(1,0)
	e1:SetTarget(s.splimit)
	e1:SetReset(RESET_PHASE+PHASE_END)
	Duel.RegisterEffect(e1,tp)
end
function s.splimit(e,c)
	return not c:IsType(TYPE_SYNCHRO) and c:IsLocation(LOCATION_EXTRA)
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "IGNITION",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["SZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {},
  "description": 1031868064,
  "categories": ["SPECIAL_SUMMON"],
  "declares": [
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["DECK"],
      "possible": false
    }
  ],
  "cost": [
    {
      "move": "TO_GRAVE",
      "cards": {
        "ref": "CHOSEN1"
      },
      "pick": "CHOSEN",
      "count": {
        "min": 1,
        "max": 1
      },
      "from": {
        "own": ["HAND", "MZONE"]
      },
      "card": {
        "types": ["MONSTER"],
        "able": ["GRAVE_AS_COST"],
        "states": ["LEAVES_FREE_MZONE"],
        "needs": [
          {
            "count": 1,
            "from": {
              "own": ["DECK"]
            },
            "card": {
              "archetypes": [472],
              "able": ["SPECIAL_SUMMON_IN_FACEUP_DEFENSE"],
              "unread": ["c:GetOriginalAttribute()~=ec:GetOriginalAttribute()"]
            },
            "targetable": false
          }
        ]
      },
      "reasons": ["COST"]
    }
  ],
  "does": [
    {
      "part": 0,
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "REMEMBER",
          "cards": {
            "ref": "CHOSEN1"
          },
          "memory": {
            "effect": 3,
            "slot": "OBJECT"
          }
        }
      ]
    },
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": false
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "CHOSEN2"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "archetypes": [472],
            "able": ["SPECIAL_SUMMON_IN_FACEUP_DEFENSE"],
            "unread": ["c:GetOriginalAttribute()~=ec:GetOriginalAttribute()"]
          },
          "position": ["FACEUP_DEFENSE"]
        }
      ]
    },
    {
      "part": 2,
      "link": "AND",
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "PLAYER_EFFECT",
          "player": "OWN",
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "flags": ["PLAYER_TARGET"],
            "offered": {},
            "applies": [
              {
                "effect": "CANNOT_SPECIAL_SUMMON",
                "to": {
                  "players": "OWN"
                },
                "cards": {
                  "places": ["EXTRA"],
                  "none": [
                    {
                      "types": ["SYNCHRO"]
                    }
                  ]
                }
              }
            ]
          },
          "until": ["END_PHASE"]
        }
      ]
    }
  ],
  "legal": [
    {
      "costChecked": true
    }
  ],
  "costChecks": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["HAND", "MZONE"]
          },
          "card": {
            "types": ["MONSTER"],
            "able": ["GRAVE_AS_COST"],
            "states": ["LEAVES_FREE_MZONE"],
            "needs": [
              {
                "count": 1,
                "from": {
                  "own": ["DECK"]
                },
                "card": {
                  "archetypes": [472],
                  "able": ["SPECIAL_SUMMON_IN_FACEUP_DEFENSE"],
                  "unread": [
                    "c:GetOriginalAttribute()~=ec:GetOriginalAttribute()"
                  ]
                },
                "targetable": false
              }
            ]
          },
          "targetable": false
        }
      }
    }
  ],
  "unread": [
    {
      "role": "cost",
      "text": "c:GetOriginalAttribute()~=ec:GetOriginalAttribute()"
    },
    {
      "role": "cost",
      "text": "c:GetOriginalAttribute()~=ec:GetOriginalAttribute()"
    },
    {
      "role": "operation",
      "text": "c:GetOriginalAttribute()~=ec:GetOriginalAttribute()"
    }
  ]
}
```

</details>

## Elfnotes: A Plea for Help (90880453)

> Your opponent cannot target the monster in your center Main Monster Zone with card effects. This card gains the appropriate effects, based on the Attribute(s) of the monster in your center Main Monster Zone.
> ● FIRE or EARTH: If your Synchro Monster attacks a Defense Position monster, inflict piercing battle damage to your opponent.
> ● WATER or WIND: Other face-up Spells/Traps you control cannot be destroyed by your opponent's card effects.
> ● LIGHT or DARK: You take no battle damage.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 2 sentence(s)                                         |
| YGOPro script → RML    | read completely                                                 |
| RML → ygopro script    | written and checked                                             |
| RML → edopro script    | written and checked                                             |
| RML → omega script     | written and checked                                             |
| RML → card text        | not written (4 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e1)
	--cannot be target
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetCode(EFFECT_CANNOT_BE_EFFECT_TARGET)
	e2:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE+EFFECT_FLAG_SET_AVAILABLE)
	e2:SetRange(LOCATION_SZONE)
	e2:SetTargetRange(LOCATION_MZONE,0)
	e2:SetTarget(s.tglimit)
	e2:SetValue(aux.tgoval)
	c:RegisterEffect(e2)
	--pierce
	local e3=Effect.CreateEffect(c)
	e3:SetType(EFFECT_TYPE_FIELD)
	e3:SetCode(EFFECT_PIERCE)
	e3:SetRange(LOCATION_SZONE)
	e3:SetTargetRange(LOCATION_MZONE,0)
	e3:SetCondition(s.piercecon)
	e3:SetTarget(s.piercetg)
	c:RegisterEffect(e3)
	--cannot be destroyed
	local e4=Effect.CreateEffect(c)
	e4:SetType(EFFECT_TYPE_FIELD)
	e4:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
	e4:SetRange(LOCATION_SZONE)
	e4:SetTargetRange(LOCATION_ONFIELD,0)
	e4:SetCondition(s.indcon)
	e4:SetTarget(s.indtg)
	e4:SetValue(aux.indoval)
	c:RegisterEffect(e4)
	--avoid battle damage
	local e5=Effect.CreateEffect(c)
	e5:SetType(EFFECT_TYPE_FIELD)
	e5:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
	e5:SetRange(LOCATION_SZONE)
	e5:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e5:SetTargetRange(1,0)
	e5:SetCondition(s.abdcon)
	c:RegisterEffect(e5)
end
```

</details>

### Effect 1: ACTIVATE FREE_CHAIN

Text: (activating the Continuous Spell; no sentence)

Lua: set up in `s.initial_effect` only

| From → to                           | Result                             | Where it stops                                               |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Card text → RML                     | —                                  | nothing in the text says this; it comes from the card's type |
| YGOPro script → RML                 | read                               |                                                              |
| RML → YGOPro, EDOPro, Omega scripts | written                            |                                                              |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above                |

<details><summary>Raw data for effect 1</summary>

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(16)
e:SetCode(1002)
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "ACTIVATE",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "event": "FREE_CHAIN",
  "targets": false,
  "offered": {}
}
```

</details>

### Effect 2: CONTINUOUS (CANNOT_BE_EFFECT_TARGET)

Text: “Your opponent cannot target the monster…”

Lua: `s.tglimit`, `aux.tgoval`

| From → to                           | Result          | Where it stops                                                                                                      |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “Your opponent cannot target the monster in your center Main Monster Zone with card effects.” |
| YGOPro script → RML                 | read            |                                                                                                                     |
| RML → YGOPro, EDOPro, Omega scripts | written         |                                                                                                                     |
| RML → card text                     | **not written** | applies                                                                                                             |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> Your opponent cannot target the monster in your center Main Monster Zone with card effects.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetCode(71)
e:SetProperty(384)
e:SetRange(8)
e:SetTargetRange(4,0)
e:SetTarget(s.tglimit)
e:SetValue(aux.tgoval)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.tglimit(e,c)
	return c:GetSequence()==2
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "from": ["SZONE"],
  "targets": false,
  "flags": ["IGNORE_IMMUNE", "SET_AVAILABLE"],
  "offered": {},
  "applies": [
    {
      "effect": "CANNOT_BE_EFFECT_TARGET",
      "to": {
        "places": {
          "own": ["MZONE"]
        }
      },
      "cards": {
        "numbers": {
          "SEQUENCE": {
            "is": [2]
          }
        }
      },
      "value": {},
      "requires": [
        {
          "player": {
            "which": "REASON",
            "is": "OPPONENT"
          }
        }
      ]
    }
  ]
}
```

</details>

### Effect 3: CONTINUOUS (PIERCE)

Text: “This card gains the appropriate effects…” + “● FIRE or EARTH…”

Lua: `s.piercecon`, `s.piercetg`

| From → to                           | Result          | Where it stops                                                         |
| ----------------------------------- | --------------- | ---------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “a list (●)”; not read, stopped at: “a list (●)” |
| YGOPro script → RML                 | read            |                                                                        |
| RML → YGOPro, EDOPro, Omega scripts | written         |                                                                        |
| RML → card text                     | **not written** | applies                                                                |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> This card gains the appropriate effects, based on the Attribute(s) of the monster in your center Main Monster Zone.
> ● FIRE or EARTH: If your Synchro Monster attacks a Defense Position monster, inflict piercing battle damage to your opponent.
> ● WATER or WIND: Other face-up Spells/Traps you control cannot be destroyed by your opponent's card effects.
> ● LIGHT or DARK: You take no battle damage.
>
> This card gains the appropriate effects, based on the Attribute(s) of the monster in your center Main Monster Zone.
> ● FIRE or EARTH: If your Synchro Monster attacks a Defense Position monster, inflict piercing battle damage to your opponent.
> ● WATER or WIND: Other face-up Spells/Traps you control cannot be destroyed by your opponent's card effects.
> ● LIGHT or DARK: You take no battle damage.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetCode(203)
e:SetRange(8)
e:SetTargetRange(4,0)
e:SetCondition(s.piercecon)
e:SetTarget(s.piercetg)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.piercecon(e)
	return Duel.IsExistingMatchingCard(s.piercefilter,e:GetHandlerPlayer(),LOCATION_MZONE,0,1,nil)
end
function s.piercefilter(c)
	return c:GetSequence()==2 and c:IsAttribute(ATTRIBUTE_EARTH+ATTRIBUTE_FIRE)
		and c:IsFaceup()
end
function s.piercetg(e,c)
	return c:IsType(TYPE_SYNCHRO)
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "from": ["SZONE"],
  "targets": false,
  "offered": {},
  "applies": [
    {
      "effect": "PIERCE",
      "to": {
        "places": {
          "own": ["MZONE"]
        }
      },
      "cards": {
        "types": ["SYNCHRO"]
      }
    }
  ],
  "requires": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "attributes": ["EARTH", "FIRE"],
            "states": ["FACEUP"],
            "numbers": {
              "SEQUENCE": {
                "is": [2]
              }
            }
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

### Effect 4: CONTINUOUS (INDESTRUCTABLE_EFFECT)

Text: “This card gains the appropriate effects…” + “● WATER or WIND…”

Lua: `s.indcon`, `s.indtg`, `aux.indoval`

| From → to                           | Result          | Where it stops                                                         |
| ----------------------------------- | --------------- | ---------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “a list (●)”; not read, stopped at: “a list (●)” |
| YGOPro script → RML                 | read            |                                                                        |
| RML → YGOPro, EDOPro, Omega scripts | written         |                                                                        |
| RML → card text                     | **not written** | applies                                                                |

<details><summary>Raw data for effect 4</summary>

**Card text** (input)

> This card gains the appropriate effects, based on the Attribute(s) of the monster in your center Main Monster Zone.
> ● FIRE or EARTH: If your Synchro Monster attacks a Defense Position monster, inflict piercing battle damage to your opponent.
> ● WATER or WIND: Other face-up Spells/Traps you control cannot be destroyed by your opponent's card effects.
> ● LIGHT or DARK: You take no battle damage.
>
> This card gains the appropriate effects, based on the Attribute(s) of the monster in your center Main Monster Zone.
> ● FIRE or EARTH: If your Synchro Monster attacks a Defense Position monster, inflict piercing battle damage to your opponent.
> ● WATER or WIND: Other face-up Spells/Traps you control cannot be destroyed by your opponent's card effects.
> ● LIGHT or DARK: You take no battle damage.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetCode(41)
e:SetRange(8)
e:SetTargetRange(12,0)
e:SetCondition(s.indcon)
e:SetTarget(s.indtg)
e:SetValue(aux.indoval)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.indcon(e)
	return Duel.IsExistingMatchingCard(s.indfilter,e:GetHandlerPlayer(),LOCATION_MZONE,0,1,nil)
end
function s.indfilter(c)
	return c:GetSequence()==2 and c:IsAttribute(ATTRIBUTE_WATER+ATTRIBUTE_WIND)
		and c:IsFaceup()
end
function s.indtg(e,c)
	return c~=e:GetHandler() and c:IsFaceup() and c:IsType(TYPE_SPELL+TYPE_TRAP)
end
```

**RML** (output of script → RML)

```json
{
  "index": 4,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "from": ["SZONE"],
  "targets": false,
  "offered": {},
  "applies": [
    {
      "effect": "INDESTRUCTABLE_EFFECT",
      "to": {
        "places": {
          "own": ["MZONE", "SZONE"]
        }
      },
      "cards": {
        "types": ["SPELL", "TRAP"],
        "states": ["NOT_SELF", "FACEUP"]
      },
      "value": {},
      "requires": [
        {
          "player": {
            "which": "REASON",
            "is": "OPPONENT"
          }
        }
      ]
    }
  ],
  "requires": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "attributes": ["WATER", "WIND"],
            "states": ["FACEUP"],
            "numbers": {
              "SEQUENCE": {
                "is": [2]
              }
            }
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

### Effect 5: CONTINUOUS (AVOID_BATTLE_DAMAGE)

Text: “This card gains the appropriate effects…” + “● LIGHT or DARK…”

Lua: `s.abdcon`

| From → to                           | Result          | Where it stops                                                         |
| ----------------------------------- | --------------- | ---------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “a list (●)”; not read, stopped at: “a list (●)” |
| YGOPro script → RML                 | read            |                                                                        |
| RML → YGOPro, EDOPro, Omega scripts | written         |                                                                        |
| RML → card text                     | **not written** | applies                                                                |

<details><summary>Raw data for effect 5</summary>

**Card text** (input)

> This card gains the appropriate effects, based on the Attribute(s) of the monster in your center Main Monster Zone.
> ● FIRE or EARTH: If your Synchro Monster attacks a Defense Position monster, inflict piercing battle damage to your opponent.
> ● WATER or WIND: Other face-up Spells/Traps you control cannot be destroyed by your opponent's card effects.
> ● LIGHT or DARK: You take no battle damage.
>
> This card gains the appropriate effects, based on the Attribute(s) of the monster in your center Main Monster Zone.
> ● FIRE or EARTH: If your Synchro Monster attacks a Defense Position monster, inflict piercing battle damage to your opponent.
> ● WATER or WIND: Other face-up Spells/Traps you control cannot be destroyed by your opponent's card effects.
> ● LIGHT or DARK: You take no battle damage.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetCode(201)
e:SetRange(8)
e:SetProperty(2048)
e:SetTargetRange(1,0)
e:SetCondition(s.abdcon)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.abdcon(e)
	return Duel.IsExistingMatchingCard(s.abdfilter,e:GetHandlerPlayer(),LOCATION_MZONE,0,1,nil)
end
function s.abdfilter(c)
	return c:GetSequence()==2 and c:IsAttribute(ATTRIBUTE_LIGHT+ATTRIBUTE_DARK)
		and c:IsFaceup()
end
```

**RML** (output of script → RML)

```json
{
  "index": 5,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "from": ["SZONE"],
  "targets": false,
  "flags": ["PLAYER_TARGET"],
  "offered": {},
  "applies": [
    {
      "effect": "AVOID_BATTLE_DAMAGE",
      "to": {
        "players": "OWN"
      }
    }
  ],
  "requires": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "attributes": ["LIGHT", "DARK"],
            "states": ["FACEUP"],
            "numbers": {
              "SEQUENCE": {
                "is": [2]
              }
            }
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

### Written outputs

<details><summary>ygopro: <code>c90880453.lua</code></summary>

```lua
--Elfnotes: A Plea for Help
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e1)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE+EFFECT_FLAG_SET_AVAILABLE)
	e2:SetCode(EFFECT_CANNOT_BE_EFFECT_TARGET)
	e2:SetRange(LOCATION_SZONE)
	e2:SetTargetRange(LOCATION_MZONE,0)
	e2:SetTarget(s.tg2)
	e2:SetValue(aux.tgoval)
	c:RegisterEffect(e2)
	local e3=Effect.CreateEffect(c)
	e3:SetType(EFFECT_TYPE_FIELD)
	e3:SetCode(EFFECT_PIERCE)
	e3:SetRange(LOCATION_SZONE)
	e3:SetTargetRange(LOCATION_MZONE,0)
	e3:SetCondition(s.con3)
	e3:SetTarget(s.tg3)
	c:RegisterEffect(e3)
	local e4=Effect.CreateEffect(c)
	e4:SetType(EFFECT_TYPE_FIELD)
	e4:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
	e4:SetRange(LOCATION_SZONE)
	e4:SetTargetRange(LOCATION_MZONE+LOCATION_SZONE,0)
	e4:SetCondition(s.con4)
	e4:SetTarget(s.tg4)
	e4:SetValue(aux.indoval)
	c:RegisterEffect(e4)
	local e5=Effect.CreateEffect(c)
	e5:SetType(EFFECT_TYPE_FIELD)
	e5:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e5:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
	e5:SetRange(LOCATION_SZONE)
	e5:SetTargetRange(1,0)
	e5:SetCondition(s.con5)
	c:RegisterEffect(e5)
end
function s.tg2(e,c)
	return c:GetSequence()==2
end
function s.filter1(c,e,tp)
	return c:IsFaceup() and c:IsAttribute(ATTRIBUTE_EARTH+ATTRIBUTE_FIRE) and c:GetSequence()==2
end
function s.con3(e)
	local tp=e:GetHandlerPlayer()
	return Duel.IsExistingMatchingCard(s.filter1,tp,LOCATION_MZONE,0,1,nil,e,tp)
end
function s.tg3(e,c)
	return c:IsType(TYPE_SYNCHRO)
end
function s.filter2(c,e,tp)
	return c:IsFaceup() and c:IsAttribute(ATTRIBUTE_WATER+ATTRIBUTE_WIND) and c:GetSequence()==2
end
function s.con4(e)
	local tp=e:GetHandlerPlayer()
	return Duel.IsExistingMatchingCard(s.filter2,tp,LOCATION_MZONE,0,1,nil,e,tp)
end
function s.tg4(e,c)
	return c~=e:GetHandler() and c:IsFaceup() and c:IsType(TYPE_SPELL+TYPE_TRAP)
end
function s.filter3(c,e,tp)
	return c:IsFaceup() and c:IsAttribute(ATTRIBUTE_LIGHT+ATTRIBUTE_DARK) and c:GetSequence()==2
end
function s.con5(e)
	local tp=e:GetHandlerPlayer()
	return Duel.IsExistingMatchingCard(s.filter3,tp,LOCATION_MZONE,0,1,nil,e,tp)
end
```

</details>

<details><summary>edopro: <code>c90880453.lua</code></summary>

```lua
--Elfnotes: A Plea for Help
--written by RML from its description
local s,id=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e1)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE+EFFECT_FLAG_SET_AVAILABLE)
	e2:SetCode(EFFECT_CANNOT_BE_EFFECT_TARGET)
	e2:SetRange(LOCATION_SZONE)
	e2:SetTargetRange(LOCATION_MZONE,0)
	e2:SetTarget(s.tg2)
	e2:SetValue(aux.tgoval)
	c:RegisterEffect(e2)
	local e3=Effect.CreateEffect(c)
	e3:SetType(EFFECT_TYPE_FIELD)
	e3:SetCode(EFFECT_PIERCE)
	e3:SetRange(LOCATION_SZONE)
	e3:SetTargetRange(LOCATION_MZONE,0)
	e3:SetCondition(s.con3)
	e3:SetTarget(s.tg3)
	c:RegisterEffect(e3)
	local e4=Effect.CreateEffect(c)
	e4:SetType(EFFECT_TYPE_FIELD)
	e4:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
	e4:SetRange(LOCATION_SZONE)
	e4:SetTargetRange(LOCATION_MZONE+LOCATION_SZONE,0)
	e4:SetCondition(s.con4)
	e4:SetTarget(s.tg4)
	e4:SetValue(aux.indoval)
	c:RegisterEffect(e4)
	local e5=Effect.CreateEffect(c)
	e5:SetType(EFFECT_TYPE_FIELD)
	e5:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e5:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
	e5:SetRange(LOCATION_SZONE)
	e5:SetTargetRange(1,0)
	e5:SetCondition(s.con5)
	c:RegisterEffect(e5)
end
function s.tg2(e,c)
	return c:GetSequence()==2
end
function s.filter1(c,e,tp)
	return c:IsFaceup() and c:IsAttribute(ATTRIBUTE_EARTH+ATTRIBUTE_FIRE) and c:GetSequence()==2
end
function s.con3(e)
	local tp=e:GetHandlerPlayer()
	return Duel.IsExistingMatchingCard(s.filter1,tp,LOCATION_MZONE,0,1,nil,e,tp)
end
function s.tg3(e,c)
	return c:IsType(TYPE_SYNCHRO)
end
function s.filter2(c,e,tp)
	return c:IsFaceup() and c:IsAttribute(ATTRIBUTE_WATER+ATTRIBUTE_WIND) and c:GetSequence()==2
end
function s.con4(e)
	local tp=e:GetHandlerPlayer()
	return Duel.IsExistingMatchingCard(s.filter2,tp,LOCATION_MZONE,0,1,nil,e,tp)
end
function s.tg4(e,c)
	return c~=e:GetHandler() and c:IsFaceup() and c:IsType(TYPE_SPELL+TYPE_TRAP)
end
function s.filter3(c,e,tp)
	return c:IsFaceup() and c:IsAttribute(ATTRIBUTE_LIGHT+ATTRIBUTE_DARK) and c:GetSequence()==2
end
function s.con5(e)
	local tp=e:GetHandlerPlayer()
	return Duel.IsExistingMatchingCard(s.filter3,tp,LOCATION_MZONE,0,1,nil,e,tp)
end
```

</details>

<details><summary>omega: <code>c90880453.lua</code></summary>

```lua
--Elfnotes: A Plea for Help
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e1)
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetProperty(EFFECT_FLAG_IGNORE_IMMUNE+EFFECT_FLAG_SET_AVAILABLE)
	e2:SetCode(EFFECT_CANNOT_BE_EFFECT_TARGET)
	e2:SetRange(LOCATION_SZONE)
	e2:SetTargetRange(LOCATION_MZONE,0)
	e2:SetTarget(s.tg2)
	e2:SetValue(aux.tgoval)
	c:RegisterEffect(e2)
	local e3=Effect.CreateEffect(c)
	e3:SetType(EFFECT_TYPE_FIELD)
	e3:SetCode(EFFECT_PIERCE)
	e3:SetRange(LOCATION_SZONE)
	e3:SetTargetRange(LOCATION_MZONE,0)
	e3:SetCondition(s.con3)
	e3:SetTarget(s.tg3)
	c:RegisterEffect(e3)
	local e4=Effect.CreateEffect(c)
	e4:SetType(EFFECT_TYPE_FIELD)
	e4:SetCode(EFFECT_INDESTRUCTABLE_EFFECT)
	e4:SetRange(LOCATION_SZONE)
	e4:SetTargetRange(LOCATION_MZONE+LOCATION_SZONE,0)
	e4:SetCondition(s.con4)
	e4:SetTarget(s.tg4)
	e4:SetValue(aux.indoval)
	c:RegisterEffect(e4)
	local e5=Effect.CreateEffect(c)
	e5:SetType(EFFECT_TYPE_FIELD)
	e5:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e5:SetCode(EFFECT_AVOID_BATTLE_DAMAGE)
	e5:SetRange(LOCATION_SZONE)
	e5:SetTargetRange(1,0)
	e5:SetCondition(s.con5)
	c:RegisterEffect(e5)
end
function s.tg2(e,c)
	return c:GetSequence()==2
end
function s.filter1(c,e,tp)
	return c:IsFaceup() and c:IsAttribute(ATTRIBUTE_EARTH+ATTRIBUTE_FIRE) and c:GetSequence()==2
end
function s.con3(e)
	local tp=e:GetHandlerPlayer()
	return Duel.IsExistingMatchingCard(s.filter1,tp,LOCATION_MZONE,0,1,nil,e,tp)
end
function s.tg3(e,c)
	return c:IsType(TYPE_SYNCHRO)
end
function s.filter2(c,e,tp)
	return c:IsFaceup() and c:IsAttribute(ATTRIBUTE_WATER+ATTRIBUTE_WIND) and c:GetSequence()==2
end
function s.con4(e)
	local tp=e:GetHandlerPlayer()
	return Duel.IsExistingMatchingCard(s.filter2,tp,LOCATION_MZONE,0,1,nil,e,tp)
end
function s.tg4(e,c)
	return c~=e:GetHandler() and c:IsFaceup() and c:IsType(TYPE_SPELL+TYPE_TRAP)
end
function s.filter3(c,e,tp)
	return c:IsFaceup() and c:IsAttribute(ATTRIBUTE_LIGHT+ATTRIBUTE_DARK) and c:GetSequence()==2
end
function s.con5(e)
	local tp=e:GetHandlerPlayer()
	return Duel.IsExistingMatchingCard(s.filter3,tp,LOCATION_MZONE,0,1,nil,e,tp)
end
```

</details>

## Elfnote Seraphim Token (58809686)

> Specially summoned by the effect of "Elfnotes: Quatrain of Succession". As long as the token specially summoned by this effect exists, you cannot special summon monsters from the Extra Deck that are not "Elfnote".

| Way                    | Result                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Card text → RML        | no effects                                                                             |
| YGOPro script → RML    | no script of its own (a Token): its description is its database entry, read completely |
| RML → ygopro script    | written and checked                                                                    |
| RML → edopro script    | written and checked                                                                    |
| RML → omega script     | written and checked                                                                    |
| RML → card text        | no effects to word (its text is a reminder of Quatrain of Succession's)                |
| YGO Omega script → RML | no script                                                                              |

### Written outputs

<details><summary>ygopro: <code>c58809686.lua</code></summary>

```lua
--Elfnote Seraphim Token
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
end
```

</details>

<details><summary>edopro: <code>c58809686.lua</code></summary>

```lua
--Elfnote Seraphim Token
--written by RML from its description
local s,id=GetID()
function s.initial_effect(c)
end
```

</details>

<details><summary>omega: <code>c58809686.lua</code></summary>

```lua
--Elfnote Seraphim Token
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
end
```

</details>

## Ars Magna - "Citrinitas" (37279096)

> (This card is always treated as an "Artmage", "DoomZ", and "Elfnote" card.)
> You can activate the effects of monsters you control with "Ars Magna" in their original names as Quick Effects while you control a "Power Patron" Link Monster. Once while face-up on the field: You can add 1 "Medius" or "Ars Magna" monster from your Deck to your hand. You can only use this effect of "Ars Magna - "Citrinitas"" once per turn.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 3 sentence(s)                                         |
| YGOPro script → RML    | read completely                                                 |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (2 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	c:RegisterEffect(e1)
	--change effect type
	local e2=Effect.CreateEffect(c)
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET)
	e2:SetCode(id)
	e2:SetRange(LOCATION_SZONE)
	e2:SetTargetRange(1,0)
	e2:SetCondition(s.recon)
	c:RegisterEffect(e2)
	--search
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,1))
	e3:SetCategory(CATEGORY_SEARCH+CATEGORY_TOHAND)
	e3:SetType(EFFECT_TYPE_IGNITION)
	e3:SetProperty(EFFECT_FLAG_NO_TURN_RESET)
	e3:SetRange(LOCATION_SZONE)
	e3:SetCountLimit(1,id)
	e3:SetTarget(s.thtg)
	e3:SetOperation(s.thop)
	c:RegisterEffect(e3)
end
```

</details>

### Effect 1: ACTIVATE FREE_CHAIN

Text: (activating the Continuous Spell; no sentence)

Lua: set up in `s.initial_effect` only

| From → to                           | Result                             | Where it stops                                               |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| Card text → RML                     | —                                  | nothing in the text says this; it comes from the card's type |
| YGOPro script → RML                 | read                               |                                                              |
| RML → YGOPro, EDOPro, Omega scripts | nothing in this effect stops it    | the card's other parts stop it                               |
| RML → card text                     | no reason recorded for this effect | the card isn't written: its reasons are above                |

<details><summary>Raw data for effect 1</summary>

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(16)
e:SetCode(1002)
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "ACTIVATE",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "event": "FREE_CHAIN",
  "targets": false,
  "offered": {}
}
```

</details>

### Effect 2: CONTINUOUS (37279096)

Text: “You can activate the effects of monsters you control with "Ars Magna"…”

Lua: `s.recon`

| From → to                           | Result          | Where it stops                                                                                                                                                                          |
| ----------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “You can activate the effects of monsters you control with "Ars Magna" in their original names as Quick Effects while you control a "Power Patron" Link Monster.” |
| YGOPro script → RML                 | read            |                                                                                                                                                                                         |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | the effect 37279096                                                                                                                                                                     |
| RML → card text                     | **not written** | applies                                                                                                                                                                                 |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> You can activate the effects of monsters you control with "Ars Magna" in their original names as Quick Effects while you control a "Power Patron" Link Monster.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetType(2)
e:SetProperty(2048)
e:SetCode(37279096)
e:SetRange(8)
e:SetTargetRange(1,0)
e:SetCondition(s.recon)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.recon(e,tp,eg,ep,ev,re,r,rp)
	return Duel.IsExistingMatchingCard(s.confilter,e:GetHandlerPlayer(),LOCATION_MZONE,0,1,nil)
end
function s.confilter(c)
	return c:IsSetCard(0x1ce) and c:IsType(TYPE_LINK)
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "CONTINUOUS",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "from": ["SZONE"],
  "targets": false,
  "flags": ["PLAYER_TARGET"],
  "offered": {},
  "applies": [
    {
      "effect": "37279096",
      "to": {
        "players": "OWN"
      }
    }
  ],
  "requires": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "types": ["LINK"],
            "archetypes": [462]
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

### Effect 3: IGNITION

Text: “Once while face-up on the field…” + “You can only use this effect of "Ars Magna - "Citrinitas""…”

Lua: `s.thtg`, `s.thop`

| From → to                           | Result          | Where it stops                                                                                                                                             |
| ----------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “Once while face-up on the field”; not read, stopped at: “You can only use this effect of "Ars Magna - "Citrinitas"" once per turn.” |
| YGOPro script → RML                 | read            |                                                                                                                                                            |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | moves of the target function                                                                                                                               |
| RML → card text                     | **not written** | flags NO_TURN_RESET                                                                                                                                        |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> Once while face-up on the field: You can add 1 "Medius" or "Ars Magna" monster from your Deck to your hand.
>
> You can only use this effect of "Ars Magna - "Citrinitas"" once per turn.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(596465537)
e:SetCategory(131080)
e:SetType(64)
e:SetProperty(4194304)
e:SetRange(8)
e:SetCountLimit(1,37279096)
e:SetTarget(s.thtg)
e:SetOperation(s.thop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.thtg(e,tp,eg,ep,ev,re,r,rp,chk)
	local c=e:GetHandler()
	if chk==0 then return c:GetFlagEffect(id)==0 and Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_DECK,0,1,nil) end
	c:RegisterFlagEffect(id,RESET_EVENT+RESETS_STANDARD,EFFECT_FLAG_CLIENT_HINT,1,0,aux.Stringid(id,2))
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function s.thfilter(c)
	return c:IsSetCard(0x1e6,0x1e8) and c:IsType(TYPE_MONSTER) and c:IsAbleToHand()
end
function s.thop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
	local g=Duel.SelectMatchingCard(tp,s.thfilter,tp,LOCATION_DECK,0,1,1,nil)
	if g:GetCount()>0 then
		Duel.SendtoHand(g,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,g)
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "IGNITION",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["SZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "flags": ["NO_TURN_RESET"],
  "offered": {},
  "description": 596465537,
  "categories": ["TOHAND", "SEARCH"],
  "declares": [
    {
      "category": "TOHAND",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["DECK"],
      "possible": false
    }
  ],
  "does": [
    {
      "part": 0,
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "REMEMBER",
          "cards": {
            "who": "THIS_CARD"
          },
          "memory": {
            "flag": "THIS_CARD"
          },
          "numbers": [0],
          "until": ["LEAVES_FIELD_OR_FLIPS"],
          "flags": ["CLIENT_HINT"],
          "description": 596465538
        }
      ]
    },
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "CHOSEN1"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "TO_HAND",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "types": ["MONSTER"],
            "able": ["HAND"],
            "anyOf": [
              {
                "archetypes": [486]
              },
              {
                "archetypes": [488]
              }
            ]
          },
          "reasons": ["EFFECT"]
        },
        {
          "move": "REVEAL",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "types": ["MONSTER"],
            "able": ["HAND"],
            "anyOf": [
              {
                "archetypes": [486]
              },
              {
                "archetypes": [488]
              }
            ]
          },
          "player": "OPPONENT"
        }
      ]
    }
  ],
  "legal": [
    {
      "compare": {
        "value": {
          "memory": {
            "flag": "THIS_CARD"
          },
          "on": {
            "who": "THIS_CARD"
          },
          "count": true
        },
        "is": "EQUAL",
        "to": 0
      }
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "types": ["MONSTER"],
            "able": ["HAND"],
            "anyOf": [
              {
                "archetypes": [486]
              },
              {
                "archetypes": [488]
              }
            ]
          },
          "targetable": false
        }
      }
    }
  ]
}
```

</details>

## Ars Magna of Infinity and Finity (36270527)

> You can banish this card from your hand; add 1 non-Warrior "Ars Magna" monster from your Deck to your hand, also the original ATK of "Power Patron" Link Monsters you control become tripled for the rest of this turn. If a Fusion and/or Link Monster(s) is Special Summoned while this card is banished (except during the Damage Step): You can Special Summon this card. If you control a "Power Patron" Link Monster: You can target 1 monster on the field; banish it. You can only use each effect of "Ars Magna of Infinity and Finity" once per turn.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 2 sentence(s)                                         |
| YGOPro script → RML    | unread in 4 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (4 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>RML: <code>summons</code></summary>

```json
[
  {
    "method": "TRIBUTE",
    "from": ["HAND"],
    "materials": [
      {
        "count": {
          "min": 2,
          "max": 2
        },
        "role": "ANY",
        "card": {}
      }
    ]
  }
]
```

</details>

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--search
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)
	e1:SetType(EFFECT_TYPE_IGNITION)
	e1:SetRange(LOCATION_HAND)
	e1:SetCountLimit(1,id)
	e1:SetCost(s.thcost)
	e1:SetTarget(s.thtg)
	e1:SetOperation(s.thop)
	c:RegisterEffect(e1)
	--specail summon
	local e2=Effect.CreateEffect(c)
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e2:SetProperty(EFFECT_FLAG_DELAY)
	e2:SetCode(EVENT_SPSUMMON_SUCCESS)
	e2:SetRange(LOCATION_REMOVED)
	e2:SetCountLimit(1,id+o)
	e2:SetCondition(s.spcon)
	e2:SetTarget(s.sptg)
	e2:SetOperation(s.spop)
	c:RegisterEffect(e2)
	--remove
	local e3=Effect.CreateEffect(c)
	e3:SetCategory(CATEGORY_REMOVE)
	e3:SetType(EFFECT_TYPE_IGNITION)
	e3:SetRange(LOCATION_MZONE)
	e3:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e3:SetCountLimit(1,id+o*2)
	e3:SetCondition(s.rmcon1)
	e3:SetTarget(s.rmtg)
	e3:SetOperation(s.rmop)
	c:RegisterEffect(e3)
	local e4=e3:Clone()
	e4:SetType(EFFECT_TYPE_QUICK_O)
	e4:SetCode(EVENT_FREE_CHAIN)
	e4:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)
	e4:SetCondition(s.rmcon2)
	c:RegisterEffect(e4)
end
```

</details>

### Effect 1: IGNITION

Text: “You can banish this card from your hand; add 1 non-Warrior…” + “You can only use each effect of "Ars Magna of Infinity…”

Lua: `s.thcost`, `s.thtg`, `s.thop`

| From → to                           | Result          | Where it stops                                                                    |
| ----------------------------------- | --------------- | --------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “TO_HAND: 1 non-Warrior "Ars Magna" monster from your Deck” |
| YGOPro script → RML                 | read            |                                                                                   |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | that {"ref":"CHOSEN1"} exists                                                     |
| RML → card text                     | **not written** | cards it isn't, other than by name                                                |

<details><summary>Raw data for effect 1</summary>

**Card text** (input)

> You can banish this card from your hand; add 1 non-Warrior "Ars Magna" monster from your Deck to your hand, also the original ATK of "Power Patron" Link Monsters you control become tripled for the rest of this turn.
>
> You can only use each effect of "Ars Magna of Infinity

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(580328432)
e:SetCategory(131080)
e:SetType(64)
e:SetRange(2)
e:SetCountLimit(1,36270527)
e:SetCost(s.thcost)
e:SetTarget(s.thtg)
e:SetOperation(s.thop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.thcost(e,tp,eg,ep,ev,re,r,rp,chk)
	local c=e:GetHandler()
	if chk==0 then return c:IsAbleToRemoveAsCost() end
	Duel.Remove(c,POS_FACEUP,REASON_COST)
end
function s.thtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chk==0 then return Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_DECK,0,1,nil) end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function s.thfilter(c)
	return not c:IsRace(RACE_WARRIOR) and c:IsSetCard(0x1e6) and c:IsType(TYPE_MONSTER) and c:IsAbleToHand()
end
function s.thop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
	local g=Duel.SelectMatchingCard(tp,s.thfilter,tp,LOCATION_DECK,0,1,1,nil)
	if g and g:GetCount()>0 then
		Duel.SendtoHand(g,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,g)
	end
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_SET_BASE_ATTACK)
	e1:SetTargetRange(LOCATION_MZONE,0)
	e1:SetTarget(s.atktg)
	e1:SetValue(s.atkval)
	e1:SetReset(RESET_PHASE+PHASE_END)
	Duel.RegisterEffect(e1,tp)
end
function s.atktg(e,c)
	return c:IsSetCard(0x1ce) and c:IsType(TYPE_LINK)
end
function s.atkval(e,c)
	return c:GetBaseAttack()*3
end
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "IGNITION",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["HAND"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {},
  "description": 580328432,
  "categories": ["TOHAND", "SEARCH"],
  "declares": [
    {
      "category": "TOHAND",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["DECK"],
      "possible": false
    }
  ],
  "cost": [
    {
      "move": "BANISH",
      "cards": {
        "who": "THIS_CARD"
      },
      "pick": "THIS_CARD",
      "reasons": ["COST"],
      "position": ["FACEUP"]
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "exists": {
            "ref": "CHOSEN1"
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "CHOSEN1"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "TO_HAND",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "types": ["MONSTER"],
            "archetypes": [486],
            "able": ["HAND"],
            "none": [
              {
                "races": ["WARRIOR"]
              }
            ]
          },
          "reasons": ["EFFECT"]
        },
        {
          "move": "REVEAL",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "types": ["MONSTER"],
            "archetypes": [486],
            "able": ["HAND"],
            "none": [
              {
                "races": ["WARRIOR"]
              }
            ]
          },
          "player": "OPPONENT"
        }
      ]
    },
    {
      "part": 2,
      "link": "AND",
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "PLAYER_EFFECT",
          "player": "OWN",
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "offered": {},
            "applies": [
              {
                "effect": "SET_BASE_ATTACK",
                "to": {
                  "places": {
                    "own": ["MZONE"]
                  }
                },
                "cards": {
                  "types": ["LINK"],
                  "archetypes": [462]
                },
                "value": {
                  "computed": {
                    "times": 3,
                    "per": {
                      "number": "BASE_ATTACK",
                      "of": {
                        "who": "AFFECTED_CARD"
                      }
                    }
                  }
                }
              }
            ]
          },
          "until": ["END_PHASE"]
        }
      ]
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "types": ["MONSTER"],
            "archetypes": [486],
            "able": ["HAND"],
            "none": [
              {
                "races": ["WARRIOR"]
              }
            ]
          },
          "targetable": false
        }
      }
    }
  ],
  "costChecks": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "able": ["REMOVE_AS_COST"]
        }
      }
    }
  ]
}
```

</details>

### Effect 2: TRIGGER SPSUMMON_SUCCESS

Text: “If a Fusion and/or Link Monster(s) is Special Summoned…” + “You can only use each effect of "Ars Magna of Infinity…”

Lua: `s.spcon`, `s.sptg`, `s.spop`

| From → to                           | Result          | Where it stops                                                                                                                             |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Card text → RML                     | **not read**    | not read, stopped at: “If a Fusion and/or Link Monster(s) is Special Summoned while this card is banished (except during the Damage Step)” |
| YGOPro script → RML                 | read            |                                                                                                                                            |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | condition {"eventCards":{"count":1,"card":{"types":["FUSION","LINK"],"states":["FACEUP","NOT_SELF"]}}}                                     |
| RML → card text                     | **not written** | a condition {"eventCards":{"count":1,"card":{"types":["FUSION","LINK"],"states":["FACEUP","NOT_SELF"]}}}                                   |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> If a Fusion and/or Link Monster(s) is Special Summoned while this card is banished (except during the Damage Step): You can Special Summon this card.
>
> You can only use each effect of "Ars Magna of Infinity

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetCategory(512)
e:SetType(130)
e:SetProperty(65536)
e:SetCode(1102)
e:SetRange(32)
e:SetCountLimit(1,36270528)
e:SetCondition(s.spcon)
e:SetTarget(s.sptg)
e:SetOperation(s.spop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcon(e,tp,eg,ep,ev,re,r,rp)
	return eg:IsExists(s.cfilter,1,e:GetHandler())
end
function s.cfilter(c,tp,se)
	return c:IsFaceup() and c:IsType(TYPE_FUSION+TYPE_LINK)
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and e:GetHandler():IsCanBeSpecialSummoned(e,0,tp,false,false) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if c:IsRelateToChain() then
		Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP)
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "TRIGGER",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "event": "SPSUMMON_SUCCESS",
  "eventOf": "ANY",
  "from": ["REMOVED"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 1,
    "oath": false
  },
  "targets": false,
  "flags": ["DELAY"],
  "offered": {},
  "categories": ["SPECIAL_SUMMON"],
  "declares": [
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "who": "THIS_CARD"
      },
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "stillOnChain": {
            "who": "THIS_CARD"
          }
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "who": "THIS_CARD"
          },
          "pick": "THIS_CARD",
          "position": ["FACEUP"]
        }
      ]
    }
  ],
  "requires": [
    {
      "eventCards": {
        "count": 1,
        "card": {
          "types": ["FUSION", "LINK"],
          "states": ["FACEUP", "NOT_SELF"]
        }
      }
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "freeZones": {
          "own": ["MZONE"]
        },
        "forExtraDeck": false
      }
    },
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "able": ["SPECIAL_SUMMON"]
        }
      }
    }
  ]
}
```

</details>

### Effect 3: IGNITION

Text: “If you control a "Power Patron" Link Monster: You can target 1 monster on the field…” + “You can only use each effect of "Ars Magna of Infinity…”

Lua: `s.rmcon1`, `s.rmtg`, `s.rmop`

| From → to                           | Result          | Where it stops                                                |
| ----------------------------------- | --------------- | ------------------------------------------------------------- |
| Card text → RML                     | read            |                                                               |
| YGOPro script → RML                 | **unread**      | condition: aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096) |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                        |
| RML → card text                     | **not written** | unread                                                        |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> If you control a "Power Patron" Link Monster: You can target 1 monster on the field; banish it.
>
> You can only use each effect of "Ars Magna of Infinity

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetCategory(4)
e:SetType(64)
e:SetRange(4)
e:SetProperty(16)
e:SetCountLimit(1,36270529)
e:SetCondition(s.rmcon1)
e:SetTarget(s.rmtg)
e:SetOperation(s.rmop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.rmcon1(e,tp,eg,ep,ev,re,r,rp)
	return not aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
		and Duel.IsExistingMatchingCard(s.confilter,tp,LOCATION_MZONE,0,1,nil)
end
function s.confilter(c)
	return c:IsSetCard(0x1ce) and c:IsType(TYPE_LINK) and c:IsFaceup()
end
function s.rmtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsAbleToRemove() end
	if chk==0 then return Duel.IsExistingTarget(Card.IsAbleToRemove,tp,LOCATION_MZONE,LOCATION_MZONE,1,nil) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
	local g=Duel.SelectTarget(tp,Card.IsAbleToRemove,tp,LOCATION_MZONE,LOCATION_MZONE,1,1,nil)
	Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,1,0,0)
end
function s.rmop(e,tp,eg,ep,ev,re,r,rp)
	local tc=Duel.GetFirstTarget()
	if tc:IsRelateToChain() and tc:IsType(TYPE_MONSTER) then
		Duel.Remove(tc,POS_FACEUP,REASON_EFFECT)
	end
end
```

**Lua, utility.lua's `aux.IsCanBeQuickEffect`**

```lua
function Auxiliary.IsCanBeQuickEffect(c,tp,code)
	local filter=Auxiliary.quick_effect_filter[code]
	return Duel.IsPlayerAffectedByEffect(tp,code)~=nil and filter~=nil and filter(c)
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "IGNITION",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 2,
    "oath": false
  },
  "targets": true,
  "flags": ["CARD_TARGET"],
  "offered": {},
  "categories": ["REMOVE"],
  "declares": [
    {
      "category": "REMOVE",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "ref": "TARGET"
      },
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "stillOnChain": {
            "ref": "TARGET"
          }
        },
        {
          "is": {
            "cards": {
              "ref": "TARGET"
            },
            "filter": {
              "types": ["MONSTER"]
            }
          }
        }
      ],
      "moves": [
        {
          "move": "BANISH",
          "cards": {
            "ref": "TARGET"
          },
          "pick": "TARGETED",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["MZONE"],
            "opponent": ["MZONE"]
          },
          "card": {
            "able": ["REMOVE"]
          },
          "reasons": ["EFFECT"],
          "position": ["FACEUP"]
        }
      ]
    }
  ],
  "requires": [
    {
      "not": {
        "unread": "aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)"
      }
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "types": ["LINK"],
            "archetypes": [462],
            "states": ["FACEUP"]
          },
          "targetable": false
        }
      }
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"],
            "opponent": ["MZONE"]
          },
          "card": {
            "able": ["REMOVE"]
          },
          "targetable": true
        }
      }
    }
  ],
  "unread": [
    {
      "role": "condition",
      "text": "aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)"
    }
  ]
}
```

</details>

### Effect 4: QUICK FREE_CHAIN

Text: “If you control a "Power Patron" Link Monster: You can target 1 monster on the field…” + (as a Quick Effect: Ars Magna - "Citrinitas")

Lua: `s.rmcon1`, `s.rmtg`, `s.rmop`, `s.rmcon2`

| From → to                           | Result          | Where it stops                                                |
| ----------------------------------- | --------------- | ------------------------------------------------------------- |
| Card text → RML                     | read            |                                                               |
| YGOPro script → RML                 | **unread**      | condition: aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096) |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                        |
| RML → card text                     | **not written** | unread                                                        |

<details><summary>Raw data for effect 4</summary>

**Card text** (input)

> If you control a "Power Patron" Link Monster: You can target 1 monster on the field; banish it.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetCategory(4)
e:SetType(64)
e:SetRange(4)
e:SetProperty(16)
e:SetCountLimit(1,36270529)
e:SetCondition(s.rmcon1)
e:SetTarget(s.rmtg)
e:SetOperation(s.rmop)
e:SetType(256)
e:SetCode(1002)
e:SetHintTiming(0,480)
e:SetCondition(s.rmcon2)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.rmcon1(e,tp,eg,ep,ev,re,r,rp)
	return not aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
		and Duel.IsExistingMatchingCard(s.confilter,tp,LOCATION_MZONE,0,1,nil)
end
function s.confilter(c)
	return c:IsSetCard(0x1ce) and c:IsType(TYPE_LINK) and c:IsFaceup()
end
function s.rmtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chkc then return chkc:IsLocation(LOCATION_MZONE) and chkc:IsAbleToRemove() end
	if chk==0 then return Duel.IsExistingTarget(Card.IsAbleToRemove,tp,LOCATION_MZONE,LOCATION_MZONE,1,nil) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
	local g=Duel.SelectTarget(tp,Card.IsAbleToRemove,tp,LOCATION_MZONE,LOCATION_MZONE,1,1,nil)
	Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,1,0,0)
end
function s.rmop(e,tp,eg,ep,ev,re,r,rp)
	local tc=Duel.GetFirstTarget()
	if tc:IsRelateToChain() and tc:IsType(TYPE_MONSTER) then
		Duel.Remove(tc,POS_FACEUP,REASON_EFFECT)
	end
end
function s.rmcon2(e,tp,eg,ep,ev,re,r,rp)
	return aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
		and Duel.IsExistingMatchingCard(s.confilter,tp,LOCATION_MZONE,0,1,nil)
end
```

**Lua, utility.lua's `aux.IsCanBeQuickEffect`**

```lua
function Auxiliary.IsCanBeQuickEffect(c,tp,code)
	local filter=Auxiliary.quick_effect_filter[code]
	return Duel.IsPlayerAffectedByEffect(tp,code)~=nil and filter~=nil and filter(c)
end
```

**RML** (output of script → RML)

```json
{
  "index": 4,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 2,
    "oath": false
  },
  "targets": true,
  "flags": ["CARD_TARGET"],
  "offered": {
    "opponent": ["END_PHASE", "SUMMON", "SPSUMMON", "FLIPSUMMON"]
  },
  "categories": ["REMOVE"],
  "declares": [
    {
      "category": "REMOVE",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "ref": "TARGET"
      },
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "stillOnChain": {
            "ref": "TARGET"
          }
        },
        {
          "is": {
            "cards": {
              "ref": "TARGET"
            },
            "filter": {
              "types": ["MONSTER"]
            }
          }
        }
      ],
      "moves": [
        {
          "move": "BANISH",
          "cards": {
            "ref": "TARGET"
          },
          "pick": "TARGETED",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["MZONE"],
            "opponent": ["MZONE"]
          },
          "card": {
            "able": ["REMOVE"]
          },
          "reasons": ["EFFECT"],
          "position": ["FACEUP"]
        }
      ]
    }
  ],
  "requires": [
    {
      "unread": "aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)"
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "types": ["LINK"],
            "archetypes": [462],
            "states": ["FACEUP"]
          },
          "targetable": false
        }
      }
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"],
            "opponent": ["MZONE"]
          },
          "card": {
            "able": ["REMOVE"]
          },
          "targetable": true
        }
      }
    }
  ],
  "unread": [
    {
      "role": "condition",
      "text": "aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)"
    }
  ]
}
```

</details>

## Ars Magna of Purification and Corruption (62368221)

> You can banish this card from your hand; add 1 "Ars Magna" Spell/Trap from your Deck to your hand, also until the end of the next turn, the first 3 times each of your "Power Patron" Link Monsters would be destroyed by battle each turn, it is not destroyed. If an Xyz and/or Link Monster(s) is Special Summoned while this card is banished (except during the Damage Step): You can Special Summon this card. You can target Spells/Traps on the field up to the number of "Power Patron" Link Monsters you control; banish them. You can only use each effect of "Ars Magna of Purification and Corruption" once per turn.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 3 sentence(s)                                         |
| YGOPro script → RML    | unread in 7 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (4 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>RML: <code>summons</code></summary>

```json
[
  {
    "method": "TRIBUTE",
    "from": ["HAND"],
    "materials": [
      {
        "count": {
          "min": 2,
          "max": 2
        },
        "role": "ANY",
        "card": {}
      }
    ]
  }
]
```

</details>

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--search
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_TOHAND+CATEGORY_SEARCH)
	e1:SetType(EFFECT_TYPE_IGNITION)
	e1:SetRange(LOCATION_HAND)
	e1:SetCountLimit(1,id)
	e1:SetCost(s.thcost)
	e1:SetTarget(s.thtg)
	e1:SetOperation(s.thop)
	c:RegisterEffect(e1)
	--specail summon
	local e2=Effect.CreateEffect(c)
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e2:SetProperty(EFFECT_FLAG_DELAY)
	e2:SetCode(EVENT_SPSUMMON_SUCCESS)
	e2:SetRange(LOCATION_REMOVED)
	e2:SetCountLimit(1,id+o)
	e2:SetCondition(s.spcon)
	e2:SetTarget(s.sptg)
	e2:SetOperation(s.spop)
	c:RegisterEffect(e2)
	--remove
	local e3=Effect.CreateEffect(c)
	e3:SetCategory(CATEGORY_REMOVE)
	e3:SetType(EFFECT_TYPE_IGNITION)
	e3:SetRange(LOCATION_MZONE)
	e3:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e3:SetCountLimit(1,id+o*2)
	e3:SetCondition(s.rmcon1)
	e3:SetTarget(s.rmtg)
	e3:SetOperation(s.rmop)
	c:RegisterEffect(e3)
	local e4=e3:Clone()
	e4:SetType(EFFECT_TYPE_QUICK_O)
	e4:SetCode(EVENT_FREE_CHAIN)
	e4:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)
	e4:SetCondition(s.rmcon2)
	c:RegisterEffect(e4)
end
```

</details>

### Effect 1: IGNITION

Text: “You can banish this card from your hand; add 1 "Ars Magna" Spell/Trap…” + “You can only use each effect of "Ars Magna of Purification…”

Lua: `s.thcost`, `s.thtg`, `s.thop`

| From → to                           | Result          | Where it stops                                                                                                                                                                  |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “until the end of the next turn, the first 3 times each of your "Power Patron" Link Monsters would be destroyed by battle each turn, it is not destroyed” |
| YGOPro script → RML                 | **unread**      | value: if bit.band(r,REASON_BATTLE)~=0 then ... end                                                                                                                             |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                                                                                                          |
| RML → card text                     | **not written** | unread                                                                                                                                                                          |

<details><summary>Raw data for effect 1</summary>

**Card text** (input)

> You can banish this card from your hand; add 1 "Ars Magna" Spell/Trap from your Deck to your hand, also until the end of the next turn, the first 3 times each of your "Power Patron" Link Monsters would be destroyed by battle each turn, it is not destroyed.
>
> You can only use each effect of "Ars Magna of Purification

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(997891536)
e:SetCategory(131080)
e:SetType(64)
e:SetRange(2)
e:SetCountLimit(1,62368221)
e:SetCost(s.thcost)
e:SetTarget(s.thtg)
e:SetOperation(s.thop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.thcost(e,tp,eg,ep,ev,re,r,rp,chk)
	local c=e:GetHandler()
	if chk==0 then return c:IsAbleToRemoveAsCost() end
	Duel.Remove(c,POS_FACEUP,REASON_COST)
end
function s.thtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chk==0 then return Duel.IsExistingMatchingCard(s.thfilter,tp,LOCATION_DECK,0,1,nil) end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
end
function s.thfilter(c)
	return c:IsSetCard(0x1e6) and c:IsType(TYPE_SPELL+TYPE_TRAP) and c:IsAbleToHand()
end
function s.thop(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
	local g=Duel.SelectMatchingCard(tp,s.thfilter,tp,LOCATION_DECK,0,1,1,nil)
	if g then
		Duel.SendtoHand(g,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,g)
	end
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_INDESTRUCTABLE_COUNT)
	e1:SetTargetRange(LOCATION_MZONE,0)
	e1:SetTarget(s.atktg)
	e1:SetValue(s.indct)
	e1:SetReset(RESET_PHASE+PHASE_END,2)
	Duel.RegisterEffect(e1,tp)
	local e2=Effect.CreateEffect(e:GetHandler())
	e2:SetDescription(aux.Stringid(id,3))
	e2:SetType(EFFECT_TYPE_FIELD)
	e2:SetProperty(EFFECT_FLAG_PLAYER_TARGET+EFFECT_FLAG_CLIENT_HINT)
	e2:SetCode(id)
	e2:SetTargetRange(1,0)
	e2:SetReset(RESET_PHASE+PHASE_END,2)
	Duel.RegisterEffect(e2,tp)
end
function s.atktg(e,c)
	return c:IsSetCard(0x1ce) and c:IsType(TYPE_LINK)
end
function s.indct(e,re,r,rp)
	if bit.band(r,REASON_BATTLE)~=0 then
		return 3
	else return 0 end
end
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "IGNITION",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["HAND"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {},
  "description": 997891536,
  "categories": ["TOHAND", "SEARCH"],
  "declares": [
    {
      "category": "TOHAND",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["DECK"],
      "possible": false
    }
  ],
  "cost": [
    {
      "move": "BANISH",
      "cards": {
        "who": "THIS_CARD"
      },
      "pick": "THIS_CARD",
      "reasons": ["COST"],
      "position": ["FACEUP"]
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "exists": {
            "ref": "CHOSEN1"
          }
        }
      ],
      "moves": [
        {
          "move": "TO_HAND",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "types": ["SPELL", "TRAP"],
            "archetypes": [486],
            "able": ["HAND"]
          },
          "reasons": ["EFFECT"]
        },
        {
          "move": "REVEAL",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "types": ["SPELL", "TRAP"],
            "archetypes": [486],
            "able": ["HAND"]
          },
          "player": "OPPONENT"
        }
      ]
    },
    {
      "part": 2,
      "link": "AND",
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "PLAYER_EFFECT",
          "player": "OWN",
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "offered": {},
            "applies": [
              {
                "effect": "INDESTRUCTABLE_COUNT",
                "to": {
                  "places": {
                    "own": ["MZONE"]
                  }
                },
                "cards": {
                  "types": ["LINK"],
                  "archetypes": [462]
                },
                "value": {
                  "unread": ["if bit.band(r,REASON_BATTLE)~=0 then ... end"]
                }
              }
            ],
            "unread": [
              {
                "role": "value",
                "text": "if bit.band(r,REASON_BATTLE)~=0 then ... end"
              }
            ]
          },
          "until": ["END_PHASE"]
        },
        {
          "move": "PLAYER_EFFECT",
          "player": "OWN",
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "flags": ["PLAYER_TARGET", "CLIENT_HINT"],
            "offered": {},
            "applies": [
              {
                "effect": "id",
                "to": {
                  "players": "OWN"
                }
              }
            ]
          },
          "until": ["END_PHASE"]
        }
      ]
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["DECK"]
          },
          "card": {
            "types": ["SPELL", "TRAP"],
            "archetypes": [486],
            "able": ["HAND"]
          },
          "targetable": false
        }
      }
    }
  ],
  "costChecks": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "able": ["REMOVE_AS_COST"]
        }
      }
    }
  ],
  "unread": [
    {
      "role": "value",
      "text": "if bit.band(r,REASON_BATTLE)~=0 then ... end"
    }
  ]
}
```

</details>

### Effect 2: TRIGGER SPSUMMON_SUCCESS

Text: “If an Xyz and/or Link Monster(s) is Special Summoned…” + “You can only use each effect of "Ars Magna of Purification…”

Lua: `s.spcon`, `s.sptg`, `s.spop`

| From → to                           | Result          | Where it stops                                                                                                                           |
| ----------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “If an Xyz and/or Link Monster(s) is Special Summoned while this card is banished (except during the Damage Step)” |
| YGOPro script → RML                 | read            |                                                                                                                                          |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | condition {"eventCards":{"count":1,"card":{"types":["XYZ","LINK"],"states":["FACEUP","NOT_SELF"]}}}                                      |
| RML → card text                     | **not written** | a condition {"eventCards":{"count":1,"card":{"types":["XYZ","LINK"],"states":["FACEUP","NOT_SELF"]}}}                                    |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> If an Xyz and/or Link Monster(s) is Special Summoned while this card is banished (except during the Damage Step): You can Special Summon this card.
>
> You can only use each effect of "Ars Magna of Purification

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetCategory(512)
e:SetType(130)
e:SetProperty(65536)
e:SetCode(1102)
e:SetRange(32)
e:SetCountLimit(1,62368222)
e:SetCondition(s.spcon)
e:SetTarget(s.sptg)
e:SetOperation(s.spop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcon(e,tp,eg,ep,ev,re,r,rp)
	return eg:IsExists(s.cfilter,1,e:GetHandler())
end
function s.cfilter(c,tp,se)
	return c:IsFaceup() and c:IsType(TYPE_XYZ+TYPE_LINK)
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and e:GetHandler():IsCanBeSpecialSummoned(e,0,tp,false,false) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if c:IsRelateToChain() then
		Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP)
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "TRIGGER",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "event": "SPSUMMON_SUCCESS",
  "eventOf": "ANY",
  "from": ["REMOVED"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 1,
    "oath": false
  },
  "targets": false,
  "flags": ["DELAY"],
  "offered": {},
  "categories": ["SPECIAL_SUMMON"],
  "declares": [
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "who": "THIS_CARD"
      },
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "stillOnChain": {
            "who": "THIS_CARD"
          }
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "who": "THIS_CARD"
          },
          "pick": "THIS_CARD",
          "position": ["FACEUP"]
        }
      ]
    }
  ],
  "requires": [
    {
      "eventCards": {
        "count": 1,
        "card": {
          "types": ["XYZ", "LINK"],
          "states": ["FACEUP", "NOT_SELF"]
        }
      }
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "freeZones": {
          "own": ["MZONE"]
        },
        "forExtraDeck": false
      }
    },
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "able": ["SPECIAL_SUMMON"]
        }
      }
    }
  ]
}
```

</details>

### Effect 3: IGNITION

Text: “You can target Spells/Traps on the field up to the number…” + “You can only use each effect of "Ars Magna of Purification…”

Lua: `s.rmcon1`, `s.rmtg`, `s.rmop`

| From → to                           | Result          | Where it stops                                                                                                        |
| ----------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “target Spells/Traps on the field up to the number of "Power Patron" Link Monsters you control” |
| YGOPro script → RML                 | **unread**      | condition: aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)                                                         |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                                                |
| RML → card text                     | **not written** | unread                                                                                                                |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> You can target Spells/Traps on the field up to the number of "Power Patron" Link Monsters you control; banish them.
>
> You can only use each effect of "Ars Magna of Purification

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetCategory(4)
e:SetType(64)
e:SetRange(4)
e:SetProperty(16)
e:SetCountLimit(1,62368223)
e:SetCondition(s.rmcon1)
e:SetTarget(s.rmtg)
e:SetOperation(s.rmop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.rmcon1(e,tp,eg,ep,ev,re,r,rp)
	return not aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
end
function s.rmtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	local ct=Duel.GetMatchingGroupCount(s.confilter,tp,LOCATION_MZONE,0,nil)
	if chkc then return chkc:IsLocation(LOCATION_ONFIELD) and s.rmfilter(chkc) end
	if chk==0 then return ct>0 and Duel.IsExistingTarget(s.rmfilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
	local g=Duel.SelectTarget(tp,s.rmfilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,ct,nil)
	Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,1,0,0)
end
function s.confilter(c)
	return c:IsSetCard(0x1ce) and c:IsType(TYPE_LINK) and c:IsFaceup()
end
function s.rmfilter(c)
	return c:IsAbleToRemove() and c:IsType(TYPE_SPELL+TYPE_TRAP)
end
function s.rmop(e,tp,eg,ep,ev,re,r,rp)
	local tg=Duel.GetTargetsRelateToChain():Filter(Card.IsOnField,nil)
	if tg:GetCount()>0 then
		Duel.Remove(tg,POS_FACEUP,REASON_EFFECT)
	end
end
```

**Lua, utility.lua's `aux.IsCanBeQuickEffect`**

```lua
function Auxiliary.IsCanBeQuickEffect(c,tp,code)
	local filter=Auxiliary.quick_effect_filter[code]
	return Duel.IsPlayerAffectedByEffect(tp,code)~=nil and filter~=nil and filter(c)
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "IGNITION",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 2,
    "oath": false
  },
  "targets": true,
  "flags": ["CARD_TARGET"],
  "offered": {},
  "categories": ["REMOVE"],
  "declares": [
    {
      "category": "REMOVE",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "ref": "TARGET"
      },
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "ALL1"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "BANISH",
          "cards": {
            "ref": "ALL1"
          },
          "pick": "ALL",
          "count": "ALL",
          "from": {
            "own": ["ONFIELD"],
            "opponent": ["ONFIELD"]
          },
          "card": {
            "types": ["SPELL", "TRAP"],
            "able": ["REMOVE"],
            "allOf": [
              {
                "places": ["ONFIELD"]
              }
            ]
          },
          "reasons": ["EFFECT"],
          "position": ["FACEUP"]
        }
      ]
    }
  ],
  "requires": [
    {
      "not": {
        "unread": "aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)"
      }
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "types": ["LINK"],
            "archetypes": [462],
            "states": ["FACEUP"]
          },
          "targetable": false
        }
      }
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["ONFIELD"],
            "opponent": ["ONFIELD"]
          },
          "card": {
            "types": ["SPELL", "TRAP"],
            "able": ["REMOVE"]
          },
          "targetable": true
        }
      }
    }
  ],
  "unread": [
    {
      "role": "condition",
      "text": "aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)"
    }
  ]
}
```

</details>

### Effect 4: QUICK FREE_CHAIN

Text: “You can target Spells/Traps on the field up to the number…” + (as a Quick Effect: Ars Magna - "Citrinitas")

Lua: `s.rmcon1`, `s.rmtg`, `s.rmop`, `s.rmcon2`

| From → to                           | Result          | Where it stops                                                                                                        |
| ----------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “target Spells/Traps on the field up to the number of "Power Patron" Link Monsters you control” |
| YGOPro script → RML                 | **unread**      | condition: aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)                                                         |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                                                |
| RML → card text                     | **not written** | unread                                                                                                                |

<details><summary>Raw data for effect 4</summary>

**Card text** (input)

> You can target Spells/Traps on the field up to the number of "Power Patron" Link Monsters you control; banish them.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetCategory(4)
e:SetType(64)
e:SetRange(4)
e:SetProperty(16)
e:SetCountLimit(1,62368223)
e:SetCondition(s.rmcon1)
e:SetTarget(s.rmtg)
e:SetOperation(s.rmop)
e:SetType(256)
e:SetCode(1002)
e:SetHintTiming(0,480)
e:SetCondition(s.rmcon2)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.rmcon1(e,tp,eg,ep,ev,re,r,rp)
	return not aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
end
function s.rmtg(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	local ct=Duel.GetMatchingGroupCount(s.confilter,tp,LOCATION_MZONE,0,nil)
	if chkc then return chkc:IsLocation(LOCATION_ONFIELD) and s.rmfilter(chkc) end
	if chk==0 then return ct>0 and Duel.IsExistingTarget(s.rmfilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
	local g=Duel.SelectTarget(tp,s.rmfilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,ct,nil)
	Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,1,0,0)
end
function s.confilter(c)
	return c:IsSetCard(0x1ce) and c:IsType(TYPE_LINK) and c:IsFaceup()
end
function s.rmfilter(c)
	return c:IsAbleToRemove() and c:IsType(TYPE_SPELL+TYPE_TRAP)
end
function s.rmop(e,tp,eg,ep,ev,re,r,rp)
	local tg=Duel.GetTargetsRelateToChain():Filter(Card.IsOnField,nil)
	if tg:GetCount()>0 then
		Duel.Remove(tg,POS_FACEUP,REASON_EFFECT)
	end
end
function s.rmcon2(e,tp,eg,ep,ev,re,r,rp)
	return aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
		and Duel.IsExistingMatchingCard(s.confilter,tp,LOCATION_MZONE,0,1,nil)
end
```

**Lua, utility.lua's `aux.IsCanBeQuickEffect`**

```lua
function Auxiliary.IsCanBeQuickEffect(c,tp,code)
	local filter=Auxiliary.quick_effect_filter[code]
	return Duel.IsPlayerAffectedByEffect(tp,code)~=nil and filter~=nil and filter(c)
end
```

**RML** (output of script → RML)

```json
{
  "index": 4,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 2,
    "oath": false
  },
  "targets": true,
  "flags": ["CARD_TARGET"],
  "offered": {
    "opponent": ["END_PHASE", "SUMMON", "SPSUMMON", "FLIPSUMMON"]
  },
  "categories": ["REMOVE"],
  "declares": [
    {
      "category": "REMOVE",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "ref": "TARGET"
      },
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "ALL1"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "BANISH",
          "cards": {
            "ref": "ALL1"
          },
          "pick": "ALL",
          "count": "ALL",
          "from": {
            "own": ["ONFIELD"],
            "opponent": ["ONFIELD"]
          },
          "card": {
            "types": ["SPELL", "TRAP"],
            "able": ["REMOVE"],
            "allOf": [
              {
                "places": ["ONFIELD"]
              }
            ]
          },
          "reasons": ["EFFECT"],
          "position": ["FACEUP"]
        }
      ]
    }
  ],
  "requires": [
    {
      "unread": "aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)"
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "types": ["LINK"],
            "archetypes": [462],
            "states": ["FACEUP"]
          },
          "targetable": false
        }
      }
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "types": ["LINK"],
            "archetypes": [462],
            "states": ["FACEUP"]
          },
          "targetable": false
        }
      }
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["ONFIELD"],
            "opponent": ["ONFIELD"]
          },
          "card": {
            "types": ["SPELL", "TRAP"],
            "able": ["REMOVE"]
          },
          "targetable": true
        }
      }
    }
  ],
  "unread": [
    {
      "role": "condition",
      "text": "aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)"
    }
  ]
}
```

</details>

## Ars Magna of Unification and Separation (99753860)

> You can banish this card from your hand; Special Summon 1 non-Spellcaster "Ars Magna" monster from your GY or banishment, also your "Power Patron" Link Monsters can make up to 3 attacks on monsters during each Battle Phase this turn. If a Synchro and/or Link Monster(s) is Special Summoned while this card is banished (except during the Damage Step): You can Special Summon this card. You can banish 1 "Ars Magna" card from your GY; draw 1 card. You can only use each effect of "Ars Magna of Unification and Separation" once per turn.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 2 sentence(s)                                         |
| YGOPro script → RML    | unread in 4 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (4 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>RML: <code>summons</code></summary>

```json
[
  {
    "method": "TRIBUTE",
    "from": ["HAND"],
    "materials": [
      {
        "count": {
          "min": 2,
          "max": 2
        },
        "role": "ANY",
        "card": {}
      }
    ]
  }
]
```

</details>

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--special summon
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_IGNITION)
	e1:SetRange(LOCATION_HAND)
	e1:SetCountLimit(1,id)
	e1:SetCost(s.spcost)
	e1:SetTarget(s.sptg)
	e1:SetOperation(s.spop)
	c:RegisterEffect(e1)
	--specail summon
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e2:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O)
	e2:SetProperty(EFFECT_FLAG_DELAY)
	e2:SetCode(EVENT_SPSUMMON_SUCCESS)
	e2:SetRange(LOCATION_REMOVED)
	e2:SetCountLimit(1,id+o)
	e2:SetCondition(s.spcon2)
	e2:SetTarget(s.sptg2)
	e2:SetOperation(s.spop2)
	c:RegisterEffect(e2)
	--draw
	local e3=Effect.CreateEffect(c)
	e3:SetDescription(aux.Stringid(id,2))
	e3:SetCategory(CATEGORY_DRAW)
	e3:SetType(EFFECT_TYPE_IGNITION)
	e3:SetRange(LOCATION_MZONE)
	e3:SetCountLimit(1,id+o*2)
	e3:SetCondition(s.rmcon1)
	e3:SetCost(s.drcost)
	e3:SetTarget(s.drtg)
	e3:SetOperation(s.drop)
	c:RegisterEffect(e3)
	local e4=e3:Clone()
	e4:SetType(EFFECT_TYPE_QUICK_O)
	e4:SetCode(EVENT_FREE_CHAIN)
	e4:SetHintTiming(0,TIMING_DRAW_PHASE+TIMING_END_PHASE)
	e4:SetCondition(s.rmcon2)
	c:RegisterEffect(e4)
end
```

</details>

### Effect 1: IGNITION

Text: “You can banish this card from your hand; Special Summon 1 non-Spellcaster…” + “You can only use each effect of "Ars Magna of Unification…”

Lua: `s.spcost`, `s.sptg`, `s.spop`

| From → to                           | Result          | Where it stops                                                                                           |
| ----------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “SPECIAL_SUMMON: 1 non-Spellcaster "Ars Magna" monster from your GY or banishment” |
| YGOPro script → RML                 | read            |                                                                                                          |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | PLAYER_EFFECT of no cards                                                                                |
| RML → card text                     | **not written** | cards it isn't, other than by name                                                                       |

<details><summary>Raw data for effect 1</summary>

**Card text** (input)

> You can banish this card from your hand; Special Summon 1 non-Spellcaster "Ars Magna" monster from your GY or banishment, also your "Power Patron" Link Monsters can make up to 3 attacks on monsters during each Battle Phase this turn.
>
> You can only use each effect of "Ars Magna of Unification

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1596061760)
e:SetCategory(512)
e:SetType(64)
e:SetRange(2)
e:SetCountLimit(1,99753860)
e:SetCost(s.spcost)
e:SetTarget(s.sptg)
e:SetOperation(s.spop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcost(e,tp,eg,ep,ev,re,r,rp,chk)
	local c=e:GetHandler()
	if chk==0 then return c:IsAbleToRemoveAsCost() end
	Duel.Remove(c,POS_FACEUP,REASON_COST)
end
function s.sptg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and Duel.IsExistingMatchingCard(s.spfilter,tp,LOCATION_GRAVE+LOCATION_REMOVED,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_GRAVE+LOCATION_REMOVED)
end
function s.spfilter(c,e,tp)
	return c:IsFaceupEx() and not c:IsRace(RACE_SPELLCASTER) and c:IsSetCard(0x1e6) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.spop(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetLocationCount(tp,LOCATION_MZONE)>0 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(s.spfilter),tp,LOCATION_GRAVE+LOCATION_REMOVED,0,1,1,nil,e,tp)
		if g:GetCount()>0 then
			Duel.SpecialSummon(g,0,tp,tp,false,false,POS_FACEUP)
		end
	end
	local e1=Effect.CreateEffect(e:GetHandler())
	e1:SetType(EFFECT_TYPE_FIELD)
	e1:SetCode(EFFECT_EXTRA_ATTACK_MONSTER)
	e1:SetTargetRange(LOCATION_MZONE,0)
	e1:SetTarget(s.atktg)
	e1:SetValue(2)
	e1:SetReset(RESET_PHASE+PHASE_END)
	Duel.RegisterEffect(e1,tp)
end
function s.atktg(e,c)
	return c:IsSetCard(0x1ce) and c:IsType(TYPE_LINK)
end
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "IGNITION",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["HAND"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {},
  "description": 1596061760,
  "categories": ["SPECIAL_SUMMON"],
  "declares": [
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["GRAVE", "REMOVED"],
      "possible": false
    }
  ],
  "cost": [
    {
      "move": "BANISH",
      "cards": {
        "who": "THIS_CARD"
      },
      "pick": "THIS_CARD",
      "reasons": ["COST"],
      "position": ["FACEUP"]
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": false
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "CHOSEN1"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["GRAVE", "REMOVED"]
          },
          "card": {
            "archetypes": [486],
            "able": ["SPECIAL_SUMMON"],
            "states": ["FACEUP_OR_HIDDEN_ZONE", "NOT_NECRO_VALLEY"],
            "none": [
              {
                "races": ["SPELLCASTER"]
              }
            ]
          },
          "position": ["FACEUP"]
        }
      ]
    },
    {
      "part": 2,
      "link": "AND",
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "PLAYER_EFFECT",
          "player": "OWN",
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "offered": {},
            "applies": [
              {
                "effect": "EXTRA_ATTACK_MONSTER",
                "to": {
                  "places": {
                    "own": ["MZONE"]
                  }
                },
                "cards": {
                  "types": ["LINK"],
                  "archetypes": [462]
                },
                "value": 2
              }
            ]
          },
          "until": ["END_PHASE"]
        }
      ]
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "freeZones": {
          "own": ["MZONE"]
        },
        "forExtraDeck": false
      }
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["GRAVE", "REMOVED"]
          },
          "card": {
            "archetypes": [486],
            "able": ["SPECIAL_SUMMON"],
            "states": ["FACEUP_OR_HIDDEN_ZONE"],
            "none": [
              {
                "races": ["SPELLCASTER"]
              }
            ]
          },
          "targetable": false
        }
      }
    }
  ],
  "costChecks": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "able": ["REMOVE_AS_COST"]
        }
      }
    }
  ]
}
```

</details>

### Effect 2: TRIGGER SPSUMMON_SUCCESS

Text: “If a Synchro and/or Link Monster(s) is Special Summoned…” + “You can only use each effect of "Ars Magna of Unification…”

Lua: `s.spcon2`, `s.sptg2`, `s.spop2`

| From → to                           | Result          | Where it stops                                                                                                                              |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “If a Synchro and/or Link Monster(s) is Special Summoned while this card is banished (except during the Damage Step)” |
| YGOPro script → RML                 | read            |                                                                                                                                             |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | condition {"eventCards":{"count":1,"card":{"types":["SYNCHRO","LINK"],"states":["FACEUP","NOT_SELF"]}}}                                     |
| RML → card text                     | **not written** | a condition {"eventCards":{"count":1,"card":{"types":["SYNCHRO","LINK"],"states":["FACEUP","NOT_SELF"]}}}                                   |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> If a Synchro and/or Link Monster(s) is Special Summoned while this card is banished (except during the Damage Step): You can Special Summon this card.
>
> You can only use each effect of "Ars Magna of Unification

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1596061761)
e:SetCategory(512)
e:SetType(130)
e:SetProperty(65536)
e:SetCode(1102)
e:SetRange(32)
e:SetCountLimit(1,99753861)
e:SetCondition(s.spcon2)
e:SetTarget(s.sptg2)
e:SetOperation(s.spop2)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.spcon2(e,tp,eg,ep,ev,re,r,rp)
	return eg:IsExists(s.cfilter,1,e:GetHandler())
end
function s.cfilter(c,tp,se)
	return c:IsFaceup() and c:IsType(TYPE_SYNCHRO+TYPE_LINK)
end
function s.sptg2(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0
		and e:GetHandler():IsCanBeSpecialSummoned(e,0,tp,false,false) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,e:GetHandler(),1,0,0)
end
function s.spop2(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	if c:IsRelateToChain() then
		Duel.SpecialSummon(c,0,tp,tp,false,false,POS_FACEUP)
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "TRIGGER",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "event": "SPSUMMON_SUCCESS",
  "eventOf": "ANY",
  "from": ["REMOVED"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 1,
    "oath": false
  },
  "targets": false,
  "flags": ["DELAY"],
  "offered": {},
  "description": 1596061761,
  "categories": ["SPECIAL_SUMMON"],
  "declares": [
    {
      "category": "SPECIAL_SUMMON",
      "count": {
        "min": 1,
        "max": 1
      },
      "cards": {
        "who": "THIS_CARD"
      },
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "stillOnChain": {
            "who": "THIS_CARD"
          }
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "who": "THIS_CARD"
          },
          "pick": "THIS_CARD",
          "position": ["FACEUP"]
        }
      ]
    }
  ],
  "requires": [
    {
      "eventCards": {
        "count": 1,
        "card": {
          "types": ["SYNCHRO", "LINK"],
          "states": ["FACEUP", "NOT_SELF"]
        }
      }
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "freeZones": {
          "own": ["MZONE"]
        },
        "forExtraDeck": false
      }
    },
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "able": ["SPECIAL_SUMMON"]
        }
      }
    }
  ]
}
```

</details>

### Effect 3: IGNITION

Text: “You can banish 1 "Ars Magna" card from your GY; draw 1 card.…” + “You can only use each effect of "Ars Magna of Unification…”

Lua: `s.rmcon1`, `s.drcost`, `s.drtg`, `s.drop`

| From → to                           | Result          | Where it stops                                                |
| ----------------------------------- | --------------- | ------------------------------------------------------------- |
| Card text → RML                     | read            |                                                               |
| YGOPro script → RML                 | **unread**      | condition: aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096) |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                        |
| RML → card text                     | **not written** | unread                                                        |

<details><summary>Raw data for effect 3</summary>

**Card text** (input)

> You can banish 1 "Ars Magna" card from your GY; draw 1 card.
>
> You can only use each effect of "Ars Magna of Unification

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1596061762)
e:SetCategory(65536)
e:SetType(64)
e:SetRange(4)
e:SetCountLimit(1,99753862)
e:SetCondition(s.rmcon1)
e:SetCost(s.drcost)
e:SetTarget(s.drtg)
e:SetOperation(s.drop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.rmcon1(e,tp,eg,ep,ev,re,r,rp)
	return not aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
		or not Duel.IsExistingMatchingCard(s.confilter,tp,LOCATION_MZONE,0,1,nil)
end
function s.confilter(c)
	return c:IsSetCard(0x1ce) and c:IsType(TYPE_LINK)
end
function s.drcost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.cfilter2,tp,LOCATION_GRAVE,0,1,nil) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
	local g=Duel.SelectMatchingCard(tp,s.cfilter2,tp,LOCATION_GRAVE,0,1,1,nil)
	Duel.Remove(g,POS_FACEUP,REASON_COST)
end
function s.cfilter2(c)
	return c:IsSetCard(0x1e6) and c:IsAbleToRemoveAsCost()
end
function s.drtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsPlayerCanDraw(tp,1) end
	Duel.SetTargetPlayer(tp)
	Duel.SetTargetParam(1)
	Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,1)
end
function s.drop(e,tp,eg,ep,ev,re,r,rp)
	local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
	Duel.Draw(p,d,REASON_EFFECT)
end
```

**Lua, utility.lua's `aux.IsCanBeQuickEffect`**

```lua
function Auxiliary.IsCanBeQuickEffect(c,tp,code)
	local filter=Auxiliary.quick_effect_filter[code]
	return Duel.IsPlayerAffectedByEffect(tp,code)~=nil and filter~=nil and filter(c)
end
```

**RML** (output of script → RML)

```json
{
  "index": 3,
  "kind": "IGNITION",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 1,
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 2,
    "oath": false
  },
  "targets": false,
  "offered": {},
  "description": 1596061762,
  "categories": ["DRAW"],
  "declares": [
    {
      "category": "DRAW",
      "amount": 1,
      "possible": false
    }
  ],
  "cost": [
    {
      "move": "BANISH",
      "cards": {
        "ref": "CHOSEN1"
      },
      "pick": "CHOSEN",
      "count": {
        "min": 1,
        "max": 1
      },
      "from": {
        "own": ["GRAVE"]
      },
      "card": {
        "archetypes": [486],
        "able": ["REMOVE_AS_COST"]
      },
      "reasons": ["COST"],
      "position": ["FACEUP"]
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "DRAW",
          "amount": 1,
          "player": "OWN",
          "reasons": ["EFFECT"]
        }
      ]
    }
  ],
  "requires": [
    {
      "any": [
        {
          "not": {
            "unread": "aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)"
          }
        },
        {
          "not": {
            "atLeast": 1,
            "of": {
              "matching": {
                "count": 1,
                "from": {
                  "own": ["MZONE"]
                },
                "card": {
                  "types": ["LINK"],
                  "archetypes": [462]
                },
                "targetable": false
              }
            }
          }
        }
      ]
    }
  ],
  "legal": [
    {
      "canDraw": {
        "player": "OWN",
        "count": 1
      }
    }
  ],
  "costChecks": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["GRAVE"]
          },
          "card": {
            "archetypes": [486],
            "able": ["REMOVE_AS_COST"]
          },
          "targetable": false
        }
      }
    }
  ],
  "unread": [
    {
      "role": "condition",
      "text": "aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)"
    }
  ]
}
```

</details>

### Effect 4: QUICK FREE_CHAIN

Text: “You can banish 1 "Ars Magna" card from your GY; draw 1 card.…” + (as a Quick Effect: Ars Magna - "Citrinitas")

Lua: `s.rmcon1`, `s.drcost`, `s.drtg`, `s.drop`, `s.rmcon2`

| From → to                           | Result          | Where it stops                                                |
| ----------------------------------- | --------------- | ------------------------------------------------------------- |
| Card text → RML                     | read            |                                                               |
| YGOPro script → RML                 | **unread**      | condition: aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096) |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                        |
| RML → card text                     | **not written** | unread                                                        |

<details><summary>Raw data for effect 4</summary>

**Card text** (input)

> You can banish 1 "Ars Magna" card from your GY; draw 1 card.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1596061762)
e:SetCategory(65536)
e:SetType(64)
e:SetRange(4)
e:SetCountLimit(1,99753862)
e:SetCondition(s.rmcon1)
e:SetCost(s.drcost)
e:SetTarget(s.drtg)
e:SetOperation(s.drop)
e:SetType(256)
e:SetCode(1002)
e:SetHintTiming(0,33)
e:SetCondition(s.rmcon2)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.rmcon1(e,tp,eg,ep,ev,re,r,rp)
	return not aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
		or not Duel.IsExistingMatchingCard(s.confilter,tp,LOCATION_MZONE,0,1,nil)
end
function s.confilter(c)
	return c:IsSetCard(0x1ce) and c:IsType(TYPE_LINK)
end
function s.drcost(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.cfilter2,tp,LOCATION_GRAVE,0,1,nil) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
	local g=Duel.SelectMatchingCard(tp,s.cfilter2,tp,LOCATION_GRAVE,0,1,1,nil)
	Duel.Remove(g,POS_FACEUP,REASON_COST)
end
function s.cfilter2(c)
	return c:IsSetCard(0x1e6) and c:IsAbleToRemoveAsCost()
end
function s.drtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsPlayerCanDraw(tp,1) end
	Duel.SetTargetPlayer(tp)
	Duel.SetTargetParam(1)
	Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,1)
end
function s.drop(e,tp,eg,ep,ev,re,r,rp)
	local p,d=Duel.GetChainInfo(0,CHAININFO_TARGET_PLAYER,CHAININFO_TARGET_PARAM)
	Duel.Draw(p,d,REASON_EFFECT)
end
function s.rmcon2(e,tp,eg,ep,ev,re,r,rp)
	return aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)
		and Duel.IsExistingMatchingCard(s.confilter,tp,LOCATION_MZONE,0,1,nil)
end
```

**Lua, utility.lua's `aux.IsCanBeQuickEffect`**

```lua
function Auxiliary.IsCanBeQuickEffect(c,tp,code)
	local filter=Auxiliary.quick_effect_filter[code]
	return Duel.IsPlayerAffectedByEffect(tp,code)~=nil and filter~=nil and filter(c)
end
```

**RML** (output of script → RML)

```json
{
  "index": 4,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["MZONE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 2,
    "oath": false
  },
  "targets": false,
  "offered": {
    "opponent": ["DRAW_PHASE", "END_PHASE"]
  },
  "description": 1596061762,
  "categories": ["DRAW"],
  "declares": [
    {
      "category": "DRAW",
      "amount": 1,
      "possible": false
    }
  ],
  "cost": [
    {
      "move": "BANISH",
      "cards": {
        "ref": "CHOSEN1"
      },
      "pick": "CHOSEN",
      "count": {
        "min": 1,
        "max": 1
      },
      "from": {
        "own": ["GRAVE"]
      },
      "card": {
        "archetypes": [486],
        "able": ["REMOVE_AS_COST"]
      },
      "reasons": ["COST"],
      "position": ["FACEUP"]
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "DRAW",
          "amount": 1,
          "player": "OWN",
          "reasons": ["EFFECT"]
        }
      ]
    }
  ],
  "requires": [
    {
      "unread": "aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)"
    },
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE"]
          },
          "card": {
            "types": ["LINK"],
            "archetypes": [462]
          },
          "targetable": false
        }
      }
    }
  ],
  "legal": [
    {
      "canDraw": {
        "player": "OWN",
        "count": 1
      }
    }
  ],
  "costChecks": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["GRAVE"]
          },
          "card": {
            "archetypes": [486],
            "able": ["REMOVE_AS_COST"]
          },
          "targetable": false
        }
      }
    }
  ],
  "unread": [
    {
      "role": "condition",
      "text": "aux.IsCanBeQuickEffect(e:GetHandler(),tp,37279096)"
    }
  ]
}
```

</details>

## Ars Magna - "Philosophirum" (90728287)

> Target up to 3 "Ars Magna" monsters in your field and/or GY; banish them, then you can negate the effects of up to that many other face-up cards on the field until the end of this turn. You can banish this card from your GY; return 1 "Power Patron" Link Monster from your GY into the Extra Deck, then you can Special Summon it. You can only use 1 "Ars Magna - "Philosophirum"" effect per turn, and only once that turn.

| Way                    | Result                                                          |
| ---------------------- | --------------------------------------------------------------- |
| Card text → RML        | not read: 3 sentence(s)                                         |
| YGOPro script → RML    | unread in 5 place(s)                                            |
| RML → ygopro script    | UNWRITTEN                                                       |
| RML → edopro script    | UNWRITTEN                                                       |
| RML → omega script     | UNWRITTEN                                                       |
| RML → card text        | not written (2 reason(s))                                       |
| YGO Omega script → RML | the same script as YGOPro's, byte for byte, so the same results |

<details><summary>Lua: <code>s.initial_effect</code> (what registers each effect)</summary>

```lua
function s.initial_effect(c)
	--Activate
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_REMOVE+CATEGORY_DISABLE)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetProperty(EFFECT_FLAG_CARD_TARGET)
	e1:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)
	e1:SetCountLimit(1,id)
	e1:SetTarget(s.target)
	e1:SetOperation(s.activate)
	c:RegisterEffect(e1)
	--to deck
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,1))
	e2:SetCategory(CATEGORY_TODECK+CATEGORY_SPECIAL_SUMMON)
	e2:SetType(EFFECT_TYPE_QUICK_O)
	e2:SetCode(EVENT_FREE_CHAIN)
	e2:SetRange(LOCATION_GRAVE)
	e2:SetHintTiming(0,TIMINGS_CHECK_MONSTER+TIMING_END_PHASE)
	e2:SetCountLimit(1,id)
	e2:SetCost(aux.bfgcost)
	e2:SetTarget(s.tdtg)
	e2:SetOperation(s.tdop)
	c:RegisterEffect(e2)
end
```

</details>

### Effect 1: ACTIVATE FREE_CHAIN

Text: “Target up to 3 "Ars Magna" monsters…” + “You can only use 1 "Ars Magna - "Philosophirum"" effect per turn…”

Lua: `s.target`, `s.activate`

| From → to                           | Result          | Where it stops                                                                                                                                                                                                                                                                               |
| ----------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “Target up to 3 "Ars Magna" monsters in your field and/or GY”; not read, stopped at: “You can only use 1 "Ars Magna - "Philosophirum"" effect per turn, and only once that turn.”                                                                                      |
| YGOPro script → RML                 | **unread**      | target: {WHO=RAW EXPR=aux.SelectTargetFromFieldFirst(tp,s.rmfilter,tp,LOCATION_MZONE+LOCATION_GRAVE,0,1,3,nil)}; operation: ct>0; operation: count {MIN=1 MAX={RAW=ct}}; operation: count {MIN=1 MAX={RAW=ct}}; operation: count {MIN=1 MAX={RAW=ct}}; operation: count {MIN=1 MAX={RAW=ct}} |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | unread                                                                                                                                                                                                                                                                                       |
| RML → card text                     | **not written** | unread                                                                                                                                                                                                                                                                                       |

<details><summary>Raw data for effect 1</summary>

**Card text** (input)

> Target up to 3 "Ars Magna" monsters in your field and/or GY; banish them, then you can negate the effects of up to that many other face-up cards on the field until the end of this turn.
>
> You can only use 1 "Ars Magna - "Philosophirum"" effect per turn, and only once that turn.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1451652592)
e:SetCategory(16388)
e:SetType(16)
e:SetCode(1002)
e:SetProperty(16)
e:SetHintTiming(0,480)
e:SetCountLimit(1,90728287)
e:SetTarget(s.target)
e:SetOperation(s.activate)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.target(e,tp,eg,ep,ev,re,r,rp,chk,chkc)
	if chkc then return chkc:IsLocation(LOCATION_MZONE+LOCATION_GRAVE) and s.rmfilter(chkc) and chkc:IsControler(tp) end
	if chk==0 then return Duel.IsExistingTarget(s.rmfilter,tp,LOCATION_MZONE+LOCATION_GRAVE,0,1,nil) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_REMOVE)
	local g=aux.SelectTargetFromFieldFirst(tp,s.rmfilter,tp,LOCATION_MZONE+LOCATION_GRAVE,0,1,3,nil)
	Duel.SetOperationInfo(0,CATEGORY_REMOVE,g,g:GetCount(),0,0)
end
function s.rmfilter(c)
	return c:IsFaceupEx() and c:IsSetCard(0x1e6) and c:IsType(TYPE_MONSTER) and c:IsAbleToRemove()
end
function s.activate(e,tp,eg,ep,ev,re,r,rp)
	local c=e:GetHandler()
	local g=Duel.GetTargetsRelateToChain():Filter(Card.IsType,nil,TYPE_MONSTER)
	if Duel.Remove(g,POS_FACEUP,REASON_EFFECT)~=0 then
		local ct=Duel.GetOperatedGroup():GetCount()
		if ct>0
			and Duel.IsExistingMatchingCard(aux.NegateAnyFilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,aux.ExceptThisCard(e))
			and Duel.SelectYesNo(tp,aux.Stringid(id,2)) then
			Duel.BreakEffect()
			Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_DISABLE)
			local sg=Duel.SelectMatchingCard(tp,aux.NegateAnyFilter,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,ct,aux.ExceptThisCard(e))
			Duel.HintSelection(sg)
			for tc in aux.Next(sg) do
				Duel.NegateRelatedChain(tc,RESET_TURN_SET)
				local e1=Effect.CreateEffect(c)
				e1:SetType(EFFECT_TYPE_SINGLE)
				e1:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
				e1:SetCode(EFFECT_DISABLE)
				e1:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
				tc:RegisterEffect(e1)
				local e2=Effect.CreateEffect(c)
				e2:SetType(EFFECT_TYPE_SINGLE)
				e2:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
				e2:SetCode(EFFECT_DISABLE_EFFECT)
				e2:SetValue(RESET_TURN_SET)
				e2:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
				tc:RegisterEffect(e2)
				if tc:IsType(TYPE_TRAPMONSTER) then
					local e3=Effect.CreateEffect(c)
					e3:SetType(EFFECT_TYPE_SINGLE)
					e3:SetProperty(EFFECT_FLAG_CANNOT_DISABLE)
					e3:SetCode(EFFECT_DISABLE_TRAPMONSTER)
					e3:SetReset(RESET_EVENT+RESETS_STANDARD+RESET_PHASE+PHASE_END)
					tc:RegisterEffect(e3)
				end
			end
		end
	end
end
```

**Lua, utility.lua's `aux.SelectTargetFromFieldFirst`**

```lua
function Auxiliary.SelectTargetFromFieldFirst(tp,f,player,s,o,min,max,ex,...)
	local g=Duel.GetMatchingGroup(f,player,s,o,ex,...):Filter(Card.IsCanBeEffectTarget,nil)
	local fg=g:Filter(Card.IsOnField,nil)
	g:Sub(fg)
	if #fg>=min and #g>0 then
		local last_hint=Duel.GetLastSelectHint(tp)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_FIELD_FIRST)
		local sg=fg:CancelableSelect(tp,min,max,nil)
		if sg then
			Duel.SetTargetCard(sg)
			return sg
		else
			Duel.Hint(HINT_SELECTMSG,tp,last_hint)
		end
	end
	return Duel.SelectTarget(tp,f,player,s,o,min,max,ex,...)
end
```

**RML** (output of script → RML)

```json
{
  "index": 1,
  "kind": "ACTIVATE",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": true,
  "flags": ["CARD_TARGET"],
  "offered": {
    "opponent": ["END_PHASE", "SUMMON", "SPSUMMON", "FLIPSUMMON"]
  },
  "description": 1451652592,
  "categories": ["REMOVE", "DISABLE"],
  "declares": [
    {
      "category": "REMOVE",
      "count": "ALL",
      "cards": {
        "unread": "{WHO=RAW EXPR=aux.SelectTargetFromFieldFirst(tp,s.rmfilter,tp,LOCATION_MZONE+LOCATION_GRAVE,0,1,3,nil)}"
      },
      "possible": false
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "moves": [
        {
          "move": "BANISH",
          "cards": {
            "ref": "ALL1"
          },
          "pick": "ALL",
          "count": "ALL",
          "card": {
            "types": ["MONSTER"]
          },
          "reasons": ["EFFECT"],
          "position": ["FACEUP"]
        }
      ]
    },
    {
      "part": 2,
      "link": "THEN",
      "level": "SUBSEQUENT",
      "optional": true,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "moved": "BANISH"
          }
        },
        {
          "unread": "ct>0"
        },
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "own": ["ONFIELD"],
                "opponent": ["ONFIELD"]
              },
              "card": {
                "able": ["NEGATE"],
                "states": ["FACEUP", "NOT_SELF"]
              },
              "targetable": false
            }
          }
        }
      ],
      "moves": [
        {
          "move": "NEGATE_ON_CHAIN",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "from": {
            "own": ["ONFIELD"],
            "opponent": ["ONFIELD"]
          },
          "card": {
            "able": ["NEGATE"],
            "states": ["FACEUP", "NOT_SELF"]
          }
        },
        {
          "move": "GIVE_EFFECT",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "from": {
            "own": ["ONFIELD"],
            "opponent": ["ONFIELD"]
          },
          "card": {
            "able": ["NEGATE"],
            "states": ["FACEUP", "NOT_SELF"]
          },
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "flags": ["CANNOT_DISABLE"],
            "offered": {},
            "applies": [
              {
                "effect": "DISABLE",
                "to": "THIS_CARD"
              }
            ]
          },
          "until": ["LEAVES_FIELD_OR_FLIPS", "END_PHASE"]
        },
        {
          "move": "GIVE_EFFECT",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "from": {
            "own": ["ONFIELD"],
            "opponent": ["ONFIELD"]
          },
          "card": {
            "able": ["NEGATE"],
            "states": ["FACEUP", "NOT_SELF"]
          },
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "flags": ["CANNOT_DISABLE"],
            "offered": {},
            "applies": [
              {
                "effect": "DISABLE_EFFECT",
                "to": "THIS_CARD",
                "value": "RESET_TURN_SET"
              }
            ]
          },
          "until": ["LEAVES_FIELD_OR_FLIPS", "END_PHASE"]
        },
        {
          "move": "GIVE_EFFECT",
          "cards": {
            "ref": "CHOSEN2"
          },
          "pick": "CHOSEN",
          "from": {
            "own": ["ONFIELD"],
            "opponent": ["ONFIELD"]
          },
          "card": {
            "able": ["NEGATE"],
            "states": ["FACEUP", "NOT_SELF"]
          },
          "effect": {
            "index": 0,
            "kind": "CONTINUOUS",
            "fromProcedure": false,
            "inSummons": false,
            "mandatory": false,
            "targets": false,
            "flags": ["CANNOT_DISABLE"],
            "offered": {},
            "applies": [
              {
                "effect": "DISABLE_TRAPMONSTER",
                "to": "THIS_CARD"
              }
            ]
          },
          "until": ["LEAVES_FIELD_OR_FLIPS", "END_PHASE"],
          "requires": [
            {
              "is": {
                "cards": {
                  "ref": "CHOSEN2"
                },
                "filter": {
                  "types": ["TRAPMONSTER"]
                }
              }
            }
          ]
        }
      ]
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["MZONE", "GRAVE"]
          },
          "card": {
            "types": ["MONSTER"],
            "archetypes": [486],
            "able": ["REMOVE"],
            "states": ["FACEUP_OR_HIDDEN_ZONE"]
          },
          "targetable": true
        }
      }
    }
  ],
  "unread": [
    {
      "role": "target",
      "text": "{WHO=RAW EXPR=aux.SelectTargetFromFieldFirst(tp,s.rmfilter,tp,LOCATION_MZONE+LOCATION_GRAVE,0,1,3,nil)}"
    },
    {
      "role": "operation",
      "text": "ct>0"
    },
    {
      "role": "operation",
      "text": "count {MIN=1 MAX={RAW=ct}}"
    },
    {
      "role": "operation",
      "text": "count {MIN=1 MAX={RAW=ct}}"
    },
    {
      "role": "operation",
      "text": "count {MIN=1 MAX={RAW=ct}}"
    },
    {
      "role": "operation",
      "text": "count {MIN=1 MAX={RAW=ct}}"
    }
  ]
}
```

</details>

### Effect 2: QUICK FREE_CHAIN

Text: “You can banish this card from your GY; return 1…” + “You can only use 1 "Ars Magna - "Philosophirum"" effect per turn…”

Lua: `s.tdtg`, `s.tdop`, `aux.bfgcost`

| From → to                           | Result          | Where it stops                                                                                                                                                                                                    |
| ----------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card text → RML                     | **not read**    | not read, stopped at: “return 1 "Power Patron" Link Monster from your GY into the Extra Deck”; not read, stopped at: “You can only use 1 "Ars Magna - "Philosophirum"" effect per turn, and only once that turn.” |
| YGOPro script → RML                 | read            |                                                                                                                                                                                                                   |
| RML → YGOPro, EDOPro, Omega scripts | **not written** | moved TO_DECK out of place                                                                                                                                                                                        |
| RML → card text                     | **not written** | a card that can DECK                                                                                                                                                                                              |

<details><summary>Raw data for effect 2</summary>

**Card text** (input)

> You can banish this card from your GY; return 1 "Power Patron" Link Monster from your GY into the Extra Deck, then you can Special Summon it.
>
> You can only use 1 "Ars Magna - "Philosophirum"" effect per turn, and only once that turn.

**Registration** (the engine's record of the Set\* calls)

```lua
e:SetDescription(1451652593)
e:SetCategory(528)
e:SetType(256)
e:SetCode(1002)
e:SetRange(16)
e:SetHintTiming(0,480)
e:SetCountLimit(1,90728287)
e:SetCost(aux.bfgcost)
e:SetTarget(s.tdtg)
e:SetOperation(s.tdop)
```

**Lua** (input: the functions it registers, and the card's own functions they call)

```lua
function s.tdtg(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.tdfilter,tp,LOCATION_GRAVE,0,1,e:GetHandler()) end
	Duel.SetOperationInfo(0,CATEGORY_TODECK,nil,1,tp,LOCATION_GRAVE)
end
function s.tdfilter(c)
	return c:IsSetCard(0x1ce) and c:IsType(TYPE_LINK) and c:IsAbleToDeck()
end
function s.tdop(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetMatchingGroupCount(s.tdfilter,tp,LOCATION_GRAVE,0,nil)<1 then return end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TODECK)
	local g=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(s.tdfilter),tp,LOCATION_GRAVE,0,1,1,nil)
	local tc=g:GetFirst()
	if g:GetCount()>0 then
		Duel.HintSelection(g)
		if Duel.SendtoDeck(tc,nil,SEQ_DECKSHUFFLE,REASON_EFFECT)~=0
			and tc:IsLocation(LOCATION_EXTRA)
			and tc:IsCanBeSpecialSummoned(e,0,tp,false,false)
			and Duel.GetLocationCountFromEx(tp,tp,nil,tc)>0
			and Duel.SelectYesNo(tp,aux.Stringid(id,3)) then
			Duel.BreakEffect()
			Duel.SpecialSummon(tc,0,tp,tp,false,false,POS_FACEUP)
		end
	end
end
```

**RML** (output of script → RML)

```json
{
  "index": 2,
  "kind": "QUICK",
  "fromProcedure": false,
  "inSummons": false,
  "mandatory": false,
  "speed": 2,
  "event": "FREE_CHAIN",
  "from": ["GRAVE"],
  "limit": {
    "count": 1,
    "per": "TURN",
    "shared": "NAME",
    "counter": 0,
    "oath": false
  },
  "targets": false,
  "offered": {
    "opponent": ["END_PHASE", "SUMMON", "SPSUMMON", "FLIPSUMMON"]
  },
  "description": 1451652593,
  "categories": ["TODECK", "SPECIAL_SUMMON"],
  "declares": [
    {
      "category": "TODECK",
      "count": {
        "min": 1,
        "max": 1
      },
      "places": ["GRAVE"],
      "possible": false
    }
  ],
  "cost": [
    {
      "move": "BANISH",
      "cards": {
        "who": "THIS_CARD"
      },
      "pick": "THIS_CARD",
      "reasons": ["COST"],
      "position": ["FACEUP"]
    }
  ],
  "does": [
    {
      "part": 1,
      "level": "EFFECT",
      "optional": false,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "own": ["GRAVE"]
              },
              "card": {
                "types": ["LINK"],
                "archetypes": [462],
                "able": ["DECK"]
              },
              "targetable": false
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "CHOSEN1"
            }
          }
        }
      ],
      "moves": [
        {
          "move": "TO_DECK",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["GRAVE"]
          },
          "card": {
            "types": ["LINK"],
            "archetypes": [462],
            "able": ["DECK"],
            "states": ["NOT_NECRO_VALLEY"]
          },
          "reasons": ["EFFECT"],
          "deckPlace": ["DECKSHUFFLE"]
        }
      ]
    },
    {
      "part": 2,
      "link": "THEN",
      "level": "SUBSEQUENT",
      "optional": true,
      "requires": [
        {
          "atLeast": 1,
          "of": {
            "matching": {
              "count": 1,
              "from": {
                "own": ["GRAVE"]
              },
              "card": {
                "types": ["LINK"],
                "archetypes": [462],
                "able": ["DECK"]
              },
              "targetable": false
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "cards": {
              "ref": "CHOSEN1"
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "moved": "TO_DECK"
          }
        },
        {
          "is": {
            "cards": {
              "ref": "CHOSEN1"
            },
            "filter": {
              "places": ["EXTRA"]
            }
          }
        },
        {
          "is": {
            "cards": {
              "ref": "CHOSEN1"
            },
            "filter": {
              "able": ["SPECIAL_SUMMON"]
            }
          }
        },
        {
          "atLeast": 1,
          "of": {
            "freeZones": {
              "own": ["MZONE"]
            },
            "forExtraDeck": true
          }
        }
      ],
      "moves": [
        {
          "move": "SPECIAL_SUMMON",
          "cards": {
            "ref": "CHOSEN1"
          },
          "pick": "CHOSEN",
          "count": {
            "min": 1,
            "max": 1
          },
          "from": {
            "own": ["GRAVE"]
          },
          "card": {
            "types": ["LINK"],
            "archetypes": [462],
            "able": ["DECK"],
            "states": ["NOT_NECRO_VALLEY"]
          },
          "position": ["FACEUP"]
        }
      ]
    }
  ],
  "legal": [
    {
      "atLeast": 1,
      "of": {
        "matching": {
          "count": 1,
          "from": {
            "own": ["GRAVE"]
          },
          "card": {
            "types": ["LINK"],
            "archetypes": [462],
            "able": ["DECK"],
            "states": ["NOT_SELF"]
          },
          "targetable": false
        }
      }
    }
  ],
  "costChecks": [
    {
      "is": {
        "cards": {
          "who": "THIS_CARD"
        },
        "filter": {
          "able": ["REMOVE_AS_COST"]
        }
      }
    }
  ]
}
```

</details>
