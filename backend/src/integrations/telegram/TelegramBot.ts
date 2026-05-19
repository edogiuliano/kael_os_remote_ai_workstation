import { Telegraf, Markup } from "telegraf";
import type { RuntimePaths } from "../../runtime/paths.js";
import { config } from "../../config.js";
import { logger } from "../../logger.js";
import type { SessionManager } from "../../sessions/SessionManager.js";
import type { ProfileStore } from "../../sessions/ProfileStore.js";
import { detectTailscaleIp } from "../tailscale.js";
import type { AgentKind, SessionOutputEvent, SessionSnapshot } from "../../types.js";

interface ChatState {
  sessionId?: string;
  terminalMode: boolean;
  stream: boolean;
  buffer: string;
  lastChunk?: string;
  timer?: NodeJS.Timeout;
}

interface SessionTelegramState {
  transcript: string;
  lastCompletion?: string;
}

interface CompletionOptions {
  allowFallback?: boolean;
  promptFallback?: boolean;
}

export class TelegramBotController {
  private bot?: Telegraf;
  private readonly chats = new Map<number, ChatState>();
  private readonly sessions = new Map<string, SessionTelegramState>();
  private readonly notifiedRunningSessions = new Set<string>();

  constructor(
    private readonly sessionManager: SessionManager,
    private readonly profileStore: ProfileStore,
    private readonly paths: RuntimePaths
  ) {}

  async start(): Promise<void> {
    if (!config.telegram.token) {
      logger.info("Telegram bot disabled because TELEGRAM_BOT_TOKEN is empty.");
      return;
    }

    this.bot = new Telegraf(config.telegram.token);
    this.bot.use(async (ctx, next) => {
      if (!this.isAllowed(ctx.chat?.id)) {
        await ctx.reply("This chat is not allowed to control the workstation.");
        return;
      }
      await next();
    });

    this.bot.start(async (ctx) => {
      this.stateFor(ctx.chat.id);
      await ctx.reply("Remote AI Workstation ready. Use /sessions or /profiles to connect.", this.mainKeyboard());
    });

    this.bot.command("status", async (ctx) => ctx.reply(this.formatSessions(), this.mainKeyboard()));
    this.bot.command("sessions", async (ctx) => ctx.reply(this.formatSessions(), this.sessionKeyboard()));
    this.bot.command("profiles", async (ctx) => ctx.reply(this.formatProfiles(), this.profileKeyboard()));
    this.bot.command("where", async (ctx) => ctx.reply(await this.formatAccessUrls()));
    this.bot.command("stream_on", async (ctx) => {
      const state = this.stateFor(ctx.chat.id);
      if (!state.sessionId) {
        await ctx.reply("Connect to a session first with /connect.", this.sessionKeyboard());
        return;
      }
      state.stream = true;
      await ctx.reply("Streaming enabled for this chat. Use /stream_off to stop noisy terminal updates.", this.controlKeyboard(state.sessionId));
    });
    this.bot.command("stream_off", async (ctx) => {
      const state = this.stateFor(ctx.chat.id);
      state.stream = false;
      state.buffer = "";
      if (state.timer) clearTimeout(state.timer);
      state.timer = undefined;
      await ctx.reply("Streaming disabled. Prompts still work; use /logs when you want a snapshot.", state.sessionId ? this.controlKeyboard(state.sessionId) : this.mainKeyboard());
    });
    this.bot.command("exit", async (ctx) => {
      const state = this.stateFor(ctx.chat.id);
      state.terminalMode = false;
      state.stream = false;
      await ctx.reply("Terminal mode off. The session is still running.", this.mainKeyboard());
    });

    this.bot.command("connect", async (ctx) => {
      const id = ctx.message.text.replace(/^\/connect(@\w+)?\s*/i, "").trim() || this.latestActiveSession()?.id;
      if (!id) {
        await ctx.reply("No active session. Start Claude, Codex, or a profile first.", this.mainKeyboard());
        return;
      }
      await this.connectChat(ctx.chat.id, id, (text, keyboard) => ctx.reply(text, keyboard));
    });

    this.bot.command("stop", async (ctx) => {
      const state = this.stateFor(ctx.chat.id);
      const id = ctx.message.text.replace(/^\/stop(@\w+)?\s*/i, "").trim() || state.sessionId;
      if (!id) {
        await ctx.reply("No selected session.");
        return;
      }
      const session = this.sessionManager.stop(id);
      state.terminalMode = false;
      await ctx.reply(`Stop requested for ${session.name} (${session.id.slice(0, 8)}).`, this.sessionKeyboard());
    });

    this.bot.command("logs", async (ctx) => {
      const state = this.stateFor(ctx.chat.id);
      const id = ctx.message.text.replace(/^\/logs(@\w+)?\s*/i, "").trim() || state.sessionId;
      if (!id) {
        await ctx.reply("No selected session.");
        return;
      }
      const logs = await this.sessionManager.readLogs(id, 3500);
      const final = extractCompletion(logs, { allowFallback: true });
      const cleaned = final || cleanLogSnapshot(logs).slice(-3500);
      await ctx.reply(cleaned ? `Last logs for ${id.slice(0, 8)}:\n\n${cleaned}` : "No logs yet.");
    });

    this.bot.command("codex", async (ctx) => this.startKind(ctx.chat.id, "codex", ctx.message.text, (text, keyboard) => ctx.reply(text, keyboard)));
    this.bot.command("claude", async (ctx) => this.startKind(ctx.chat.id, "claude", ctx.message.text, (text, keyboard) => ctx.reply(text, keyboard)));
    this.bot.command("powershell", async (ctx) => this.startKind(ctx.chat.id, "powershell", ctx.message.text, (text, keyboard) => ctx.reply(text, keyboard)));

    this.bot.on("text", async (ctx) => {
      if (ctx.message.text.startsWith("/")) return;
      const state = this.stateFor(ctx.chat.id);
      if (!state.terminalMode || !state.sessionId) {
        await ctx.reply("Choose a session with /connect first, or start one with /claude /codex.", this.mainKeyboard());
        return;
      }
      this.sessionManager.input(state.sessionId, ctx.message.text);
      await ctx.reply(`Sent to ${state.sessionId.slice(0, 8)}. Use /logs for output or open the terminal window for live view.`);
    });

    this.bot.on("document", async (ctx) => {
      const file = ctx.message.document;
      await ctx.reply(`Received ${file.file_name ?? file.file_id}. File placement from Telegram is acknowledged for this version.`);
    });

    this.bot.action(/^start:(codex|claude|powershell)$/, async (ctx) => {
      const kind = ctx.match[1] as AgentKind;
      await this.startKind(ctx.chat?.id, kind, "", (text, keyboard) => ctx.editMessageText(text, keyboard));
    });

    this.bot.action(/^profile:(.+)$/, async (ctx) => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      const profile = this.profileStore.get(ctx.match[1]);
      if (!profile) {
        await ctx.answerCbQuery("Profile not found");
        return;
      }
      const session = await this.sessionManager.create({
        kind: profile.kind,
        name: profile.name,
        cwd: profile.cwd,
        command: profile.command,
        args: profile.args,
        env: profile.env,
        profileId: profile.id,
        profileName: profile.name,
        reuseExisting: true
      });
      await this.connectChat(chatId, session.id, (text, keyboard) => ctx.editMessageText(text, keyboard));
    });

    this.bot.action(/^connect:(.+)$/, async (ctx) => {
      const chatId = ctx.chat?.id;
      if (!chatId) return;
      await this.connectChat(chatId, ctx.match[1], (text, keyboard) => ctx.editMessageText(text, keyboard));
    });

    this.bot.action(/^stop:(.+)$/, async (ctx) => {
      const session = this.sessionManager.stop(ctx.match[1]);
      const chatId = ctx.chat?.id;
      if (chatId) this.stateFor(chatId).terminalMode = false;
      await ctx.editMessageText(`Stop requested for ${session.name} (${session.id.slice(0, 8)}).`, this.sessionKeyboard());
    });

    this.bot.action(/^logs:(.+)$/, async (ctx) => {
      const logs = await this.sessionManager.readLogs(ctx.match[1], 3500);
      const final = extractCompletion(logs, { allowFallback: true });
      const cleaned = final || cleanLogSnapshot(logs).slice(-3500);
      await ctx.reply(cleaned ? `Last logs for ${ctx.match[1].slice(0, 8)}:\n\n${cleaned}` : "No logs yet.");
      await ctx.answerCbQuery();
    });

    this.bot.action("sessions", async (ctx) => ctx.editMessageText(this.formatSessions(), this.sessionKeyboard()));
    this.bot.action("profiles", async (ctx) => ctx.editMessageText(this.formatProfiles(), this.profileKeyboard()));

    this.bot.catch((error) => logger.error({ error }, "Telegram bot error"));
    void this.bot
      .launch()
      .then(() => logger.info("Telegram bot started."))
      .catch((error) => logger.error({ error }, "Telegram bot failed to start."));

    this.sessionManager.on("output", (event: SessionOutputEvent) => void this.forwardOutput(event));
    this.sessionManager.on("status", (session: SessionSnapshot) => void this.forwardStatus(session));
  }

  async stop(): Promise<void> {
    for (const state of this.chats.values()) {
      if (state.timer) clearTimeout(state.timer);
    }
    this.bot?.stop("shutdown");
  }

  private async startKind(chatId: number | undefined, kind: AgentKind, rawText: string, reply: (text: string, keyboard?: any) => Promise<unknown>): Promise<void> {
    if (!chatId) return;
    const prompt = rawText.replace(new RegExp(`^/${kind}(@\\w+)?\\s*`, "i"), "").trim();
    const session = await this.sessionManager.create({ kind, prompt: prompt || undefined, reuseExisting: true });
    await this.connectChat(chatId, session.id, reply);
  }

  private async connectChat(chatId: number, sessionId: string, reply: (text: string, keyboard?: any) => Promise<unknown>): Promise<void> {
    const session = this.sessionManager.get(sessionId);
    if (!session) {
      await reply(`Session ${sessionId} was not found.`, this.sessionKeyboard());
      return;
    }
    const state = this.stateFor(chatId);
    state.sessionId = session.id;
    state.terminalMode = true;
    state.stream = false;
    state.buffer = "";
    await reply(`Connected to ${session.name} (${session.id.slice(0, 8)}).\nSend normal messages here and they will go to the agent. Telegram live output is off to avoid Claude/Codex terminal spam. Use /logs for a snapshot or /stream_on if you really want live text.`, this.controlKeyboard(session.id));
  }

  private stateFor(chatId: number): ChatState {
    const existing = this.chats.get(chatId);
    if (existing) return existing;
    const state: ChatState = { terminalMode: false, stream: false, buffer: "" };
    this.chats.set(chatId, state);
    return state;
  }

  private isAllowed(chatId?: number): boolean {
    if (!chatId) return false;
    return config.telegram.allowedChatIds.length === 0 || config.telegram.allowedChatIds.includes(chatId);
  }

  private async forwardOutput(event: SessionOutputEvent): Promise<void> {
    if (!this.bot || event.stream === "system") return;
    await this.maybeNotifyCompletion(event);
    const text = normalizeTelegramOutput(event.chunk);
    if (!text) return;
    for (const [chatId, state] of this.chats.entries()) {
      if (!state.terminalMode || !state.stream || state.sessionId !== event.sessionId) continue;
      if (state.lastChunk === text) continue;
      state.lastChunk = text;
      state.buffer += `${text}\n`;
      if (state.buffer.length > 3500) state.buffer = state.buffer.slice(-3500);
      if (!state.timer) {
        state.timer = setTimeout(() => {
          const chunk = state.buffer.slice(-3500);
          state.buffer = "";
          state.timer = undefined;
          void this.bot?.telegram.sendMessage(chatId, `[${event.sessionId.slice(0, 8)}]\n${chunk}`).catch(() => undefined);
        }, 1200);
      }
    }
  }

  private async maybeNotifyCompletion(event: SessionOutputEvent): Promise<void> {
    if (!this.bot) return;
    const sessionState = this.sessionStateFor(event.sessionId);
    sessionState.transcript = trimTranscript(sessionState.transcript + event.chunk);
    const completion = extractCompletion(sessionState.transcript, { allowFallback: true, promptFallback: false });
    if (!completion || completion === sessionState.lastCompletion) return;
    sessionState.lastCompletion = completion;

    const session = this.sessionManager.get(event.sessionId);
    const message = `Done ${session?.name ?? "session"} (${event.sessionId.slice(0, 8)}):\n\n${completion.slice(-3200)}`;
    const notified = new Set<number>();
    for (const [chatId, state] of this.chats.entries()) {
      if (state.sessionId === event.sessionId) {
        notified.add(chatId);
        await this.bot.telegram.sendMessage(chatId, message, this.controlKeyboard(event.sessionId)).catch(() => undefined);
      }
    }
    if (config.telegram.streamChatId && !notified.has(config.telegram.streamChatId)) {
      await this.bot.telegram.sendMessage(config.telegram.streamChatId, message, this.controlKeyboard(event.sessionId)).catch(() => undefined);
    }
  }

  private sessionStateFor(sessionId: string): SessionTelegramState {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    const state: SessionTelegramState = { transcript: "" };
    this.sessions.set(sessionId, state);
    return state;
  }

  private async forwardStatus(session: SessionSnapshot): Promise<void> {
    if (!this.bot) return;
    if (session.status === "running" && config.telegram.streamChatId && !this.notifiedRunningSessions.has(session.id)) {
      this.notifiedRunningSessions.add(session.id);
      const chatId = config.telegram.streamChatId;
      if (this.isAllowed(chatId)) {
        const state = this.stateFor(chatId);
        state.sessionId = session.id;
        state.terminalMode = true;
        state.stream = false;
        await this.bot.telegram
          .sendMessage(
            chatId,
            `Connected to ${session.name} (${session.id.slice(0, 8)}).\nReply here to send prompts. Live terminal spam is off; use /logs for a snapshot or the desktop terminal for the real view.`,
            this.controlKeyboard(session.id)
          )
          .catch((error) => logger.warn({ error }, "Failed to notify Telegram stream chat"));
      }
      return;
    }

    if (session.status !== "exited" && session.status !== "error" && session.status !== "stopped") return;
    const message = `${session.name} ${session.status}: ${session.id.slice(0, 8)}${session.lastError ? `\n${session.lastError}` : ""}`;
    const notified = new Set<number>();
    for (const [chatId, state] of this.chats.entries()) {
      if (state.sessionId === session.id) {
        state.terminalMode = false;
        notified.add(chatId);
        await this.bot.telegram.sendMessage(chatId, message).catch(() => undefined);
      }
    }
    if (config.telegram.streamChatId && !notified.has(config.telegram.streamChatId)) {
      await this.bot.telegram.sendMessage(config.telegram.streamChatId, message).catch(() => undefined);
    }
  }

  private latestActiveSession(): SessionSnapshot | undefined {
    return this.sessionManager.list("active")[0];
  }

  private formatSessions(): string {
    const sessions = this.sessionManager.list("active").slice(0, 8);
    if (sessions.length === 0) return "No active sessions. Start Claude, Codex, or a profile.";
    return sessions.map((session) => `${session.status.toUpperCase()} ${session.name}\n${session.kind} ${session.id}`).join("\n\n");
  }

  private formatProfiles(): string {
    const profiles = this.profileStore.list(true).slice(0, 8);
    if (profiles.length === 0) return "No profiles yet. Create one in the dashboard first.";
    return profiles.map((profile) => `${profile.name}\n${profile.kind} ${profile.cwd}`).join("\n\n");
  }

  private async formatAccessUrls(): Promise<string> {
    const tailscaleIp = await detectTailscaleIp();
    const localUrl = `http://127.0.0.1:${config.port}`;
    return [`Local: ${localUrl}`, tailscaleIp ? `Tailscale: http://${tailscaleIp}:${config.port}` : "Tailscale: not detected"].join("\n");
  }

  private mainKeyboard() {
    return Markup.inlineKeyboard([
      [Markup.button.callback("Start Codex", "start:codex"), Markup.button.callback("Start Claude", "start:claude")],
      [Markup.button.callback("Sessions", "sessions"), Markup.button.callback("Profiles", "profiles")]
    ]);
  }

  private sessionKeyboard() {
    const buttons = this.sessionManager
      .list("active")
      .slice(0, 6)
      .map((session) => [Markup.button.callback(`${session.status} ${session.name}`.slice(0, 40), `connect:${session.id}`)]);
    return Markup.inlineKeyboard([...buttons, [Markup.button.callback("Profiles", "profiles"), Markup.button.callback("Refresh", "sessions")]]);
  }

  private profileKeyboard() {
    const buttons = this.profileStore
      .list(true)
      .slice(0, 8)
      .map((profile) => [Markup.button.callback(`${profile.kind} ${profile.name}`.slice(0, 40), `profile:${profile.id}`)]);
    return Markup.inlineKeyboard([...buttons, [Markup.button.callback("Sessions", "sessions")]]);
  }

  private controlKeyboard(sessionId: string) {
    return Markup.inlineKeyboard([
      [Markup.button.callback("Logs", `logs:${sessionId}`), Markup.button.callback("Stop", `stop:${sessionId}`)],
      [Markup.button.callback("Sessions", "sessions")]
    ]);
  }
}

function normalizeTelegramOutput(value: string): string {
  const cleaned = cleanLogSnapshot(value)
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && /[\p{L}\p{N}]/u.test(line))
    .filter((line) => !/^(gpt-|claude|codex|model:|directory:|esc to interrupt|\|[ \-_/\\|]+)$/.test(line.toLowerCase()))
    .join("\n")
    .trim();
  if (!cleaned || cleaned.length < 8) return "";
  return cleaned;
}

export function extractCompletion(value: string, options: CompletionOptions = {}): string | undefined {
  const cleaned = cleanLogSnapshot(value);
  return extractMarkedCompletion(cleaned) ?? (options.allowFallback ? extractRecentPromptCompletion(cleaned, options) : undefined);
}

function extractMarkedCompletion(cleaned: string): string | undefined {
  const matches = [
    ...cleaned.matchAll(
      /\u25cf\s*([^\u25cf\u2722\u2736\u273b\u273d*\u00b7]{3,1200}?)[\u2722\u2736\u273b\u273d*\u00b7]\s*[^\r\n]{0,120}?for\s*\d+\s*[smh]\b/giu
    )
  ];

  for (const match of matches.reverse()) {
    const answer = compactHumanText(match[1]);
    if (isLikelyFinalAnswer(answer)) return answer;
  }

  return undefined;
}

function extractRecentPromptCompletion(cleaned: string, options: CompletionOptions): string | undefined {
  const lines = cleaned
    .split(/\n/)
    .map((line) => stripTerminalNoise(line.trim()))
    .filter(Boolean);

  const markerIndex = lastIndexWhere(lines, isCompletionMarkerLine);
  if (markerIndex >= 0) {
    const answer = collectAnswerBefore(lines, markerIndex);
    if (answer) return answer;
  }

  if (options.promptFallback === false) return undefined;
  const promptIndex = lastIndexWhere(lines, (line) => /^>\s*$/.test(line) || /\?\s*for\s*shortcuts/i.test(line));
  if (promptIndex >= 0) {
    return collectAnswerBefore(lines, promptIndex);
  }

  return undefined;
}

function collectAnswerBefore(lines: string[], endExclusive: number): string | undefined {
  const collected: string[] = [];
  for (let i = endExclusive - 1; i >= 0 && collected.length < 8; i -= 1) {
    const line = lines[i];
    if (!line) continue;
    if (isCompletionBoundaryLine(line)) {
      if (collected.length > 0) break;
      continue;
    }
    if (isTerminalNoiseLine(line)) {
      if (collected.length > 0) break;
      continue;
    }
    collected.unshift(line);
  }

  const answer = compactHumanText(collected.join("\n"));
  return isLikelyFinalAnswer(answer) ? answer : undefined;
}

function lastIndexWhere(values: string[], predicate: (value: string) => boolean): number {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (predicate(values[i])) return i;
  }
  return -1;
}

function isCompletionMarkerLine(line: string): boolean {
  return /[\u2722\u2736\u273b\u273d*\u00b7]\s*[^\n]{0,120}?for\s*\d+\s*[smh]\b/i.test(line);
}

function isCompletionBoundaryLine(line: string): boolean {
  return /^>\s*$/.test(line) || /\?\s*for\s*shortcuts/i.test(line) || /^[\s\u2500\-_=|\\\/]+$/.test(line);
}

function isTerminalNoiseLine(line: string): boolean {
  return /^last logs for\b/i.test(line) || /thinking|still thinking|tokens|esc to interrupt|claude code|codex|model:|directory:|update available|winget upgrade|shortcuts/i.test(line);
}

function stripTerminalNoise(line: string): string {
  if (isCompletionMarkerLine(line)) return line.trim();
  return line
    .replace(/^[\s\d*+\-_.\u00b7\u2026\u2722\u2736\u273b\u273d]+(?=[\p{L}\p{N}¿¡])/u, "")
    .replace(/\s*Update available! Run:.*$/i, "")
    .trim();
}

function cleanLogSnapshot(value: string): string {
  return cleanTerminalText(value)
    .replace(/\[[0-9]{4}-[^\]]+\]\s+\[(?:stdout|stderr|system)\]\s*/g, "")
    .replace(/\[[a-f0-9]{8}\]\s*/gi, "")
    .replace(/\s*Update available! Run:[^\n]+/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function compactHumanText(value: string): string {
  const compacted = value
    .replace(/[\u2722\u2736\u273b\u273d*\u00b7]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/([,;!?])(?=\S)/g, "$1 ")
    .replace(/(?<!\b[A-Za-z]):(?=\S)/g, ": ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
  return repairCommonMergedPhrases(compacted);
}

function repairCommonMergedPhrases(value: string): string {
  return value
    .replace(/\bHowcanIassistyou\b/gi, "How can I assist you")
    .replace(/\bHowcanIhelpyou\b/gi, "How can I help you")
    .replace(/\bWhatcanIdoforyou\b/gi, "What can I do for you")
    .replace(/\bWhat'snew\b/gi, "What's new")
    .replace(/\bTry\"howdoIloganerror\?\"/gi, 'Try "how do I log an error?"')
    .replace(/¿?Enqu[eé]tepuedoayudarhoy\??/gi, "¿En qué te puedo ayudar hoy?")
    .replace(/¿?Enqu[eé]tepuedoayudar\??/gi, "¿En qué te puedo ayudar?")
    .replace(/\bdarunamano\b/gi, "dar una mano")
    .replace(/\bTodo bien por aqu[ií], listo para ayudar\. ¿En qu[eé] te puedo ayudar hoy\?/gi, "Todo bien por aquí, listo para ayudar. ¿En qué te puedo ayudar hoy?");
}

function isLikelyFinalAnswer(value: string): boolean {
  if (value.length < 8 || value.length > 1200) return false;
  const lower = value.toLowerCase();
  if (/(thinking|still thinking|tokens|effort|claude code|update available|winget upgrade|shortcuts|model:|directory:)/i.test(value)) return false;
  const thinkingCount = (lower.match(/thinking/g) ?? []).length;
  if (thinkingCount > 1) return false;
  return /[\p{L}\p{N}]/u.test(value);
}

function trimTranscript(value: string): string {
  return value.length > 120_000 ? value.slice(-90_000) : value;
}

function cleanTerminalText(value: string): string {
  return value
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b[P^_][\s\S]*?\x1b\\/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b[()][AB012]/g, "")
    .replace(/\x1b[=>78M]/g, "")
    .replace(/\x1b[@-Z\\-_]/g, "")
    .replace(/\x07/g, "")
    .replace(/\r(?!\n)/g, "\n")
    .replace(/[ \t]+\n/g, "\n");
}
