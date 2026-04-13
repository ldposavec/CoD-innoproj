import type { Character, DiceRollResult, LibraryMerit } from './types';

const API_BASE = 'http://localhost:8080/api';
let authToken: string | null = null;

function jsonHeaders(extra?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...extra
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: jsonHeaders(init?.headers)
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch {
      // Intentionally ignore invalid/non-json error bodies.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function setAuthToken(token: string | null) {
  authToken = token;
}

export const api = {
  login: (payload: { username: string; password: string }) =>
    request<{ token?: string; username?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  register: (payload: { username: string; password: string }) =>
    request<{ token?: string; username?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
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
  listMerits: () => request<LibraryMerit[]>('/libraries/merits'),
  listSkills: () =>
    request<{ physical: string[]; social: string[]; mental: string[] }>('/libraries/skills'),
  listSplatOptions: () =>
    request<{
      vampireClans: string[];
      vampireCovenants: string[];
      beastFamilies: string[];
      beastHungers: string[];
    }>('/libraries/splat-options')
};
