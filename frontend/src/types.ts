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

export interface SkillSpecialty {
  skill: string;
  specialty: string;
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
  id: string;
  name: string;
  player: string;
  chronicle: string;
  concept: string;
  virtue: string;
  vice: string;
  splat: Splat;
  attributes: Record<string, number>;
  skills: Record<string, number>;
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
  createdAt: number;
  updatedAt: number;
}

export interface DiceRollResult {
  dice: number[];
  successes: number;
  exceptional: boolean;
  dramaticFailure: boolean;
}

export interface LibraryMerit {
  id: string;
  name: string;
  category: string;
  allowedDots: number[];
  description: string;
  prerequisites: string;
}
