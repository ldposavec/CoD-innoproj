package com.cod.backend.service;

import com.cod.backend.model.DiceRollRequest;
import com.cod.backend.model.DiceRollResponse;
import com.cod.backend.model.DiceRule;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

@Service
public class DiceService {
    private final SecureRandom random = new SecureRandom();

    public DiceRollResponse roll(DiceRollRequest request) {
        DiceRollResponse response = new DiceRollResponse();
        int poolSize = Math.max(0, request.poolSize);

        if (poolSize == 0 || request.chanceDie) {
            int die = d10();
            response.dice = List.of(die);
            response.successes = die == 10 ? 1 : 0;
            response.dramaticFailure = die == 1;
            response.exceptional = false;
            response.label = response.dramaticFailure ? "Dramatic Failure" : (response.successes > 0 ? "Success" : "Failure");
            return response;
        }

        List<Integer> dice = new ArrayList<>();
        for (int i = 0; i < poolSize; i++) {
            dice.add(d10());
        }

        if (request.roteQuality) {
            for (int i = 0; i < dice.size(); i++) {
                if (dice.get(i) < 8) {
                    dice.set(i, d10());
                }
            }
        }

        int successes = countSuccesses(dice);
        Integer explosionThreshold = explosionThreshold(request.rule);

        if (explosionThreshold != null) {
            List<Integer> explodeDice = dice.stream().filter(d -> d >= explosionThreshold).toList();
            while (!explodeDice.isEmpty()) {
                List<Integer> newDice = new ArrayList<>();
                for (int i = 0; i < explodeDice.size(); i++) {
                    newDice.add(d10());
                }
                dice.addAll(newDice);
                successes += countSuccesses(newDice);
                explodeDice = newDice.stream().filter(d -> d >= explosionThreshold).toList();
            }
        }

        response.dice = dice;
        response.successes = successes;
        response.exceptional = successes >= 5;
        response.dramaticFailure = false;
        response.label = response.exceptional ? "Exceptional Success" : (successes > 0 ? "Success" : "Failure");
        return response;
    }

    private int d10() {
        return random.nextInt(10) + 1;
    }

    private int countSuccesses(List<Integer> dice) {
        return (int) dice.stream().filter(d -> d >= 8).count();
    }

    private Integer explosionThreshold(DiceRule rule) {
        if (rule == null || rule == DiceRule.AGAIN_10) {
            return 10;
        }
        return switch (rule) {
            case AGAIN_9 -> 9;
            case AGAIN_8 -> 8;
            case NONE -> null;
            case AGAIN_10 -> 10;
        };
    }
}
