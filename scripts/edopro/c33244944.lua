--Contract with Exodia
--written by RML from its description
local s,id=GetID()
function s.initial_effect(c)
	local e1=Effect.CreateEffect(c)
	e1:SetCategory(CATEGORY_SPECIAL_SUMMON)
	e1:SetType(EFFECT_TYPE_ACTIVATE)
	e1:SetCode(EVENT_FREE_CHAIN)
	e1:SetCondition(s.con1)
	e1:SetTarget(s.tg1)
	e1:SetOperation(s.op1)
	c:RegisterEffect(e1)
end
function s.filter1(c,e,tp)
	return c:IsCode(8124921)
end
function s.filter2(c,e,tp)
	return c:IsCode(44519536)
end
function s.filter3(c,e,tp)
	return c:IsCode(70903634)
end
function s.filter4(c,e,tp)
	return c:IsCode(7902349)
end
function s.filter5(c,e,tp)
	return c:IsCode(33396948)
end
function s.con1(e,tp,eg,ep,ev,re,r,rp)
	return Duel.IsExistingMatchingCard(s.filter1,tp,LOCATION_GRAVE,0,1,nil,e,tp) and Duel.IsExistingMatchingCard(s.filter2,tp,LOCATION_GRAVE,0,1,nil,e,tp) and Duel.IsExistingMatchingCard(s.filter3,tp,LOCATION_GRAVE,0,1,nil,e,tp) and Duel.IsExistingMatchingCard(s.filter4,tp,LOCATION_GRAVE,0,1,nil,e,tp) and Duel.IsExistingMatchingCard(s.filter5,tp,LOCATION_GRAVE,0,1,nil,e,tp)
end
function s.filter6(c,e,tp)
	return c:IsCode(12600382) and c:IsCanBeSpecialSummoned(e,0,tp,true,true)
end
function s.tg1(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return Duel.GetLocationCount(tp,LOCATION_MZONE)>0 and Duel.IsExistingMatchingCard(s.filter6,tp,LOCATION_HAND,0,1,nil,e,tp) end
	Duel.SetOperationInfo(0,CATEGORY_SPECIAL_SUMMON,nil,1,tp,LOCATION_HAND)
end
function s.op1(e,tp,eg,ep,ev,re,r,rp)
	if Duel.GetLocationCount(tp,LOCATION_MZONE)>0 then
		Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
		local g1=Duel.SelectMatchingCard(tp,s.filter6,tp,LOCATION_HAND,0,1,1,nil,e,tp)
		if #g1>0 then
			Duel.SpecialSummon(g1,0,tp,tp,true,true,POS_FACEUP)
		end
	end
end
