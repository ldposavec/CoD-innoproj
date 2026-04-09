package com.cod.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Service
public class LibraryService {
    private final List<Map<String, Object>> merits;
    private final List<Map<String, Object>> vampirePowers;
    private final Map<String, Object> skills;
    private final Map<String, Object> splatOptions;

    public LibraryService(ObjectMapper objectMapper) {
        this.merits = readList(objectMapper, "merits.json");
        this.vampirePowers = readList(objectMapper, "vampire_powers.json");
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
