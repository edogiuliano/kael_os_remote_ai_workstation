import si from "systeminformation";
import os from "node:os";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import type { ServiceHealth, SystemStats } from "../types.js";
import { config } from "../config.js";
import { logger } from "../logger.js";

const execFileAsync = promisify(execFile);

export async function getSystemStats(): Promise<SystemStats> {
  const [load, memory, gpu] = await Promise.all([
    withTimeout("CPU metrics", si.currentLoad(), { currentLoad: 0 } as si.Systeminformation.CurrentLoadData, 1500),
    Promise.resolve(memoryFallback()),
    withTimeout("GPU metrics", getGpuStats(), undefined, 6000)
  ]);
  const memoryUsedPct = memory.total > 0 ? (memory.used / memory.total) * 100 : 0;

  return {
    cpuLoad: round(load.currentLoad),
    memoryUsedPct: round(memoryUsedPct),
    memoryUsedGb: round(memory.used / 1024 ** 3),
    memoryTotalGb: round(memory.total / 1024 ** 3),
    gpu
  };
}

async function getGpuStats(): Promise<SystemStats["gpu"]> {
  const nvidia = await queryNvidiaSmi();
  if (nvidia) return nvidia;

  const graphics = await si.graphics();
  const gpu = choosePrimaryGpu(graphics.controllers);
  return gpu
    ? {
        model: gpu.model,
        loadPct: gpu.utilizationGpu === undefined ? undefined : round(gpu.utilizationGpu),
        memoryUsedMb: gpu.memoryUsed,
        memoryTotalMb: gpu.memoryTotal,
        temperatureC: gpu.temperatureGpu
      }
    : undefined;
}

async function queryNvidiaSmi(): Promise<SystemStats["gpu"]> {
  for (const command of nvidiaSmiCandidates()) {
    try {
      const result = await execFileAsync(
        command,
        ["--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu", "--format=csv,noheader,nounits"],
        { windowsHide: true, timeout: 2500 }
      );
      const firstLine = result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      if (!firstLine) continue;

      const [model, loadPct, memoryUsedMb, memoryTotalMb, temperatureC] = firstLine.split(",").map((item) => item.trim());
      if (!model) continue;
      return {
        model,
        loadPct: parseOptionalNumber(loadPct),
        memoryUsedMb: parseOptionalNumber(memoryUsedMb),
        memoryTotalMb: parseOptionalNumber(memoryTotalMb),
        temperatureC: parseOptionalNumber(temperatureC)
      };
    } catch (error) {
      logger.debug({ command, error }, "nvidia-smi GPU probe failed");
    }
  }

  return undefined;
}

export async function getServiceHealth(): Promise<ServiceHealth[]> {
  const services = await Promise.all([
    probeHttp("ComfyUI", config.services.comfyuiUrl),
    probeHttp("Ollama", config.services.ollamaUrl)
  ]);
  return [
    ...services,
    {
      name: "Discord webhook",
      status: config.discordWebhookUrl ? "configured" : "not_configured",
      details: config.discordWebhookUrl ? "Webhook URL configured" : "DISCORD_WEBHOOK_URL is empty"
    }
  ];
}

async function probeHttp(name: string, url?: string): Promise<ServiceHealth> {
  if (!url) return { name, status: "not_configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    return {
      name,
      url,
      status: response.ok || response.status < 500 ? "available" : "unavailable",
      details: `HTTP ${response.status}`
    };
  } catch (error) {
    return { name, url, status: "unavailable", details: (error as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

async function withTimeout<T>(label: string, promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise.catch((error) => {
        logger.debug({ error }, `${label} failed`);
        return fallback;
      }),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          logger.debug({ ms }, `${label} timed out`);
          resolve(fallback);
        }, ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function memoryFallback(): si.Systeminformation.MemData {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    total,
    free,
    used: total - free,
    active: total - free,
    available: free,
    buffcache: 0,
    swaptotal: 0,
    swapused: 0,
    swapfree: 0
  } as si.Systeminformation.MemData;
}

function nvidiaSmiCandidates(): string[] {
  const candidates = [
    "nvidia-smi",
    "nvidia-smi.exe",
    "C:\\Windows\\System32\\nvidia-smi.exe",
    "C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe"
  ];

  return [...new Set(candidates)].filter((candidate) => {
    if (candidate.includes("\\") || candidate.includes("/")) return existsSync(candidate);
    return true;
  });
}

function parseOptionalNumber(value?: string): number | undefined {
  if (!value || /not supported|n\/a/i.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? round(parsed) : undefined;
}

function choosePrimaryGpu(controllers?: si.Systeminformation.GraphicsControllerData[]): si.Systeminformation.GraphicsControllerData | undefined {
  if (!controllers?.length) return undefined;
  return (
    controllers.find((gpu) => /nvidia|geforce|rtx|gtx/i.test(gpu.vendor || "") || /nvidia|geforce|rtx|gtx/i.test(gpu.model || "")) ??
    controllers.find((gpu) => !/virtual|basic render|remote|displaylink|meta/i.test(`${gpu.vendor} ${gpu.model}`)) ??
    controllers[0]
  );
}
