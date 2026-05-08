import { WebSocketServer } from 'ws';

const PROTOCOL_VERSION = 1;

/**
 * Attach a WebSocket server to an existing http.Server on the given path.
 *
 * Returns:
 *   - broadcast(event): send a typed WS event to every connected client
 *   - clientCount(): current connection count (used by the simulator to pause)
 *   - onClientCountChange(cb): subscribe to count changes (cb receives new count)
 *   - close(): cleanly close the WS server
 */
export function attachWsServer(httpServer, path = '/ws') {
  const wss = new WebSocketServer({ server: httpServer, path });
  const listeners = new Set();

  function notifyCount() {
    const n = wss.clients.size;
    for (const cb of listeners) cb(n);
  }

  wss.on('connection', (ws) => {
    // Send hello immediately on connect.
    const hello = {
      type: 'hello',
      serverTime: new Date().toISOString(),
      protocolVersion: PROTOCOL_VERSION,
    };
    try {
      ws.send(JSON.stringify(hello));
    } catch {
      // Client may have closed before we wrote - ignore.
    }
    notifyCount();
    ws.on('close', notifyCount);
    ws.on('error', () => {
      // Don't crash the server on client errors. ws fires 'close' afterwards.
    });
  });

  function broadcast(event) {
    const payload = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        try { client.send(payload); } catch { /* ignore */ }
      }
    }
  }

  function clientCount() {
    return wss.clients.size;
  }

  function onClientCountChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function close() {
    return new Promise((resolve) => wss.close(resolve));
  }

  return { broadcast, clientCount, onClientCountChange, close };
}
