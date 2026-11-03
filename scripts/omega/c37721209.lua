--Levia-Dragon - Daedalus
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_DESTROY)
	e1:SetType(EFFECT_TYPE_IGNITION)
	e1:SetRange(LOCATION_MZONE)
	e1:SetCost(s.cost1)
	e1:SetTarget(s.tg1)
	e1:SetOperation(s.op1)
	c:RegisterEffect(e1)
end
function s.filter1(c,e,tp)
	return c:IsFaceup() and c:IsCode(22702055) and c:IsAbleToGraveAsCost()
end
function s.cost1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.filter1,tp,LOCATION_ONFIELD,0,1,nil,e,tp) end
	Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_TOGRAVE)
	local g1=Duel.SelectMatchingCard(tp,s.filter1,tp,LOCATION_ONFIELD,0,1,1,nil,e,tp)
	Duel.SendtoGrave(g1,REASON_COST)
end
function s.filter2(c,e,tp)
	return c~=e:GetHandler()
end
function s.tg1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.filter2,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil,e,tp) end
	local sg1=Duel.GetMatchingGroup(s.filter2,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil,e,tp)
	Duel.SetOperationInfo(0,CATEGORY_DESTROY,sg1,#sg1,0,0)
end
function s.op1(e,tp,eg,ep,ev,re,r,rp)
	local g2=Duel.GetMatchingGroup(s.filter2,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil,e,tp)
	Duel.Destroy(g2,REASON_EFFECT)
end
