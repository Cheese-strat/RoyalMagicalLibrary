import assert from "node:assert/strict";
import { test } from "node:test";
import { applyLimitations, readEffects } from "../src/builders/konamiEffectReader.js";
import type { EffectSchema } from "../src/lib/cardSchema.js";

test("a While sentence is a continuous effect, applying while its condition holds", () => {
  assert.deepEqual(readEffects("While this card is in Defense Position, monsters your opponent controls lose 500 ATK."), {
    effects: [
      {
        kind: "CONTINUOUS",
        fromProcedure: false,
        inSummons: false,
        mandatory: false,
        targets: false,
        offered: { own: [], opponent: [] },
        requires: [{ is: { cards: { who: "THIS_CARD" }, filter: { positions: ["DEFENSE"] } } }],
        applies: [{ effect: "UPDATE_ATTACK", to: { places: { opponent: ["MZONE"] } }, value: -500 }],
      },
    ],
  });
});

test("a sentence stops at the first word no reader expected, saying what was expected there", () => {
  assert.deepEqual(readEffects("While this card is in Defense Position, monsters your opponent controls gain 500 ATK."), {
    at: 72,
    length: 4,
    reason: 'expected "lose" or "cannot attack, except to attack"',
  });
});

test("a once-per-turn sentence reads as a limitation, not yet on any effect", () => {
  assert.deepEqual(readEffects("You can only use each effect of {#14513273} once per turn."), {
    effects: [{ of: "ALL", together: false, limit: { count: 1, per: "TURN", shared: "NAME", oath: false } }],
  });
});

/** An effect with nothing read into it but its kind. */
const effect = (kind: EffectSchema["kind"]): EffectSchema => ({
  kind,
  fromProcedure: false,
  inSummons: false,
  mandatory: false,
  targets: false,
  offered: { own: [], opponent: [] },
});
const hard = { count: 1, per: "TURN", shared: "NAME", oath: false } as const;

test("limitations go onto the effects of their part, each count a counter of the card's (Supreme King Gate Magician)", () => {
  const limited = applyLimitations([
    [effect("IGNITION"), { of: "PREVIOUS", together: false, limit: hard }],
    [effect("IGNITION"), effect("TRIGGER"), { of: "ALL", together: false, limit: hard }],
  ]);
  assert.deepEqual(
    "effects" in limited && limited.effects.map((e) => e.limit?.counter),
    [0, 1, 2],
  );
});

test("effects that share a count share a counter", () => {
  const limited = applyLimitations([
    [{ of: "FOLLOWING", together: true, limit: hard }, effect("IGNITION"), effect("QUICK")],
  ]);
  assert.deepEqual(
    "effects" in limited && limited.effects.map((e) => e.limit?.counter),
    [0, 0],
  );
});

test("a limitation with no effect to limit is where reading stops", () => {
  assert.deepEqual(applyLimitations([[], [{ of: "PREVIOUS", together: false, limit: hard }]]), {
    part: 1,
    reason: "a limitation with no effect to limit: none before it",
  });
});
