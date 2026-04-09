package com.cod.backend.model;

import java.util.ArrayList;
import java.util.List;

public class DiceRollResponse {
    public List<Integer> dice = new ArrayList<>();
    public int successes;
    public boolean exceptional;
    public boolean dramaticFailure;
    public String label;
}
