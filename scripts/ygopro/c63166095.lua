--Sky Striker Mobilize - Engage!
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_TOHAND+CATEGORY_DRAW+CATEGORY_SEARCH)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetCondition(s.con1)
	e1:SetTarget(s.tg1)
	e1:SetOperation(s.op1)
	c:RegisterEffect(e1)
end
function s.filter1(c,e,tp)
	return c:GetSequence()<=4
end
function s.con1(e,tp,eg,ep,ev,re,r,rp)
	return not Duel.IsExistingMatchingCard(s.filter1,tp,LOCATION_MZONE,0,1,nil,e,tp)
end
function s.filter2(c,e,tp)
	return c:IsSetCard(0x115) and c:IsAbleToHand() and not c:IsCode(id)
end
function s.filter3(c,e,tp)
	return c:IsType(TYPE_SPELL)
end
function s.tg1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.filter2,tp,LOCATION_DECK,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,nil,1,tp,LOCATION_DECK)
	if Duel.IsExistingMatchingCard(s.filter3,tp,LOCATION_GRAVE,0,3,nil,e,tp) then
		Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,1)
	end
end
function s.op1(e,tp,eg,ep,ev,re,r,rp)
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_ATOHAND)
	local g1=Duel.SelectMatchingCard(tp,s.filter2,tp,LOCATION_DECK,0,1,1,nil,e,tp)
	if #g1>0 then
		Duel.SendtoHand(g1,nil,REASON_EFFECT)
		Duel.ConfirmCards(1-tp,g1)
		Duel.BreakEffect()
		if Duel.IsPlayerCanDraw(tp,1) then
			if Duel.IsExistingMatchingCard(s.filter3,tp,LOCATION_GRAVE,0,3,nil,e,tp) then
				if Duel.SelectYesNo(tp,aux.Stringid(id,0)) then
					Duel.Draw(tp,1,REASON_EFFECT)
				end
			end
		end
	end
end
