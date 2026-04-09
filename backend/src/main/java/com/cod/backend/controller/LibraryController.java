package com.cod.backend.controller;

import com.cod.backend.model.LibraryMerit;
import com.cod.backend.model.LibraryPower;
import com.cod.backend.service.LibraryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/libraries")
public class LibraryController {

    private final LibraryService libraryService;

    public LibraryController(LibraryService libraryService) {
        this.libraryService = libraryService;
    }

    @GetMapping("/merits")
    public List<LibraryMerit> merits() {
        return libraryService.merits();
    }

    @GetMapping("/vampire-powers")
    public List<LibraryPower> vampirePowers() {
        return libraryService.vampirePowers();
    }
}
