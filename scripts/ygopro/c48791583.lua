--Invoked Magellanica
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	aux.AddFusionProcMix(c,true,true,86120751,s.matfilter1)
end
function s.matfilter1(c)
	return c:IsFusionAttribute(ATTRIBUTE_EARTH)
end
