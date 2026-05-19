import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: process.env.WORKSTATION_ENV_PATH || undefined });

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(8787),
  API_TOKEN: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ALLOWED_CHAT_IDS: z.string().optional(),
  TELEGRAM_STREAM_CHAT_ID: z.string().optional(),
  DISCORD_WEBHOOK_URL: z.string().optional(),
  CODEX_COMMAND: z.string().default("codex"),
  CLAUDE_COMMAND: z.string().default("claude"),
  POWERSHELL_COMMAND: z.string().default("powershell.exe"),
  COMFYUI_URL: z.string().url().optional().or(z.literal("")),
  OLLAMA_URL: z.string().url().optional().or(z.literal(""))
});

const env = EnvSchema.parse(process.env);

function csvNumbers(value?: string): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isSafeInteger(item));
}

export const config = {
  nodeEnv: env.NODE_ENV,
  host: env.HOST,
  port: env.PORT,
  apiToken: env.API_TOKEN,
  telegram: {
    token: env.TELEGRAM_BOT_TOKEN || undefined,
    allowedChatIds: csvNumbers(env.TELEGRAM_ALLOWED_CHAT_IDS),
    streamChatId: env.TELEGRAM_STREAM_CHAT_ID ? Number(env.TELEGRAM_STREAM_CHAT_ID) : undefined
  },
  discordWebhookUrl: env.DISCORD_WEBHOOK_URL || undefined,
  commands: {
    codex: env.CODEX_COMMAND,
    claude: env.CLAUDE_COMMAND,
    powershell: env.POWERSHELL_COMMAND
  },
  services: {
    comfyuiUrl: env.COMFYUI_URL || undefined,
    ollamaUrl: env.OLLAMA_URL || undefined
  }
} as const;
