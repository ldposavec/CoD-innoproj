package com.cod.backend.model;

import java.util.List;

public record LibraryPower(
        String id,
        String name,
        String type,
        String description,
        List<PowerDotLevel> dotLevels
) {
}
