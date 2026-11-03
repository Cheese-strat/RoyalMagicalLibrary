--Morphing Jar
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_HANDES_SELF+CATEGORY_DRAW+CATEGORY_HANDES_OPPO)
	e1:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_FLIP)
	e1:SetTarget(s.tg1)
	e1:SetOperation(s.op1)
	c:RegisterEffect(e1)
end
function s.tg1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return true end
	Duel.SetOperationInfo(0,CATEGORY_HANDES_SELF,nil,0,tp,0)
	Duel.SetOperationInfo(0,CATEGORY_HANDES_OPPO,nil,0,tp,0)
	Duel.SetOperationInfo(0,CATEGORY_DRAW,nil,0,tp,5)
end
function s.op1(e,tp,eg,ep,ev,re,r,rp)
	local g1=Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_HAND,LOCATION_HAND,nil,e,tp)
	if #g1>0 then
		Duel.SendtoGrave(g1,REASON_DISCARD+REASON_EFFECT)
	end
	Duel.BreakEffect()
	Duel.Draw(tp,5,REASON_EFFECT)
	Duel.Draw(1-tp,5,REASON_EFFECT)
end
