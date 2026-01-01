const KEY = "seers_trial_history_v2";
const MAX_RUNS = 50;

export function loadHistory() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRun(run) {
  const history = loadHistory();
  const next = [run, ...history].slice(0, MAX_RUNS);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}
