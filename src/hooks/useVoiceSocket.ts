'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';

interface VoiceSocketState {
  isConnected: boolean;
  isRecording: boolean;
  lastResponse: string | null;
}

const WS_URL = 'ws://localhost:8000/ws/audio';

export function useVoiceSocket() {
  const [state, setState] = useState<VoiceSocketState>({
    isConnected: false,
    isRecording: false,
    lastResponse: null,
  });

  // ─── Refs that must outlive renders and be cleaned on unmount ───
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);          // mic tracks — must be stopped
  const readerRef = useRef<FileReader | null>(null);           // FileReader — must be aborted
  const audioElRef = useRef<HTMLAudioElement | null>(null);    // ONE element, reused forever
  const currentBlobUrlRef = useRef<string | null>(null);       // blob: URL — must be revoked
  const mountedRef = useRef(true);                             // guards setState after unmount

  const safeSetState = useCallback(
    (updater: (s: VoiceSocketState) => VoiceSocketState) => {
      if (mountedRef.current) setState(updater);
    },
    []
  );

  // Revoke whatever blob URL we last used. Called on chunk-end, audio error,
  // and unmount. Without this, every TTS reply leaks ~200 KB of decoded PCM.
  const revokeCurrentBlobUrl = useCallback(() => {
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
  }, []);

  // Stop and discard any active mic tracks. Called on send-complete, on stop,
  // and on unmount. Without this the OS-level mic indicator stays on and the
  // MediaStream is retained even after recording finishes.
  const releaseMicStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Reuse a SINGLE <audio> element across all replies. Previously a fresh
  // `new Audio(dataUrl)` was created per reply — those elements stayed alive
  // in Chrome's media graph and accumulated decoded PCM forever.
  const playAudio = useCallback(
    (base64: string) => {
      try {
        // Decode base64 → bytes → Blob, then expose via blob: URL. blob: URLs
        // are explicitly revocable; data: URLs are not, which is the whole
        // reason the previous implementation leaked.
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'audio/mpeg' });

        // Revoke the previous URL BEFORE allocating a new one.
        revokeCurrentBlobUrl();
        const url = URL.createObjectURL(blob);
        currentBlobUrlRef.current = url;

        if (!audioElRef.current) audioElRef.current = new Audio();
        const audio = audioElRef.current;
        audio.onended = revokeCurrentBlobUrl;
        audio.onerror = revokeCurrentBlobUrl;
        audio.src = url;
        audio.play().catch(err => {
          console.warn('[Audio] play() rejected (autoplay policy?):', err);
          revokeCurrentBlobUrl();
        });
      } catch (e) {
        console.error('[Audio] decode failed:', e);
        revokeCurrentBlobUrl();
      }
    },
    [revokeCurrentBlobUrl]
  );

  // Detach all listeners from a socket BEFORE closing it. Without this the
  // closures (which reference setState) keep the previous render's state
  // alive — visible as a steady RAM climb in DevTools heap snapshots.
  const teardownSocket = useCallback((ws: WebSocket | null) => {
    if (!ws) return;
    ws.onopen = null;
    ws.onclose = null;
    ws.onmessage = null;
    ws.onerror = null;
    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    } catch {
      /* noop */
    }
  }, []);

  const connect = useCallback(() => {
    // React Strict Mode runs effects twice in dev → without this guard you'd
    // open two sockets and orphan the first.
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) return;
      teardownSocket(socketRef.current);
      socketRef.current = null;
    }

    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => safeSetState(s => ({ ...s, isConnected: true }));
    ws.onclose = () => safeSetState(s => ({ ...s, isConnected: false }));
    ws.onerror = err => console.error('[VoiceSocket] WS error:', err);
    ws.onmessage = (event) => {
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.error('[VoiceSocket] parse failed', e);
        return;
      }
      // Backend sends either {"status":"success",...} (legacy) or
      // {"status":"chunk", text, audio_data, ...} (new sentence-streaming).
      const d = data as {
        status?: string;
        message?: string;
        text?: string;
        audio_data?: string;
      };
      if (d.status === 'success' || d.status === 'chunk') {
        const replyText = d.message ?? d.text;
        if (replyText) safeSetState(s => ({ ...s, lastResponse: replyText }));
        if (d.audio_data) playAudio(d.audio_data);
      } else if (d.status === 'error') {
        console.error('[VoiceSocket] server error:', d.message);
      }
    };
  }, [safeSetState, playAudio, teardownSocket]);

  const disconnect = useCallback(() => {
    teardownSocket(socketRef.current);
    socketRef.current = null;
  }, [teardownSocket]);

  const startRecording = useCallback(async () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[VoiceSocket] Not connected; reconnecting…');
      connect();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Bail out if we unmounted while waiting for the permission prompt.
      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Free the chunk array IMMEDIATELY — the Blob has its own copy.
        audioChunksRef.current = [];

        const reader = new FileReader();
        readerRef.current = reader;
        reader.onloadend = () => {
          if (!mountedRef.current) return;
          const result = reader.result?.toString();
          const base64 = result?.split(',')[1];
          if (base64 && socketRef.current?.readyState === WebSocket.OPEN) {
            const gs = useGameStore.getState();
            const ctx = {
              phase: gs.currentPhase,
              day: gs.dayCount,
              alivePlayers: gs.players
                .filter(p => p.isAlive)
                .map(p => ({
                  id: p.id,
                  name: p.name,
                  role: p.role,
                  isBot: p.isBot,
                })),
            };
            socketRef.current.send(
              JSON.stringify({
                event: 'audio_complete',
                audio_data: base64,
                game_context: ctx,
              })
            );
          }
          readerRef.current = null;
        };
        reader.readAsDataURL(audioBlob);

        // Always release the mic the instant recording stops. Without this
        // the OS-level mic indicator stays on for the whole session.
        releaseMicStream();
      };

      mediaRecorder.start();
      safeSetState(s => ({ ...s, isRecording: true }));
    } catch (err) {
      console.error('[VoiceSocket] mic denied', err);
      releaseMicStream();
    }
  }, [connect, releaseMicStream, safeSetState]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* already stopped */
      }
      safeSetState(s => ({ ...s, isRecording: false }));
    }
  }, [state.isRecording, safeSetState]);

  // Mount/unmount: connect once, scrub everything on teardown.
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        /* noop */
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      try {
        readerRef.current?.abort();
      } catch {
        /* noop */
      }
      readerRef.current = null;
      releaseMicStream();
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.onended = null;
        audioElRef.current.onerror = null;
        audioElRef.current.removeAttribute('src');
        audioElRef.current.load(); // forces the browser to drop the buffer
        audioElRef.current = null;
      }
      revokeCurrentBlobUrl();
      disconnect();
    };
  }, [connect, disconnect, releaseMicStream, revokeCurrentBlobUrl]);

  return {
    isConnected: state.isConnected,
    isRecording: state.isRecording,
    lastResponse: state.lastResponse,
    startRecording,
    stopRecording,
    connect,
  };
}
