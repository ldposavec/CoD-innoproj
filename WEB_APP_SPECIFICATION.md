# Chronicles of Darkness Character Creator — Web App Specification

## 1. Introduction

This document describes the **functional and non-functional requirements** for a web application that replicates and extends the Chronicles of Darkness (CoDN) Character Creator originally built as an Android app. The specifications are intended to be consumed by AI coding agents building the web application from scratch, without reference to the Kotlin source code.

---

## 2. Glossary

| Term | Definition |
|---|---|
| **CoD** | Chronicles of Darkness (New) — the tabletop RPG system by Paradox Interactive |
| **Splat** | A supernatural template (Vampire, Werewolf, Mage, etc.) or Mortal |
| **Attribute** | One of 9 core stats rated 1–5 |
| **Skill** | One of 24 learned abilities rated 0–5 |
| **Merit** | Optional advantages rated 1–5 |
| **Specialty** | A named focus tied to a skill |
| **Derived Stat** | A calculated value (Speed, Defense, etc.) |
| **Character Sheet** | The full display/edit view for a saved character |
| **Wizard** | Multi-step character creation flow |
| **Beat** | A unit of experience earned; 5 Beats = 1 XP |

---

## 3. Functional Specifications

### 3.1 Character Management

#### 3.1.1 Character List (Home Screen)

- Display all saved characters as cards showing: portrait/avatar, character name, splat type, chronicle name.
- Support **three sort orders**: creation date (newest first), alphabetical by name, splat type.
- Support **text search** filtering by name and concept (partial, case-insensitive).
- Tapping a card opens the **Character Sheet** view.
- A **"New Character"** button launches the **Creation Wizard**.
- A **dice roller** shortcut is accessible from this screen without entering a character.

#### 3.1.2 Character Creation Wizard (6 Steps)

**Step 0 — Concept**
- Free-text fields: Name, Player, Chronicle, Concept, Virtue, Vice.
- All fields optional except Name (required).

**Step 1 — Splat Selection**
- User selects one of 12 splats: Mortal, Vampire, Werewolf, Mage, Promethean, Changeling, Hunter, Geist, Mummy, Demon, Beast, Deviant.
- Selection changes which fields appear in later steps.

**Step 2 — Attributes**
- 9 attributes displayed in three categories (3 each):

  | Category | Attributes |
  |---|---|
  | Physical | Strength, Dexterity, Stamina |
  | Social | Presence, Manipulation, Composure |
  | Mental | Intelligence, Wits, Resolve |

- Each attribute uses a dot-rating widget (1–5 filled dots). Default: 1.
- Total attribute dot budget rules (creation only): one category at 5 dots priority, one at 4, one at 3 (in addition to base 1 per attribute) — optionally enforce this as a soft warning.

**Step 3 — Skills**
- 24 skills displayed in the same three categories:

  | Category | Skills |
  |---|---|
  | Physical | Athletics, Brawl, Drive, Firearms, Larceny, Stealth, Survival, Weaponry |
  | Social | Animal Ken, Empathy, Expression, Intimidation, Persuasion, Socialize, Streetwise, Subterfuge |
  | Mental | Academics, Computer, Crafts, Investigation, Medicine, Occult, Politics, Science |

- Each skill uses a dot-rating widget (0–5). Default: 0.
- Allow adding **Specialties**: for each skill, attach one or more specialty strings (e.g., "Firearms — Pistols").

**Step 4 — Merits**
- Browse a predefined **Merit Library** (50+ entries) filterable by category: Mental, Physical, Social, Supernatural, Fighting.
- Each merit entry shows: name, category, description, dot options (1–5), prerequisites.
- User selects merit and dot level; added to character merit list.
- Support **custom merits** (user-defined name, category, dot level, description).
- Enforce prerequisite display warnings (e.g., "Requires Athletics ••").
- **Professional Training** merit: on selection, prompt user to choose two skills as the focus.

**Step 5 — Supernatural**
- Displayed only for non-Mortal splats.
- Per-splat fields are detailed in Section 3.3.
- Free-text for powers/abilities list entry.
- Previous/Next buttons navigate between steps; Save on final step.

#### 3.1.3 Character Sheet

Tabbed interface with five tabs:

**Tab 1 — Info**
- Display/edit all Concept fields from Step 0.
- Portrait: upload from device or provide URL; show placeholder avatar when absent.
- Experience points: total XP, spent XP, remaining (auto-calculated).
- Beats: 5 checkboxes; when all 5 filled, auto-convert to 1 XP and reset.

**Tab 2 — Attributes & Skills**
- All 9 attributes with dot widgets (editable in edit mode).
- Derived stats (read-only, auto-calculated):
  - **Speed** = Strength + Dexterity + Size
  - **Defense** = lower of (Wits, Dexterity) + Athletics
  - **Initiative** = Dexterity + Composure
  - **Perception** = Wits + Composure
  - **Size** = 5 (default, editable)
  - **Health** = Stamina + Size (shown as a track of boxes)
  - **Willpower** = Resolve + Composure (shown as dots and a pool track)
- Custom modifier fields for Speed, Defense, Initiative, Perception, Health, Willpower.
- All 24 skills with dot widgets and displayed specialties.

**Tab 3 — Merits**
- List all merits with name, dots, category.
- In edit mode: remove merits, add new ones from the merit picker.
- Show prerequisites.

**Tab 4 — Powers / Splat**
- Splat-specific abilities (disciplines, gifts, arcana, etc.).
- Display format: list of named abilities with dot levels and short description.
- Edit mode allows adding/removing/rating powers.
- Show splat-specific resource pools (Vitae, Essence, Mana, etc.) as current/max fields.

**Tab 5 — Notes**
- Free-text multi-line notes field.
- Full edit access at all times.

#### 3.1.4 Edit Mode

- Character Sheet is in **read-only mode** by default.
- An **Edit** toggle button switches all editable fields to interactive state.
- Changes auto-save to the database on exit from edit mode (or on an explicit Save button).
- A **Delete** button (with confirmation dialog) removes the character.

#### 3.1.5 Health Track

- Visual row of boxes equal to max Health.
- Each box cycles through: Empty → Bashing (/) → Lethal (X) → Aggravated (*) on click.
- Display wound penalty based on filled boxes (0, −1, −2, −3, Incapacitated).

---

### 3.2 Dice Roller

Accessible from any screen as a standalone modal or page.

- **Pool size** selector: 0–30 (spinner or +/− buttons).
- **Explosion rule** selector: 10-again (default), 9-again, 8-again, No Explode.
- **Rote quality** toggle: when enabled, all dice showing 1–7 on first roll are rerolled once.
- **Chance die** mode: when pool = 0, roll one die; success only on 10, dramatic failure on 1.
- **Roll button**: rolls dice, displays individual die results.
- **Result summary**: number of successes, failure/exceptional success/dramatic failure label.
  - Exceptional success: 5 or more successes.
  - Dramatic failure: 0 successes on a chance die.
- **Roll history**: timestamped list of past rolls (pool, rules, result). Persists for the session.
- **Clear history** button.
- **Animation toggle**: optional animation of dice faces.

---

### 3.3 Splat-Specific Data

All splats share the base character data. Each splat adds the fields detailed below.

#### MORTAL
- No additional splat data.

#### VAMPIRE (Vampire: The Requiem)
- **Clan**: Daeva, Gangrel, Mekhet, Nosferatu, Ventrue (dropdown + custom)
- **Covenant**: Invictus, Carthian Movement, Circle of the Crone, Lancea et Sanctum, Ordo Dracul, Unaligned (dropdown + custom)
- **Bloodline**: free-text
- **Mask / Dirge**: free-text (public/private persona)
- **Blood Potency**: 1–10 dot rating
- **Vitae**: current / max integer pool
- **Humanity**: 0–10 dot rating
- **Disciplines**: list of discipline name + dot level (1–5); draw from predefined library of 40+ disciplines and devotions
- **Devotions**: list (name, description)
- **Predator Type**: free-text
- **Banes**: free-text

#### WEREWOLF (Werewolf: The Forsaken)
- **Auspice**: Cahalith, Elodoth, Irraka, Ithaeur, Rahu (dropdown)
- **Tribe**: Blood Talons, Bone Shadows, Hunters in Darkness, Iron Masters, Storm Lords, Ghost Wolves, Pure (dropdown)
- **Pack Name / Totem**: free-text
- **Primal Urge**: 1–10 dot rating
- **Essence**: current / max pool
- **Harmony**: 0–10 rating
- **Renown**: 5 types — Cunning, Glory, Honor, Purity, Wisdom — each 0–5 dots
- **Gifts**: list of gift name + dots (keyed to renown)
- **Rites**: list (name, level)
- **Kuruth Triggers**: free-text (frenzy conditions)
- **Hunter's Aspect**: free-text

#### MAGE (Mage: The Awakening)
- **Path**: Acanthus, Mastigos, Moros, Obrimos, Thyrsus (dropdown)
- **Order**: Adamantine Arrow, Free Council, Guardians of the Veil, Mysterium, Silver Ladder, Seers of the Throne (dropdown + custom)
- **Legacy**: free-text
- **Gnosis**: 1–10 dot rating
- **Mana**: current / max pool
- **Wisdom**: 0–10
- **Arcana**: 10 arcana (Death, Fate, Forces, Life, Matter, Mind, Prime, Space, Spirit, Time) each 0–5 dots
- **Ruling Arcana**: shown based on Path selection
- **Rotes**: list (name, arcana, dots, dice pool)
- **Praxes**: list (name, arcana)
- **Obsessions**: list (free-text)
- **Nimbus / Dedicated Tool**: free-text

#### PROMETHEAN (Promethean: The Created)
- **Lineage**: Choleric, Melancholic, Phlegmatic, Sanguine, Supernal (dropdown)
- **Refinement**: Aurum, Cuprum, Ferrum, etc. (dropdown + custom)
- **Azoth**: 1–10
- **Pyros**: current / max
- **Humanity**: 0–10
- **Pilgrimage**: free-text
- **Transmutations**: list (name, dots, pillar)
- **Distillations**: list (name)
- **Wasteland / Torment / Disfigurements**: free-text fields

#### CHANGELING (Changeling: The Lost)
- **Seeming**: Beast, Darkling, Elemental, Fairest, Ogre, Wizened (dropdown)
- **Kith**: free-text
- **Court**: Spring, Summer, Autumn, Winter (dropdown + custom)
- **Wyrd**: 1–10
- **Glamour**: current / max
- **Clarity**: 0–10
- **Contracts**: list (name, dots, court/type)
- **Pledges**: list (name, terms)
- **Tokens**: list (name, description)
- **Fetch / Keeper / Durance**: free-text fields

#### HUNTER (Hunter: The Vigil)
- **Conspiracy**: Imbued, Lucifuge, Cheiron Group, Network Zero, etc. (dropdown + custom)
- **Compact / Organization**: free-text
- **Profession**: free-text
- **Cell / Group Name**: free-text
- **Endowments**: list (name, dots)
- **Tactics**: list (name, description)
- **Safe Places / Contacts**: free-text

#### GEIST (Geist: The Sin-Eaters)
- **Threshold**: Torn, Forgotten, Prey, Stricken, Returning (dropdown)
- **Geist Name**: free-text
- **Archetype**: free-text
- **Psyche**: 1–10
- **Plasm**: current / max
- **Synergy**: 0–10
- **Keys**: list (name, dots, thematic type)
- **Manifestations**: list (name, key link)
- **Ceremonies**: list (name, level)
- **Haunt / Mementos**: free-text fields

#### MUMMY (Mummy: The Curse)
- **Decree**: free-text
- **Guild**: free-text
- **Sekhem**: 1–10
- **Pillar Pool**: current / max
- **Memory**: 1–10
- **Affinities / Utterances**: list (name, pillar, level)
- **Relics / Cult / Tomb / Judge**: free-text fields

#### DEMON (Demon: The Descent)
- **Incarnation**: Analyst, Guardian, Messenger, Psychopomp (dropdown + custom)
- **Agenda**: free-text
- **Primum**: 1–10
- **Aether**: current / max
- **Cover**: 1–10
- **Embeds**: list (name, description)
- **Exploits**: list (name, description)
- **Gadgets / Pacts**: list (name, description)
- **Demonic Form / Glitches**: free-text fields

#### BEAST (Beast: The Primordial)
- **Family**: Anakim, Eshmaki, Inguma, Makara, Namtaru, Ugallu, Talassii (dropdown + custom)
- **Hunger**: Collector, Enabler, Nemesis, Predator, Ravager, Tyrant, Whisperer (dropdown + custom)
- **Birthright**: three different Birthrights per family (user can choose one of the three or make a custom one)
- **Lair**: 1–10
- **Satiety**: 0–10
- **Atavisms**: list (name, dots, satiety effects description)
- **Nightmares**: list (name, description)
- **Horror Form**: free-text
- **Lair Traits**: list (name, type, description)

#### DEVIANT (Deviant: The Renegades)
- **Origin**: free-text
- **Clade**: free-text
- **Variations**: list (name, dots)
- **Adaptations**: list (name, variations used)
- **Scars**: list (name)
- **Loyalties / Conspiracy**: free-text
- **Baseline**: 1–10
- **Conviction**: 1–10

---

### 3.4 Predefined Data Libraries

The application must include built-in (not user-editable) libraries:

#### Merit Library
- 50+ merits across 5 categories (Mental, Physical, Social, Supernatural, Fighting).
- Each entry: `{ id, name, category, allowedDots: number[], description, prerequisites: string }`.
- Merits are browsable and filterable by category.

#### Vampire Discipline Library
- 40+ disciplines and devotions.
- Each entry: `{ id, name, type: "discipline" | "devotion", description, dotLevels: [{ dots, power, effect }] }`.

The application does NOT need predefined libraries for other splat powers; user-entered text is sufficient for those.

---

### 3.5 Theme / Appearance

- Two UI themes selectable from a settings/toggle:
  - **Dark Gothic** (default): dark backgrounds, parchment/red accent tones evoking gothic horror.
  - **Light Parchment**: light cream/sepia tones.
- Theme preference persisted in browser `localStorage` or user profile.

---

### 3.6 Settings

- Theme selection (Dark Gothic / Light Parchment).
- (Optional) Export characters as JSON file.
- (Optional) Import characters from JSON file.

---

## 4. Non-Functional Specifications

### 4.1 Technology Stack (Recommended)

The web app must not use Kotlin or Android APIs. Recommended technologies:

| Layer | Technology |
|---|---|
| Frontend Framework | Svelte 5 (runes mode with TypeScript) or React (with TypeScript) |
| Styling | Tailwind CSS or CSS-in-JS (styled-components) |
| State Management | Zustand, Redux Toolkit, or Pinia |
| Client-side DB | IndexedDB via Dexie.js (offline-first), possibilty of online DB (export Room DB from Android to, for example, PostgreSQL) |
| Backend | Java (25) Spring Boot or a BaaS (Supabase, Firebase) |
| Build Tool | Best for selected architecture |
| Testing | Likely JUnit + Playwright |

### 4.2 Performance

- Initial page load (Largest Contentful Paint) < 2.5 seconds on a standard broadband connection.
- Character list rendering must handle at least 200 characters without noticeable lag (< 100 ms render).
- Dice rolls must animate and resolve in < 500 ms.
- All in-app navigation must feel instant (< 200 ms perceived).
- Character save must complete in < 300 ms (local storage).

### 4.3 Availability & Offline Support

- The app must be fully functional **offline** with all existing characters accessible.
- Use a **Service Worker** (Workbox or manual) to cache the app shell and static assets.
- Character data stored in **IndexedDB** (client-side), with optional cloud sync (using PostgreSQL).
- If cloud sync is implemented, local data is the authoritative source during offline periods; sync on reconnect.

### 4.4 Data Persistence

- **Primary store**: IndexedDB, schema mirrors the Android Room database:
  - Object store: `characters` with fields listed in Section 4.5.
  - All complex objects (attributes, skills, merits, splatData) stored as structured sub-objects.
- **Settings store**: `localStorage` key-value.
- Characters must survive browser refresh, tab close, and browser restart.

### 4.5 Data Schema

```typescript
interface Character {
  id: string;                      // UUID
  name: string;                    // required
  player: string;
  chronicle: string;
  concept: string;
  virtue: string;
  vice: string;
  splat: Splat;                    // enum of 12 values
  attributes: Attributes;
  skills: Skills;
  specialties: SkillSpecialty[];
  merits: Merit[];
  professionalTrainingSkills: string[];
  customPowers: CustomPower[];
  derivedStats: DerivedStats;
  splatData: SplatData | null;     // null for Mortal
  experienceTotal: number;
  experienceSpent: number;
  beatsTotal: number;
  notes: string;
  portraitUri: string | null;      // data URL or remote URL
  createdAt: number;               // Unix timestamp ms
  updatedAt: number;
}

type Splat =
  | "MORTAL" | "VAMPIRE" | "WEREWOLF" | "MAGE"
  | "PROMETHEAN" | "CHANGELING" | "HUNTER" | "GEIST"
  | "MUMMY" | "DEMON" | "BEAST" | "DEVIANT";

interface Attributes {
  strength: number; dexterity: number; stamina: number;
  presence: number; manipulation: number; composure: number;
  intelligence: number; wits: number; resolve: number;
}

interface Skills {
  athletics: number; brawl: number; drive: number; firearms: number;
  larceny: number; stealth: number; survival: number; weaponry: number;
  animalKen: number; empathy: number; expression: number; intimidation: number;
  persuasion: number; socialize: number; streetwise: number; subterfuge: number;
  academics: number; computer: number; crafts: number; investigation: number;
  medicine: number; occult: number; politics: number; science: number;
}

interface SkillSpecialty { skill: keyof Skills; specialty: string; }

interface Merit {
  id: string;
  name: string;
  category: string;
  dots: number;
  description: string;
  prerequisites: string;
  isCustom: boolean;
}

interface CustomPower {
  id: string;
  name: string;
  dots: number;
  description: string;
}

interface DerivedStats {
  size: number;
  healthMax: number;
  healthBoxes: HealthStatus[];       // length === healthMax
  willpowerMax: number;
  willpowerSpent: number;
  speed: number;
  defense: number;
  initiative: number;
  perception: number;
  speedModifier: number;
  defenseModifier: number;
  initiativeModifier: number;
  perceptionModifier: number;
  healthModifier: number;
  willpowerModifier: number;
}

type HealthStatus = "EMPTY" | "BASHING" | "LETHAL" | "AGGRAVATED";

// SplatData is a discriminated union — one per splat type
type SplatData =
  | VampireData | WerewolfData | MageData | PrometheanData
  | ChangelingData | HunterData | GeistData | MummyData
  | DemonData | BeastData | DeviantData;
```

### 4.6 Accessibility

- WCAG 2.1 Level AA compliance.
- All interactive elements keyboard-navigable (Tab, Enter, Space, Arrow keys for dot widgets).
- All images/icons have descriptive `alt` text or `aria-label`.
- Color is never the sole means of conveying information (health box states use both color and symbol).
- Minimum text contrast ratio: 4.5:1.
- Screen reader support for dynamic content (ARIA live regions for dice results).

### 4.7 Responsiveness

- Fully usable on mobile browsers (375 px width minimum) and desktop (1280 px+ width).
- Touch-friendly tap targets ≥ 44×44 px.
- The character sheet tabs must be horizontally scrollable on narrow screens.
- The dot-rating widget must work equally with mouse click, keyboard, and touch.

### 4.8 Security

- No server-side account required for core functionality (all data is local).
- If user accounts / cloud sync are added:
  - Passwords hashed server-side (bcrypt or Argon2).
  - Authentication via JWT with short expiry + refresh token rotation.
  - All API traffic over HTTPS.
  - Character data scoped to the authenticated user; no cross-user access.
- Sanitize all user-generated text before rendering (prevent XSS).
- No sensitive data stored in `localStorage` beyond theme preference.

### 4.9 Browser Support

- Chrome/Edge 110+, Firefox 110+, Safari 16+ (all modern evergreen browsers).
- No IE11 support required.

### 4.10 Internationalization

- Initial release in English only.
- All user-facing strings extracted to a localization file (`en.json`) to enable future translation.
- Date/time displayed in the user's locale.

### 4.11 Scalability & Architecture

The application follows a **layered architecture** mirroring Clean Architecture:

- **UI Layer**: Components/screens with no business logic.
- **Domain Layer**: Pure TypeScript functions for derived stat calculation, dice rolling, merit validation.
- **Data Layer**: Repository pattern wrapping IndexedDB (and optional API calls).

Business logic (derived stats, dice engine, merit prerequisites) must be unit-testable without a browser environment.  
The dice roller must be a self-contained module (no UI dependencies) that can be imported and tested in isolation.

### 4.12 Testability

- Unit test coverage ≥ 80% for domain layer (derived stat calculations, dice roller, merit validation).
- Integration tests for character CRUD operations via the repository layer.
- End-to-end tests for the 6-step creation wizard and dice roller (using Playwright or Cypress).

### 4.13 Code Quality

- TypeScript strict mode (`"strict": true` in `tsconfig.json`).
- ESLint with recommended rules + Prettier for formatting.
- No `any` types in domain or data layers.
- All components must have explicit prop types.

---

## 5. Feature Parity Matrix

| Feature | Android App | Web App |
|---|---|---|
| 12-splat character creation | ✅ | Required |
| 6-step wizard | ✅ | Required |
| 5-tab character sheet | ✅ | Required |
| Attribute/skill dot widgets | ✅ | Required |
| Merit library + custom merits | ✅ | Required |
| Skill specialties | ✅ | Required |
| Derived stats auto-calculation | ✅ | Required |
| Health track with status | ✅ | Required |
| Dice roller (10/9/8-again, rote, chance) | ✅ | Required |
| Roll history | ✅ | Required |
| Dark/light themes | ✅ | Required |
| Character search + sort | ✅ | Required |
| Character portrait | ✅ | Required |
| Experience + Beat tracking | ✅ | Required |
| Offline functionality | N/A (native) | Required (if possible) |
| JSON export/import | ❌ | Optional |
| PDF export | ❌ | Required |
| Cloud sync / accounts | ❌ | Optional |
| Multi-user / sharing | ❌ | Optional (if possible) |

---

## 6. Dice Roller — Detailed Algorithm

The dice engine must implement the following algorithm precisely:

```
function roll(poolSize, rule, roteQuality, isChanceDie):
  if poolSize == 0 OR isChanceDie:
    die = random(1, 10)
    successes = (die == 10) ? 1 : 0
    dramaticFailure = (die == 1) ? true : false
    return { dice: [die], successes, dramaticFailure }

  dice = [random(1,10) for _ in range(poolSize)]

  if roteQuality:
    dice = [d if d >= 8 else random(1,10) for d in dice]   // reroll failures once

  // Base success threshold is always 8
  explosionThreshold = { "10again": 10, "9again": 9, "8again": 8, "none": null }

  successes = count(d >= 8 for d in dice)

  if explosionThreshold[rule] is not null:
    explodeDice = [d for d in dice if d >= explosionThreshold[rule]]
    while explodeDice is not empty:
      newDice = [random(1,10) for _ in explodeDice]
      dice += newDice
      successes += count(d >= 8 for d in newDice)
      explodeDice = [d for d in newDice if d >= explosionThreshold[rule]]

  exceptional = successes >= 5
  return { dice, successes, exceptional, dramaticFailure: false }
```

---

## 7. Derived Stats — Calculation Rules

| Stat | Formula |
|---|---|
| Speed | Strength + Dexterity + Size + speedModifier |
| Defense | min(Wits, Dexterity) + Athletics + defenseModifier |
| Initiative | Dexterity + Composure + initiativeModifier |
| Perception | Wits + Composure + perceptionModifier |
| Health (max) | Stamina + Size + healthModifier |
| Willpower (max) | Resolve + Composure + willpowerModifier |
| Size | 5 (default, editable) |

Wound penalties (informational display only):

| Remaining healthy boxes | Penalty |
|---|---|
| All boxes empty | 0 |
| Health − 3 boxes remaining | −1 |
| Health − 2 boxes remaining | −2 |
| Last box remaining | −3 |
| All boxes filled | Incapacitated |

---

## 8. Out of Scope (First Release)

- User accounts or authentication
- Real-time collaborative editing
- PDF character sheet export
- Campaign/chronicle management
- NPC databases
- Compendium or rulebook content

---

*This specification describes the Chronicles of Darkness Character Creator Web App, version 1.0. The Chronicles of Darkness and all game line names are trademarks of Paradox Interactive AB. This application is for personal and educational use.*
