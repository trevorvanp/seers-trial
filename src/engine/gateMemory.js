const KEY = "seers_trial_gate_memory_v2";

const GM_KEYS = ["truth", "escape", "power", "loyalty", "silence", "rage", "mercy", "ambition"];

function defaultState() {
  const counts = {};
  const lastSeen = {};
  GM_KEYS.forEach((k) => {
    counts[k] = 0;
    lastSeen[k] = null;
  });

  return {
    trials: 0,
    counts,
    lastSeen
  };
}

export function loadGateMemory() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw);
    const base = defaultState();

    // Merge safely
    base.trials = Number(parsed?.trials || 0);

    if (parsed?.counts && typeof parsed.counts === "object") {
      GM_KEYS.forEach((k) => {
        base.counts[k] = Number(parsed.counts[k] || 0);
      });
    }

    if (parsed?.lastSeen && typeof parsed.lastSeen === "object") {
      GM_KEYS.forEach((k) => {
        base.lastSeen[k] = parsed.lastSeen[k] || null;
      });
    }

    return base;
  } catch {
    return defaultState();
  }
}

export function recordCompletedTrial(memories) {
  const state = loadGateMemory();
  state.trials += 1;

  const now = new Date().toISOString();
  const memList = Array.isArray(memories) ? memories : [];

  memList.forEach((m) => {
    const key = String(m).trim().toLowerCase();
    if (!state.counts.hasOwnProperty(key)) return;

    state.counts[key] += 1;
    state.lastSeen[key] = now;
  });

  localStorage.setItem(KEY, JSON.stringify(state));
  return state;
}

export function resetGateMemory() {
  localStorage.removeItem(KEY);
}
