'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Push-to-talk bridge to the FastAPI voice backend (/ws/audio).
 *
 * Protocol (see game_backend/main.py):
 *   → { event: 'audio_complete', audio_data: <base64 webm>, speaker_id, game_context }
 *   ← { status: 'transcript', text }                 what Whisper heard
 *   ← { status: 'chunk', index, text, audio_data }    one sentence of the reply (wav)
 *   ← { status: 'done', full_text, timings }          end of reply
 *   ← { status: 'error', message }
 *
 * Reply sentences are queued and played back-to-back; previously each new
 * chunk cut off the one still playing.
 */

export interface VoiceContext {
  speaker: { id: string; name: string; role?: string; mafiaTeammates: string[] };
  humanName: string;
  phase: string;
  round: number;
  alivePlayers: string[];
  deadPlayers: { name: string; role?: string }[];
}

interface Options {
  buildContext: () => VoiceContext | null;
  onTranscript?: (text: string) => void;
  onReply?: (text: string, speakerId: string) => void;
  onError?: (message: string) => void;
}

const WS_BASE = process.env.NEXT_PUBLIC_VOICE_WS_URL || 'ws://localhost:8000/ws/audio';
const WS_TOKEN = process.env.NEXT_PUBLIC_VOICE_API_KEY || '';
const RECONNECT_MS = 5000;

function wsUrl(): string {
  if (!WS_TOKEN) return WS_BASE;
  const sep = WS_BASE.includes('?') ? '&' : '?';
  return `${WS_BASE}${sep}token=${encodeURIComponent(WS_TOKEN)}`;
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export function useVoiceSocket({ buildContext, onTranscript, onReply, onError }: Options) {
  const [isConnected, setConnected] = useState(false);
  const [isRecording, setRecording] = useState(false);
  const [isThinking, setThinking] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]); // blob: URLs waiting to play
  const playingUrlRef = useRef<string | null>(null);
  const pendingSpeakerRef = useRef<string>('');
  const mountedRef = useRef(true);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Self-referencing callbacks (audio `onended` → next, socket `onclose` → reconnect)
  // go through refs so the hooks linter can see a stable reference.
  const playNextRef = useRef<() => void>(() => {});
  const connectRef = useRef<() => void>(() => {});

  // Keep callbacks fresh without re-creating the socket.
  const cbRef = useRef({ buildContext, onTranscript, onReply, onError });
  useEffect(() => {
    cbRef.current = { buildContext, onTranscript, onReply, onError };
  });

  // ── Playback queue ───────────────────────────────────────────────────────
  const playNext = useCallback(() => {
    if (playingUrlRef.current) {
      URL.revokeObjectURL(playingUrlRef.current);
      playingUrlRef.current = null;
    }
    const next = queueRef.current.shift();
    if (!next) return;
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    playingUrlRef.current = next;
    audio.onended = () => playNextRef.current();
    audio.onerror = () => playNextRef.current();
    audio.src = next;
    audio.play().catch(() => playNextRef.current());
  }, []);
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const enqueueAudio = useCallback(
    (b64: string) => {
      try {
        queueRef.current.push(URL.createObjectURL(base64ToBlob(b64, 'audio/wav')));
        if (!playingUrlRef.current) playNext();
      } catch {
        /* corrupt chunk — skip it */
      }
    },
    [playNext]
  );

  const clearAudio = useCallback(() => {
    queueRef.current.forEach(u => URL.revokeObjectURL(u));
    queueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    if (playingUrlRef.current) URL.revokeObjectURL(playingUrlRef.current);
    playingUrlRef.current = null;
  }, []);

  // ── Socket ───────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const cur = socketRef.current;
    if (cur && (cur.readyState === WebSocket.OPEN || cur.readyState === WebSocket.CONNECTING)) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl());
    } catch {
      return;
    }
    socketRef.current = ws;

    ws.onopen = () => mountedRef.current && setConnected(true);
    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      setThinking(false);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(() => connectRef.current(), RECONNECT_MS);
    };
    ws.onerror = () => {
      /* onclose follows; backend may simply not be running */
    };
    ws.onmessage = event => {
      let d: { status?: string; message?: string; text?: string; full_text?: string; audio_data?: string };
      try {
        d = JSON.parse(event.data);
      } catch {
        return;
      }
      switch (d.status) {
        case 'transcript':
          if (d.text) cbRef.current.onTranscript?.(d.text);
          break;
        case 'chunk':
          if (d.text) setLastResponse(d.text);
          if (d.audio_data) enqueueAudio(d.audio_data);
          break;
        case 'done':
          setThinking(false);
          if (d.full_text) {
            setLastResponse(d.full_text);
            cbRef.current.onReply?.(d.full_text, pendingSpeakerRef.current);
          }
          break;
        case 'error':
          setThinking(false);
          cbRef.current.onError?.(d.message || 'خطأ في الخادم');
          break;
      }
    };
  }, [enqueueAudio]);
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const releaseMic = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // ── Recording ────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (recorderRef.current) return;
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      connect();
      cbRef.current.onError?.('الخادم الصوتي غير متصل');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = e => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        recorderRef.current = null;
        releaseMic();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (blob.size < 2000) return; // tap, not speech
        const ctx = cbRef.current.buildContext();
        if (!ctx) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result?.toString().split(',')[1];
          const ws = socketRef.current;
          if (!b64 || !mountedRef.current || ws?.readyState !== WebSocket.OPEN) return;
          pendingSpeakerRef.current = ctx.speaker.id;
          clearAudio();
          setThinking(true);
          ws.send(JSON.stringify({ event: 'audio_complete', audio_data: b64, speaker_id: ctx.speaker.id, game_context: ctx }));
        };
        reader.readAsDataURL(blob);
      };
      rec.start();
      setRecording(true);
    } catch {
      releaseMic();
      cbRef.current.onError?.('تعذر الوصول للمايكروفون');
    }
  }, [connect, releaseMic, clearAudio]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    setRecording(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      try {
        recorderRef.current?.stop();
      } catch {
        /* noop */
      }
      recorderRef.current = null;
      releaseMic();
      clearAudio();
      audioRef.current = null;
      const ws = socketRef.current;
      socketRef.current = null;
      if (ws) {
        ws.onopen = ws.onclose = ws.onmessage = ws.onerror = null;
        ws.close();
      }
    };
  }, [connect, releaseMic, clearAudio]);

  return { isConnected, isRecording, isThinking, lastResponse, startRecording, stopRecording };
}
