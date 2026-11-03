--Bracchio-raidus
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	aux.AddFusionProcCode2(c,94119974,38289717,true,true)
end
