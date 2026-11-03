import { OcgcoreMessageType } from "koishipro-core.js";
import type { Library } from "./library.js";

/**
 * What a card's initial_effect does, read exactly by running it in ocgcore
 * with these hooked:
 * - every Effect.Set* call, kept per effect (Clone copies them) and reported
 *   when the card registers the effect, or as it is made once it has been;
 * - every group given as a label object, named by number so effects sharing one
 *   show it ("<group 1>": Mirror Wall's three keep the same group);
 * - every effect given as a label object, named by its index ("<effect 2>"),
 *   and reported the same way: one that is never registered (the effect a
 *   grant gives) is held, numbered after the card's registered effects;
 * - the card's own setup calls: aux.Add... summon procedures, and Card.Enable...
 *   and similar (revive limit, only one on the field, counters);
 * - every aux function that returns a function, so a filter built by aux
 *   (aux.FilterBoolFunction(Card.IsType,TYPE_FUSION)) is named by how it was made.
 * Functions are reported by their name in the card's script ("s.spcost"), in
 * aux, or in Card.
 */
const HOOK_SCRIPT = "rml-registration-hook.lua";
const HOOK = `
local sets, closures, depth, index, current, setup = {}, {}, 0, 0, 0, ""
-- Registered effects by index; effects kept as label objects before they are registered (if they ever are), by number
local registered, held, heldCount = {}, {}, 0
local groups, groupCount = {}, 0
local function value(owner, v)
  if type(v) == "function" then
    if closures[v] then return closures[v] end
    for k, f in pairs(_G["c" .. owner] or {}) do if f == v then return "s." .. k end end
    -- Before the card is known (aux.NonTuner(s.mfilter) is made before the procedure it is given to): any card's
    for name, t in pairs(_G) do
      if type(t) == "table" and type(name) == "string" and name:match("^c%d+$") then
        for k, f in pairs(t) do if f == v then return "s." .. k end end
      end
    end
    for k, f in pairs(aux) do if f == v then return "aux." .. k end end
    for k, f in pairs(Card) do if f == v then return "Card." .. k end end
    return "<closure>"
  end
  if type(v) == "table" then return "<table>" end
  -- a card, group or effect prints as its address, which changes from run to run: an effect is named by its index
  if type(v) == "userdata" then
    local mt = getmetatable(v)
    if mt == Effect then
      if registered[v] then return "<effect " .. registered[v] .. ">" end
      return held[v] and "<held " .. held[v] .. ">" or "<effect>"
    end
    if mt ~= Group then return "<card>" end
    if not groups[v] then
      groupCount = groupCount + 1
      groups[v] = groupCount
    end
    return "<group " .. groups[v] .. (v:GetCount() > 0 and " of cards" or "") .. ">"
  end
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
      -- The aux call initial_effect made, which registers what it registers
      if depth == 0 then setup = "aux." .. k end
      if depth == 0 and (k:match("^Add") or k:match("^Enable")) then
        -- A procedure is set up before the card registers anything: its card names its own functions (s.mfilter)
        local ok, code = pcall(Card.GetOriginalCode, packed[1])
        if ok then current = code end
        Debug.Message("RML-SETUP\\taux." .. k .. "\\t" .. args(current, packed, 2))
      end
      depth = depth + 1
      local result = table.pack(f(...))
      depth = depth - 1
      -- A merged event: the custom event it raises, and the events it merges
      if depth == 0 and k:match("^RegisterMergedDelayedEvent") then
        local events = type(packed[3]) == "table" and packed[3] or { packed[3] }
        local custom = k == "RegisterMergedDelayedEvent" and EVENT_CUSTOM + packed[2] or result[1]
        Debug.Message("RML-MERGED\\t" .. tostring(custom) .. "\\t" .. table.concat(events, ",") .. "\\taux." .. k)
      end
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
-- One Set* call of a registered or held effect; an effect it keeps as its label object is held from then on
local function report(i, k, packed, owner)
  local object = k == "SetLabelObject" and packed[1]
  if object and getmetatable(object) == Effect and not registered[object] and not held[object] then
    heldCount = heldCount + 1
    held[object] = heldCount
    for _, set in ipairs(sets[object] or {}) do report("h" .. heldCount, set[1], set[2], owner) end
  end
  Debug.Message("RML-SET\\t" .. i .. "\\t" .. k .. "\\t" .. args(owner, packed, 1))
end
for k, f in pairs(Effect) do
  if type(f) == "function" and k:match("^Set") then
    Effect[k] = function(e, ...)
      sets[e] = sets[e] or {}
      table.insert(sets[e], { k, table.pack(...) })
      -- A call after the effect is registered (e1:SetLabelObject(e2) once both are) changes it all the same
      local i = registered[e] or (held[e] and "h" .. held[e])
      if i then report(i, k, table.pack(...), current) end
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
  registered[e] = index
  local owner = c:GetOriginalCode()
  current = owner
  for _, set in ipairs(sets[e] or {}) do report(index, set[1], set[2], owner) end
  -- A held effect registered after all (Genex Ally Reliever's): the held number is this index
  if held[e] then Debug.Message("RML-HELD\\t" .. held[e] .. "\\t" .. index) end
  Debug.Message("RML-SET\\t" .. index .. "\\tRegister\\t" .. (depth > 0 and setup or ""))
  return register(c, e, ...)
end
`;

/** One registered effect: its Set* calls in order, with their arguments as text. */
export interface RegisteredEffect {
  sets: [setter: string, args: string[]][];
  /** Never registered: kept in another effect's label object (the effect a grant gives). */
  held?: true;
  /** The aux function that registered it (aux.AddXyzProcedure, aux.EnableChangeCode), when the script didn't itself. */
  procedure?: string;
}

export interface Registration {
  /** The card's setup calls: [name, arguments as text]. */
  setup: [string, string][];
  /** The custom events aux.RegisterMergedDelayedEvent made, by code: the events they merge, and the aux function. */
  merged: Map<number, { events: number[]; via: string }>;
  /** Its effects by the order they were registered in, from 1, then the effects it only held. */
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
  const registration: Registration = { setup: [], merged: new Map(), effects: new Map() };
  const held = new Map<string, RegisteredEffect>();
  const heldAs = new Map<string, number>();
  for (const message of messages) {
    const [kind, a, b, c = ""] = message.split("\t");
    if (kind === "RML-SETUP") {
      registration.setup.push([a, b]);
      continue;
    }
    if (kind === "RML-HELD") {
      heldAs.set(a, Number(b));
      continue;
    }
    if (kind === "RML-MERGED") {
      registration.merged.set(Number(a), { events: b.split(",").map(Number), via: c });
      continue;
    }
    const effects: Map<string | number, RegisteredEffect> = a.startsWith("h") ? held : registration.effects;
    const key = a.startsWith("h") ? a.slice(1) : Number(a);
    const effect: RegisteredEffect = effects.get(key) ?? { sets: [] };
    effects.set(key, effect);
    if (b === "Register") effect.procedure = c || undefined;
    else effect.sets.push([b, c ? splitArgs(c) : []]);
  }
  // A held effect is named by its index: the one it was registered as, or one after the card's registered effects
  let next = registration.effects.size;
  for (const [number, effect] of held)
    if (!heldAs.has(number)) {
      heldAs.set(number, ++next);
      registration.effects.set(next, { ...effect, held: true });
    }
  for (const { sets } of registration.effects.values())
    for (const set of sets) set[1] = set[1].map((arg) => arg.replace(/^<held (\d+)>$/, (_, n) => `<effect ${heldAs.get(n)}>`));
  return registration;
}

/** Splits the hook's list of values at commas outside brackets: "aux.FilterBoolFunction(Card.IsType,8192),2" is two. */
export function splitArgs(text: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if ("({".includes(text[i])) depth++;
    else if (")}".includes(text[i])) depth--;
    else if (depth === 0 && text[i] === ",") {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (text.trim()) parts.push(text.slice(start).trim());
  return parts;
}
