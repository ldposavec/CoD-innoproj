import type { Character, DiceRollRequest, DiceRollResponse, LibraryMerit, LibraryPower } from './types';

const API = 'http://localhost:8080/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // noop
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  listCharacters(search = '', sort = 'created') {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    return request<Character[]>(`/characters?${params.toString()}`);
  },
  getCharacter(id: string) {
    return request<Character>(`/characters/${id}`);
  },
  createCharacter(character: Character) {
    return request<Character>('/characters', { method: 'POST', body: JSON.stringify(character) });
  },
  updateCharacter(id: string, character: Character) {
    return request<Character>(`/characters/${id}`, { method: 'PUT', body: JSON.stringify(character) });
  },
  deleteCharacter(id: string) {
    return request<void>(`/characters/${id}`, { method: 'DELETE' });
  },
  merits() {
    return request<LibraryMerit[]>('/libraries/merits');
  },
  vampirePowers() {
    return request<LibraryPower[]>('/libraries/vampire-powers');
  },
  rollDice(payload: DiceRollRequest) {
    return request<DiceRollResponse>('/dice/roll', { method: 'POST', body: JSON.stringify(payload) });
  }
};
