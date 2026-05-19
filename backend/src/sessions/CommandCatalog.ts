import path from "node:path";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { config } from "../config.js";
import type { AgentKind, SessionCreateRequest } from "../types.js";

export interface LaunchSpec {
  kind: AgentKind;
  name: string;
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  prompt?: string;
  profileId?: string;
  profileName?: string;
}

export function resolveLaunchSpec(request: SessionCreateRequest): LaunchSpec {
  const cwd = request.cwd ? path.resolve(request.cwd) : defaultWorkingDirectory();
  const env = request.env ?? {};

  if (request.kind === "custom") {
    if (!request.command) {
      throw new Error("Custom sessions require a command.");
    }

    return {
      kind: "custom",
      name: request.name || request.command,
      command: request.command,
      args: request.args ?? [],
      cwd,
      env,
      prompt: request.prompt,
      profileId: request.profileId,
      profileName: request.profileName
    };
  }

  if (request.kind === "powershell") {
    return {
      kind: "powershell",
      name: request.name || "PowerShell",
      command: config.commands.powershell,
      args: request.args ?? ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass"],
      cwd,
      env,
      prompt: request.prompt,
      profileId: request.profileId,
      profileName: request.profileName
    };
  }

  if (request.kind === "codex") {
    return {
      kind: "codex",
      name: request.name || "Codex CLI",
      command: resolveCommand(request.command || config.commands.codex, "codex"),
      args: request.args ?? [],
      cwd,
      env,
      prompt: request.prompt,
      profileId: request.profileId,
      profileName: request.profileName
    };
  }

  return {
    kind: "claude",
    name: request.name || "Claude Code",
    command: resolveCommand(request.command || config.commands.claude, "claude"),
    args: request.args ?? [],
    cwd,
    env,
    prompt: request.prompt,
    profileId: request.profileId,
    profileName: request.profileName
  };
}

function defaultWorkingDirectory(): string {
  const configured = process.env.WORKSTATION_DEFAULT_CWD?.trim();
  const fallback = path.join(process.env.USERPROFILE || process.cwd(), "Documents", "Remote AI Workstation");
  const cwd = path.resolve(configured || fallback);
  try {
    mkdirSync(cwd, { recursive: true });
  } catch {
    return process.env.USERPROFILE || process.cwd();
  }
  return cwd;
}

function resolveCommand(command: string, tool: "codex" | "claude"): string {
  if (command.includes("\\") || command.includes("/")) return command;

  const detected = tool === "codex" ? detectCodexCli() : detectCommandFromPath(command);
  return detected ?? command;
}

function detectCommandFromPath(command: string): string | undefined {
  try {
    const output = execFileSync("where.exe", [command], { encoding: "utf8", windowsHide: true, timeout: 1500 });
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);
  } catch {
    return undefined;
  }
}

function detectCodexCli(): string | undefined {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Local");
  const codexBinRoot = path.join(localAppData, "OpenAI", "Codex", "bin");
  try {
    if (existsSync(codexBinRoot)) {
      const versions = readdirSync(codexBinRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(codexBinRoot, entry.name, "codex.exe"))
        .filter((candidate) => existsSync(candidate));
      if (versions.length > 0) return versions.at(-1);
    }
  } catch {
    // Fall back to PATH lookup below.
  }

  return detectCommandFromPath("codex");
}
