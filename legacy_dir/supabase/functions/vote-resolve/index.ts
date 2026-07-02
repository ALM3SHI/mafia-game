import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROLE_NAMES: Record<string, string> = {
  godfather: 'العراب',
  mafioso: 'المنفذ',
  framer: 'المزور',
  consigliere: 'المتسلل',
  doctor: 'الطبيب',
  sheriff: 'المحقق',
  bodyguard: 'الحارس',
  mayor: 'العمدة',
  medium: 'المشعوذ',
  citizen: 'مواطن',
  jester: 'المهرج',
  sk: 'القاتل المتسلسل',
  executioner: 'المنتقم',
  witch: 'الساحر',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { game_id } = await req.json();
    if (!game_id) throw new Error('game_id required');

    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('id', game_id)
      .single();
    if (!game || game.phase !== 'voting') throw new Error('Not voting phase');

    const dayNum = Number(game.day_number) || 1;

    const [{ data: votes }, { data: players }, { data: roomData }] = await Promise.all([
      supabase.from('votes').select('*').eq('game_id', game_id).eq('day_num', dayNum),
      supabase.from('game_players').select('*').eq('game_id', game_id).eq('is_alive', true),
      supabase.from('rooms').select('settings').eq('id', game.room_id).single(),
    ]);

    const alivePlayers = players || [];
    const aliveIds = new Set(alivePlayers.map((player: any) => player.player_id));
    const voteCounts = new Map<string, number>();

    for (const vote of votes || []) {
      if (!aliveIds.has(vote.voter_id) || !vote.target_id || !aliveIds.has(vote.target_id)) continue;
      const voter = alivePlayers.find((player: any) => player.player_id === vote.voter_id);
      const weight = voter?.role === 'mayor' ? 2 : 1;
      voteCounts.set(vote.target_id, (voteCounts.get(vote.target_id) || 0) + weight);
    }

    let maxVotes = 0;
    let eliminated: string | null = null;
    let tie = false;

    for (const [playerId, count] of voteCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminated = playerId;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
        eliminated = null;
      }
    }

    let result: Record<string, unknown> = {
      success: true,
      eliminated: null,
      role: null,
      team: null,
      winner: null,
    };

    if (eliminated && !tie) {
      const eliminatedPlayer = alivePlayers.find((player: any) => player.player_id === eliminated);
      await supabase.from('game_players').update({
        is_alive: false,
        death_phase: 'vote',
        death_day: dayNum,
      }).eq('game_id', game_id).eq('player_id', eliminated);

      result = {
        ...result,
        eliminated,
        role: eliminatedPlayer?.role || null,
        team: eliminatedPlayer?.team || null,
      };

      if (eliminatedPlayer?.role === 'jester') {
        result.winner = 'jester';
      } else {
        const { data: executioner } = await supabase
          .from('game_players')
          .select('player_id, executioner_target')
          .eq('game_id', game_id)
          .eq('role', 'executioner')
          .eq('is_alive', true)
          .maybeSingle();

        if (executioner?.executioner_target === eliminated) {
          result.winner = 'executioner';
        }
      }

      await supabase.from('messages').insert({
        game_id,
        sender_id: eliminated,
        content: `🗳️ أُقصي لاعب من الجولة. دوره كان: ${ROLE_NAMES[String(result.role || '')] || result.role || 'غير معروف'}`,
        channel: 'system',
      });
    } else {
      const announcerId = alivePlayers[0]?.player_id;
      if (announcerId) {
        await supabase.from('messages').insert({
          game_id,
          sender_id: announcerId,
          content: '⚖️ انتهى التصويت بلا إقصاء.',
          channel: 'system',
        });
      }
    }

    const remainingPlayers = eliminated && !tie
      ? alivePlayers.filter((player: any) => player.player_id !== eliminated)
      : alivePlayers;

    const totalAlive = remainingPlayers.length;
    const mafiaCount = remainingPlayers.filter((player: any) => player.team === 'mafia').length;
    const townCount  = remainingPlayers.filter((player: any) => player.team === 'town').length;
    const skCount    = remainingPlayers.filter((player: any) => player.role === 'sk').length;

    if (!result.winner) {
      if (mafiaCount === 0 && skCount === 0 && townCount > 0) {
        result.winner = 'town';
      } else if (mafiaCount >= (totalAlive - mafiaCount) && mafiaCount > 0) {
        result.winner = 'mafia';
      } else if (skCount > 0 && totalAlive <= 1) {
        result.winner = 'sk';
      } else if (totalAlive === 0) {
        result.winner = 'draw';
      }
    }

    if (result.winner) {
      await supabase.from('games').update({
        phase: 'ended',
        winner_team: result.winner,
        ended_at: new Date().toISOString(),
        phase_ends_at: null,
      }).eq('id', game_id);
    } else {
      const nightDuration = Math.max(5, Number(roomData?.settings?.night_duration) || 15);
      await supabase.from('games').update({
        phase: 'night',
        phase_ends_at: new Date(Date.now() + nightDuration * 1000).toISOString(),
      }).eq('id', game_id);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
