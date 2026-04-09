package com.cod.backend.service;

import com.cod.backend.model.Character;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DerivedStatsServiceTest {

    private final DerivedStatsService service = new DerivedStatsService();

    @Test
    void calculatesCoreStats() {
        Character character = new Character();
        character.name = "Test";
        character.attributes.strength = 3;
        character.attributes.dexterity = 2;
        character.attributes.stamina = 3;
        character.attributes.wits = 2;
        character.attributes.resolve = 2;
        character.attributes.composure = 3;
        character.skills.athletics = 2;

        service.recalculate(character);

        assertEquals(10, character.derivedStats.speed);
        assertEquals(4, character.derivedStats.defense);
        assertEquals(5, character.derivedStats.initiative);
        assertEquals(5, character.derivedStats.perception);
        assertEquals(8, character.derivedStats.healthMax);
        assertEquals(5, character.derivedStats.willpowerMax);
    }
}
