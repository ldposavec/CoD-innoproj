package com.cod.backend.domain;

import java.util.ArrayList;
import java.util.List;

public class DiceRollResult {
    public List<Integer> dice = new ArrayList<>();
    public int successes;
    public boolean exceptional;
    public boolean dramaticFailure;
}
