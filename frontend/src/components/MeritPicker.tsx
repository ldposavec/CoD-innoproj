import { useEffect, useMemo, useState } from 'react';
import type { Character, LibraryMerit, Merit } from '../types';
import { evaluateMeritPrerequisites, formatTextContent } from '../utils';

interface SkillOption {
  readonly key: string;
  readonly label: string;
}

interface MeritPickerProps {
  readonly merits: Merit[];
  readonly setMerits: (m: Merit[]) => void;
  readonly professionalTrainingSkills: string[];
  readonly setProfessionalTrainingSkills: (s: string[]) => void;
  readonly meritLibrary: LibraryMerit[];
  readonly skillOptions: SkillOption[];
  readonly character: Pick<Character, 'attributes' | 'skills' | 'merits' | 'splat' | 'splatData' | 'specialties' | 'customPowers'>;
  readonly createId: () => string;
  readonly meritDotBudget: number;
  readonly onValidationError?: (message: string) => void;
  readonly isCreationMode?: boolean;
}

function parseMeritCostOptions(entry: LibraryMerit): number[] {
  const raw = (entry.cost ?? '').trim();
  if (!raw) return entry.allowedDots;

  if (/^\d+$/.test(raw)) {
    return [Number(raw)];
  }

  if (/^\d+\s*-\s*\d+$/.test(raw)) {
    const [startText, endText] = raw.split('-').map((piece) => piece.trim());
    const start = Number(startText);
    const end = Number(endText);
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    return Array.from({ length: max - min + 1 }, (_, index) => min + index);
  }

  if (/^\d+(\s*\/\s*\d+)+$/.test(raw)) {
    return raw
      .split('/')
      .map((piece) => Number(piece.trim()))
      .filter((value) => Number.isFinite(value));
  }

  return entry.allowedDots;
}

function formatMissingPrerequisites(unmet: string[]): string {
  if (unmet.length <= 1) return unmet[0] ?? '';
  if (unmet.length === 2) return `${unmet[0]} and ${unmet[1]}`;
  return `${unmet.slice(0, -1).join(', ')}, and ${unmet[unmet.length - 1]}`;
}

export function MeritPicker({
  merits,
  setMerits,
  professionalTrainingSkills,
  setProfessionalTrainingSkills,
  meritLibrary,
  skillOptions,
  character,
  createId,
  meritDotBudget,
  onValidationError,
  isCreationMode
}: MeritPickerProps) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCat, setCustomCat] = useState('Mental');
  const [customDots, setCustomDots] = useState(1);
  const [customDesc, setCustomDesc] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [showOnlyQualified, setShowOnlyQualified] = useState(false);

  const categories = useMemo(() => ['All', ...new Set(meritLibrary.map((m) => m.category))], [meritLibrary]);
  const selectedDots = useMemo(() => merits.reduce((sum, merit) => sum + merit.dots, 0), [merits]);
  const prereqStateKey = useMemo(
    () =>
      JSON.stringify({
        attributes: character.attributes,
        skills: character.skills,
        merits: character.merits.map((merit) => ({ name: merit.name, dots: merit.dots })),
        splat: character.splat,
        splatData: character.splatData,
        specialties: character.specialties,
        customPowers: character.customPowers
      }),
    [character.attributes, character.customPowers, character.merits, character.skills, character.specialties, character.splat, character.splatData]
  );
  const hasProfessionalTraining = useMemo(
    () => merits.some((merit) => merit.name.toLowerCase().includes('professional training')),
    [merits]
  );

  const repeatableMeritNames = ['allies', 'alternate identity', 'area of expertise', 'armory', 'barfly', 'contacts', 'language', 'library', 'mentor', 'mystery cult initiation', 'retainer', 'safe place', 'status'];

  const filtered = useMemo(
    () =>
      meritLibrary.filter((entry) => {
        if (isCreationMode && entry.category.toLowerCase() === 'devotions') return false; 
        if (filterCat !== 'All' && entry.category !== filterCat) return false;
        if (search && !entry.name.toLowerCase().includes(search.toLowerCase())) return false;
        
        if (showOnlyQualified) {
          const prereq = evaluateMeritPrerequisites(entry.prerequisites, character);
          if (!prereq.met) return false;
        }

        const hasPicked = merits.some((m) => m.name.toLowerCase() === entry.name.toLowerCase());
        if (hasPicked) {
          const isRepeatable = repeatableMeritNames.some(r => entry.name.toLowerCase().includes(r));
          if (!isRepeatable) return false;
        }
        
        return true;
      }),
    [filterCat, meritLibrary, search, isCreationMode, merits, showOnlyQualified, prereqStateKey]
  );

  useEffect(() => {
    if (!hasProfessionalTraining && professionalTrainingSkills.length > 0) {
      setProfessionalTrainingSkills([]);
    }
  }, [hasProfessionalTraining, professionalTrainingSkills.length, setProfessionalTrainingSkills]);

  useEffect(() => {
    // Keep stale validation errors from lingering after character edits update prerequisites.
    setValidationMessage('');
  }, [prereqStateKey]);

  function addMerit(entry: LibraryMerit, dots: number) {
    const prereq = evaluateMeritPrerequisites(entry.prerequisites, character);
    if (!prereq.met) {
      const reason = `Cannot add ${entry.name}. Missing prerequisites: ${formatMissingPrerequisites(prereq.unmet)}`;
      setValidationMessage(reason);
      onValidationError?.(reason);
      return;
    }
    if (selectedDots + dots > meritDotBudget) return;
    const merit: Merit = {
      id: createId(),
      name: entry.name,
      category: entry.category,
      dots,
      description: entry.description,
      prerequisites: entry.prerequisites,
      isCustom: false
    };
    setMerits([...merits, merit]);
  }

  function addCustomMerit() {
    if (!customName.trim()) return;
    if (selectedDots + customDots > meritDotBudget) return;
    const merit: Merit = {
      id: createId(),
      name: customName.trim(),
      category: customCat,
      dots: customDots,
      description: customDesc,
      prerequisites: '',
      isCustom: true
    };
    setMerits([...merits, merit]);
    setCustomName('');
    setCustomDesc('');
    setCustomDots(1);
    setShowCustom(false);
  }

  function removeMerit(id: string) {
    setMerits(merits.filter((merit) => merit.id !== id));
  }

  function adjustMeritDots(id: string, nextDots: number) {
    const current = merits.find((merit) => merit.id === id);
    if (!current) return;
    const safeDots = Math.min(5, Math.max(1, nextDots));
    const nextTotal = selectedDots - current.dots + safeDots;
    if (nextTotal > meritDotBudget) return;
    setMerits(merits.map((merit) => (merit.id === id ? { ...merit, dots: safeDots } : merit)));
  }

  function toggleProfessionalSkill(skillKey: string) {
    const selected = professionalTrainingSkills.includes(skillKey);
    if (selected) {
      setProfessionalTrainingSkills(professionalTrainingSkills.filter((skill) => skill !== skillKey));
      return;
    }
    if (professionalTrainingSkills.length >= 2) return;
    setProfessionalTrainingSkills([...professionalTrainingSkills, skillKey]);
  }

  return (
    <div className="split merit-picker-grid">
      <section className="panel">
        <h4>Selected Merits ({selectedDots} dots)</h4>
        {validationMessage && <small className="merit-validation-error">{validationMessage}</small>}
        {merits.length === 0 ? (
          <p>No merits selected yet.</p>
        ) : (
          <div className="merit-list merit-selected-list">
            {merits.map((merit) => (
              <details key={merit.id} className="expandable-card merit-card">
                {(() => {
                  const prereq = merit.isCustom ? { met: true, unmet: [] as string[] } : evaluateMeritPrerequisites(merit.prerequisites, character);
                  const prereqText = prereq.met ? '' : `Missing: ${formatMissingPrerequisites(prereq.unmet)}`;
                  return (
                    <>
                <summary className="expandable-summary merit-summary">
                  <span className="expand-summary-left">
                    <span className="expand-chevron" aria-hidden="true">▶</span>
                    <span>
                      {merit.name} <small>({merit.category})</small>
                    </span>
                  </span>
                  <span className="merit-dots">{'●'.repeat(merit.dots)}</span>
                </summary>
                <div className="expandable-content merit-details">
                  {merit.prerequisites && <small>Requires: {merit.prerequisites}</small>}
                  {!prereq.met && <small className="merit-validation-error">{prereqText}</small>}
                  {merit.description && <p className="whitespace-pre-wrap">{formatTextContent(merit.description)}</p>}
                  <div className="merit-adjust-row">
                    <button type="button" onClick={() => adjustMeritDots(merit.id, merit.dots - 1)} disabled={merit.dots <= 1}>
                      -
                    </button>
                    <strong>{merit.dots}</strong>
                    <button type="button" onClick={() => adjustMeritDots(merit.id, merit.dots + 1)} disabled={selectedDots + 1 > meritDotBudget || merit.dots >= 5}>
                      +
                    </button>
                  </div>
                  <button type="button" className="ghost merit-remove" onClick={() => removeMerit(merit.id)}>
                    Remove
                  </button>
                </div>
                    </>
                  );
                })()}
              </details>
            ))}
          </div>
        )}

        {hasProfessionalTraining && (
          <div className="professional-training">
            <h4>Professional Training Focus Skills ({professionalTrainingSkills.length}/2)</h4>
            <div className="chips">
              {skillOptions.map((skill) => (
                <button
                  key={skill.key}
                  type="button"
                  className={professionalTrainingSkills.includes(skill.key) ? 'active' : ''}
                  onClick={() => toggleProfessionalSkill(skill.key)}
                >
                  {skill.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <h4>Merit Library</h4>
        <div className="toolbar">
          <input placeholder="Search merits..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            {categories.map((category) => (
              <option value={category} key={category}>
                {category}
              </option>
            ))}
          </select>
          <label className="checkbox modern-checkbox whitespace-nowrap">
            <input type="checkbox" checked={showOnlyQualified} onChange={(e) => setShowOnlyQualified(e.target.checked)} />
            <span>Show qualified only</span>
          </label>
        </div>

        <div className="merit-list">
          {filtered.map((entry) => (
            <article key={entry.id}>
              {(() => {
                const prereq = evaluateMeritPrerequisites(entry.prerequisites, character);
                const prereqMessage = prereq.met ? '' : `Missing: ${formatMissingPrerequisites(prereq.unmet)}`;
                return (
                  <div className={prereq.met ? 'opacity-100' : 'opacity-50 grayscale'}>
                    <h4>
                      {entry.name} <small>({entry.category})</small>
                    </h4>
                    <p className="whitespace-pre-wrap">{formatTextContent(entry.description)}</p>
                    {entry.prerequisites && <small>Requires: {entry.prerequisites}</small>}
                    {!prereq.met && <small className="merit-validation-error block mt-1">{prereqMessage}</small>}
                    <div className="chips merit-dot-buttons mt-2">
                      {parseMeritCostOptions(entry).map((dot) => (
                        <button
                          type="button"
                          key={`${entry.id}-${dot}`}
                          disabled={selectedDots + dot > meritDotBudget || !prereq.met}
                          title={!prereq.met ? prereqMessage : undefined}
                          onClick={() => addMerit(entry, dot)}
                        >
                          {dot}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </article>
          ))}
        </div>

        <button type="button" className="ghost" onClick={() => setShowCustom((prev) => !prev)}>
          {showCustom ? 'Hide Custom Merit' : 'Custom Merit'}
        </button>
        {showCustom && (
          <div className="form-grid merit-custom-form">
            <label>
              Name
              <input value={customName} onChange={(e) => setCustomName(e.target.value)} />
            </label>
            <label>
              Category
              <select value={customCat} onChange={(e) => setCustomCat(e.target.value)}>
                {categories
                  .filter((category) => category !== 'All')
                  .map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Dots
              <input
                type="number"
                min={1}
                max={5}
                value={customDots}
                onChange={(e) => setCustomDots(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
              />
            </label>
            <label>
              Description
              <textarea rows={3} value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} />
            </label>
            <button type="button" onClick={addCustomMerit} disabled={!customName.trim() || selectedDots + customDots > meritDotBudget}>
              Add Custom Merit
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
