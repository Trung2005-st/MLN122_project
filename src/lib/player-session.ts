import type { CharacterClass } from "./types";

export const PLAYER_ID_KEY = "tda_player_id";
export const PLAYER_NAME_KEY = "tda_player_name";
export const PLAYER_CLASS_KEY = "tda_character_class";

export function getStoredPlayerId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PLAYER_ID_KEY);
}

export function storePlayerSession(
  playerId: string,
  name?: string,
  characterClass?: CharacterClass
) {
  localStorage.setItem(PLAYER_ID_KEY, playerId);
  if (name) localStorage.setItem(PLAYER_NAME_KEY, name);
  if (characterClass) localStorage.setItem(PLAYER_CLASS_KEY, characterClass);
}

export function getStoredPlayerName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PLAYER_NAME_KEY);
}

export function getStoredCharacterClass(): CharacterClass | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PLAYER_CLASS_KEY) as CharacterClass | null;
}
