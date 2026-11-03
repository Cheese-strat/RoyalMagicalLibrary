--Naturia Leodrake
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	aux.AddSynchroProcedure(c,s.matfilter1,aux.NonTuner(s.matfilter1),1)
end
function s.matfilter1(c)
	return c:IsAttribute(ATTRIBUTE_EARTH)
end
