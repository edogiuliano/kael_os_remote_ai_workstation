import path from "node:path";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, chmod } from "node:fs/promises";
import type { RuntimePaths } from "../runtime/paths.js";
import type { AgentProfile, AgentProfileInput } from "../types.js";

const SECRET_KEY_PATTERN = /(token|secret|key|password|credential)/i;

export class ProfileStore {
  private readonly profiles = new Map<string, AgentProfile>();

  constructor(private readonly paths: RuntimePaths) {}

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.paths.profiles, "utf8");
      const profiles = JSON.parse(raw) as AgentProfile[];
      for (const profile of profiles) {
        this.profiles.set(profile.id, normalizeProfile(profile));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  list(maskSecrets = false): AgentProfile[] {
    return [...this.profiles.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((profile) => (maskSecrets ? maskProfileSecrets(profile) : cloneProfile(profile)));
  }

  get(id: string): AgentProfile | undefined {
    const profile = this.profiles.get(id);
    return profile ? cloneProfile(profile) : undefined;
  }

  async create(input: AgentProfileInput): Promise<AgentProfile> {
    const now = new Date().toISOString();
    const profile = normalizeProfile({
      id: randomUUID(),
      name: input.name,
      kind: input.kind,
      cwd: input.cwd || process.cwd(),
      command: input.command,
      args: input.args ?? [],
      env: input.env ?? {},
      createdAt: now,
      updatedAt: now
    });
    this.profiles.set(profile.id, profile);
    await this.persist();
    return maskProfileSecrets(profile);
  }

  async update(id: string, input: AgentProfileInput): Promise<AgentProfile> {
    const existing = this.profiles.get(id);
    if (!existing) throw new Error(`Profile ${id} was not found.`);
    const profile = normalizeProfile({
      ...existing,
      name: input.name,
      kind: input.kind,
      cwd: input.cwd || process.cwd(),
      command: input.command,
      args: input.args ?? [],
      env: input.env ?? {},
      updatedAt: new Date().toISOString()
    });
    this.profiles.set(id, profile);
    await this.persist();
    return maskProfileSecrets(profile);
  }

  async delete(id: string): Promise<void> {
    this.profiles.delete(id);
    await this.persist();
  }

  private async persist(): Promise<void> {
    await writeFile(this.paths.profiles, JSON.stringify(this.list(false), null, 2), "utf8");
    await chmod(this.paths.profiles, 0o600).catch(() => undefined);
  }
}

export function maskProfileSecrets(profile: AgentProfile): AgentProfile {
  const clone = cloneProfile(profile);
  clone.env = Object.fromEntries(
    Object.entries(clone.env).map(([key, value]) => [key, SECRET_KEY_PATTERN.test(key) && value ? "********" : value])
  );
  return clone;
}

export function mergeProfileEnv(profile: AgentProfile, inputEnv?: Record<string, string>): Record<string, string> {
  return {
    ...profile.env,
    ...(inputEnv ?? {})
  };
}

function normalizeProfile(profile: AgentProfile): AgentProfile {
  const name = profile.name.trim();
  if (!name) throw new Error("Profile name is required.");
  if (!["powershell", "codex", "claude", "custom"].includes(profile.kind)) {
    throw new Error("Profile agent kind is invalid.");
  }

  return {
    ...profile,
    name,
    cwd: path.resolve(profile.cwd || process.cwd()),
    command: profile.command?.trim() || undefined,
    args: profile.args ?? [],
    env: profile.env ?? {}
  };
}

function cloneProfile(profile: AgentProfile): AgentProfile {
  return {
    ...profile,
    args: [...profile.args],
    env: { ...profile.env }
  };
}
