const bootToken = readBootToken();

const state = {
  token: bootToken || localStorage.getItem("raw-api-token") || "",
  sessions: [],
  profiles: [],
  selectedSessionId: "",
  commandTargetValue: "",
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
  chatBySession: {},
  terminal: null,
  terminalFit: null,
  terminalSessionId: "",
  terminalResizeObserver: null,
  terminalLastSize: "",
  terminalFitQueued: false,
  terminalTouchY: 0,
  pendingAttachments: [],
  editingProfileId: "",
  profileFormMode: "",
  approvalBySession: {},
  dismissedApprovalBySession: {},
  dismissedApprovalCursorBySession: {},
  outputTextBySession: {},
  theme: localStorage.getItem("kael-theme") || "dark"
};

if (bootToken) {
  localStorage.setItem("raw-api-token", bootToken);
  const cleanUrl = `${location.pathname}${location.search}`;
  history.replaceState(null, "", cleanUrl || "/");
}

const assetIcons = {
  claude: "claude.svg",
  codex: "openai.svg",
  openai: "openai.svg",
  comfy: "comfyui.svg",
  ollama: "ollama.svg",
  tailscale: "tailscale.svg",
  telegram: "telegram.svg"
};

function assetPath(path) {
  return new URL(path, document.baseURI).toString();
}

function readBootToken() {
  const hashParams = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : location.hash);
  const queryParams = new URLSearchParams(location.search);
  return hashParams.get("token") || queryParams.get("token") || "";
}

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
  commandTarget: document.getElementById("commandTarget"),
  commandTargetBtn: document.getElementById("commandTargetBtn"),
  commandTargetMenu: document.getElementById("commandTargetMenu"),
  commandTargetIcon: document.getElementById("commandTargetIcon"),
  commandTargetLabel: document.getElementById("commandTargetLabel"),
  commandTargetMeta: document.getElementById("commandTargetMeta"),
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
  sideCpuSpark: document.getElementById("sideCpuSpark"),
  sideRamSpark: document.getElementById("sideRamSpark"),
  sideGpuSpark: document.getElementById("sideGpuSpark"),
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
  chatTerminalHost: document.getElementById("chatTerminalHost"),
  chatTerminalEmpty: document.getElementById("chatTerminalEmpty"),
  chatPromptInput: document.getElementById("chatPromptInput"),
  chatSendBtn: document.getElementById("chatSendBtn"),
  chatAttachBtn: document.getElementById("chatAttachBtn"),
  chatFileInput: document.getElementById("chatFileInput"),
  chatAttachmentList: document.getElementById("chatAttachmentList"),
  chatSwitchProfileBtn: document.getElementById("chatSwitchProfileBtn"),
  chatQrBtn: document.getElementById("chatQrBtn"),
  phoneQrPanel: document.getElementById("phoneQrPanel"),
  phoneQrCode: document.getElementById("phoneQrCode"),
  phoneQrUrl: document.getElementById("phoneQrUrl"),
  accessQrCode: document.getElementById("accessQrCode"),
  accessQrUrl: document.getElementById("accessQrUrl"),
  sideAccessUrl: document.getElementById("sideAccessUrl"),
  sideQrCode: document.getElementById("sideQrCode"),
  sideGpuMetric: document.getElementById("sideGpuMetric"),
  sideRamMetric: document.getElementById("sideRamMetric"),
  sideCpuMetric: document.getElementById("sideCpuMetric"),
  telegramState: document.getElementById("telegramState"),
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
  profileCreateSlot: document.getElementById("profileCreateSlot"),
  profileFormWrap: document.getElementById("profileFormWrap"),
  profileName: document.getElementById("profileName"),
  profileKind: document.getElementById("profileKind"),
  profileCwd: document.getElementById("profileCwd"),
  profileCommand: document.getElementById("profileCommand"),
  profilePrelaunchCommand: document.getElementById("profilePrelaunchCommand"),
  profileEnv: document.getElementById("profileEnv"),
  claudeProxyPresetBtn: document.getElementById("claudeProxyPresetBtn"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  cancelProfileEditBtn: document.getElementById("cancelProfileEditBtn"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsActiveProfile: document.getElementById("settingsActiveProfile"),
  settingsActiveProfileBadge: document.getElementById("settingsActiveProfileBadge"),
  settingsTailscale: document.getElementById("settingsTailscale"),
  settingsLocalUrl: document.getElementById("settingsLocalUrl"),
  settingsThemeLabel: document.getElementById("settingsThemeLabel"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  settingsQrBtn: document.getElementById("settingsQrBtn"),
  settingsQrPanel: document.getElementById("settingsQrPanel"),
  settingsTokenBtn: document.getElementById("settingsTokenBtn"),
  telegramFallbackBtn: document.getElementById("telegramFallbackBtn"),
  lockOnExitBtn: document.getElementById("lockOnExitBtn"),
  settingsTelegramSwitch: document.getElementById("settingsTelegramSwitch"),
  settingsLockSwitch: document.getElementById("settingsLockSwitch"),
  approvalPanel: document.getElementById("approvalPanel"),
  approvalTitle: document.getElementById("approvalTitle"),
  approvalMessage: document.getElementById("approvalMessage"),
  approvalInstruction: document.getElementById("approvalInstruction"),
  approvalYesBtn: document.getElementById("approvalYesBtn"),
  approvalAlwaysBtn: document.getElementById("approvalAlwaysBtn"),
  approvalNoBtn: document.getElementById("approvalNoBtn")
};

el.tokenInput.value = state.token;
if (state.token) document.getElementById("authPanel").hidden = true;
setAppViewportHeight();
applyTheme(state.theme);
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
  el.setupPort.focus();
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
    renderSettings();
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
  const allowed = new Set(["home", "chat", "profiles", "settings", "access"]);
  state.activeView = allowed.has(view) ? view : "home";
  if (el.appMain) el.appMain.dataset.view = state.activeView;
  document.body.dataset.view = state.activeView;
  document.querySelectorAll(".rail-link[data-view], .mobile-nav button[data-view]").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === state.activeView);
    if (item.getAttribute("aria-label")) {
      item.setAttribute("aria-current", item.dataset.view === state.activeView ? "page" : "false");
    }
  });
  if (state.activeView === "profiles") document.getElementById("profilesPanel")?.classList.add("expanded");
  if (state.activeView === "chat") renderChat();
  if (state.activeView === "chat") scheduleFitChatTerminal();
  if (state.activeView === "access") loadPhoneQr({ showPanel: false }).catch(() => undefined);
  if (state.activeView === "settings") renderSettings();
}

function hydrateStaticIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((slot) => {
    slot.innerHTML = iconSvg(slot.dataset.icon);
  });
}

function iconSvg(name) {
  const inlineName = name.endsWith("-inline") ? name.slice(0, -"-inline".length) : "";
  if (!inlineName && assetIcons[name]) {
    return `<img class="asset-icon logo-${name}" src="${assetPath(`assets/icons/${assetIcons[name]}`)}" alt="" aria-hidden="true" loading="lazy" decoding="async" />`;
  }
  if (inlineName) name = inlineName;

  const icons = {
    home: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10.5V20h5v-5h3v5h5v-9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    sessions: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="5" cy="6" r="1.8" fill="currentColor"/><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="5" cy="18" r="1.8" fill="currentColor"/></svg>',
    controls: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="17" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    logs: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10M7 12h10M7 16h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 3h14a1 1 0 0 1 1 1v16l-4-2-4 2-4-2-4 2V4a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    profiles: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    settings: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5 6.8 15M17.2 9l2.6-1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    palette: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a8 8 0 0 0 0 16h1.2a1.9 1.9 0 0 0 1.4-3.2l-.2-.2a1.9 1.9 0 0 1 1.4-3.2H18A3 3 0 0 0 21 10.4 7.8 7.8 0 0 0 12 4Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.2" cy="11" r="1" fill="currentColor"/><circle cx="10.2" cy="8" r="1" fill="currentColor"/><circle cx="13.8" cy="8.2" r="1" fill="currentColor"/></svg>',
    key: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="14" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="m11 11 8-8M16 6l2 2M14 8l2 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    lock: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    qr: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 15h2v2h-2zM18 18h2v2h-2zM14 19h2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
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
  setText(el.sideCpuMetric, `${cpu}%`);
  setText(el.sideRamMetric, `${ram}%`);
  setText(el.sideGpuMetric, status.system.gpu?.loadPct === undefined ? "N/A" : `${gpu}%`);
  updateChatSpecs(cpu, ram, gpu);
  drawSpark(el.cpuSpark, state.sparks.cpu, "#60a5fa");
  drawSpark(el.ramSpark, state.sparks.ram, "#58a6ff");
  drawSpark(el.gpuSpark, state.sparks.gpu, "#f08a4b");
  drawSpark(el.diskSpark, state.sparks.disk, "#4ade80");
  drawSpark(el.sideCpuSpark, state.sparks.cpu, "#65e4bd");
  drawSpark(el.sideRamSpark, state.sparks.ram, "#f6ead7");
  drawSpark(el.sideGpuSpark, state.sparks.gpu, "#f4771d");
  setLink(el.localUrl, status.access.localUrl);
  setLink(el.tailscaleUrl, status.access.tailscaleUrl);
  el.tailscaleState.textContent = status.access.tailscaleUrl ? "Detected" : "Missing";
  renderPhoneAccess(status.access.tailscaleUrl || status.access.localUrl);
  renderSettings();
  renderSessions();
  renderChatHeader();
  renderServices(status.services || []);
}

function renderPhoneAccess(url) {
  if (el.phoneQrUrl) {
    el.phoneQrUrl.textContent = url || "Not detected";
    el.phoneQrUrl.href = url || "#";
  }
  if (el.accessQrUrl) {
    el.accessQrUrl.textContent = url || "Not detected";
    el.accessQrUrl.href = url || "#";
  }
  if (el.sideAccessUrl) {
    el.sideAccessUrl.textContent = url || "Waiting for Tailscale...";
    el.sideAccessUrl.href = url || "#";
  }
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
  const activeByKind = Object.fromEntries(state.sessions.map((session) => [session.kind, session]));
  setText(el.claudeState, activeByKind.claude?.status || "Ready");
  setText(el.codexState, activeByKind.codex?.status || "Ready");
  setText(el.powershellState, activeByKind.powershell?.status || "Tool");
  renderCommandTargetOptions();

  if (state.sessions.length === 0) {
    el.sessions.innerHTML = `<div class="empty-state">No active sessions yet. Start Claude, Codex, or one of your saved profiles.</div>`;
    renderChatHeader();
    return;
  }

  for (const session of state.sessions) {
    const item = document.createElement("article");
    item.className = "session";
    item.innerHTML = `
      <div class="session-head">
        <span class="session-agent-icon">${iconSvg(iconForKind(session.kind))}</span>
        <div>
          <h3>${escapeHtml(session.name)}</h3>
          <p>${escapeHtml(agentLabel(session.kind))} - ${escapeHtml(session.id.slice(0, 8))}${session.profileName ? ` - ${escapeHtml(session.profileName)}` : ""}</p>
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

  if (!state.selectedSessionId && state.sessions[0]) state.selectedSessionId = state.sessions[0].id;
  if (!state.activeChatSessionId && state.selectedSessionId) state.activeChatSessionId = state.selectedSessionId;
  renderChatHeader();
}

function buildCommandTargets() {
  const activeSessions = state.sessions.filter((session) => ["starting", "running"].includes(session.status));
  const activeProfileIds = new Set(activeSessions.map((session) => session.profileId).filter(Boolean));
  const sessionTargets = activeSessions.map((session) => ({
    type: "session",
    value: `session:${session.id}`,
    id: session.id,
    kind: session.kind,
    label: session.profileName || session.name,
    meta: agentLabel(session.kind),
    status: session.status
  }));
  const profileTargets = state.profiles
    .filter((profile) => ["claude", "codex"].includes(profile.kind) && !activeProfileIds.has(profile.id))
    .map((profile) => ({
      type: "profile",
      value: `profile:${profile.id}`,
      id: profile.id,
      kind: profile.kind,
      label: profile.name,
      meta: agentLabel(profile.kind),
      status: "Ready"
    }));
  return [...sessionTargets, ...profileTargets];
}

function renderCommandTargetOptions() {
  if (!el.commandTargetBtn || !el.commandTargetMenu) return;
  const targets = buildCommandTargets();
  const current = state.commandTargetValue || (state.selectedSessionId ? `session:${state.selectedSessionId}` : "");
  const selected = targets.find((target) => target.value === current) || targets.find((target) => target.type === "session") || targets[0];

  state.commandTargetValue = selected?.value || "";
  el.commandTargetBtn.disabled = !selected;
  el.commandTargetBtn.setAttribute("aria-expanded", el.commandTargetMenu.hidden ? "false" : "true");
  el.commandTargetIcon.innerHTML = selected ? iconSvg(iconForKind(selected.kind)) : "";
  el.commandTargetLabel.textContent = selected ? selected.label : "Create a Claude or Codex profile first";
  el.commandTargetMeta.textContent = selected ? `${selected.meta} - ${selected.status}` : "No command target";
  el.commandTargetMenu.innerHTML = targets
    .map(
      (target) => `
        <button
          class="command-target-option ${target.value === state.commandTargetValue ? "selected" : ""}"
          type="button"
          role="option"
          aria-selected="${target.value === state.commandTargetValue ? "true" : "false"}"
          data-target-value="${escapeHtml(target.value)}"
        >
          <span class="command-target-option-icon" aria-hidden="true">${iconSvg(iconForKind(target.kind))}</span>
          <span class="command-target-option-copy">
            <strong>${escapeHtml(target.label)}</strong>
            <small>${escapeHtml(target.meta)} - ${escapeHtml(target.status)}</small>
          </span>
        </button>
      `
    )
    .join("");
}

function closeCommandTargetMenu() {
  if (!el.commandTargetMenu || !el.commandTargetBtn) return;
  el.commandTargetMenu.hidden = true;
  el.commandTargetBtn.setAttribute("aria-expanded", "false");
}

function toggleCommandTargetMenu() {
  if (!el.commandTargetMenu || !el.commandTargetBtn || el.commandTargetBtn.disabled) return;
  const nextOpen = el.commandTargetMenu.hidden;
  el.commandTargetMenu.hidden = !nextOpen;
  el.commandTargetBtn.setAttribute("aria-expanded", nextOpen ? "true" : "false");
}

function renderProfiles() {
  renderProfileLauncher();
  el.profiles.innerHTML = "";
  if (el.profileFormWrap && !state.profileFormMode) {
    el.profileFormWrap.hidden = true;
    el.profileCreateSlot?.appendChild(el.profileFormWrap);
  }
  if (state.loadingProfileId) {
    el.profiles.innerHTML = `<div class="loading-state">Starting profile and opening the terminal window...</div>`;
    return;
  }
  if (state.profiles.length === 0) {
    el.profiles.innerHTML = `<div class="empty-state">No profiles yet. Create one per repo so agents always start in the right folder.</div>`;
    if (state.profileFormMode === "create") placeProfileForm(el.profileCreateSlot);
    renderCommandTargetOptions();
    return;
  }
  for (const profile of state.profiles) {
    const envCount = profile.env ? Object.keys(profile.env).length : 0;
    const active = activeSessionForProfile(profile.id);
    const item = document.createElement("article");
    item.className = `profile-item profile-card profile-${profile.kind}`;
    const prelaunchLabel = profile.prelaunchCommand ? " · prelaunch" : "";
    item.innerHTML = `
      <div class="profile-identity">
        <span class="profile-agent-icon">${iconSvg(iconForKind(profile.kind))}</span>
        <div>
          <strong>${escapeHtml(profile.name)}</strong>
          <span>${escapeHtml(agentLabel(profile.kind))} · ${escapeHtml(compactPath(profile.cwd) || "Default folder")}</span>
          <span class="profile-meta">${profile.command ? `Command: ${escapeHtml(profile.command)}` : "Default command"} · ${envCount} env value${envCount === 1 ? "" : "s"}${prelaunchLabel}${active ? " · running" : ""}</span>
        </div>
        <em class="profile-state ${active ? "running" : ""}">${active ? "Running" : "Ready"}</em>
      </div>
      <div class="profile-actions">
        <button data-action="start-profile" data-id="${profile.id}">${state.loadingProfileId === profile.id ? "Starting" : "Start"}</button>
        <button data-action="edit-profile" data-id="${profile.id}">Edit</button>
        <button data-action="open-profile-folder" data-id="${profile.id}">Folder</button>
        <button data-action="delete-profile" data-id="${profile.id}">Delete</button>
      </div>
    `;
    el.profiles.appendChild(item);
    if (state.profileFormMode === "edit" && state.editingProfileId === profile.id) {
      placeProfileForm(el.profiles);
    }
  }
  if (state.profileFormMode === "create") placeProfileForm(el.profileCreateSlot);
  renderCommandTargetOptions();
  renderSettings();
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

function renderSettings() {
  const activeSession = state.sessions.find((session) => ["starting", "running"].includes(session.status)) || state.sessions[0];
  const activeProfile = activeSession?.profileName || activeSession?.name || state.profiles[0]?.name || "";
  if (el.settingsActiveProfile) el.settingsActiveProfile.textContent = activeProfile || "No active profile";
  if (el.settingsActiveProfileBadge) el.settingsActiveProfileBadge.textContent = activeSession?.status || "Idle";
  if (el.settingsTailscale) {
    const text = el.tailscaleUrl?.textContent?.trim();
    el.settingsTailscale.textContent = text && text !== "Not detected" ? text.replace(/^https?:\/\//, "") : "Not detected";
  }
  if (el.settingsLocalUrl) el.settingsLocalUrl.textContent = el.localUrl?.textContent?.trim()?.replace(/^https?:\/\//, "") || "127.0.0.1";
  if (el.settingsThemeLabel) el.settingsThemeLabel.textContent = state.theme === "cream" ? "Manual · Cream" : "System · Dark";
}

function applyTheme(theme) {
  state.theme = theme === "cream" ? "cream" : "dark";
  document.body.dataset.theme = state.theme;
  localStorage.setItem("kael-theme", state.theme);
  renderSettings();
}

function agentLabel(kind) {
  const labels = {
    claude: "Claude Code",
    codex: "Codex CLI",
    powershell: "PowerShell",
    custom: "Custom Tool"
  };
  return labels[kind] || kind;
}

function editProfile(id) {
  const profile = state.profiles.find((item) => item.id === id);
  if (!profile) return;
  state.editingProfileId = id;
  state.profileFormMode = "edit";
  document.getElementById("profilesPanel")?.classList.add("expanded");
  el.profileName.value = profile.name || "";
  el.profileKind.value = profile.kind || "custom";
  el.profileCwd.value = profile.cwd || "";
  el.profileCommand.value = profile.command || "";
  el.profilePrelaunchCommand.value = profile.prelaunchCommand || "";
  el.profileEnv.value = Object.entries(profile.env || {}).map(([key, value]) => `${key}=${value}`).join("\n");
  el.saveProfileBtn.innerHTML = `${iconSvg("approve")}<span>Save</span>`;
  renderProfiles();
  el.profileName.focus();
}

function resetProfileForm() {
  state.editingProfileId = "";
  state.profileFormMode = "";
  el.profileName.value = "";
  el.profileCommand.value = "";
  el.profilePrelaunchCommand.value = "";
  el.profileEnv.value = "";
  el.profileFormWrap.hidden = true;
  el.profileCreateSlot?.appendChild(el.profileFormWrap);
  el.createProfileBtn?.classList.remove("active");
  el.saveProfileBtn.innerHTML = `${iconSvg("approve")}<span>Save</span>`;
  renderProfiles();
}

function applyClaudeProxyPreset() {
  el.profileKind.value = "claude";
  if (!el.profileName.value.trim()) el.profileName.value = "Claude - Local proxy";
  el.profileCommand.value = el.profileCommand.value.trim() || "claude";
  el.profilePrelaunchCommand.value = "uv run uvicorn server:app --host 0.0.0.0 --port 8082";
  const current = parseEnv(el.profileEnv.value);
  const merged = {
    ...current,
    ANTHROPIC_AUTH_TOKEN: current.ANTHROPIC_AUTH_TOKEN || "freecc",
    ANTHROPIC_BASE_URL: current.ANTHROPIC_BASE_URL || "http://localhost:8082",
    CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: current.CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY || "1"
  };
  el.profileEnv.value = Object.entries(merged).map(([key, value]) => `${key}=${value}`).join("\n");
  showToast("Claude proxy preset added. Check the project folder before saving.");
}

function beginCreateProfile() {
  if (state.profileFormMode === "create") {
    resetProfileForm();
    return;
  }
  state.editingProfileId = "";
  state.profileFormMode = "create";
  el.profileName.value = "";
  el.profileKind.value = "codex";
  el.profileCwd.value = "";
  el.profileCommand.value = "";
  el.profileEnv.value = "";
  el.createProfileBtn?.classList.add("active");
  placeProfileForm(el.profileCreateSlot);
  el.profileName.focus();
}

function placeProfileForm(target) {
  if (!el.profileFormWrap || !target) return;
  el.profileFormWrap.hidden = false;
  target.appendChild(el.profileFormWrap);
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
  state.commandTargetValue = `session:${sessionId}`;
  state.activeAgentKind = session?.kind || state.activeAgentKind || "";
  setActiveView("chat");
  renderCommandTargetOptions();
  renderChatHeader();
  void connectChatTerminal(sessionId);
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

function renderChat() {
  const sessionId = state.activeChatSessionId;
  el.chatTerminalEmpty.hidden = Boolean(sessionId);
  if (sessionId) void connectChatTerminal(sessionId);
}

async function connectChatTerminal(sessionId) {
  if (!sessionId || !el.chatTerminalHost) return;
  const term = ensureChatTerminal();
  if (!term) return;
  if (state.terminalSessionId === sessionId) {
    fitChatTerminal();
    return;
  }

  state.terminalSessionId = sessionId;
  term.reset();
  term.writeln(`\x1b[38;2;101;228;189mKAEL OS terminal connected to ${shortId(sessionId)}\x1b[0m`);
  term.writeln("");
  fitChatTerminal();

  try {
    const logs = await api(`/api/sessions/${sessionId}/logs`, { headers: { Accept: "text/plain" } });
    if (state.terminalSessionId === sessionId && logs) {
      term.write(logFileToTerminal(logs), () => {
        scrollTerminalToBottom();
        fitChatTerminal();
      });
    }
  } catch (error) {
    term.writeln(`\r\n\x1b[31m[logs] ${cleanError(error)}\x1b[0m`);
  }
}

function ensureChatTerminal() {
  if (state.terminal) return state.terminal;
  if (!window.Terminal || !window.FitAddon?.FitAddon) {
    if (el.chatTerminalEmpty) {
      el.chatTerminalEmpty.hidden = false;
      el.chatTerminalEmpty.innerHTML = "<strong>Terminal failed to load.</strong><span>Refresh KAEL OS and try again.</span>";
    }
    return null;
  }

  const term = new Terminal({
    convertEol: true,
    cursorBlink: true,
    scrollback: 6000,
    fontFamily: "Cascadia Code, Consolas, monospace",
    fontSize: 13,
    lineHeight: 1.12,
    theme: {
      background: "#11110f",
      foreground: "#f6ead7",
      cursor: "#f4771d",
      selectionBackground: "#4a2a18",
      black: "#0a0b0b",
      blue: "#d98c4c",
      cyan: "#f2c37b",
      green: "#65e4bd",
      magenta: "#c58a5c",
      red: "#d65b63",
      yellow: "#f2c37b",
      white: "#fff4df"
    }
  });
  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(el.chatTerminalHost);
  term.onData((data) => sendRawTerminalInput(data).catch((error) => term.writeln(`\r\n\x1b[31m[input] ${cleanError(error)}\x1b[0m`)));
  state.terminal = term;
  state.terminalFit = fitAddon;
  state.terminalResizeObserver = new ResizeObserver(scheduleFitChatTerminal);
  state.terminalResizeObserver.observe(el.chatTerminalHost);
  el.chatTerminalHost.addEventListener("click", () => term.focus());
  el.chatTerminalHost.addEventListener("touchstart", handleTerminalTouchStart, { passive: true });
  el.chatTerminalHost.addEventListener("touchmove", handleTerminalTouchMove, { passive: false });
  scheduleFitChatTerminal();
  return term;
}

function setAppViewportHeight() {
  document.documentElement.style.setProperty("--app-vh", `${window.innerHeight}px`);
}

function handleViewportResize() {
  setAppViewportHeight();
  scheduleFitChatTerminal();
}

function handleTerminalTouchStart(event) {
  if (!event.touches?.length) return;
  state.terminalTouchY = event.touches[0].clientY;
}

function handleTerminalTouchMove(event) {
  if (!state.terminal || !event.touches?.length) return;
  const nextY = event.touches[0].clientY;
  const delta = state.terminalTouchY - nextY;
  const lineHeight = Math.max(12, Math.round((state.terminal.options.fontSize || 13) * (state.terminal.options.lineHeight || 1.12)));
  const lines = Math.trunc(delta / lineHeight);
  if (!lines) return;
  state.terminal.scrollLines(lines);
  state.terminalTouchY = nextY;
  event.preventDefault();
}

function scheduleFitChatTerminal() {
  if (state.terminalFitQueued) return;
  state.terminalFitQueued = true;
  requestAnimationFrame(() => {
    state.terminalFitQueued = false;
    fitChatTerminal();
  });
}

function fitChatTerminal() {
  if (!state.terminal || !state.terminalFit || !el.chatTerminalHost || el.chatTerminalHost.offsetParent === null) return;
  try {
    const shouldFollow = isTerminalNearBottom(state.terminal);
    state.terminalFit.fit();
    const cols = clampNumber(state.terminal.cols, 20, 300);
    const rows = clampNumber(state.terminal.rows, 5, 120);
    if (state.terminal.cols !== cols || state.terminal.rows !== rows) {
      state.terminal.resize(cols, rows);
    }

    const id = state.activeChatSessionId || state.terminalSessionId;
    if (!id) return;
    if (shouldFollow) state.terminal.scrollToBottom();
    const nextSize = `${id}:${cols}x${rows}`;
    if (state.terminalLastSize === nextSize) return;
    state.terminalLastSize = nextSize;
    api(`/api/sessions/${id}/resize`, {
      method: "POST",
      body: JSON.stringify({ cols, rows })
    }).catch(() => undefined);
  } catch {
    // Early layout can briefly produce a zero-size terminal host.
  }
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

async function sendRawTerminalInput(data) {
  const id = state.activeChatSessionId || state.terminalSessionId;
  if (!id || !data) return;
  await api(`/api/sessions/${id}/raw-input`, {
    method: "POST",
    body: JSON.stringify({ data })
  });
}

function writeChatTerminal(sessionId, chunk) {
  if (!chunk || sessionId !== state.terminalSessionId) return;
  const term = ensureChatTerminal();
  if (!term) return;
  const shouldFollow = isTerminalNearBottom(term);
  term.write(chunk, () => {
    if (shouldFollow) term.scrollToBottom();
  });
}

function isTerminalNearBottom(term = state.terminal) {
  if (!term?.buffer?.active) return true;
  const buffer = term.buffer.active;
  return buffer.baseY - buffer.viewportY <= 2;
}

function scrollTerminalToBottom() {
  state.terminal?.scrollToBottom();
}

function refitChatTerminalSoon() {
  scheduleFitChatTerminal();
  window.setTimeout(scheduleFitChatTerminal, 140);
}

function observeApprovalPrompt(sessionId, chunk) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session || !["codex", "claude"].includes(session.kind)) return;
  const clean = cleanTerminalText(chunk);
  if (!clean.trim()) return;
  const previous = state.outputTextBySession[sessionId] || "";
  const next = compactChatText(`${previous}${clean}`).slice(-5000);
  state.outputTextBySession[sessionId] = next;
  const approval = detectApprovalRequest(next, session);
  if (!approval) return;
  const existing = state.approvalBySession[sessionId];
  if (existing?.signature === approval.signature) return;
  if (state.dismissedApprovalBySession[sessionId] === approval.signature) return;
  const dismissedCursor = state.dismissedApprovalCursorBySession[sessionId] || 0;
  if (dismissedCursor && approval.markerIndex < dismissedCursor) return;
  state.approvalBySession[sessionId] = approval;
  showApprovalPanel(approval);
}

function detectApprovalRequest(text, session) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length < 20) return null;
  const lower = compact.toLowerCase();
  const markerIndex = Math.max(
    lower.lastIndexOf("do you trust"),
    lower.lastIndexOf("trusting the directory"),
    lower.lastIndexOf("do you want"),
    lower.lastIndexOf("would you like"),
    lower.lastIndexOf("permission"),
    lower.lastIndexOf("approve"),
    lower.lastIndexOf("allow")
  );
  const hasNumberedChoices = /1\.\s*(yes|si|sí|continue|approve)/i.test(compact) && /2\.\s*(yes|si|sí|always|all|allow)/i.test(compact);
  const hasDenyChoice = /3\.\s*(no|deny|reject)/i.test(compact) || /\bno,\s*(and|tell|instead|quit)/i.test(compact);
  const codexTrust = /do you trust|trusting the directory|approve|allow|continue/i.test(compact) && /1\.\s*yes|2\.\s*no/i.test(compact);
  const claudePermission = /permission|approve|allow|do you want|would you like|yes.*always|no.*tell/i.test(compact);
  if (!hasNumberedChoices && !codexTrust && !(session.kind === "claude" && claudePermission && hasDenyChoice)) return null;
  return {
    sessionId: session.id,
    kind: session.kind,
    title: `${agentLabel(session.kind)} approval`,
    message: session.kind === "codex" ? "Codex is waiting for a numbered approval choice." : "Claude is waiting for a tool permission choice.",
    markerIndex: Math.max(0, markerIndex),
    signature: `${session.id}:${compact.slice(-700)}`
  };
}

function showApprovalPanel(approval) {
  if (!el.approvalPanel) return;
  el.approvalPanel.hidden = false;
  el.approvalPanel.dataset.sessionId = approval.sessionId;
  el.approvalTitle.textContent = approval.title;
  el.approvalMessage.textContent = approval.message;
  el.approvalInstruction.value = "";
  refitChatTerminalSoon();
  showToast("Agent approval requested.");
}

async function respondToApproval(choice) {
  const sessionId = el.approvalPanel?.dataset.sessionId;
  if (!sessionId) return;
  const instruction = el.approvalInstruction?.value.trim() || "";
  let data = `${choice}\r`;
  if (choice === "3" && instruction) data += `${instruction}\r`;
  await api(`/api/sessions/${sessionId}/raw-input`, {
    method: "POST",
    body: JSON.stringify({ data })
  });
  const approval = state.approvalBySession[sessionId];
  if (approval?.signature) state.dismissedApprovalBySession[sessionId] = approval.signature;
  state.dismissedApprovalCursorBySession[sessionId] = state.outputTextBySession[sessionId]?.length || 0;
  delete state.approvalBySession[sessionId];
  if (el.approvalPanel) el.approvalPanel.hidden = true;
  refitChatTerminalSoon();
  showToast(choice === "3" ? "Denied and sent guidance." : "Approval sent.");
}

function logFileToTerminal(logs) {
  return String(logs)
    .replace(/\[\d{4}-\d{2}-\d{2}T[^\]]+\]\s+\[stdout\]\s*/g, "")
    .replace(/\[\d{4}-\d{2}-\d{2}T[^\]]+\]\s+\[stderr\]\s*/g, "\r\n[stderr] ")
    .replace(/\[\d{4}-\d{2}-\d{2}T[^\]]+\]\s+\[system\]\s*/g, "\r\n\x1b[38;2;245;193;92m[system]\x1b[0m ")
    .replace(/\n/g, "\r\n");
}

function iconForKind(kind) {
  if (kind === "claude") return "claude";
  if (kind === "codex") return "codex";
  if (kind === "powershell") return "terminal";
  if (kind === "custom") return "settings";
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
  if (el.telegramState) el.telegramState.textContent = byName.telegram ? labelService(byName.telegram.status) : "Optional";
  for (const service of services) {
    const item = document.createElement("div");
    item.className = "service-row";
    item.innerHTML = `<strong>${escapeHtml(service.name)}</strong><span>${escapeHtml(labelService(service.status))}</span>`;
    el.services.appendChild(item);
  }
}

async function loadPhoneQr(options = {}) {
  const target = options.target || "tailscale";
  if (options.showPanel !== false && el.phoneQrPanel) el.phoneQrPanel.hidden = false;
  const slots = [el.phoneQrCode, el.accessQrCode, el.sideQrCode].filter(Boolean);
  for (const slot of slots) {
    slot.innerHTML = `<span class="qr-loading">Generating...</span>`;
  }

  try {
    const result = await api(`/api/access/qr?target=${encodeURIComponent(target)}`);
    for (const slot of slots) {
      slot.innerHTML = result.svg;
    }
    renderPhoneAccess(result.displayUrl || result.url);
    if (options.notify === false) return;
    if (result.target === "local") {
      showToast("Tailscale URL not detected yet, QR points to local PC access.", "error");
    } else {
      showToast("Tailscale QR ready.");
    }
  } catch (error) {
    for (const slot of slots) {
      slot.innerHTML = `<span class="qr-loading error">QR failed</span>`;
    }
    showToast(cleanError(error), "error");
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
  if (!canvas) return;
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
  const target = selectedCommandTarget();
  const text = el.promptInput.value.trim();
  if (!target || !text) return;
  state.sendingPrompt = true;
  setBusy(el.sendBtn, true, "Sending...");
  try {
    if (target.type === "profile") {
      await startProfile(target.id, { prompt: text, openChat: true, openWindow: false });
    } else {
      await api(`/api/sessions/${target.id}/input`, {
        method: "POST",
        body: JSON.stringify({ text })
      });
    }
    el.promptInput.value = "";
    showToast(target.type === "profile" ? "Profile started with your prompt." : `Prompt sent to ${shortId(target.id)}.`);
  } finally {
    state.sendingPrompt = false;
    setBusy(el.sendBtn, false);
  }
}

function selectedCommandTarget() {
  const value = state.commandTargetValue || (state.selectedSessionId ? `session:${state.selectedSessionId}` : "");
  const [type, id] = value.split(":");
  if ((type === "session" || type === "profile") && id) return { type, id };
  if (value && state.sessions.some((session) => session.id === value)) return { type: "session", id: value };
  return null;
}

async function sendChatInput() {
  const selectedTarget = selectedCommandTarget();
  const id = state.activeChatSessionId || (selectedTarget?.type === "session" ? selectedTarget.id : "") || state.selectedSessionId;
  const text = el.chatPromptInput.value.trim();
  if (!id || !text) {
    showToast(id ? "Write a prompt first." : "Choose an agent session first.", "error");
    return;
  }
  state.sendingPrompt = true;
  setBusy(el.chatSendBtn, true, "Sending...");
  try {
    const prompt = buildPromptWithAttachments(text);
    await api(`/api/sessions/${id}/input`, {
      method: "POST",
      body: JSON.stringify({ text: prompt })
    });
    el.chatPromptInput.value = "";
    clearAttachments();
    fitChatTerminal();
    scrollTerminalToBottom();
  } catch (error) {
    state.terminal?.writeln(`\r\n\x1b[31m[send] ${cleanError(error)}\x1b[0m`);
    throw error;
  } finally {
    state.sendingPrompt = false;
    setBusy(el.chatSendBtn, false);
  }
}

function buildPromptWithAttachments(text) {
  if (!state.pendingAttachments.length) return text;
  const parts = [text, "", "Attachments:"];
  for (const attachment of state.pendingAttachments) {
    if (attachment.kind === "text") {
      parts.push(`\n--- ${attachment.name} ---\n${attachment.content}\n--- end ${attachment.name} ---`);
    } else if (attachment.kind === "image") {
      parts.push(`\nImage: ${attachment.name} (${attachment.type}, ${formatBytes(attachment.size)})`);
      if (attachment.content) parts.push(attachment.content);
      else parts.push("Image file selected in KAEL OS. If the agent cannot read images from terminal input, open the image locally and describe what you need.");
    }
  }
  return parts.join("\n");
}

async function handleChatFiles(files) {
  const selected = [...files].slice(0, 4);
  const attachments = [];
  for (const file of selected) {
    if (file.type.startsWith("image/")) {
      attachments.push({
        kind: "image",
        name: file.name,
        type: file.type || "image",
        size: file.size,
        content: file.size <= 1_500_000 ? await readFileAsDataUrl(file) : ""
      });
      continue;
    }

    if (file.size > 150_000) {
      attachments.push({
        kind: "text",
        name: file.name,
        type: file.type || "text",
        size: file.size,
        content: `[Skipped: ${file.name} is ${formatBytes(file.size)}. Keep text attachments under 150 KB.]`
      });
      continue;
    }

    attachments.push({
      kind: "text",
      name: file.name,
      type: file.type || "text",
      size: file.size,
      content: await file.text()
    });
  }
  state.pendingAttachments = attachments;
  renderAttachments();
}

function renderAttachments() {
  if (!el.chatAttachmentList) return;
  if (!state.pendingAttachments.length) {
    el.chatAttachmentList.hidden = true;
    el.chatAttachmentList.innerHTML = "";
    return;
  }
  el.chatAttachmentList.hidden = false;
  el.chatAttachmentList.innerHTML = state.pendingAttachments
    .map((attachment, index) => {
      const label = attachment.kind === "image" ? "Image" : "File";
      return `
        <span class="attachment-chip">
          <strong>${label}</strong>
          ${escapeHtml(attachment.name)}
          <small>${escapeHtml(formatBytes(attachment.size))}</small>
          <button type="button" data-remove-attachment="${index}" aria-label="Remove ${escapeHtml(attachment.name)}">x</button>
        </span>
      `;
    })
    .join("");
}

function clearAttachments() {
  state.pendingAttachments = [];
  if (el.chatFileInput) el.chatFileInput.value = "";
  renderAttachments();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("Could not read file.")));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
}

async function openWindow(id = undefined) {
  if (!id) {
    const target = selectedCommandTarget();
    id = target?.type === "session" ? target.id : state.selectedSessionId;
  }
  if (!id) return;
  await api(`/api/sessions/${id}/open-window`, { method: "POST" });
}

async function startProfile(id, options = {}) {
  if (!id) return;
  const active = activeSessionForProfile(id);
  if (active) {
    state.selectedSessionId = active.id;
    if (options.prompt) {
      await api(`/api/sessions/${active.id}/input`, {
        method: "POST",
        body: JSON.stringify({ text: options.prompt })
      });
    }
    if (options.openChat) {
      enterChat(active.id);
    } else {
      openWindow(active.id).catch((error) => showToast(cleanError(error), "error"));
      showToast(`Focused ${active.name}.`);
    }
    return active;
  }
  state.loadingProfileId = id;
  renderProfiles();
  try {
    const result = await api("/api/sessions/start-profile", {
      method: "POST",
      body: JSON.stringify({ profileId: id, openWindow: options.openWindow !== false, prompt: options.prompt })
    });
    state.selectedSessionId = result.session.id;
    if (options.openChat) state.activeChatSessionId = result.session.id;
    showToast(`${result.session.name} started.`);
    await refreshAll();
    if (options.openChat) enterChat(state.selectedSessionId);
    return result.session;
  } catch (error) {
    showToast(cleanError(error), "error");
    appendLog(`[error] ${cleanError(error)}\n`);
    throw error;
  } finally {
    state.loadingProfileId = "";
    renderProfiles();
  }
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
    prelaunchCommand: el.profilePrelaunchCommand.value.trim() || undefined,
    env: parseEnv(el.profileEnv.value)
  };
  if (!payload.name) {
    el.profileName.focus();
    return;
  }
  const editing = Boolean(state.editingProfileId);
  setBusy(el.saveProfileBtn, true, editing ? "Saving..." : "Creating...");
  try {
    await api(editing ? `/api/profiles/${state.editingProfileId}` : "/api/profiles", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    showToast(editing ? "Profile saved." : "Profile created.");
  } finally {
    setBusy(el.saveProfileBtn, false);
  }
  resetProfileForm();
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
      observeApprovalPrompt(message.sessionId, message.chunk);
      writeChatTerminal(message.sessionId, message.chunk);
    }
    if (message.type === "session.status") {
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
  el.setupStatus.textContent = "Creating local config. This can take a few seconds while KAEL starts.";
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

document.getElementById("addToolBtn")?.addEventListener("click", () => {
  setActiveView("profiles");
  document.getElementById("profilesPanel")?.classList.add("expanded");
  beginCreateProfile();
  if (el.profileKind) el.profileKind.value = "custom";
  if (el.profileName && !el.profileName.value.trim()) el.profileName.value = "Custom Tool";
  el.profileCommand?.focus();
  showToast("Create a custom tool profile with its command and working folder.");
});

el.sessions.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === "chat") enterChat(id);
  if (button.dataset.action === "open") openWindow(id).catch((error) => appendLog(`[error] ${cleanError(error)}\n`));
  if (button.dataset.action === "logs") {
    loadLogs(id).then(() => setActiveView("settings")).catch((error) => appendLog(`[error] ${cleanError(error)}\n`));
  }
  if (button.dataset.action === "stop") {
    api(`/api/sessions/${id}/stop`, { method: "POST" }).then(refreshAll).catch((error) => appendLog(`[error] ${cleanError(error)}\n`));
  }
});

el.profiles.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === "start-profile") startProfile(id).catch((error) => showToast(cleanError(error), "error"));
  if (button.dataset.action === "edit-profile") editProfile(id);
  if (button.dataset.action === "open-profile-folder") {
    api(`/api/profiles/${id}/open-folder`, { method: "POST" })
      .then(() => showToast("Opened profile folder in Explorer."))
      .catch((error) => showToast(cleanError(error), "error"));
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
  if (button.dataset.action === "start-profile") startProfile(button.dataset.id, { openChat: true, openWindow: false }).catch((error) => showToast(cleanError(error), "error"));
});

el.commandTargetBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleCommandTargetMenu();
});
el.commandTargetMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-target-value]");
  if (!button) return;
  state.commandTargetValue = button.dataset.targetValue || "";
  const target = selectedCommandTarget();
  if (target?.type === "session") {
    state.selectedSessionId = target.id;
    state.activeChatSessionId = target.id;
    renderChatHeader();
  }
  renderCommandTargetOptions();
  closeCommandTargetMenu();
});
document.addEventListener("click", (event) => {
  if (el.commandTarget?.contains(event.target)) return;
  closeCommandTargetMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCommandTargetMenu();
});

el.saveTokenBtn.addEventListener("click", () => {
  state.token = el.tokenInput.value.trim();
  localStorage.setItem("raw-api-token", state.token);
  location.reload();
});
el.sendBtn.addEventListener("click", () => sendInput().catch((error) => appendLog(`[error] ${cleanError(error)}\n`)));
el.openWindowBtn.addEventListener("click", () => openWindow().catch((error) => appendLog(`[error] ${cleanError(error)}\n`)));
el.chatSendBtn.addEventListener("click", () => sendChatInput().catch((error) => showToast(cleanError(error), "error")));
el.approvalYesBtn?.addEventListener("click", () => respondToApproval("1").catch((error) => showToast(cleanError(error), "error")));
el.approvalAlwaysBtn?.addEventListener("click", () => respondToApproval("2").catch((error) => showToast(cleanError(error), "error")));
el.approvalNoBtn?.addEventListener("click", () => respondToApproval("3").catch((error) => showToast(cleanError(error), "error")));
el.chatPromptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendChatInput().catch((error) => showToast(cleanError(error), "error"));
  }
});
el.chatFileInput?.addEventListener("change", () => handleChatFiles(el.chatFileInput.files || []).catch((error) => showToast(cleanError(error), "error")));
el.chatPromptInput?.addEventListener("paste", (event) => {
  const files = [...(event.clipboardData?.files || [])];
  if (!files.length) return;
  event.preventDefault();
  handleChatFiles(files).catch((error) => showToast(cleanError(error), "error"));
});
el.chatAttachmentList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-remove-attachment]");
  if (!button) return;
  state.pendingAttachments.splice(Number(button.dataset.removeAttachment), 1);
  renderAttachments();
});
el.chatQrBtn.addEventListener("click", () => loadPhoneQr({ showPanel: true }).catch((error) => showToast(cleanError(error), "error")));
el.chatStopBtn.addEventListener("click", () => {
  if (!state.activeChatSessionId) return showToast("Choose an agent first.", "error");
  api(`/api/sessions/${state.activeChatSessionId}/stop`, { method: "POST" }).then(refreshAll).catch((error) => showToast(cleanError(error), "error"));
});
el.chatSwitchProfileBtn.addEventListener("click", () => setActiveView("profiles"));
el.chatAttachBtn.addEventListener("click", () => el.chatFileInput?.click());
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
  beginCreateProfile();
});
el.cancelProfileEditBtn?.addEventListener("click", resetProfileForm);
el.createProfileBtn.addEventListener("click", beginCreateProfile);
el.saveProfileBtn?.addEventListener("click", () => createProfile().catch((error) => appendLog(`[error] ${cleanError(error)}\n`)));
el.claudeProxyPresetBtn?.addEventListener("click", applyClaudeProxyPreset);
el.themeToggleBtn?.addEventListener("click", () => {
  applyTheme(state.theme === "cream" ? "dark" : "cream");
  showToast(state.theme === "cream" ? "Cream theme enabled." : "Dark theme enabled.");
});
el.settingsQrBtn?.addEventListener("click", () => {
  const willOpen = Boolean(el.settingsQrPanel?.hidden);
  if (el.settingsQrPanel) el.settingsQrPanel.hidden = !willOpen;
  if (willOpen) loadPhoneQr({ showPanel: false }).catch((error) => showToast(cleanError(error), "error"));
});
el.settingsTokenBtn?.addEventListener("click", () => {
  document.getElementById("authPanel").hidden = false;
  el.tokenInput.focus();
});
el.telegramFallbackBtn?.addEventListener("click", () => showToast("Telegram fallback is optional. Configure its token from a Telegram profile/env when needed."));
el.lockOnExitBtn?.addEventListener("click", () => {
  el.settingsLockSwitch?.classList.toggle("on");
  showToast(el.settingsLockSwitch?.classList.contains("on") ? "Lock on exit enabled." : "Lock on exit disabled.");
});
window.addEventListener("resize", handleViewportResize);
window.visualViewport?.addEventListener("resize", handleViewportResize);

initialize().catch((error) => {
  setConnected(false);
  appendLog(`[error] ${cleanError(error)}\n`);
});
