const KEY = "seers_trial_unlocks_v2";

export function loadUnlocks() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { cards: {} };
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : { cards: {} };
  } catch {
    return { cards: {} };
  }
}

export function unlockCard(cardId) {
  const state = loadUnlocks();
  state.cards = state.cards || {};
  if (!state.cards[cardId]) {
    state.cards[cardId] = {
      unlockedAt: new Date().toISOString(),
      timesSeen: 1
    };
  } else {
    state.cards[cardId].timesSeen = (state.cards[cardId].timesSeen || 0) + 1;
  }
  localStorage.setItem(KEY, JSON.stringify(state));
  return state;
}

export function clearUnlocks() {
  localStorage.removeItem(KEY);
}
