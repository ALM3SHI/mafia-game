/**
 * Online game server.
 *
 *   npm run server            → ws://0.0.0.0:3002  (PORT env to change)
 *
 * The server is authoritative: it owns every Room, runs the clock, and sends
 * each socket only `room.viewFor(thatPlayer)`. Clients send commands.
 *
 * Reconnects: on join the client gets {playerId, secret}; it stores them and
 * sends `resume` after a reload or a dropped connection.
 */
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { Room, applyCommand, makeRoomCode } from '../src/game/room';
import type { ClientMessage, ServerMessage } from '../src/game/protocol';

const PORT = Number(process.env.PORT ?? 3002);
const TICK_MS = 250;
const IDLE_ROOM_MS = 10 * 60_000;
const MAX_MESSAGE_BYTES = 8 * 1024;
const MAX_MSGS_PER_SEC = 25;
const LOBBY_GRACE_MS = 30_000;
const MAX_ROOMS = Number(process.env.MAX_ROOMS ?? 500);

interface Hosted {
  room: Room;
  sockets: Map<string, Set<WebSocket>>; // playerId → sockets
  secrets: Map<string, string>;
  lastActivity: number;
  dirty: boolean;
  /** playerId → when their last socket closed (lobby seats are freed after a grace period). */
  droppedAt: Map<string, number>;
}

interface Client {
  ws: WebSocket;
  code?: string;
  playerId?: string;
  msgWindowStart: number;
  msgCount: number;
}

const rooms = new Map<string, Hosted>();

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(h: Hosted) {
  h.dirty = false;
  for (const [playerId, set] of h.sockets) {
    if (!set.size) continue;
    const view = h.room.viewFor(playerId);
    const payload = JSON.stringify({ t: 'view', view } satisfies ServerMessage);
    for (const ws of set) if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

function createRoom(): Hosted {
  let code = makeRoomCode();
  while (rooms.has(code)) code = makeRoomCode();
  const h: Hosted = { room: new Room({ code, mode: 'online' }), sockets: new Map(), secrets: new Map(), lastActivity: Date.now(), dirty: true, droppedAt: new Map() };
  h.room.onChange = () => (h.dirty = true);
  rooms.set(code, h);
  return h;
}

function attach(client: Client, h: Hosted, playerId: string) {
  detach(client);
  client.code = h.room.code;
  client.playerId = playerId;
  if (!h.sockets.has(playerId)) h.sockets.set(playerId, new Set());
  h.sockets.get(playerId)!.add(client.ws);
  h.droppedAt.delete(playerId);
  h.lastActivity = Date.now();
}

function detach(client: Client, leaving = false) {
  if (!client.code || !client.playerId) return;
  const h = rooms.get(client.code);
  if (h) {
    const set = h.sockets.get(client.playerId);
    set?.delete(client.ws);
    if (leaving) {
      h.sockets.delete(client.playerId);
      h.secrets.delete(client.playerId);
      h.room.leave(client.playerId);
    } else if (!set?.size) {
      h.room.disconnect(client.playerId);
      h.droppedAt.set(client.playerId, Date.now());
    }
  }
  client.code = undefined;
  client.playerId = undefined;
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function handle(client: Client, msg: ClientMessage) {
  const ws = client.ws;
  switch (msg.t) {
    case 'ping':
      return send(ws, { t: 'pong', at: msg.at, serverNow: Date.now() });

    case 'create': {
      if (rooms.size >= MAX_ROOMS) return send(ws, { t: 'error', message: 'السيرفر مزدحم، جرّب بعد شوي', fatal: true });
      const h = createRoom();
      const r = h.room.join(msg.name, msg.avatar, { cosmetics: msg.cosmetics });
      if (!r.ok) return send(ws, { t: 'error', message: r.error, fatal: true });
      const secret = randomBytes(18).toString('base64url');
      h.secrets.set(r.id, secret);
      attach(client, h, r.id);
      send(ws, { t: 'joined', code: h.room.code, playerId: r.id, secret });
      return broadcast(h);
    }

    case 'join': {
      const h = rooms.get(String(msg.code ?? '').toUpperCase().trim());
      if (!h) return send(ws, { t: 'error', message: 'ما لقينا غرفة بهذا الرمز', fatal: true });
      const r = h.room.join(msg.name, msg.avatar, { cosmetics: msg.cosmetics });
      if (!r.ok) return send(ws, { t: 'error', message: r.error, fatal: true });
      const secret = randomBytes(18).toString('base64url');
      h.secrets.set(r.id, secret);
      attach(client, h, r.id);
      send(ws, { t: 'joined', code: h.room.code, playerId: r.id, secret });
      return broadcast(h);
    }

    case 'resume': {
      const h = rooms.get(String(msg.code ?? '').toUpperCase());
      const expected = h?.secrets.get(String(msg.playerId));
      if (!h || !expected || !safeEqual(expected, String(msg.secret ?? '')) || !h.room.reconnect(msg.playerId)) {
        return send(ws, { t: 'error', message: 'انتهت الجلسة، ادخل الغرفة من جديد', fatal: true });
      }
      attach(client, h, msg.playerId);
      send(ws, { t: 'joined', code: h.room.code, playerId: msg.playerId, secret: expected });
      return broadcast(h);
    }

    case 'leave':
      detach(client, true);
      return;

    case 'cmd': {
      if (!client.code || !client.playerId) return send(ws, { t: 'error', message: 'لست في غرفة' });
      const h = rooms.get(client.code);
      if (!h) return send(ws, { t: 'error', message: 'الغرفة لم تعد موجودة', fatal: true });
      h.lastActivity = Date.now();
      const r = applyCommand(h.room, client.playerId, msg.cmd);
      if (!r.ok) send(ws, { t: 'error', message: r.error });
      return;
    }

    default:
      return send(ws, { t: 'error', message: 'رسالة غير معروفة' });
  }
}

// ── HTTP + WS ───────────────────────────────────────────────────────────────

const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server: http, maxPayload: MAX_MESSAGE_BYTES });

wss.on('connection', ws => {
  const client: Client = { ws, msgWindowStart: Date.now(), msgCount: 0 };
  ws.on('message', (data, isBinary) => {
    if (isBinary) return;
    const now = Date.now();
    if (now - client.msgWindowStart > 1000) {
      client.msgWindowStart = now;
      client.msgCount = 0;
    }
    if (++client.msgCount > MAX_MSGS_PER_SEC) return; // drop floods silently
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return send(ws, { t: 'error', message: 'رسالة غير صالحة' });
    }
    try {
      handle(client, msg);
    } catch (e) {
      console.error('[server] handler error', e);
      send(ws, { t: 'error', message: 'خطأ في السيرفر' });
    }
  });
  ws.on('close', () => detach(client));
  ws.on('error', () => detach(client));
});

// Clock + broadcast + cleanup.
setInterval(() => {
  const now = Date.now();
  for (const [code, h] of rooms) {
    try {
      h.room.tick();
    } catch (e) {
      console.error(`[server] tick failed for ${code}`, e);
    }
    // Free lobby seats of players who dropped and did not come back.
    for (const [pid, at] of h.droppedAt) {
      if (now - at < LOBBY_GRACE_MS) continue;
      h.droppedAt.delete(pid);
      if (h.room.phase === 'lobby' && !h.sockets.get(pid)?.size) {
        h.sockets.delete(pid);
        h.secrets.delete(pid);
        h.room.leave(pid);
      }
    }
    if (h.dirty) broadcast(h);
    const anyoneHere = [...h.sockets.values()].some(s => s.size > 0);
    if (anyoneHere) h.lastActivity = now;
    else if (now - h.lastActivity > IDLE_ROOM_MS) rooms.delete(code);
  }
}, TICK_MS);

http.listen(PORT, () => {
  console.log(`🎩 Mafia game server on ws://0.0.0.0:${PORT}  (health: http://localhost:${PORT}/health)`);
});
