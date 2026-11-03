--Stinging Swordsman
--written by RML from its description
local s,id=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetDescription(aux.Stringid(id,0))
	e1:SetCategory(CATEGORY_TOHAND)
	e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
	e1:SetCode(EVENT_BATTLE_DAMAGE)
	e1:SetCondition(s.con1)
	e1:SetTarget(s.tg1)
	e1:SetOperation(s.op1)
	c:RegisterEffect(e1)
end
function s.con1(e,tp,eg,ep,ev,re,r,rp)
	return ep==1-tp
end
function s.filter1(c,e,tp)
	return c:IsFaceup() and c:GetSequence()<=4
end
function s.tg1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return true end
	local sg1=Duel.GetMatchingGroup(s.filter1,tp,0,LOCATION_SZONE,nil,e,tp)
	Duel.SetOperationInfo(0,CATEGORY_TOHAND,sg1,#sg1,0,0)
end
function s.op1(e,tp,eg,ep,ev,re,r,rp)
	local g1=Duel.GetMatchingGroup(s.filter1,tp,0,LOCATION_SZONE,nil,e,tp)
	Duel.SendtoHand(g1,nil,REASON_EFFECT)
end
