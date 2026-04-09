import type { Attributes, Character, Skills, Splat } from './types';

export const SPLATS: Splat[] = [
  'MORTAL',
  'VAMPIRE',
  'WEREWOLF',
  'MAGE',
  'PROMETHEAN',
  'CHANGELING',
  'HUNTER',
  'GEIST',
  'MUMMY',
  'DEMON',
  'BEAST',
  'DEVIANT'
];

export const ATTRIBUTE_GROUPS: Record<string, (keyof Attributes)[]> = {
  Physical: ['strength', 'dexterity', 'stamina'],
  Social: ['presence', 'manipulation', 'composure'],
  Mental: ['intelligence', 'wits', 'resolve']
};

export const SKILL_GROUPS: Record<string, (keyof Skills)[]> = {
  Physical: ['athletics', 'brawl', 'drive', 'firearms', 'larceny', 'stealth', 'survival', 'weaponry'],
  Social: ['animalKen', 'empathy', 'expression', 'intimidation', 'persuasion', 'socialize', 'streetwise', 'subterfuge'],
  Mental: ['academics', 'computer', 'crafts', 'investigation', 'medicine', 'occult', 'politics', 'science']
};

export function emptyCharacter(): Character {
  return {
    name: '',
    player: '',
    chronicle: '',
    concept: '',
    virtue: '',
    vice: '',
    splat: 'MORTAL',
    attributes: {
      strength: 1,
      dexterity: 1,
      stamina: 1,
      presence: 1,
      manipulation: 1,
      composure: 1,
      intelligence: 1,
      wits: 1,
      resolve: 1
    },
    skills: {
      athletics: 0,
      brawl: 0,
      drive: 0,
      firearms: 0,
      larceny: 0,
      stealth: 0,
      survival: 0,
      weaponry: 0,
      animalKen: 0,
      empathy: 0,
      expression: 0,
      intimidation: 0,
      persuasion: 0,
      socialize: 0,
      streetwise: 0,
      subterfuge: 0,
      academics: 0,
      computer: 0,
      crafts: 0,
      investigation: 0,
      medicine: 0,
      occult: 0,
      politics: 0,
      science: 0
    },
    specialties: [],
    merits: [],
    professionalTrainingSkills: [],
    customPowers: [],
    derivedStats: {
      size: 5,
      healthMax: 8,
      healthBoxes: Array.from({ length: 8 }, () => 'EMPTY'),
      willpowerMax: 2,
      willpowerSpent: 0,
      speed: 7,
      defense: 1,
      initiative: 2,
      perception: 2,
      speedModifier: 0,
      defenseModifier: 0,
      initiativeModifier: 0,
      perceptionModifier: 0,
      healthModifier: 0,
      willpowerModifier: 0
    },
    splatData: {},
    experienceTotal: 0,
    experienceSpent: 0,
    beatsTotal: 0,
    notes: '',
    portraitUri: null
  };
}

export function formatLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
