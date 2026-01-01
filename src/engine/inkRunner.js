import { Story } from "inkjs";

export async function loadStory() {
  const res = await fetch(`${import.meta.env.BASE_URL}story.json`);
  if (!res.ok) {
    throw new Error(`Failed to load story.json (HTTP ${res.status})`);
  }
  const json = await res.json();
  return new Story(json);
}

export function getStats(story) {
  const vs = story.variablesState;
  return {
    favor: Number(vs.$("favor") ?? 0),
    focus: Number(vs.$("focus") ?? 0),
    scars: Number(vs.$("scars") ?? 0),
    runes: Number(vs.$("runes") ?? 0),
    spreadSeed: Number(vs.$("spread_seed") ?? 0),
  };
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

export function continueUntilChoiceOrEnd(story) {
  const lines = [];
  let tagsSeen = [];

  // Capture any tags already present at the current point
  tagsSeen = uniq([...tagsSeen, ...(story.currentTags ?? [])]);

  while (story.canContinue) {
    const text = story.Continue().trim();

    const currentTags = story.currentTags ?? [];
    if (currentTags.length) {
      tagsSeen = uniq([...tagsSeen, ...currentTags]);
    }

    if (text.length > 0) {
      lines.push(text);
    }

    // Stop once choices appear (nice beat for UI)
    if (story.currentChoices && story.currentChoices.length > 0) break;
  }

  const choices = (story.currentChoices || []).map((c) => ({
    index: c.index,
    text: c.text,
  }));

  return { lines, tags: tagsSeen, choices };
}
