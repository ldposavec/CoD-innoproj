```markdown
# Design System Document: The Eldritch Editorial

## 1. Overview & Creative North Star
**Creative North Star: The Gothic Archive**
This design system rejects the "spreadsheet" aesthetic common in digital roleplaying tools. Instead, it adopts the persona of a high-end, dark-mode editorial—a digital "living grimoire." We move beyond functional utility to create an immersive, atmospheric experience that feels both ancient and technologically advanced.

The design breaks the "template" look through **intentional asymmetry**, where stats and lore are not forced into rigid boxes but breathe within varying container heights. We use **tonal depth** and **asymmetric white space** to guide the eye, ensuring that while the theme is "Gothic," the usability is "Ultra-Modern."

---

## 2. Colors & Surface Philosophy
The palette is rooted in `surface` (#131313), utilizing the Material Design 3 tonal palette to create a sense of shadowed layers.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts.
*   **Action:** To separate a "Skills" section from "Attributes," place a `surface-container-low` section against the `surface` background. The transition of tone is the divider.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of obsidian glass.
*   **Background:** `surface` (#131313)
*   **Section Level:** `surface-container-low` (#1C1B1B)
*   **Card/Interactive Level:** `surface-container` (#201F1F)
*   **Pop-over/Active Level:** `surface-container-highest` (#353534)

### The "Glass & Ghost" Rule
For floating elements like tooltips or character portrait overlays, use **Glassmorphism**:
*   **Fill:** `surface-variant` at 60% opacity.
*   **Effect:** Backdrop blur (12px to 20px).
*   **Signature Textures:** Use a subtle linear gradient on primary CTAs, transitioning from `primary` (#FFB3B1) to `primary-container` (#D42B3B) at a 135-degree angle to provide a "blood-glow" or "ethereal pulse" effect.

---

## 3. Typography: The Modern Scribe
We utilize a high-contrast pairing: **Noto Serif** for narrative weight and **Inter** for mechanical precision.

*   **Display & Headlines (Noto Serif):** Used for character names and major section headers (e.g., *“The Shadowed Path”*). These should use `headline-lg` or `display-sm` to establish a gothic, editorial tone.
*   **Titles & Body (Inter):** Used for stat labels, skill descriptions, and modifiers. `title-sm` provides a clean, technical counterpoint to the serif headers.
*   **Labels (Inter):** Use `label-sm` in all-caps with 0.05rem tracking for attribute headers (e.g., "STRENGTH") to maximize readability in high-density areas.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a "recessed" or "carved" look that feels more premium than a simple shadow.
*   **Ambient Shadows:** For high-level modals, use a shadow with a blur of 40px, 0px offset, and 6% opacity using the `on-surface` color. It should feel like a soft glow or a darkening of the air around the element.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility on interactive inputs, use `outline-variant` at **15% opacity**. It must be a whisper of a line, not a hard boundary.

---

## 5. Components

### High-Contrast Progress Bars (Health/Mana/Sanity)
*   **Track:** `surface-container-highest`.
*   **Fill:** `primary` (Crimson) or `secondary` (Ghostly Blue).
*   **Detail:** Add a 1px "inner glow" using a lighter tint of the accent color at the leading edge of the progress bar to simulate energy.

### Character Cards & Skill Lists
*   **Layout:** Forbid divider lines. Use `surface-container-low` for the card background. 
*   **Spacing:** Use 1.5rem (24px) padding to allow the typography to breathe. 
*   **Interaction:** On hover, shift the background to `surface-bright`.

### Inputs & Fields
*   **Style:** Minimalist. No box. A simple bottom "Ghost Border" (15% opacity `outline-variant`) that animates to 100% opacity `primary` on focus.
*   **Typography:** User-input text should be `title-md` for high legibility.

### Selection Chips
*   **Unselected:** `surface-container-high` with `on-surface-variant` text.
*   **Selected:** `primary-container` background with `on-primary-container` text. Use `rounded-sm` (0.125rem) for a sharp, aggressive look.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical margins (e.g., a wider left margin for headers) to create an editorial, "un-templated" feel.
*   **Do** use `primary-fixed-dim` for secondary headers to provide a tonal "echo" of the main accent color.
*   **Do** lean into `surface-container-lowest` for deep, "sunken" areas like inventory slots.

### Don't:
*   **Don't** use pure black (#000000). Always use `surface` (#131313) to maintain depth.
*   **Don't** use standard 4px or 8px rounded corners for everything. Mix `rounded-none` for structural containers and `rounded-sm` for interactive elements to create a "sharp" gothic vibe.
*   **Don't** use high-contrast dividers. If you feel the need for a line, increase the vertical whitespace instead.

---

## 7. Splat Adaptation (Accent Swapping)
This design system is built to shift its "soul" based on the character's faction or "splat."
*   **Vampiric/Combat:** Swap `primary` tokens to the Crimson scale.
*   **Spectral/Magic:** Swap `primary` tokens to the Ghostly Blue scale (utilizing the `secondary` and `tertiary` palettes).
*   **Mechanical Logic:** The UI structure remains identical; only the `primary` and `primary-container` tokens change, ensuring brand consistency across different character types.```