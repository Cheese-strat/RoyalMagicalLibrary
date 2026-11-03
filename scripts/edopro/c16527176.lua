--Naturia Leodrake
--written by RML from its description
local s,id=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	Synchro.AddProcedure(c,s.matfilter2,1,1,s.matfilter1,1,99)
end
function s.matfilter1(c,sc,st,tp)
	return c:IsNotTuner(sc,tp) and c:IsAttribute(ATTRIBUTE_EARTH,sc,st,tp)
end
function s.matfilter2(c,sc,st,tp)
	return c:IsAttribute(ATTRIBUTE_EARTH,sc,st,tp)
end
