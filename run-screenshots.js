import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const port = process.env.SCREENSHOT_PORT || "8878";
const baseUrl = `http://127.0.0.1:${port}`;
const screenshotDir = path.resolve("screenshots");

const demoSessions = [
  {
    id: "codex-demo-session",
    kind: "codex",
    name: "proyecto",
    status: "running",
    profileId: "codex-demo-profile",
    profileName: "proyecto",
    cwd: "C:\\Users\\kael\\Desktop\\client-console"
  }
];

const demoProfiles = [
  {
    id: "claude-demo-profile",
    name: "claudio",
    kind: "claude",
    cwd: "C:\\Users\\kael\\Desktop\\client-console",
    command: "claude",
    args: [],
    env: { MODEL_ROUTER: "local", CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: "1" }
  },
  {
    id: "codex-demo-profile",
    name: "proyecto",
    kind: "codex",
    cwd: "C:\\Users\\kael\\Desktop\\client-console",
    command: "codex",
    args: [],
    env: { OPENAI_BASE_URL: "http://127.0.0.1:11434/v1" }
  },
  {
    id: "utility-demo-profile",
    name: "local tools",
    kind: "custom",
    cwd: "C:\\Users\\kael\\Desktop\\automation",
    command: "powershell.exe",
    args: [],
    env: {}
  }
];

function startServer() {
  const child = spawn("npm run dev", {
    cwd: process.cwd(),
    env: { ...process.env, PORT: port, API_TOKEN: "demo-screenshot-token" },
    shell: true,
    stdio: "pipe"
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

function stopServer(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill("SIGTERM");
}

async function waitForServer(timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`KAEL OS did not start at ${baseUrl}`);
}

async function installDemoRoutes(page) {
  await page.route("**/api/status", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        app: { name: "KAEL OS", version: "0.1.0", nodeEnv: "demo", uptimeSec: 7240 },
        access: {
          localUrl: "http://127.0.0.1:8878",
          tailscaleIp: "100.114.4.91",
          tailscaleUrl: "http://100.114.4.91:8878"
        },
        system: {
          cpuLoad: 33,
          memoryUsedPct: 45,
          memoryUsedGb: 14.4,
          memoryTotalGb: 31.9,
          disk: { usedPct: 51 },
          gpu: {
            model: "NVIDIA GeForce RTX 4060",
            loadPct: 32,
            memoryUsedMb: 1320,
            memoryTotalMb: 8188,
            temperatureC: 52
          }
        },
        sessions: demoSessions,
        services: [
          { name: "ComfyUI", url: "http://127.0.0.1:8188", status: "available", details: "ready" },
          { name: "Ollama", url: "http://127.0.0.1:11434", status: "unavailable", details: "offline" },
          { name: "Discord webhook", status: "not_configured", details: "setup needed" }
        ],
        plugins: ["agent-sessions:ready", "tailscale:private"]
      })
    })
  );
  await page.route("**/api/profiles", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profiles: demoProfiles }) })
  );
  await page.route("**/api/sessions/codex-demo-session/logs", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: [
        "[system] KAEL OS terminal connected",
        "[system] Profile proyecto started in C:\\Users\\kael\\Desktop\\client-console",
        "> OpenAI Codex (demo)",
        "model: gpt-5.5 high",
        "directory: ~\\Desktop\\client-console",
        "",
        "gpt-5.5 high - ready for prompts, images and repo work"
      ].join("\n")
    })
  );
  await page.route("**/api/sessions/codex-demo-session/resize", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  );
  await page.route("**/api/access/qr?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "http://100.114.4.91:8878/#token=demo",
        displayUrl: "http://100.114.4.91:8878",
        target: "tailscale",
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="#e9fff8"/><path fill="#04242b" d="M12 12h42v42H12zM66 12h12v12H66zM90 12h12v12H90zM126 12h42v42h-42zM24 24v18h18V24zm138 0h-18v18h18zM12 66h12v12H12zm36 0h24v12H48zm48 0h36v12H96zm54 0h18v12h-18zM30 84h18v18H30zm66 0h12v12H96zm24 0h30v18h-30zM12 114h42v42H12zm66 0h18v18H78zm36 0h12v12h-12zm30 0h24v12h-24zM24 126v18h18v-18zm66 42h12v-24H90zm24-30h54v12h-54zm36 24h18v-18h-18z"/></svg>`
      })
    })
  );
}

async function preparePage(browser, viewport, theme = "dark") {
  const page = await browser.newPage({ viewport });
  await installDemoRoutes(page);
  await page.addInitScript(
    ({ selectedTheme }) => {
      localStorage.setItem("raw-api-token", "demo-screenshot-token");
      localStorage.setItem("kael-theme", selectedTheme);
    },
    { selectedTheme: theme }
  );
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("#commandTargetBtn", { timeout: 15000 });
  await page.waitForTimeout(600);
  return page;
}

async function setView(page, view) {
  await page.locator(`button[data-view="${view}"]:visible`).first().click();
  await page.mouse.move(1000, 720);
  await page.waitForTimeout(600);
}

async function capture(page, fileName, options = {}) {
  const filePath = path.join(screenshotDir, fileName);
  await page.screenshot({ path: filePath, fullPage: options.fullPage ?? false });
  console.log(`Saved ${filePath}`);
}

async function main() {
  mkdirSync(screenshotDir, { recursive: true });
  const server = startServer();

  try {
    await waitForServer();
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const browser = await chromium.launch({
      headless: true,
      executablePath: existsSync(chromePath) ? chromePath : undefined
    });

    const dashboard = await preparePage(browser, { width: 1365, height: 850 }, "dark");
    await capture(dashboard, "dashboard.png");

    await dashboard.click("#commandTargetBtn");
    await dashboard.waitForTimeout(250);
    await capture(dashboard, "command-deck.png");
    await dashboard.close();

    const profiles = await preparePage(browser, { width: 1180, height: 760 }, "cream");
    await setView(profiles, "profiles");
    await capture(profiles, "profiles-light.png");
    await profiles.close();

    const terminal = await preparePage(browser, { width: 1180, height: 760 }, "dark");
    await setView(terminal, "chat");
    await terminal.waitForTimeout(900);
    await capture(terminal, "chat-terminal.png");
    await terminal.close();

    const phone = await preparePage(browser, { width: 390, height: 844 }, "cream");
    await setView(phone, "settings");
    await phone.click("#settingsQrBtn");
    await phone.waitForTimeout(900);
    await capture(phone, "phone-more.png", { fullPage: true });
    await phone.close();

    await browser.close();
  } finally {
    stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
