package com.cod.backend.controller;

import com.cod.backend.model.Character;
import com.cod.backend.service.CharacterService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/characters")
public class CharacterController {

    private final CharacterService characterService;

    public CharacterController(CharacterService characterService) {
        this.characterService = characterService;
    }

    @GetMapping
    public List<Character> list(@RequestParam(required = false) String search,
                                @RequestParam(required = false) String sort) {
        return characterService.list(search, sort);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Character create(@RequestBody Character character) {
        return characterService.create(character);
    }

    @GetMapping("/{id}")
    public Character get(@PathVariable String id) {
        return characterService.get(id);
    }

    @PutMapping("/{id}")
    public Character update(@PathVariable String id, @RequestBody Character character) {
        return characterService.update(id, character);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        characterService.delete(id);
    }
}
