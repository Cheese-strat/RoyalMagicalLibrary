import { OcgcoreMessageType } from "koishipro-core.js";
import type { Library } from "./library.js";
import { splitArgs } from "./lua.js";

/**
 * What a card's initial_effect does, read exactly by running it in ocgcore
 * with these hooked:
 * - every Effect.Set* call, kept per effect (Clone copies them) and reported
 *   when the card registers the effect;
 * - the card's own setup calls: aux.Add... summon procedures, and Card.Enable...
 *   and similar (revive limit, only one on the field, counters);
 * - every aux function that returns a function, so a filter built by aux
 *   (aux.FilterBoolFunction(Card.IsType,TYPE_FUSION)) is named by how it was made.
 * Functions are reported by their name in the card's script ("s.spcost"), in
 * aux, or in Card.
 */
const HOOK_SCRIPT = "rml-registration-hook.lua";
const HOOK = `
local sets, closures, depth, index, current = {}, {}, 0, 0, 0
local function value(owner, v)
  if type(v) == "function" then
    if closures[v] then return closures[v] end
    for k, f in pairs(_G["c" .. owner] or {}) do if f == v then return "s." .. k end end
    for k, f in pairs(aux) do if f == v then return "aux." .. k end end
    for k, f in pairs(Card) do if f == v then return "Card." .. k end end
    return "<closure>"
  end
  if type(v) == "table" then return "<table>" end
  -- a card, group or effect prints as its address, which changes from run to run
  if type(v) == "userdata" then return "<userdata>" end
  return tostring(v)
end
local function args(owner, packed, from)
  local out = {}
  for i = from, packed.n do out[#out + 1] = value(owner, packed[i]) end
  return table.concat(out, ",")
end
for k, f in pairs(aux) do
  if type(f) == "function" and k ~= "Stringid" then
    aux[k] = function(...)
      local packed = table.pack(...)
      if depth == 0 and (k:match("^Add") or k:match("^Enable")) then
        Debug.Message("RML-SETUP\\taux." .. k .. "\\t" .. args(current, packed, 2))
      end
      depth = depth + 1
      local result = table.pack(f(...))
      depth = depth - 1
      if type(result[1]) == "function" then closures[result[1]] = "aux." .. k .. "(" .. args(current, packed, 1) .. ")" end
      return table.unpack(result, 1, result.n)
    end
  end
end
for _, k in ipairs({ "EnableReviveLimit", "SetUniqueOnField", "SetSPSummonOnce", "EnableCounterPermit", "SetCounterLimit", "EnableDualAttribute", "EnableUnsummonable" }) do
  local f = Card[k]
  if f then
    Card[k] = function(c, ...)
      if depth == 0 then Debug.Message("RML-SETUP\\t" .. k .. "\\t" .. args(c:GetOriginalCode(), table.pack(...), 1)) end
      return f(c, ...)
    end
  end
end
for k, f in pairs(Effect) do
  if type(f) == "function" and k:match("^Set") then
    Effect[k] = function(e, ...)
      sets[e] = sets[e] or {}
      table.insert(sets[e], { k, table.pack(...) })
      return f(e, ...)
    end
  end
end
local clone = Effect.Clone
function Effect.Clone(e, ...)
  local copy = clone(e, ...)
  sets[copy] = { table.unpack(sets[e] or {}) }
  return copy
end
local register = Card.RegisterEffect
function Card.RegisterEffect(c, e, ...)
  index = index + 1
  local owner = c:GetOriginalCode()
  current = owner
  for _, set in ipairs(sets[e] or {}) do
    Debug.Message("RML-SET\\t" .. index .. "\\t" .. set[1] .. "\\t" .. args(owner, set[2], 1))
  end
  Debug.Message("RML-SET\\t" .. index .. "\\tRegister\\t" .. (depth > 0 and "procedure" or ""))
  return register(c, e, ...)
end
`;

/** One registered effect: its Set* calls in order, with their arguments as text. */
export interface RegisteredEffect {
  sets: [setter: string, args: string[]][];
  /** Registered by an aux summon procedure rather than by the script itself. */
  procedure: boolean;
}

export interface Registration {
  /** The card's setup calls: [name, arguments as text]. */
  setup: [string, string][];
  /** Its effects by the order they were registered in, from 1. */
  effects: Map<number, RegisteredEffect>;
}

const DECK = 0x01;
const POS_FACEDOWN_DEFENSE = 0x08;
const hooked = new WeakSet<Library>();
let messages: string[] = [];

/** Puts the card in a duel of its own, which is ended again, and reports what its initial_effect registered. */
export function readRegistration(library: Library, code: number): Registration {
  const { wrapper } = library;
  if (!hooked.has(library)) {
    hooked.add(library);
    // ocgcore asks each script reader in turn; this one only knows the hook script
    wrapper.setScriptReader((path: string) => (path.endsWith(HOOK_SCRIPT) ? HOOK : null));
    wrapper.setMessageHandler((_duel, message, type) => {
      if (type === OcgcoreMessageType.DebugMessage && message.startsWith("RML-")) messages.push(message);
    });
  }
  messages = [];
  const duel = wrapper.createDuel(0);
  try {
    duel.preloadScript(`./script/${HOOK_SCRIPT}`);
    duel.newCard({ code, owner: 0, player: 0, location: DECK, sequence: 0, position: POS_FACEDOWN_DEFENSE });
  } finally {
    duel.endDuel();
  }
  const registration: Registration = { setup: [], effects: new Map() };
  for (const message of messages) {
    const [kind, a, b, c = ""] = message.split("\t");
    if (kind === "RML-SETUP") {
      registration.setup.push([a, b]);
      continue;
    }
    const effect = registration.effects.get(Number(a)) ?? { sets: [], procedure: false };
    registration.effects.set(Number(a), effect);
    if (b === "Register") effect.procedure = c === "procedure";
    else effect.sets.push([b, c ? splitArgs(c) : []]);
  }
  return registration;
}
