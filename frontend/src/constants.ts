import type { Character, Splat } from './types';

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

export const SPLAT_LABELS: Record<Splat, string> = {
  MORTAL: 'Mortal',
  VAMPIRE: 'Vampire',
  WEREWOLF: 'Werewolf',
  MAGE: 'Mage',
  PROMETHEAN: 'Promethean',
  CHANGELING: 'Changeling',
  HUNTER: 'Hunter',
  GEIST: 'Geist',
  MUMMY: 'Mummy',
  DEMON: 'Demon',
  BEAST: 'Beast',
  DEVIANT: 'Deviant'
};

export const SPLAT_SUBTITLES: Record<Splat, string> = {
  MORTAL: 'Everyday survivor',
  VAMPIRE: 'Predator of the night',
  WEREWOLF: 'Hunter between worlds',
  MAGE: 'Awakened willworker',
  PROMETHEAN: 'Pilgrim of humanity',
  CHANGELING: 'Escapee of Arcadia',
  HUNTER: 'Defiant mortal',
  GEIST: 'Bound to the dead',
  MUMMY: 'Arisen judge',
  DEMON: 'Renegade machine-spirit',
  BEAST: 'Incarnate nightmare',
  DEVIANT: 'Broken experiment'
};

export const ATTRIBUTE_GROUPS = {
  Physical: ['strength', 'dexterity', 'stamina'],
  Social: ['presence', 'manipulation', 'composure'],
  Mental: ['intelligence', 'wits', 'resolve']
};

export const SKILL_GROUPS = {
  Physical: ['athletics', 'brawl', 'drive', 'firearms', 'larceny', 'stealth', 'survival', 'weaponry'],
  Social: ['animalKen', 'empathy', 'expression', 'intimidation', 'persuasion', 'socialize', 'streetwise', 'subterfuge'],
  Mental: ['academics', 'computer', 'crafts', 'investigation', 'medicine', 'occult', 'politics', 'science']
};

export const THEME_KEY = 'cod-theme';

export function defaultCharacter(): Character {
  const attributes = Object.values(ATTRIBUTE_GROUPS).flat().reduce<Record<string, number>>((acc, key) => {
    acc[key] = 1;
    return acc;
  }, {});

  const skills = Object.values(SKILL_GROUPS).flat().reduce<Record<string, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  return {
    id: '',
    name: '',
    player: '',
    chronicle: '',
    concept: '',
    virtue: '',
    vice: '',
    splat: 'MORTAL',
    attributes,
    skills,
    specialties: [],
    merits: [],
    professionalTrainingSkills: [],
    customPowers: [],
    derivedStats: {
      size: 5,
      healthMax: 6,
      healthBoxes: ['EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY', 'EMPTY'],
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
    portraitUri: null,
    createdAt: 0,
    updatedAt: 0
  };
}
