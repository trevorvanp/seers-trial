const KEY = "seers_trial_save_v2";

export function saveGame(payload) {
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function loadGame() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(KEY);
}
