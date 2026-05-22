import { EventEmitter } from "node:events";
import { createWriteStream, type WriteStream } from "node:fs";
import { execFile } from "node:child_process";
import * as pty from "@lydell/node-pty";
import type { LaunchSpec } from "./CommandCatalog.js";
import type { SessionOutputEvent, SessionSnapshot, SessionStatus } from "../types.js";

export interface ManagedSessionEvents {
  output: [SessionOutputEvent];
  status: [SessionSnapshot];
}

export class ManagedSession extends EventEmitter {
  private terminal?: pty.IPty;
  private logStream: WriteStream;
  private snapshot: SessionSnapshot;

  constructor(
    id: string,
    private readonly launch: LaunchSpec,
    logPath: string
  ) {
    super();
    const now = new Date().toISOString();
    this.snapshot = {
      id,
      kind: launch.kind,
      name: launch.name,
      command: launch.command,
      args: launch.args,
      cwd: launch.cwd,
      status: "starting",
      createdAt: now,
      updatedAt: now,
      logPath,
      profileId: launch.profileId,
      profileName: launch.profileName,
      metadata: { pty: true }
    };
    this.logStream = createWriteStream(logPath, { flags: "a" });
  }

  start(): SessionSnapshot {
    this.writeSystem(`Starting ${this.launch.command} ${this.launch.args.join(" ")}`.trim());
    try {
      this.terminal = pty.spawn(this.launch.command, this.launch.args, {
        name: "xterm-256color",
        cols: 120,
        rows: 30,
        cwd: this.launch.cwd,
        env: buildPtyEnv(this.launch.env)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.writeSystem(`Process error: ${message}`);
      this.patch({ status: "error", lastError: message, stoppedAt: new Date().toISOString() });
      this.closeLog();
      return this.toJSON();
    }

    const startedAt = new Date().toISOString();
    this.patch({ status: "running", startedAt, pid: this.terminal.pid });

    this.terminal.onData((chunk) => this.writeOutput("stdout", chunk));
    this.terminal.onExit(({ exitCode, signal }) => {
      const signalText = signal === undefined || signal === null ? "null" : String(signal);
      this.writeSystem(`Process exited with code=${exitCode ?? "null"} signal=${signalText}`);
      this.patch({
        status: this.snapshot.status === "stopping" ? "stopped" : "exited",
        exitCode,
        signal: null,
        stoppedAt: new Date().toISOString()
      });
      this.closeLog();
    });

    if (this.launch.prompt) {
      setTimeout(() => this.input(this.launch.prompt || ""), 250);
    }

    return this.toJSON();
  }

  input(text: string): void {
    if (!this.terminal || this.snapshot.status !== "running") {
      throw new Error("Session is not accepting input.");
    }

    this.writeSystem(`> ${text}`);
    if (this.snapshot.kind === "codex") {
      this.submitCodexPrompt(text);
      return;
    }

    if (this.snapshot.kind === "claude") {
      this.submitAgentPrompt(text);
      return;
    }

    this.terminal.write(text.endsWith("\n") || text.endsWith("\r") ? text : `${text}\r`);
  }

  rawInput(data: string): void {
    if (!this.terminal || this.snapshot.status !== "running") {
      throw new Error("Session is not accepting input.");
    }
    this.terminal.write(data);
  }

  resize(cols: number, rows: number): void {
    if (!this.terminal || this.snapshot.status !== "running") return;
    this.terminal.resize(cols, rows);
    this.snapshot.metadata = {
      ...this.snapshot.metadata,
      cols,
      rows
    };
  }

  stop(): void {
    if (!this.terminal) {
      this.patch({ status: "stopped", stoppedAt: new Date().toISOString() });
      return;
    }

    this.patch({ status: "stopping" });
    if (this.snapshot.kind === "powershell") {
      this.terminal.write("exit\r");
    }

    const pid = this.terminal.pid;
    this.terminal.kill();

    setTimeout(() => {
      if (this.terminal && this.snapshot.status === "stopping") {
        if (process.platform === "win32" && pid) {
          execFile("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }, () => undefined);
        } else {
          this.terminal.kill();
        }
      }
    }, 5000).unref();
  }

  toJSON(): SessionSnapshot {
    return { ...this.snapshot, args: [...this.snapshot.args], metadata: { ...this.snapshot.metadata } };
  }

  private patch(update: Partial<SessionSnapshot>): void {
    this.snapshot = {
      ...this.snapshot,
      ...update,
      updatedAt: new Date().toISOString()
    };
    this.emit("status", this.toJSON());
  }

  private writeOutput(stream: "stdout" | "stderr", chunk: string): void {
    const at = new Date().toISOString();
    this.snapshot.lastOutputAt = at;
    this.snapshot.updatedAt = at;
    this.logStream.write(`[${at}] [${stream}] ${chunk}`);
    this.emit("output", {
      type: "session.output",
      sessionId: this.snapshot.id,
      stream,
      chunk,
      at
    });
  }

  private writeSystem(message: string): void {
    const at = new Date().toISOString();
    const chunk = `${message}\n`;
    this.logStream.write(`[${at}] [system] ${chunk}`);
    this.emit("output", {
      type: "session.output",
      sessionId: this.snapshot.id,
      stream: "system",
      chunk,
      at
    });
  }

  private closeLog(): void {
    this.logStream.end();
  }

  private submitAgentPrompt(text: string): void {
    if (!this.terminal) return;
    this.terminal.write("\x15");
    setTimeout(() => this.terminal?.write(text), 20).unref();
    setTimeout(() => this.terminal?.write("\r"), 80).unref();
  }

  private submitCodexPrompt(text: string): void {
    if (!this.terminal) return;
    const sequence = buildCodexPromptInput(text);
    this.terminal.write(sequence.clear);
    setTimeout(() => this.terminal?.write(sequence.paste), 45).unref();
    setTimeout(() => this.terminal?.write(sequence.submit), 130).unref();
  }
}

export function isTerminalStatus(status: SessionStatus): boolean {
  return status === "stopped" || status === "exited" || status === "error";
}

export function buildCodexPromptInput(text: string): { clear: string; paste: string; submit: string } {
  const prompt = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return {
    clear: "\x15\x01\x0b",
    paste: `\x1b[200~${prompt}\x1b[201~`,
    submit: "\r"
  };
}

function buildPtyEnv(extra: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  return { ...env, ...extra };
}
