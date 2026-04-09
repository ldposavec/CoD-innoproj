package com.cod.backend.service;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class LibraryService {
    public List<Map<String, Object>> merits() {
        return List.of(
            Map.of(
                "id", "blood-potency",
                "name", "Blood Potency",
                "category", "Supernatural",
                "allowedDots", List.of(1, 2, 3, 4, 5),
                "description", "Represents the sheer power of the vampire's Vitae. Increases your maximum Vitae pool and the amount of Vitae you can spend per turn.",
                "prerequisites", ""
            ),
            Map.of(
                "id", "kung-fu",
                "name", "Kung Fu",
                "category", "Fighting",
                "allowedDots", List.of(1, 2, 3, 4, 5),
                "description", "A disciplined martial art focus. Dots grant maneuvers: Focused Attack, Iron Skin, and Whirlwind Strike.",
                "prerequisites", "Requires Athletics ••"
            ),
            Map.of(
                "id", "resources",
                "name", "Resources",
                "category", "Social",
                "allowedDots", List.of(1, 2, 3, 4, 5),
                "description", "Wealth and disposable income. Represents your access to funds, properties, and equipment without making individual rolls.",
                "prerequisites", ""
            ),
            Map.of(
                "id", "direction-sense",
                "name", "Direction Sense",
                "category", "Mental",
                "allowedDots", List.of(1, 2, 3, 4, 5),
                "description", "Your character has an innate sense of direction and can always find north. Grants +2 on all navigation or orientation rolls.",
                "prerequisites", ""
            ),
            Map.of(
                "id", "eidetic-memory",
                "name", "Eidetic Memory",
                "category", "Mental",
                "allowedDots", List.of(1, 2, 3, 4, 5),
                "description", "You remember every drop of blood ever tasted, and every face ever seen.",
                "prerequisites", ""
            )
        );
    }

    public List<Map<String, Object>> vampireDisciplines() {
        return List.of(
            Map.of(
                "id", "celerity",
                "name", "Celerity",
                "type", "discipline",
                "description", "The world slows to a crawl as blood burns through your veins. You are the predator that exists between heartbeats.",
                "dotLevels", List.of(
                    Map.of("dots", 1, "power", "Fleet Movement", "effect", "Move with superhuman speed."),
                    Map.of("dots", 2, "power", "Blurred Step", "effect", "Stride between heartbeats."),
                    Map.of("dots", 3, "power", "Relentless Pursuit", "effect", "Outpace prey with impossible acceleration.")
                )
            ),
            Map.of(
                "id", "dominate",
                "name", "Dominate",
                "type", "discipline",
                "description", "The art of the crushing will. Bend the minds of mortals to your absolute whim with a single spoken word.",
                "dotLevels", List.of(
                    Map.of("dots", 1, "power", "Command", "effect", "Issue one-word directives."),
                    Map.of("dots", 2, "power", "Mesmerize", "effect", "Layer controlled suggestions.")
                )
            ),
            Map.of(
                "id", "auspex",
                "name", "Auspex",
                "type", "discipline",
                "description", "Expand your perception beyond the physical realm. Hear the racing hearts of your prey and see the colors of their souls.",
                "dotLevels", List.of(
                    Map.of("dots", 1, "power", "Heightened Senses", "effect", "Enhance senses beyond mortal range.")
                )
            )
        );
    }
}
