<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from './api';
  import { ATTRIBUTE_GROUPS, defaultCharacter, SKILL_GROUPS, SPLATS, THEME_KEY } from './constants';
  import type { Character, DiceRollResult, LibraryMerit, Merit } from './types';
  import { cloneCharacter, cycleHealth, remainingXp, woundPenalty } from './utils';

  type Screen = 'login' | 'dashboard' | 'wizard' | 'sheet' | 'settings';
  type SortMode = 'created' | 'name' | 'splat';
  type SheetTab = 'info' | 'attributes' | 'merits' | 'powers' | 'notes';

  let screen = $state<Screen>('login');
  let characters = $state<Character[]>([]);
  let selected = $state<Character | null>(null);
  let draft = $state<Character>(defaultCharacter());
  let wizardStep = $state(0);
  let search = $state('');
  let sortMode = $state<SortMode>('created');
  let meritsLibrary = $state<LibraryMerit[]>([]);
  let meritCategory = $state('All');
  let skillsLibrary = $state<{ physical: string[]; social: string[]; mental: string[] }>({
    physical: [],
    social: [],
    mental: []
  });
  let splatOptions = $state<{
    vampireClans: string[];
    vampireCovenants: string[];
    beastFamilies: string[];
    beastHungers: string[];
  }>({
    vampireClans: [],
    vampireCovenants: [],
    beastFamilies: [],
    beastHungers: []
  });
  let sheetEdit = $state(false);
  let sheetTab = $state<SheetTab>('info');
  let theme = $state<'dark' | 'light'>('dark');
  let errorMessage = $state('');

  let dicePool = $state(5);
  let diceRule = $state('10again');
  let diceRote = $state(false);
  let diceChance = $state(false);
  let diceResult = $state<DiceRollResult | null>(null);
  let diceHistory = $state<Array<{ at: string; input: string; output: string }>>([]);

  const sortedCharacters = $derived.by(() => {
    let list = characters.filter((c) => {
      const q = search.trim().toLowerCase();
      return q.length === 0 || c.name.toLowerCase().includes(q) || c.concept.toLowerCase().includes(q);
    });

    if (sortMode === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'splat') {
      list = [...list].sort((a, b) => a.splat.localeCompare(b.splat));
    } else {
      list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    }

    return list;
  });

  const filteredMerits = $derived.by(() =>
    meritCategory === 'All' ? meritsLibrary : meritsLibrary.filter((m) => m.category === meritCategory)
  );

  const meritCategories = $derived.by(() => ['All', ...new Set(meritsLibrary.map((m) => m.category))]);

  onMount(async () => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      theme = savedTheme;
    }
    applyTheme();

    await Promise.all([loadCharacters(), loadMerits(), loadSkills(), loadSplatOptions()]);
  });

  async function loadCharacters() {
    try {
      characters = await api.listCharacters();
      errorMessage = '';
    } catch {
      errorMessage = 'Backend unavailable. Start Spring Boot on port 8080.';
    }
  }

  async function loadMerits() {
    try {
      meritsLibrary = await api.listMerits();
    } catch {
      meritsLibrary = [];
    }
  }

  async function loadSkills() {
    try {
      skillsLibrary = await api.listSkills();
    } catch {
      skillsLibrary = { physical: [], social: [], mental: [] };
    }
  }

  async function loadSplatOptions() {
    try {
      splatOptions = await api.listSplatOptions();
    } catch {
      splatOptions = { vampireClans: [], vampireCovenants: [], beastFamilies: [], beastHungers: [] };
    }
  }

  function applyTheme() {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem(THEME_KEY, theme);
  }

  function beginWizard() {
    draft = defaultCharacter();
    wizardStep = 0;
    screen = 'wizard';
  }

  async function saveWizard() {
    if (!draft.name.trim()) {
      errorMessage = 'Name is required.';
      return;
    }

    const created = await api.createCharacter(draft);
    characters = [created, ...characters];
    selected = created;
    screen = 'sheet';
    sheetEdit = false;
    sheetTab = 'info';
    errorMessage = '';
  }

  function addMerit(template: LibraryMerit) {
    const merit: Merit = {
      id: crypto.randomUUID(),
      name: template.name,
      category: template.category,
      dots: Math.min(5, Math.max(1, template.allowedDots[0] ?? 1)),
      description: template.description,
      prerequisites: template.prerequisites,
      isCustom: false
    };
    draft = { ...draft, merits: [...draft.merits, merit] };
  }

  function openSheet(character: Character) {
    selected = cloneCharacter(character);
    screen = 'sheet';
    sheetEdit = false;
    sheetTab = 'info';
  }

  async function saveSheet() {
    if (!selected) return;
    const updated = await api.updateCharacter(selected.id, selected);
    characters = characters.map((c) => (c.id === updated.id ? updated : c));
    selected = cloneCharacter(updated);
    sheetEdit = false;
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!confirm('Delete this character?')) return;
    const id = selected.id;
    await api.deleteCharacter(id);
    characters = characters.filter((c) => c.id !== id);
    selected = null;
    screen = 'dashboard';
  }

  function incrementBeats() {
    if (!selected) return;
    selected.beatsTotal += 1;
    if (selected.beatsTotal >= 5) {
      selected.experienceTotal += 1;
      selected.beatsTotal = 0;
    }
  }

  async function rollDice() {
    const payload = {
      poolSize: diceChance ? 0 : dicePool,
      rule: diceRule,
      roteQuality: diceRote,
      chanceDie: diceChance
    };
    const result = await api.rollDice(payload);
    diceResult = result;
    const label = result.dramaticFailure
      ? 'Dramatic Failure'
      : result.exceptional
        ? 'Exceptional Success'
        : result.successes > 0
          ? 'Success'
          : 'Failure';
    diceHistory = [
      {
        at: new Date().toLocaleTimeString(),
        input: diceChance ? 'Chance Die' : `Pool ${dicePool} / ${diceRule}`,
        output: `${label} (${result.successes})`
      },
      ...diceHistory
    ];
  }

  function updateDraftPowers(value: string) {
    draft.splatData.powers = value;
  }

  function updateSelectedPowers(value: string) {
    if (!selected) return;
    selected.splatData.powers = value;
  }

  function toggleHealth(index: number, status: string) {
    if (!selected) return;
    selected.derivedStats.healthBoxes[index] = cycleHealth(status as 'EMPTY' | 'BASHING' | 'LETHAL' | 'AGGRAVATED');
  }

  function removeSelectedMerit(index: number) {
    if (!selected) return;
    selected.merits.splice(index, 1);
  }
</script>

<main class="app">
  {#if screen === 'login'}
    <section class="panel">
      <h1>The Eldritch Editorial</h1>
      <p>ENTER THE ARCHIVE</p>
      <button onclick={() => (screen = 'dashboard')}>Finalize Grimoire</button>
    </section>
  {/if}

  {#if screen === 'dashboard'}
    <section class="panel wide">
      <header class="row">
        <div>
          <h2>Character Dossiers</h2>
          <p>Chronicles of Darkness • Active Roster</p>
        </div>
        <div class="row">
          <button onclick={beginWizard}>New Character</button>
          <button onclick={() => (screen = 'settings')}>Settings</button>
        </div>
      </header>

      <div class="row controls">
        <input bind:value={search} placeholder="Search name or concept" />
        <select bind:value={sortMode}>
          <option value="created">Newest</option>
          <option value="name">Name</option>
          <option value="splat">Splat</option>
        </select>
      </div>

      <div class="cards">
        {#each sortedCharacters as character}
          <button class="card" onclick={() => openSheet(character)}>
            <h3>{character.name}</h3>
            <p>{character.splat} • {character.chronicle || 'No Chronicle'}</p>
            <small>{character.concept || 'No concept'}</small>
          </button>
        {/each}
      </div>

      <section class="dice">
        <h3>Dice Roller</h3>
        <div class="row controls">
          <label>Pool <input type="number" min="0" max="30" bind:value={dicePool} /></label>
          <label>Rule
            <select bind:value={diceRule}>
              <option value="10again">10-again</option>
              <option value="9again">9-again</option>
              <option value="8again">8-again</option>
              <option value="none">No Explode</option>
            </select>
          </label>
          <label><input type="checkbox" bind:checked={diceRote} /> Rote</label>
          <label><input type="checkbox" bind:checked={diceChance} /> Chance die</label>
          <button onclick={rollDice}>Roll</button>
          <button onclick={() => (diceHistory = [])}>Clear history</button>
        </div>
        {#if diceResult}
          <p>Dice: {diceResult.dice.join(', ')} | Successes: {diceResult.successes}</p>
        {/if}
        <ul>
          {#each diceHistory as item}
            <li>{item.at} — {item.input} — {item.output}</li>
          {/each}
        </ul>
      </section>

      {#if errorMessage}<p class="error">{errorMessage}</p>{/if}
    </section>
  {/if}

  {#if screen === 'wizard'}
    <section class="panel wide">
      <header class="row">
        <h2>Character Creation — Step {wizardStep + 1}/6</h2>
      </header>

      {#if wizardStep === 0}
        <div class="grid two">
          <label>Name<input bind:value={draft.name} required /></label>
          <label>Player<input bind:value={draft.player} /></label>
          <label>Chronicle<input bind:value={draft.chronicle} /></label>
          <label>Concept<input bind:value={draft.concept} /></label>
          <label>Virtue<input bind:value={draft.virtue} /></label>
          <label>Vice<input bind:value={draft.vice} /></label>
        </div>
      {/if}

      {#if wizardStep === 1}
        <div class="chips">
          {#each SPLATS as splat}
            <button class:active={draft.splat === splat} onclick={() => (draft.splat = splat)}>{splat}</button>
          {/each}
        </div>
      {/if}

      {#if wizardStep === 2}
        {#each Object.entries(ATTRIBUTE_GROUPS) as [group, keys]}
          <h3>{group}</h3>
          <div class="grid three">
            {#each keys as key}
              <label>{key}<input type="number" min="1" max="5" bind:value={draft.attributes[key]} /></label>
            {/each}
          </div>
        {/each}
      {/if}

      {#if wizardStep === 3}
        {#each Object.entries(SKILL_GROUPS) as [group, keys]}
          <h3>{group}</h3>
          <div class="grid three">
            {#each keys as key, skillIndex}
              <label>{skillsLibrary[group.toLowerCase() as 'physical' | 'social' | 'mental'][skillIndex] ?? key}<input type="number" min="0" max="5" bind:value={draft.skills[key]} /></label>
            {/each}
          </div>
        {/each}
      {/if}

      {#if wizardStep === 4}
        <div class="row controls">
          <label>Category
            <select bind:value={meritCategory}>
              {#each meritCategories as category}
                <option value={category}>{category}</option>
              {/each}
            </select>
          </label>
        </div>
        <div class="cards">
          {#each filteredMerits as merit}
            <article class="card">
              <h3>{merit.name}</h3>
              <p>{merit.description}</p>
              <small>{merit.prerequisites}</small>
              <button onclick={() => addMerit(merit)}>Select</button>
            </article>
          {/each}
        </div>
        <h3>Selected Merits</h3>
        <ul>
          {#each draft.merits as merit}
            <li>{merit.name} • {merit.dots}</li>
          {/each}
        </ul>
      {/if}

      {#if wizardStep === 5}
        {#if draft.splat !== 'MORTAL'}
          {#if draft.splat === 'VAMPIRE'}
            <div class="grid two">
              <label>Clan
                <select
                  value={String(draft.splatData.clan ?? '')}
                  oninput={(e) => (draft.splatData.clan = (e.currentTarget as HTMLSelectElement).value)}
                >
                  <option value="">Select Clan</option>
                  {#each splatOptions.vampireClans as clan}
                    <option value={clan}>{clan}</option>
                  {/each}
                </select>
              </label>
              <label>Covenant
                <select
                  value={String(draft.splatData.covenant ?? '')}
                  oninput={(e) => (draft.splatData.covenant = (e.currentTarget as HTMLSelectElement).value)}
                >
                  <option value="">Select Covenant</option>
                  {#each splatOptions.vampireCovenants as covenant}
                    <option value={covenant}>{covenant}</option>
                  {/each}
                </select>
              </label>
            </div>
          {/if}
          {#if draft.splat === 'BEAST'}
            <div class="grid two">
              <label>Family
                <select
                  value={String(draft.splatData.family ?? '')}
                  oninput={(e) => (draft.splatData.family = (e.currentTarget as HTMLSelectElement).value)}
                >
                  <option value="">Select Family</option>
                  {#each splatOptions.beastFamilies as family}
                    <option value={family}>{family}</option>
                  {/each}
                </select>
              </label>
              <label>Hunger
                <select
                  value={String(draft.splatData.hunger ?? '')}
                  oninput={(e) => (draft.splatData.hunger = (e.currentTarget as HTMLSelectElement).value)}
                >
                  <option value="">Select Hunger</option>
                  {#each splatOptions.beastHungers as hunger}
                    <option value={hunger}>{hunger}</option>
                  {/each}
                </select>
              </label>
            </div>
          {/if}
          <label>Powers / Abilities
            <textarea
              rows="6"
              value={String(draft.splatData.powers ?? '')}
              oninput={(e) => updateDraftPowers((e.currentTarget as HTMLTextAreaElement).value)}
            ></textarea>
          </label>
        {:else}
          <p>Mortal has no additional splat data.</p>
        {/if}
      {/if}

      <footer class="row">
        <button onclick={() => (screen = 'dashboard')}>Cancel</button>
        <button disabled={wizardStep === 0} onclick={() => (wizardStep -= 1)}>Previous</button>
        {#if wizardStep < 5}
          <button onclick={() => (wizardStep += 1)}>Next</button>
        {:else}
          <button onclick={saveWizard}>Save Character</button>
        {/if}
      </footer>
      {#if errorMessage}<p class="error">{errorMessage}</p>{/if}
    </section>
  {/if}

  {#if screen === 'sheet' && selected}
    <section class="panel wide">
      <header class="row">
        <div>
          <h2>{selected.name}</h2>
          <p>{selected.splat} • {selected.concept}</p>
        </div>
        <div class="row">
          <button onclick={() => (screen = 'dashboard')}>Back</button>
          <button onclick={() => (sheetEdit = !sheetEdit)}>{sheetEdit ? 'View' : 'Edit'}</button>
          {#if sheetEdit}<button onclick={saveSheet}>Save</button>{/if}
          <button onclick={deleteSelected}>Delete</button>
        </div>
      </header>

      <nav class="row tabs">
        <button class:active={sheetTab === 'info'} onclick={() => (sheetTab = 'info')}>Info</button>
        <button class:active={sheetTab === 'attributes'} onclick={() => (sheetTab = 'attributes')}>Attributes & Skills</button>
        <button class:active={sheetTab === 'merits'} onclick={() => (sheetTab = 'merits')}>Merits</button>
        <button class:active={sheetTab === 'powers'} onclick={() => (sheetTab = 'powers')}>Powers</button>
        <button class:active={sheetTab === 'notes'} onclick={() => (sheetTab = 'notes')}>Notes</button>
      </nav>

      {#if sheetTab === 'info'}
        <div class="grid two">
          <label>Name<input bind:value={selected.name} disabled={!sheetEdit} /></label>
          <label>Player<input bind:value={selected.player} disabled={!sheetEdit} /></label>
          <label>Chronicle<input bind:value={selected.chronicle} disabled={!sheetEdit} /></label>
          <label>Concept<input bind:value={selected.concept} disabled={!sheetEdit} /></label>
          <label>Virtue<input bind:value={selected.virtue} disabled={!sheetEdit} /></label>
          <label>Vice<input bind:value={selected.vice} disabled={!sheetEdit} /></label>
        </div>
        <div class="row">
          <p>XP: {selected.experienceTotal} / Spent: {selected.experienceSpent} / Remaining: {remainingXp(selected)}</p>
          <p>Beats: {selected.beatsTotal}</p>
          {#if sheetEdit}<button onclick={incrementBeats}>Add Beat</button>{/if}
        </div>
      {/if}

      {#if sheetTab === 'attributes'}
        <div class="grid two">
          <div>
            <h3>Derived Stats</h3>
            <ul>
              <li>Speed: {selected.derivedStats.speed}</li>
              <li>Defense: {selected.derivedStats.defense}</li>
              <li>Initiative: {selected.derivedStats.initiative}</li>
              <li>Perception: {selected.derivedStats.perception}</li>
            </ul>
            <div class="health-row">
              {#each selected.derivedStats.healthBoxes as status, i}
                <button
                  class={`health ${status.toLowerCase()}`}
                  disabled={!sheetEdit}
                  onclick={() => toggleHealth(i, status)}
                >
                  {status === 'BASHING' ? '/' : status === 'LETHAL' ? 'X' : status === 'AGGRAVATED' ? '*' : ''}
                </button>
              {/each}
            </div>
            <p>Wound penalty: {woundPenalty(selected.derivedStats.healthBoxes)}</p>
          </div>
          <div>
            <h3>Attributes</h3>
            {#each Object.values(ATTRIBUTE_GROUPS).flat() as key}
              <label>{key}<input type="number" min="1" max="5" bind:value={selected.attributes[key]} disabled={!sheetEdit} /></label>
            {/each}
            <h3>Skills</h3>
            {#each Object.values(SKILL_GROUPS).flat() as key}
              <label>{key}<input type="number" min="0" max="5" bind:value={selected.skills[key]} disabled={!sheetEdit} /></label>
            {/each}
          </div>
        </div>
      {/if}

      {#if sheetTab === 'merits'}
        <ul>
          {#each selected.merits as merit, index}
            <li class="row">
              <span>{merit.name} ({merit.category}) • {merit.dots}</span>
              {#if sheetEdit}
                <button onclick={() => removeSelectedMerit(index)}>Remove</button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}

      {#if sheetTab === 'powers'}
        <label>Powers / Splat Data
          <textarea
            rows="8"
            disabled={!sheetEdit}
            value={String(selected.splatData.powers ?? '')}
            oninput={(e) => updateSelectedPowers((e.currentTarget as HTMLTextAreaElement).value)}
          ></textarea>
        </label>
      {/if}

      {#if sheetTab === 'notes'}
        <label>Notes
          <textarea rows="10" bind:value={selected.notes}></textarea>
        </label>
      {/if}
    </section>
  {/if}

  {#if screen === 'settings'}
    <section class="panel">
      <h2>The Archival Sanctum</h2>
      <label>Theme
        <select bind:value={theme} onchange={applyTheme}>
          <option value="dark">Dark Gothic</option>
          <option value="light">Light Parchment</option>
        </select>
      </label>
      <button onclick={() => (screen = 'dashboard')}>Back</button>
    </section>
  {/if}
</main>
