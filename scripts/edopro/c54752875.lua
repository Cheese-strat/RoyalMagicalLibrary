--Twin-Headed Thunder Dragon
--written by RML from its description
local s,id=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	Fusion.AddProcMixN(c,true,true,31786629,2)
end
