package com.cod.backend.controller;

import com.cod.backend.domain.DiceEngine;
import com.cod.backend.domain.DiceRollRequest;
import com.cod.backend.domain.DiceRollResult;
import org.springframework.web.bind.annotation.*;

import java.util.Random;

@RestController
@RequestMapping("/api/dice")
public class DiceController {
    private final DiceEngine diceEngine = new DiceEngine(new Random());

    @PostMapping("/roll")
    public DiceRollResult roll(@RequestBody DiceRollRequest request) {
        return diceEngine.roll(request);
    }
}
