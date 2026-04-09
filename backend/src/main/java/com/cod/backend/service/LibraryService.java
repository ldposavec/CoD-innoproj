package com.cod.backend.service;

import com.cod.backend.model.LibraryMerit;
import com.cod.backend.model.LibraryPower;
import com.cod.backend.model.PowerDotLevel;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class LibraryService {

    private final List<LibraryMerit> merits = new ArrayList<>();
    private final List<LibraryPower> vampirePowers = new ArrayList<>();

    public LibraryService() {
        seedMerits();
        seedPowers();
    }

    public List<LibraryMerit> merits() {
        return merits;
    }

    public List<LibraryPower> vampirePowers() {
        return vampirePowers;
    }

    private void seedMerits() {
        merits.add(new LibraryMerit("direction-sense", "Direction Sense", "Mental", List.of(1, 2, 3, 4, 5),
                "Your character has an innate sense of direction and can always find north. Grants +2 on all navigation or orientation rolls.", ""));
        merits.add(new LibraryMerit("resources", "Resources", "Social", List.of(1, 2, 3, 4, 5),
                "Wealth and disposable income. Represents your access to funds, properties, and equipment without making individual rolls.", ""));
        merits.add(new LibraryMerit("kung-fu", "Kung Fu", "Fighting", List.of(1, 2, 3, 4, 5),
                "A disciplined martial art focus. Dots grant maneuvers: Focused Attack, Iron Skin, and Whirlwind Strike.", "Requires Athletics ••"));
        merits.add(new LibraryMerit("blood-potency", "Blood Potency", "Supernatural", List.of(1, 2, 3, 4, 5),
                "Represents the sheer power of the vampire's Vitae. Increases your maximum Vitae pool and the amount of Vitae you can spend per turn.", "Vampire"));
        merits.add(new LibraryMerit("eidetic-memory", "Eidetic Memory", "Mental", List.of(1, 2, 3, 4, 5),
                "You remember every drop of blood ever tasted, and every face ever seen.", ""));
        merits.add(new LibraryMerit("city-secrets", "City Secrets", "Social", List.of(1, 2, 3, 4, 5),
                "Knowledge of the hidden tunnels and forgotten basements of the metropolis gives you an edge when evading capture.", ""));

        // additional baseline library entries
        for (int i = 1; i <= 50; i++) {
            merits.add(new LibraryMerit("core-merit-" + i, "Core Merit " + i,
                    switch (i % 5) {
                        case 0 -> "Mental";
                        case 1 -> "Physical";
                        case 2 -> "Social";
                        case 3 -> "Supernatural";
                        default -> "Fighting";
                    },
                    List.of(1, 2, 3, 4, 5),
                    "Core Merit reference entry " + i + ".",
                    ""));
        }
    }

    private void seedPowers() {
        vampirePowers.add(new LibraryPower(
                "celerity",
                "Celerity",
                "discipline",
                "\"The world slows to a crawl as blood burns through your veins. You are the predator that exists between heartbeats.\"",
                List.of(
                        new PowerDotLevel(1, "Fleetness", "Move with impossible speed."),
                        new PowerDotLevel(2, "Blurred Motion", "Act before others can react."),
                        new PowerDotLevel(3, "Rapid Assault", "Chain multiple precise strikes.")
                )
        ));

        vampirePowers.add(new LibraryPower(
                "dominate",
                "Dominate",
                "discipline",
                "The art of the crushing will. Bend the minds of mortals to your absolute whim with a single spoken word.",
                List.of(
                        new PowerDotLevel(1, "Command", "Issue a one-word order."),
                        new PowerDotLevel(2, "Mesmerize", "Plant compulsions within the target mind."),
                        new PowerDotLevel(3, "The Forgetful Mind", "Rewrite memory fragments.")
                )
        ));

        vampirePowers.add(new LibraryPower(
                "auspex",
                "Auspex",
                "discipline",
                "Expand your perception beyond the physical realm. Hear the racing hearts of your prey and see the colors of their souls.",
                List.of(
                        new PowerDotLevel(1, "Heightened Senses", "Sharpen supernatural perception."),
                        new PowerDotLevel(2, "Aura Perception", "Read emotional and supernatural resonance."),
                        new PowerDotLevel(3, "Telepathy", "Taste the thoughts beneath words.")
                )
        ));

        for (int i = 1; i <= 40; i++) {
            vampirePowers.add(new LibraryPower(
                    "vampire-power-" + i,
                    "Vampire Power " + i,
                    i % 4 == 0 ? "devotion" : "discipline",
                    "Vampire power reference entry " + i + ".",
                    List.of(new PowerDotLevel(1, "Level 1", "Entry"))
            ));
        }
    }
}
