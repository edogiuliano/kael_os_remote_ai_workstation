import { EventEmitter } from "node:events";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { ManagedSession, isTerminalStatus } from "./ManagedSession.js";
import { resolveLaunchSpec } from "./CommandCatalog.js";
import type { RuntimePaths } from "../runtime/paths.js";
import type { SessionCreateRequest, SessionOutputEvent, SessionSnapshot, SessionStatus } from "../types.js";

export type SessionListScope = "active" | "history" | "all";

export class SessionManager extends EventEmitter {
  private readonly running = new Map<string, ManagedSession>();
  private readonly history = new Map<string, SessionSnapshot>();
  private readonly launchCooldown = new Map<string, number>();
  private readonly indexPath: string;

  constructor(private readonly paths: RuntimePaths) {
    super();
    this.indexPath = path.join(paths.sessions, "index.json");
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.indexPath, "utf8");
      const sessions = JSON.parse(raw) as SessionSnapshot[];
      for (const session of sessions) {
        this.history.set(session.id, {
          ...session,
          status: isTerminalStatus(session.status) ? session.status : "stopped",
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  list(scope: SessionListScope = "all"): SessionSnapshot[] {
    const sessions = new Map(this.history);
    for (const [id, session] of this.running.entries()) {
      sessions.set(id, session.toJSON());
    }
    return [...sessions.values()]
      .filter((session) => {
        if (scope === "active") return isActiveStatus(session.status);
        if (scope === "history") return !isActiveStatus(session.status);
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string): SessionSnapshot | undefined {
    return this.running.get(id)?.toJSON() ?? this.history.get(id);
  }

  async create(request: SessionCreateRequest): Promise<SessionSnapshot> {
    const reusable = request.reuseExisting !== false ? this.findReusableSession(request) : undefined;
    if (reusable) return reusable;

    this.assertLaunchAllowed(request);
    const launch = resolveLaunchSpec(request);
    const id = randomUUID();
    const logPath = path.join(this.paths.logs, `${id}.log`);
    const session = new ManagedSession(id, launch, logPath);

    session.on("output", (event: SessionOutputEvent) => this.emit("output", event));
    session.on("status", (snapshot: SessionSnapshot) => {
      if (isTerminalStatus(snapshot.status)) {
        this.running.delete(snapshot.id);
      }
      this.history.set(snapshot.id, snapshot);
      void this.persist();
      this.emit("status", snapshot);
    });

    this.running.set(id, session);
    const snapshot = session.start();
    this.history.set(id, snapshot);
    await this.persist();
    return snapshot;
  }

  input(id: string, text: string): SessionSnapshot {
    const session = this.running.get(id);
    if (!session) throw new Error(`Session ${id} is not running.`);
    session.input(text);
    return session.toJSON();
  }

  rawInput(id: string, data: string): SessionSnapshot {
    const session = this.running.get(id);
    if (!session) throw new Error(`Session ${id} is not running.`);
    session.rawInput(data);
    return session.toJSON();
  }

  resize(id: string, cols: number, rows: number): SessionSnapshot {
    const session = this.running.get(id);
    if (!session) throw new Error(`Session ${id} is not running.`);
    session.resize(cols, rows);
    return session.toJSON();
  }

  stop(id: string): SessionSnapshot {
    const session = this.running.get(id);
    if (!session) {
      const snapshot = this.history.get(id);
      if (!snapshot) throw new Error(`Session ${id} was not found.`);
      return snapshot;
    }
    session.stop();
    return session.toJSON();
  }

  stopAll(): SessionSnapshot[] {
    const stopped: SessionSnapshot[] = [];
    for (const id of this.running.keys()) {
      stopped.push(this.stop(id));
    }
    return stopped;
  }

  async clearFailed(): Promise<void> {
    for (const [id, session] of this.history.entries()) {
      if (session.status === "error" || session.status === "exited" || session.status === "stopped") {
        this.history.delete(id);
      }
    }
    await this.persist();
  }

  async clearHistory(): Promise<void> {
    this.history.clear();
    for (const [id, session] of this.running.entries()) {
      this.history.set(id, session.toJSON());
    }
    await this.persist();
  }

  async restart(id: string): Promise<SessionSnapshot> {
    const existing = this.get(id);
    if (!existing) throw new Error(`Session ${id} was not found.`);
    this.stop(id);
    return this.create({
      kind: existing.kind,
      name: existing.name,
      cwd: existing.cwd,
      command: existing.kind === "custom" ? existing.command : undefined,
      args: existing.args
    });
  }

  async readLogs(id: string, maxBytes = 64_000): Promise<string> {
    const snapshot = this.get(id);
    if (!snapshot) throw new Error(`Session ${id} was not found.`);
    const raw = await readFile(snapshot.logPath, "utf8");
    return raw.length <= maxBytes ? raw : raw.slice(raw.length - maxBytes);
  }

  private async persist(): Promise<void> {
    const data = JSON.stringify(this.list(), null, 2);
    await writeFile(this.indexPath, data, "utf8");
  }

  private assertLaunchAllowed(request: SessionCreateRequest): void {
    if (request.kind !== "codex" && request.kind !== "claude") return;

    const active = this.list("active").find((session) => session.kind === request.kind && (request.profileId ? session.profileId === request.profileId : true));
    if (active) {
      throw new Error(`${request.kind} is already running as ${active.id}. Select it or stop it before starting another one.`);
    }

    const now = Date.now();
    const lastLaunch = this.launchCooldown.get(request.kind) ?? 0;
    if (now - lastLaunch < 3000) {
      throw new Error(`${request.kind} launch is cooling down. Wait a few seconds before retrying.`);
    }
    this.launchCooldown.set(request.kind, now);
  }

  private findReusableSession(request: SessionCreateRequest): SessionSnapshot | undefined {
    if (request.kind === "custom") return undefined;
    const active = this.list("active").find((session) => {
      if (session.kind !== request.kind) return false;
      if (request.profileId) return session.profileId === request.profileId;
      return true;
    });
    return active;
  }
}

function isActiveStatus(status: SessionStatus): boolean {
  return status === "starting" || status === "running" || status === "stopping";
}
