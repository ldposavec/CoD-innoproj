package com.cod.backend.model;

import java.util.List;

public record LibraryMerit(
        String id,
        String name,
        String category,
        List<Integer> allowedDots,
        String description,
        String prerequisites
) {
}
