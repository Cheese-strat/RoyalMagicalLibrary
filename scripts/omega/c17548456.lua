--Jurrac Meteor
--written by RML from its description
local s,id,o=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	aux.AddSynchroProcedure(c,s.matfilter2,aux.NonTuner(s.matfilter1),2)
	local e2=Effect.CreateEffect(c)
	e2:SetDescription(aux.Stringid(id,0))
	e2:SetCategory(CATEGORY_DESTROY+CATEGORY_SPECIAL_SUMMON+CATEGORY_GRAVE_SPSUMMON)
	e2:SetType(EFFECT_TYPE_SINGLE+EFFECT_TYPE_TRIGGER_F)
	e2:SetCode(EVENT_SPSUMMON_SUCCESS)
	e2:SetCondition(s.con2)
	e2:SetTarget(s.tg2)
	e2:SetOperation(s.op2)
	c:RegisterEffect(e2)
end
function s.matfilter1(c)
	return c:IsRace(RACE_DINOSAUR)
end
function s.matfilter2(c)
	return c:IsSetCard(0x22)
end
function s.con2(e,tp,eg,ep,ev,re,r,rp)
	return e:GetHandler():IsSummonType(SUMMON_TYPE_SYNCHRO)
end
function s.tg2(e,tp,eg,ep,ev,re,r,rp,chk)
	if chk==0 then return true end
	local sg1=Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil,e,tp)
	Duel.SetOperationInfo(0,CATEGORY_DESTROY,sg1,#sg1,0,0)
end
function s.filter3(c,e,tp)
	return c:IsType(TYPE_TUNER) and c:IsCanBeSpecialSummoned(e,0,tp,false,false)
end
function s.op2(e,tp,eg,ep,ev,re,r,rp)
	local g1=Duel.GetMatchingGroup(aux.TRUE,tp,LOCATION_ONFIELD,LOCATION_ONFIELD,nil,e,tp)
	if #g1>0 then
		if Duel.Destroy(g1,REASON_EFFECT)>0 then
			Duel.BreakEffect()
			if Duel.IsExistingMatchingCard(aux.NecroValleyFilter(s.filter3),tp,LOCATION_GRAVE,0,1,nil,e,tp) then
				if Duel.SelectYesNo(tp,aux.Stringid(id,1)) then
					Duel.Hint(HINT_SELECTMSG,tp,HINTMSG_SPSUMMON)
					local g2=Duel.SelectMatchingCard(tp,aux.NecroValleyFilter(s.filter3),tp,LOCATION_GRAVE,0,1,1,nil,e,tp)
					Duel.SpecialSummon(g2,0,tp,tp,false,false,POS_FACEUP)
				end
			end
		end
	end
end
