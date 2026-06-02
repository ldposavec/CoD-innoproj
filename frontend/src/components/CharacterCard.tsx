import { SPLAT_LABELS, SPLAT_SUBTITLES } from '../constants';
import type { Character } from '../types';

interface CharacterCardProps {
  readonly character: Character;
  readonly onOpen: () => void;
}

export function CharacterCard({ character, onOpen }: CharacterCardProps) {
  return (
    <button type="button" className="character-card" data-splat={character.splat} onClick={onOpen}>
      <div className="character-card-row">
        <div className="character-card-portrait" aria-hidden="true">
          {character.portraitUri ? (
            <img src={character.portraitUri} alt={`Portrait of ${character.name}`} className="character-card-image" />
          ) : (
            <span className="character-card-fallback">U</span>
          )}
        </div>

        <div className="character-card-info">
          <h3>{character.name}</h3>
          <div className="character-card-meta">
            <span className="character-card-tag">{SPLAT_LABELS[character.splat]}</span>
            <span>{SPLAT_SUBTITLES[character.splat]}</span>
          </div>
          {character.chronicle && <p>{character.chronicle}</p>}
          <small>{new Date(character.createdAt).toLocaleDateString()}</small>
        </div>
      </div>

      <div className="character-card-accent" />
    </button>
  );
}


