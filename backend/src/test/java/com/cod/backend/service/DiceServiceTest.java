package com.cod.backend.service;

import com.cod.backend.model.DiceRollRequest;
import com.cod.backend.model.DiceRule;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DiceServiceTest {

    private final DiceService service = new DiceService();

    @Test
    void chanceDieRollReturnsSingleDie() {
        DiceRollRequest request = new DiceRollRequest();
        request.poolSize = 0;
        request.chanceDie = true;

        var response = service.roll(request);

        assertEquals(1, response.dice.size());
        assertTrue(response.successes == 0 || response.successes == 1);
    }

    @Test
    void regularRollNeverNegativeSuccesses() {
        DiceRollRequest request = new DiceRollRequest();
        request.poolSize = 8;
        request.rule = DiceRule.AGAIN_10;

        var response = service.roll(request);

        assertFalse(response.dice.isEmpty());
        assertTrue(response.successes >= 0);
    }
}
