<script lang="ts">
  import './app.css';
  import { api } from './lib/api';
  import { ATTRIBUTE_GROUPS, emptyCharacter, formatLabel, SKILL_GROUPS, SPLATS } from './lib/constants';
  import type {
    Character,
    DiceRollResponse,
    DiceRule,
    LibraryMerit,
    LibraryPower,
    Merit,
    Splat
  } from './lib/types';

  type Page = 'dashboard' | 'wizard' | 'sheet' | 'dice' | 'settings';
  type SheetTab = 'info' | 'stats' | 'merits' | 'powers' | 'notes';

  let page = $state<Page>('dashboard');
  let sheetTab = $state<SheetTab>('info');
  let wizardStep = $state(0);
  let editing = $state(false);
  let loading = $state(false);
  let error = $state('');

  let characters = $state<Character[]>([]);
  let selectedCharacter = $state<Character | null>(null);
  let wizardCharacter = $state<Character>(emptyCharacter());

  let meritLibrary = $state<LibraryMerit[]>([]);
  let powerLibrary = $state<LibraryPower[]>([]);
  let meritFilter = $state('All');
  let meritSearch = $state('');

  let search = $state('');
  let sort = $state('created');

  let theme = $state<'dark' | 'light'>('dark');

  let poolSize = $state(5);
  let rule = $state<DiceRule>('AGAIN_10');
  let roteQuality = $state(false);
  let chanceDie = $state(false);
  let diceResult = $state<DiceRollResponse | null>(null);
  let rollHistory = $state<{ at: string; request: string; result: string }[]>([]);

  let specialtySkill = $state('athletics');
  let specialtyText = $state('');
  let meritDots = $state(1);

  const filteredMerits = $derived(
    meritLibrary.filter((m) => {
      const categoryOk = meritFilter === 'All' || m.category === meritFilter;
      const searchOk =
        meritSearch.trim().length === 0 ||
        m.name.toLowerCase().includes(meritSearch.toLowerCase()) ||
        m.description.toLowerCase().includes(meritSearch.toLowerCase());
      return categoryOk && searchOk;
    })
  );

  const xpRemaining = $derived(
    (selectedCharacter?.experienceTotal ?? 0) - (selectedCharacter?.experienceSpent ?? 0)
  );

  const sortedCharacterCards = $derived.by(() => {
    const list = [...characters];
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'splat') list.sort((a, b) => a.splat.localeCompare(b.splat));
    if (sort === 'created') list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    if (!search.trim()) return list;
    const needle = search.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(needle) || c.concept.toLowerCase().includes(needle));
  });

  function loadTheme() {
    const stored = localStorage.getItem('cod-theme');
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    }
    document.documentElement.dataset.theme = theme;
  }

  async function loadAll() {
    loading = true;
    error = '';
    try {
      [characters, meritLibrary, powerLibrary] = await Promise.all([
        api.listCharacters(search, sort),
        api.merits(),
        api.vampirePowers()
      ]);
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  function newWizard() {
    wizardCharacter = emptyCharacter();
    wizardStep = 0;
    page = 'wizard';
  }

  async function saveWizardCharacter() {
    if (!wizardCharacter.name.trim()) {
      error = 'Name is required.';
      return;
    }
    loading = true;
    error = '';
    try {
      const created = await api.createCharacter(wizardCharacter);
      selectedCharacter = created;
      page = 'sheet';
      sheetTab = 'info';
      characters = await api.listCharacters(search, sort);
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  function openCharacter(character: Character) {
    selectedCharacter = structuredClone(character);
    editing = false;
    page = 'sheet';
    sheetTab = 'info';
  }

  async function saveCharacter() {
    if (!selectedCharacter?.id) return;
    loading = true;
    error = '';
    try {
      selectedCharacter = await api.updateCharacter(selectedCharacter.id, selectedCharacter);
      characters = await api.listCharacters(search, sort);
      editing = false;
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  async function deleteCharacter() {
    if (!selectedCharacter?.id) return;
    if (!confirm(`Delete ${selectedCharacter.name}?`)) return;
    loading = true;
    error = '';
    try {
      await api.deleteCharacter(selectedCharacter.id);
      selectedCharacter = null;
      page = 'dashboard';
      characters = await api.listCharacters(search, sort);
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  async function rollDice() {
    loading = true;
    error = '';
    try {
      diceResult = await api.rollDice({ poolSize, rule, roteQuality, chanceDie });
      const row = {
        at: new Date().toLocaleTimeString(),
        request: `Pool ${poolSize} • ${rule} • Rote ${roteQuality ? 'On' : 'Off'} • Chance ${chanceDie ? 'Yes' : 'No'}`,
        result: `${diceResult.label} (${diceResult.successes} successes)`
      };
      rollHistory = [row, ...rollHistory].slice(0, 20);
      sessionStorage.setItem('dice-history', JSON.stringify(rollHistory));
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  function clearHistory() {
    rollHistory = [];
    sessionStorage.removeItem('dice-history');
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('cod-theme', theme);
    document.documentElement.dataset.theme = theme;
  }

  function setAttribute(key: keyof Character['attributes'], value: number, wizard = true) {
    const target = wizard ? wizardCharacter : selectedCharacter;
    if (!target) return;
    target.attributes[key] = value;
  }

  function setSkill(key: keyof Character['skills'], value: number, wizard = true) {
    const target = wizard ? wizardCharacter : selectedCharacter;
    if (!target) return;
    target.skills[key] = value;
  }

  function addSpecialty(wizard = true) {
    const target = wizard ? wizardCharacter : selectedCharacter;
    if (!target || !specialtyText.trim()) return;
    target.specialties = [
      ...target.specialties,
      { skill: specialtySkill as keyof Character['skills'], specialty: specialtyText.trim() }
    ];
    specialtyText = '';
  }

  function addMerit(source: LibraryMerit, wizard = true) {
    const target = wizard ? wizardCharacter : selectedCharacter;
    if (!target) return;
    const merit: Merit = {
      id: crypto.randomUUID(),
      name: source.name,
      category: source.category,
      dots: meritDots,
      description: source.description,
      prerequisites: source.prerequisites,
      isCustom: false
    };
    target.merits = [...target.merits, merit];
  }

  function addPower(name: string, description: string, wizard = true) {
    const target = wizard ? wizardCharacter : selectedCharacter;
    if (!target || !name.trim()) return;
    target.customPowers = [
      ...target.customPowers,
      { id: crypto.randomUUID(), name: name.trim(), dots: 1, description: description.trim() }
    ];
  }

  function updateBeats(index: number) {
    if (!selectedCharacter) return;
    const current = selectedCharacter.beatsTotal;
    selectedCharacter.beatsTotal = current === index + 1 ? index : index + 1;
    if (selectedCharacter.beatsTotal >= 5) {
      selectedCharacter.beatsTotal = 0;
      selectedCharacter.experienceTotal += 1;
    }
  }

  function cycleHealth(i: number) {
    if (!selectedCharacter) return;
    const states: Character['derivedStats']['healthBoxes'][number][] = ['EMPTY', 'BASHING', 'LETHAL', 'AGGRAVATED'];
    const current = selectedCharacter.derivedStats.healthBoxes[i] ?? 'EMPTY';
    const idx = states.indexOf(current);
    selectedCharacter.derivedStats.healthBoxes[i] = states[(idx + 1) % states.length];
  }

  function woundPenalty(): string {
    if (!selectedCharacter) return '0';
    const total = selectedCharacter.derivedStats.healthBoxes.length;
    const filled = selectedCharacter.derivedStats.healthBoxes.filter((h) => h !== 'EMPTY').length;
    if (filled === 0) return '0';
    const healthy = total - filled;
    if (healthy <= 0) return 'Incapacitated';
    if (healthy === 1) return '-3';
    if (healthy <= 2) return '-2';
    if (healthy <= 3) return '-1';
    return '0';
  }

  $effect(() => {
    loadTheme();
    const stored = sessionStorage.getItem('dice-history');
    if (stored) {
      try {
        rollHistory = JSON.parse(stored) as { at: string; request: string; result: string }[];
      } catch {
        rollHistory = [];
      }
    }
    void loadAll();
  });
</script>

<div class="layout">
  <aside class="sidebar">
    <h1>The Eldritch Editorial</h1>
    <button onclick={() => (page = 'dashboard')}>Dashboard</button>
    <button onclick={newWizard}>Character Creator</button>
    <button onclick={() => (page = 'dice')}>Dice Roller</button>
    <button onclick={() => (page = 'settings')}>Settings</button>
    <button class="accent" onclick={newWizard}>New Character</button>
  </aside>

  <main class="content">
    {#if error}
      <div class="error">{error}</div>
    {/if}

    {#if page === 'dashboard'}
      <section class="panel">
        <header class="row">
          <h2>Character List</h2>
          <div class="row">
            <input placeholder="Search by name or concept" bind:value={search} oninput={() => void loadAll()} />
            <select bind:value={sort} onchange={() => void loadAll()}>
              <option value="created">Newest</option>
              <option value="name">Name</option>
              <option value="splat">Splat</option>
            </select>
          </div>
        </header>
        {#if loading}
          <p>Loading...</p>
        {:else if sortedCharacterCards.length === 0}
          <p>No characters yet.</p>
        {:else}
          <div class="grid">
            {#each sortedCharacterCards as character}
              <button class="card" onclick={() => openCharacter(character)}>
                <strong>{character.name}</strong>
                <span>{character.splat}</span>
                <span>{character.concept || 'No concept'}</span>
                <small>{character.chronicle || 'No chronicle'}</small>
              </button>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    {#if page === 'wizard'}
      <section class="panel">
        <header class="row">
          <h2>Creation Wizard — Step {wizardStep + 1} / 6</h2>
          <div class="row">
            <button disabled={wizardStep === 0} onclick={() => (wizardStep -= 1)}>Previous</button>
            {#if wizardStep < 5}
              <button onclick={() => (wizardStep += 1)}>Next</button>
            {:else}
              <button class="accent" onclick={saveWizardCharacter}>Save Character</button>
            {/if}
          </div>
        </header>

        {#if wizardStep === 0}
          <div class="form-grid">
            <label>Name* <input bind:value={wizardCharacter.name} /></label>
            <label>Player <input bind:value={wizardCharacter.player} /></label>
            <label>Chronicle <input bind:value={wizardCharacter.chronicle} /></label>
            <label>Concept <input bind:value={wizardCharacter.concept} /></label>
            <label>Virtue <input bind:value={wizardCharacter.virtue} /></label>
            <label>Vice <input bind:value={wizardCharacter.vice} /></label>
          </div>
        {/if}

        {#if wizardStep === 1}
          <div class="chips">
            {#each SPLATS as splat}
              <button class={wizardCharacter.splat === splat ? 'chip active' : 'chip'} onclick={() => (wizardCharacter.splat = splat)}>
                {splat}
              </button>
            {/each}
          </div>
        {/if}

        {#if wizardStep === 2}
          {#each Object.entries(ATTRIBUTE_GROUPS) as [group, keys]}
            <h3>{group}</h3>
            {#each keys as key}
              <div class="dots-row">
                <span>{formatLabel(key)}</span>
                <div class="dots">
                  {#each [1, 2, 3, 4, 5] as dot}
                    <button class={wizardCharacter.attributes[key] >= dot ? 'dot filled' : 'dot'} onclick={() => setAttribute(key, dot)}>•</button>
                  {/each}
                </div>
              </div>
            {/each}
          {/each}
        {/if}

        {#if wizardStep === 3}
          {#each Object.entries(SKILL_GROUPS) as [group, keys]}
            <h3>{group}</h3>
            {#each keys as key}
              <div class="dots-row">
                <span>{formatLabel(key)}</span>
                <div class="dots">
                  {#each [0, 1, 2, 3, 4, 5] as dot}
                    <button class={wizardCharacter.skills[key] >= dot && dot !== 0 ? 'dot filled' : 'dot'} onclick={() => setSkill(key, dot)}>{dot === 0 ? '0' : '•'}</button>
                  {/each}
                </div>
              </div>
            {/each}
          {/each}

          <div class="row mt">
            <select bind:value={specialtySkill}>
              {#each Object.keys(wizardCharacter.skills) as key}
                <option value={key}>{formatLabel(key)}</option>
              {/each}
            </select>
            <input placeholder="Specialty" bind:value={specialtyText} />
            <button onclick={() => addSpecialty(true)}>Add Specialty</button>
          </div>

          <ul>
            {#each wizardCharacter.specialties as s}
              <li>{formatLabel(s.skill)} — {s.specialty}</li>
            {/each}
          </ul>
        {/if}

        {#if wizardStep === 4}
          <div class="row">
            <input placeholder="Search merits" bind:value={meritSearch} />
            <select bind:value={meritFilter}>
              <option>All</option>
              <option>Mental</option>
              <option>Physical</option>
              <option>Social</option>
              <option>Supernatural</option>
              <option>Fighting</option>
            </select>
            <select bind:value={meritDots}>
              <option value={1}>•</option>
              <option value={2}>••</option>
              <option value={3}>•••</option>
              <option value={4}>••••</option>
              <option value={5}>•••••</option>
            </select>
          </div>

          <div class="grid">
            {#each filteredMerits.slice(0, 20) as merit}
              <article class="card left">
                <strong>{merit.name}</strong>
                <small>{merit.category}</small>
                <p>{merit.description}</p>
                {#if merit.prerequisites}
                  <small>Prerequisites: {merit.prerequisites}</small>
                {/if}
                <button onclick={() => addMerit(merit, true)}>Select</button>
              </article>
            {/each}
          </div>

          <h3>Selected Merits</h3>
          <ul>
            {#each wizardCharacter.merits as merit, i}
              <li>{merit.name} {'•'.repeat(merit.dots)}
                <button onclick={() => (wizardCharacter.merits = wizardCharacter.merits.filter((_, idx) => idx !== i))}>Remove</button>
              </li>
            {/each}
          </ul>
        {/if}

        {#if wizardStep === 5}
          {#if wizardCharacter.splat !== 'MORTAL'}
            <label>Supernatural Notes
              <textarea
                placeholder="Clan, covenant, resources, and powers..."
                value={(wizardCharacter.splatData['summary'] as string) ?? ''}
                oninput={(e) => (wizardCharacter.splatData['summary'] = (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
            </label>
          {:else}
            <p>Mortal selected: no mandatory supernatural fields.</p>
          {/if}

          <h3>Power Entries</h3>
          <div class="row">
            <button
              onclick={() =>
                addPower('Celerity', '"The world slows to a crawl as blood burns through your veins. You are the predator that exists between heartbeats."', true)}
              >Add Celerity Quote</button>
            <button
              onclick={() =>
                addPower('Dominate', 'The art of the crushing will. Bend the minds of mortals to your absolute whim with a single spoken word.', true)}
              >Add Dominate</button>
          </div>
          <ul>
            {#each wizardCharacter.customPowers as power, i}
              <li>{power.name} ({power.dots}) — {power.description}
                <button onclick={() => (wizardCharacter.customPowers = wizardCharacter.customPowers.filter((_, idx) => idx !== i))}>Remove</button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}

    {#if page === 'sheet' && selectedCharacter}
      <section class="panel">
        <header class="row">
          <div>
            <h2>{selectedCharacter.name}</h2>
            <small>{selectedCharacter.splat} • {selectedCharacter.concept || 'No concept'}</small>
          </div>
          <div class="row">
            <button onclick={() => (editing = !editing)}>{editing ? 'Cancel Edit' : 'Edit'}</button>
            {#if editing}
              <button class="accent" onclick={saveCharacter}>Save</button>
            {/if}
            <button class="danger" onclick={deleteCharacter}>Delete</button>
          </div>
        </header>

        <nav class="tabs">
          <button class:active={sheetTab === 'info'} onclick={() => (sheetTab = 'info')}>Info</button>
          <button class:active={sheetTab === 'stats'} onclick={() => (sheetTab = 'stats')}>Attributes & Skills</button>
          <button class:active={sheetTab === 'merits'} onclick={() => (sheetTab = 'merits')}>Merits</button>
          <button class:active={sheetTab === 'powers'} onclick={() => (sheetTab = 'powers')}>Powers / Splat</button>
          <button class:active={sheetTab === 'notes'} onclick={() => (sheetTab = 'notes')}>Notes</button>
        </nav>

        {#if sheetTab === 'info'}
          <div class="form-grid">
            <label>Name <input bind:value={selectedCharacter.name} disabled={!editing} /></label>
            <label>Player <input bind:value={selectedCharacter.player} disabled={!editing} /></label>
            <label>Chronicle <input bind:value={selectedCharacter.chronicle} disabled={!editing} /></label>
            <label>Concept <input bind:value={selectedCharacter.concept} disabled={!editing} /></label>
            <label>Virtue <input bind:value={selectedCharacter.virtue} disabled={!editing} /></label>
            <label>Vice <input bind:value={selectedCharacter.vice} disabled={!editing} /></label>
            <label>Portrait URL <input bind:value={selectedCharacter.portraitUri} disabled={!editing} /></label>
          </div>

          <div class="row mt">
            <label>Total XP <input type="number" bind:value={selectedCharacter.experienceTotal} disabled={!editing} /></label>
            <label>Spent XP <input type="number" bind:value={selectedCharacter.experienceSpent} disabled={!editing} /></label>
            <strong>Remaining XP: {xpRemaining}</strong>
          </div>

          <div class="row mt">
            <span>Beats:</span>
            {#each [0, 1, 2, 3, 4] as i}
              <button class={selectedCharacter.beatsTotal > i ? 'dot filled' : 'dot'} onclick={() => updateBeats(i)} disabled={!editing}>✓</button>
            {/each}
          </div>
        {/if}

        {#if sheetTab === 'stats'}
          <div class="form-grid">
            <div>
              <h3>Derived</h3>
              <p>Speed: {selectedCharacter.derivedStats.speed}</p>
              <p>Defense: {selectedCharacter.derivedStats.defense}</p>
              <p>Initiative: {selectedCharacter.derivedStats.initiative}</p>
              <p>Perception: {selectedCharacter.derivedStats.perception}</p>
              <p>Size: {selectedCharacter.derivedStats.size}</p>
              <p>Health Max: {selectedCharacter.derivedStats.healthMax}</p>
              <p>Willpower Max: {selectedCharacter.derivedStats.willpowerMax}</p>
              <p>Wound Penalty: {woundPenalty()}</p>
            </div>
            <div>
              <h3>Health Track</h3>
              <div class="row wrap">
                {#each selectedCharacter.derivedStats.healthBoxes as _, i}
                  <button class="dot" onclick={() => cycleHealth(i)} disabled={!editing}>
                    {selectedCharacter.derivedStats.healthBoxes[i] === 'EMPTY'
                      ? '□'
                      : selectedCharacter.derivedStats.healthBoxes[i] === 'BASHING'
                        ? '/'
                        : selectedCharacter.derivedStats.healthBoxes[i] === 'LETHAL'
                          ? 'X'
                          : '*'}
                  </button>
                {/each}
              </div>
            </div>
          </div>

          {#each Object.entries(ATTRIBUTE_GROUPS) as [group, keys]}
            <h3>{group} Attributes</h3>
            {#each keys as key}
              <div class="dots-row">
                <span>{formatLabel(key)}</span>
                <div class="dots">
                  {#each [1, 2, 3, 4, 5] as dot}
                    <button
                      class={selectedCharacter.attributes[key] >= dot ? 'dot filled' : 'dot'}
                      onclick={() => setAttribute(key, dot, false)}
                      disabled={!editing}>•</button>
                  {/each}
                </div>
              </div>
            {/each}
          {/each}

          {#each Object.entries(SKILL_GROUPS) as [group, keys]}
            <h3>{group} Skills</h3>
            {#each keys as key}
              <div class="dots-row">
                <span>{formatLabel(key)}</span>
                <div class="dots">
                  {#each [0, 1, 2, 3, 4, 5] as dot}
                    <button
                      class={selectedCharacter.skills[key] >= dot && dot !== 0 ? 'dot filled' : 'dot'}
                      onclick={() => setSkill(key, dot, false)}
                      disabled={!editing}>{dot === 0 ? '0' : '•'}</button>
                  {/each}
                </div>
              </div>
            {/each}
          {/each}

          <h3>Specialties</h3>
          <ul>
            {#each selectedCharacter.specialties as specialty, i}
              <li>{formatLabel(specialty.skill)} — {specialty.specialty}
                {#if editing}<button onclick={() => (selectedCharacter.specialties = selectedCharacter.specialties.filter((_, idx) => idx !== i))}>Remove</button>{/if}
              </li>
            {/each}
          </ul>
        {/if}

        {#if sheetTab === 'merits'}
          <h3>Current Merits</h3>
          <ul>
            {#each selectedCharacter.merits as merit, i}
              <li>
                <strong>{merit.name}</strong> {'•'.repeat(merit.dots)} — {merit.category}
                <p>{merit.description}</p>
                {#if merit.prerequisites}<small>Prerequisites: {merit.prerequisites}</small>{/if}
                {#if editing}<button onclick={() => (selectedCharacter.merits = selectedCharacter.merits.filter((_, idx) => idx !== i))}>Remove</button>{/if}
              </li>
            {/each}
          </ul>

          {#if editing}
            <h3>Add from Library</h3>
            <div class="grid">
              {#each filteredMerits.slice(0, 12) as merit}
                <article class="card left">
                  <strong>{merit.name}</strong>
                  <small>{merit.category}</small>
                  <p>{merit.description}</p>
                  <button onclick={() => addMerit(merit, false)}>Add</button>
                </article>
              {/each}
            </div>
          {/if}
        {/if}

        {#if sheetTab === 'powers'}
          <h3>Splat Data</h3>
          <label>
            Summary
            <textarea
              value={(selectedCharacter.splatData['summary'] as string) ?? ''}
              disabled={!editing}
              oninput={(e) => (selectedCharacter.splatData['summary'] = (e.currentTarget as HTMLTextAreaElement).value)}></textarea>
          </label>

          <h3>Powers</h3>
          <ul>
            {#each selectedCharacter.customPowers as power, i}
              <li>
                <strong>{power.name}</strong> {'•'.repeat(power.dots)}
                <p>{power.description}</p>
                {#if editing}<button onclick={() => (selectedCharacter.customPowers = selectedCharacter.customPowers.filter((_, idx) => idx !== i))}>Remove</button>{/if}
              </li>
            {/each}
          </ul>

          {#if editing}
            <h3>Vampire Library</h3>
            <div class="grid">
              {#each powerLibrary.slice(0, 10) as power}
                <article class="card left">
                  <strong>{power.name}</strong>
                  <small>{power.type}</small>
                  <p>{power.description}</p>
                  <button onclick={() => addPower(power.name, power.description, false)}>Add to Character</button>
                </article>
              {/each}
            </div>
          {/if}
        {/if}

        {#if sheetTab === 'notes'}
          <label>
            Notes
            <textarea bind:value={selectedCharacter.notes}></textarea>
          </label>
        {/if}
      </section>
    {/if}

    {#if page === 'dice'}
      <section class="panel">
        <h2>Dice Roller</h2>
        <div class="row mt">
          <label>Pool <input type="number" min="0" max="30" bind:value={poolSize} /></label>
          <label>Rule
            <select bind:value={rule}>
              <option value="AGAIN_10">10-again</option>
              <option value="AGAIN_9">9-again</option>
              <option value="AGAIN_8">8-again</option>
              <option value="NONE">No Explode</option>
            </select>
          </label>
          <label><input type="checkbox" bind:checked={roteQuality} /> Rote quality</label>
          <label><input type="checkbox" bind:checked={chanceDie} /> Chance die mode</label>
          <button class="accent" onclick={rollDice}>Roll</button>
          <button onclick={clearHistory}>Clear history</button>
        </div>

        {#if diceResult}
          <article class="card left mt">
            <strong>{diceResult.label}</strong>
            <p>Successes: {diceResult.successes}</p>
            <p>Dice: {diceResult.dice.join(', ')}</p>
          </article>
        {/if}

        <h3>Roll History</h3>
        <ul>
          {#each rollHistory as item}
            <li>
              <strong>{item.at}</strong> — {item.request}
              <br />
              <small>{item.result}</small>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if page === 'settings'}
      <section class="panel">
        <h2>Settings</h2>
        <button onclick={toggleTheme}>Theme: {theme === 'dark' ? 'Dark Gothic' : 'Light Parchment'}</button>
      </section>
    {/if}
  </main>
</div>
