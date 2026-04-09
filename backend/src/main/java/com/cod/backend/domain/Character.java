package com.cod.backend.domain;

import jakarta.validation.constraints.NotBlank;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Character {
    public String id;
    @NotBlank
    public String name;
    public String player = "";
    public String chronicle = "";
    public String concept = "";
    public String virtue = "";
    public String vice = "";
    public String splat = "MORTAL";
    public Map<String, Integer> attributes = new HashMap<>();
    public Map<String, Integer> skills = new HashMap<>();
    public List<SkillSpecialty> specialties = new ArrayList<>();
    public List<Merit> merits = new ArrayList<>();
    public List<String> professionalTrainingSkills = new ArrayList<>();
    public List<CustomPower> customPowers = new ArrayList<>();
    public DerivedStats derivedStats = new DerivedStats();
    public Map<String, Object> splatData = new HashMap<>();
    public int experienceTotal = 0;
    public int experienceSpent = 0;
    public int beatsTotal = 0;
    public String notes = "";
    public String portraitUri;
    public long createdAt;
    public long updatedAt;
}
