import type { Character, DiceRollResult, LibraryMerit } from './types';

const API_BASE = 'http://localhost:8080/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  listCharacters: () => request<Character[]>('/characters'),
  createCharacter: (character: Character) =>
    request<Character>('/characters', {
      method: 'POST',
      body: JSON.stringify(character)
    }),
  updateCharacter: (id: string, character: Character) =>
    request<Character>(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(character)
    }),
  deleteCharacter: (id: string) =>
    request<void>(`/characters/${id}`, {
      method: 'DELETE'
    }),
  rollDice: (input: { poolSize: number; rule: string; roteQuality: boolean; chanceDie: boolean }) =>
    request<DiceRollResult>('/dice/roll', {
      method: 'POST',
      body: JSON.stringify(input)
    }),
  listMerits: () => request<LibraryMerit[]>('/libraries/merits')
};
