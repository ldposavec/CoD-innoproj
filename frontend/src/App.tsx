import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api, setAuthToken } from './api';
import { ATTRIBUTE_GROUPS, defaultCharacter, SKILL_GROUPS, SPLATS, THEME_KEY } from './constants';
import type { Character, DiceRollResult, LibraryMerit, Splat } from './types';
import {
  ATTRIBUTE_DOT_BUDGET,
  SKILL_DOT_BUDGET,
  attributeDotsSpent,
  clamp,
  cloneCharacter,
  cycleHealth,
  recalculateDerivedStats,
  remainingXp,
  skillDotsSpent,
  woundPenalty
} from './utils';

type Page = 'auth' | 'dashboard' | 'wizard' | 'sheet' | 'chronicle' | 'settings';
type SortMode = 'created' | 'name' | 'splat';
type AuthMode = 'login' | 'register';
type SheetTab = 'info' | 'traits' | 'merits' | 'powers' | 'notes';

type Session = { username: string; token: string | null };
type ChronicleEntry = { id: string; title: string; body: string; characterId: string; createdAt: number };
type SplatField = { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'select'; min?: number; max?: number; options?: string[] };

const SESSION_KEY = 'cod-session';
const NOTES_KEY = 'cod-chronicle-entries';
const wizardSteps = ['Concept', 'Splat', 'Attributes', 'Skills', 'Merits', 'Supernatural'];
const BYPASS_LOGIN_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_BYPASS_LOGIN === 'true';

const defaultSkillsLibrary = { physical: [], social: [], mental: [] };
const defaultSplatOptions: {
  vampireClans: string[];
  vampireCovenants: string[];
  beastFamilies: string[];
  beastHungers: string[];
} = { vampireClans: [], vampireCovenants: [], beastFamilies: [], beastHungers: [] };

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toTitle(text: string) {
  return text.replace(/([A-Z])/g, ' $1').replace(/^./, (m) => m.toUpperCase()).trim();
}

function DotField({
  label,
  value,
  min,
  max,
  disabled,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="dot-field">
      <span>{label}</span>
      <div className="dot-row" role="radiogroup" aria-label={label}>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((dot) => (
          <button
            key={dot}
            type="button"
            role="radio"
            aria-checked={value === dot}
            className={value >= dot ? 'dot active' : 'dot'}
            onClick={() => onChange(dot)}
            disabled={disabled}
          />
        ))}
      </div>
      <strong>{value}</strong>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [page, setPage] = useState<Page>('auth');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState<Character | null>(null);
  const [sheetEdit, setSheetEdit] = useState(false);
  const [sheetTab, setSheetTab] = useState<SheetTab>('info');

  const [draft, setDraft] = useState<Character>(() => ({ ...defaultCharacter(), derivedStats: recalculateDerivedStats(defaultCharacter()) }));
  const [wizardStep, setWizardStep] = useState(0);
  const [meritsLibrary, setMeritsLibrary] = useState<LibraryMerit[]>([]);
  const [skillsLibrary, setSkillsLibrary] = useState<{ physical: string[]; social: string[]; mental: string[] }>(defaultSkillsLibrary);
  const [splatOptions, setSplatOptions] = useState(defaultSplatOptions);
  const [meritFilter, setMeritFilter] = useState('All');
  const [customMerit, setCustomMerit] = useState({ name: '', category: 'Custom', dots: 1, description: '', prerequisites: '' });

  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('created');

  const [dicePool, setDicePool] = useState(5);
  const [diceRule, setDiceRule] = useState('10again');
  const [diceRote, setDiceRote] = useState(false);
  const [diceChance, setDiceChance] = useState(false);
  const [diceResult, setDiceResult] = useState<DiceRollResult | null>(null);
  const [diceHistory, setDiceHistory] = useState<{ id: string; at: string; detail: string; result: string }[]>([]);

  const [chronicleEntries, setChronicleEntries] = useState<ChronicleEntry[]>([]);
  const [entryDraft, setEntryDraft] = useState({ title: '', body: '', characterId: '' });

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme);
    }

    const rawSession = localStorage.getItem(SESSION_KEY);
    if (rawSession) {
      try {
        const parsed = JSON.parse(rawSession) as Session;
        setSession(parsed);
        setAuthToken(parsed.token);
        setPage('dashboard');
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }

    const rawEntries = localStorage.getItem(NOTES_KEY);
    if (rawEntries) {
      try {
        setChronicleEntries(JSON.parse(rawEntries) as ChronicleEntry[]);
      } catch {
        localStorage.removeItem(NOTES_KEY);
      }
    }

    void loadLibraries();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(chronicleEntries));
  }, [chronicleEntries]);

  useEffect(() => {
    if (!session) return;
    setAuthToken(session.token);
    void loadCharacters();
  }, [session]);

  const visibleCharacters = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = characters.filter((c) => {
      if (!query) return true;
      return c.name.toLowerCase().includes(query) || c.concept.toLowerCase().includes(query);
    });
    if (sortMode === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortMode === 'splat') list = [...list].sort((a, b) => a.splat.localeCompare(b.splat));
    if (sortMode === 'created') list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [characters, search, sortMode]);

  const meritCategories = useMemo(() => ['All', ...new Set(meritsLibrary.map((m) => m.category))], [meritsLibrary]);
  const filteredMerits = useMemo(
    () => (meritFilter === 'All' ? meritsLibrary : meritsLibrary.filter((m) => m.category === meritFilter)),
    [meritFilter, meritsLibrary]
  );

  const wizardValidation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!draft.name.trim()) errors.push('Name is required.');
    const attrSpent = attributeDotsSpent(draft);
    const skillSpent = skillDotsSpent(draft);

    if (attrSpent > ATTRIBUTE_DOT_BUDGET) errors.push(`Attribute dots exceed budget (${attrSpent}/${ATTRIBUTE_DOT_BUDGET}).`);
    if (skillSpent > SKILL_DOT_BUDGET) errors.push(`Skill dots exceed budget (${skillSpent}/${SKILL_DOT_BUDGET}).`);
    if (attrSpent < ATTRIBUTE_DOT_BUDGET) warnings.push(`You still have ${ATTRIBUTE_DOT_BUDGET - attrSpent} attribute dots left.`);
    if (skillSpent < SKILL_DOT_BUDGET) warnings.push(`You still have ${SKILL_DOT_BUDGET - skillSpent} skill dots left.`);

    const hasProfessionalTraining = draft.merits.some((m) => m.name.toLowerCase().includes('professional training'));
    if (hasProfessionalTraining && draft.professionalTrainingSkills.length !== 2) {
      errors.push('Professional Training requires exactly two focus skills.');
    }

    if (draft.splat === 'VAMPIRE') {
      if (!String(draft.splatData.clan ?? '').trim()) errors.push('Vampire requires Clan.');
      if (!String(draft.splatData.covenant ?? '').trim()) errors.push('Vampire requires Covenant.');
    }

    return { errors, warnings };
  }, [draft]);

  async function loadLibraries() {
    try {
      const [merits, skills, splats] = await Promise.all([
        api.listMerits().catch(() => []),
        api.listSkills().catch(() => defaultSkillsLibrary),
        api.listSplatOptions().catch(() => defaultSplatOptions)
      ]);
      setMeritsLibrary(merits);
      setSkillsLibrary(skills);
      setSplatOptions(splats);
    } catch {
      setMessage('Could not load all libraries. You can still continue with core fields.');
    }
  }

  async function loadCharacters() {
    try {
      const list = await api.listCharacters();
      setCharacters(list.map((c) => ({ ...c, derivedStats: recalculateDerivedStats(c) })));
      setMessage('');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Failed to load characters.';
      setMessage(reason);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setMessage('Username and password are required.');
      return;
    }
    if (authMode === 'register' && password !== confirmPassword) {
      setMessage('Password confirmation does not match.');
      return;
    }

    setBusy(true);
    try {
      const payload = { username: username.trim(), password };
      const response = authMode === 'login' ? await api.login(payload) : await api.register(payload);
      completeLogin({ username: response.username ?? payload.username, token: response.token ?? null });
      setMessage('');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Authentication failed.';
      setMessage(reason);
    } finally {
      setBusy(false);
    }
  }

  function completeLogin(nextSession: Session) {
    setSession(nextSession);
    setAuthToken(nextSession.token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setPage('dashboard');
  }

  function bypassLogin() {
    completeLogin({ username: username.trim() || 'test-user', token: null });
    setMessage('Bypass login enabled for testing.');
  }

  function logout() {
    setSession(null);
    setAuthToken(null);
    localStorage.removeItem(SESSION_KEY);
    setPage('auth');
    setPassword('');
    setConfirmPassword('');
  }

  function beginWizard() {
    const base = defaultCharacter();
    setDraft({ ...base, derivedStats: recalculateDerivedStats(base) });
    setWizardStep(0);
    setPage('wizard');
    setMessage('');
  }

  function setDraftNumber(section: 'attributes' | 'skills', key: string, raw: number, min: number, max: number) {
    setDraft((prev) => {
      const next = cloneCharacter(prev);
      next[section][key] = clamp(raw, min, max);

      if (section === 'attributes' && attributeDotsSpent(next) > ATTRIBUTE_DOT_BUDGET) {
        setMessage('Attribute budget reached; reduce another attribute first.');
        return prev;
      }
      if (section === 'skills' && skillDotsSpent(next) > SKILL_DOT_BUDGET) {
        setMessage('Skill budget reached; reduce another skill first.');
        return prev;
      }

      next.derivedStats = recalculateDerivedStats(next);
      return next;
    });
  }

  function updateDraftText<K extends keyof Character>(key: K, value: Character[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'attributes' || key === 'skills' || key === 'derivedStats') {
        next.derivedStats = recalculateDerivedStats(next);
      }
      return next;
    });
  }

  function updateSplatData(key: string, value: string | number) {
    setDraft((prev) => ({ ...prev, splatData: { ...prev.splatData, [key]: value } }));
  }

  function addMerit(merit: LibraryMerit) {
    setDraft((prev) => ({
      ...prev,
      merits: [
        ...prev.merits,
        {
          id: createId(),
          name: merit.name,
          category: merit.category,
          dots: merit.allowedDots[0] ?? 1,
          description: merit.description,
          prerequisites: merit.prerequisites,
          isCustom: false
        }
      ]
    }));
  }

  function addCustomMerit() {
    if (!customMerit.name.trim()) return;
    setDraft((prev) => ({
      ...prev,
      merits: [
        ...prev.merits,
        {
          id: createId(),
          name: customMerit.name.trim(),
          category: customMerit.category.trim() || 'Custom',
          dots: clamp(customMerit.dots, 1, 5),
          description: customMerit.description,
          prerequisites: customMerit.prerequisites,
          isCustom: true
        }
      ]
    }));
    setCustomMerit({ name: '', category: 'Custom', dots: 1, description: '', prerequisites: '' });
  }

  function removeDraftMerit(id: string) {
    setDraft((prev) => ({ ...prev, merits: prev.merits.filter((m) => m.id !== id) }));
  }

  async function saveWizardCharacter() {
    if (wizardValidation.errors.length > 0) {
      setMessage(wizardValidation.errors[0]);
      return;
    }

    try {
      const payload = cloneCharacter(draft);
      payload.derivedStats = recalculateDerivedStats(payload);
      const created = await api.createCharacter(payload);
      const next = { ...created, derivedStats: recalculateDerivedStats(created) };
      setCharacters((prev) => [next, ...prev]);
      setSelected(next);
      setPage('sheet');
      setSheetTab('info');
      setSheetEdit(false);
      setMessage('Character created.');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Could not create character.';
      setMessage(reason);
    }
  }

  function openCharacter(character: Character) {
    setSelected(cloneCharacter(character));
    setPage('sheet');
    setSheetEdit(false);
    setSheetTab('info');
  }

  function updateSelected(section: 'attributes' | 'skills', key: string, value: number, min: number, max: number) {
    setSelected((prev) => {
      if (!prev) return prev;
      const next = cloneCharacter(prev);
      next[section][key] = clamp(value, min, max);
      next.derivedStats = recalculateDerivedStats(next);
      return next;
    });
  }

  async function saveSelected() {
    if (!selected) return;
    try {
      const payload = cloneCharacter(selected);
      payload.derivedStats = recalculateDerivedStats(payload);
      const updated = await api.updateCharacter(payload.id, payload);
      const normalized = { ...updated, derivedStats: recalculateDerivedStats(updated) };
      setCharacters((prev) => prev.map((c) => (c.id === normalized.id ? normalized : c)));
      setSelected(normalized);
      setSheetEdit(false);
      setMessage('Character saved.');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Save failed.';
      setMessage(reason);
    }
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!window.confirm(`Delete ${selected.name}?`)) return;
    try {
      await api.deleteCharacter(selected.id);
      setCharacters((prev) => prev.filter((c) => c.id !== selected.id));
      setSelected(null);
      setPage('dashboard');
      setMessage('Character deleted.');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Delete failed.';
      setMessage(reason);
    }
  }

  function addBeat() {
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

  function toggleHealthBox(index: number) {
    setSelected((prev) => {
      if (!prev) return prev;
      const next = cloneCharacter(prev);
      next.derivedStats.healthBoxes[index] = cycleHealth(next.derivedStats.healthBoxes[index]);
      return next;
    });
  }

  async function rollDice() {
    try {
      const result = await api.rollDice({
        poolSize: diceChance ? 0 : clamp(dicePool, 0, 30),
        rule: diceRule,
        roteQuality: diceRote,
        chanceDie: diceChance
      });
      setDiceResult(result);
      const label = result.dramaticFailure
        ? 'Dramatic failure'
        : result.exceptional
          ? 'Exceptional success'
          : result.successes > 0
            ? 'Success'
            : 'Failure';
      setDiceHistory((prev) => [
        {
          id: createId(),
          at: new Date().toLocaleTimeString(),
          detail: diceChance ? 'Chance die' : `${dicePool} dice, ${diceRule}`,
          result: `${label} (${result.successes})`
        },
        ...prev
      ]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Dice roll failed.';
      setMessage(reason);
    }
  }

  function addChronicleEntry() {
    if (!entryDraft.title.trim() || !entryDraft.body.trim()) return;
    setChronicleEntries((prev) => [
      {
        id: createId(),
        title: entryDraft.title.trim(),
        body: entryDraft.body.trim(),
        characterId: entryDraft.characterId,
        createdAt: Date.now()
      },
      ...prev
    ]);
    setEntryDraft({ title: '', body: '', characterId: '' });
  }

  const splatFields: Record<Exclude<Splat, 'MORTAL'>, SplatField[]> = {
    VAMPIRE: [
      { key: 'clan', label: 'Clan', type: 'select', options: splatOptions.vampireClans.length > 0 ? splatOptions.vampireClans : ['Daeva', 'Gangrel', 'Mekhet', 'Nosferatu', 'Ventrue'] },
      { key: 'covenant', label: 'Covenant', type: 'select', options: splatOptions.vampireCovenants.length > 0 ? splatOptions.vampireCovenants : ['Invictus', 'Carthian Movement', 'Circle of the Crone', 'Lancea et Sanctum', 'Ordo Dracul', 'Unaligned'] },
      { key: 'bloodPotency', label: 'Blood Potency', type: 'number', min: 1, max: 10 },
      { key: 'humanity', label: 'Humanity', type: 'number', min: 0, max: 10 },
      { key: 'predatorType', label: 'Predator Type', type: 'text' }
    ],
    WEREWOLF: [
      { key: 'auspice', label: 'Auspice', type: 'select', options: ['Cahalith', 'Elodoth', 'Irraka', 'Ithaeur', 'Rahu'] },
      { key: 'tribe', label: 'Tribe', type: 'select', options: ['Blood Talons', 'Bone Shadows', 'Hunters in Darkness', 'Iron Masters', 'Storm Lords', 'Ghost Wolves', 'Pure'] },
      { key: 'primalUrge', label: 'Primal Urge', type: 'number', min: 1, max: 10 },
      { key: 'harmony', label: 'Harmony', type: 'number', min: 0, max: 10 },
      { key: 'packName', label: 'Pack Name', type: 'text' }
    ],
    MAGE: [
      { key: 'path', label: 'Path', type: 'select', options: ['Acanthus', 'Mastigos', 'Moros', 'Obrimos', 'Thyrsus'] },
      { key: 'order', label: 'Order', type: 'text' },
      { key: 'gnosis', label: 'Gnosis', type: 'number', min: 1, max: 10 },
      { key: 'wisdom', label: 'Wisdom', type: 'number', min: 0, max: 10 },
      { key: 'nimbus', label: 'Nimbus', type: 'textarea' }
    ],
    PROMETHEAN: [
      { key: 'lineage', label: 'Lineage', type: 'text' },
      { key: 'refinement', label: 'Refinement', type: 'text' },
      { key: 'azoth', label: 'Azoth', type: 'number', min: 1, max: 10 },
      { key: 'humanity', label: 'Humanity', type: 'number', min: 0, max: 10 },
      { key: 'pilgrimage', label: 'Pilgrimage', type: 'textarea' }
    ],
    CHANGELING: [
      { key: 'seeming', label: 'Seeming', type: 'select', options: ['Beast', 'Darkling', 'Elemental', 'Fairest', 'Ogre', 'Wizened'] },
      { key: 'court', label: 'Court', type: 'text' },
      { key: 'wyrd', label: 'Wyrd', type: 'number', min: 1, max: 10 },
      { key: 'clarity', label: 'Clarity', type: 'number', min: 0, max: 10 },
      { key: 'durance', label: 'Durance', type: 'textarea' }
    ],
    HUNTER: [
      { key: 'conspiracy', label: 'Conspiracy', type: 'text' },
      { key: 'organization', label: 'Organization', type: 'text' },
      { key: 'profession', label: 'Profession', type: 'text' },
      { key: 'cellName', label: 'Cell Name', type: 'text' },
      { key: 'safePlaces', label: 'Safe Places / Contacts', type: 'textarea' }
    ],
    GEIST: [
      { key: 'threshold', label: 'Threshold', type: 'select', options: ['Torn', 'Forgotten', 'Prey', 'Stricken', 'Returning'] },
      { key: 'geistName', label: 'Geist Name', type: 'text' },
      { key: 'psyche', label: 'Psyche', type: 'number', min: 1, max: 10 },
      { key: 'synergy', label: 'Synergy', type: 'number', min: 0, max: 10 },
      { key: 'haunt', label: 'Haunt', type: 'textarea' }
    ],
    MUMMY: [
      { key: 'decree', label: 'Decree', type: 'text' },
      { key: 'guild', label: 'Guild', type: 'text' },
      { key: 'sekhem', label: 'Sekhem', type: 'number', min: 1, max: 10 },
      { key: 'memory', label: 'Memory', type: 'number', min: 1, max: 10 },
      { key: 'tomb', label: 'Tomb / Cult', type: 'textarea' }
    ],
    DEMON: [
      { key: 'incarnation', label: 'Incarnation', type: 'text' },
      { key: 'agenda', label: 'Agenda', type: 'text' },
      { key: 'primum', label: 'Primum', type: 'number', min: 1, max: 10 },
      { key: 'cover', label: 'Cover', type: 'number', min: 1, max: 10 },
      { key: 'glitches', label: 'Glitches', type: 'textarea' }
    ],
    BEAST: [
      { key: 'family', label: 'Family', type: 'select', options: splatOptions.beastFamilies.length > 0 ? splatOptions.beastFamilies : ['Anakim', 'Eshmaki', 'Inguma', 'Makara', 'Namtaru', 'Ugallu', 'Talassii'] },
      { key: 'hunger', label: 'Hunger', type: 'select', options: splatOptions.beastHungers.length > 0 ? splatOptions.beastHungers : ['Collector', 'Enabler', 'Nemesis', 'Predator', 'Ravager', 'Tyrant', 'Whisperer'] },
      { key: 'lair', label: 'Lair', type: 'number', min: 1, max: 10 },
      { key: 'satiety', label: 'Satiety', type: 'number', min: 0, max: 10 },
      { key: 'horrorForm', label: 'Horror Form', type: 'textarea' }
    ],
    DEVIANT: [
      { key: 'origin', label: 'Origin', type: 'text' },
      { key: 'clade', label: 'Clade', type: 'text' },
      { key: 'baseline', label: 'Baseline', type: 'number', min: 1, max: 10 },
      { key: 'conviction', label: 'Conviction', type: 'number', min: 1, max: 10 },
      { key: 'conspiracy', label: 'Conspiracy', type: 'textarea' }
    ]
  };

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>Chronicles Hub</h1>
          <p>Modern creator for Chronicles of Darkness</p>
        </div>
        {session && (
          <nav className="header-nav">
            <button type="button" className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>Characters</button>
            <button type="button" className={page === 'wizard' ? 'active' : ''} onClick={beginWizard}>Wizard</button>
            <button type="button" className={page === 'chronicle' ? 'active' : ''} onClick={() => setPage('chronicle')}>Chronicle</button>
            <button type="button" className={page === 'settings' ? 'active' : ''} onClick={() => setPage('settings')}>Settings</button>
            <button type="button" onClick={logout}>Logout</button>
          </nav>
        )}
      </header>

      {message && <p className="banner">{message}</p>}

      {page === 'auth' && (
        <section className="auth-wrap">
          <article className="auth-card">
            <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
            <p>{authMode === 'login' ? 'Access your character archive.' : 'Create your storyteller account.'}</p>
            <form onSubmit={submitAuth} className="form-grid">
              <label>
                Username
                <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              </label>
              <label>
                Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} />
              </label>
              {authMode === 'register' && (
                <label>
                  Confirm Password
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                </label>
              )}
              <button type="submit" className="primary" disabled={busy}>{busy ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create account'}</button>
            </form>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'));
                setMessage('');
              }}
            >
              {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
            </button>
            {BYPASS_LOGIN_ENABLED && (
              <button type="button" onClick={bypassLogin}>
                Bypass Login (Testing)
              </button>
            )}
          </article>
        </section>
      )}

      {page === 'dashboard' && (
        <section className="page">
          <div className="toolbar">
            <input placeholder="Search by name or concept..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
              <option value="created">Newest</option>
              <option value="name">Name</option>
              <option value="splat">Splat</option>
            </select>
            <button type="button" className="primary" onClick={beginWizard}>New Character</button>
          </div>

          <div className="card-grid">
            {visibleCharacters.map((character) => (
              <button key={character.id} type="button" className="card" onClick={() => openCharacter(character)}>
                <h3>{character.name}</h3>
                <p>{character.splat} · {character.concept || 'No concept'}</p>
                <small>{character.chronicle || 'No chronicle'} · {new Date(character.createdAt).toLocaleDateString()}</small>
              </button>
            ))}
          </div>

          <section className="panel">
            <h3>Dice Roller</h3>
            <div className="toolbar wrap">
              <label>
                Pool
                <input type="number" min={0} max={30} value={dicePool} onChange={(e) => setDicePool(clamp(Number(e.target.value), 0, 30))} />
              </label>
              <label>
                Rule
                <select value={diceRule} onChange={(e) => setDiceRule(e.target.value)}>
                  <option value="10again">10-again</option>
                  <option value="9again">9-again</option>
                  <option value="8again">8-again</option>
                  <option value="none">No explode</option>
                </select>
              </label>
              <label className="checkbox"><input type="checkbox" checked={diceRote} onChange={(e) => setDiceRote(e.target.checked)} />Rote</label>
              <label className="checkbox"><input type="checkbox" checked={diceChance} onChange={(e) => setDiceChance(e.target.checked)} />Chance die</label>
              <button type="button" className="primary" onClick={() => void rollDice()}>Roll</button>
            </div>
            <p aria-live="polite">{diceResult ? `Dice: ${diceResult.dice.join(', ')} | Successes: ${diceResult.successes}` : 'No roll yet.'}</p>
            <ul className="history">
              {diceHistory.map((item) => (
                <li key={item.id}><strong>{item.at}</strong> · {item.detail} · {item.result}</li>
              ))}
            </ul>
          </section>
        </section>
      )}

      {page === 'wizard' && (
        <section className="page wizard">
          <aside className="wizard-side">
            <h3>Create Character</h3>
            {wizardSteps.map((step, index) => (
              <button key={step} type="button" className={wizardStep === index ? 'active' : ''} onClick={() => setWizardStep(index)}>
                {index + 1}. {step}
              </button>
            ))}
            <div className="wizard-hints">
              <p>Attributes spent: {attributeDotsSpent(draft)} / {ATTRIBUTE_DOT_BUDGET}</p>
              <p>Skills spent: {skillDotsSpent(draft)} / {SKILL_DOT_BUDGET}</p>
            </div>
            {wizardValidation.warnings.map((warning) => <small key={warning}>{warning}</small>)}
          </aside>

          <article className="wizard-body">
            {wizardStep === 0 && (
              <div className="form-grid two">
                <label>Name<input value={draft.name} onChange={(e) => updateDraftText('name', e.target.value)} /></label>
                <label>Player<input value={draft.player} onChange={(e) => updateDraftText('player', e.target.value)} /></label>
                <label>Chronicle<input value={draft.chronicle} onChange={(e) => updateDraftText('chronicle', e.target.value)} /></label>
                <label>Concept<input value={draft.concept} onChange={(e) => updateDraftText('concept', e.target.value)} /></label>
                <label>Virtue<input value={draft.virtue} onChange={(e) => updateDraftText('virtue', e.target.value)} /></label>
                <label>Vice<input value={draft.vice} onChange={(e) => updateDraftText('vice', e.target.value)} /></label>
              </div>
            )}

            {wizardStep === 1 && (
              <div className="chips">
                {SPLATS.map((splat) => (
                  <button key={splat} type="button" className={draft.splat === splat ? 'active' : ''} onClick={() => updateDraftText('splat', splat)}>
                    {splat}
                  </button>
                ))}
              </div>
            )}

            {wizardStep === 2 && (
              <div className="split">
                {Object.entries(ATTRIBUTE_GROUPS).map(([group, keys]) => (
                  <section key={group} className="panel">
                    <h4>{group}</h4>
                    {keys.map((key) => (
                      <DotField
                        key={key}
                        label={toTitle(key)}
                        value={draft.attributes[key]}
                        min={1}
                        max={5}
                        onChange={(value) => setDraftNumber('attributes', key, value, 1, 5)}
                      />
                    ))}
                  </section>
                ))}
              </div>
            )}

            {wizardStep === 3 && (
              <div className="split">
                {Object.entries(SKILL_GROUPS).map(([group, keys]) => {
                  const named = skillsLibrary[group.toLowerCase() as 'physical' | 'social' | 'mental'];
                  return (
                    <section key={group} className="panel">
                      <h4>{group}</h4>
                      {keys.map((key, index) => (
                        <DotField
                          key={key}
                          label={named[index] ?? toTitle(key)}
                          value={draft.skills[key]}
                          min={0}
                          max={5}
                          onChange={(value) => setDraftNumber('skills', key, value, 0, 5)}
                        />
                      ))}
                    </section>
                  );
                })}
              </div>
            )}

            {wizardStep === 4 && (
              <div className="split">
                <section className="panel">
                  <div className="toolbar">
                    <label>
                      Category
                      <select value={meritFilter} onChange={(e) => setMeritFilter(e.target.value)}>
                        {meritCategories.map((category) => <option value={category} key={category}>{category}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="merit-list">
                    {filteredMerits.map((merit) => (
                      <article key={merit.id}>
                        <h4>{merit.name}</h4>
                        <p>{merit.description}</p>
                        <small>{merit.prerequisites}</small>
                        <button type="button" onClick={() => addMerit(merit)}>Add</button>
                      </article>
                    ))}
                  </div>
                </section>
                <section className="panel">
                  <h4>Selected Merits</h4>
                  <ul className="history">
                    {draft.merits.map((merit) => (
                      <li key={merit.id}>
                        {merit.name} ({merit.dots})
                        <button type="button" onClick={() => removeDraftMerit(merit.id)}>Remove</button>
                      </li>
                    ))}
                  </ul>

                  <h4>Custom Merit</h4>
                  <div className="form-grid">
                    <label>Name<input value={customMerit.name} onChange={(e) => setCustomMerit((p) => ({ ...p, name: e.target.value }))} /></label>
                    <label>Category<input value={customMerit.category} onChange={(e) => setCustomMerit((p) => ({ ...p, category: e.target.value }))} /></label>
                    <label>Dots<input type="number" min={1} max={5} value={customMerit.dots} onChange={(e) => setCustomMerit((p) => ({ ...p, dots: clamp(Number(e.target.value), 1, 5) }))} /></label>
                    <label>Description<textarea rows={3} value={customMerit.description} onChange={(e) => setCustomMerit((p) => ({ ...p, description: e.target.value }))} /></label>
                    <label>Prerequisites<input value={customMerit.prerequisites} onChange={(e) => setCustomMerit((p) => ({ ...p, prerequisites: e.target.value }))} /></label>
                    <button type="button" onClick={addCustomMerit}>Add Custom Merit</button>
                  </div>
                </section>
              </div>
            )}

            {wizardStep === 5 && (
              <section className="panel">
                {draft.splat === 'MORTAL' ? (
                  <p>Mortal has no supernatural fields. You can still add powers in free text below if needed.</p>
                ) : (
                  <div className="form-grid two">
                    {splatFields[draft.splat].map((field) => (
                      <label key={field.key}>
                        {field.label}
                        {field.type === 'select' && (
                          <select
                            value={String(draft.splatData[field.key] ?? '')}
                            onChange={(e) => updateSplatData(field.key, e.target.value)}
                          >
                            <option value="">Select...</option>
                            {(field.options ?? []).map((option) => (
                              <option value={option} key={option}>{option}</option>
                            ))}
                          </select>
                        )}
                        {field.type === 'text' && (
                          <input value={String(draft.splatData[field.key] ?? '')} onChange={(e) => updateSplatData(field.key, e.target.value)} />
                        )}
                        {field.type === 'number' && (
                          <input
                            type="number"
                            min={field.min}
                            max={field.max}
                            value={Number(draft.splatData[field.key] ?? field.min ?? 0)}
                            onChange={(e) => updateSplatData(field.key, clamp(Number(e.target.value), field.min ?? 0, field.max ?? 10))}
                          />
                        )}
                        {field.type === 'textarea' && (
                          <textarea rows={4} value={String(draft.splatData[field.key] ?? '')} onChange={(e) => updateSplatData(field.key, e.target.value)} />
                        )}
                      </label>
                    ))}
                  </div>
                )}
                <label>
                  Powers / Abilities
                  <textarea rows={6} value={String(draft.splatData.powers ?? '')} onChange={(e) => updateSplatData('powers', e.target.value)} />
                </label>
              </section>
            )}

            <footer className="wizard-actions">
              <button type="button" onClick={() => setPage('dashboard')}>Cancel</button>
              <button type="button" disabled={wizardStep === 0} onClick={() => setWizardStep((s) => s - 1)}>Previous</button>
              {wizardStep < 5 ? (
                <button type="button" className="primary" onClick={() => setWizardStep((s) => s + 1)}>Next</button>
              ) : (
                <button type="button" className="primary" onClick={() => void saveWizardCharacter()}>Save Character</button>
              )}
            </footer>
          </article>
        </section>
      )}

      {page === 'sheet' && selected && (
        <section className="page">
          <div className="toolbar">
            <h2>{selected.name}</h2>
            <button type="button" onClick={() => setPage('dashboard')}>Back</button>
            <button type="button" onClick={() => setSheetEdit((v) => !v)}>{sheetEdit ? 'Read mode' : 'Edit mode'}</button>
            <button type="button" className="primary" onClick={() => void saveSelected()}>Save</button>
            <button type="button" onClick={() => void deleteSelected()}>Delete</button>
          </div>

          <nav className="tabs">
            <button type="button" className={sheetTab === 'info' ? 'active' : ''} onClick={() => setSheetTab('info')}>Info</button>
            <button type="button" className={sheetTab === 'traits' ? 'active' : ''} onClick={() => setSheetTab('traits')}>Attributes & Skills</button>
            <button type="button" className={sheetTab === 'merits' ? 'active' : ''} onClick={() => setSheetTab('merits')}>Merits</button>
            <button type="button" className={sheetTab === 'powers' ? 'active' : ''} onClick={() => setSheetTab('powers')}>Powers</button>
            <button type="button" className={sheetTab === 'notes' ? 'active' : ''} onClick={() => setSheetTab('notes')}>Notes</button>
          </nav>

          {sheetTab === 'info' && (
            <div className="form-grid two">
              <label>Name<input value={selected.name} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, name: e.target.value } : p))} /></label>
              <label>Player<input value={selected.player} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, player: e.target.value } : p))} /></label>
              <label>Chronicle<input value={selected.chronicle} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, chronicle: e.target.value } : p))} /></label>
              <label>Concept<input value={selected.concept} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, concept: e.target.value } : p))} /></label>
              <label>Virtue<input value={selected.virtue} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, virtue: e.target.value } : p))} /></label>
              <label>Vice<input value={selected.vice} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, vice: e.target.value } : p))} /></label>
              <label>Portrait URL<input value={selected.portraitUri ?? ''} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, portraitUri: e.target.value || null } : p))} /></label>
              <label>Size<input type="number" min={1} max={15} value={selected.derivedStats.size} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, derivedStats: { ...p.derivedStats, size: clamp(Number(e.target.value), 1, 15) } } : p))} /></label>
              <label>XP Total<input type="number" min={0} value={selected.experienceTotal} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, experienceTotal: clamp(Number(e.target.value), 0, 999) } : p))} /></label>
              <label>XP Spent<input type="number" min={0} value={selected.experienceSpent} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, experienceSpent: clamp(Number(e.target.value), 0, 999) } : p))} /></label>
            </div>
          )}

          {sheetTab === 'traits' && (
            <div className="split">
              <section className="panel">
                <h4>Attributes</h4>
                {Object.values(ATTRIBUTE_GROUPS).flat().map((key) => (
                  <DotField
                    key={key}
                    label={toTitle(key)}
                    value={selected.attributes[key]}
                    min={1}
                    max={5}
                    disabled={!sheetEdit}
                    onChange={(value) => updateSelected('attributes', key, value, 1, 5)}
                  />
                ))}
              </section>
              <section className="panel">
                <h4>Skills</h4>
                {Object.values(SKILL_GROUPS).flat().map((key) => (
                  <DotField
                    key={key}
                    label={toTitle(key)}
                    value={selected.skills[key]}
                    min={0}
                    max={5}
                    disabled={!sheetEdit}
                    onChange={(value) => updateSelected('skills', key, value, 0, 5)}
                  />
                ))}
              </section>
              <section className="panel">
                <h4>Derived Stats</h4>
                <ul className="history">
                  <li>Speed: {recalculateDerivedStats(selected).speed}</li>
                  <li>Defense: {recalculateDerivedStats(selected).defense}</li>
                  <li>Initiative: {recalculateDerivedStats(selected).initiative}</li>
                  <li>Perception: {recalculateDerivedStats(selected).perception}</li>
                  <li>Health Max: {recalculateDerivedStats(selected).healthMax}</li>
                  <li>Willpower Max: {recalculateDerivedStats(selected).willpowerMax}</li>
                  <li>Wound Penalty: {woundPenalty(selected.derivedStats.healthBoxes)}</li>
                </ul>
                <div className="health-track">
                  {selected.derivedStats.healthBoxes.map((status, index) => (
                    <button key={`${status}-${index}`} type="button" className={`box ${status.toLowerCase()}`} onClick={() => toggleHealthBox(index)} disabled={!sheetEdit}>
                      {status === 'BASHING' ? '/' : status === 'LETHAL' ? 'X' : status === 'AGGRAVATED' ? '*' : ''}
                    </button>
                  ))}
                </div>
                <p>Beats: {selected.beatsTotal} / 5</p>
                <button type="button" onClick={addBeat} disabled={!sheetEdit}>Add Beat</button>
                <p>Remaining XP: {remainingXp(selected)}</p>
              </section>
            </div>
          )}

          {sheetTab === 'merits' && (
            <section className="panel">
              <ul className="history">
                {selected.merits.map((merit) => (
                  <li key={merit.id}>{merit.name} ({merit.category}) · {merit.dots}</li>
                ))}
              </ul>
            </section>
          )}

          {sheetTab === 'powers' && (
            <label>
              Powers / Splat Data
              <textarea
                rows={10}
                value={String(selected.splatData.powers ?? '')}
                disabled={!sheetEdit}
                onChange={(e) => setSelected((prev) => (prev ? { ...prev, splatData: { ...prev.splatData, powers: e.target.value } } : prev))}
              />
            </label>
          )}

          {sheetTab === 'notes' && (
            <label>
              Notes
              <textarea
                rows={12}
                value={selected.notes}
                onChange={(e) => setSelected((prev) => (prev ? { ...prev, notes: e.target.value } : prev))}
              />
            </label>
          )}
        </section>
      )}

      {page === 'chronicle' && (
        <section className="page split">
          <article className="panel">
            <h3>Session Log</h3>
            <div className="form-grid">
              <label>Title<input value={entryDraft.title} onChange={(e) => setEntryDraft((p) => ({ ...p, title: e.target.value }))} /></label>
              <label>Character
                <select value={entryDraft.characterId} onChange={(e) => setEntryDraft((p) => ({ ...p, characterId: e.target.value }))}>
                  <option value="">No character link</option>
                  {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
                </select>
              </label>
              <label>Entry<textarea rows={5} value={entryDraft.body} onChange={(e) => setEntryDraft((p) => ({ ...p, body: e.target.value }))} /></label>
              <button type="button" className="primary" onClick={addChronicleEntry}>Add Entry</button>
            </div>
          </article>
          <article className="panel">
            <h3>Archive</h3>
            <ul className="history">
              {chronicleEntries.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.title}</strong> · {new Date(entry.createdAt).toLocaleString()}
                  <p>{entry.body}</p>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {page === 'settings' && (
        <section className="page">
          <article className="panel">
            <h3>Theme</h3>
            <div className="toolbar">
              <button type="button" className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>Dark Gothic</button>
              <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>Light Parchment</button>
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
