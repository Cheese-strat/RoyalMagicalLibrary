--Humanoid Worm Drake
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	aux.AddFusionProcCode2(c,73216412,46821314,true,true)
end
