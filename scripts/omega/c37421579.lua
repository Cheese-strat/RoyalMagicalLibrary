--Charubin the Fire Knight
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	aux.AddFusionProcCode2(c,36121917,96851799,true,true)
end
