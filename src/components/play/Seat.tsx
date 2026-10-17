'use client';

import { motion } from 'framer-motion';
import { Bot, Crown, Mic, Skull, WifiOff } from 'lucide-react';
import { ROLE_INFO } from '@/game/roles';
import type { PublicPlayer } from '@/game/types';
import { RoleMedallion } from '../cards';
import { cn } from '../ui';

const FRAME: Record<string, string> = {
  'frame-gold': 'shadow-[0_0_0_3px_#ecd49a,0_0_24px_6px_rgba(236,212,154,0.45)]',
  'frame-blood': 'shadow-[0_0_0_3px_#d8473f,0_0_26px_8px_rgba(216,71,63,0.5)] animate-pulse-slow',
  'frame-smoke': 'shadow-[0_0_0_3px_#9aa3ab,0_0_30px_12px_rgba(180,190,200,0.35)]',
};

export interface SeatProps {
  player: PublicPlayer;
  isMe?: boolean;
  speaking?: boolean;
  /** Clickable as a target right now. */
  targetable?: boolean;
  /** Highlighted as my chosen target. */
  chosen?: boolean;
  /** Teammates' picks (mafia view). */
  teamMarked?: boolean;
  voteCount?: number;
  voters?: PublicPlayer[];
  hasVoted?: boolean;
  revealTeam?: boolean;
  onClick?: () => void;
  size?: 'md' | 'lg';
}

export function Seat({ player, isMe, speaking, targetable, chosen, teamMarked, voteCount, voters, hasVoted, onClick, size = 'md' }: SeatProps) {
  const dead = !player.alive;
  const dim = size === 'lg' ? 'h-20 w-20 text-4xl sm:h-24 sm:w-24 sm:text-5xl' : 'h-14 w-14 text-3xl sm:h-[4.5rem] sm:w-[4.5rem] sm:text-4xl';
  const role = player.role;
  const mafiaMate = !isMe && role && ROLE_INFO[role].team === 'mafia' && player.alive;
  return (
    <motion.button
      type="button"
      layout
      disabled={!targetable}
      onClick={onClick}
      whileHover={targetable ? { scale: 1.08, y: -4 } : undefined}
      whileTap={targetable ? { scale: 0.96 } : undefined}
      className={cn('group relative flex w-24 flex-col items-center gap-1 outline-none sm:w-28', targetable ? 'cursor-crosshair' : 'cursor-default')}
      aria-label={`${player.name}${dead ? ' (ميت)' : ''}`}
    >
      {/* Spotlight for the current speaker */}
      {speaking && <span className="absolute -top-10 left-1/2 h-36 w-28 -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(236,212,154,0.35),transparent_70%)] blur-sm" />}

      <span
        className={cn(
          'relative grid place-items-center rounded-full border-2 bg-gradient-to-br from-ash to-ink transition-all duration-300',
          dim,
          FRAME[player.cosmetics?.frame ?? ''],
          dead ? 'border-white/10 grayscale opacity-50' : 'border-brass/60',
          speaking && 'border-brass-hi shadow-[0_0_30px_rgba(236,212,154,0.6)]',
          targetable && 'border-blood-hi/80 group-hover:shadow-[0_0_28px_rgba(216,71,63,0.7)]',
          chosen && 'border-blood-hi ring-4 ring-blood-hi/60',
          teamMarked && !chosen && 'ring-2 ring-blood/60',
          mafiaMate && 'shadow-[0_0_18px_rgba(163,32,28,0.6)]'
        )}
      >
        <span className={cn(dead && 'opacity-60')}>{player.avatar}</span>
        {dead && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50">
            <Skull className="h-1/2 w-1/2 text-fog/70" />
          </span>
        )}
        {role && (
          <span className="absolute -bottom-1 -left-1">
            <RoleMedallion role={role} size={size === 'lg' ? 30 : 24} />
          </span>
        )}
        {player.isHost && <Crown className="absolute -top-2 -right-1 h-4 w-4 rotate-12 text-brass-hi drop-shadow" />}
        {speaking && <Mic className="absolute -top-2 -left-1 h-4 w-4 animate-pulse text-brass-hi" />}
        {!player.connected && !player.isBot && <WifiOff className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-ink p-0.5 text-blood-hi" />}
        {player.isBot && !dead && <Bot className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-ink p-0.5 text-rain" />}
        {voteCount ? (
          <motion.span
            key={voteCount}
            initial={{ scale: 1.6 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 left-1/2 grid h-6 min-w-6 -translate-x-1/2 place-items-center rounded-full bg-blood px-1.5 font-kufi text-xs font-bold text-fog shadow-lg"
          >
            {voteCount}
          </motion.span>
        ) : null}
        {hasVoted && !voteCount && <span className="absolute -top-1 right-0 h-2.5 w-2.5 rounded-full bg-jade shadow" title="صوّت" />}
      </span>

      <span className={cn('max-w-full truncate rounded px-1.5 font-kufi text-xs sm:text-sm', isMe ? 'bg-brass/20 text-brass-hi' : dead ? 'text-mist/60 line-through' : 'text-fog')}>
        {player.name}
        {isMe && ' (أنت)'}
      </span>
      {player.cosmetics?.title && !dead && <span className="-mt-1 max-w-full truncate text-[10px] text-brass/70">{player.cosmetics.title}</span>}
      {dead && role && <span className="-mt-1 text-[10px] text-mist">{ROLE_INFO[role].name}</span>}
      {voters && voters.length > 0 && (
        <span className="flex max-w-full flex-wrap justify-center gap-0.5">
          {voters.map(v => (
            <span key={v.id} title={v.name} className="text-sm leading-none">
              {v.avatar}
            </span>
          ))}
        </span>
      )}
    </motion.button>
  );
}
