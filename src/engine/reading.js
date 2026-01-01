function isEvent(x) {
  return x && typeof x === "object" && ("v" in x);
}

function extractValues(list) {
  return (list || []).map((x) => (isEvent(x) ? String(x.v || "") : String(x || ""))).filter(Boolean);
}

function filterByRealm(list, realmKey) {
  if (!realmKey || realmKey === "all") return list || [];
  return (list || []).filter((x) => (isEvent(x) ? x.realm === realmKey : true));
}

function topCounts(list) {
  const map = {};
  for (const item of list || []) {
    const k = String(item).trim().toLowerCase();
    if (!k) continue;
    map[k] = (map[k] || 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

const REALM_NAME = {
  threshold: "Realm I: The Threshold",
  lantern: "Realm II: The Lantern Room",
  mirror: "Realm III: The Mirror Hall",
  veil: "Realm IV: The Veil Market",
};

const NEXT_REALM = {
  threshold: "lantern",
  lantern: "mirror",
  mirror: "veil",
  veil: null,
};

const vibeLine = {
  playful: "Playful, dangerous-in-a-good-way energy. You don’t want boring.",
  intuitive: "You read what’s underneath. You notice patterns most people miss.",
  symbolic: "You speak in symbols and meaning. Surface-level doesn’t satisfy you.",
  grounded: "You want it real. Calm. Clean. No performative nonsense.",
  sensual: "Chemistry matters. You can feel intent before a word is spoken.",
  guarded: "You protect your peace. Not cold—selective.",
  adventurous: "You need air. Movement. Yeses that feel alive.",
  devotion: "You want something that holds. Something built, not just felt.",
  mysterious: "You like layers. Slow reveals. The good kind of intrigue.",
  funny: "You use humor as a signal: ‘Are you safe? Are you sharp?’",
};

const edgeLine = {
  truth: "Truth is your religion. Anything fake gets rejected fast.",
  escape: "Freedom is oxygen. If it feels like a cage, you’re gone.",
  power: "You respect confidence and backbone. Weak energy annoys you.",
  loyalty: "You notice consistency. Loyalty isn’t a word—it’s behavior.",
  silence: "You retreat to protect your peace. You recharge in quiet.",
  rage: "You have a hard boundary line. Disrespect flips a switch.",
  mercy: "You’re softer than you act. You care, even when you hide it.",
  ambition: "You’re not here to drift. You’re here to evolve.",
};

function pickBestNote(answers) {
  const notes = (answers || [])
    .map((a) => String(a?.note || "").trim())
    .filter((t) => t.length > 0);

  // pick the most recent meaningful note
  return notes.length ? notes[notes.length - 1] : null;
}

export function buildReading({
  realmKey = "threshold",
  realmFilter = "all",
  signalEvents = [],
  memoryEvents = [],
  spread = [],
  answersByPrompt = {},
}) {
  const filteredAnswers = Object.values(answersByPrompt || {}).filter((a) =>
    realmFilter === "all" ? true : a?.realm === realmFilter
  );

  const sigValues = extractValues(extractValues(filterByRealm(signalEvents, realmFilter)).length
    ? extractValues(filterByRealm(signalEvents, realmFilter))
    : extractValues(signalEvents));

  const memValues = extractValues(extractValues(filterByRealm(memoryEvents, realmFilter)).length
    ? extractValues(filterByRealm(memoryEvents, realmFilter))
    : extractValues(memoryEvents));

  const vibeTop = topCounts(sigValues).slice(0, 3).map(([k]) => k);
  const edgeTop = topCounts(memValues).slice(0, 2).map(([k]) => k);

  const vibe = vibeTop.length ? vibeTop : ["playful", "symbolic", "intuitive"];
  const edge = edgeTop.length ? edgeTop : ["truth"];

  const bestNote = pickBestNote(filteredAnswers);

  const cards = (spread || []).slice(0, 5).map((c) => ({
    name: c.name,
    orientation: c.orientation,
    keywords: c.keywords,
  }));

  const cardLine = cards.length
    ? cards.map((c) => `${c.name} (${c.orientation})`).join(" • ")
    : "No spread captured.";

  const title = `Reading — ${REALM_NAME[realmKey] || "Seer’s Trial"}`;

  const gateVoice =
    `${vibeLine[vibe[0]] || "You have a signature energy."} ` +
    `${edgeLine[edge[0]] || "And you don’t tolerate nonsense."}`;

  const highlights = [
    vibeLine[vibe[0]] || `Primary: ${vibe[0]}`,
    vibeLine[vibe[1]] || `Secondary: ${vibe[1]}`,
    edgeLine[edge[0]] || `Edge: ${edge[0]}`,
  ];

  const nextRealm = NEXT_REALM[realmKey] || null;
  const inviteNextRealm = nextRealm
    ? `If you want to keep going: the Gate just unlocked **${REALM_NAME[nextRealm]}**. Want the next trial?`
    : `The Gate has no further Realms to open… yet.`;

  const nextQuestion = {
    threshold: "What kind of trouble do you actually enjoy: witty, magnetic, mysterious, or safe?",
    lantern: "What’s your biggest green flag you rarely say out loud?",
    mirror: "What truth about you do people learn too late?",
    veil: "What do you want your life to feel like a year from now?",
  }[realmKey] || "What’s something you wish someone would ask you—but nobody does?";

  const textToSend = bestNote
    ? `Seer’s Trial verdict: you give off ${vibe.join(", ")} energy. And that line you wrote—"${bestNote}"—stuck with me. ${inviteNextRealm} (Also… ${nextQuestion})`
    : `Seer’s Trial verdict: you give off ${vibe.join(", ")} energy. ${inviteNextRealm} (Also… ${nextQuestion})`;

  return {
    title,
    realmKey,
    realmFilter,
    gateVoice,
    highlights,
    edge,
    vibe,
    cards,
    cardLine,
    nextQuestion,
    inviteNextRealm,
    textToSend,
    answers: filteredAnswers,
  };
}

export function readingToText(reading) {
  const r = reading;
  const lines = [];
  lines.push(r.title);
  lines.push("");
  lines.push(`Gate Voice: ${r.gateVoice}`);
  lines.push("");
  lines.push("Highlights:");
  (r.highlights || []).forEach((h) => lines.push(`• ${h}`));
  lines.push("");
  lines.push(`Spread: ${r.cardLine}`);
  lines.push("");
  lines.push(`Next question: ${r.nextQuestion}`);
  lines.push("");
  lines.push("Text to send:");
  lines.push(r.textToSend);
  lines.push("");
  lines.push("Her answers:");
  if (!r.answers || r.answers.length === 0) {
    lines.push("• (No typed answers captured.)");
  } else {
    r.answers.forEach((a) => {
      const title = a?.title || "Question";
      const choice = a?.choice ? ` (picked: ${a.choice})` : "";
      const note = a?.note ? ` — ${a.note}` : "";
      lines.push(`• ${title}${choice}${note}`);
    });
  }
  return lines.join("\n");
}

