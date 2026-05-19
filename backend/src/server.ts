import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { createRuntimePaths, ensureRuntimePaths } from "./runtime/paths.js";
import { SessionManager } from "./sessions/SessionManager.js";
import { ProfileStore } from "./sessions/ProfileStore.js";
import { createApp } from "./app.js";
import { WsHub } from "./ws/WsHub.js";
import { buildStatus } from "./http/routes.js";
import { TelegramBotController } from "./integrations/telegram/TelegramBot.js";

export interface WorkstationServerHandle {
  url: string;
  port: number;
  stop: () => Promise<void>;
}

export async function startWorkstationServer(): Promise<WorkstationServerHandle> {
  logger.info("Starting KAEL OS backend");
  const paths = createRuntimePaths();
  await ensureRuntimePaths(paths);
  logger.debug({ paths }, "Runtime paths ready");

  const sessionManager = new SessionManager(paths);
  const profileStore = new ProfileStore(paths);
  await sessionManager.load();
  logger.debug("Session history loaded");
  await profileStore.load();
  logger.debug("Profiles loaded");

  const app = createApp(sessionManager, profileStore, paths);
  const server = http.createServer(app);
  const wsHub = new WsHub(server);
  const telegram = new TelegramBotController(sessionManager, profileStore, paths);
  logger.debug("HTTP, WebSocket, and integration services initialized");

  sessionManager.on("output", (event) => wsHub.broadcast(event));
  sessionManager.on("output", (event) => wsHub.broadcast({ type: "session.data", sessionId: event.sessionId, chunk: event.chunk, at: event.at }));
  sessionManager.on("status", (session) => wsHub.broadcast({ type: "session.status", session }));

  const statusTimer = setInterval(async () => {
    try {
      wsHub.broadcast({ type: "status", status: await buildStatus(sessionManager), at: new Date().toISOString() });
    } catch (error) {
      logger.warn({ error }, "Failed to broadcast status");
    }
  }, 5000);
  statusTimer.unref();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    logger.debug({ host: config.host, port: config.port }, "Opening HTTP listener");
    server.listen(config.port, config.host, () => {
      server.off("error", reject);
      logger.info({ host: config.host, port: config.port }, "KAEL OS listening");
      resolve();
    });
  });

  void telegram.start().catch((error) => {
    logger.warn({ error }, "Telegram bot did not start; KAEL OS will continue without Telegram notifications");
  });

  const stop = async () => {
    logger.info("Shutting down");
    clearInterval(statusTimer);
    await telegram.stop();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };

  return {
    url: `http://127.0.0.1:${config.port}`,
    port: config.port,
    stop
  };
}

async function main(): Promise<void> {
  const handle = await startWorkstationServer();

  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Received shutdown signal");
    await handle.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (entryPath && entryPath === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    logger.fatal({ error }, "Fatal startup error");
    process.exit(1);
  });
}
