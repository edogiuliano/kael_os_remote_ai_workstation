import { Router } from "express";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import QRCode from "qrcode";
import type { RuntimePaths } from "../runtime/paths.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { detectTailscaleIp } from "../integrations/tailscale.js";
import { getServiceHealth, getSystemStats } from "../integrations/systemStats.js";
import { listPlugins } from "../integrations/pluginRegistry.js";
import { captureWindowsScreenshot } from "../integrations/screenshot.js";
import type { SessionManager } from "../sessions/SessionManager.js";
import type { ProfileStore } from "../sessions/ProfileStore.js";
import { mergeProfileEnv } from "../sessions/ProfileStore.js";
import { desktopBridge } from "../desktopBridge.js";
import type { AgentProfileInput, SessionCreateRequest, WorkstationStatus } from "../types.js";

const CreateSessionSchema = z.object({
  kind: z.enum(["powershell", "codex", "claude", "custom"]),
  name: z.string().min(1).optional(),
  cwd: z.string().min(1).optional(),
  command: z.string().min(1).optional(),
  args: z.array(z.string()).optional(),
  prompt: z.string().optional(),
  env: z.record(z.string()).optional(),
  profileId: z.string().optional(),
  profileName: z.string().optional(),
  reuseExisting: z.boolean().optional()
});

const InputSchema = z.object({
  text: z.string().min(1)
});

const RawInputSchema = z.object({
  data: z.string().min(1).max(10_000)
});

const ResizeSchema = z.object({
  cols: z.number().int().min(20).max(300),
  rows: z.number().int().min(5).max(120)
});

const ProfileSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["powershell", "codex", "claude", "custom"]),
  cwd: z.string().min(1).optional(),
  command: z.string().min(1).optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional()
});

const StartProfileSchema = z.object({
  profileId: z.string().min(1),
  prompt: z.string().optional(),
  openWindow: z.boolean().optional()
});

export function createApiRouter(sessionManager: SessionManager, profileStore: ProfileStore, paths: RuntimePaths): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, uptimeSec: Math.round(process.uptime()) });
  });

  router.get("/setup/status", (_req, res) => {
    res.json({
      configured: Boolean(config.apiToken && config.telegram.token && config.telegram.allowedChatIds.length > 0 && config.telegram.streamChatId),
      apiTokenConfigured: Boolean(config.apiToken),
      telegramConfigured: Boolean(config.telegram.token),
      telegramChatConfigured: config.telegram.allowedChatIds.length > 0,
      telegramStreamConfigured: Boolean(config.telegram.streamChatId)
    });
  });

  router.get("/access/qr", async (req, res, next) => {
    try {
      const target = req.query.target === "local" ? "local" : "tailscale";
      const localUrl = `http://127.0.0.1:${config.port}`;
      const tailscaleIp = target === "tailscale" ? await withStatusTimeout("Tailscale QR detection", detectTailscaleIp(), undefined, 2500) : undefined;
      const url = target === "tailscale" && tailscaleIp ? `http://${tailscaleIp}:${config.port}` : localUrl;
      const mobileUrl = appendFragmentToken(url);
      const svg = await QRCode.toString(mobileUrl, {
        type: "svg",
        margin: 1,
        width: 180,
        color: {
          dark: "#04242b",
          light: "#e9fff8"
        }
      });
      res.json({ url: mobileUrl, displayUrl: url, target: tailscaleIp ? target : "local", svg });
    } catch (error) {
      next(error);
    }
  });

  router.get("/status", async (_req, res, next) => {
    try {
      res.json(await buildStatus(sessionManager));
    } catch (error) {
      next(error);
    }
  });

  router.get("/sessions", (req, res) => {
    const scope = req.query.scope === "active" || req.query.scope === "history" || req.query.scope === "all" ? req.query.scope : "all";
    res.json({ sessions: sessionManager.list(scope) });
  });

  router.post("/sessions", async (req, res, next) => {
    try {
      const body = CreateSessionSchema.parse(req.body) satisfies SessionCreateRequest;
      const session = await sessionManager.create(body);
      res.status(201).json({ session });
    } catch (error) {
      next(error);
    }
  });

  router.post("/sessions/start-profile", async (req, res, next) => {
    try {
      const body = StartProfileSchema.parse(req.body);
      const profile = profileStore.get(body.profileId);
      if (!profile) throw new Error(`Profile ${body.profileId} was not found.`);
      const session = await sessionManager.create({
        kind: profile.kind,
        name: profile.name,
        cwd: profile.cwd,
        command: profile.command,
        args: profile.args,
        env: mergeProfileEnv(profile),
        prompt: body.prompt,
        profileId: profile.id,
        profileName: profile.name,
        reuseExisting: true
      });
      if (body.openWindow) desktopBridge.emitOpenSessionWindow(session.id);
      res.status(201).json({ session });
    } catch (error) {
      next(error);
    }
  });

  router.get("/sessions/:id/logs", async (req, res, next) => {
    try {
      const logs = await sessionManager.readLogs(req.params.id);
      res.type("text/plain").send(logs);
    } catch (error) {
      next(error);
    }
  });

  router.post("/sessions/:id/input", (req, res, next) => {
    try {
      const body = InputSchema.parse(req.body);
      const session = sessionManager.input(req.params.id, body.text);
      res.json({ session });
    } catch (error) {
      next(error);
    }
  });

  router.post("/sessions/:id/raw-input", (req, res, next) => {
    try {
      const body = RawInputSchema.parse(req.body);
      const session = sessionManager.rawInput(req.params.id, body.data);
      res.json({ session });
    } catch (error) {
      next(error);
    }
  });

  router.post("/sessions/:id/resize", (req, res, next) => {
    try {
      const body = ResizeSchema.parse(req.body);
      const session = sessionManager.resize(req.params.id, body.cols, body.rows);
      res.json({ session });
    } catch (error) {
      next(error);
    }
  });

  router.post("/sessions/:id/stop", (req, res, next) => {
    try {
      const session = sessionManager.stop(req.params.id);
      res.json({ session });
    } catch (error) {
      next(error);
    }
  });

  router.post("/sessions/:id/open-window", (req, res, next) => {
    try {
      const session = sessionManager.get(req.params.id);
      if (!session) throw new Error(`Session ${req.params.id} was not found.`);
      desktopBridge.emitOpenSessionWindow(session.id);
      res.json({ session });
    } catch (error) {
      next(error);
    }
  });

  router.post("/sessions/stop-all", (_req, res, next) => {
    try {
      res.json({ sessions: sessionManager.stopAll() });
    } catch (error) {
      next(error);
    }
  });

  router.post("/sessions/clear-failed", async (_req, res, next) => {
    try {
      await sessionManager.clearFailed();
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/sessions/clear-history", async (_req, res, next) => {
    try {
      await sessionManager.clearHistory();
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/sessions/:id/restart", async (req, res, next) => {
    try {
      const session = await sessionManager.restart(req.params.id);
      res.json({ session });
    } catch (error) {
      next(error);
    }
  });

  router.get("/files/log/:id", async (req, res, next) => {
    try {
      const session = sessionManager.get(req.params.id);
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      const content = await readFile(session.logPath, "utf8");
      res.attachment(`${session.id}.log`).send(content);
    } catch (error) {
      next(error);
    }
  });

  router.post("/screenshot", async (_req, res, next) => {
    try {
      const file = await captureWindowsScreenshot(paths);
      res.json({ file });
    } catch (error) {
      next(error);
    }
  });

  router.get("/profiles", (_req, res) => {
    res.json({ profiles: profileStore.list(true) });
  });

  router.post("/profiles", async (req, res, next) => {
    try {
      const body = ProfileSchema.parse(req.body) satisfies AgentProfileInput;
      const profile = await profileStore.create(body);
      res.status(201).json({ profile });
    } catch (error) {
      next(error);
    }
  });

  router.put("/profiles/:id", async (req, res, next) => {
    try {
      const body = ProfileSchema.parse(req.body) satisfies AgentProfileInput;
      const profile = await profileStore.update(req.params.id, body);
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/profiles/:id", async (req, res, next) => {
    try {
      await profileStore.delete(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function appendFragmentToken(url: string): string {
  if (!config.apiToken) return url;
  return `${url}/#token=${encodeURIComponent(config.apiToken)}`;
}

export async function buildStatus(sessionManager: SessionManager): Promise<WorkstationStatus> {
  const [tailscaleIp, system, services] = await Promise.all([
    withStatusTimeout("Tailscale detection", detectTailscaleIp(), undefined, 2500),
    withStatusTimeout(
      "System status",
      getSystemStats(),
      {
        cpuLoad: 0,
        memoryUsedPct: 0,
        memoryUsedGb: 0,
        memoryTotalGb: 0
      },
      3000
    ),
    withStatusTimeout("Service health", getServiceHealth(), [], 2500)
  ]);
  const localUrl = `http://127.0.0.1:${config.port}`;
  return {
    app: {
      name: "KAEL OS",
      version: "0.1.0",
      nodeEnv: config.nodeEnv,
      uptimeSec: Math.round(process.uptime())
    },
    access: {
      localUrl,
      tailscaleIp,
      tailscaleUrl: tailscaleIp ? `http://${tailscaleIp}:${config.port}` : undefined
    },
    system,
    sessions: sessionManager.list("active"),
    services,
    plugins: listPlugins().map((plugin) => `${plugin.name}:${plugin.status}`)
  };
}

async function withStatusTimeout<T>(label: string, promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise.catch((error) => {
        logger.warn({ error }, `${label} failed`);
        return fallback;
      }),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          logger.warn({ ms }, `${label} timed out`);
          resolve(fallback);
        }, ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
