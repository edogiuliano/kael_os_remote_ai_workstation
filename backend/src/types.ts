export type AgentKind = "powershell" | "codex" | "claude" | "custom";

export type SessionStatus = "starting" | "running" | "stopping" | "stopped" | "exited" | "error";

export interface SessionCreateRequest {
  kind: AgentKind;
  name?: string;
  cwd?: string;
  command?: string;
  prelaunchCommand?: string;
  args?: string[];
  prompt?: string;
  env?: Record<string, string>;
  profileId?: string;
  profileName?: string;
  reuseExisting?: boolean;
}

export interface SessionSnapshot {
  id: string;
  kind: AgentKind;
  name: string;
  command: string;
  prelaunchCommand?: string;
  args: string[];
  cwd: string;
  status: SessionStatus;
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  stoppedAt?: string;
  lastOutputAt?: string;
  lastError?: string;
  pid?: number;
  profileId?: string;
  profileName?: string;
  logPath: string;
  metadata: Record<string, unknown>;
}

export interface SessionOutputEvent {
  type: "session.output";
  sessionId: string;
  stream: "stdout" | "stderr" | "system";
  chunk: string;
  at: string;
}

export interface SessionStatusEvent {
  type: "session.status";
  session: SessionSnapshot;
}

export interface SystemStats {
  cpuLoad: number;
  memoryUsedPct: number;
  memoryUsedGb: number;
  memoryTotalGb: number;
  gpu?: {
    model: string;
    loadPct?: number;
    memoryUsedMb?: number;
    memoryTotalMb?: number;
    temperatureC?: number;
  };
}

export interface ServiceHealth {
  name: string;
  status: "configured" | "available" | "unavailable" | "not_configured";
  url?: string;
  details?: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  kind: AgentKind;
  cwd: string;
  command?: string;
  prelaunchCommand?: string;
  args: string[];
  env: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentProfileInput {
  name: string;
  kind: AgentKind;
  cwd?: string;
  command?: string;
  prelaunchCommand?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface WorkstationStatus {
  app: {
    name: string;
    version: string;
    nodeEnv: string;
    uptimeSec: number;
  };
  access: {
    localUrl: string;
    tailscaleIp?: string;
    tailscaleUrl?: string;
  };
  system: SystemStats;
  sessions: SessionSnapshot[];
  services: ServiceHealth[];
  plugins: string[];
}

export type WsEvent =
  | SessionOutputEvent
  | SessionStatusEvent
  | { type: "session.data"; sessionId: string; chunk: string; at: string }
  | { type: "status"; status: WorkstationStatus; at: string }
  | { type: "error"; message: string; at: string };
