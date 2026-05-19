import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function detectTailscaleIp(): Promise<string | undefined> {
  for (const command of getTailscaleCandidates()) {
    try {
      const result = await execFileAsync(command, ["ip", "-4"], {
        windowsHide: true,
        timeout: 2500
      });
      const ip = result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (ip) return ip;
    } catch {
      // Try the next candidate; Tailscale may not be in PATH inside packaged apps.
    }
  }
  return undefined;
}

function getTailscaleCandidates(): string[] {
  const candidates = [
    process.env.TAILSCALE_COMMAND,
    "tailscale",
    "tailscale.exe",
    "C:\\Program Files\\Tailscale\\tailscale.exe",
    "C:\\Program Files (x86)\\Tailscale\\tailscale.exe"
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)].filter((candidate) => {
    if (candidate.includes("\\") || candidate.includes("/")) return existsSync(candidate);
    return true;
  });
}
