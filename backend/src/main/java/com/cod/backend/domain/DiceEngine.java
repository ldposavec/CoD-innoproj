package com.cod.backend.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class DiceEngine {
    private final Random random;

    public DiceEngine(Random random) {
        this.random = random;
    }

    public DiceRollResult roll(DiceRollRequest request) {
        DiceRollResult result = new DiceRollResult();
        if (request.poolSize <= 0 || request.chanceDie) {
            int die = rollDie();
            result.dice = List.of(die);
            result.successes = die == 10 ? 1 : 0;
            result.dramaticFailure = die == 1;
            result.exceptional = false;
            return result;
        }

        List<Integer> dice = new ArrayList<>();
        for (int i = 0; i < request.poolSize; i++) {
            dice.add(rollDie());
        }

        if (request.roteQuality) {
            for (int i = 0; i < dice.size(); i++) {
                if (dice.get(i) < 8) {
                    dice.set(i, rollDie());
                }
            }
        }

        int threshold = explosionThreshold(request.rule);
        int successes = (int) dice.stream().filter(d -> d >= 8).count();

        if (threshold > 0) {
            List<Integer> explodeDice = dice.stream().filter(d -> d >= threshold).toList();
            while (!explodeDice.isEmpty()) {
                List<Integer> newDice = new ArrayList<>();
                for (int i = 0; i < explodeDice.size(); i++) {
                    newDice.add(rollDie());
                }
                dice.addAll(newDice);
                successes += (int) newDice.stream().filter(d -> d >= 8).count();
                explodeDice = newDice.stream().filter(d -> d >= threshold).toList();
            }
        }

        result.dice = dice;
        result.successes = successes;
        result.exceptional = successes >= 5;
        result.dramaticFailure = false;
        return result;
    }

    private int explosionThreshold(String rule) {
        if (rule == null) {
            return 10;
        }
        return switch (rule) {
            case "8again" -> 8;
            case "9again" -> 9;
            case "none" -> -1;
            default -> 10;
        };
    }

    private int rollDie() {
        return random.nextInt(10) + 1;
    }
}
