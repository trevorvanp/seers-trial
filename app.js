let story = null;

const elOutput = document.getElementById("output");
const elChoices = document.getElementById("choices");
const elTitle = document.getElementById("screenTitle");
const elHudStats = document.getElementById("hudStats");

const elInputWrap = document.getElementById("inputWrap");
const elNameInput = document.getElementById("nameInput");
const elNameConfirm = document.getElementById("nameConfirm");

document.getElementById("btnRestart").addEventListener("click", () => {
  localStorage.removeItem("seer_save");
  window.location.reload();
});
document.getElementById("btnSave").addEventListener("click", saveState);
document.getElementById("btnLoad").addEventListener("click", loadState);

async function boot() {
  // NOTE: loading JSON via fetch requires running from a server (not double-clicking the file),
  // because browsers block local file fetches (CORS). :contentReference[oaicite:6]{index=6}
  const res = await fetch("./story.json");
  const json = await res.json();

  story = new inkjs.Story(json);

  // If we’re entering custom-name screen, we’ll capture input via our UI
  // by looking for tags like: INPUT:NAME (we use story tags).
  continueStory();
}

function clearUI() {
  elOutput.innerHTML = "";
  elChoices.innerHTML = "";
  elInputWrap.classList.add("hidden");
}

function setScreenTitleFromTags(tags) {
  const screenTag = tags.find(t => t.startsWith("SCREEN:"));
  if (screenTag) {
    elTitle.textContent = screenTag.split(":")[1].trim();
  }
}

function updateHud() {
  if (!story) return;
  const vars = story.variablesState;
  const name = vars["playerName"] ?? "Traveler";
  const runes = vars["runes"] ?? 0;
  const favor = vars["favor"] ?? 0;
  elHudStats.textContent = `Runes: ${runes}/9 · Favor: ${favor} · Name: ${name}`;
}

function appendParagraph(text, className="") {
  const p = document.createElement("p");
  if (className) p.className = className;
  p.textContent = text;
  elOutput.appendChild(p);
}

function continueStory() {
  clearUI();

  while (story.canContinue) {
    const text = story.Continue().trim();
    const tags = story.currentTags || [];

    setScreenTitleFromTags(tags);

    // If the story wants name input:
    const wantsName = tags.includes("INPUT:NAME");
    if (wantsName) {
      appendParagraph(text, "tagline");
      showNameInput();
      updateHud();
      return; // stop here until they enter a name
    }

    if (text) appendParagraph(text);
  }

  renderChoices();
  updateHud();
}

function renderChoices() {
  elChoices.innerHTML = "";
  story.currentChoices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.textContent = choice.text;
    btn.addEventListener("click", () => {
      story.ChooseChoiceIndex(i);
      continueStory();
    });
    elChoices.appendChild(btn);
  });
}

function showNameInput() {
  elInputWrap.classList.remove("hidden");
  elNameInput.value = "";
  elNameInput.focus();

  elNameConfirm.onclick = () => {
    const val = (elNameInput.value || "").trim();
    if (val.length) {
      story.variablesState["playerName"] = val;
    }
    // After setting name, continue
    continueStory();
  };
}

function saveState() {
  if (!story) return;
  const state = story.state.toJson();
  localStorage.setItem("seer_save", state);
  alert("Saved.");
}

function loadState() {
  if (!story) return;
  const saved = localStorage.getItem("seer_save");
  if (!saved) {
    alert("No save found.");
    return;
  }
  story.state.LoadJson(saved);
  continueStory();
}

boot();
