--The Law of the Normal
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_DESTROY+CATEGORY_HANDES_SELF+CATEGORY_HANDES_OPPO)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetCondition(s.con1)
	e1:SetTarget(s.tg1)
	e1:SetOperation(s.op1)
	c:RegisterEffect(e1)
end
function s.filter1(c,e,tp)
	return c:IsFaceup() and c:IsType(TYPE_NORMAL) and c:IsLevelBelow(2)
end
function s.con1(e,tp,eg,ep,ev,re,r,rp)
	return Duel.IsExistingMatchingCard(s.filter1,tp,LOCATION_MZONE,0,5,nil,e,tp)
end
function s.filter2(c,e,tp)
	return c~=e:GetHandler()
end
function s.filter3(c,e,tp)
	return c~=e:GetHandler() and not c:IsFaceup() and not c:IsType(TYPE_NORMAL) and not c:IsLevelBelow(2)
end
function s.filter4(c,e,tp)
	return not c:IsFaceup() and not c:IsType(TYPE_NORMAL) and not c:IsLevelBelow(2)
end
function s.tg1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.filter2,tp,LOCATION_HAND,0,1,nil,e,tp) and Duel.IsExistingMatchingCard(aux.TRUE,tp,0,LOCATION_HAND,1,nil,e,tp) and Duel.IsExistingMatchingCard(s.filter3,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_HANDES_SELF,nil,0,tp,1)
	Duel.SetOperationInfo(0,CATEGORY_HANDES_OPPO,nil,0,tp,1)
	local sg1=Duel.GetMatchingGroup(s.filter4,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil,e,tp)
	Duel.SetOperationInfo(0,CATEGORY_DESTROY,sg1,#sg1,0,0)
end
function s.op1(e,tp,eg,ep,ev,re,r,rp)
	local g1=Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_HAND,LOCATION_HAND,nil,e,tp)
	Duel.SendtoGrave(g1,REASON_EFFECT+REASON_DISCARD)
	local g2=Duel.GetMatchingGroup(s.filter4,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil,e,tp)
	Duel.Destroy(g2,REASON_EFFECT)
end
