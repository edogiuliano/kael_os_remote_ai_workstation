import { EventEmitter } from "node:events";

interface DesktopBridgeEvents {
  "open-session-window": [string];
}

class DesktopBridge extends EventEmitter {
  emitOpenSessionWindow(sessionId: string): void {
    this.emit("open-session-window", sessionId);
  }

  onOpenSessionWindow(listener: (sessionId: string) => void): void {
    this.on("open-session-window", listener);
  }
}

export const desktopBridge = new DesktopBridge() as DesktopBridge & {
  emit<K extends keyof DesktopBridgeEvents>(event: K, ...args: DesktopBridgeEvents[K]): boolean;
  on<K extends keyof DesktopBridgeEvents>(event: K, listener: (...args: DesktopBridgeEvents[K]) => void): DesktopBridge;
};
