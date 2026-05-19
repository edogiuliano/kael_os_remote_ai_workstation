import si from "systeminformation";
import type { ServiceHealth, SystemStats } from "../types.js";
import { config } from "../config.js";

export async function getSystemStats(): Promise<SystemStats> {
  const [load, memory, graphics] = await Promise.all([si.currentLoad(), si.mem(), si.graphics().catch(() => undefined)]);
  const gpu = choosePrimaryGpu(graphics?.controllers);

  return {
    cpuLoad: round(load.currentLoad),
    memoryUsedPct: round((memory.used / memory.total) * 100),
    memoryUsedGb: round(memory.used / 1024 ** 3),
    memoryTotalGb: round(memory.total / 1024 ** 3),
    gpu: gpu
      ? {
          model: gpu.model,
          loadPct: gpu.utilizationGpu === undefined ? undefined : round(gpu.utilizationGpu),
          memoryUsedMb: gpu.memoryUsed,
          memoryTotalMb: gpu.memoryTotal,
          temperatureC: gpu.temperatureGpu
        }
      : undefined
  };
}

export async function getServiceHealth(): Promise<ServiceHealth[]> {
  const services: ServiceHealth[] = [];
  services.push(await probeHttp("ComfyUI", config.services.comfyuiUrl));
  services.push(await probeHttp("Ollama", config.services.ollamaUrl));
  services.push({
    name: "Discord webhook",
    status: config.discordWebhookUrl ? "configured" : "not_configured",
    details: config.discordWebhookUrl ? "Webhook URL configured" : "DISCORD_WEBHOOK_URL is empty"
  });
  return services;
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

function choosePrimaryGpu(controllers?: si.Systeminformation.GraphicsControllerData[]): si.Systeminformation.GraphicsControllerData | undefined {
  if (!controllers?.length) return undefined;
  return (
    controllers.find((gpu) => /nvidia|geforce|rtx|gtx/i.test(gpu.vendor || "") || /nvidia|geforce|rtx|gtx/i.test(gpu.model || "")) ??
    controllers.find((gpu) => !/virtual|basic render|remote|displaylink|meta/i.test(`${gpu.vendor} ${gpu.model}`)) ??
    controllers[0]
  );
}
