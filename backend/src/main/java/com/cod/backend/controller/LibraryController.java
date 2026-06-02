package com.cod.backend.controller;

import com.cod.backend.service.LibraryService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
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

    @GetMapping("/skills")
    public Map<String, Object> skills() {
        return service.skills();
    }

    @GetMapping("/splat-options")
    public Map<String, Object> splatOptions() {
        return service.splatOptions();
    }
}
