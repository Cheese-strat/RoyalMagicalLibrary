--Invoked Magellanica
--written by RML from its description
local s,id=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	Fusion.AddProcMix(c,true,true,86120751,s.matfilter1)
end
function s.matfilter1(c,sc,st,tp)
	return c:IsAttribute(ATTRIBUTE_EARTH,sc,st,tp)
end
