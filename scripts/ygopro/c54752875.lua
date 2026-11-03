--Twin-Headed Thunder Dragon
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	aux.AddFusionProcCodeRep(c,31786629,2,true,true)
end
