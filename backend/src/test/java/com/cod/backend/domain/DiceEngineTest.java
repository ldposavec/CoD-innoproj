package com.cod.backend.domain;

import org.junit.jupiter.api.Test;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

class DiceEngineTest {

    @Test
    void chanceDieCanDramaticFail() {
        DiceEngine engine = new DiceEngine(new Random(9));
        DiceRollRequest request = new DiceRollRequest();
        request.poolSize = 0;
        request.chanceDie = true;

        DiceRollResult result = engine.roll(request);

        assertEquals(1, result.dice.size());
        assertFalse(result.exceptional);
    }

    @Test
    void regularRollReturnsDiceAndSuccesses() {
        DiceEngine engine = new DiceEngine(new Random(42));
        DiceRollRequest request = new DiceRollRequest();
        request.poolSize = 5;
        request.rule = "10again";

        DiceRollResult result = engine.roll(request);

        assertTrue(result.dice.size() >= 5);
        assertTrue(result.successes >= 0);
    }
}
