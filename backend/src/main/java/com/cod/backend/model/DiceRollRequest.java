package com.cod.backend.model;

public class DiceRollRequest {
    public int poolSize;
    public DiceRule rule = DiceRule.AGAIN_10;
    public boolean roteQuality;
    public boolean chanceDie;
}
