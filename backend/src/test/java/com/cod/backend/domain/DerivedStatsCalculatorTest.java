package com.cod.backend.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DerivedStatsCalculatorTest {

    @Test
    void calculatesDerivedStatsFromAttributesAndSkills() {
        Character character = new Character();
        character.name = "Test";
        character.attributes.put("strength", 3);
        character.attributes.put("dexterity", 2);
        character.attributes.put("stamina", 4);
        character.attributes.put("wits", 2);
        character.attributes.put("composure", 3);
        character.attributes.put("resolve", 2);
        character.skills.put("athletics", 2);

        DerivedStats stats = DerivedStatsCalculator.calculate(character);

        assertEquals(10, stats.speed);
        assertEquals(9, stats.healthMax);
        assertEquals(5, stats.willpowerMax);
        assertEquals(4, stats.defense);
    }
}
