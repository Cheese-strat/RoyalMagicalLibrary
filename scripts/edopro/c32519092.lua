--Monk of the Tenyi
--written by RML from its description
local s,id=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	Link.AddProcedure(c,s.matfilter1,1,1)
end
function s.matfilter1(c,sc,st,tp)
	return c:IsSetCard(0x12c,sc,st,tp) and not c:IsType(TYPE_LINK,sc,st,tp)
end
