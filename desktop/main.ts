import { app, BrowserWindow, dialog, ipcMain, shell, type OpenDialogOptions } from "electron";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { WorkstationServerHandle } from "../backend/src/server.js";
import { desktopBridge } from "../backend/src/desktopBridge.js";

interface FirstRunConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  port?: number;
  tailscalePath?: string;
}

interface SetupStatus {
  configured: boolean;
  apiToken?: string;
  tailscalePath?: string;
  configPath: string;
  userDataPath: string;
  serverUrl: string;
}

let mainWindow: BrowserWindow | undefined;
let serverHandle: WorkstationServerHandle | undefined;
const sessionWindows = new Map<string, BrowserWindow>();

const dirname = path.dirname(fileURLToPath(import.meta.url));
app.setName("KAEL OS");

function legacyUserDataPath(): string {
  return path.join(app.getPath("appData"), "Remote AI Workstation");
}

function appPath(...segments: string[]): string {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), ...segments);
  }
  return path.join(process.cwd(), ...segments);
}

function frontendIndexPath(): string {
  return appPath("frontend", "index.html");
}

function configPath(): string {
  return path.join(app.getPath("userData"), ".env");
}

async function copyIfMissing(source: string, destination: string): Promise<void> {
  if (!existsSync(source) || existsSync(destination)) return;
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true });
}

async function migrateLegacyUserData(): Promise<void> {
  const legacyRoot = legacyUserDataPath();
  const currentRoot = app.getPath("userData");
  if (legacyRoot === currentRoot || !existsSync(legacyRoot)) return;

  await copyIfMissing(path.join(legacyRoot, ".env"), path.join(currentRoot, ".env"));
  await copyIfMissing(path.join(legacyRoot, "profiles.json"), path.join(currentRoot, "profiles.json"));
  await copyIfMissing(path.join(legacyRoot, "sessions"), path.join(currentRoot, "sessions"));
  await writeDesktopLog("Legacy user data migration checked", { legacyRoot, currentRoot });
}

function desktopLogPath(): string {
  return path.join(app.getPath("userData"), "logs", "desktop.log");
}

function serverUrl(port = 8787): string {
  return `http://127.0.0.1:${port}`;
}

async function getConfiguredApiToken(): Promise<string | undefined> {
  const env = await readEnvFile();
  return env.API_TOKEN;
}

async function readEnvFile(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(configPath(), "utf8");
    return Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        })
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function writeDesktopLog(message: string, extra?: unknown): Promise<void> {
  const line = `[${new Date().toISOString()}] ${message}${extra ? ` ${JSON.stringify(extra)}` : ""}\n`;
  try {
    await fs.mkdir(path.dirname(desktopLogPath()), { recursive: true });
    await fs.appendFile(desktopLogPath(), line, "utf8");
  } catch {
    // Logging must never block app startup.
  }
}

function serializeEnvValue(value: string): string {
  return value.replaceAll("\r", "").replaceAll("\n", "");
}

async function getSetupStatus(): Promise<SetupStatus> {
  const env = await readEnvFile();
  const port = Number(env.PORT || 8787);
  return {
    configured: Boolean(env.API_TOKEN),
    apiToken: env.API_TOKEN,
    tailscalePath: env.TAILSCALE_COMMAND,
    configPath: configPath(),
    userDataPath: app.getPath("userData"),
    serverUrl: serverUrl(Number.isFinite(port) ? port : 8787)
  };
}

function findStandardTailscalePath(): string | undefined {
  const candidates = [
    process.env.TAILSCALE_COMMAND,
    "C:\\Program Files\\Tailscale\\tailscale.exe",
    "C:\\Program Files (x86)\\Tailscale\\tailscale.exe"
  ].filter((value): value is string => Boolean(value));
  return candidates.find((candidate) => {
    return existsSync(candidate);
  });
}

function validateFirstRunConfig(payload: FirstRunConfig): Required<FirstRunConfig> {
  const telegramBotToken = payload.telegramBotToken?.trim() || "";
  const telegramChatId = payload.telegramChatId?.trim() || "";
  const tailscalePath = payload.tailscalePath?.trim() || "";
  const port = payload.port || 8787;

  if (telegramBotToken && (telegramBotToken.length < 20 || !telegramBotToken.includes(":"))) {
    throw new Error("Telegram bot token must look like 123456:ABC.");
  }

  if (telegramChatId && !/^-?\d+$/.test(telegramChatId)) {
    throw new Error("Telegram chat id must be numeric.");
  }

  if ((telegramBotToken && !telegramChatId) || (!telegramBotToken && telegramChatId)) {
    throw new Error("Telegram is optional, but token and chat id must be provided together.");
  }

  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("Port must be an integer between 1024 and 65535.");
  }

  if (tailscalePath && !tailscalePath.toLowerCase().endsWith("tailscale.exe")) {
    throw new Error("Custom Tailscale path must point to tailscale.exe.");
  }

  return { telegramBotToken, telegramChatId, port, tailscalePath };
}

async function saveFirstRunConfig(payload: FirstRunConfig): Promise<SetupStatus> {
  const config = validateFirstRunConfig(payload);
  const apiToken = crypto.randomBytes(24).toString("hex");
  const tailscalePath = config.tailscalePath || findStandardTailscalePath() || "";
  const content = [
    "NODE_ENV=production",
    "HOST=0.0.0.0",
    `PORT=${config.port}`,
    `API_TOKEN=${apiToken}`,
    "",
    `TELEGRAM_BOT_TOKEN=${config.telegramBotToken}`,
    `TELEGRAM_ALLOWED_CHAT_IDS=${config.telegramChatId}`,
    `TELEGRAM_STREAM_CHAT_ID=${config.telegramChatId}`,
    "DISCORD_WEBHOOK_URL=",
    "",
    "CODEX_COMMAND=codex",
    "CLAUDE_COMMAND=claude",
    "POWERSHELL_COMMAND=powershell.exe",
    tailscalePath ? `TAILSCALE_COMMAND=${serializeEnvValue(tailscalePath)}` : "",
    "",
    "COMFYUI_URL=http://127.0.0.1:8188",
    "OLLAMA_URL=http://127.0.0.1:11434",
    ""
  ].join("\n");

  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(configPath(), content, "utf8");
  await fs.chmod(configPath(), 0o600).catch(() => undefined);
  await withTimeout(startBackend(), 12000, "Config was saved, but the backend did not finish starting. Use Retry or Reconfigure.");
  return getSetupStatus();
}

async function startBackend(): Promise<WorkstationServerHandle> {
  if (serverHandle) return serverHandle;

  process.env.WORKSTATION_ENV_PATH = configPath();
  process.env.WORKSTATION_DATA_DIR = app.getPath("userData");
  process.env.WORKSTATION_FRONTEND_DIR = appPath("frontend");
  process.env.WORKSTATION_NODE_MODULES_DIR = appPath("node_modules");
  process.env.WORKSTATION_DEFAULT_CWD = path.join(app.getPath("documents"), "KAEL OS");

  const serverModuleUrl = app.isPackaged
    ? pathToFileURL(path.join(app.getAppPath(), "dist", "backend", "src", "server.js")).href
    : pathToFileURL(path.join(dirname, "..", "backend", "src", "server.js")).href;
  await writeDesktopLog("Starting backend", { serverModuleUrl, configPath: configPath() });
  const serverModule = (await import(serverModuleUrl)) as typeof import("../backend/src/server.js");
  serverHandle = await serverModule.startWorkstationServer();
  await waitForBackendHealth(serverHandle.url);
  return serverHandle;
}

async function waitForBackendHealth(url: string): Promise<void> {
  const env = await readEnvFile();
  const headers = env.API_TOKEN ? { Authorization: `Bearer ${env.API_TOKEN}` } : undefined;
  const healthUrl = `${url}/api/health`;
  let lastError = "";

  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(healthUrl, { headers });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = (error as Error).message;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`Backend did not become healthy: ${lastError}`);
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function showStartupError(error: unknown): Promise<void> {
  await writeDesktopLog("Startup failed", { message: error instanceof Error ? error.message : String(error) });
  if (!mainWindow) return;
  await mainWindow.loadFile(frontendIndexPath(), {
    query: {
      desktopError: error instanceof Error ? error.message : String(error),
      desktopLog: desktopLogPath()
    }
  });
}

async function openDashboard(): Promise<void> {
  try {
    const status = await getSetupStatus();
    if (!mainWindow) return;

    if (!status.configured) {
      await mainWindow.loadFile(frontendIndexPath(), { query: { desktopSetup: "1" } });
      return;
    }

    await startBackend();
    await mainWindow.loadURL(status.serverUrl);
  } catch (error) {
    await showStartupError(error);
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 720,
    minHeight: 620,
    title: "KAEL OS",
    backgroundColor: "#0b0f14",
    autoHideMenuBar: true,
    webPreferences: {
      preload: appPath("dist", "desktop", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      void writeDesktopLog("Renderer console", { level, message, line, sourceId });
    }
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    void writeDesktopLog("Renderer failed to load", { errorCode, errorDescription, validatedURL });
  });

  void openDashboard();
}

async function openSessionWindow(sessionId: string): Promise<void> {
  const existing = sessionWindows.get(sessionId);
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore();
    existing.focus();
    return;
  }

  const status = await getSetupStatus();
  const token = await getConfiguredApiToken();
  const terminalWindow = new BrowserWindow({
    width: 980,
    height: 680,
    minWidth: 520,
    minHeight: 420,
    title: `Remote AI Terminal - ${sessionId.slice(0, 8)}`,
    backgroundColor: "#090d12",
    autoHideMenuBar: true,
    webPreferences: {
      preload: appPath("dist", "desktop", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  sessionWindows.set(sessionId, terminalWindow);
  terminalWindow.on("closed", () => {
    sessionWindows.delete(sessionId);
  });

  const url = new URL(`${status.serverUrl}/terminal.html`);
  url.searchParams.set("sessionId", sessionId);
  if (token) url.searchParams.set("token", token);
  await terminalWindow.loadURL(url.toString());
}

desktopBridge.onOpenSessionWindow((sessionId) => {
  void openSessionWindow(sessionId).catch((error) => writeDesktopLog("Failed to open session window", { sessionId, message: error.message }));
});

ipcMain.handle("workstation:getSetupStatus", () => getSetupStatus());
ipcMain.handle("workstation:saveFirstRunConfig", (_event, payload: FirstRunConfig) => saveFirstRunConfig(payload));
ipcMain.handle("workstation:getAppPaths", () => ({
  configPath: configPath(),
  userDataPath: app.getPath("userData"),
  frontendPath: appPath("frontend"),
  desktopLogPath: desktopLogPath()
}));
ipcMain.handle("workstation:detectTailscalePath", () => findStandardTailscalePath());
ipcMain.handle("workstation:chooseTailscalePath", async () => {
  const options: OpenDialogOptions = {
    title: "Select tailscale.exe",
    filters: [{ name: "Tailscale", extensions: ["exe"] }],
    properties: ["openFile"]
  };
  const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
  if (result.canceled) return undefined;
  return result.filePaths[0];
});
ipcMain.handle("workstation:retryStartup", async () => {
  await openDashboard();
  return getSetupStatus();
});
ipcMain.handle("workstation:resetSetup", async () => {
  if (serverHandle) {
    const handle = serverHandle;
    serverHandle = undefined;
    await handle.stop().catch(() => undefined);
  }
  await fs.rm(configPath(), { force: true });
  await openDashboard();
  return getSetupStatus();
});

app.whenReady().then(async () => {
  await writeDesktopLog("Electron ready", { packaged: app.isPackaged, appPath: app.getAppPath() });
  await migrateLegacyUserData();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", async (event) => {
  if (!serverHandle) return;
  event.preventDefault();
  const handle = serverHandle;
  serverHandle = undefined;
  await handle.stop();
  app.quit();
});
