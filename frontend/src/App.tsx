import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { ATTRIBUTE_GROUPS, defaultCharacter, SKILL_GROUPS, SPLATS, THEME_KEY } from './constants';
import type { Character, DiceRollResult, LibraryMerit, Merit } from './types';
import { cloneCharacter, cycleHealth, remainingXp, woundPenalty } from './utils';

type Screen = 'login' | 'dashboard' | 'wizard' | 'sheet' | 'chronicle' | 'settings';
type SortMode = 'created' | 'name' | 'splat';
type SheetTab = 'info' | 'attributes' | 'merits' | 'powers' | 'notes';
type DiceHistoryItem = { id: string; at: string; input: string; output: string };

const wizardStepLabels = ['Core Identity', 'Splat', 'Attributes', 'Skills', 'Merits', 'Powers'];
const beastHungerChoices = [
  {
    key: 'PREY',
    title: 'Hunger for the Prey',
    body: 'You hunger for the thrill of the chase and the moment of total dominance.',
    tags: ['Stalking', 'Terror']
  },
  {
    key: 'POWER',
    title: 'Hunger for the Power',
    body: 'You crave authority and the submission of those who call themselves masters.',
    tags: ['Command', 'Submission']
  },
  {
    key: 'FORBIDDEN',
    title: 'Hunger for the Forbidden',
    body: 'You seek truths never meant for mortal minds and feed on unraveling secrets.',
    tags: ['Secrets', 'Madness']
  }
] as const;

const emptySkills = { physical: [], social: [], mental: [] };
const emptySplatOptions = { vampireClans: [], vampireCovenants: [], beastFamilies: [], beastHungers: [] };

function createClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState<Character | null>(null);
  const [draft, setDraft] = useState<Character>(() => defaultCharacter());
  const [wizardStep, setWizardStep] = useState(0);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('created');
  const [meritsLibrary, setMeritsLibrary] = useState<LibraryMerit[]>([]);
  const [meritCategory, setMeritCategory] = useState('All');
  const [skillsLibrary, setSkillsLibrary] = useState<{ physical: string[]; social: string[]; mental: string[] }>(
    emptySkills
  );
  const [splatOptions, setSplatOptions] = useState<{
    vampireClans: string[];
    vampireCovenants: string[];
    beastFamilies: string[];
    beastHungers: string[];
  }>(emptySplatOptions);
  const [sheetEdit, setSheetEdit] = useState(false);
  const [sheetTab, setSheetTab] = useState<SheetTab>('info');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [errorMessage, setErrorMessage] = useState('');
  const [dicePool, setDicePool] = useState(5);
  const [diceRule, setDiceRule] = useState('10again');
  const [diceRote, setDiceRote] = useState(false);
  const [diceChance, setDiceChance] = useState(false);
  const [diceResult, setDiceResult] = useState<DiceRollResult | null>(null);
  const [diceHistory, setDiceHistory] = useState<DiceHistoryItem[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }

    void Promise.all([loadCharacters(), loadMerits(), loadSkills(), loadSplatOptions()]);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const sortedCharacters = useMemo(() => {
    let list = characters.filter((character) => {
      const q = search.trim().toLowerCase();
      return q.length === 0 || character.name.toLowerCase().includes(q) || character.concept.toLowerCase().includes(q);
    });

    if (sortMode === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'splat') {
      list = [...list].sort((a, b) => a.splat.localeCompare(b.splat));
    } else {
      list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    }

    return list;
  }, [characters, search, sortMode]);

  const filteredMerits = useMemo(
    () => (meritCategory === 'All' ? meritsLibrary : meritsLibrary.filter((merit) => merit.category === meritCategory)),
    [meritCategory, meritsLibrary]
  );
  const meritCategories = useMemo(() => ['All', ...new Set(meritsLibrary.map((merit) => merit.category))], [meritsLibrary]);
  const wizardHeroTitle = wizardStep === 5 && draft.splat === 'BEAST' ? 'The Soul’s Desires' : 'Character Composition';
  const wizardHeroSubtitle =
    wizardStep === 5 && draft.splat === 'BEAST'
      ? 'Choose your Hunger and Horror'
      : 'Shape the dossier of your dark persona';
  const chronicleEvents = useMemo(() => {
    const characterEvents = characters.slice(0, 6).map((character) => ({
      id: character.id,
      time: new Date(character.createdAt).toLocaleDateString(),
      text: `${character.name} (${character.splat}) entered the archive.`,
      note: character.chronicle || 'No chronicle assigned'
    }));
    const rollEvents = diceHistory.slice(0, 6).map((item) => ({
      id: item.id,
      time: item.at,
      text: item.output,
      note: item.input
    }));

    return [...rollEvents, ...characterEvents].slice(0, 8);
  }, [characters, diceHistory]);

  async function loadCharacters() {
    try {
      setCharacters(await api.listCharacters());
      setErrorMessage('');
    } catch {
      setErrorMessage('Backend unavailable. Start Spring Boot on port 8080.');
    }
  }

  async function loadMerits() {
    try {
      setMeritsLibrary(await api.listMerits());
    } catch {
      setMeritsLibrary([]);
    }
  }

  async function loadSkills() {
    try {
      setSkillsLibrary(await api.listSkills());
    } catch {
      setSkillsLibrary(emptySkills);
    }
  }

  async function loadSplatOptions() {
    try {
      setSplatOptions(await api.listSplatOptions());
    } catch {
      setSplatOptions(emptySplatOptions);
    }
  }

  function beginWizard() {
    setDraft(defaultCharacter());
    setWizardStep(0);
    setScreen('wizard');
  }

  async function saveWizard() {
    if (!draft.name.trim()) {
      setErrorMessage('Name is required.');
      return;
    }

    const created = await api.createCharacter(draft);
    setCharacters((prev) => [created, ...prev]);
    setSelected(created);
    setScreen('sheet');
    setSheetEdit(false);
    setSheetTab('info');
    setErrorMessage('');
  }

  function addMerit(template: LibraryMerit) {
    const merit: Merit = {
      id: createClientId(),
      name: template.name,
      category: template.category,
      dots: Math.min(5, Math.max(1, template.allowedDots[0] ?? 1)),
      description: template.description,
      prerequisites: template.prerequisites,
      isCustom: false
    };
    setDraft((prev) => ({ ...prev, merits: [...prev.merits, merit] }));
  }

  function openSheet(character: Character) {
    setSelected(cloneCharacter(character));
    setScreen('sheet');
    setSheetEdit(false);
    setSheetTab('info');
  }

  async function saveSheet() {
    if (!selected) return;
    const updated = await api.updateCharacter(selected.id, selected);
    setCharacters((prev) => prev.map((character) => (character.id === updated.id ? updated : character)));
    setSelected(cloneCharacter(updated));
    setSheetEdit(false);
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!window.confirm('Delete this character?')) return;

    const id = selected.id;
    await api.deleteCharacter(id);
    setCharacters((prev) => prev.filter((character) => character.id !== id));
    setSelected(null);
    setScreen('dashboard');
  }

  function incrementBeats() {
    setSelected((prev) => {
      if (!prev) return prev;
      const next = cloneCharacter(prev);
      next.beatsTotal += 1;
      if (next.beatsTotal >= 5) {
        next.experienceTotal += 1;
        next.beatsTotal = 0;
      }
      return next;
    });
  }

  async function rollDice() {
    const payload = {
      poolSize: diceChance ? 0 : dicePool,
      rule: diceRule,
      roteQuality: diceRote,
      chanceDie: diceChance
    };

    const result = await api.rollDice(payload);
    setDiceResult(result);
    const label = result.dramaticFailure
      ? 'Dramatic Failure'
      : result.exceptional
        ? 'Exceptional Success'
        : result.successes > 0
          ? 'Success'
          : 'Failure';
    setDiceHistory((prev) => [
      {
        id: createClientId(),
        at: new Date().toLocaleTimeString(),
        input: diceChance ? 'Chance Die' : `Pool ${dicePool} / ${diceRule}`,
        output: `${label} (${result.successes})`
      },
      ...prev
    ]);
  }

  function updateDraftText<K extends keyof Character>(key: K, value: Character[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function updateDraftNumberBag(section: 'attributes' | 'skills', key: string, value: number) {
    setDraft((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  }

  function updateDraftSplatData(key: string, value: string) {
    setDraft((prev) => ({ ...prev, splatData: { ...prev.splatData, [key]: value } }));
  }

  function updateSelectedText<K extends keyof Character>(key: K, value: Character[K]) {
    setSelected((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateSelectedNumberBag(section: 'attributes' | 'skills', key: string, value: number) {
    setSelected((prev) => (prev ? { ...prev, [section]: { ...prev[section], [key]: value } } : prev));
  }

  function updateSelectedSplatData(key: string, value: string) {
    setSelected((prev) => (prev ? { ...prev, splatData: { ...prev.splatData, [key]: value } } : prev));
  }

  function toggleHealth(index: number, status: string) {
    setSelected((prev) => {
      if (!prev) return prev;
      const next = cloneCharacter(prev);
      next.derivedStats.healthBoxes[index] = cycleHealth(status as 'EMPTY' | 'BASHING' | 'LETHAL' | 'AGGRAVATED');
      return next;
    });
  }

  function removeSelectedMerit(index: number) {
    setSelected((prev) => {
      if (!prev) return prev;
      const next = cloneCharacter(prev);
      next.merits.splice(index, 1);
      return next;
    });
  }

  function filledHealthCount(character: Character) {
    return character.derivedStats.healthBoxes.filter((box) => box !== 'EMPTY').length;
  }

  function healthPercent(character: Character) {
    const max = Math.max(1, character.derivedStats.healthBoxes.length);
    return (filledHealthCount(character) / max) * 100;
  }

  function pickBeastHunger(choice: (typeof beastHungerChoices)[number]) {
    const matched = splatOptions.beastHungers.find((hunger) => hunger === choice.key || hunger === choice.title);
    updateDraftSplatData('hunger', matched ?? choice.key);
  }

  function isHungerChoiceActive(choice: (typeof beastHungerChoices)[number]) {
    return [choice.key, choice.title].some((value) => value === String(draft.splatData.hunger ?? ''));
  }

  return (
    <main className="app-root">
      {screen !== 'login' && (
        <header className="topbar">
          <h1 className="brand">The Eldritch Editorial</h1>
          <nav className="topnav">
            <button className={screen === 'dashboard' ? 'active' : ''} onClick={() => setScreen('dashboard')}>
              Chronicle
            </button>
              <button className={screen === 'wizard' ? 'active' : ''} onClick={() => setScreen('wizard')}>
                Creator
              </button>
              <button className={screen === 'sheet' ? 'active' : ''} onClick={() => selected && setScreen('sheet')} disabled={!selected}>
                Sheet
              </button>
              <button className={screen === 'chronicle' ? 'active' : ''} onClick={() => setScreen('chronicle')}>
                Chronicle Log
              </button>
              <button className={screen === 'settings' ? 'active' : ''} onClick={() => setScreen('settings')}>
                Settings
              </button>
          </nav>
          <div className="top-actions">
            <span aria-hidden="true">◎</span>
            <span aria-hidden="true">✶</span>
            <span className="avatar">EE</span>
          </div>
        </header>
      )}

      {screen === 'login' && (
        <section className="login-layout">
          <div className="login-hero">
            <h2>“Truth is a shadow waiting to be cast.”</h2>
            <p>THE ELDRITCH EDITORIAL</p>
          </div>
          <div className="login-panel">
            <p className="kicker">Volume V: Nocturnal</p>
            <h1>{authMode === 'login' ? 'Enter the Archive' : 'Register New Blood'}</h1>
            <label><span>Initiate Username</span><input placeholder="V.TEPES" /></label>
            <label><span>Cipher Key</span><input type="password" placeholder="••••••••" /></label>
            {authMode === 'register' && <label><span>Confirm Cipher</span><input type="password" placeholder="••••••••" /></label>}
            <button className="primary" onClick={() => setScreen('dashboard')}>
              {authMode === 'login' ? 'Finalize Grimoire' : 'Seal Registration'}
            </button>
            <div className="login-footer">
              <button onClick={() => setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'))}>
                {authMode === 'login' ? 'Register' : 'Back to Login'}
              </button>
              <button className="ghost-button">Recover Lost Script</button>
            </div>
          </div>
        </section>
      )}

      {screen === 'dashboard' && (
        <section className="page with-topbar">
          <div className="page-head">
            <div>
              <h2>Character Dossiers</h2>
              <p>Chronicles of Darkness • Active Roster</p>
            </div>
            <div className="head-actions">
              <button className="primary" onClick={beginWizard}>New Character</button>
              <button onClick={() => setScreen('settings')}>Settings</button>
            </div>
          </div>

          <div className="toolbar">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or concept" />
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
              <option value="created">Newest</option>
              <option value="name">Name</option>
              <option value="splat">Splat</option>
            </select>
          </div>

          <div className="card-grid">
            {sortedCharacters.map((character) => (
              <button className="dossier-card" onClick={() => openSheet(character)} key={character.id}>
                <div className="dossier-banner"><span>{character.splat}</span></div>
                <div className="dossier-body">
                  <h3>{character.name}</h3>
                  <p className="concept">{character.concept || 'No concept recorded'}</p>
                  <p className="meta">{character.chronicle || 'No chronicle'} • {new Date(character.createdAt).toLocaleDateString()}</p>
                  <div className="track-line"><strong>Health</strong><span>{filledHealthCount(character)}/{character.derivedStats.healthBoxes.length}</span></div>
                  <div className="track"><span style={{ width: `${healthPercent(character)}%` }}></span></div>
                </div>
              </button>
            ))}
            <button className="dossier-card empty" onClick={beginWizard}>
              <div className="dossier-body">
                <h3>Forge New Identity</h3>
                <p className="concept">Start a new chronicle</p>
              </div>
            </button>
          </div>

          <section className="dice-panel">
            <div className="section-head"><h3>Dice Roller</h3></div>
            <div className="toolbar wrap">
              <label>Pool<input type="number" min="0" max="30" value={dicePool} onChange={(event) => setDicePool(Number(event.target.value))} /></label>
              <label>Rule
                <select value={diceRule} onChange={(event) => setDiceRule(event.target.value)}>
                  <option value="10again">10-again</option>
                  <option value="9again">9-again</option>
                  <option value="8again">8-again</option>
                  <option value="none">No Explode</option>
                </select>
              </label>
              <label className="check"><input type="checkbox" checked={diceRote} onChange={(event) => setDiceRote(event.target.checked)} /> Rote</label>
              <label className="check"><input type="checkbox" checked={diceChance} onChange={(event) => setDiceChance(event.target.checked)} /> Chance</label>
              <button className="primary" onClick={() => void rollDice()}>Roll</button>
              <button onClick={() => setDiceHistory([])}>Clear</button>
            </div>
            {diceResult && <p className="dice-result">Dice: {diceResult.dice.join(', ')} • Successes: {diceResult.successes}</p>}
            <ul className="history-list">{diceHistory.map((item) => <li key={item.id}>{item.at} — {item.input} — {item.output}</li>)}</ul>
          </section>

          <section className="activity-grid">
            <article className="info-card">
              <div className="section-head"><h3>Recent Activity</h3></div>
              <ul className="history-list">
                {chronicleEvents.map((event) => (
                  <li key={event.id}>
                    <strong>{event.time}</strong> — {event.text}
                    <br />
                    <span className="muted">{event.note}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="editorial-note">
              <h3>The Editorial Note</h3>
              <p>
                “The shadows are deepening. New dossiers and traces continue to gather in the archive.”
              </p>
              <span>{characters.length} active dossiers</span>
            </article>
          </section>

          {errorMessage && <p className="error">{errorMessage}</p>}
        </section>
      )}

      {screen === 'wizard' && (
        <section className="wizard-shell with-topbar">
          <aside className="wizard-side">
            <h2>Character Creator</h2>
            <p>Step {wizardStep + 1}: {wizardStepLabels[wizardStep]}</p>
            <nav>{wizardStepLabels.map((label, index) => <button className={wizardStep === index ? 'active' : ''} onClick={() => setWizardStep(index)} key={label}>{label}</button>)}</nav>
            <div className="wizard-footer">
              <button onClick={() => setScreen('dashboard')}>Back to Chronicle</button>
              <button className="primary" onClick={() => void saveWizard()}>Finalize Legend</button>
            </div>
          </aside>

          <div className="wizard-main">
            <header className="page-head compact"><div><h2>{wizardHeroTitle}</h2><p>{wizardHeroSubtitle}</p></div></header>

            {wizardStep === 0 && (
              <div className="field-grid two">
                <label>Name<input value={draft.name} onChange={(event) => updateDraftText('name', event.target.value)} required /></label>
                <label>Player<input value={draft.player} onChange={(event) => updateDraftText('player', event.target.value)} /></label>
                <label>Chronicle<input value={draft.chronicle} onChange={(event) => updateDraftText('chronicle', event.target.value)} /></label>
                <label>Concept<input value={draft.concept} onChange={(event) => updateDraftText('concept', event.target.value)} /></label>
                <label>Virtue<input value={draft.virtue} onChange={(event) => updateDraftText('virtue', event.target.value)} /></label>
                <label>Vice<input value={draft.vice} onChange={(event) => updateDraftText('vice', event.target.value)} /></label>
              </div>
            )}

            {wizardStep === 1 && (
              <section>
                <div className="section-head"><h3>Select Splat</h3></div>
                <div className="chip-grid">{SPLATS.map((splat) => <button className={draft.splat === splat ? 'active' : ''} onClick={() => updateDraftText('splat', splat)} key={splat}>{splat}</button>)}</div>
              </section>
            )}

            {wizardStep === 2 && Object.entries(ATTRIBUTE_GROUPS).map(([group, keys]) => (
              <section className="wizard-section" key={group}>
                <div className="section-head"><h3>{group}</h3></div>
                <div className="field-grid three">{keys.map((key) => <label key={key}>{key}<input type="number" min="1" max="5" value={draft.attributes[key]} onChange={(event) => updateDraftNumberBag('attributes', key, Number(event.target.value))} /></label>)}</div>
              </section>
            ))}

            {wizardStep === 3 && Object.entries(SKILL_GROUPS).map(([group, keys]) => {
              const mappedSkills = skillsLibrary[group.toLowerCase() as 'physical' | 'social' | 'mental'];
              return (
                <section className="wizard-section" key={group}>
                  <div className="section-head"><h3>{group}</h3></div>
                  <div className="field-grid three">{keys.map((key, skillIndex) => <label key={key}>{mappedSkills[skillIndex] ?? key}<input type="number" min="0" max="5" value={draft.skills[key]} onChange={(event) => updateDraftNumberBag('skills', key, Number(event.target.value))} /></label>)}</div>
                </section>
              );
            })}

            {wizardStep === 4 && (
              <section className="wizard-section">
                <div className="toolbar"><label>Category<select value={meritCategory} onChange={(event) => setMeritCategory(event.target.value)}>{meritCategories.map((category) => <option value={category} key={category}>{category}</option>)}</select></label></div>
                <div className="card-grid merits">{filteredMerits.map((merit) => <article className="info-card" key={merit.id}><h3>{merit.name}</h3><p>{merit.description}</p><small>{merit.prerequisites}</small><button className="primary" onClick={() => addMerit(merit)}>Select</button></article>)}</div>
                <h3 className="subhead">Selected Merits</h3>
                <ul className="history-list">{draft.merits.map((merit) => <li key={merit.id}>{merit.name} • {merit.dots}</li>)}</ul>
              </section>
            )}

            {wizardStep === 5 && (draft.splat === 'BEAST' ? (
              <>
                <section className="wizard-section">
                  <div className="section-head between"><h3>The Hunger</h3><span>Select one primordial yearning</span></div>
                  <div className="hunger-grid">
                    {beastHungerChoices.map((choice) => (
                      <button
                        className={`hunger-card ${isHungerChoiceActive(choice) ? 'active' : ''}`}
                        onClick={() => pickBeastHunger(choice)}
                        key={choice.key}
                      >
                        <h4>{choice.title}</h4>
                        <p>{choice.body}</p>
                        <div className="chips">
                          {choice.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="wizard-section horror-layout">
                  <div>
                    <div className="section-head"><h3>The Horror</h3></div>
                    <h4>Manifest the Nightmare Soul</h4>
                    <p>Your Horror is the truth hidden beneath the skin; the thing that stares back when the Hunger takes hold.</p>
                    <ul><li>“A thousand-eyed beast made of shifting obsidian glass.”</li><li>“A silent void that smells of old earth and ozone.”</li><li>“A titan of rusted iron and weeping gears.”</li></ul>
                  </div>
                  <label className="horror-input">Visual description & manifestation<textarea rows={10} value={String(draft.splatData.powers ?? '')} onChange={(event) => updateDraftSplatData('powers', event.target.value)} placeholder="Describe the shape your soul takes in the darkness..."></textarea></label>
                </section>
              </>
            ) : (
              <>
                {draft.splat !== 'MORTAL' ? (
                  <>
                    {draft.splat === 'VAMPIRE' && (
                      <div className="field-grid two">
                        <label>Clan<select value={String(draft.splatData.clan ?? '')} onChange={(event) => updateDraftSplatData('clan', event.target.value)}><option value="">Select Clan</option>{splatOptions.vampireClans.map((clan) => <option value={clan} key={clan}>{clan}</option>)}</select></label>
                        <label>Covenant<select value={String(draft.splatData.covenant ?? '')} onChange={(event) => updateDraftSplatData('covenant', event.target.value)}><option value="">Select Covenant</option>{splatOptions.vampireCovenants.map((covenant) => <option value={covenant} key={covenant}>{covenant}</option>)}</select></label>
                      </div>
                    )}
                    <label>Powers / Abilities<textarea rows={8} value={String(draft.splatData.powers ?? '')} onChange={(event) => updateDraftSplatData('powers', event.target.value)}></textarea></label>
                  </>
                ) : (
                  <p className="muted">Mortal has no additional splat data.</p>
                )}
              </>
            ))}

            <footer className="wizard-actions">
              <button onClick={() => setScreen('dashboard')}>Cancel</button>
              <button disabled={wizardStep === 0} onClick={() => setWizardStep((prev) => prev - 1)}>Previous</button>
              {wizardStep < 5 ? <button className="primary" onClick={() => setWizardStep((prev) => prev + 1)}>Next</button> : <button className="primary" onClick={() => void saveWizard()}>Commit Essence</button>}
            </footer>
            {errorMessage && <p className="error">{errorMessage}</p>}
          </div>
        </section>
      )}

      {screen === 'sheet' && selected && (
        <section className="page with-topbar">
          <div className="page-head">
            <div><h2>{selected.name}</h2><p>{selected.splat} • {selected.concept || 'No concept'}</p></div>
            <div className="head-actions">
              <button onClick={() => setScreen('dashboard')}>Back</button>
              <button onClick={() => setSheetEdit((prev) => !prev)}>{sheetEdit ? 'View' : 'Edit'}</button>
              {sheetEdit && <button className="primary" onClick={() => void saveSheet()}>Save</button>}
              <button onClick={() => void deleteSelected()}>Delete</button>
            </div>
          </div>

          <nav className="tab-row">
            <button className={sheetTab === 'info' ? 'active' : ''} onClick={() => setSheetTab('info')}>Info</button>
            <button className={sheetTab === 'attributes' ? 'active' : ''} onClick={() => setSheetTab('attributes')}>Attributes & Skills</button>
            <button className={sheetTab === 'merits' ? 'active' : ''} onClick={() => setSheetTab('merits')}>Merits</button>
            <button className={sheetTab === 'powers' ? 'active' : ''} onClick={() => setSheetTab('powers')}>Powers</button>
            <button className={sheetTab === 'notes' ? 'active' : ''} onClick={() => setSheetTab('notes')}>Notes</button>
          </nav>

          {sheetTab === 'info' && (
            <>
              <div className="field-grid two">
                <label>Name<input value={selected.name} onChange={(event) => updateSelectedText('name', event.target.value)} disabled={!sheetEdit} /></label>
                <label>Player<input value={selected.player} onChange={(event) => updateSelectedText('player', event.target.value)} disabled={!sheetEdit} /></label>
                <label>Chronicle<input value={selected.chronicle} onChange={(event) => updateSelectedText('chronicle', event.target.value)} disabled={!sheetEdit} /></label>
                <label>Concept<input value={selected.concept} onChange={(event) => updateSelectedText('concept', event.target.value)} disabled={!sheetEdit} /></label>
                <label>Virtue<input value={selected.virtue} onChange={(event) => updateSelectedText('virtue', event.target.value)} disabled={!sheetEdit} /></label>
                <label>Vice<input value={selected.vice} onChange={(event) => updateSelectedText('vice', event.target.value)} disabled={!sheetEdit} /></label>
              </div>
              <div className="info-strip">
                <p>XP: {selected.experienceTotal} / Spent: {selected.experienceSpent} / Remaining: {remainingXp(selected)}</p>
                <p>Beats: {selected.beatsTotal}</p>
                {sheetEdit && <button className="primary" onClick={incrementBeats}>Add Beat</button>}
              </div>
            </>
          )}

          {sheetTab === 'attributes' && (
            <div className="sheet-grid">
              <section className="info-card">
                <h3>Derived Stats</h3>
                <ul className="history-list"><li>Speed: {selected.derivedStats.speed}</li><li>Defense: {selected.derivedStats.defense}</li><li>Initiative: {selected.derivedStats.initiative}</li><li>Perception: {selected.derivedStats.perception}</li></ul>
                <div className="health-row">{selected.derivedStats.healthBoxes.map((status, index) => <button className={`health ${status.toLowerCase()}`} disabled={!sheetEdit} onClick={() => toggleHealth(index, status)} key={`${status}-${index}`}>{status === 'BASHING' ? '/' : status === 'LETHAL' ? 'X' : status === 'AGGRAVATED' ? '*' : ''}</button>)}</div>
                <p>Wound penalty: {woundPenalty(selected.derivedStats.healthBoxes)}</p>
              </section>
              <section className="info-card">
                <h3>Attributes</h3>
                {Object.values(ATTRIBUTE_GROUPS).flat().map((key) => <label key={key}>{key}<input type="number" min="1" max="5" value={selected.attributes[key]} onChange={(event) => updateSelectedNumberBag('attributes', key, Number(event.target.value))} disabled={!sheetEdit} /></label>)}
                <h3>Skills</h3>
                {Object.values(SKILL_GROUPS).flat().map((key) => <label key={key}>{key}<input type="number" min="0" max="5" value={selected.skills[key]} onChange={(event) => updateSelectedNumberBag('skills', key, Number(event.target.value))} disabled={!sheetEdit} /></label>)}
              </section>
            </div>
          )}

          {sheetTab === 'merits' && (
            <section className="info-card">
              <ul className="history-list">{selected.merits.map((merit, index) => <li className="row-line" key={merit.id}><span>{merit.name} ({merit.category}) • {merit.dots}</span>{sheetEdit && <button onClick={() => removeSelectedMerit(index)}>Remove</button>}</li>)}</ul>
            </section>
          )}

          {sheetTab === 'powers' && (
            <label>Powers / Splat Data<textarea rows={10} disabled={!sheetEdit} value={String(selected.splatData.powers ?? '')} onChange={(event) => updateSelectedSplatData('powers', event.target.value)}></textarea></label>
          )}

          {sheetTab === 'notes' && (
            <label>Notes<textarea rows={12} value={selected.notes} onChange={(event) => updateSelectedText('notes', event.target.value)} disabled={!sheetEdit}></textarea></label>
          )}
        </section>
      )}

      {screen === 'settings' && (
        <section className="page with-topbar">
          <div className="page-head compact"><div><h2>The Archival Sanctum</h2><p>Configure your grimoire experience</p></div></div>
          <div className="settings-grid">
            <section className="info-card">
              <h3>Aesthetic Alignment</h3>
              <div className="theme-cards">
                <button className={`theme-card ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}><span>Dark Gothic</span></button>
                <button className={`theme-card ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}><span>Light Parchment</span></button>
              </div>
            </section>
            <section className="info-card">
              <h3>Data Transmutation</h3>
              <div className="stack"><button>Export Grimoire (JSON)</button><button>Import Chronicles</button></div>
              <p className="muted">Back up your records locally from this sanctum.</p>
            </section>
          </div>
          <div className="head-actions left"><button onClick={() => setScreen('dashboard')}>Back</button></div>
        </section>
      )}

      {screen === 'chronicle' && (
        <section className="page with-topbar">
          <div className="page-head compact">
            <div>
              <h2>Chronicle Log</h2>
              <p>The Silent City • Session records and archive traces</p>
            </div>
          </div>
          <section className="chronicle-layout">
            <article className="info-card">
              <div className="section-head"><h3>Session Timeline</h3></div>
              <ul className="history-list">
                {chronicleEvents.map((event) => (
                  <li key={`chronicle-${event.id}`}>
                    <strong>{event.time}</strong> — {event.text}
                    <br />
                    <span className="muted">{event.note}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="info-card">
              <div className="section-head"><h3>Archivist Notes</h3></div>
              <label>
                Session Summary
                <textarea
                  rows={12}
                  defaultValue="Tonight's thread binds old grudges with new omens. Track supernatural interference, preserve witness details, and mark consequences for each pact."
                />
              </label>
            </article>
          </section>
        </section>
      )}
    </main>
  );
}
