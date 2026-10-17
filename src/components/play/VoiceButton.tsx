'use client';

import { useCallback } from 'react';
import { Mic } from 'lucide-react';
import { useGame } from '@/client/game-store';
import { LocalTransport } from '@/client/transport';
import { useVoiceSocket, type VoiceContext } from '@/hooks/useVoiceSocket';
import { ROLE_INFO } from '@/game/roles';
import type { PlayerView } from '@/game/types';
import { cn } from '../ui';

/**
 * Push-to-talk to the Python voice backend (local games only). What you say
 * is posted to the table chat; one living bot answers in character, aloud.
 */
export function VoiceButton({ view }: { view: PlayerView }) {
  const buildContext = useCallback((): VoiceContext | null => {
    const t = useGame.getState().transport;
    if (!(t instanceof LocalTransport)) return null;
    const room = t.room;
    const human = room.player(t.meId);
    const bots = room.players.filter(p => p.isBot && p.alive);
    const speaker = room.speakerId ? room.player(room.speakerId) : undefined;
    const bot = speaker?.isBot ? speaker : bots[Math.floor(Math.random() * bots.length)];
    if (!bot || !human) return null;
    return {
      speaker: {
        id: bot.id,
        name: bot.name,
        role: bot.role ? ROLE_INFO[bot.role].name : undefined,
        mafiaTeammates: bot.role === 'mafia' || bot.role === 'godfather' ? room.players.filter(p => (p.role === 'mafia' || p.role === 'godfather') && p.id !== bot.id).map(p => p.name) : [],
      },
      humanName: human.name,
      phase: room.phase,
      round: room.round,
      alivePlayers: room.players.filter(p => p.alive).map(p => p.name),
      deadPlayers: room.players.filter(p => !p.alive).map(p => ({ name: p.name, role: room.settings.revealRolesOnDeath && p.role ? ROLE_INFO[p.role].name : undefined })),
    };
  }, []);

  const voice = useVoiceSocket({
    buildContext,
    onTranscript: text => useGame.getState().send({ type: 'chat', text }),
    onReply: (text, botId) => {
      const t = useGame.getState().transport;
      if (t instanceof LocalTransport) t.botSay(botId, text);
    },
    onError: msg => useGame.getState().toast(msg, 'error'),
  });

  return (
    <div className="mt-2 flex items-center justify-center gap-2">
      <button
        onPointerDown={() => voice.startRecording()}
        onPointerUp={voice.stopRecording}
        onPointerLeave={voice.stopRecording}
        disabled={!voice.isConnected}
        className={cn(
          'flex items-center gap-2 rounded-full border px-4 py-1.5 font-kufi text-sm transition disabled:opacity-40',
          voice.isRecording ? 'border-blood-hi bg-blood text-fog' : 'border-rain/60 text-rain hover:bg-rain/10'
        )}
      >
        <Mic className={cn('h-4 w-4', voice.isRecording && 'animate-pulse')} />
        {voice.isRecording ? 'أسمعك... أفلت للإرسال' : voice.isThinking ? 'يفكر...' : voice.isConnected ? 'اضغط مطولاً وتكلم' : 'الخادم الصوتي غير متصل'}
      </button>
      <span className="sr-only">{view.phase}</span>
    </div>
  );
}
