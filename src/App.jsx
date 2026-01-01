// src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import tarotDeck from "./data/tarot.json";
import { clearSave, loadGame, saveGame } from "./engine/save";
import { addRun, loadHistory, clearHistory } from "./engine/history";
import { loadUnlocks, unlockCard, clearUnlocks } from "./engine/unlocks";
import { continueUntilChoiceOrEnd, getStats, loadStory } from "./engine/inkRunner";
import { drawCards } from "./engine/tarot";
import { buildReading, readingToText } from "./engine/reading";
import { CLOUD_ENABLED, fetchSession, makeSessionCode, upsertSession } from "./engine/cloud";

function isEvent(x) {
  return x && typeof x === "object" && ("v" in x);
}

function extractValues(list) {
  return (list || [])
    .map((x) => (isEvent(x) ? String(x.v || "") : String(x || "")))
    .filter(Boolean);
}

function parseFirstTag(tags, prefix) {
  const found = (tags || []).find((t) => String(t).startsWith(prefix));
  return found ? String(found).slice(prefix.length) : null;
}

function parseAllTags(tags, prefix) {
  return (tags || []).map(String).filter((t) => t.startsWith(prefix)).map((t) => t.slice(prefix.length));
}

function safeUUID() {
  try { return crypto.randomUUID(); }
  catch { return `run_${Date.now()}_${Math.random().toString(16).slice(2)}`; }
}

function baseUrlWithParams(paramsObj) {
  const url = new URL(window.location.href);
  Object.entries(paramsObj).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "") url.searchParams.delete(k);
    else url.searchParams.set(k, String(v));
  });
  return url.toString();
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadJson(filename, obj) {
  downloadText(filename, JSON.stringify(obj, null, 2));
}

const REALM_LABEL = {
  "—": "The Gate",
  threshold: "Realm I — The Threshold",
  lantern: "Realm II — The Lantern Room",
  mirror: "Realm III — The Mirror Hall",
  veil: "Realm IV — The Veil Market",
  traveler: "Realm I — Traveler",
  hearth: "Realm II — The Hearth",
  wild: "Realm IV — The Wild",
  crown: "Realm V — The Crown",
};

function vibeHintFromSignals(signalEvents) {
  const vals = extractValues(signalEvents).map((s) => s.toLowerCase());
  const counts = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!top) return "The Gate watches quietly.";
  const map = {
    playful: "The Gate senses play in you.",
    intuitive: "The Gate notices how you read between lines.",
    symbolic: "The Gate likes your taste for symbols.",
    grounded: "The Gate respects your need for what’s real.",
    sensual: "The Gate feels heat in the air.",
    guarded: "The Gate notices your boundaries.",
    adventurous: "The Gate likes movement and risk.",
    devotion: "The Gate values loyalty.",
    mysterious: "The Gate enjoys slow reveals.",
    funny: "The Gate approves of sharp humor.",
  };
  return map[top] || "The Gate watches quietly.";
}

export default function App() {
  const [story, setStory] = useState(null);

  const [log, setLog] = useState([]);
  const logRef = useRef([]);

  const [choices, setChoices] = useState([]);
  const [stats, setStats] = useState({ favor: 0, focus: 0, scars: 0, runes: 0, spreadSeed: 0 });

  const [gateMood, setGateMood] = useState("curious");
  const [scene, setScene] = useState("realm_select");
  const [realmKey, setRealmKey] = useState("—");

  const [spread, setSpread] = useState([]);
  const spreadRef = useRef([]);

  const [signalEvents, setSignalEvents] = useState([]);
  const signalRef = useRef([]);

  const [memoryEvents, setMemoryEvents] = useState([]);
  const memoryRef = useRef([]);

  const [answersByPrompt, setAnswersByPrompt] = useState({});
  const answersRef = useRef({});

  const [realmReports, setRealmReports] = useState({});
  const realmReportsRef = useRef({});

  const [history, setHistory] = useState([]);
  const [unlocks, setUnlocks] = useState({ cards: {} });

  // Tabs:
  // - Player: trial, codex
  // - Observer: results only
  const [activeTab, setActiveTab] = useState("trial");

  // NEW: realm-ending reading shown after draw:3
  const [realmEndReading, setRealmEndReading] = useState(null);

  // prompt tracking
  const [promptId, setPromptId] = useState(null);
  const [promptTitle, setPromptTitle] = useState(null);

  // Session / mode
  const [sessionCode, setSessionCode] = useState(null);
  const [mode, setMode] = useState("player"); // player | observer
  const [admin, setAdmin] = useState(false);  // Trevor-only testing convenience

  // Cloud state
  const [cloudStatus, setCloudStatus] = useState("idle");
  const [cloudError, setCloudError] = useState(null);
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState(null);
  const cloudBusyRef = useRef(false);

  // Observer refresh
  const [liveWatch, setLiveWatch] = useState(false);

  // Whisper modal (in-world typed answer)
  const [whisperOpen, setWhisperOpen] = useState(false);
  const [whisperDraft, setWhisperDraft] = useState("");
  const [pendingChoice, setPendingChoice] = useState(null);

  // Echoes modal (full transcript) — admin only
  const [echoesOpen, setEchoesOpen] = useState(false);

  const [copied, setCopied] = useState(false);

  const runRef = useRef({
    id: safeUUID(),
    startedAt: new Date().toISOString(),
    startStats: { favor: 0, focus: 2, scars: 0, runes: 0 },
    seed: 0,
    cards: [],
    finalized: false,
  });

  function setLogSafe(updater) {
    setLog((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      logRef.current = next;
      return next;
    });
  }

  function setSpreadSafe(nextSpread) {
    spreadRef.current = nextSpread;
    setSpread(nextSpread);
  }

  function setSignalSafe(updater) {
    setSignalEvents((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      signalRef.current = next;
      return next;
    });
  }

  function setMemorySafe(updater) {
    setMemoryEvents((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      memoryRef.current = next;
      return next;
    });
  }

  function setAnswersSafe(updater) {
    setAnswersByPrompt((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      answersRef.current = next;
      return next;
    });
  }

  function setRealmReportsSafe(updater) {
    setRealmReports((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      realmReportsRef.current = next;
      return next;
    });
  }

  function buildPayload(s) {
    return {
      inkState: s.state.toJson(),
      savedAt: new Date().toISOString(),
      ui: {
        gateMood,
        scene,
        realmKey,
        spread: spreadRef.current,
        realmEndReading, // NEW (persist realm-ending meaning)
        signalEvents: signalRef.current,
        memoryEvents: memoryRef.current,
        answersByPrompt: answersRef.current,
        realmReports: realmReportsRef.current,
        log: logRef.current,
        promptId,
        promptTitle,
      },
    };
  }

  function autosaveLocal(s) {
    try {
      const payload = buildPayload(s);
      saveGame(payload);
      return payload;
    } catch (e) {
      console.error("Local autosave failed:", e);
      return null;
    }
  }

  async function autosaveCloud(payload) {
    if (!payload) return;
    if (!CLOUD_ENABLED) return;
    if (!sessionCode) return;

    if (cloudBusyRef.current) return;
    cloudBusyRef.current = true;

    setCloudStatus("syncing");
    setCloudError(null);
    try {
      await upsertSession(sessionCode, payload);
      setCloudStatus("synced");
      setCloudUpdatedAt(new Date().toISOString());
    } catch (e) {
      setCloudStatus("error");
      setCloudError(e?.message || String(e));
    } finally {
      cloudBusyRef.current = false;
    }
  }

  function pushLines(lines) {
    if (!lines || lines.length === 0) return;
    setLogSafe((prev) => [...prev, ...lines]);
  }

  function captureRealmReportIfReady() {
    if (scene !== "end") return;
    if (!realmKey || realmKey === "—") return;

    const existing = realmReportsRef.current[realmKey];
    if (existing && existing.capturedAt) return;

    const report = buildReading({
      realmKey,
      realmFilter: realmKey,
      signalEvents: signalRef.current,
      memoryEvents: memoryRef.current,
      spread: spreadRef.current,
      answersByPrompt: answersRef.current,
    });

    setRealmReportsSafe((prev) => ({
      ...prev,
      [realmKey]: {
        capturedAt: new Date().toISOString(),
        realmKey,
        report,
      },
    }));
  }

  function applyTags(tags, s) {
    const nextMood = parseFirstTag(tags, "gate:");
    const nextScene = parseFirstTag(tags, "scene:");
    const nextRealm = parseFirstTag(tags, "realm:");
    const nextPromptId = parseFirstTag(tags, "prompt:");
    const nextPromptTitle = parseFirstTag(tags, "q:");
    const drawCountRaw = parseFirstTag(tags, "draw:");

    const effectiveRealm = nextRealm || realmKey;

    // If we just stepped into a NEW realm, clear old spread + realm-ending reading
    if (nextRealm && nextRealm !== realmKey) {
      setSpreadSafe([]);
      setRealmEndReading(null);
    }

    // Memories
    const memOps = parseAllTags(tags, "mem:");
    if (memOps.length > 0) {
      const additions = memOps
        .filter((m) => m.startsWith("+"))
        .map((m) => m.slice(1).trim())
        .filter(Boolean);

      if (additions.length > 0) {
        const now = new Date().toISOString();
        setMemorySafe((prev) => [
          ...prev,
          ...additions.map((v) => ({ v, realm: effectiveRealm, at: now })),
        ]);
      }
    }

    // Signals
    const sigOps = parseAllTags(tags, "sig:");
    if (sigOps.length > 0) {
      const additions = sigOps
        .filter((m) => m.startsWith("+"))
        .map((m) => m.slice(1).trim())
        .filter(Boolean);

      if (additions.length > 0) {
        const now = new Date().toISOString();
        setSignalSafe((prev) => [
          ...prev,
          ...additions.map((v) => ({ v, realm: effectiveRealm, at: now })),
        ]);
      }
    }

    if (nextMood) setGateMood(nextMood);
    if (nextScene) setScene(nextScene);
    if (nextRealm) setRealmKey(nextRealm);
    if (nextPromptId) setPromptId(nextPromptId);
    if (nextPromptTitle) setPromptTitle(nextPromptTitle);

    // Draw cards (and immediately create a realm-ending reading)
    if (drawCountRaw) {
      const count = Number(drawCountRaw) || 3;
      const seed = getStats(s).spreadSeed || 12345;
      const cards = drawCards({ seed, deck: tarotDeck, count });

      setSpreadSafe(cards);

      // NEW: Build a realm-closing reading from cards + captured answers
      try {
        const r = buildReading({
          realmKey: effectiveRealm,
          realmFilter: effectiveRealm,
          signalEvents: signalRef.current,
          memoryEvents: memoryRef.current,
          spread: cards,
          answersByPrompt: answersRef.current,
        });

        setRealmEndReading({
          realm: effectiveRealm,
          at: new Date().toISOString(),
          reading: r,
        });
      } catch (e) {
        console.warn("Realm reading build failed:", e);
      }

      let latestUnlocks = loadUnlocks();
      cards.forEach((c) => { latestUnlocks = unlockCard(c.id); });
      setUnlocks(latestUnlocks);

      runRef.current.seed = seed;
      runRef.current.cards = cards;
    }

    return { nextScene: nextScene || scene };
  }

  function recordAnswerForPrompt(pickedChoiceText, noteOverride = "") {
    if (!promptId) return;

    const trimmed = String(noteOverride || "").trim();
    const entry = {
      realm: realmKey,
      title: promptTitle || promptId,
      choice: pickedChoiceText || "",
      note: trimmed || "",
      at: new Date().toISOString(),
    };

    setAnswersSafe((prev) => ({ ...prev, [promptId]: entry }));

    if (trimmed) setLogSafe((prev) => [...prev, `(${entry.title}) — ${trimmed}`]);
  }

  function commitChoice(choiceIndex, pickedText, noteText) {
    if (!story) return;

    recordAnswerForPrompt(pickedText, noteText);

    story.ChooseChoiceIndex(choiceIndex);

    const packet = continueUntilChoiceOrEnd(story);
    pushLines(packet.lines);
    applyTags(packet.tags, story);
    setChoices(packet.choices);

    const st = getStats(story);
    setStats(st);

    captureRealmReportIfReady();

    const payload = autosaveLocal(story);
    void autosaveCloud(payload);
  }

  function onChoiceClick(choiceIndex) {
    if (!story) return;
    const pickedText = choices.find((c) => c.index === choiceIndex)?.text || "";

    // If we're on a prompt, we open the Whisper modal (in-world), not a "backend" textarea.
    const shouldWhisper =
      mode === "player" &&
      !!promptId &&
      new URLSearchParams(window.location.search).get("whisper") !== "0";

    if (shouldWhisper) {
      setPendingChoice({ index: choiceIndex, text: pickedText });
      setWhisperDraft("");
      setWhisperOpen(true);
      return;
    }

    commitChoice(choiceIndex, pickedText, "");
  }

  function closeWhisperAndCommit(noteText) {
    if (!pendingChoice) {
      setWhisperOpen(false);
      return;
    }
    const { index, text } = pendingChoice;
    setWhisperOpen(false);
    setPendingChoice(null);
    commitChoice(index, text, noteText || "");
  }

  async function boot({ preferCloud = true } = {}) {
    const s = await loadStory();

    setHistory(loadHistory());
    setUnlocks(loadUnlocks());

    runRef.current = {
      id: safeUUID(),
      startedAt: new Date().toISOString(),
      startStats: { favor: 0, focus: 2, scars: 0, runes: 0 },
      seed: 0,
      cards: [],
      finalized: false,
    };

    setGateMood("curious");
    setScene("realm_select");
    setRealmKey("—");
    setSpreadSafe([]);
    setRealmEndReading(null); // NEW
    setSignalSafe([]);
    setMemorySafe([]);
    setAnswersSafe({});
    setRealmReportsSafe({});
    setLogSafe([]);
    setPromptId(null);
    setPromptTitle(null);
    setWhisperOpen(false);
    setWhisperDraft("");
    setPendingChoice(null);
    setEchoesOpen(false);

    // Tabs by mode
    if (mode === "observer") setActiveTab("results");
    else setActiveTab("trial");

    // Cloud load
    if (preferCloud && CLOUD_ENABLED && sessionCode) {
      try {
        const remote = await fetchSession(sessionCode);

        if (remote?.payload?.inkState) {
          try { s.state.LoadJson(remote.payload.inkState); }
          catch (e) { console.warn("Cloud state load failed; continuing fresh.", e); }

          const ui = remote.payload.ui || {};
          setGateMood(ui.gateMood || "curious");
          setScene(ui.scene || "realm_select");
          setRealmKey(ui.realmKey || "—");
          setSpreadSafe(Array.isArray(ui.spread) ? ui.spread : []);
          setRealmEndReading(ui.realmEndReading || null); // NEW
          setSignalSafe(Array.isArray(ui.signalEvents) ? ui.signalEvents : []);
          setMemorySafe(Array.isArray(ui.memoryEvents) ? ui.memoryEvents : []);
          setAnswersSafe(ui.answersByPrompt && typeof ui.answersByPrompt === "object" ? ui.answersByPrompt : {});
          setRealmReportsSafe(ui.realmReports && typeof ui.realmReports === "object" ? ui.realmReports : {});
          setLogSafe(Array.isArray(ui.log) ? ui.log : []);
          setPromptId(ui.promptId || null);
          setPromptTitle(ui.promptTitle || null);
          setCloudUpdatedAt(remote.updated_at || null);
        } else {
          await upsertSession(sessionCode, { inkState: null, ui: {} });
        }
      } catch (e) {
        setCloudStatus("error");
        setCloudError(e?.message || String(e));
      }
    } else {
      const saved = loadGame();
      if (saved?.inkState) {
        try { s.state.LoadJson(saved.inkState); }
        catch (e) { console.warn("Local save load failed; starting fresh.", e); }
      }
      if (saved?.ui) {
        const ui = saved.ui;
        setGateMood(ui.gateMood || "curious");
        setScene(ui.scene || "realm_select");
        setRealmKey(ui.realmKey || "—");
        setSpreadSafe(Array.isArray(ui.spread) ? ui.spread : []);
        setRealmEndReading(ui.realmEndReading || null); // NEW
        setSignalSafe(Array.isArray(ui.signalEvents) ? ui.signalEvents : []);
        setMemorySafe(Array.isArray(ui.memoryEvents) ? ui.memoryEvents : []);
        setAnswersSafe(ui.answersByPrompt && typeof ui.answersByPrompt === "object" ? ui.answersByPrompt : {});
        setRealmReportsSafe(ui.realmReports && typeof ui.realmReports === "object" ? ui.realmReports : {});
        setLogSafe(Array.isArray(ui.log) ? ui.log : []);
        setPromptId(ui.promptId || null);
        setPromptTitle(ui.promptTitle || null);
      }
    }

    setStory(s);

    const packet = continueUntilChoiceOrEnd(s);
    pushLines(packet.lines);
    applyTags(packet.tags, s);
    setChoices(packet.choices);

    const st = getStats(s);
    setStats(st);
    runRef.current.startStats = { favor: st.favor, focus: st.focus, scars: st.scars, runes: st.runes };

    const payload = autosaveLocal(s);
    void autosaveCloud(payload);

    captureRealmReportIfReady();
  }

  // Read URL params: code + mode + admin
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const m = params.get("mode");
    const a = params.get("admin");

    if (m === "observer") {
      setMode("observer");
      setActiveTab("results");
      setLiveWatch(true);
    } else {
      setMode("player");
      setLiveWatch(false);
    }

    // Admin is only for YOU. Never send her an admin link.
    setAdmin(a === "1");

    if (code) setSessionCode(code.trim().toUpperCase());
  }, []);

  useEffect(() => {
    void boot({ preferCloud: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCode, mode]);

  // Observer Live Watch: refresh every 5s
  useEffect(() => {
    if (!CLOUD_ENABLED || !sessionCode) return;
    if (mode !== "observer") return;
    if (!liveWatch) return;
    if (activeTab !== "results") return;

    const id = setInterval(() => {
      void refreshFromCloud();
    }, 5000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CLOUD_ENABLED, sessionCode, mode, liveWatch, activeTab]);

  async function newTrial() {
    clearSave();
    await boot({ preferCloud: true });
  }

  function resetAll() {
    clearSave();
    clearHistory();
    clearUnlocks();
    setHistory([]);
    setUnlocks({ cards: {} });
    boot({ preferCloud: true });
  }

  async function createShareSession() {
    if (!CLOUD_ENABLED) {
      alert("Cloud not configured yet. Add your .env keys first.");
      return;
    }
    const code = makeSessionCode();
    setSessionCode(code);

    // Keep admin param if you’re using it locally
    const playerUrl = baseUrlWithParams({ code, mode: null, admin: admin ? "1" : null });
    window.history.replaceState({}, "", playerUrl);

    setCloudStatus("syncing");
    setCloudError(null);

    try {
      await upsertSession(code, { inkState: null, ui: {} });
      setCloudStatus("synced");
      setCloudUpdatedAt(new Date().toISOString());
      await navigator.clipboard.writeText(playerUrl);
      alert("Player link copied to clipboard.");
    } catch (e) {
      setCloudStatus("error");
      setCloudError(e?.message || String(e));
      alert("Failed to create session. Check Supabase keys + table.");
    }
  }

  async function copyPlayerLink() {
    if (!sessionCode) return;
    const url = baseUrlWithParams({ code: sessionCode, mode: null, admin: null }); // NEVER include admin for her
    try { await navigator.clipboard.writeText(url); }
    catch { window.prompt("Copy this:", url); return; }
    alert("Player link copied.");
  }

  async function copyObserverLink() {
    if (!sessionCode) return;
    const url = baseUrlWithParams({ code: sessionCode, mode: "observer", admin: null });
    try { await navigator.clipboard.writeText(url); }
    catch { window.prompt("Copy this:", url); return; }
    alert("Observer link copied.");
  }

  async function refreshFromCloud() {
    if (!CLOUD_ENABLED || !sessionCode) return;

    setCloudStatus("syncing");
    setCloudError(null);

    try {
      const remote = await fetchSession(sessionCode);
      if (!remote?.payload) {
        setCloudStatus("error");
        setCloudError("No session found for this code.");
        return;
      }

      const ui = remote.payload.ui || {};
      setGateMood(ui.gateMood || gateMood);
      setScene(ui.scene || scene);
      setRealmKey(ui.realmKey || realmKey);
      setSpreadSafe(Array.isArray(ui.spread) ? ui.spread : spreadRef.current);
      setRealmEndReading(ui.realmEndReading || realmEndReading); // NEW
      setSignalSafe(Array.isArray(ui.signalEvents) ? ui.signalEvents : signalRef.current);
      setMemorySafe(Array.isArray(ui.memoryEvents) ? ui.memoryEvents : memoryRef.current);
      setAnswersSafe(ui.answersByPrompt && typeof ui.answersByPrompt === "object" ? ui.answersByPrompt : answersRef.current);
      setRealmReportsSafe(ui.realmReports && typeof ui.realmReports === "object" ? ui.realmReports : realmReportsRef.current);
      setLogSafe(Array.isArray(ui.log) ? ui.log : logRef.current);

      setCloudUpdatedAt(remote.updated_at || null);
      setCloudStatus("synced");
    } catch (e) {
      setCloudStatus("error");
      setCloudError(e?.message || String(e));
    }
  }

  const moodTag = `Gate: ${gateMood}`;
  const realmLabel = REALM_LABEL[realmKey] || "The Gate";
  const realmHint = vibeHintFromSignals(signalEvents);

  const recentLines = useMemo(() => {
    if (!log || log.length === 0) return [];
    return log.slice(Math.max(0, log.length - 4));
  }, [log]);

  const [resultsRealmFilter, setResultsRealmFilter] = useState("all");

  const realmFilterOptions = [
    { k: "all", label: "All Realms" },
    { k: "threshold", label: "Threshold" },
    { k: "lantern", label: "Lantern Room" },
    { k: "mirror", label: "Mirror Hall" },
    { k: "veil", label: "Veil Market" },
    { k: "traveler", label: "Traveler" },
    { k: "hearth", label: "Hearth" },
    { k: "wild", label: "Wild" },
    { k: "crown", label: "Crown" },
  ];

  const readingFiltered = useMemo(() => {
    const rk = realmKey && realmKey !== "—" ? realmKey : "threshold";
    return buildReading({
      realmKey: rk,
      realmFilter: resultsRealmFilter,
      signalEvents,
      memoryEvents,
      spread,
      answersByPrompt,
    });
  }, [realmKey, resultsRealmFilter, signalEvents, memoryEvents, spread, answersByPrompt]);

  const answersList = useMemo(() => {
    const list = Object.values(answersByPrompt || {});
    const filtered = resultsRealmFilter === "all" ? list : list.filter((a) => a?.realm === resultsRealmFilter);
    return filtered.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [answersByPrompt, resultsRealmFilter]);

  async function copyReading(reading) {
    const text = readingToText(reading);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  // Codex selection
  const [selectedCardId, setSelectedCardId] = useState(null);
  const selectedCard = selectedCardId ? tarotDeck.find((c) => c.id === selectedCardId) : null;
  const selectedUnlock = selectedCardId ? (unlocks.cards?.[selectedCardId] || null) : null;

  const showTrialTab = mode === "player";
  const showCodexTab = mode === "player";
  const showResultsTab = mode === "observer" || admin; // Trevor-only if admin

  return (
    <div className="container">
      <div className="header fantasyHeader">
        <div>
          <div className="title fantasyTitle">Seer’s Trial</div>
          <div className="subtitle fantasySubtitle">A gate that remembers what you reveal.</div>
        </div>
        <span className="tag fantasyTag">{moodTag}</span>
      </div>

      {/* Creator/session controls: hidden from Player by default */}
      {(mode === "observer" || admin) && (
        <div className="sessionBar fantasyBar">
          <div className="sessionLeft">
            <div className="sessionStatus">
              Mode: <b>{mode}</b> • Cloud: {CLOUD_ENABLED ? "enabled" : "not configured"}
              {cloudUpdatedAt ? ` • updated: ${new Date(cloudUpdatedAt).toLocaleString()}` : ""}
              {cloudStatus === "error" && cloudError ? ` • error: ${cloudError}` : ""}
            </div>
            {sessionCode ? <div className="sessionCode">SESSION {sessionCode}</div> : <div className="sessionStatus">No session yet.</div>}
          </div>

          <div className="smallRow" style={{ marginTop: 0 }}>
            {!sessionCode ? (
              <button className="smallBtn glowBtn" onClick={createShareSession}>Create Session</button>
            ) : (
              <>
                <button className="smallBtn" onClick={copyPlayerLink}>Copy Player Link</button>
                <button className="smallBtn" onClick={copyObserverLink}>Copy Observer Link</button>
                <button className="smallBtn" onClick={refreshFromCloud}>Refresh</button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="tabs fantasyTabs">
        {showTrialTab && (
          <button className={`tabBtn ${activeTab === "trial" ? "tabBtnActive" : ""}`} onClick={() => { setActiveTab("trial"); setSelectedCardId(null); }}>
            Trial
          </button>
        )}
        {showResultsTab && (
          <button className={`tabBtn ${activeTab === "results" ? "tabBtnActive" : ""}`} onClick={() => setActiveTab("results")}>
            Results
          </button>
        )}
        {showCodexTab && (
          <button className={`tabBtn ${activeTab === "codex" ? "tabBtnActive" : ""}`} onClick={() => setActiveTab("codex")}>
            Codex
          </button>
        )}
      </div>

      {/* WHISPER MODAL (in-world, not "backend") */}
      {whisperOpen && mode === "player" && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal fantasyModal">
            <div className="modalTitle">Whisper to the Gate</div>
            <div className="modalSub">
              {promptTitle ? <>The Gate asked: <b>{promptTitle}</b></> : "Leave one line. Optional."}
            </div>

            <textarea
              className="modalInput"
              value={whisperDraft}
              onChange={(e) => setWhisperDraft(e.target.value)}
              placeholder="One sentence. What do you mean… really?"
              rows={4}
              autoFocus
            />

            <div className="modalActions">
              <button className="smallBtn ghostBtn" onClick={() => closeWhisperAndCommit("")}>
                Skip
              </button>
              <button className="smallBtn glowBtn" onClick={() => closeWhisperAndCommit(whisperDraft)}>
                Seal Whisper
              </button>
            </div>

            <div className="modalHint">
              This is how the Gate “remembers.” Your line becomes part of the reading.
            </div>
          </div>
        </div>
      )}

      {/* ECHOES MODAL (full transcript) — ADMIN ONLY */}
      {echoesOpen && admin && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modal fantasyModal">
            <div className="modalTitle">Echoes</div>
            <div className="modalSub">Everything spoken so far (this is hidden from the Player link).</div>

            <div className="echoesBox">
              {log.length === 0 ? (
                <div className="echoLine" style={{ opacity: 0.75 }}>The Gate waits.</div>
              ) : (
                log.map((t, i) => <div className="echoLine" key={i}>{t}</div>)
              )}
            </div>

            <div className="modalActions">
              <button className="smallBtn" onClick={() => downloadText(`seer_echoes_${new Date().toISOString().slice(0,10)}.txt`, (log || []).join("\n"))}>
                Download
              </button>
              <button className="smallBtn glowBtn" onClick={() => setEchoesOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid">
        {/* TRIAL (Player) */}
        {activeTab === "trial" && mode === "player" ? (
          <>
            <div className="panel fantasyPanel">
              <div className="stats fantasyStats">
                <div className="statCard">
                  <div className="statLabel">Favor</div>
                  <div className="statValue">{stats.favor}</div>
                </div>
                <div className="statCard">
                  <div className="statLabel">Focus</div>
                  <div className="statValue">{stats.focus}</div>
                </div>
                <div className="statCard">
                  <div className="statLabel">Scars</div>
                  <div className="statValue">{stats.scars}</div>
                </div>
                <div className="statCard">
                  <div className="statLabel">Runes</div>
                  <div className="statValue">{stats.runes}/9</div>
                </div>
              </div>

              <div className="smallRow">
                <button className="smallBtn glowBtn" onClick={newTrial}>Begin New Trial</button>
                <button className="smallBtn" onClick={resetAll}>Reset</button>

                {/* Admin-only "Echoes" button (so she never sees it) */}
                {admin && (
                  <button className="smallBtn ghostBtn" onClick={() => setEchoesOpen(true)}>Echoes</button>
                )}
              </div>

              <div className="subtitle" style={{ marginTop: 14 }}>Current Moment</div>
              <div className="momentBox">
                {recentLines.length === 0 ? (
                  <div className="momentLine momentFaint">The Gate waits.</div>
                ) : (
                  recentLines.map((t, i) => (
                    <div className={`momentLine ${i < recentLines.length - 1 ? "momentFaint" : ""}`} key={i}>
                      {t}
                    </div>
                  ))
                )}
              </div>

              <div className="choices">
                {choices.map((c) => (
                  <button className="button fantasyChoice" key={c.index} onClick={() => onChoiceClick(c.index)}>
                    {c.text}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel fantasyPanel">
              <div className="realmHeader">
                <div>
                  <div className="realmTitle">{realmLabel}</div>
                  <div className="realmHint">{realmHint}</div>
                </div>
                <span className="tag fantasyTagSmall">{gateMood}</span>
              </div>

              <div className="dividerRune" />

              <div className="subtitle" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>The Spread</span>
                <span style={{ opacity: 0.7 }}>draws when a realm ends</span>
              </div>

              {spread.length === 0 ? (
                <div className="line" style={{ marginTop: 12, opacity: 0.85 }}>
                  The spread hasn’t formed yet.
                </div>
              ) : (
                <div className="spread">
                  {spread.map((card) => (
                    <div className="card fantasyCard" key={card.id}>
                      <div className="cardTitle">{card.name}</div>
                      <div className="cardMeta">
                        {card.orientation}<br />
                        {card.keywords.join(" · ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* NEW: Realm-ending meaning shown immediately after draw:3 */}
              {realmEndReading &&
                realmEndReading.realm === realmKey &&
                spread.length > 0 &&
                realmEndReading.reading && (
                  <div className="readingBox" style={{ marginTop: 14 }}>
                    <div className="readingTitle">Realm Reading</div>
                    <div className="readingBody">
                      <div className="readingLine">
                        <b>The Gate says:</b> {realmEndReading.reading.gateVoice}
                      </div>

                      <div className="readingLine" style={{ marginTop: 10 }}>
                        <b>Meaning</b>
                      </div>

                      {(realmEndReading.reading.highlights || []).map((h, i) => (
                        <div className="readingLine" key={i}>• {h}</div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </>
        ) : null}

        {/* RESULTS (Observer OR Admin-only) */}
        {activeTab === "results" && (mode === "observer" || admin) ? (
          <>
            <div className="panel fantasyPanel">
              <div className="subtitle" style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <span>Observer Console</span>
                {mode === "observer" && (
                  <label style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>
                    <input
                      type="checkbox"
                      checked={liveWatch}
                      onChange={(e) => setLiveWatch(e.target.checked)}
                      style={{ marginRight: 8 }}
                    />
                    Live Watch
                  </label>
                )}
              </div>

              <div className="smallRow">
                <button className="smallBtn" onClick={refreshFromCloud}>Refresh</button>
                <button className="smallBtn glowBtn" onClick={() => copyReading(readingFiltered)}>{copied ? "Copied" : "Copy Report"}</button>
                <button className="smallBtn" onClick={() => downloadText(`seer_report_${resultsRealmFilter}.txt`, readingToText(readingFiltered))}>Download TXT</button>
                <button className="smallBtn" onClick={() => downloadJson(`seer_payload.json`, { sessionCode, realmKey, scene, answersByPrompt, signalEvents, memoryEvents, spread, realmReports })}>Download JSON</button>
              </div>

              <div className="noteBox" style={{ marginTop: 12 }}>
                <div className="noteLabel">Filter</div>
                <div className="smallRow" style={{ marginTop: 10 }}>
                  {realmFilterOptions.map((o) => (
                    <button
                      key={o.k}
                      className={`smallBtn ${resultsRealmFilter === o.k ? "tabBtnActive" : ""}`}
                      onClick={() => setResultsRealmFilter(o.k)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="readingBox">
                <div className="readingTitle">{readingFiltered.title}</div>
                <div className="readingBody">
                  <div className="readingLine"><b>Gate Voice:</b> {readingFiltered.gateVoice}</div>
                  <div className="readingLine" style={{ marginTop: 10 }}><b>Highlights</b></div>
                  {readingFiltered.highlights.map((h, i) => <div key={i} className="readingLine">• {h}</div>)}
                  <div className="readingLine" style={{ marginTop: 10 }}><b>Spread:</b> {readingFiltered.cardLine}</div>
                  <div className="readingLine" style={{ marginTop: 10 }}><b>Next question:</b> {readingFiltered.nextQuestion}</div>
                  <div className="readingLine" style={{ marginTop: 10 }}><b>Text to send:</b><br />{readingFiltered.textToSend}</div>
                </div>
              </div>

              <div className="subtitle" style={{ marginTop: 12 }}>Her Answers</div>
              <div className="resultsList">
                {answersList.length === 0 ? (
                  <div className="line">No whispers captured yet.</div>
                ) : (
                  answersList.map((a, idx) => (
                    <div className="answerCard" key={`${a.at}_${idx}`}>
                      <div className="answerTitle">{a.title}</div>
                      <div className="answerMeta">
                        Realm: {a.realm || "—"} • {a.at ? new Date(a.at).toLocaleString() : "—"}
                        {a.choice ? ` • Picked: ${a.choice}` : ""}
                      </div>
                      <div className="answerNote">{a.note ? a.note : "(No typed line)"}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="panel fantasyPanel">
              <div className="subtitle">Quick sanity check</div>
              <div className="line">
                Player link: clean fantasy UI, no Results tab, no admin labels, no scrolling transcript.<br />
                Observer link: Results update, Live Watch works.
              </div>
            </div>
          </>
        ) : null}

        {/* CODEX (Player) */}
        {activeTab === "codex" && mode === "player" ? (
          <>
            <div className="panel fantasyPanel">
              <div className="subtitle">Codex — Cards discovered: <b>{Object.keys(unlocks.cards || {}).length}</b> / {tarotDeck.length}</div>
              <div className="codexGrid">
                {tarotDeck.map((c) => {
                  const u = unlocks.cards?.[c.id];
                  const isUnlocked = !!u;
                  return (
                    <div
                      key={c.id}
                      className={`codexCard ${isUnlocked ? "" : "codexCardLocked"}`}
                      onClick={() => { if (isUnlocked) setSelectedCardId(c.id); }}
                      title={isUnlocked ? "View card" : "Locked"}
                    >
                      <div className="codexTitleRow">
                        <div style={{ fontWeight: 850 }}>{isUnlocked ? c.name : "Shrouded Card"}</div>
                        <span className="pill">{isUnlocked ? `Seen ${u.timesSeen}x` : "Locked"}</span>
                      </div>
                      <div className="cardMeta" style={{ marginTop: 8 }}>
                        {isUnlocked ? c.keywordsUpright.join(" · ") : "Earn this card in a realm."}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel fantasyPanel">
              {!selectedCard ? (
                <div className="line">Select an unlocked card.</div>
              ) : (
                <>
                  <div className="subtitle" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span><b>{selectedCard.name}</b></span>
                    <span className="pill">{selectedUnlock ? `Seen ${selectedUnlock.timesSeen}x` : ""}</span>
                  </div>
                  <div className="line" style={{ marginTop: 12 }}>
                    <b>Upright</b><br />{selectedCard.keywordsUpright.join(" · ")}
                  </div>
                  <div className="line" style={{ marginTop: 12 }}>
                    <b>Reversed</b><br />{selectedCard.keywordsReversed.join(" · ")}
                  </div>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
