'use client';

/**
 * Transports feed PlayerViews to the UI and carry commands back.
 *  - LocalTransport: runs a Room in this tab (single-player vs bots).
 *  - OnlineTransport: talks to the Node server over WebSocket, with
 *    auto-reconnect + session resume.
 */
import { Room, applyCommand, makeRoomCode } from '@/game/room';
import type { Command, ClientMessage, ServerMessage } from '@/game/protocol';
import type { Cosmetics, PlayerView } from '@/game/types';

export type ConnStatus = 'connecting' | 'connected' | 'reconnecting' | 'closed';

export interface TransportEvents {
  onView: (view: PlayerView) => void;
  onError: (message: string, fatal: boolean) => void;
  onStatus: (status: ConnStatus) => void;
}

export interface GameTransport {
  readonly kind: 'local' | 'online';
  send(cmd: Command): void;
  close(): void;
}

export interface Identity {
  name: string;
  avatar: string;
  cosmetics?: Cosmetics;
}

// ── Local ──────────────────────────────────────────────────────────────────

export class LocalTransport implements GameTransport {
  readonly kind = 'local' as const;
  readonly room: Room;
  readonly meId: string;
  private timer: ReturnType<typeof setInterval>;
  private pending = false;

  constructor(identity: Identity, private ev: TransportEvents) {
    this.room = new Room({ code: makeRoomCode(), mode: 'local' });
    const r = this.room.join(identity.name, identity.avatar, { cosmetics: identity.cosmetics });
    if (!r.ok) throw new Error(r.error);
    this.meId = r.id;
    this.room.fillWithBots(this.meId, 7);
    this.room.setReady(this.meId, true);
    this.room.onChange = () => this.schedule();
    this.timer = setInterval(() => this.room.tick(), 250);
    ev.onStatus('connected');
    this.push();
  }

  private schedule() {
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      this.push();
    });
  }

  private push() {
    this.ev.onView(this.room.viewFor(this.meId));
  }

  send(cmd: Command) {
    const r = applyCommand(this.room, this.meId, cmd);
    if (!r.ok) this.ev.onError(r.error, false);
  }

  /** Voice replies: let a bot speak text produced by the LLM. */
  botSay(botId: string, text: string) {
    const b = this.room.player(botId);
    if (b?.isBot) this.room.botSay(b, text);
  }

  close() {
    clearInterval(this.timer);
    this.room.onChange = undefined;
  }
}

// ── Online ─────────────────────────────────────────────────────────────────

const SESSION_KEY = 'mafia.session';

export interface Session {
  code: string;
  playerId: string;
  secret: string;
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked */
  }
}

export function gameServerUrl(): string {
  const env = process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  if (env) return env;
  if (typeof window === 'undefined') return 'ws://localhost:3002';
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.hostname}:3002`;
}

export type OnlineIntent = { kind: 'create'; identity: Identity } | { kind: 'join'; code: string; identity: Identity } | { kind: 'resume'; session: Session };

export class OnlineTransport implements GameTransport {
  readonly kind = 'online' as const;
  private ws: WebSocket | null = null;
  private session: Session | null = null;
  private closed = false;
  private attempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private queue: ClientMessage[] = [];

  constructor(private intent: OnlineIntent, private ev: TransportEvents) {
    if (intent.kind === 'resume') this.session = intent.session;
    this.open();
  }

  private open() {
    if (this.closed) return;
    this.ev.onStatus(this.attempts ? 'reconnecting' : 'connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(gameServerUrl());
    } catch {
      this.retry();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.attempts = 0;
      this.ev.onStatus('connected');
      if (this.session) this.raw({ t: 'resume', ...this.session });
      else if (this.intent.kind === 'create') this.raw({ t: 'create', ...this.intent.identity });
      else if (this.intent.kind === 'join') this.raw({ t: 'join', code: this.intent.code, ...this.intent.identity });
      for (const m of this.queue.splice(0)) this.raw(m);
      this.pingTimer = setInterval(() => this.raw({ t: 'ping', at: Date.now() }), 15_000);
    };

    ws.onmessage = e => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.t === 'joined') {
        this.session = { code: msg.code, playerId: msg.playerId, secret: msg.secret };
        saveSession(this.session);
      } else if (msg.t === 'view') {
        this.ev.onView(msg.view);
      } else if (msg.t === 'error') {
        if (msg.fatal) {
          saveSession(null);
          this.closed = true;
          ws.close();
        }
        this.ev.onError(msg.message, !!msg.fatal);
      }
    };

    ws.onclose = () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      if (this.closed) {
        this.ev.onStatus('closed');
        return;
      }
      this.retry();
    };
    ws.onerror = () => {
      /* onclose follows */
    };
  }

  private retry() {
    this.attempts += 1;
    if (this.attempts > 8) {
      this.closed = true;
      this.ev.onStatus('closed');
      this.ev.onError('تعذّر الاتصال بسيرفر اللعبة. تأكد أنه شغّال (npm run server).', true);
      return;
    }
    this.ev.onStatus('reconnecting');
    const delay = Math.min(8000, 500 * 2 ** (this.attempts - 1));
    this.retryTimer = setTimeout(() => this.open(), delay);
  }

  private raw(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else if (msg.t !== 'ping') this.queue.push(msg);
  }

  send(cmd: Command) {
    this.raw({ t: 'cmd', cmd });
  }

  close() {
    this.closed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: 'leave' } satisfies ClientMessage));
    this.ws?.close();
    saveSession(null);
  }
}
