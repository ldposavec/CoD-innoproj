import type { Character, HealthStatus } from './types';

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
  return JSON.parse(JSON.stringify(character));
}
