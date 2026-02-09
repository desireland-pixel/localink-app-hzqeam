import type { App } from '../index.js';
import type { WebSocket } from 'ws';
import { wsManager } from '../websocket-manager.js';

export function registerWebSocketRoutes(app: App) {
  const auth = app.requireAuth();

  app.fastify.route({
    method: 'GET',
    url: '/ws/messages',
    schema: {
      description: 'WebSocket endpoint for real-time messaging',
      tags: ['websocket'],
    },
    wsHandler: async (socket: WebSocket, request) => {
      // Validate session from the initial HTTP upgrade request
      const session = await auth(request, {} as any);

      if (!session) {
        app.logger.warn('Unauthorized WebSocket connection attempt');
        socket.send(JSON.stringify({ type: 'error', error: 'Unauthorized' }));
        socket.close();
        return;
      }

      const userId = session.user.id;
      app.logger.info({ userId }, 'WebSocket client connected');

      // Register client with manager
      wsManager.addClient(userId, socket);

      // Send connection success message
      socket.send(JSON.stringify({
        type: 'connected',
        userId,
      }));

      socket.on('message', (raw) => {
        try {
          const data = JSON.parse(raw.toString());
          app.logger.info({ userId, messageType: data.type }, 'WebSocket message received');

          // Handle ping/pong for keepalive
          if (data.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }));
          }

          // Additional message types can be handled here
        } catch (error) {
          app.logger.error({ err: error, userId }, 'Invalid WebSocket message');
          socket.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
        }
      });

      socket.on('close', () => {
        wsManager.removeClient(userId, socket);
        app.logger.info({ userId }, 'WebSocket client disconnected');
      });

      socket.on('error', (error) => {
        app.logger.error({ err: error, userId }, 'WebSocket error');
      });
    },
    handler: async (request, reply) => {
      return { protocol: 'ws', path: '/ws/messages' };
    },
  });
}
