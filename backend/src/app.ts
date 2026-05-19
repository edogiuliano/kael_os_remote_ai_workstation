import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import type { RuntimePaths } from "./runtime/paths.js";
import { requireAuth } from "./http/auth.js";
import { createApiRouter } from "./http/routes.js";
import type { SessionManager } from "./sessions/SessionManager.js";
import type { ProfileStore } from "./sessions/ProfileStore.js";
import { logger } from "./logger.js";

export function createApp(sessionManager: SessionManager, profileStore: ProfileStore, paths: RuntimePaths): express.Express {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.use(express.static(paths.frontend));
  app.use("/vendor/xterm", express.static(path.join(paths.nodeModules, "@xterm", "xterm")));
  app.use("/vendor/xterm-addon-fit", express.static(path.join(paths.nodeModules, "@xterm", "addon-fit")));
  app.use("/api", requireAuth, createApiRouter(sessionManager, profileStore, paths));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(paths.frontend, "index.html"));
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error }, "HTTP request failed");
    res.status(400).json({ error: message });
  });

  return app;
}
