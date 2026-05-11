import type { Character, DerivedStats, HealthStatus } from './types';

export const ATTRIBUTE_DOT_BUDGET = 12;
export const SKILL_DOT_BUDGET = 22;
export const MERIT_DOT_BUDGET = 10;
export const SPECIALTY_DOT_BUDGET = 3;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

export function cycleHealth(status: HealthStatus): HealthStatus {
  switch (status) {
    case 'EMPTY':
      return 'BASHING';
    case 'BASHING':
      return 'LETHAL';
    case 'LETHAL':
      return 'AGGRAVATED';
    default:
      return 'EMPTY';
  }
}

export function woundPenalty(boxes: HealthStatus[]): string {
  const filled = boxes.filter((b) => b !== 'EMPTY').length;
  const max = boxes.length;
  if (filled === 0) return '0';
  if (filled >= max - 1) return '-3';
  if (filled >= max - 2) return '-2';
  if (filled >= max - 3) return '-1';
  return '0';
}

export function remainingXp(character: Character): number {
  return character.experienceTotal - character.experienceSpent;
}

export function cloneCharacter(character: Character): Character {
  return JSON.parse(JSON.stringify(character)) as Character;
}

export function attributeDotsSpent(character: Character): number {
  return Object.values(character.attributes).reduce((sum, value) => sum + Math.max(0, value - 1), 0);
}

export function skillDotsSpent(character: Character): number {
  return Object.values(character.skills).reduce((sum, value) => sum + Math.max(0, value), 0);
}

export function recalculateDerivedStats(character: Character): DerivedStats {
  const strength = character.attributes.strength ?? 1;
  const dexterity = character.attributes.dexterity ?? 1;
  const stamina = character.attributes.stamina ?? 1;
  const composure = character.attributes.composure ?? 1;
  const resolve = character.attributes.resolve ?? 1;
  const wits = character.attributes.wits ?? 1;
  const athletics = character.skills.athletics ?? 0;

  const size = clamp(character.derivedStats.size ?? 5, 1, 15);
  const speedModifier = character.derivedStats.speedModifier ?? 0;
  const defenseModifier = character.derivedStats.defenseModifier ?? 0;
  const initiativeModifier = character.derivedStats.initiativeModifier ?? 0;
  const perceptionModifier = character.derivedStats.perceptionModifier ?? 0;
  const healthModifier = character.derivedStats.healthModifier ?? 0;
  const willpowerModifier = character.derivedStats.willpowerModifier ?? 0;

  const healthMax = Math.max(1, stamina + size + healthModifier);
  const willpowerMax = Math.max(1, resolve + composure + willpowerModifier);
  const previous = character.derivedStats.healthBoxes ?? [];
  const healthBoxes: HealthStatus[] = Array.from({ length: healthMax }, (_, i) => previous[i] ?? 'EMPTY');

  return {
    ...character.derivedStats,
    size,
    speed: Math.max(1, strength + dexterity + size + speedModifier),
    defense: Math.max(0, Math.min(wits, dexterity) + athletics + defenseModifier),
    initiative: dexterity + composure + initiativeModifier,
    perception: wits + composure + perceptionModifier,
    healthMax,
    healthBoxes,
    willpowerMax,
    willpowerSpent: clamp(character.derivedStats.willpowerSpent ?? 0, 0, willpowerMax),
    speedModifier,
    defenseModifier,
    initiativeModifier,
    perceptionModifier,
    healthModifier,
    willpowerModifier
  };
}

type MeritPrereqCheck = {
  met: boolean;
  unmet: string[];
};

function normalizeTraitKey(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function formatTextContent(text: string | undefined): string {
  if (!text) return '';
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\/n/g, '\n')
    .replace(/\/t/g, '\t');
}

export function evaluateMeritPrerequisites(
  prerequisites: string,
  character: Pick<Character, 'attributes' | 'skills' | 'merits' | 'splat' | 'splatData' | 'specialties' | 'customPowers'>
): MeritPrereqCheck {
  const text = prerequisites.trim();
  if (!text) return { met: true, unmet: [] };

  const traitValues = new Map<string, number>();
  Object.entries(character.attributes).forEach(([key, value]) => {
    traitValues.set(normalizeTraitKey(key), value);
  });
  Object.entries(character.skills).forEach(([key, value]) => {
    traitValues.set(normalizeTraitKey(key), value);
  });
  character.merits.forEach(m => traitValues.set(normalizeTraitKey(m.name), Math.max(traitValues.get(normalizeTraitKey(m.name)) || 0, m.dots)));
  character.specialties.forEach(s => {
    traitValues.set(normalizeTraitKey('specialty ' + s.skill), 1);
    traitValues.set(normalizeTraitKey('specialty ' + s.specialty), 1);
  });
  character.customPowers.forEach(cp => traitValues.set(normalizeTraitKey(cp.name), cp.dots));

  if (character.splat === 'VAMPIRE' && character.splatData.vampireDisciplines) {
    const vd = character.splatData.vampireDisciplines as Record<string, number>;
    Object.entries(vd).forEach(([key, value]) => {
      traitValues.set(normalizeTraitKey(key), value);
    });
  }
  
  if (character.splatData.clan) traitValues.set(normalizeTraitKey(String(character.splatData.clan)), 1);
  if (character.splatData.covenant) traitValues.set(normalizeTraitKey(String(character.splatData.covenant)), 1);
  traitValues.set(normalizeTraitKey(character.splat), 1);

  const orGroups = text.split(/\s+(?:OR|or)\s+/);
  const allUnmetGroups: string[][] = [];

  for (const group of orGroups) {
    const andConditions = group.split(/(?:\s+(?:AND|and)\s+|,)/).map(s => s.trim()).filter(Boolean);
    const unmet: string[] = [];

    for (const cond of andConditions) {
      const match = cond.match(/^(.+?)\s+(\d+)$/);
      if (match) {
        const rawName = match[1].trim();
        const requiredDots = Number(match[2]);
        const normalized = normalizeTraitKey(rawName);
        const val = traitValues.get(normalized) || 0;
        if (val < requiredDots) {
          unmet.push(`${rawName} ${requiredDots}`);
        }
      } else {
        const normalized = normalizeTraitKey(cond);
        const val = traitValues.get(normalized) || 0;
        if (val < 1) {
          unmet.push(cond);
        }
      }
    }

    if (unmet.length === 0) {
      return { met: true, unmet: [] };
    }
    allUnmetGroups.push(unmet);
  }

  const uniqueUnmet = Array.from(new Set(allUnmetGroups.flatMap((group) => group)));
  return { met: false, unmet: uniqueUnmet.length > 0 ? uniqueUnmet : [text] };
}
