package com.cod.backend.service;

import com.cod.backend.model.Character;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CharacterService {

    private final ConcurrentHashMap<String, Character> characters = new ConcurrentHashMap<>();
    private final DerivedStatsService derivedStatsService;

    public CharacterService(DerivedStatsService derivedStatsService) {
        this.derivedStatsService = derivedStatsService;
    }

    public List<Character> list(String search, String sort) {
        String needle = search == null ? "" : search.trim().toLowerCase();
        List<Character> all = new ArrayList<>(characters.values()).stream()
                .filter(c -> needle.isBlank() || contains(c.name, needle) || contains(c.concept, needle))
                .toList();

        Comparator<Character> comparator = switch (sort == null ? "created" : sort) {
            case "name" -> Comparator.comparing(c -> nullSafe(c.name), String.CASE_INSENSITIVE_ORDER);
            case "splat" -> Comparator.comparing(c -> c.splat.name());
            default -> Comparator.comparingLong((Character c) -> c.createdAt).reversed();
        };

        return all.stream().sorted(comparator).toList();
    }

    public Character create(Character character) {
        long now = System.currentTimeMillis();
        character.id = UUID.randomUUID().toString();
        character.createdAt = now;
        character.updatedAt = now;
        normalize(character);
        characters.put(character.id, character);
        return character;
    }

    public Character get(String id) {
        Character character = characters.get(id);
        if (character == null) {
            throw new IllegalArgumentException("Character not found");
        }
        return character;
    }

    public Character update(String id, Character incoming) {
        Character existing = get(id);
        incoming.id = id;
        incoming.createdAt = existing.createdAt;
        incoming.updatedAt = System.currentTimeMillis();
        normalize(incoming);
        characters.put(id, incoming);
        return incoming;
    }

    public void delete(String id) {
        characters.remove(id);
    }

    private void normalize(Character character) {
        if (character.name == null || character.name.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        if (character.splat == null) {
            character.splat = com.cod.backend.model.Splat.MORTAL;
        }
        if (character.derivedStats == null) {
            character.derivedStats = new com.cod.backend.model.DerivedStats();
        }
        derivedStatsService.recalculate(character);
    }

    private boolean contains(String source, String needle) {
        return nullSafe(source).toLowerCase().contains(needle);
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
