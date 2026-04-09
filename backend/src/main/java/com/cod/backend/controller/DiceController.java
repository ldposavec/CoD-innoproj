package com.cod.backend.controller;

import com.cod.backend.model.DiceRollRequest;
import com.cod.backend.model.DiceRollResponse;
import com.cod.backend.service.DiceService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dice")
public class DiceController {

    private final DiceService diceService;

    public DiceController(DiceService diceService) {
        this.diceService = diceService;
    }

    @PostMapping("/roll")
    public DiceRollResponse roll(@RequestBody DiceRollRequest request) {
        return diceService.roll(request);
    }
}
