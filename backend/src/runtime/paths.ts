import path from "node:path";
import { mkdir } from "node:fs/promises";

export interface RuntimePaths {
  root: string;
  frontend: string;
  nodeModules: string;
  logs: string;
  sessions: string;
  profiles: string;
}

export function createRuntimePaths(root = process.cwd()): RuntimePaths {
  const dataRoot = process.env.WORKSTATION_DATA_DIR || root;
  const frontendRoot = process.env.WORKSTATION_FRONTEND_DIR || path.join(root, "frontend");
  const nodeModulesRoot = process.env.WORKSTATION_NODE_MODULES_DIR || path.join(root, "node_modules");
  return {
    root: dataRoot,
    frontend: frontendRoot,
    nodeModules: nodeModulesRoot,
    logs: path.join(dataRoot, "logs"),
    sessions: path.join(dataRoot, "sessions"),
    profiles: path.join(dataRoot, "profiles.json")
  };
}

export async function ensureRuntimePaths(paths: RuntimePaths): Promise<void> {
  await Promise.all([
    mkdir(paths.logs, { recursive: true }),
    mkdir(paths.sessions, { recursive: true })
  ]);
}
