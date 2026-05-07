import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api, setAuthToken } from './api';
import { ATTRIBUTE_GROUPS, defaultCharacter, SKILL_GROUPS, SPLATS, THEME_KEY } from './constants';
import { CharacterCard } from './components/CharacterCard';
import { MeritPicker } from './components/MeritPicker';
import type { Character, DiceRollResult, LibraryMerit, Splat, VampireDiscipline } from './types';
import {
  ATTRIBUTE_DOT_BUDGET,
  MERIT_DOT_BUDGET,
  SPECIALTY_DOT_BUDGET,
  SKILL_DOT_BUDGET,
  attributeDotsSpent,
  clamp,
  cloneCharacter,
  cycleHealth,
  formatTextContent,
  evaluateMeritPrerequisites,
  recalculateDerivedStats,
  remainingXp,
  skillDotsSpent,
  woundPenalty
} from './utils';

type Page = 'auth' | 'dashboard' | 'wizard' | 'sheet' | 'chronicle' | 'settings';
type SortMode = 'created' | 'name' | 'splat';
type AuthMode = 'login' | 'register';
type SheetTab = 'overview' | 'features' | 'details';

type Session = { username: string; token: string | null };
type ChronicleNote = { id: string; title: string; body: string; characterId: string; createdAt: number; updatedAt: number };
type ChronicleDirectory = { id: string; name: string; createdAt: number; updatedAt: number; notes: ChronicleNote[] };
type ToastKind = 'info' | 'success' | 'error';
type ChronicleSort = 'updated' | 'name' | 'character';
type ChronicleGroup = 'none' | 'character' | 'date';
type SplatField = { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'select'; min?: number; max?: number; options?: string[] };
type FocusTier = 'primary' | 'secondary' | 'tertiary';
type AttributeGroup = keyof typeof ATTRIBUTE_GROUPS;
type SkillGroup = keyof typeof SKILL_GROUPS;
type AspirationTerm = 'Short-Term' | 'Long-Term';
type AspirationEntry = { text: string; term: AspirationTerm };
type ArchetypeLabels = { first: string; second: string };
type DiceHistoryItem = {
  id: string;
  poolSize: number;
  rule: string;
  roteQuality: boolean;
  chanceDie: boolean;
  successes: number;
};

const SESSION_KEY = 'cod-session';
const CHRONICLES_KEY = 'cod-chronicle-entries';
const wizardSteps = ['Splat', 'Concept', 'Attributes', 'Skills', 'Merits', 'Supernatural'];
const BYPASS_LOGIN_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_BYPASS_LOGIN === 'true';
const DIE_ROTATION_MS = 350;
const ATTRIBUTE_FOCUS_DOTS: Record<FocusTier, number> = { primary: 5, secondary: 4, tertiary: 3 };
const SKILL_FOCUS_DOTS: Record<FocusTier, number> = { primary: 11, secondary: 7, tertiary: 4 };
const TIER_LABELS: Record<FocusTier, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary'
};
const DICE_RULE_LABELS: Record<string, string> = {
  '10again': '10-again',
  '9again': '9-again',
  '8again': '8-again',
  none: 'No explode'
};
const DEFAULT_SEVEN_TRAIT_KEYS = ['humanity', 'integrity', 'harmony', 'wisdom', 'clarity', 'synergy'] as const;
const SPLAT_ARCHETYPE_LABELS: Partial<Record<Splat, ArchetypeLabels>> = {
  VAMPIRE: { first: 'Mask', second: 'Dirge' },
  BEAST: { first: 'Legend', second: 'Life' }
};
const SPLAT_POWER_LIBRARY: Record<Splat, string[]> = {
  MORTAL: [],
  VAMPIRE: ['Animalism', 'Auspex', 'Celerity', 'Dominate', 'Majesty', 'Nightmare', 'Obfuscate', 'Protean', 'Resilience', 'Vigor'],
  WEREWOLF: ['Dominance', 'Evasion', 'Insight', 'Knowledge', 'Rage', 'Resilience', 'Shaping', 'Stealth', 'Strength', 'Warding'],
  MAGE: ['Death', 'Fate', 'Forces', 'Life', 'Matter', 'Mind', 'Prime', 'Space', 'Spirit', 'Time'],
  PROMETHEAN: ['Aes', 'Argos', 'Disquiet', 'Flux', 'Saturninus', 'Transmutation', 'Vitriol'],
  CHANGELING: ['Contracts of Artifice', 'Contracts of Darkness', 'Contracts of Elements', 'Contracts of Fleeting Summer', 'Contracts of Smoke'],
  HUNTER: ['Tactics', 'Endowments', 'Compact Edges', 'Conspiracy Gifts'],
  GEIST: ['Boneyard', 'Caul', 'Dirge', 'Key', 'Marionette', 'Oracle', 'Rage', 'Shroud'],
  MUMMY: ['Affinities', 'Utterances', 'Sekhem Blessings', 'Guild Secrets'],
  DEMON: ['Embeds', 'Exploits', 'Demon Form', 'Interlocks'],
  BEAST: ['Atavisms', 'Nightmares', 'Lair Traits', 'Hunger Blessings'],
  DEVIANT: ['Adaptations', 'Variations', 'Scar Tricks', 'Instabilities']
};

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

function normalizeKey(text: string) {
  return text.trim().toLowerCase();
}

function normalizeChronicleTitle(title: string, fallbackIndex: number) {
  const trimmed = title.trim();
  return trimmed || `Chronicle ${fallbackIndex + 1}`;
}

function getArchetypeLabels(splat: Splat): ArchetypeLabels {
  return SPLAT_ARCHETYPE_LABELS[splat] ?? { first: 'Virtue', second: 'Vice' };
}

function withDefaultSevenTraits(splatData: Record<string, unknown>) {
  const next = { ...splatData };
  for (const key of DEFAULT_SEVEN_TRAIT_KEYS) {
    if (typeof next[key] !== 'number') {
      next[key] = 7;
    }
  }
  return next;
}

function isVampireDisciplineInClan(clan: string, disciplineName: string, inClanClans: string[]) {
  if (!clan) return false;
  const clanLower = normalizeKey(clan);
  const discLower = normalizeKey(disciplineName);

  const coreInClan: Record<string, string[]> = {
    daeva: ['vigor', 'celerity', 'majesty'],
    gangrel: ['animalism', 'resilience', 'protean'],
    mekhet: ['auspex', 'celerity', 'obfuscate'],
    nosferatu: ['nightmare', 'obfuscate', 'vigor'],
    ventrue: ['animalism', 'dominate', 'resilience'],
  };

  if (coreInClan[clanLower]?.includes(discLower)) {
    return true;
  }

  return inClanClans.some((c) => normalizeKey(c) === clanLower);
}

function normalizeVampireDisciplines(raw: unknown): VampireDiscipline[] {
  if (!Array.isArray(raw)) return [];

  const disciplinesMap = new Map<string, VampireDiscipline>();

  function inferDisciplineName(record: Record<string, unknown>, fallbackIndex: number) {
    if (typeof record.discipline === 'string' && record.discipline.trim() !== '') {
      return record.discipline;
    }
    if (typeof record.id === 'string') {
      const inferred = record.id.split(/[-_]/)[0];
      if (inferred.trim() !== '') return inferred;
    }
    if (typeof record.type === 'string' && record.type.toLowerCase() === 'discipline' && typeof record.name === 'string' && record.name.trim() !== '') {
      return record.name;
    }
    if (typeof record.name === 'string' && record.name.trim() !== '') {
      return record.name;
    }
    return `Discipline ${fallbackIndex + 1}`;
  }

  function ensureDiscipline(discName: string, clans?: unknown[]) {
    const finalName = toTitle(discName.trim());
    if (!disciplinesMap.has(finalName)) {
      disciplinesMap.set(finalName, {
        id: finalName.toLowerCase().replace(/\s+/g, '-'),
        name: finalName,
        inClanClans: [],
        powers: []
      });
    }
    const disc = disciplinesMap.get(finalName)!;

    if (Array.isArray(clans)) {
      clans.forEach((c) => {
        if (typeof c === 'string') {
          const capC = toTitle(c.trim());
          if (!disc.inClanClans.some((existing) => normalizeKey(existing) === normalizeKey(capC))) disc.inClanClans.push(capC);
        }
      });
    }
    return disc;
  }

  function addPower(discName: string, dot: number, powerName: string, description?: string, effect?: string, clans?: unknown[]) {
    const disc = ensureDiscipline(discName, clans);

    let finalDesc = description ?? '';
    if (effect) {
      finalDesc = finalDesc ? `${finalDesc}\n\nEffect: ${effect}` : `Effect: ${effect}`;
    }
    disc.powers.push({ name: powerName, dot, description: finalDesc.trim() || undefined });
  }

  raw.forEach((entry, index) => {
    const record = typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : null;
    if (!record) return;

    const clansRaw = record.inClanClans ?? record.clans;
    const recordDiscipline = inferDisciplineName(record, index);

    if (Array.isArray(record.powers)) {
      const discName = recordDiscipline;
      record.powers.forEach((power, pIdx) => {
        const powerRecord = typeof power === 'object' && power !== null ? (power as Record<string, unknown>) : null;
        if (!powerRecord) return;
        const dot = Number(powerRecord.dot ?? powerRecord.level ?? powerRecord.rating ?? 1);
        const powerName = typeof powerRecord.name === 'string' ? powerRecord.name : `Power ${pIdx + 1}`;
        const description = typeof powerRecord.description === 'string' ? powerRecord.description : undefined;
        const effect = typeof powerRecord.effect === 'string' ? powerRecord.effect : undefined;
        const powerDiscipline = typeof powerRecord.discipline === 'string' && powerRecord.discipline.trim() !== '' ? powerRecord.discipline : discName;
        addPower(powerDiscipline, dot, powerName, description, effect, clansRaw as unknown[]);
      });
    } else if (Array.isArray(record.dotLevels)) {
      const fallbackDiscName = recordDiscipline;

      record.dotLevels.forEach((dl: any, pIdx: number) => {
        const dot = Number(dl.dots ?? dl.dot ?? dl.level ?? dl.rating ?? 1);
        const powerName = typeof dl.power === 'string' ? dl.power : (typeof dl.name === 'string' ? dl.name : (typeof record.name === 'string' ? record.name : `Power ${pIdx + 1}`));
        const description = typeof dl.description === 'string' ? dl.description : (typeof record.description === 'string' ? record.description : undefined);
        const effect = typeof dl.effect === 'string' ? dl.effect : (typeof record.effect === 'string' ? record.effect : undefined);
        const disciplineName = typeof dl.discipline === 'string' && dl.discipline.trim() !== '' ? dl.discipline : fallbackDiscName;
        addPower(disciplineName, dot, powerName, description, effect, clansRaw as unknown[]);
      });
    } else {
      const discName = recordDiscipline;
      const dot = Number(record.dot ?? record.level ?? record.rating ?? 1);
      const powerName = typeof record.name === 'string' ? record.name : `Power ${index + 1}`;
      const description = typeof record.description === 'string' ? record.description : undefined;
      const effect = typeof record.effect === 'string' ? record.effect : undefined;
      addPower(discName, dot, powerName, description, effect, clansRaw as unknown[]);
    }
  });

  const normalized = Array.from(disciplinesMap.values());
  normalized.forEach((d) => {
    d.powers.sort((a, b) => a.dot - b.dot);
  });

  return normalized;
}

function DotField({
  label,
  value,
  min,
  max,
  disabled,
  stacked,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  stacked?: boolean;
  onChange: (value: number) => void;
}) {
  const dots = min === 0 ? Array.from({ length: max }, (_, i) => i + 1) : Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className={`dot-field ${stacked ? 'stacked' : ''}`}>
      <span>{label}</span>
      <div className="dot-row" role="radiogroup" aria-label={label}>
        {dots.map((dot) => (
          <button
            key={dot}
            type="button"
            role="radio"
            aria-checked={value === dot}
            className={value >= dot ? 'dot active' : 'dot'}
            onClick={() => onChange(min === 0 && dot === 1 && value === 1 ? 0 : dot)}
            disabled={disabled}
          />
        ))}
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function BoxField({
  label,
  value,
  min,
  max,
  disabled,
  stacked,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  stacked?: boolean;
  onChange: (value: number) => void;
}) {
  const boxes = min === 0 ? Array.from({ length: max }, (_, i) => i + 1) : Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className={`dot-field box-field ${stacked ? 'stacked' : ''}`}>
      <span>{label}</span>
      <div className="dot-row box-row flex gap-1" role="radiogroup" aria-label={label}>
        {boxes.map((box) => (
          <button
            key={box}
            type="button"
            role="radio"
            aria-checked={value === box}
            className={value >= box ? 'box-btn active bg-primary border-primary' : 'box-btn bg-transparent border-primary/50'}
            onClick={() => onChange(min === 0 && box === 1 && value === 1 ? 0 : box)}
            disabled={disabled}
            style={{ width: '16px', height: '16px', borderStyle: 'solid', borderWidth: '1px', borderRadius: '2px', cursor: disabled ? 'default' : 'pointer' }}
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
  const [toastKind, setToastKind] = useState<ToastKind>('info');
  const [busy, setBusy] = useState(false);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState<Character | null>(null);
  const [sheetEdit, setSheetEdit] = useState(false);
  const [sheetTab, setSheetTab] = useState<SheetTab>('overview');

  const [draft, setDraft] = useState<Character>(() => ({ ...defaultCharacter(), derivedStats: recalculateDerivedStats(defaultCharacter()) }));
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardSplatSelected, setWizardSplatSelected] = useState(false);
  const [attributeFocus, setAttributeFocus] = useState<Record<FocusTier, AttributeGroup>>({
    primary: 'Mental',
    secondary: 'Physical',
    tertiary: 'Social'
  });
  const [skillFocus, setSkillFocus] = useState<Record<FocusTier, SkillGroup>>({
    primary: 'Mental',
    secondary: 'Physical',
    tertiary: 'Social'
  });
  const [aspirations, setAspirations] = useState<AspirationEntry[]>([
    { text: '', term: 'Short-Term' },
    { text: '', term: 'Short-Term' },
    { text: '', term: 'Short-Term' }
  ]);
  const [meritsLibrary, setMeritsLibrary] = useState<LibraryMerit[]>([]);
  const [skillsLibrary, setSkillsLibrary] = useState<{ physical: string[]; social: string[]; mental: string[] }>(defaultSkillsLibrary);
  const [splatOptions, setSplatOptions] = useState(defaultSplatOptions);
  const [vampireDisciplines, setVampireDisciplines] = useState<VampireDiscipline[]>([]);
  const [newSpecSkill, setNewSpecSkill] = useState('');
  const [newSpecName, setNewSpecName] = useState('');
  const [wizardStepError, setWizardStepError] = useState('');

  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('created');

  const [dicePool, setDicePool] = useState(5);
  const [diceRule, setDiceRule] = useState('10again');
  const [diceRote, setDiceRote] = useState(false);
  const [diceChance, setDiceChance] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceGhostCount, setDiceGhostCount] = useState(0);
  const [diceRevealCount, setDiceRevealCount] = useState(0);
  const [diceVisualKey, setDiceVisualKey] = useState(0);
  const [diceResult, setDiceResult] = useState<DiceRollResult | null>(null);
  const [diceCurrentRoll, setDiceCurrentRoll] = useState<DiceHistoryItem | null>(null);
  const [diceHistory, setDiceHistory] = useState<DiceHistoryItem[]>([]);

  const [chronicleDirectories, setChronicleDirectories] = useState<ChronicleDirectory[]>([]);
  const [showCreateChronicleModal, setShowCreateChronicleModal] = useState(false);
  const [newChronicleName, setNewChronicleName] = useState('');
  const [selectedChronicleId, setSelectedChronicleId] = useState('');
  const [selectedChronicleNoteId, setSelectedChronicleNoteId] = useState('');
  const [noteDraft, setNoteDraft] = useState({ title: '', body: '', characterId: '' });
  const [chronicleSort, setChronicleSort] = useState<ChronicleSort>('updated');
  const [chronicleGroup, setChronicleGroup] = useState<ChronicleGroup>('none');
  const [chronicleCharacterFilter, setChronicleCharacterFilter] = useState('');
  const [newSheetSpecialtySkill, setNewSheetSpecialtySkill] = useState('');
  const [newSheetSpecialtyName, setNewSheetSpecialtyName] = useState('');
  const [newCustomPowerName, setNewCustomPowerName] = useState('');
  const [newCustomPowerDots, setNewCustomPowerDots] = useState(1);
  const [newCustomPowerDescription, setNewCustomPowerDescription] = useState('');
  const diceTimerHandles = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const toastTimerHandles = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  function clearDiceTimers() {
    diceTimerHandles.current.forEach((timer) => clearTimeout(timer));
    diceTimerHandles.current = [];
  }

  function clearToastTimers() {
    toastTimerHandles.current.forEach((timer) => clearTimeout(timer));
    toastTimerHandles.current = [];
  }

  function showToast(text: string, kind: ToastKind = 'info') {
    clearToastTimers();
    setToastKind(kind);
    setMessage(text);
    const timer = setTimeout(() => {
      setMessage('');
    }, 4200);
    toastTimerHandles.current.push(timer);
  }

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

    const rawEntries = localStorage.getItem(CHRONICLES_KEY);
    if (rawEntries) {
      try {
        const parsed = JSON.parse(rawEntries) as unknown;
        if (Array.isArray(parsed)) {
          const now = Date.now();
          const first = parsed[0] as Record<string, unknown> | undefined;
          if (first && Array.isArray((first as Record<string, unknown>).notes)) {
            const dirs = (parsed as Record<string, unknown>[]).map((dir, index) => {
              const rawNotes = Array.isArray(dir.notes) ? (dir.notes as Record<string, unknown>[]) : [];
              return {
                id: typeof dir.id === 'string' ? dir.id : createId(),
                name: normalizeChronicleTitle(typeof dir.name === 'string' ? dir.name : '', index),
                createdAt: typeof dir.createdAt === 'number' ? dir.createdAt : now,
                updatedAt: typeof dir.updatedAt === 'number' ? dir.updatedAt : now,
                notes: rawNotes.map((note, noteIndex) => ({
                  id: typeof note.id === 'string' ? note.id : createId(),
                  title: normalizeChronicleTitle(typeof note.title === 'string' ? note.title : '', noteIndex),
                  body: typeof note.body === 'string' ? note.body : '',
                  characterId: typeof note.characterId === 'string' ? note.characterId : '',
                  createdAt: typeof note.createdAt === 'number' ? note.createdAt : now,
                  updatedAt: typeof note.updatedAt === 'number' ? note.updatedAt : now
                }))
              } satisfies ChronicleDirectory;
            });
            setChronicleDirectories(dirs);
          } else {
            // Legacy migration: each old chronicle entry becomes a directory with one note.
            const dirs = (parsed as Record<string, unknown>[]).map((entry, index) => {
              const createdAt = typeof entry.createdAt === 'number' ? entry.createdAt : now;
              const updatedAt = typeof entry.updatedAt === 'number' ? entry.updatedAt : createdAt;
              const title = normalizeChronicleTitle(typeof entry.title === 'string' ? entry.title : '', index);
              return {
                id: typeof entry.id === 'string' ? entry.id : createId(),
                name: title,
                createdAt,
                updatedAt,
                notes: [
                  {
                    id: createId(),
                    title: `${title} Note`,
                    body: typeof entry.body === 'string' ? entry.body : '',
                    characterId: typeof entry.characterId === 'string' ? entry.characterId : '',
                    createdAt,
                    updatedAt
                  }
                ]
              } satisfies ChronicleDirectory;
            });
            setChronicleDirectories(dirs);
          }
        }
      } catch {
        localStorage.removeItem(CHRONICLES_KEY);
      }
    }

    void loadLibraries();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(CHRONICLES_KEY, JSON.stringify(chronicleDirectories));
  }, [chronicleDirectories]);

  useEffect(
    () => () => {
      clearDiceTimers();
      clearToastTimers();
    },
    []
  );

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

  const skillOptions = useMemo(
    () =>
      Object.entries(SKILL_GROUPS).flatMap(([group, keys]) => {
        const named = skillsLibrary[group.toLowerCase() as 'physical' | 'social' | 'mental'];
        return keys.map((key, index) => ({ key, label: named[index] ?? toTitle(key) }));
      }),
    [skillsLibrary]
  );
  const attributeSpentByGroup = useMemo(() => {
    return (Object.entries(ATTRIBUTE_GROUPS) as [AttributeGroup, string[]][]).reduce<Record<AttributeGroup, number>>(
      (acc, [group, keys]) => {
        acc[group] = keys.reduce((sum, key) => sum + Math.max(0, (draft.attributes[key] ?? 1) - 1), 0);
        return acc;
      },
      { Mental: 0, Physical: 0, Social: 0 }
    );
  }, [draft.attributes]);
  const skillSpentByGroup = useMemo(() => {
    return (Object.entries(SKILL_GROUPS) as [SkillGroup, string[]][]).reduce<Record<SkillGroup, number>>(
      (acc, [group, keys]) => {
        acc[group] = keys.reduce((sum, key) => sum + Math.max(0, draft.skills[key] ?? 0), 0);
        return acc;
      },
      { Mental: 0, Physical: 0, Social: 0 }
    );
  }, [draft.skills]);
  const attributeGroupCaps = useMemo(() => {
    return {
      [attributeFocus.primary]: ATTRIBUTE_FOCUS_DOTS.primary,
      [attributeFocus.secondary]: ATTRIBUTE_FOCUS_DOTS.secondary,
      [attributeFocus.tertiary]: ATTRIBUTE_FOCUS_DOTS.tertiary
    } as Record<AttributeGroup, number>;
  }, [attributeFocus]);
  const skillGroupCaps = useMemo(() => {
    return {
      [skillFocus.primary]: SKILL_FOCUS_DOTS.primary,
      [skillFocus.secondary]: SKILL_FOCUS_DOTS.secondary,
      [skillFocus.tertiary]: SKILL_FOCUS_DOTS.tertiary
    } as Record<SkillGroup, number>;
  }, [skillFocus]);
  const hasAttributeFocusOverflow = useMemo(
    () => (Object.keys(attributeSpentByGroup) as AttributeGroup[]).some((group) => attributeSpentByGroup[group] > attributeGroupCaps[group]),
    [attributeGroupCaps, attributeSpentByGroup]
  );
  const hasSkillFocusOverflow = useMemo(
    () => (Object.keys(skillSpentByGroup) as SkillGroup[]).some((group) => skillSpentByGroup[group] > skillGroupCaps[group]),
    [skillGroupCaps, skillSpentByGroup]
  );
  const selectedVampireClan = useMemo(() => String(draft.splatData.clan ?? '').trim(), [draft.splatData.clan]);
  const vampireDisciplineDots = useMemo(() => {
    const raw = draft.splatData.vampireDisciplines;
    if (!raw || typeof raw !== 'object') return {} as Record<string, number>;
    return Object.entries(raw as Record<string, unknown>).reduce<Record<string, number>>((acc, [name, value]) => {
      if (typeof value === 'number' && value > 0) {
        acc[name] = clamp(value, 0, 5);
      }
      return acc;
    }, {});
  }, [draft.splatData.vampireDisciplines]);
  const vampireDisciplineTotals = useMemo(() => {
    return vampireDisciplines.reduce(
      (acc, discipline) => {
        const dots = vampireDisciplineDots[discipline.name] ?? 0;
        acc.total += dots;
        let inClan = false;
        if (selectedVampireClan) {
          inClan = isVampireDisciplineInClan(selectedVampireClan, discipline.name, discipline.inClanClans);
        }
        if (inClan) {
          acc.inClan += dots;
        }
        return acc;
      },
      { total: 0, inClan: 0 }
    );
  }, [selectedVampireClan, vampireDisciplineDots, vampireDisciplines]);

  function getStepAdvanceError(step: number): string | null {
    if (step === 0 && !wizardSplatSelected) {
      return 'Select a splat before continuing.';
    }
    if (step === 2) {
      if (hasAttributeFocusOverflow) return 'Attribute focus distribution is invalid. Rebalance dots to match selected priorities.';
    }
    if (step === 3) {
      if (hasSkillFocusOverflow) return 'Skill focus distribution is invalid. Rebalance dots to match selected priorities.';
    }
    return null;
  }

  function tryAdvanceWizard() {
    const reason = getStepAdvanceError(wizardStep);
    if (reason) {
      setWizardStepError(reason);
      showToast(reason, 'error');
      return;
    }
    setWizardStepError('');
    setWizardStep((step) => step + 1);
  }

  function tryOpenWizardStep(nextStep: number) {
    if (nextStep > wizardStep) {
      const reason = getStepAdvanceError(wizardStep);
      if (reason) {
        setWizardStepError(reason);
        showToast(reason, 'error');
        return;
      }
    }
    setWizardStepError('');
    setWizardStep(nextStep);
  }

  const wizardValidation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!wizardSplatSelected) errors.push('Select a splat before continuing character creation.');

    if (!draft.name.trim()) errors.push('Name is required.');

    const hasProfessionalTraining = draft.merits.some((m) => m.name.toLowerCase().includes('professional training'));
    if (hasProfessionalTraining && draft.professionalTrainingSkills.length !== 2) {
      errors.push('Professional Training requires exactly two focus skills.');
    }

    const missingAspirations = aspirations.filter((entry) => !entry.text.trim()).length;
    if (missingAspirations > 0) {
      warnings.push(`You still have ${missingAspirations} aspiration slot(s) empty.`);
    }

    if (draft.specialties.length > SPECIALTY_DOT_BUDGET) {
      errors.push(`Specialties exceed budget (${draft.specialties.length}/${SPECIALTY_DOT_BUDGET}).`);
    }

    draft.merits.forEach((merit) => {
      if (merit.isCustom || !merit.prerequisites.trim()) return;
      const check = evaluateMeritPrerequisites(merit.prerequisites, draft);
      if (!check.met) {
        errors.push(`${merit.name} prerequisites are no longer met: ${check.unmet.join(', ')}`);
      }
    });

    (Object.keys(attributeSpentByGroup) as AttributeGroup[]).forEach((group) => {
      if (attributeSpentByGroup[group] > attributeGroupCaps[group]) {
        errors.push(`${group} attributes exceed its focus dots (${attributeSpentByGroup[group]}/${attributeGroupCaps[group]}).`);
      } else if (attributeSpentByGroup[group] < attributeGroupCaps[group]) {
        warnings.push(`You still have ${attributeGroupCaps[group] - attributeSpentByGroup[group]} ${group} attribute dots left.`);
      }
    });

    (Object.keys(skillSpentByGroup) as SkillGroup[]).forEach((group) => {
      if (skillSpentByGroup[group] > skillGroupCaps[group]) {
        errors.push(`${group} skills exceed its focus dots (${skillSpentByGroup[group]}/${skillGroupCaps[group]}).`);
      } else if (skillSpentByGroup[group] < skillGroupCaps[group]) {
        warnings.push(`You still have ${skillGroupCaps[group] - skillSpentByGroup[group]} ${group} skill dots left.`);
      }
    });

    if (draft.splat === 'VAMPIRE') {
      if (!String(draft.splatData.clan ?? '').trim()) errors.push('Vampire requires Clan.');
      if (!String(draft.splatData.covenant ?? '').trim()) errors.push('Vampire requires Covenant.');
      if (vampireDisciplineTotals.total !== 3) {
        errors.push(`Vampire discipline dots must total exactly 3 (currently ${vampireDisciplineTotals.total}).`);
      }
      if (vampireDisciplineTotals.inClan < 2) {
        errors.push(`At least 2 discipline dots must be in-clan (currently ${vampireDisciplineTotals.inClan}).`);
      }
    }

    return { errors, warnings };
  }, [
    aspirations,
    attributeGroupCaps,
    attributeSpentByGroup,
    draft,
    skillGroupCaps,
    skillSpentByGroup,
    wizardSplatSelected,
    vampireDisciplineTotals.inClan,
    vampireDisciplineTotals.total
  ]);

  async function loadLibraries() {
    try {
      const [merits, skills, splats, disciplines] = await Promise.all([
        api.listMerits().catch(() => []),
        api.listSkills().catch(() => defaultSkillsLibrary),
        api.listSplatOptions().catch(() => defaultSplatOptions),
        api.listVampireDisciplines().catch(() => [])
      ]);
      setMeritsLibrary(merits);
      setSkillsLibrary(skills);
      setSplatOptions(splats);
      setVampireDisciplines(normalizeVampireDisciplines(disciplines));
    } catch {
      showToast('Could not load all libraries. You can still continue with core fields.', 'error');
    }
  }

  async function loadCharacters() {
    try {
      const list = await api.listCharacters();
      setCharacters(list.map((c) => ({ ...c, derivedStats: recalculateDerivedStats(c) })));
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Failed to load characters.';
      showToast(reason, 'error');
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast('Username and password are required.', 'error');
      return;
    }
    if (authMode === 'register' && password !== confirmPassword) {
      showToast('Password confirmation does not match.', 'error');
      return;
    }

    setBusy(true);
    try {
      const payload = { username: username.trim(), password };
      const response = authMode === 'login' ? await api.login(payload) : await api.register(payload);
      completeLogin({ username: response.username ?? payload.username, token: response.token ?? null });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Authentication failed.';
      showToast(reason, 'error');
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
    showToast('Bypass login enabled for testing.', 'success');
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
    setDraft({
      ...base,
      splatData: withDefaultSevenTraits(base.splatData),
      derivedStats: recalculateDerivedStats(base)
    });
    setWizardSplatSelected(false);
    setAttributeFocus({ primary: 'Mental', secondary: 'Physical', tertiary: 'Social' });
    setSkillFocus({ primary: 'Mental', secondary: 'Physical', tertiary: 'Social' });
    setAspirations([
      { text: '', term: 'Short-Term' },
      { text: '', term: 'Short-Term' },
      { text: '', term: 'Short-Term' }
    ]);
    setNewSpecSkill('');
    setNewSpecName('');
    setWizardStep(0);
    setWizardStepError('');
    setPage('wizard');
  }

  function setFocusTier<T extends string>(
    nextGroup: T,
    tier: FocusTier,
    focus: Record<FocusTier, T>,
    apply: (next: Record<FocusTier, T>) => void,
    validateNext?: (next: Record<FocusTier, T>) => boolean
  ) {
    const conflictTier = (Object.keys(focus) as FocusTier[]).find((key) => key !== tier && focus[key] === nextGroup);
    if (!conflictTier) {
      const nextFocus = { ...focus, [tier]: nextGroup };
      if (validateNext && !validateNext(nextFocus)) return;
      apply(nextFocus);
      return;
    }
    const swapped = { ...focus, [conflictTier]: focus[tier], [tier]: nextGroup };
    if (validateNext && !validateNext(swapped)) return;
    apply(swapped);
  }

  function isStepLocked(stepIndex: number) {
    if (!wizardSplatSelected && stepIndex > 0) return false;
    return stepIndex > wizardStep + 1;
  }

  function getConceptFieldValue(slot: 'first' | 'second') {
    if (draft.splat === 'VAMPIRE') {
      return String(draft.splatData[slot === 'first' ? 'mask' : 'dirge'] ?? '');
    }
    if (draft.splat === 'BEAST') {
      return String(draft.splatData[slot === 'first' ? 'legend' : 'life'] ?? '');
    }
    return slot === 'first' ? draft.virtue : draft.vice;
  }

  function setConceptFieldValue(slot: 'first' | 'second', value: string) {
    if (draft.splat === 'VAMPIRE') {
      updateSplatData(slot === 'first' ? 'mask' : 'dirge', value);
      return;
    }
    if (draft.splat === 'BEAST') {
      updateSplatData(slot === 'first' ? 'legend' : 'life', value);
      return;
    }
    updateDraftText(slot === 'first' ? 'virtue' : 'vice', value);
  }

  function setAspirationText(index: number, text: string) {
    setAspirations((prev) => prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, text } : entry)));
  }

  function setAspirationTerm(index: number, term: AspirationTerm) {
    setAspirations((prev) => prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, term } : entry)));
  }

  function toggleDraftPower(name: string) {
    setDraft((prev) => {
      const exists = prev.customPowers.some((power) => power.name === name);
      if (exists) {
        return { ...prev, customPowers: prev.customPowers.filter((power) => power.name !== name) };
      }
      return {
        ...prev,
        customPowers: [...prev.customPowers, { id: createId(), name, dots: 1, description: '' }]
      };
    });
  }

  function setVampireDisciplineDots(name: string, nextDots: number) {
    setDraft((prev) => {
      const currentMap = (prev.splatData.vampireDisciplines as Record<string, number> | undefined) ?? {};
      const safeDots = clamp(nextDots, 0, 5);
      const isIncreasing = safeDots > (currentMap[name] ?? 0);
      const nextMap = { ...currentMap, [name]: safeDots };
      if (safeDots <= 0) {
        delete nextMap[name];
      }

      const totals = vampireDisciplines.reduce(
        (acc, discipline) => {
          const dots = nextMap[discipline.name] ?? 0;
          acc.total += dots;
          let inClan = false;
          if (selectedVampireClan) {
            inClan = isVampireDisciplineInClan(selectedVampireClan, discipline.name, discipline.inClanClans);
          }
          if (inClan) {
            acc.inClan += dots;
          }
          return acc;
        },
        { total: 0, inClan: 0 }
      );

      if (isIncreasing) {
        if (totals.total > 3) {
          showToast('Vampire disciplines allow only 3 total dots.', 'error');
          return prev;
        }
        if (totals.total > 0 && totals.total - totals.inClan > 1) {
          showToast('At most 1 vampire discipline dot can be out-of-clan.', 'error');
          return prev;
        }
      }

      return {
        ...prev,
        splatData: {
          ...prev.splatData,
          vampireDisciplines: nextMap
        }
      };
    });
  }

  function addDraftSpecialty() {
    const specialtyName = newSpecName.trim();
    if (!newSpecSkill || !specialtyName) return;
    if (draft.specialties.length >= SPECIALTY_DOT_BUDGET) return;

    setDraft((prev) => {
      const duplicate = prev.specialties.some(
        (entry) => entry.skill === newSpecSkill && entry.specialty.toLowerCase() === specialtyName.toLowerCase()
      );
      if (duplicate) return prev;
      return {
        ...prev,
        specialties: [...prev.specialties, { skill: newSpecSkill, specialty: specialtyName }]
      };
    });
    setNewSpecName('');
  }

  function removeDraftSpecialty(index: number) {
    setDraft((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function setDraftNumber(section: 'attributes' | 'skills', key: string, raw: number, min: number, max: number) {
    setDraft((prev) => {
      const currentVal = prev[section][key] as number;
      const nextVal = clamp(raw, min, max);
      const isIncreasing = nextVal > currentVal;

      const next = cloneCharacter(prev);
      next[section][key] = nextVal;

      if (isIncreasing) {
        if (section === 'attributes') {
          const group = (Object.entries(ATTRIBUTE_GROUPS) as [AttributeGroup, string[]][]).find(([, keys]) => keys.includes(key))?.[0];
          if (group) {
            const spent = ATTRIBUTE_GROUPS[group].reduce((sum, item) => sum + Math.max(0, (next.attributes[item] ?? 1) - 1), 0);
            const cap = attributeGroupCaps[group];
            if (spent > cap) {
              showToast(`${group} attributes are capped at ${cap} focus dots.`, 'error');
              return prev;
            }
          }
        }

        if (section === 'skills') {
          const group = (Object.entries(SKILL_GROUPS) as [SkillGroup, string[]][]).find(([, keys]) => keys.includes(key))?.[0];
          if (group) {
            const spent = SKILL_GROUPS[group].reduce((sum, item) => sum + Math.max(0, next.skills[item] ?? 0), 0);
            const cap = skillGroupCaps[group];
            if (spent > cap) {
              showToast(`${group} skills are capped at ${cap} focus dots.`, 'error');
              return prev;
            }
          }
        }
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

  async function saveWizardCharacter() {
    if (wizardValidation.errors.length > 0) {
      showToast(wizardValidation.errors[0], 'error');
      return;
    }

    try {
      const payload = cloneCharacter(draft);
      payload.splatData = {
        ...payload.splatData,
        aspirations: aspirations.map((entry) => ({ text: entry.text.trim(), term: entry.term }))
      };
      payload.derivedStats = recalculateDerivedStats(payload);
      const created = await api.createCharacter(payload);
      const next = { ...created, derivedStats: recalculateDerivedStats(created) };
      setCharacters((prev) => [next, ...prev]);
      setSelected(next);
      setPage('sheet');
      setSheetTab('overview');
      setSheetEdit(false);
      showToast('Character created.', 'success');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Could not create character.';
      showToast(reason, 'error');
    }
  }

  function openCharacter(character: Character) {
    setSelected(cloneCharacter(character));
    setPage('sheet');
    setSheetEdit(false);
    setSheetTab('overview');
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
      showToast('Character saved.', 'success');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Save failed.';
      showToast(reason, 'error');
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
      showToast('Character deleted.', 'success');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Delete failed.';
      showToast(reason, 'error');
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
        showToast('5 Beats converted to 1 Experience.', 'success');
      } else {
        showToast(`Beats increased to ${next.beatsTotal}/5.`, 'info');
      }
      return next;
    });
  }

  function toggleHealthBox(index: number) {
    setSelected((prev) => {
      if (!prev) return prev;
      const next = cloneCharacter(prev);
      next.derivedStats.healthBoxes[index] = cycleHealth(next.derivedStats.healthBoxes[index]);
      showToast('Health track updated.', 'info');
      return next;
    });
  }

  function spendWillpower() {
    setSelected((prev) => {
      if (!prev) return prev;
      const max = prev.derivedStats.willpowerMax;
      if (prev.derivedStats.willpowerSpent >= max) {
        showToast('No unspent Willpower remaining.', 'error');
        return prev;
      }
      const next = cloneCharacter(prev);
      next.derivedStats.willpowerSpent = clamp(next.derivedStats.willpowerSpent + 1, 0, max);
      showToast(`Spent Willpower (${next.derivedStats.willpowerSpent}/${max}).`, 'info');
      return next;
    });
  }

  function recoverWillpower() {
    setSelected((prev) => {
      if (!prev) return prev;
      if (prev.derivedStats.willpowerSpent <= 0) {
        showToast('Willpower is already fully available.', 'error');
        return prev;
      }
      const next = cloneCharacter(prev);
      next.derivedStats.willpowerSpent = clamp(next.derivedStats.willpowerSpent - 1, 0, next.derivedStats.willpowerMax);
      showToast(`Recovered Willpower (${next.derivedStats.willpowerSpent}/${next.derivedStats.willpowerMax} spent).`, 'success');
      return next;
    });
  }

  function updateSelectedSplatData(key: string, value: string | number) {
    setSelected((prev) => (prev ? { ...prev, splatData: { ...prev.splatData, [key]: value } } : prev));
  }

  function addSheetSpecialty() {
    const specialtyName = newSheetSpecialtyName.trim();
    if (!newSheetSpecialtySkill || !specialtyName) return;
    setSelected((prev) => {
      if (!prev) return prev;
      const duplicate = prev.specialties.some(
        (entry) => entry.skill === newSheetSpecialtySkill && entry.specialty.toLowerCase() === specialtyName.toLowerCase()
      );
      if (duplicate) {
        showToast('That specialty already exists.', 'error');
        return prev;
      }
      const next = cloneCharacter(prev);
      next.specialties.push({ skill: newSheetSpecialtySkill, specialty: specialtyName });
      showToast('Specialty added.', 'success');
      return next;
    });
    setNewSheetSpecialtyName('');
  }

  function removeSheetSpecialty(index: number) {
    setSelected((prev) => {
      if (!prev) return prev;
      const next = cloneCharacter(prev);
      next.specialties = next.specialties.filter((_, itemIndex) => itemIndex !== index);
      showToast('Specialty removed.', 'info');
      return next;
    });
  }

  function addSelectedCustomPower() {
    const cleanName = newCustomPowerName.trim();
    if (!cleanName) return;
    setSelected((prev) => {
      if (!prev) return prev;
      const next = cloneCharacter(prev);
      next.customPowers.push({
        id: createId(),
        name: cleanName,
        dots: clamp(newCustomPowerDots, 1, 5),
        description: newCustomPowerDescription.trim()
      });
      showToast('Power added.', 'success');
      return next;
    });
    setNewCustomPowerName('');
    setNewCustomPowerDots(1);
    setNewCustomPowerDescription('');
  }

  function toggleSelectedLibraryPower(name: string) {
    setSelected((prev) => {
      if (!prev) return prev;
      const existing = prev.customPowers.find((power) => power.name === name);
      if (existing) {
        showToast('Power removed.', 'info');
        return { ...prev, customPowers: prev.customPowers.filter((power) => power.id !== existing.id) };
      }
      showToast('Power added.', 'success');
      return {
        ...prev,
        customPowers: [
          ...prev.customPowers,
          {
            id: createId(),
            name,
            dots: 1,
            description: ''
          }
        ]
      };
    });
  }

  function updateSelectedCustomPower(id: string, patch: { name?: string; dots?: number; description?: string }) {
    setSelected((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        customPowers: prev.customPowers.map((power) =>
          power.id === id
            ? {
                ...power,
                name: patch.name ?? power.name,
                dots: patch.dots === undefined ? power.dots : clamp(patch.dots, 1, 5),
                description: patch.description ?? power.description
              }
            : power
        )
      };
    });
  }

  function removeSelectedCustomPower(id: string) {
    setSelected((prev) => {
      if (!prev) return prev;
      showToast('Power removed.', 'info');
      return { ...prev, customPowers: prev.customPowers.filter((power) => power.id !== id) };
    });
  }

  async function rollDice() {
    if (diceRolling) return;
    const poolSize = diceChance ? 0 : clamp(dicePool, 0, 30);
    const ghostCount = Math.max(diceChance ? 1 : clamp(dicePool, 1, 30), 1);
    clearDiceTimers();
    setDiceResult(null);
    setDiceRevealCount(0);
    setDiceGhostCount(ghostCount);
    setDiceRolling(true);

    try {
      const [result] = await Promise.all([
        api.rollDice({
          poolSize,
          rule: diceRule,
          roteQuality: diceRote,
          chanceDie: diceChance
        }),
        new Promise((resolve) => {
          setTimeout(resolve, DIE_ROTATION_MS);
        })
      ]);

      setDiceResult(result);
      const revealTimers = result.dice.map((_, index) =>
        setTimeout(() => {
          setDiceRevealCount(index + 1);
        }, DIE_ROTATION_MS * (index + 1))
      );
      diceTimerHandles.current.push(...revealTimers);

      const finishTimer = setTimeout(() => {
        setDiceRolling(false);
        setDiceVisualKey((prev) => prev + 1);
      }, DIE_ROTATION_MS * result.dice.length + 20);
      diceTimerHandles.current.push(finishTimer);

      const nextRoll: DiceHistoryItem = {
        id: createId(),
        poolSize,
        rule: diceRule,
        roteQuality: diceRote,
        chanceDie: diceChance,
        successes: result.successes
      };

      if (diceCurrentRoll) {
        setDiceHistory((prev) => [diceCurrentRoll, ...prev]);
      }
      setDiceCurrentRoll(nextRoll);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Dice roll failed.';
      showToast(reason, 'error');
      clearDiceTimers();
      setDiceRolling(false);
    }
  }

  const selectedChronicle = useMemo(
    () => chronicleDirectories.find((entry) => entry.id === selectedChronicleId) ?? null,
    [chronicleDirectories, selectedChronicleId]
  );

  const selectedChronicleNote = useMemo(
    () => selectedChronicle?.notes.find((note) => note.id === selectedChronicleNoteId) ?? null,
    [selectedChronicle, selectedChronicleNoteId]
  );

  const chronicleCharacterOptions = useMemo(
    () =>
      Array.from(
        new Map(
          characters.map((character) => [
            character.id,
            { id: character.id, name: character.name }
          ])
        ).values()
      ),
    [characters]
  );

  const chronicleNotesView = useMemo(() => {
    if (!selectedChronicle) return [] as ChronicleNote[];
    let notes = [...selectedChronicle.notes];
    if (chronicleCharacterFilter) {
      notes = notes.filter((note) => note.characterId === chronicleCharacterFilter);
    }
    if (chronicleSort === 'updated') {
      notes.sort((a, b) => b.updatedAt - a.updatedAt);
    } else if (chronicleSort === 'name') {
      notes.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      notes.sort((a, b) => {
        const charA = characters.find((c) => c.id === a.characterId)?.name ?? 'Unassigned';
        const charB = characters.find((c) => c.id === b.characterId)?.name ?? 'Unassigned';
        return charA.localeCompare(charB);
      });
    }
    return notes;
  }, [characters, chronicleCharacterFilter, chronicleSort, selectedChronicle]);

  const groupedChronicleNotes = useMemo(() => {
    if (chronicleGroup === 'none') {
      return [{ key: 'All Notes', notes: chronicleNotesView }];
    }
    const groups = new Map<string, ChronicleNote[]>();
    chronicleNotesView.forEach((note) => {
      const key = chronicleGroup === 'character'
        ? characters.find((c) => c.id === note.characterId)?.name ?? 'Unassigned'
        : new Date(note.updatedAt).toLocaleDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(note);
    });
    return Array.from(groups.entries()).map(([key, notes]) => ({ key, notes }));
  }, [characters, chronicleGroup, chronicleNotesView]);

  useEffect(() => {
    if (selectedChronicleId || chronicleDirectories.length === 0) return;
    setSelectedChronicleId(chronicleDirectories[0].id);
  }, [chronicleDirectories, selectedChronicleId]);

  useEffect(() => {
    if (!selectedChronicle) {
      setSelectedChronicleNoteId('');
      setNoteDraft({ title: '', body: '', characterId: '' });
      return;
    }
    if (!selectedChronicleNoteId || !selectedChronicle.notes.some((note) => note.id === selectedChronicleNoteId)) {
      const first = selectedChronicle.notes[0];
      if (first) {
        setSelectedChronicleNoteId(first.id);
        setNoteDraft({ title: first.title, body: first.body, characterId: first.characterId });
      } else {
        setSelectedChronicleNoteId('');
        setNoteDraft({ title: '', body: '', characterId: '' });
      }
    }
  }, [selectedChronicle, selectedChronicleNoteId]);

  function selectChronicle(id: string) {
    setSelectedChronicleId(id);
    setSelectedChronicleNoteId('');
    setNoteDraft({ title: '', body: '', characterId: '' });
  }

  function selectChronicleNote(noteId: string) {
    if (!selectedChronicle) return;
    const note = selectedChronicle.notes.find((entry) => entry.id === noteId);
    if (!note) return;
    setSelectedChronicleNoteId(note.id);
    setNoteDraft({ title: note.title, body: note.body, characterId: note.characterId });
  }

  function syncChronicleNoteDraft(nextDraft: typeof noteDraft) {
    setNoteDraft(nextDraft);
    if (!selectedChronicle || !selectedChronicleNoteId) return;
    setChronicleDirectories((prev) =>
      prev.map((dir) => {
        if (dir.id !== selectedChronicle.id) return dir;
        const notes = dir.notes.map((note) =>
          note.id === selectedChronicleNoteId
            ? {
                ...note,
                title: normalizeChronicleTitle(nextDraft.title, 0),
                body: nextDraft.body,
                characterId: nextDraft.characterId,
                updatedAt: Date.now()
              }
            : note
        );
        return {
          ...dir,
          notes,
          updatedAt: Date.now()
        };
      })
    );
  }

  function createChronicle(inputName?: string) {
    const nextId = createId();
    const name = normalizeChronicleTitle(inputName ?? '', chronicleDirectories.length);
    const record: ChronicleDirectory = {
      id: nextId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes: []
    };
    setChronicleDirectories((prev) => [record, ...prev]);
    setSelectedChronicleId(nextId);
    setSelectedChronicleNoteId('');
    setNoteDraft({ title: '', body: '', characterId: '' });
    setShowCreateChronicleModal(false);
    setNewChronicleName('');
    showToast(`Created ${name}.`, 'success');
  }

  function createChronicleNote() {
    if (!selectedChronicle) {
      showToast('Select a chronicle first.', 'error');
      return;
    }
    const nextIndex = selectedChronicle.notes.length + 1;
    const note: ChronicleNote = {
      id: createId(),
      title: `Note ${nextIndex}`,
      body: '',
      characterId: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setChronicleDirectories((prev) =>
      prev.map((dir) =>
        dir.id === selectedChronicle.id
          ? { ...dir, notes: [note, ...dir.notes], updatedAt: Date.now() }
          : dir
      )
    );
    setSelectedChronicleNoteId(note.id);
    setNoteDraft({ title: note.title, body: note.body, characterId: note.characterId });
    showToast('Chronicle note created.', 'success');
  }

  function saveChronicleNoteDraft() {
    if (!selectedChronicle) {
      showToast('Select a chronicle first.', 'error');
      return;
    }
    const cleanBody = noteDraft.body.trim();
    if (!cleanBody) {
      showToast('Write some notes before saving.', 'error');
      return;
    }
    if (!selectedChronicleNoteId) {
      const created: ChronicleNote = {
        id: createId(),
        title: normalizeChronicleTitle(noteDraft.title, selectedChronicle.notes.length),
        body: cleanBody,
        characterId: noteDraft.characterId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setChronicleDirectories((prev) =>
        prev.map((dir) =>
          dir.id === selectedChronicle.id
            ? { ...dir, notes: [created, ...dir.notes], updatedAt: Date.now() }
            : dir
        )
      );
      setSelectedChronicleNoteId(created.id);
      setNoteDraft({ title: created.title, body: created.body, characterId: created.characterId });
      showToast('Chronicle note saved.', 'success');
      return;
    }
    syncChronicleNoteDraft({ ...noteDraft, body: cleanBody });
    showToast('Chronicle note saved.', 'success');
  }

  const splatFields: Record<Exclude<Splat, 'MORTAL'>, SplatField[]> = {
    VAMPIRE: [
      { key: 'clan', label: 'Clan', type: 'select', options: splatOptions.vampireClans.length > 0 ? splatOptions.vampireClans : ['Daeva', 'Gangrel', 'Mekhet', 'Nosferatu', 'Ventrue'] },
      { key: 'covenant', label: 'Covenant', type: 'select', options: splatOptions.vampireCovenants.length > 0 ? splatOptions.vampireCovenants : ['Invictus', 'Carthian Movement', 'Circle of the Crone', 'Lancea et Sanctum', 'Ordo Dracul', 'Unaligned'] },
      { key: 'bloodPotency', label: 'Blood Potency', type: 'number', min: 1, max: 10 },
      { key: 'humanity', label: 'Humanity', type: 'number', min: 0, max: 10 }
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
      { key: 'satiety', label: 'Satiety', type: 'number', min: 0, max: 10 }
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

      {message && (
        <div className={`toast toast-${toastKind}`} role="status" aria-live="polite">
          <strong>{toastKind === 'error' ? 'Error' : toastKind === 'success' ? 'Success' : 'Notice'}</strong>
          <span>{message}</span>
        </div>
      )}

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
                clearToastTimers();
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
              <CharacterCard key={character.id} character={character} onOpen={() => openCharacter(character)} />
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
                <div className={"checkbox-group"}>
                  <label className="checkbox"><input type="checkbox" checked={diceRote} onChange={(e) => setDiceRote(e.target.checked)} />Rote</label>
                  <label className="checkbox"><input type="checkbox" checked={diceChance} onChange={(e) => setDiceChance(e.target.checked)} />Chance die</label>
                </div>
              <button type="button" className="primary" id={"btnRollDice"} disabled={diceRolling} onClick={() => void rollDice()}>{diceRolling ? 'Rolling...' : 'Roll'}</button>
            </div>

            <div className="dice-vtt" aria-live="polite">
              <div className="dice-tray-3d" role="img" aria-label={diceRolling ? 'Dice are rolling' : 'Dice result'}>
                {(diceResult?.dice ?? Array.from({ length: diceGhostCount }, (_, ghostDie) => ghostDie + 1)).map((die, index) => {
                  const isRevealed = Boolean(diceResult) && index < diceRevealCount;
                  return (
                  <div
                    key={diceResult ? `${diceVisualKey}-${die}-${index}` : `ghost-${index}`}
                    className={`die-3d ${isRevealed ? 'revealed' : 'rolling'} ${isRevealed && Number(die) >= 8 ? 'success' : ''} ${isRevealed && Number(die) === 1 && diceChance ? 'dramatic' : ''}`}
                  >
                    {isRevealed && <span className="die-value">{die}</span>}
                  </div>
                  );
                })}
              </div>
              <p className="dice-vtt-summary">
                {diceRolling
                  ? 'Rolling dice...'
                  : diceResult
                    ? `${diceResult.successes} ${diceResult.successes === 1 ? 'Success' : 'Successes'}`
                    : 'No roll yet.'}
              </p>
            </div>

            <ul className="history">
              {diceHistory.map((item) => (
                <li key={item.id}>
                  {item.poolSize} dice ({DICE_RULE_LABELS[item.rule] ?? item.rule} - Rote: {item.roteQuality ? 'Yes' : 'No'} - Chance die: {item.chanceDie ? 'Yes' : 'No'}) -
                  {' '}Successes: {item.successes}
                </li>
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
              <button
                key={step}
                type="button"
                className={wizardStep === index ? 'active' : ''}
                disabled={isStepLocked(index)}
                onClick={() => tryOpenWizardStep(index)}
              >
                {index + 1}. {step}
              </button>
            ))}
            <div className="wizard-hints">
              <p>Attributes spent: {attributeDotsSpent(draft)} / {ATTRIBUTE_DOT_BUDGET}</p>
              <p>Skills spent: {skillDotsSpent(draft)} / {SKILL_DOT_BUDGET}</p>
              <p>Specialties spent: {draft.specialties.length} / {SPECIALTY_DOT_BUDGET}</p>
              <p>Merits spent: {draft.merits.reduce((sum, merit) => sum + merit.dots, 0)} / {MERIT_DOT_BUDGET}</p>
              <p>
                Total specialization pool used: {attributeDotsSpent(draft) + skillDotsSpent(draft) + draft.specialties.length + draft.merits.reduce((sum, merit) => sum + merit.dots, 0)} /
                {' '}
                {ATTRIBUTE_DOT_BUDGET + SKILL_DOT_BUDGET + SPECIALTY_DOT_BUDGET + MERIT_DOT_BUDGET}
              </p>
            </div>
            {wizardValidation.warnings.map((warning) => <small key={warning}>{warning}</small>)}
            {wizardStepError && <small className="wizard-step-error">{wizardStepError}</small>}
          </aside>

          <article className="wizard-body">
            {wizardStep === 0 && (
              <div className="panel">
                <h4>Select Splat to Start</h4>
                <p>Character creation is locked until a splat is selected.</p>
                <div className="chips splat-grid">
                  {SPLATS.map((splat) => (
                    <button
                      key={splat}
                      type="button"
                      data-splat={splat}
                      className={`splat-card ${draft.splat === splat && wizardSplatSelected ? 'active' : ''}`}
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          splat,
                          splatData: withDefaultSevenTraits(prev.splatData)
                        }));
                        setWizardSplatSelected(true);
                      }}
                    >
                      <strong>{splat}</strong>
                      <small>Select {splat.toLowerCase()} archetype</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 1 && (
              <div className="form-grid two">
                <label>Name<input value={draft.name} onChange={(e) => updateDraftText('name', e.target.value)} /></label>
                <label>Player<input value={draft.player} onChange={(e) => updateDraftText('player', e.target.value)} /></label>
                <label>Chronicle<input value={draft.chronicle} onChange={(e) => updateDraftText('chronicle', e.target.value)} /></label>
                <label>Concept<input value={draft.concept} onChange={(e) => updateDraftText('concept', e.target.value)} /></label>
                <label>
                  {getArchetypeLabels(draft.splat).first}
                  <input value={getConceptFieldValue('first')} onChange={(e) => setConceptFieldValue('first', e.target.value)} />
                </label>
                <label>
                  {getArchetypeLabels(draft.splat).second}
                  <input value={getConceptFieldValue('second')} onChange={(e) => setConceptFieldValue('second', e.target.value)} />
                </label>
                <label>
                  Touchstone
                  <input
                    placeholder="Name only"
                    value={String(draft.splatData.touchstone ?? '')}
                    onChange={(e) => updateSplatData('touchstone', e.target.value)}
                  />
                </label>
              </div>
            )}

            {wizardStep === 1 && (
              <section className="panel aspirations-module">
                <h4>Aspirations</h4>
                <p>Set 3 aspirations and mark each as Short-Term or Long-Term.</p>
                {aspirations.map((aspiration, index) => (
                  <div key={`aspiration-${index}`} className="aspiration-row">
                    <label>
                      Aspiration {index + 1}
                      <input
                        value={aspiration.text}
                        placeholder="Describe aspiration"
                        onChange={(e) => setAspirationText(index, e.target.value)}
                      />
                    </label>
                    <div className="aspiration-term" role="radiogroup" aria-label={`Aspiration ${index + 1} term`}>
                      {(['Short-Term', 'Long-Term'] as AspirationTerm[]).map((term) => (
                        <label className="checkbox modern-checkbox" key={`${index}-${term}`}>
                          <input
                            type="radio"
                            name={`aspiration-term-${index}`}
                            checked={aspiration.term === term}
                            onChange={() => setAspirationTerm(index, term)}
                          />
                          <span>{term}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {wizardStep === 2 && (
              <div className="panel focus-panel">
                <h4>Attribute Focus</h4>
                <div className="form-grid three">
                  {(['primary', 'secondary', 'tertiary'] as FocusTier[]).map((tier) => (
                    <label key={`attr-focus-${tier}`}>
                      {TIER_LABELS[tier]} ({ATTRIBUTE_FOCUS_DOTS[tier]} dots)
                      <select
                        value={attributeFocus[tier]}
                        onChange={(e) => setFocusTier(e.target.value as AttributeGroup, tier, attributeFocus, setAttributeFocus)}
                      >
                        {(Object.keys(ATTRIBUTE_GROUPS) as AttributeGroup[]).map((group) => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="split">
                {Object.entries(ATTRIBUTE_GROUPS).map(([group, keys]) => (
                  <section key={group} className="panel">
                    <h4>{group}</h4>
                    <small>
                      Spent: {attributeSpentByGroup[group as AttributeGroup]} / {attributeGroupCaps[group as AttributeGroup]}
                    </small>
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
              <div className="panel focus-panel">
                <h4>Skill Focus</h4>
                <div className="form-grid three">
                  {(['primary', 'secondary', 'tertiary'] as FocusTier[]).map((tier) => (
                    <label key={`skill-focus-${tier}`}>
                      {TIER_LABELS[tier]} ({SKILL_FOCUS_DOTS[tier]} dots)
                      <select
                        value={skillFocus[tier]}
                        onChange={(e) => setFocusTier(e.target.value as SkillGroup, tier, skillFocus, setSkillFocus)}
                      >
                        {(Object.keys(SKILL_GROUPS) as SkillGroup[]).map((group) => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <>
                <div className="split wizard-skills">
                  {Object.entries(SKILL_GROUPS).map(([group, keys]) => {
                    const named = skillsLibrary[group.toLowerCase() as 'physical' | 'social' | 'mental'];
                    return (
                      <section key={group} className="panel">
                        <h4>{group}</h4>
                        <small>
                          Spent: {skillSpentByGroup[group as SkillGroup]} / {skillGroupCaps[group as SkillGroup]}
                        </small>
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
                <section className="panel specialty-editor specialties-module">
                  <h4>Specialties ({draft.specialties.length}/{SPECIALTY_DOT_BUDGET})</h4>
                  <p>Remaining specialty dots: {Math.max(0, SPECIALTY_DOT_BUDGET - draft.specialties.length)}</p>
                  <div className="specialty-editor-row">
                    <select value={newSpecSkill} onChange={(e) => setNewSpecSkill(e.target.value)}>
                      <option value="">Select skill</option>
                      {skillOptions.map((option) => (
                        <option key={option.key} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                    <input
                      value={newSpecName}
                      placeholder="Specialty name"
                      onChange={(e) => setNewSpecName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addDraftSpecialty();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addDraftSpecialty}
                      disabled={!newSpecSkill || !newSpecName.trim() || draft.specialties.length >= SPECIALTY_DOT_BUDGET}
                    >
                      Add
                    </button>
                  </div>
                  <ul className="specialty-list">
                    {draft.specialties.map((specialty, index) => {
                      const label = skillOptions.find((option) => option.key === specialty.skill)?.label ?? toTitle(specialty.skill);
                      return (
                        <li key={`${specialty.skill}-${specialty.specialty}-${index}`} className="specialty-item">
                          <span>
                            {label}: {specialty.specialty}
                          </span>
                          <button type="button" className="ghost specialty-remove" onClick={() => removeDraftSpecialty(index)}>
                            Remove
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </>
            )}

            {wizardStep === 4 && (
              <MeritPicker
                merits={draft.merits}
                setMerits={(merits) => setDraft((prev) => ({ ...prev, merits }))}
                professionalTrainingSkills={draft.professionalTrainingSkills}
                setProfessionalTrainingSkills={(skills) => setDraft((prev) => ({ ...prev, professionalTrainingSkills: skills }))}
                meritLibrary={meritsLibrary}
                skillOptions={skillOptions}
                character={draft}
                createId={createId}
                meritDotBudget={MERIT_DOT_BUDGET}
                onValidationError={(reason) => showToast(reason, 'error')}
                isCreationMode={true}
              />
            )}

            {wizardStep === 5 && (
              <section className="panel">
                {draft.splat === 'MORTAL' ? (
                  <p>Mortal has no mandatory supernatural fields.</p>
                ) : (
                  <div className="form-grid two">
                    {splatFields[draft.splat].map((field) => {
                      const isMorality = ['humanity', 'harmony', 'wisdom', 'clarity', 'synergy', 'memory', 'cover', 'satiety', 'conviction'].includes(field.key);
                      const isPowerTrait = ['bloodPotency', 'primalUrge', 'gnosis', 'azoth', 'wyrd', 'sekhem', 'primum', 'lair', 'baseline', 'psyche'].includes(field.key);

                      if (field.type === 'number' && (isMorality || isPowerTrait)) {
                        const FieldComponent = isMorality ? BoxField : DotField;
                        return (
                          <div key={field.key} className="col-span-full md:col-span-1">
                              <FieldComponent
                                label={field.label}
                                value={Number(draft.splatData[field.key] ?? field.min ?? 0)}
                                min={field.min ?? 0}
                                max={field.max ?? 10}
                                stacked
                                onChange={(val) => updateSplatData(field.key, val)}
                              />
                          </div>
                        );
                      }

                      return (
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
                        {field.type === 'textarea' && (
                          <textarea rows={4} value={String(draft.splatData[field.key] ?? '')} onChange={(e) => updateSplatData(field.key, e.target.value)} />
                        )}
                      </label>
                    );
                    })}
                  </div>
                )}

                <label>
                  Touchstone
                  <input
                    placeholder="Name only"
                    value={String(draft.splatData.touchstone ?? '')}
                    onChange={(e) => updateSplatData('touchstone', e.target.value)}
                  />
                </label>

                <div className="specialties-module powers-module">
                  {draft.splat === 'VAMPIRE' ? (
                    <>
                      <h4>Vampire Disciplines</h4>
                      <p>
                        Distribute 3 dots total. At least 2 dots must be in-clan for {selectedVampireClan || 'the selected clan'}.
                      </p>
                      <p>
                        Assigned: {vampireDisciplineTotals.total}/3 dots · In-clan: {vampireDisciplineTotals.inClan}/2 minimum
                      </p>
                      <div className="discipline-list">
                        {vampireDisciplines.map((discipline) => {
                          const currentDots = vampireDisciplineDots[discipline.name] ?? 0;
                          let inClan = false;
                          if (selectedVampireClan) {
                            inClan = isVampireDisciplineInClan(selectedVampireClan, discipline.name, discipline.inClanClans);
                          }
                          return (
                            <details key={discipline.id} className={`discipline-item ${inClan ? 'in-clan' : 'out-clan'}`}>
                              <summary className="expandable-summary">
                                <span className="expand-summary-left">
                                  <span className="expand-chevron" aria-hidden="true">▶</span>
                                  <span>{discipline.name}</span>
                                </span>
                                <span>
                                  {inClan ? 'In-clan' : 'Out-of-clan'} · {currentDots} dots
                                </span>
                              </summary>
                              <div className="discipline-controls">
                                <button type="button" onClick={() => setVampireDisciplineDots(discipline.name, currentDots - 1)} disabled={currentDots <= 0}>
                                  -
                                </button>
                                <strong>{currentDots}</strong>
                                <button type="button" onClick={() => setVampireDisciplineDots(discipline.name, currentDots + 1)} disabled={currentDots >= 5}>
                                  +
                                </button>
                              </div>
                              {['Celerity', 'Vigor', 'Resilience'].includes(discipline.name) ? (
                                <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded-md">
                                  {formatTextContent(discipline.powers[0]?.description) || 'Grants scaling bonuses per dot.'}
                                </div>
                              ) : (
                                <ul className="discipline-power-list mt-2 space-y-1">
                                  {discipline.powers.map((power, pIdx) => {
                                    const unlocked = currentDots >= power.dot;
                                    return (
                                      <li key={`${discipline.id}-${power.name}-${power.dot}-${pIdx}`} className={unlocked ? 'unlocked opacity-100' : 'locked opacity-50 grayscale'}>
                                        <details className="bg-background/50 border border-border/50 rounded-md p-1.5" style={{ listStyle: 'none' }}>
                                          <summary className="expandable-summary cursor-pointer text-sm font-medium hover:text-primary transition-colors select-none">
                                            <span className="expand-summary-left">
                                              <span className="expand-chevron" aria-hidden="true">▶</span>
                                              <span>Dot {power.dot}: {power.name}</span>
                                            </span>
                                          </summary>
                                          {power.description && (
                                            <div className="text-xs text-muted-foreground whitespace-pre-wrap mt-2 pl-6 border-l-2 border-primary/30">
                                              {formatTextContent(power.description)}
                                            </div>
                                          )}
                                        </details>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </details>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <h4>{draft.splat} Powers</h4>
                      <p>Available powers are filtered by splat.</p>
                      <div className="chips">
                        {SPLAT_POWER_LIBRARY[draft.splat].map((power) => {
                          const selected = draft.customPowers.some((entry) => entry.name === power);
                          return (
                            <label key={power} className="checkbox modern-checkbox">
                              <input type="checkbox" checked={selected} onChange={() => toggleDraftPower(power)} />
                              <span>{power}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

            <footer className="wizard-actions">
              <button type="button" onClick={() => setPage('dashboard')}>Cancel</button>
              <button type="button" disabled={wizardStep === 0} onClick={() => setWizardStep((s) => s - 1)}>Previous</button>
              {wizardStep < 5 ? (
                <button
                  type="button"
                  className="primary"
                  onClick={tryAdvanceWizard}
                >
                  Next
                </button>
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
            <button type="button" className={sheetTab === 'overview' ? 'active' : ''} onClick={() => setSheetTab('overview')}>Overview</button>
            <button type="button" className={sheetTab === 'features' ? 'active' : ''} onClick={() => setSheetTab('features')}>Features</button>
            <button type="button" className={sheetTab === 'details' ? 'active' : ''} onClick={() => setSheetTab('details')}>Details</button>
          </nav>

          {sheetTab === 'overview' && (
            <>
              <section className="panel">
                <h4>Basic Character Info</h4>
                <div className="form-grid two">
                  <label>Name<input value={selected.name} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, name: e.target.value } : p))} /></label>
                  <label>Player<input value={selected.player} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, player: e.target.value } : p))} /></label>
                  <label>Chronicle<input value={selected.chronicle} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, chronicle: e.target.value } : p))} /></label>
                  <label>Concept<input value={selected.concept} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, concept: e.target.value } : p))} /></label>
                  <label>Virtue<input value={selected.virtue} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, virtue: e.target.value } : p))} /></label>
                  <label>Vice<input value={selected.vice} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, vice: e.target.value } : p))} /></label>
                  <label>Portrait URL<input value={selected.portraitUri ?? ''} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, portraitUri: e.target.value || null } : p))} /></label>
                  <label>Size<input type="number" min={1} max={15} value={selected.derivedStats.size} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, derivedStats: { ...p.derivedStats, size: clamp(Number(e.target.value), 1, 15) } } : p))} /></label>
                  {selected.splat === 'VAMPIRE' && (
                    <>
                      <label>Clan<input value={String(selected.splatData.clan ?? '')} disabled={!sheetEdit} onChange={(e) => updateSelectedSplatData('clan', e.target.value)} /></label>
                      <label>Covenant<input value={String(selected.splatData.covenant ?? '')} disabled={!sheetEdit} onChange={(e) => updateSelectedSplatData('covenant', e.target.value)} /></label>
                    </>
                  )}
                  {selected.splat === 'BEAST' && (
                    <>
                      <label>Family<input value={String(selected.splatData.family ?? '')} disabled={!sheetEdit} onChange={(e) => updateSelectedSplatData('family', e.target.value)} /></label>
                      <label>Hunger<input value={String(selected.splatData.hunger ?? '')} disabled={!sheetEdit} onChange={(e) => updateSelectedSplatData('hunger', e.target.value)} /></label>
                    </>
                  )}
                </div>
              </section>

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
              </div>

              <section className="panel">
                <h4>Specialties</h4>
                {sheetEdit && (
                  <div className="specialty-editor-row">
                    <select value={newSheetSpecialtySkill} onChange={(e) => setNewSheetSpecialtySkill(e.target.value)}>
                      <option value="">Select skill</option>
                      {skillOptions.map((option) => (
                        <option key={option.key} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                    <input value={newSheetSpecialtyName} placeholder="Specialty name" onChange={(e) => setNewSheetSpecialtyName(e.target.value)} />
                    <button type="button" onClick={addSheetSpecialty} disabled={!newSheetSpecialtySkill || !newSheetSpecialtyName.trim()}>
                      Add
                    </button>
                  </div>
                )}
                <ul className="specialty-list">
                  {selected.specialties.map((specialty, index) => (
                    <li key={`${specialty.skill}-${specialty.specialty}-${index}`} className="specialty-item">
                      <span>{toTitle(specialty.skill)}: {specialty.specialty}</span>
                      {sheetEdit && (
                        <button type="button" className="ghost specialty-remove" onClick={() => removeSheetSpecialty(index)}>
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="panel">
                <h4>Health, Willpower & Other Resources</h4>
                <ul className="history">
                  <li>Speed: {recalculateDerivedStats(selected).speed}</li>
                  <li>Defense: {recalculateDerivedStats(selected).defense}</li>
                  <li>Initiative: {recalculateDerivedStats(selected).initiative}</li>
                  <li>Perception: {recalculateDerivedStats(selected).perception}</li>
                  <li>Health Max: {recalculateDerivedStats(selected).healthMax}</li>
                  <li>Willpower Max: {recalculateDerivedStats(selected).willpowerMax}</li>
                  <li>Wound Penalty: {woundPenalty(selected.derivedStats.healthBoxes)}</li>
                  <li>
                    Integrity / Humanity / Harmony / Satiety:{' '}
                    {['integrity', 'humanity', 'harmony', 'satiety', 'wisdom', 'clarity', 'synergy']
                      .map((key) => (typeof selected.splatData[key] === 'number' ? `${toTitle(key)} ${selected.splatData[key]}` : null))
                      .filter(Boolean)
                      .join(' · ') || 'Not set'}
                  </li>
                  {typeof selected.splatData.vitae === 'number' && <li>Vitae: {Number(selected.splatData.vitae)}</li>}
                </ul>
                <p>Click health boxes to cycle: empty → bashing → lethal → aggravated.</p>
                <div className="health-track">
                  {selected.derivedStats.healthBoxes.map((status, index) => (
                    <button key={`${status}-${index}`} type="button" className={`box ${status.toLowerCase()}`} onClick={() => toggleHealthBox(index)}>
                      {status === 'BASHING' ? '/' : status === 'LETHAL' ? 'X' : status === 'AGGRAVATED' ? '*' : ''}
                    </button>
                  ))}
                </div>
                <div className="resource-actions">
                  <button type="button" onClick={spendWillpower}>Spend Willpower</button>
                  <button type="button" onClick={recoverWillpower}>Recover Willpower</button>
                  <button type="button" onClick={addBeat}>Add Beat</button>
                </div>
                <p>Willpower Spent: {selected.derivedStats.willpowerSpent} / {selected.derivedStats.willpowerMax}</p>
                <p>Beats: {selected.beatsTotal} / 5</p>
                <p>XP Total: {selected.experienceTotal}</p>
                <p>XP Spent: {selected.experienceSpent}</p>
                <p>Remaining XP: {remainingXp(selected)}</p>
              </section>
            </>
          )}

          {sheetTab === 'features' && (
            <div className="split">
              <section className="panel">
                <h4>Merits</h4>
                {sheetEdit ? (
                  <MeritPicker
                    merits={selected.merits}
                    setMerits={(merits) => setSelected((prev) => (prev ? { ...prev, merits } : prev))}
                    professionalTrainingSkills={selected.professionalTrainingSkills}
                    setProfessionalTrainingSkills={(professionalTrainingSkills) =>
                      setSelected((prev) => (prev ? { ...prev, professionalTrainingSkills } : prev))
                    }
                    meritLibrary={meritsLibrary}
                    skillOptions={skillOptions}
                    character={selected}
                    createId={createId}
                    meritDotBudget={50}
                    onValidationError={(reason) => showToast(reason, 'error')}
                  />
                ) : (
                  <ul className="history">
                    {selected.merits.map((merit) => (
                      <li key={merit.id}>{merit.name} ({merit.category}) · {merit.dots}</li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="panel">
                <h4>Powers</h4>
                {sheetEdit && (
                  <div className="powers-editor-grid">
                    <input placeholder="Power name" value={newCustomPowerName} onChange={(e) => setNewCustomPowerName(e.target.value)} />
                    <input type="number" min={1} max={5} value={newCustomPowerDots} onChange={(e) => setNewCustomPowerDots(clamp(Number(e.target.value), 1, 5))} />
                    <button type="button" onClick={addSelectedCustomPower} disabled={!newCustomPowerName.trim()}>
                      Add Power
                    </button>
                    <textarea
                      rows={3}
                      placeholder="Description"
                      value={newCustomPowerDescription}
                      onChange={(e) => setNewCustomPowerDescription(e.target.value)}
                    />
                  </div>
                )}

                <div className="chips">
                  {SPLAT_POWER_LIBRARY[selected.splat].map((powerName) => {
                    const isActive = selected.customPowers.some((power) => power.name === powerName);
                    return (
                      <button
                        key={powerName}
                        type="button"
                        className={isActive ? 'active' : ''}
                        disabled={!sheetEdit}
                        onClick={() => sheetEdit && toggleSelectedLibraryPower(powerName)}
                      >
                        {powerName}
                      </button>
                    );
                  })}
                </div>

                <ul className="specialty-list">
                  {selected.customPowers.map((power) => (
                    <li key={power.id} className="specialty-item">
                      {sheetEdit ? (
                        <div className="form-grid two">
                          <input value={power.name} onChange={(e) => updateSelectedCustomPower(power.id, { name: e.target.value })} />
                          <input type="number" min={1} max={5} value={power.dots} onChange={(e) => updateSelectedCustomPower(power.id, { dots: Number(e.target.value) })} />
                          <textarea rows={3} value={power.description} onChange={(e) => updateSelectedCustomPower(power.id, { description: e.target.value })} />
                        </div>
                      ) : (
                        <span>{power.name} · {power.dots}</span>
                      )}
                      {sheetEdit && (
                        <button type="button" className="ghost specialty-remove" onClick={() => removeSelectedCustomPower(power.id)}>
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {sheetTab === 'details' && (
            <section className="panel">
              <h4>Other Details</h4>
              <div className="form-grid two">
                <label>XP Total<input type="number" min={0} value={selected.experienceTotal} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, experienceTotal: clamp(Number(e.target.value), 0, 999) } : p))} /></label>
                <label>XP Spent<input type="number" min={0} value={selected.experienceSpent} disabled={!sheetEdit} onChange={(e) => setSelected((p) => (p ? { ...p, experienceSpent: clamp(Number(e.target.value), 0, 999) } : p))} /></label>
              </div>
              <label>
                Splat Data (JSON)
                <textarea
                  rows={8}
                  value={JSON.stringify(selected.splatData, null, 2)}
                  disabled
                />
              </label>
              <label>
                Notes
                <textarea
                  rows={12}
                  value={selected.notes}
                  onChange={(e) => setSelected((prev) => (prev ? { ...prev, notes: e.target.value } : prev))}
                />
              </label>
            </section>
          )}
        </section>
      )}

      {page === 'chronicle' && (
        <section className="page chronicle-page">
          <div className="toolbar chronicle-toolbar">
            <h3>Chronicles</h3>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setShowCreateChronicleModal(true);
                setNewChronicleName('');
              }}
            >
              Add New Chronicle
            </button>
          </div>

          <div className="chronicle-dashboard">
            <article className="panel chronicle-list-panel">
              <h4>All Chronicles</h4>
              <div className="chronicle-list">
                {chronicleDirectories.length === 0 ? (
                  <p className="text-muted-foreground italic">No chronicles yet. Create one to start taking notes.</p>
                ) : (
                  chronicleDirectories.map((entry) => {
                    const isSelected = entry.id === selectedChronicleId;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        className={`chronicle-card ${isSelected ? 'active' : ''}`}
                        onClick={() => selectChronicle(entry.id)}
                      >
                        <strong>{entry.name}</strong>
                        <small>{entry.notes.length} note(s)</small>
                        <span>{new Date(entry.updatedAt).toLocaleDateString()}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </article>

            <article className="panel chronicle-notes-panel">
              <div className="chronicle-editor-header">
                <h4>{selectedChronicle ? `Notes in ${selectedChronicle.name}` : 'Chronicle Notes'}</h4>
                <button type="button" className="ghost" onClick={createChronicleNote} disabled={!selectedChronicle}>
                  Add Note
                </button>
              </div>

              <div className="chronicle-note-controls form-grid three">
                <label>
                  Filter by Character
                  <select value={chronicleCharacterFilter} onChange={(e) => setChronicleCharacterFilter(e.target.value)}>
                    <option value="">All characters</option>
                    {chronicleCharacterOptions.map((character) => (
                      <option key={character.id} value={character.id}>{character.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Sort
                  <select value={chronicleSort} onChange={(e) => setChronicleSort(e.target.value as ChronicleSort)}>
                    <option value="updated">Last Updated</option>
                    <option value="name">Name</option>
                    <option value="character">Character</option>
                  </select>
                </label>
                <label>
                  Group
                  <select value={chronicleGroup} onChange={(e) => setChronicleGroup(e.target.value as ChronicleGroup)}>
                    <option value="none">None</option>
                    <option value="character">Character</option>
                    <option value="date">Date</option>
                  </select>
                </label>
              </div>

              <div className="chronicle-note-groups">
                {groupedChronicleNotes.map((group) => (
                  <div key={group.key} className="chronicle-note-group">
                    {chronicleGroup !== 'none' && <small>{group.key}</small>}
                    {group.notes.map((note) => {
                      const selected = note.id === selectedChronicleNoteId;
                      const characterLabel = characters.find((c) => c.id === note.characterId)?.name ?? 'Unassigned';
                      return (
                        <button
                          key={note.id}
                          type="button"
                          className={`chronicle-note-card ${selected ? 'active' : ''}`}
                          onClick={() => selectChronicleNote(note.id)}
                        >
                          <strong>{note.title}</strong>
                          <small>{characterLabel}</small>
                          <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </article>

            <article className="panel chronicle-editor-panel">
              <div className="chronicle-editor-header">
                <h4>{selectedChronicleNote ? selectedChronicleNote.title : 'Note Editor'}</h4>
                <button type="button" className="ghost" onClick={saveChronicleNoteDraft}>
                  Save Note
                </button>
              </div>

              <div className="form-grid two">
                <label>
                  Note Title
                  <input value={noteDraft.title} onChange={(e) => syncChronicleNoteDraft({ ...noteDraft, title: e.target.value })} />
                </label>
                <label>
                  Character Link
                  <select
                    value={noteDraft.characterId}
                    onChange={(e) => syncChronicleNoteDraft({ ...noteDraft, characterId: e.target.value })}
                  >
                    <option value="">None / Storyteller note</option>
                    {characters.map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="chronicle-notes-label">
                Notes
                <textarea
                  rows={10}
                  value={noteDraft.body}
                  onChange={(e) => syncChronicleNoteDraft({ ...noteDraft, body: e.target.value })}
                  placeholder="Write chronicle notes here..."
                />
              </label>
            </article>
          </div>

          {showCreateChronicleModal && (
            <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create chronicle">
              <article className="modal-card panel">
                <h4>Create Chronicle</h4>
                <label>
                  Chronicle Name
                  <input
                    autoFocus
                    value={newChronicleName}
                    placeholder="Enter chronicle name"
                    onChange={(e) => setNewChronicleName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        createChronicle(newChronicleName);
                      }
                    }}
                  />
                </label>
                <div className="toolbar">
                  <button type="button" onClick={() => setShowCreateChronicleModal(false)}>Cancel</button>
                  <button type="button" className="primary" onClick={() => createChronicle(newChronicleName)}>
                    Create
                  </button>
                </div>
              </article>
            </div>
          )}
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
