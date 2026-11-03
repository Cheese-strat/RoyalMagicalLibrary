--Lady Ninja Yae
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_TOHAND)
	e1:SetType(EFFECT_TYPE_IGNITION)
	e1:SetRange(LOCATION_MZONE)
	e1:SetCost(s.cost1)
	e1:SetTarget(s.tg1)
	e1:SetOperation(s.op1)
	c:RegisterEffect(e1)
end
function s.filter1(c,e,tp)
	return c:IsAttribute(ATTRIBUTE_WIND) and c:IsDiscardable() and c:IsAbleToGraveAsCost()
end
function s.cost1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return true end
	Duel.DiscardHand(tp,s.filter1,1,1,REASON_COST+REASON_DISCARD,nil,e,tp)
end
function s.filter2(c,e,tp)
	return c~=e:GetHandler() and c:IsAttribute(ATTRIBUTE_WIND) and c:IsDiscardable(REASON_EFFECT) and c:IsAbleToGraveAsCost()
end
function s.filter3(c,e,tp)
	return c:IsType(TYPE_SPELL+TYPE_TRAP) and c:IsAbleToHand()
end
function s.tg1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.filter2,tp,LOCATION_HAND,0,1,nil,e,tp) and Duel.IsExistingMatchingCard(s.filter3,tp,0,LOCATION_ONFIELD,1,nil,e,tp) end
	local sg1=Duel.GetMatchingGroup(s.filter3,tp,0,LOCATION_ONFIELD,nil,e,tp)
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,sg1,#sg1,0,0)
end
function s.op1(e,tp,eg,ep,ev,re,r,rp)
	local g2=Duel.GetMatchingGroup(s.filter3,tp,0,LOCATION_ONFIELD,nil,e,tp)
	Duel.SendtoHand(g2,nil,REASON_EFFECT)
end
