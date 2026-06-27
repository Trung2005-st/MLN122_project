export const PLAYER_ID_KEY = "tda_player_id";
export const PLAYER_NAME_KEY = "tda_player_name";

export function getStoredPlayerId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PLAYER_ID_KEY);
}

export function storePlayerSession(playerId: string, name?: string) {
  localStorage.setItem(PLAYER_ID_KEY, playerId);
  if (name) localStorage.setItem(PLAYER_NAME_KEY, name);
}

export function getStoredPlayerName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PLAYER_NAME_KEY);
}
