const state = {
  token: localStorage.getItem("raw-api-token") || "",
  sessions: [],
  profiles: [],
  selectedSessionId: "",
  activeChatSessionId: "",
  activeAgentKind: "",
  activeView: "home",
  loadingProfileId: "",
  loadingSessionKind: "",
  sendingPrompt: false,
  refreshing: false,
  activeLogSessionId: "",
  desktop: Boolean(window.workstation),
  launching: false,
  sparks: { cpu: [], ram: [], gpu: [], disk: [] },
  latestSystem: null,
  chatBySession: {}
};

const el = {
  appMain: document.querySelector(".app-main"),
  setupOverlay: document.getElementById("setupOverlay"),
  setupForm: document.getElementById("setupForm"),
  setupBotToken: document.getElementById("setupBotToken"),
  setupChatId: document.getElementById("setupChatId"),
  setupPort: document.getElementById("setupPort"),
  setupTailscalePath: document.getElementById("setupTailscalePath"),
  detectTailscaleBtn: document.getElementById("detectTailscaleBtn"),
  chooseTailscaleBtn: document.getElementById("chooseTailscaleBtn"),
  setupSaveBtn: document.getElementById("setupSaveBtn"),
  setupStatus: document.getElementById("setupStatus"),
  setupPath: document.getElementById("setupPath"),
  desktopErrorOverlay: document.getElementById("desktopErrorOverlay"),
  desktopErrorMessage: document.getElementById("desktopErrorMessage"),
  desktopErrorLog: document.getElementById("desktopErrorLog"),
  desktopRetryBtn: document.getElementById("desktopRetryBtn"),
  desktopResetBtn: document.getElementById("desktopResetBtn"),
  tokenInput: document.getElementById("tokenInput"),
  saveTokenBtn: document.getElementById("saveTokenBtn"),
  connectionBadge: document.getElementById("connectionBadge"),
  toast: document.getElementById("toast"),
  pcBadge: document.getElementById("pcBadge"),
  gpuBadge: document.getElementById("gpuBadge"),
  launchStatus: document.getElementById("launchStatus"),
  cpuMetric: document.getElementById("cpuMetric"),
  ramMetric: document.getElementById("ramMetric"),
  gpuMetric: document.getElementById("gpuMetric"),
  diskMetric: document.getElementById("diskMetric"),
  cpuDetail: document.getElementById("cpuDetail"),
  ramDetail: document.getElementById("ramDetail"),
  gpuDetail: document.getElementById("gpuDetail"),
  cpuSpark: document.getElementById("cpuSpark"),
  ramSpark: document.getElementById("ramSpark"),
  gpuSpark: document.getElementById("gpuSpark"),
  diskSpark: document.getElementById("diskSpark"),
  claudeState: document.getElementById("claudeState"),
  codexState: document.getElementById("codexState"),
  powershellState: document.getElementById("powershellState"),
  comfyState: document.getElementById("comfyState"),
  ollamaState: document.getElementById("ollamaState"),
  tailscaleState: document.getElementById("tailscaleState"),
  localUrl: document.getElementById("localUrl"),
  tailscaleUrl: document.getElementById("tailscaleUrl"),
  sessions: document.getElementById("sessions"),
  profiles: document.getElementById("profiles"),
  services: document.getElementById("services"),
  logs: document.getElementById("logs"),
  logSessionLabel: document.getElementById("logSessionLabel"),
  promptInput: document.getElementById("promptInput"),
  sessionSelect: document.getElementById("sessionSelect"),
  sendBtn: document.getElementById("sendBtn"),
  openWindowBtn: document.getElementById("openWindowBtn"),
  agentChatPanel: document.getElementById("agentChatPanel"),
  chatAgentIcon: document.getElementById("chatAgentIcon"),
  chatAgentName: document.getElementById("chatAgentName"),
  chatProfileChip: document.getElementById("chatProfileChip"),
  chatStatusChip: document.getElementById("chatStatusChip"),
  chatGpu: document.getElementById("chatGpu"),
  chatRam: document.getElementById("chatRam"),
  chatCpu: document.getElementById("chatCpu"),
  chatMessages: document.getElementById("chatMessages"),
  chatPromptInput: document.getElementById("chatPromptInput"),
  chatSendBtn: document.getElementById("chatSendBtn"),
  chatAttachBtn: document.getElementById("chatAttachBtn"),
  chatSwitchProfileBtn: document.getElementById("chatSwitchProfileBtn"),
  chatTerminalBtn: document.getElementById("chatTerminalBtn"),
  chatLogsBtn: document.getElementById("chatLogsBtn"),
  chatStopBtn: document.getElementById("chatStopBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  clearLogsBtn: document.getElementById("clearLogsBtn"),
  clearFailedBtn: document.getElementById("clearFailedBtn"),
  telegramStatusBtn: document.getElementById("telegramStatusBtn"),
  telegramLogsBtn: document.getElementById("telegramLogsBtn"),
  approveAllBtn: document.getElementById("approveAllBtn"),
  startAllUiBtn: document.getElementById("startAllUiBtn"),
  stopAllUiBtn: document.getElementById("stopAllUiBtn"),
  restartUiBtn: document.getElementById("restartUiBtn"),
  sleepUiBtn: document.getElementById("sleepUiBtn"),
  profileFormToggle: document.getElementById("profileFormToggle"),
  profileLauncher: document.getElementById("profileLauncher"),
  createProfileBtn: document.getElementById("createProfileBtn"),
  profileName: document.getElementById("profileName"),
  profileKind: document.getElementById("profileKind"),
  profileCwd: document.getElementById("profileCwd"),
  profileCommand: document.getElementById("profileCommand"),
  profileEnv: document.getElementById("profileEnv")
};

el.tokenInput.value = state.token;
if (state.token) document.getElementById("authPanel").hidden = true;
hydrateStaticIcons();
setActiveView("home");

async function initialize() {
  const params = new URLSearchParams(location.search);
  if ("serviceWorker" in navigator && !state.desktop) {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }

  if (params.has("desktopError")) {
    showDesktopError(params);
    return;
  }

  if (!state.desktop && params.has("desktopSetup")) {
    showBridgeError();
    return;
  }

  if (state.desktop) {
    const setup = await window.workstation.getSetupStatus();
    if (setup.apiToken) {
      state.token = setup.apiToken;
      localStorage.setItem("raw-api-token", state.token);
      el.tokenInput.value = state.token;
      document.getElementById("authPanel").hidden = true;
    }

    if (!setup.configured || new URLSearchParams(location.search).has("desktopSetup")) {
      showSetup(setup);
      return;
    }
  }

  await refreshAll().catch((error) => {
    setConnected(false);
    if (/unauthorized/i.test(cleanError(error))) document.getElementById("authPanel").hidden = false;
    appendLog(`[error] ${cleanError(error)}\n`);
  });
  connectWebSocket();
}

function showSetup(setup) {
  setConnected(false);
  el.setupOverlay.hidden = false;
  el.setupPath.textContent = setup?.configPath ? `Config will be saved to ${setup.configPath}` : "";
  if (setup?.tailscalePath) el.setupTailscalePath.value = setup.tailscalePath;
  detectTailscalePath(false).catch(() => undefined);
  el.setupBotToken.focus();
}

function showDesktopError(params) {
  setConnected(false);
  el.desktopErrorOverlay.hidden = false;
  el.desktopErrorMessage.textContent = params.get("desktopError") || "Unknown startup error.";
  el.desktopErrorLog.textContent = params.get("desktopLog") ? `Log: ${params.get("desktopLog")}` : "";
}

function showBridgeError() {
  setConnected(false);
  el.desktopErrorOverlay.hidden = false;
  el.desktopErrorMessage.textContent = "Desktop bridge failed to load. Please reinstall the app or run the unpacked executable from the release folder.";
  el.desktopErrorLog.textContent = "";
}

function authHeaders() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.headers.get("content-type")?.includes("application/json") ? response.json() : response.text();
}

async function refreshAll() {
  state.refreshing = true;
  setBusy(el.refreshBtn, true, "Refreshing");
  try {
    const [status, profiles] = await Promise.all([api("/api/status"), api("/api/profiles")]);
    renderStatus(status);
    state.profiles = profiles.profiles || [];
    renderProfiles();
    maybeSuggestDefaultProfile();
    setConnected(true);
  } finally {
    state.refreshing = false;
    setBusy(el.refreshBtn, false);
  }
}

function setConnected(connected) {
  el.connectionBadge.textContent = connected ? "Online" : "Offline";
  el.connectionBadge.className = `badge ${connected ? "online" : "offline"}`;
}

function setActiveView(view) {
  const allowed = new Set(["home", "sessions", "chat", "logs", "profiles", "access"]);
  state.activeView = allowed.has(view) ? view : "home";
  if (el.appMain) el.appMain.dataset.view = state.activeView;
  document.querySelectorAll(".rail-link[data-view], .mobile-nav button[data-view]").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === state.activeView);
    if (item.getAttribute("aria-label")) {
      item.setAttribute("aria-current", item.dataset.view === state.activeView ? "page" : "false");
    }
  });
  if (state.activeView === "profiles") document.getElementById("profilesPanel")?.classList.add("expanded");
  if (state.activeView === "chat") renderChat();
}

function hydrateStaticIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((slot) => {
    slot.innerHTML = iconSvg(slot.dataset.icon);
  });
}

function iconSvg(name) {
  const icons = {
    home: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10.5V20h5v-5h3v5h5v-9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    sessions: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="5" cy="6" r="1.8" fill="currentColor"/><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="5" cy="18" r="1.8" fill="currentColor"/></svg>',
    controls: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="17" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    logs: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10M7 12h10M7 16h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 3h14a1 1 0 0 1 1 1v16l-4-2-4 2-4-2-4 2V4a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    profiles: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    access: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12h8M12 8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    refresh: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6v5h-5M4 18v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 11a6 6 0 0 0-10-4.5L4 10m2 3a6 6 0 0 0 10 4.5l4-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    comfy: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" opacity=".18"/><path d="M8 12a4 4 0 0 1 7-2.7M16 14.7A4 4 0 0 1 9 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><text x="12" y="14.5" text-anchor="middle" font-size="6" font-weight="900" fill="currentColor">CF</text></svg>',
    codex: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 4.5c3.2 2.2 5.2 4.7 5.2 7.5s-2 5.3-5.2 7.5C8.8 17.3 6.8 14.8 6.8 12s2-5.3 5.2-7.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 8.5h13M5.5 15.5h13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    claude: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 6.2L20 7.4l-4.4 4.6L20 16.6l-6.2-1.8L12 21l-1.8-6.2L4 16.6 8.4 12 4 7.4l6.2 1.8L12 3Z" fill="currentColor"/></svg>',
    ollama: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 18V9a4 4 0 0 1 8 0v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 11H6m12 0h-2M10 19h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="10" r="1" fill="currentColor"/><circle cx="14" cy="10" r="1" fill="currentColor"/></svg>',
    telegram: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 4 3.7 10.7c-1 .4-1 1.8.1 2.1l4.4 1.3 1.7 5c.3.9 1.5 1.1 2 .3l2.5-3.1 4.5 3.2c.8.6 2 .1 2.1-.9L23 5.6c.1-1.1-1-1.9-2-1.6Z" fill="currentColor"/><path d="m8.4 13.8 9.2-6.1-6.9 8.2" fill="none" stroke="#07131f" stroke-width="1.4" stroke-linecap="round" opacity=".7"/></svg>',
    tailscale: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="7" r="2.2" fill="currentColor"/><circle cx="17" cy="7" r="2.2" fill="currentColor"/><circle cx="7" cy="17" r="2.2" fill="currentColor"/><circle cx="17" cy="17" r="2.2" fill="currentColor"/><path d="M9.5 7h5M7 9.5v5M17 9.5v5M9.5 17h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    status: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v4l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    approve: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chat: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 2.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    play: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7L8 5Z" fill="currentColor"/></svg>',
    stop: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
    sleep: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 15.5A7.5 7.5 0 0 1 8.5 5a8 8 0 1 0 10.5 10.5Z" fill="currentColor"/></svg>',
    send: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4 21 12 4 20l3-8-3-8Z" fill="currentColor"/></svg>',
    window: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 9h16" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    plus: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    terminal: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 4 4-4 4M11 17h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  return icons[name] || icons.terminal;
}

function appendLog(line) {
  const atBottom = el.logs.scrollTop + el.logs.clientHeight >= el.logs.scrollHeight - 20;
  el.logs.textContent += cleanTerminalText(line);
  if (el.logs.textContent.length > 120000) el.logs.textContent = el.logs.textContent.slice(-90000);
  if (atBottom) el.logs.scrollTop = el.logs.scrollHeight;
}

function showToast(message, tone = "info") {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.dataset.tone = tone;
  el.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    el.toast.hidden = true;
  }, 4200);
}

function setBusy(button, busy, label) {
  if (!button) return;
  button.disabled = Boolean(busy);
  if (label) {
    button.dataset.originalHtml ||= button.innerHTML;
    button.textContent = label;
    return;
  }
  if (button.dataset.originalHtml) {
    button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
  }
}

function renderStatus(status) {
  state.latestSystem = status.system;
  state.sessions = status.sessions || [];
  const cpu = Number(status.system.cpuLoad || 0);
  const ram = Number(status.system.memoryUsedPct || 0);
  const gpu = status.system.gpu?.loadPct === undefined ? 0 : Number(status.system.gpu.loadPct || 0);
  const disk = Number(status.system.disk?.usedPct || 0);
  pushSpark("cpu", cpu);
  pushSpark("ram", ram);
  pushSpark("gpu", gpu);
  pushSpark("disk", disk);
  el.cpuMetric.textContent = `${cpu}%`;
  el.ramMetric.textContent = `${ram}%`;
  el.gpuMetric.textContent = status.system.gpu?.loadPct === undefined ? status.system.gpu?.model || "N/A" : `${gpu}%`;
  el.diskMetric.textContent = status.system.disk?.usedPct === undefined ? "Local" : `${disk}%`;
  el.cpuDetail.textContent = "System load";
  el.ramDetail.textContent = `${status.system.memoryUsedGb || "--"} / ${status.system.memoryTotalGb || "--"} GB`;
  el.gpuDetail.textContent = status.system.gpu?.temperatureC ? `${status.system.gpu.temperatureC}C` : status.system.gpu?.model || "GPU status";
  el.gpuBadge.textContent = status.system.gpu?.model ? status.system.gpu.model.replace(/\s+/g, " ").slice(0, 18) : "GPU --";
  updateChatSpecs(cpu, ram, gpu);
  drawSpark(el.cpuSpark, state.sparks.cpu, "#60a5fa");
  drawSpark(el.ramSpark, state.sparks.ram, "#58a6ff");
  drawSpark(el.gpuSpark, state.sparks.gpu, "#f08a4b");
  drawSpark(el.diskSpark, state.sparks.disk, "#4ade80");
  setLink(el.localUrl, status.access.localUrl);
  setLink(el.tailscaleUrl, status.access.tailscaleUrl);
  el.tailscaleState.textContent = status.access.tailscaleUrl ? "Detected" : "Missing";
  renderSessions();
  renderChatHeader();
  renderServices(status.services || []);
}

function updateChatSpecs(cpu, ram, gpu) {
  if (el.chatCpu) el.chatCpu.textContent = `${Math.round(cpu)}%`;
  if (el.chatRam) el.chatRam.textContent = `${Math.round(ram)}%`;
  if (el.chatGpu) el.chatGpu.textContent = Number.isFinite(gpu) && gpu > 0 ? `${Math.round(gpu)}%` : "GPU";
}

function setLink(anchor, value) {
  anchor.textContent = value || "Not detected";
  anchor.href = value || "#";
}

function setText(node, value) {
  if (node) node.textContent = value;
}

function renderSessions() {
  el.sessions.innerHTML = "";
  el.sessionSelect.innerHTML = "";
  const activeByKind = Object.fromEntries(state.sessions.map((session) => [session.kind, session]));
  setText(el.claudeState, activeByKind.claude?.status || "Ready");
  setText(el.codexState, activeByKind.codex?.status || "Ready");
  setText(el.powershellState, activeByKind.powershell?.status || "Tool");

  if (state.sessions.length === 0) {
    el.sessions.innerHTML = `<div class="empty-state">No active sessions yet. Start Claude, Codex, or one of your saved profiles.</div>`;
    el.sessionSelect.innerHTML = `<option value="">No active session</option>`;
    renderChatHeader();
    return;
  }

  for (const session of state.sessions) {
    const option = document.createElement("option");
    option.value = session.id;
    option.textContent = `${session.name} (${session.status})`;
    el.sessionSelect.appendChild(option);

    const item = document.createElement("article");
    item.className = "session";
    item.innerHTML = `
      <div class="session-head">
        <div>
          <h3>${escapeHtml(session.name)}</h3>
          <p>${escapeHtml(session.kind)} - ${escapeHtml(session.id.slice(0, 8))}${session.profileName ? ` - ${escapeHtml(session.profileName)}` : ""}</p>
        </div>
        <span class="status ${session.status}">${session.status}</span>
      </div>
      <div class="session-actions">
        <button data-action="chat" data-id="${session.id}">Chat</button>
        <button data-action="open" data-id="${session.id}">Term</button>
        <button data-action="logs" data-id="${session.id}">Logs</button>
        <button data-action="stop" data-id="${session.id}">Stop</button>
      </div>
    `;
    el.sessions.appendChild(item);
  }

  if (state.selectedSessionId) el.sessionSelect.value = state.selectedSessionId;
  if (!state.selectedSessionId && state.sessions[0]) state.selectedSessionId = state.sessions[0].id;
  if (!state.activeChatSessionId && state.selectedSessionId) state.activeChatSessionId = state.selectedSessionId;
  renderChatHeader();
}

function renderProfiles() {
  renderProfileLauncher();
  el.profiles.innerHTML = "";
  if (state.loadingProfileId) {
    el.profiles.innerHTML = `<div class="loading-state">Starting profile and opening the terminal window...</div>`;
    return;
  }
  if (state.profiles.length === 0) {
    el.profiles.innerHTML = `<div class="empty-state">No profiles yet. Create one per repo so agents always start in the right folder.</div>`;
    return;
  }
  for (const profile of state.profiles) {
    const envCount = profile.env ? Object.keys(profile.env).length : 0;
    const item = document.createElement("article");
    item.className = "profile-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(profile.name)}</strong>
        <span>${escapeHtml(profile.kind)} - ${escapeHtml(profile.cwd)}</span>
        <span class="profile-meta">${profile.command ? `Command: ${escapeHtml(profile.command)}` : "Default command"} &middot; ${envCount} env value${envCount === 1 ? "" : "s"}</span>
      </div>
      <div class="profile-actions">
        <button data-action="start-profile" data-id="${profile.id}">${state.loadingProfileId === profile.id ? "Starting" : "Start"}</button>
        <button data-action="open-profile-folder" data-id="${profile.id}">Open</button>
        <button data-action="delete-profile" data-id="${profile.id}">Delete</button>
      </div>
    `;
    el.profiles.appendChild(item);
  }
}

function renderProfileLauncher() {
  if (!el.profileLauncher) return;
  const primary = state.profiles.find((profile) => profile.kind === "claude") || state.profiles.find((profile) => profile.kind === "codex") || state.profiles[0];
  if (!primary) {
    el.profileLauncher.innerHTML = `
      <div class="empty-state">Create a profile to pin your main repo here.</div>
    `;
    return;
  }
  const active = activeSessionForProfile(primary.id);
  const envCount = primary.env ? Object.keys(primary.env).length : 0;
  el.profileLauncher.innerHTML = `
    <div class="launcher-card">
      <span class="service-icon" aria-hidden="true">${iconSvg(primary.kind === "codex" ? "codex" : primary.kind === "claude" ? "claude" : "terminal")}</span>
      <div>
        <strong>${escapeHtml(primary.name)}</strong>
        <span>${escapeHtml(primary.cwd || "Default folder")}</span>
        <span>${escapeHtml(primary.kind)} &middot; ${envCount} env value${envCount === 1 ? "" : "s"}${active ? " &middot; running" : ""}</span>
      </div>
      <button data-action="start-profile" data-id="${primary.id}" class="primary-action">${active ? "Focus" : "Launch"}</button>
    </div>
  `;
}

function defaultProfileForKind(kind) {
  return state.profiles.find((profile) => profile.kind === kind);
}

function activeSessionForKind(kind) {
  return state.sessions.find((session) => session.kind === kind && ["starting", "running"].includes(session.status));
}

async function openAgent(kind) {
  const active = activeSessionForKind(kind);
  if (active) {
    enterChat(active.id);
    showToast(`${active.name} connected.`);
    return;
  }

  const profile = defaultProfileForKind(kind);
  if (profile) {
    await startProfile(profile.id, { openChat: true, openWindow: false });
    return;
  }

  await startSession(kind, { openChat: true, openWindow: false });
}

function enterChat(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  state.activeChatSessionId = sessionId;
  state.selectedSessionId = sessionId;
  state.activeAgentKind = session?.kind || state.activeAgentKind || "";
  if (el.sessionSelect) el.sessionSelect.value = sessionId;
  if (session && ensureChat(sessionId).length === 0) {
    appendChatMessage(sessionId, "system", `Connected to ${session.name}. Send prompts here; raw terminal output stays in Logs.`);
  }
  setActiveView("chat");
  renderChatHeader();
  renderChat();
}

function renderChatHeader() {
  const session = state.sessions.find((item) => item.id === state.activeChatSessionId) || state.sessions.find((item) => item.id === state.selectedSessionId);
  if (!session) {
    if (el.chatAgentIcon) el.chatAgentIcon.innerHTML = iconSvg("chat");
    if (el.chatAgentName) el.chatAgentName.textContent = "No agent selected";
    if (el.chatProfileChip) el.chatProfileChip.textContent = "Choose Claude or Codex";
    if (el.chatStatusChip) {
      el.chatStatusChip.textContent = "Idle";
      el.chatStatusChip.className = "badge";
    }
    return;
  }

  state.activeChatSessionId = session.id;
  if (el.chatAgentIcon) el.chatAgentIcon.innerHTML = iconSvg(iconForKind(session.kind));
  if (el.chatAgentName) el.chatAgentName.textContent = session.name;
  if (el.chatProfileChip) el.chatProfileChip.textContent = session.profileName || compactPath(session.cwd) || session.kind;
  if (el.chatStatusChip) {
    el.chatStatusChip.textContent = session.status;
    el.chatStatusChip.className = `badge ${session.status === "running" || session.status === "starting" ? "online" : session.status === "error" ? "offline" : ""}`;
  }
}

function ensureChat(sessionId) {
  if (!state.chatBySession[sessionId]) state.chatBySession[sessionId] = [];
  return state.chatBySession[sessionId];
}

function appendChatMessage(sessionId, role, text) {
  if (!sessionId || !text) return;
  const messages = ensureChat(sessionId);
  messages.push({ role, text, at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
  if (messages.length > 80) messages.splice(0, messages.length - 80);
  if (sessionId === state.activeChatSessionId) renderChat();
}

function appendAgentOutput(sessionId, chunk) {
  if (!sessionId || !chunk) return;
  const text = cleanChatOutput(chunk);
  if (!text) return;
  const messages = ensureChat(sessionId);
  const last = messages[messages.length - 1];
  if (last?.role === "agent" && last.streaming) {
    last.text = compactChatText(`${last.text}${text}`);
    last.at = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else {
    messages.push({ role: "agent", text: compactChatText(text), streaming: true, at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
  }
  if (messages.length > 80) messages.splice(0, messages.length - 80);
  if (sessionId === state.activeChatSessionId) renderChat();
}

function renderChat() {
  if (!el.chatMessages) return;
  const sessionId = state.activeChatSessionId;
  if (!sessionId) {
    el.chatMessages.innerHTML = `
      <div class="chat-empty">
        <strong>Select an agent app to start.</strong>
        <span>Tap Claude or Codex from Mission Control and your prompt console will open here.</span>
      </div>
    `;
    return;
  }

  const messages = ensureChat(sessionId);
  if (messages.length === 0) {
    el.chatMessages.innerHTML = `
      <div class="chat-empty">
        <strong>Ready for prompts.</strong>
        <span>This chat is connected to ${escapeHtml(shortId(sessionId))}. Ask the agent what to do next.</span>
      </div>
    `;
    return;
  }

  const atBottom = el.chatMessages.scrollTop + el.chatMessages.clientHeight >= el.chatMessages.scrollHeight - 28;
  el.chatMessages.innerHTML = messages
    .map((message) => {
      const role = escapeHtml(message.role);
      return `
        <article class="chat-bubble ${role}">
          <div class="bubble-text">${formatChatText(message.text)}</div>
          <time>${escapeHtml(message.at || "")}</time>
        </article>
      `;
    })
    .join("");
  if (atBottom) el.chatMessages.scrollTop = el.chatMessages.scrollHeight;
}

function formatChatText(text) {
  return escapeHtml(text).replace(/\n{3,}/g, "\n\n").replace(/\n/g, "<br>");
}

function iconForKind(kind) {
  if (kind === "claude") return "claude";
  if (kind === "codex") return "codex";
  if (kind === "powershell") return "terminal";
  return "chat";
}

function compactPath(value) {
  if (!value) return "";
  const parts = String(value).split(/[\\/]/).filter(Boolean);
  return parts.slice(-2).join(" / ");
}

function renderServices(services) {
  el.services.innerHTML = "";
  const byName = Object.fromEntries(services.map((service) => [service.name.toLowerCase(), service]));
  el.comfyState.textContent = labelService(byName.comfyui?.status);
  el.ollamaState.textContent = labelService(byName.ollama?.status);
  for (const service of services) {
    const item = document.createElement("div");
    item.className = "service-row";
    item.innerHTML = `<strong>${escapeHtml(service.name)}</strong><span>${escapeHtml(labelService(service.status))}</span>`;
    el.services.appendChild(item);
  }
}

function labelService(status) {
  if (status === "available") return "Running";
  if (status === "configured") return "Configured";
  if (status === "unavailable") return "Offline";
  if (status === "not_configured") return "Setup needed";
  return "Unknown";
}

function maybeSuggestDefaultProfile() {
  if (state.profiles.length > 0 || el.profileCwd.value) return;
  el.profileCwd.placeholder = "Recommended: choose your actual project folder";
}

function pushSpark(key, value) {
  state.sparks[key].push(Math.max(0, Math.min(100, Number(value) || 0)));
  if (state.sparks[key].length > 32) state.sparks[key].shift();
}

function drawSpark(canvas, values, color) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const points = values.length ? values : [0];
  points.forEach((value, index) => {
    const x = (index / Math.max(1, points.length - 1)) * canvas.width;
    const y = canvas.height - (value / 100) * (canvas.height - 4) - 2;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

async function startSession(kind, options = {}) {
  if (state.launching) return;
  state.launching = true;
  state.loadingSessionKind = kind;
  el.launchStatus.textContent = `Starting ${kind}...`;
  setLaunchButtons(false);
  try {
    const prompt = el.promptInput.value.trim();
    const result = await api("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ kind, prompt: prompt || undefined, reuseExisting: true })
    });
    state.selectedSessionId = result.session.id;
    if (options.openChat) state.activeChatSessionId = result.session.id;
    showToast(`${result.session.name} is ready.`);
    appendLog(`[system] ${result.session.name} ready: ${result.session.id}\n`);
    appendChatMessage(result.session.id, "system", `${result.session.name} started. Send a prompt when you are ready.`);
    if (options.openWindow !== false) {
      await api(`/api/sessions/${result.session.id}/open-window`, { method: "POST" }).catch((error) => appendLog(`[warn] ${cleanError(error)}\n`));
    }
    await refreshAll();
    if (options.openChat) enterChat(result.session.id);
  } finally {
    state.launching = false;
    state.loadingSessionKind = "";
    el.launchStatus.textContent = "Ready";
    setLaunchButtons(true);
  }
}

function setLaunchButtons(enabled) {
  document.querySelectorAll("[data-kind]").forEach((button) => {
    button.disabled = !enabled;
  });
}

async function sendInput() {
  const id = el.sessionSelect.value || state.selectedSessionId;
  const text = el.promptInput.value.trim();
  if (!id || !text) return;
  state.sendingPrompt = true;
  setBusy(el.sendBtn, true, "Sending...");
  try {
    await api(`/api/sessions/${id}/input`, {
      method: "POST",
      body: JSON.stringify({ text })
    });
    el.promptInput.value = "";
    showToast(`Prompt sent to ${shortId(id)}.`);
  } finally {
    state.sendingPrompt = false;
    setBusy(el.sendBtn, false);
  }
}

async function sendChatInput() {
  const id = state.activeChatSessionId || el.sessionSelect.value || state.selectedSessionId;
  const text = el.chatPromptInput.value.trim();
  if (!id || !text) {
    showToast(id ? "Write a prompt first." : "Choose an agent session first.", "error");
    return;
  }
  state.sendingPrompt = true;
  setBusy(el.chatSendBtn, true, "Sending...");
  try {
    appendChatMessage(id, "user", text);
    await api(`/api/sessions/${id}/input`, {
      method: "POST",
      body: JSON.stringify({ text })
    });
    el.chatPromptInput.value = "";
    appendChatMessage(id, "system", "Prompt sent. Waiting for the agent...");
  } catch (error) {
    appendChatMessage(id, "system", cleanError(error));
    throw error;
  } finally {
    state.sendingPrompt = false;
    setBusy(el.chatSendBtn, false);
  }
}

async function openWindow(id = el.sessionSelect.value || state.selectedSessionId) {
  if (!id) return;
  await api(`/api/sessions/${id}/open-window`, { method: "POST" });
}

function startProfile(id, options = {}) {
  if (!id) return;
  const active = activeSessionForProfile(id);
  if (active) {
    state.selectedSessionId = active.id;
    if (options.openChat) {
      enterChat(active.id);
    } else {
      openWindow(active.id).catch((error) => showToast(cleanError(error), "error"));
      showToast(`Focused ${active.name}.`);
    }
    return;
  }
  state.loadingProfileId = id;
  renderProfiles();
  api("/api/sessions/start-profile", { method: "POST", body: JSON.stringify({ profileId: id, openWindow: options.openWindow !== false }) })
    .then((result) => {
      state.selectedSessionId = result.session.id;
      if (options.openChat) state.activeChatSessionId = result.session.id;
      appendChatMessage(result.session.id, "system", `${result.session.name} started from profile. Send your next prompt here.`);
      showToast(`${result.session.name} started.`);
      return refreshAll();
    })
    .then(() => {
      if (options.openChat) enterChat(state.selectedSessionId);
    })
    .catch((error) => {
      showToast(cleanError(error), "error");
      appendLog(`[error] ${cleanError(error)}\n`);
    })
    .finally(() => {
      state.loadingProfileId = "";
      renderProfiles();
    });
}

async function loadLogs(id) {
  state.activeLogSessionId = id;
  el.logSessionLabel.textContent = `(${shortId(id)})`;
  el.logs.textContent = "Loading logs...";
  const text = await api(`/api/sessions/${id}/logs`);
  el.logs.textContent = cleanTerminalText(text);
  el.logs.scrollTop = el.logs.scrollHeight;
}

async function createProfile() {
  const payload = {
    name: el.profileName.value.trim(),
    kind: el.profileKind.value,
    cwd: el.profileCwd.value.trim() || undefined,
    command: el.profileCommand.value.trim() || undefined,
    env: parseEnv(el.profileEnv.value)
  };
  if (!payload.name) {
    el.profileName.focus();
    return;
  }
  setBusy(el.createProfileBtn, true, "Creating...");
  try {
    await api("/api/profiles", { method: "POST", body: JSON.stringify(payload) });
    showToast("Profile created.");
  } finally {
    setBusy(el.createProfileBtn, false);
  }
  el.profileName.value = "";
  el.profileCommand.value = "";
  el.profileEnv.value = "";
  await refreshAll();
}

function parseEnv(raw) {
  const env = {};
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const index = line.indexOf("=");
      if (index > 0) env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    });
  return env;
}

function connectWebSocket() {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${location.host}/ws${state.token ? `?token=${encodeURIComponent(state.token)}` : ""}`;
  const ws = new WebSocket(url);

  ws.addEventListener("open", () => setConnected(true));
  ws.addEventListener("close", () => {
    setConnected(false);
    setTimeout(connectWebSocket, 2500);
  });
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "session.output") {
      appendLog(`[${message.sessionId.slice(0, 8)}] ${message.chunk}`);
      appendAgentOutput(message.sessionId, message.chunk);
    }
    if (message.type === "session.status") {
      if (message.session?.id && message.session.status !== "running" && message.session.status !== "starting") {
        const messages = ensureChat(message.session.id);
        const last = messages[messages.length - 1];
        if (last?.role === "agent") last.streaming = false;
      }
      refreshAll().catch(console.error);
    }
    if (message.type === "status") renderStatus(message.status);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cleanError(error) {
  try {
    const parsed = JSON.parse(error.message);
    return parsed.error || error.message;
  } catch {
    return error.message || String(error);
  }
}

function cleanTerminalText(value) {
  return String(value)
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b[P^_][\s\S]*?\x1b\\/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b[()][AB012]/g, "")
    .replace(/\x1b[=>78M]/g, "")
    .replace(/\x1b[@-Z\\-_]/g, "")
    .replace(/\x07/g, "")
    .replace(/\r(?!\n)/g, "\n")
    .replace(/[ \t]+\n/g, "\n");
}

function cleanChatOutput(value) {
  const cleaned = cleanTerminalText(value)
    .replace(/\[[0-9a-f]{8}\]/gi, "")
    .replace(/\[\d{4}-\d{2}-\d{2}T[^\]]+\]\s*\[(stdout|stderr|system)\]\s*/gi, "")
    .replace(/[│╭╮╰╯─]{4,}/g, "")
    .replace(/[✢✶✻✽·*]{2,}/g, "")
    .replace(/\b(thinking|still thinking|esc to interrupt)\b/gi, "")
    .replace(/\? for shortcuts/gi, "")
    .replace(/Update available!.*$/gim, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!cleaned || cleaned.length < 2) return "";
  if (/^[\W_]+$/.test(cleaned)) return "";
  return cleaned.endsWith("\n") ? cleaned : `${cleaned}\n`;
}

function compactChatText(value) {
  const text = String(value).replace(/\n{4,}/g, "\n\n\n");
  return text.length > 6000 ? text.slice(-6000) : text;
}

function shortId(id) {
  return String(id || "").slice(0, 8);
}

function activeSessionForProfile(profileId) {
  return state.sessions.find((session) => session.profileId === profileId);
}

el.setupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!window.workstation) return;

  el.setupStatus.className = "setup-status";
  el.setupStatus.textContent = "Saving config. This can take a few seconds while Telegram starts.";
  el.setupSaveBtn.disabled = true;

  try {
    const status = await window.workstation.saveFirstRunConfig({
      telegramBotToken: el.setupBotToken.value,
      telegramChatId: el.setupChatId.value,
      port: Number(el.setupPort.value || 8787),
      tailscalePath: el.setupTailscalePath.value
    });
    el.setupStatus.className = "setup-status success";
    el.setupStatus.textContent = "Config created. Opening dashboard...";
    state.token = status.apiToken || "";
    localStorage.setItem("raw-api-token", state.token);
    location.href = status.serverUrl;
  } catch (error) {
    el.setupStatus.className = "setup-status error";
    el.setupStatus.textContent = cleanError(error);
    el.setupSaveBtn.disabled = false;
  }
});

async function detectTailscalePath(showFailure) {
  if (!window.workstation?.detectTailscalePath) return;
  const detected = await window.workstation.detectTailscalePath();
  if (detected) {
    el.setupTailscalePath.value = detected;
    el.setupStatus.className = "setup-status success";
    el.setupStatus.textContent = `Tailscale found: ${detected}`;
    return;
  }
  if (showFailure) {
    el.setupStatus.className = "setup-status error";
    el.setupStatus.textContent = "Tailscale was not found in the standard Windows locations. Use Browse and select tailscale.exe.";
  }
}

el.detectTailscaleBtn.addEventListener("click", () => detectTailscalePath(true).catch((error) => (el.setupStatus.textContent = cleanError(error))));
el.chooseTailscaleBtn.addEventListener("click", async () => {
  if (!window.workstation?.chooseTailscalePath) return;
  const selected = await window.workstation.chooseTailscalePath();
  if (selected) el.setupTailscalePath.value = selected;
});
el.desktopRetryBtn.addEventListener("click", async () => {
  if (!window.workstation?.retryStartup) return location.reload();
  el.desktopErrorMessage.textContent = "Retrying startup...";
  try {
    await window.workstation.retryStartup();
  } catch (error) {
    el.desktopErrorMessage.textContent = cleanError(error);
  }
});
el.desktopResetBtn.addEventListener("click", async () => {
  if (!window.workstation?.resetSetup) return;
  el.desktopErrorMessage.textContent = "Resetting setup...";
  try {
    await window.workstation.resetSetup();
  } catch (error) {
    el.desktopErrorMessage.textContent = cleanError(error);
  }
});

document.querySelectorAll("[data-kind]").forEach((button) => {
  button.addEventListener("click", () =>
    openAgent(button.dataset.kind).catch((error) => {
      showToast(cleanError(error), "error");
      appendLog(`[error] ${cleanError(error)}\n`);
    })
  );
});

document.querySelectorAll("[data-service]").forEach((button) => {
  button.addEventListener("click", () => showToast(`${button.dataset.service} is monitored here. Start it from its own app or create a custom profile.`));
});

document.querySelectorAll(".rail-link[data-view], .mobile-nav button[data-view]").forEach((button) => {
  button.addEventListener("click", () => setActiveView(button.dataset.view));
});

document.querySelectorAll("[data-view-target]").forEach((button) => {
  button.addEventListener("click", () => setActiveView(button.dataset.viewTarget));
});

el.sessions.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === "chat") enterChat(id);
  if (button.dataset.action === "open") openWindow(id).catch((error) => appendLog(`[error] ${cleanError(error)}\n`));
  if (button.dataset.action === "logs") {
    loadLogs(id).then(() => setActiveView("logs")).catch((error) => appendLog(`[error] ${cleanError(error)}\n`));
  }
  if (button.dataset.action === "stop") {
    api(`/api/sessions/${id}/stop`, { method: "POST" }).then(refreshAll).catch((error) => appendLog(`[error] ${cleanError(error)}\n`));
  }
});

el.profiles.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === "start-profile") startProfile(id);
  if (button.dataset.action === "open-profile-folder") {
    const session = activeSessionForProfile(id);
    if (!session) {
      showToast("Start this profile first, then Open will focus its terminal window.");
      return;
    }
    openWindow(session.id).catch((error) => showToast(cleanError(error), "error"));
  }
  if (button.dataset.action === "delete-profile") {
    api(`/api/profiles/${id}`, { method: "DELETE" })
      .then(() => {
        showToast("Profile deleted.");
        return refreshAll();
      })
      .catch((error) => {
        showToast(cleanError(error), "error");
        appendLog(`[error] ${cleanError(error)}\n`);
      });
  }
});

el.profileLauncher?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.action === "start-profile") startProfile(button.dataset.id, { openChat: true, openWindow: false });
});

el.saveTokenBtn.addEventListener("click", () => {
  state.token = el.tokenInput.value.trim();
  localStorage.setItem("raw-api-token", state.token);
  location.reload();
});
el.sendBtn.addEventListener("click", () => sendInput().catch((error) => appendLog(`[error] ${cleanError(error)}\n`)));
el.openWindowBtn.addEventListener("click", () => openWindow().catch((error) => appendLog(`[error] ${cleanError(error)}\n`)));
el.chatSendBtn.addEventListener("click", () => sendChatInput().catch((error) => showToast(cleanError(error), "error")));
el.chatPromptInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    sendChatInput().catch((error) => showToast(cleanError(error), "error"));
  }
});
el.chatTerminalBtn.addEventListener("click", () => openWindow(state.activeChatSessionId).catch((error) => showToast(cleanError(error), "error")));
el.chatLogsBtn.addEventListener("click", () => {
  if (!state.activeChatSessionId) return showToast("Choose an agent first.", "error");
  loadLogs(state.activeChatSessionId).then(() => setActiveView("logs")).catch((error) => showToast(cleanError(error), "error"));
});
el.chatStopBtn.addEventListener("click", () => {
  if (!state.activeChatSessionId) return showToast("Choose an agent first.", "error");
  api(`/api/sessions/${state.activeChatSessionId}/stop`, { method: "POST" }).then(refreshAll).catch((error) => showToast(cleanError(error), "error"));
});
el.chatSwitchProfileBtn.addEventListener("click", () => setActiveView("profiles"));
el.chatAttachBtn.addEventListener("click", () => showToast("File attachments are planned for the next mobile pass."));
el.refreshBtn.addEventListener("click", () => refreshAll().catch((error) => {
  showToast(cleanError(error), "error");
  appendLog(`[error] ${cleanError(error)}\n`);
}));
el.clearFailedBtn.addEventListener("click", () => api("/api/sessions/clear-failed", { method: "POST" }).then(refreshAll).catch((error) => appendLog(`[error] ${cleanError(error)}\n`)));
el.stopAllUiBtn.addEventListener("click", () => api("/api/sessions/stop-all", { method: "POST" }).then(refreshAll).then(() => showToast("Stop requested for all sessions.")).catch((error) => showToast(cleanError(error), "error")));
el.startAllUiBtn?.addEventListener("click", () => showToast("Use the service cards or a profile to start the agents you need."));
el.restartUiBtn?.addEventListener("click", () => showToast("Restart controls will target selected sessions in a later pass."));
el.sleepUiBtn?.addEventListener("click", () => showToast("Sleep is planned for the Windows power controls pass."));
el.telegramStatusBtn.addEventListener("click", () => showToast("Use /status in Telegram for the current workstation state."));
el.telegramLogsBtn.addEventListener("click", () => showToast("Use /logs in Telegram or select Logs from a session card."));
el.approveAllBtn.addEventListener("click", () => showToast("Approval shortcuts will land in a later integration pass."));
el.clearLogsBtn.addEventListener("click", () => {
  el.logs.textContent = "";
  el.logSessionLabel.textContent = "";
  state.activeLogSessionId = "";
});
el.profileFormToggle?.addEventListener("click", () => {
  const panel = document.getElementById("profilesPanel");
  panel?.classList.add("expanded");
  setActiveView("profiles");
  el.profileFormToggle.textContent = "Edit";
});
el.createProfileBtn.addEventListener("click", () => createProfile().catch((error) => appendLog(`[error] ${cleanError(error)}\n`)));

initialize().catch((error) => {
  setConnected(false);
  appendLog(`[error] ${cleanError(error)}\n`);
});
