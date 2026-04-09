package com.cod.backend.controller;

import com.cod.backend.domain.Character;
import com.cod.backend.service.CharacterService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/characters")
public class CharacterController {
    private final CharacterService service;

    public CharacterController(CharacterService service) {
        this.service = service;
    }

    @GetMapping
    public List<Character> all() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Character one(@PathVariable String id) {
        Character character = service.findById(id);
        if (character == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found");
        }
        return character;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Character create(@Valid @RequestBody Character character) {
        return service.create(character);
    }

    @PutMapping("/{id}")
    public Character update(@PathVariable String id, @Valid @RequestBody Character character) {
        Character updated = service.update(id, character);
        if (updated == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found");
        }
        return updated;
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        if (!service.delete(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found");
        }
    }
}
