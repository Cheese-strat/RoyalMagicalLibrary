--Monk of the Tenyi
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	aux.AddLinkProcedure(c,s.matfilter1,1,1)
end
function s.matfilter1(c)
	return c:IsLinkSetCard(0x12c) and not c:IsLinkType(TYPE_LINK)
end
