--Gem-Knight Zirconia
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	aux.AddFusionProcMix(c,false,true,s.matfilter1,s.matfilter2)
end
function s.matfilter1(c)
	return c:IsFusionSetCard(0x1047)
end
function s.matfilter2(c)
	return c:IsRace(RACE_ROCK)
end
