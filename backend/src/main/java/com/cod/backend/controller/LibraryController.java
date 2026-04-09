package com.cod.backend.controller;

import com.cod.backend.service.LibraryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/libraries")
public class LibraryController {
    private final LibraryService service;

    public LibraryController(LibraryService service) {
        this.service = service;
    }

    @GetMapping("/merits")
    public List<Map<String, Object>> merits() {
        return service.merits();
    }

    @GetMapping("/vampire-disciplines")
    public List<Map<String, Object>> vampireDisciplines() {
        return service.vampireDisciplines();
    }
}
