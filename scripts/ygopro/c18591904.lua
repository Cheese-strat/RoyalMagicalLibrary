--Final Destiny
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_DESTROY)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetCost(s.cost1)
	e1:SetTarget(s.tg1)
	e1:SetOperation(s.op1)
	c:RegisterEffect(e1)
end
function s.filter1(c,e,tp)
	return c:IsDiscardable()
end
function s.cost1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return true end
	Duel.DiscardHand(tp,s.filter1,5,5,REASON_COST+REASON_DISCARD,nil,e,tp)
end
function s.filter2(c,e,tp)
	return c~=e:GetHandler() and c:IsDiscardable(REASON_EFFECT)
end
function s.filter3(c,e,tp)
	return c~=e:GetHandler()
end
function s.tg1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.filter2,tp,LOCATION_HAND,0,5,nil,e,tp) and Duel.IsExistingMatchingCard(s.filter3,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil,e,tp) end
	local sg1=Duel.GetMatchingGroup(s.filter3,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil,e,tp)
	Duel.SetOperationInfo(0,CATEGORY_DESTROY,sg1,#sg1,0,0)
end
function s.op1(e,tp,eg,ep,ev,re,r,rp)
	local g2=Duel.GetMatchingGroup(s.filter3,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil,e,tp)
	Duel.Destroy(g2,REASON_EFFECT)
end
