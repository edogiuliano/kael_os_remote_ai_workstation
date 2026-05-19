import { WebSocketServer, type WebSocket } from "ws";
import type { IncomingMessage, Server } from "node:http";
import { URL } from "node:url";
import { isAuthorizedToken } from "../http/auth.js";
import type { WsEvent } from "../types.js";

export class WsHub {
  private readonly wss: WebSocketServer;
  private readonly clients = new Set<WebSocket>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
      if (!request.url?.startsWith("/ws")) return;
      if (!this.authorize(request)) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.clients.add(ws);
        ws.on("close", () => this.clients.delete(ws));
        ws.send(JSON.stringify({ type: "hello", at: new Date().toISOString() }));
      });
    });
  }

  broadcast(event: WsEvent): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) client.send(payload);
    }
  }

  private authorize(request: IncomingMessage): boolean {
    const url = new URL(request.url || "/ws", "http://localhost");
    const token = url.searchParams.get("token");
    return isAuthorizedToken(token);
  }
}
