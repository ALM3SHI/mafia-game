'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useGame } from '@/client/game-store';
import type { ChatChannel, PlayerView } from '@/game/types';
import { cn } from '../ui';
import { isMafiaRole } from './hooks';

/** Mirrors Room.chatChannelFor so the input can explain why it's disabled. */
export function myChannel(view: PlayerView): { channel: ChatChannel | null; reason?: string } {
  const me = view.players.find(p => p.id === view.meId);
  if (!me) return { channel: null };
  if (view.phase === 'lobby' || view.phase === 'game-over') return { channel: 'public' };
  if (!me.alive) return { channel: 'dead' };
  if (view.phase === 'night') return isMafiaRole(me.role) ? { channel: 'mafia' } : { channel: null, reason: 'المدينة نائمة... لا كلام بالليل' };
  if (view.phase === 'testimony') return view.speakerId === me.id ? { channel: 'public' } : { channel: null, reason: 'انتظر دورك في الشهادة' };
  return { channel: 'public' };
}

const CHANNEL_STYLE: Record<ChatChannel, string> = {
  public: '',
  mafia: 'border-blood/50 bg-blood/15',
  dead: 'border-white/10 bg-white/5 italic text-mist',
};

const PLACEHOLDER: Record<ChatChannel, string> = {
  public: 'قل شيئاً للطاولة...',
  mafia: '🔫 همسة للعائلة فقط...',
  dead: '👻 للأموات فقط...',
};

export function ChatBox({ view, className }: { view: PlayerView; className?: string }) {
  const send = useGame(s => s.send);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const { channel, reason } = myChannel(view);
  const last = view.chat.at(-1)?.id;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [last]);

  return (
    <div className={cn('flex flex-col', className)}>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3" aria-live="polite">
        {view.chat.length === 0 && <p className="mt-6 text-center text-sm text-mist/60">لا أحد تكلم بعد.</p>}
        {view.chat.map(m => {
          const mine = m.authorId === view.meId;
          const system = m.authorId === 'system';
          if (system) return <p key={m.id} className="text-center text-xs text-mist/70">{m.text}</p>;
          const author = view.players.find(p => p.id === m.authorId);
          return (
            <div key={m.id} className={cn('flex gap-2', mine && 'flex-row-reverse')}>
              <span className="mt-0.5 text-lg leading-none">{author?.avatar ?? '•'}</span>
              <div className={cn('max-w-[80%] rounded-lg border px-3 py-1.5', mine ? 'border-brass/40 bg-brass/10' : 'border-white/10 bg-black/30', CHANNEL_STYLE[m.channel])}>
                <span className={cn('block font-kufi text-[11px]', m.channel === 'mafia' ? 'text-blood-hi' : 'text-brass/80')}>
                  {m.authorName}
                  {m.channel === 'mafia' && ' · العائلة'}
                  {m.channel === 'dead' && ' · الأموات'}
                </span>
                <span className="text-sm leading-relaxed text-fog/90">{m.text}</span>
              </div>
            </div>
          );
        })}
      </div>
      <form
        className="flex gap-2 border-t border-white/10 p-3"
        onSubmit={e => {
          e.preventDefault();
          const t = text.trim();
          if (!t || !channel) return;
          send({ type: 'chat', text: t });
          setText('');
        }}
      >
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={!channel}
          maxLength={280}
          placeholder={channel ? PLACEHOLDER[channel] : reason}
          className={cn(
            'min-w-0 flex-1 rounded-lg border bg-black/40 px-3 py-2 text-sm text-fog outline-none placeholder:text-mist/50 focus:border-brass disabled:opacity-50',
            channel === 'mafia' ? 'border-blood/60' : 'border-white/15'
          )}
        />
        <button type="submit" disabled={!channel || !text.trim()} aria-label="إرسال" className="rounded-lg px-3 text-brass hover:text-brass-hi disabled:opacity-30">
          <Send className="h-5 w-5 rotate-180" />
        </button>
      </form>
    </div>
  );
}
