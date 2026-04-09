export type Splat =
  | 'MORTAL'
  | 'VAMPIRE'
  | 'WEREWOLF'
  | 'MAGE'
  | 'PROMETHEAN'
  | 'CHANGELING'
  | 'HUNTER'
  | 'GEIST'
  | 'MUMMY'
  | 'DEMON'
  | 'BEAST'
  | 'DEVIANT';

export type HealthStatus = 'EMPTY' | 'BASHING' | 'LETHAL' | 'AGGRAVATED';

export interface Attributes {
  strength: number;
  dexterity: number;
  stamina: number;
  presence: number;
  manipulation: number;
  composure: number;
  intelligence: number;
  wits: number;
  resolve: number;
}

export interface Skills {
  athletics: number;
  brawl: number;
  drive: number;
  firearms: number;
  larceny: number;
  stealth: number;
  survival: number;
  weaponry: number;
  animalKen: number;
  empathy: number;
  expression: number;
  intimidation: number;
  persuasion: number;
  socialize: number;
  streetwise: number;
  subterfuge: number;
  academics: number;
  computer: number;
  crafts: number;
  investigation: number;
  medicine: number;
  occult: number;
  politics: number;
  science: number;
}

export interface SkillSpecialty {
  skill: keyof Skills;
  specialty: string;
}

export interface Merit {
  id: string;
  name: string;
  category: string;
  dots: number;
  description: string;
  prerequisites: string;
  isCustom: boolean;
}

export interface CustomPower {
  id: string;
  name: string;
  dots: number;
  description: string;
}

export interface DerivedStats {
  size: number;
  healthMax: number;
  healthBoxes: HealthStatus[];
  willpowerMax: number;
  willpowerSpent: number;
  speed: number;
  defense: number;
  initiative: number;
  perception: number;
  speedModifier: number;
  defenseModifier: number;
  initiativeModifier: number;
  perceptionModifier: number;
  healthModifier: number;
  willpowerModifier: number;
}

export interface Character {
  id?: string;
  name: string;
  player: string;
  chronicle: string;
  concept: string;
  virtue: string;
  vice: string;
  splat: Splat;
  attributes: Attributes;
  skills: Skills;
  specialties: SkillSpecialty[];
  merits: Merit[];
  professionalTrainingSkills: string[];
  customPowers: CustomPower[];
  derivedStats: DerivedStats;
  splatData: Record<string, unknown>;
  experienceTotal: number;
  experienceSpent: number;
  beatsTotal: number;
  notes: string;
  portraitUri: string | null;
  createdAt?: number;
  updatedAt?: number;
}

export interface LibraryMerit {
  id: string;
  name: string;
  category: string;
  allowedDots: number[];
  description: string;
  prerequisites: string;
}

export interface PowerDotLevel {
  dots: number;
  power: string;
  effect: string;
}

export interface LibraryPower {
  id: string;
  name: string;
  type: 'discipline' | 'devotion' | string;
  description: string;
  dotLevels: PowerDotLevel[];
}

export type DiceRule = 'AGAIN_10' | 'AGAIN_9' | 'AGAIN_8' | 'NONE';

export interface DiceRollRequest {
  poolSize: number;
  rule: DiceRule;
  roteQuality: boolean;
  chanceDie: boolean;
}

export interface DiceRollResponse {
  dice: number[];
  successes: number;
  exceptional: boolean;
  dramaticFailure: boolean;
  label: string;
}
