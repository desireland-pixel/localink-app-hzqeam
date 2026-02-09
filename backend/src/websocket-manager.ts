import type { WebSocket } from 'ws';

class WebSocketManager {
  private clients: Map<string, Set<WebSocket>> = new Map();

  addClient(userId: string, socket: WebSocket): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(socket);
  }

  removeClient(userId: string, socket: WebSocket): void {
    const userSockets = this.clients.get(userId);
    if (userSockets) {
      userSockets.delete(socket);
      if (userSockets.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  broadcastToUser(userId: string, message: any): void {
    const userSockets = this.clients.get(userId);
    if (userSockets) {
      const messageStr = JSON.stringify(message);
      for (const socket of userSockets) {
        try {
          socket.send(messageStr);
        } catch (error) {
          // Socket might be closed, will be cleaned up on close event
        }
      }
    }
  }

  broadcastToUsers(userIds: string[], message: any): void {
    for (const userId of userIds) {
      this.broadcastToUser(userId, message);
    }
  }
}

export const wsManager = new WebSocketManager();
