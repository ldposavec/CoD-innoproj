package com.cod.backend.service;

import com.cod.backend.domain.Character;
import com.cod.backend.domain.DerivedStatsCalculator;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CharacterService {
    private final Map<String, Character> store = new ConcurrentHashMap<>();

    public List<Character> findAll() {
        return store.values().stream()
            .sorted(Comparator.comparingLong((Character c) -> c.updatedAt).reversed())
            .toList();
    }

    public Character findById(String id) {
        return store.get(id);
    }

    public Character create(Character character) {
        long now = System.currentTimeMillis();
        character.id = UUID.randomUUID().toString();
        character.createdAt = now;
        character.updatedAt = now;
        normalize(character);
        store.put(character.id, character);
        return character;
    }

    public Character update(String id, Character update) {
        Character existing = store.get(id);
        if (existing == null) {
            return null;
        }
        update.id = id;
        update.createdAt = existing.createdAt;
        update.updatedAt = System.currentTimeMillis();
        normalize(update);
        store.put(id, update);
        return update;
    }

    public boolean delete(String id) {
        return store.remove(id) != null;
    }

    private void normalize(Character character) {
        if (character.attributes == null) {
            character.attributes = new ConcurrentHashMap<>();
        }
        if (character.skills == null) {
            character.skills = new ConcurrentHashMap<>();
        }
        if (character.specialties == null) {
            character.specialties = new ArrayList<>();
        }
        if (character.merits == null) {
            character.merits = new ArrayList<>();
        }
        if (character.professionalTrainingSkills == null) {
            character.professionalTrainingSkills = new ArrayList<>();
        }
        if (character.customPowers == null) {
            character.customPowers = new ArrayList<>();
        }
        if (character.splatData == null) {
            character.splatData = new ConcurrentHashMap<>();
        }
        character.derivedStats = DerivedStatsCalculator.calculate(character);
    }
}
