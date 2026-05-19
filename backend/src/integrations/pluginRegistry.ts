export interface PluginDescriptor {
  name: string;
  status: "ready" | "planned";
  description: string;
}

const plugins: PluginDescriptor[] = [
  {
    name: "agent-sessions",
    status: "ready",
    description: "PowerShell, Codex, Claude, and custom process sessions."
  },
  {
    name: "comfyui",
    status: "planned",
    description: "Queue prompts, track generations, and send outputs to Telegram."
  },
  {
    name: "ollama",
    status: "planned",
    description: "Local model discovery, prompt calls, and health reporting."
  },
  {
    name: "discord-webhook",
    status: "planned",
    description: "Forward important workstation events to Discord."
  }
];

export function listPlugins(): PluginDescriptor[] {
  return plugins;
}

