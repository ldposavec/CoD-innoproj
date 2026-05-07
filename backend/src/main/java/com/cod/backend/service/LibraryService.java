package com.cod.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class LibraryService {
    private final List<Map<String, Object>> merits;
    private final List<Map<String, Object>> vampirePowers;
    private final Map<String, Object> skills;
    private final Map<String, Object> splatOptions;

    public LibraryService(ObjectMapper objectMapper) {
        this.merits = withAllowedDotsFromDotRange(readList(objectMapper, "merits.json"));
        this.vampirePowers = withDisciplineFromId(withAllowedDotsFromDotRange(readList(objectMapper, "vampire_powers.json")));
        this.skills = readMap(objectMapper, "skills.json");
        this.splatOptions = readMap(objectMapper, "splat_options.json");
    }

    public List<Map<String, Object>> merits() {
        return merits;
    }

    public List<Map<String, Object>> vampireDisciplines() {
        return vampirePowers;
    }

    public Map<String, Object> skills() {
        return skills;
    }

    public Map<String, Object> splatOptions() {
        return splatOptions;
    }

    private List<Map<String, Object>> withAllowedDotsFromDotRange(List<Map<String, Object>> entries) {
        for (Map<String, Object> entry : entries) {
            Object dotRange = entry.get("dotRange");
            if (dotRange instanceof String dotRangeValue && !dotRangeValue.isBlank()) {
                entry.put("allowedDots", allowedDotsFromRange(dotRangeValue));
            }
        }
        return entries;
    }

    private List<Map<String, Object>> withDisciplineFromId(List<Map<String, Object>> entries) {
        for (Map<String, Object> entry : entries) {
            Object type = entry.get("type");
            Object id = entry.get("id");
            if ("discipline".equals(type) && id instanceof String idValue) {
                int separatorIndex = idValue.indexOf('-');
                if (separatorIndex > 0) {
                    entry.put("discipline", idValue.substring(0, separatorIndex));
                }
            }
        }
        return entries;
    }

    static List<Integer> allowedDotsFromRange(String dotRange) {
        String normalizedRange = dotRange.trim();

        if (normalizedRange.contains("/")) {
            List<Integer> allowedDots = new ArrayList<>();
            for (String token : normalizedRange.split("/")) {
                allowedDots.add(parseDotValue(token));
            }
            return allowedDots;
        }

        if (normalizedRange.contains("-")) {
            String[] bounds = normalizedRange.split("-");
            if (bounds.length != 2) {
                throw new IllegalArgumentException("Invalid dotRange: " + dotRange);
            }
            int lowerBound = parseDotValue(bounds[0]);
            int upperBound = parseDotValue(bounds[1]);
            int start = Math.min(lowerBound, upperBound);
            int end = Math.max(lowerBound, upperBound);
            return IntStream.rangeClosed(start, end).boxed().collect(Collectors.toList());
        }

        return List.of(parseDotValue(normalizedRange));
    }

    private static int parseDotValue(String value) {
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Invalid dot value: " + value, exception);
        }
    }

    private List<Map<String, Object>> readList(ObjectMapper objectMapper, String resource) {
        try (InputStream inputStream = getClass().getClassLoader().getResourceAsStream(resource)) {
            if (inputStream == null) {
                throw new IllegalStateException("Missing resource: " + resource);
            }
            return objectMapper.readValue(inputStream, new TypeReference<>() {
            });
        } catch (IOException exception) {
            throw new IllegalStateException("Failed reading resource: " + resource, exception);
        }
    }

    private Map<String, Object> readMap(ObjectMapper objectMapper, String resource) {
        try (InputStream inputStream = getClass().getClassLoader().getResourceAsStream(resource)) {
            if (inputStream == null) {
                throw new IllegalStateException("Missing resource: " + resource);
            }
            return objectMapper.readValue(inputStream, new TypeReference<>() {
            });
        } catch (IOException exception) {
            throw new IllegalStateException("Failed reading resource: " + resource, exception);
        }
    }
}
