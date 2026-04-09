package com.cod.backend.service;

import com.cod.backend.model.Attributes;
import com.cod.backend.model.Character;
import com.cod.backend.model.DerivedStats;
import com.cod.backend.model.HealthStatus;
import com.cod.backend.model.Skills;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DerivedStatsService {

    public void recalculate(Character character) {
        Attributes a = character.attributes == null ? new Attributes() : character.attributes;
        Skills s = character.skills == null ? new Skills() : character.skills;
        DerivedStats d = character.derivedStats == null ? new DerivedStats() : character.derivedStats;

        d.speed = a.strength + a.dexterity + d.size + d.speedModifier;
        d.defense = Math.min(a.wits, a.dexterity) + s.athletics + d.defenseModifier;
        d.initiative = a.dexterity + a.composure + d.initiativeModifier;
        d.perception = a.wits + a.composure + d.perceptionModifier;
        d.healthMax = a.stamina + d.size + d.healthModifier;
        d.willpowerMax = a.resolve + a.composure + d.willpowerModifier;

        if (d.healthMax < 1) {
            d.healthMax = 1;
        }

        List<HealthStatus> old = d.healthBoxes == null ? List.of() : d.healthBoxes;
        List<HealthStatus> resized = new ArrayList<>();
        for (int i = 0; i < d.healthMax; i++) {
            resized.add(i < old.size() ? old.get(i) : HealthStatus.EMPTY);
        }
        d.healthBoxes = resized;

        character.attributes = a;
        character.skills = s;
        character.derivedStats = d;
    }
}
