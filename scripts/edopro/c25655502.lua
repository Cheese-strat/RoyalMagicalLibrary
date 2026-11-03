--Bickuribox
--written by RML from its description
local s,id=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	Fusion.AddProcMix(c,true,true,93889755,13215230)
end
