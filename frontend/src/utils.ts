import type { Character, DerivedStats, HealthStatus } from './types';

export const ATTRIBUTE_DOT_BUDGET = 12;
export const SKILL_DOT_BUDGET = 22;

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
  if (filled >= max) return 'Incapacitated';
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
