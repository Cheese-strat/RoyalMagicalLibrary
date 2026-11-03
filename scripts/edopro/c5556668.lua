--Exchange
--written by RML from its description
local s,id=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetTarget(s.tg1)
	e1:SetOperation(s.op1)
	c:RegisterEffect(e1)
end
function s.filter1(c,e,tp)
	return c~=e:GetHandler()
end
function s.tg1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(aux.TRUE,tp,0,LOCATION_HAND,1,nil,e,tp) and Duel.IsExistingMatchingCard(s.filter1,tp,LOCATION_HAND,0,1,nil,e,tp) end
end
function s.op1(e,tp,eg,ep,ev,re,r,rp)
	local g2=Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_HAND,0,nil,e,tp)
	local g1=Duel.GetMatchingGroup(aux.TRUE,tp,0,LOCATION_HAND,nil,e,tp)
	if not (not (#g2>0) or not (#g1>0)) then
		Duel.ConfirmCards(tp,g1)
		Duel.ConfirmCards(1-tp,g2)
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
		local g3=Duel.SelectMatchingCard(tp,aux.TRUE,tp,0,LOCATION_HAND,1,1,nil,e,tp)
		Duel.SendtoHand(g3,tp,REASON_EFFECT)
		Duel.Hint(HINT_SELECTMSG,1-tp,HINTMSG_ATOHAND)
		local g4=Duel.SelectMatchingCard(1-tp,aux.TRUE,tp,LOCATION_HAND,0,1,1,nil,e,tp)
		Duel.SendtoHand(g4,1-tp,REASON_EFFECT)
	end
end
