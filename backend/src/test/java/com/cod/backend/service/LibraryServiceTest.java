package com.cod.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class LibraryServiceTest {

    @Test
    void parsesSingleDotRange() {
        assertEquals(List.of(2), LibraryService.allowedDotsFromRange("2"));
    }

    @Test
    void parsesBoundedDotRange() {
        assertEquals(List.of(1, 2, 3), LibraryService.allowedDotsFromRange("1-3"));
    }

    @Test
    void parsesSlashSeparatedDotRange() {
        assertEquals(List.of(1, 2, 4), LibraryService.allowedDotsFromRange("1/2/4"));
    }

    @Test
    void addsDisciplineToDisciplinePowers() {
        LibraryService service = new LibraryService(new ObjectMapper());

        Map<String, Object> power = service.vampireDisciplines().stream()
                .filter(entry -> "animalism-feral-whispers".equals(entry.get("id")))
                .findFirst()
                .orElseThrow();

        assertEquals("animalism", power.get("discipline"));
    }

    @Test
    void doesNotAddDisciplineToDevotions() {
        LibraryService service = new LibraryService(new ObjectMapper());

        Map<String, Object> power = service.vampireDisciplines().stream()
                .filter(entry -> "body-of-will".equals(entry.get("id")))
                .findFirst()
                .orElseThrow();

        assertFalse(power.containsKey("discipline"));
    }
}
