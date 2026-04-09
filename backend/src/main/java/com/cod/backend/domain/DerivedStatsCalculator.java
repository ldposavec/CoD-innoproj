package com.cod.backend.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class DerivedStatsCalculator {
    private DerivedStatsCalculator() {
    }

    public static DerivedStats calculate(Character character) {
        DerivedStats current = character.derivedStats == null ? new DerivedStats() : character.derivedStats;
        int size = current.size <= 0 ? 5 : current.size;

        int strength = value(character.attributes, "strength", 1);
        int dexterity = value(character.attributes, "dexterity", 1);
        int stamina = value(character.attributes, "stamina", 1);
        int composure = value(character.attributes, "composure", 1);
        int resolve = value(character.attributes, "resolve", 1);
        int wits = value(character.attributes, "wits", 1);
        int athletics = value(character.skills, "athletics", 0);

        DerivedStats result = new DerivedStats();
        result.size = size;
        result.speedModifier = current.speedModifier;
        result.defenseModifier = current.defenseModifier;
        result.initiativeModifier = current.initiativeModifier;
        result.perceptionModifier = current.perceptionModifier;
        result.healthModifier = current.healthModifier;
        result.willpowerModifier = current.willpowerModifier;
        result.willpowerSpent = Math.max(0, current.willpowerSpent);

        result.speed = strength + dexterity + size + result.speedModifier;
        result.defense = Math.min(wits, dexterity) + athletics + result.defenseModifier;
        result.initiative = dexterity + composure + result.initiativeModifier;
        result.perception = wits + composure + result.perceptionModifier;
        result.healthMax = Math.max(1, stamina + size + result.healthModifier);
        result.willpowerMax = Math.max(1, resolve + composure + result.willpowerModifier);

        List<String> existing = current.healthBoxes == null ? List.of() : current.healthBoxes;
        result.healthBoxes = new ArrayList<>();
        for (int i = 0; i < result.healthMax; i++) {
            result.healthBoxes.add(i < existing.size() ? existing.get(i) : "EMPTY");
        }

        if (result.willpowerSpent > result.willpowerMax) {
            result.willpowerSpent = result.willpowerMax;
        }

        return result;
    }

    private static int value(Map<String, Integer> map, String key, int defaultValue) {
        if (map == null) {
            return defaultValue;
        }
        Integer value = map.get(key);
        return value == null ? defaultValue : value;
    }
}
