--Malevolent Catastrophe
--written by RML from its description
local s,id=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_DESTROY)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_ATTACK_ANNOUNCE)
	e1:SetCondition(s.con1)
	e1:SetTarget(s.tg1)
	e1:SetOperation(s.op1)
	c:RegisterEffect(e1)
end
function s.con1(e,tp,eg,ep,ev,re,r,rp)
	return Duel.GetTurnPlayer()==1-tp
end
function s.filter1(c,e,tp)
	return c~=e:GetHandler() and c:IsType(TYPE_SPELL+TYPE_TRAP)
end
function s.tg1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.IsExistingMatchingCard(s.filter1,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,1,nil,e,tp) end
	local sg1=Duel.GetMatchingGroup(s.filter1,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil,e,tp)
	Duel.SetOperationInfo(0,CATEGORY_DESTROY,sg1,#sg1,0,0)
end
function s.op1(e,tp,eg,ep,ev,re,r,rp)
	local g1=Duel.GetMatchingGroup(s.filter1,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil,e,tp)
	Duel.Destroy(g1,REASON_EFFECT)
end
