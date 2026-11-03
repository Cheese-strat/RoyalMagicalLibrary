--Dragunity Knight - Gae Dearg
--written by RML from its description
local s,id=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	Synchro.AddProcedure(c,s.matfilter2,1,1,s.matfilter1,1,99)
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,0))
	e2:SetCategory(CATEGORY_TOHAND+CATEGORY_HANDES+CATEGORY_SEARCH)
	e2:SetType(EFFECT_TYPE_IGNITION)
	e2:SetRange(LOCATION_MZONE)
	e2:SetCountLimit(1)
	e2:SetTarget(s.tg2)
	e2:SetOperation(s.op2)
	c:RegisterEffect(e2)
end
function s.matfilter1(c,sc,st,tp)
	return c:IsNotTuner(sc,tp) and c:IsRace(RACE_WINGEDBEAST,sc,st,tp)
end
function s.matfilter2(c,sc,st,tp)
	return c:IsRace(RACE_DRAGON,sc,st,tp)
end
function s.filter3(c,e,tp)
	return c:IsRace(RACE_DRAGON+RACE_WINGEDBEAST) and c:IsLevelBelow(4) and c:IsAbleToHand()
end
function s.tg2(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.filter3,tp,LOCATION_DECK,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
	Duel.SetOperationInfo(0,CATEGORY_HANDES,nil,1,tp,0)
end
function s.filter4(c,e,tp)
	return c:IsRace(RACE_DRAGON+RACE_WINGEDBEAST)
end
function s.op2(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
	local g1=Duel.SelectMatchingCard(tp,s.filter3,tp,LOCATION_DECK,0,1,1,nil,e,tp)
	if #g1>0 then
		Duel.SendtoHand(g1,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,g1)
		Duel.BreakEffect()
		Duel.DiscardHand(tp,s.filter4,1,1,REASON_EFFECT+REASON_DISCARD,nil,e,tp)
	end
end
