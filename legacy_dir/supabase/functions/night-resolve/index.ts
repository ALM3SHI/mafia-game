import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    if (!game || game.phase !== 'night') throw new Error('Not night phase');

    const nightNum = Number(game.day_number) || 1;

    const [{ data: actions }, { data: players }, { data: roomData }] = await Promise.all([
      supabase.from('night_actions').select('*').eq('game_id', game_id).eq('night_num', nightNum),
      supabase.from('game_players').select('*').eq('game_id', game_id).eq('is_alive', true),
      supabase.from('rooms').select('settings').eq('id', game.room_id).single(),
    ]);

    const alivePlayers = players || [];
    const aliveMap = new Map(alivePlayers.map((player: any) => [player.player_id, player]));
    const actionsList = (actions || []).filter((action: any) => aliveMap.has(action.player_id));

    // 1. APPLY REDIRECTS (WITCH)
    const redirects = actionsList.filter(a => a.action_type.startsWith('redirect:'));
    for (const red of redirects) {
      const victimId = red.action_type.split(':')[1];
      const newTargetId = red.target_id;
      
      // Find victim's existing action and modify it
      const victimAction = actionsList.find(a => a.player_id === victimId);
      if (victimAction) {
        victimAction.target_id = newTargetId;
      } else {
        // If victim hadn't acted, the witch forces them to act on the new target (if they have an active ability)
        // For simplicity, we only redirect existing actions for now
      }
    }

    // Helper functions for post-redirect processing
    const getFirstAction = (type: string) => actionsList.find((a: any) => a.action_type === type);
    const getAllActions = (type: string) => actionsList.filter((a: any) => a.action_type === type);

    const doctorSaves = new Set(
      getAllActions('save')
        .map((a: any) => a.target_id)
        .filter((id: string | null) => Boolean(id) && aliveMap.has(id))
    );

    const bodyguardAction = getFirstAction('guard');
    const mafiaAttack = getFirstAction('kill');
    const skAttacks = getAllActions('sk_kill');
    const frameAction = getFirstAction('frame');
    const sheriffActions = getAllActions('investigate');
    const consigliereActions = getAllActions('scout');

    const deaths = new Set<string>();
    const saves = new Set<string>();
    const results: Record<string, any> = {};

    // 2. PROCESS KILLINGS
    // Mafia Attack
    if (mafiaAttack?.target_id && aliveMap.has(mafiaAttack.target_id)) {
      const targetId = mafiaAttack.target_id as string;
      if (doctorSaves.has(targetId)) {
        saves.add(targetId);
      } else if (bodyguardAction?.target_id === targetId && aliveMap.has(bodyguardAction.player_id)) {
        deaths.add(bodyguardAction.player_id);
        const attacker = alivePlayers.find((p: any) =>
          p.team === 'mafia' && ['godfather', 'mafioso'].includes(p.role)
        );
        if (attacker) deaths.add(attacker.player_id);
      } else {
        deaths.add(targetId);
      }
    }

    // Serial Killer Attacks
    for (const attack of skAttacks) {
      const targetId = attack.target_id as string | null;
      if (!targetId || !aliveMap.has(targetId)) continue;
      if (doctorSaves.has(targetId)) {
        saves.add(targetId);
        continue;
      }
      deaths.add(targetId);
    }

    // 3. APPLY FRAMING
    await supabase.from('game_players').update({ is_framed: false }).eq('game_id', game_id);
    if (frameAction?.target_id && aliveMap.has(frameAction.target_id)) {
      await supabase.from('game_players').update({ is_framed: true })
        .eq('game_id', game_id)
        .eq('player_id', frameAction.target_id);
    }

    // 4. PROCESS INVESTIGATIONS
    // Sheriff
    for (const sheriffAction of sheriffActions) {
      if (sheriffAction.target_id && aliveMap.has(sheriffAction.target_id)) {
        const target = aliveMap.get(sheriffAction.target_id);
        const isTargetFramed = frameAction?.target_id === sheriffAction.target_id;
        const suspicious = Boolean(
          target &&
          (target as any).role !== 'godfather' &&
          ((target as any).team === 'mafia' || isTargetFramed)
        );
        results[`sheriff_${sheriffAction.player_id}`] = {
          for_player: sheriffAction.player_id,
          target_id: sheriffAction.target_id,
          result: suspicious ? 'suspicious' : 'innocent',
        };
      }
    }

    // Consigliere
    for (const consigliereAction of consigliereActions) {
      if (consigliereAction.target_id && aliveMap.has(consigliereAction.target_id)) {
        const target = aliveMap.get(consigliereAction.target_id);
        results[`consigliere_${consigliereAction.player_id}`] = {
          for_player: consigliereAction.player_id,
          target_id: consigliereAction.target_id,
          role: (target as any)?.role || null,
        };
      }
    }

    // 5. COMMITTING DEATHS
    const uniqueDeaths = [...deaths];
    for (const playerId of uniqueDeaths) {
      await supabase.from('game_players').update({
        is_alive: false,
        death_phase: 'night',
        death_day: nightNum,
      }).eq('game_id', game_id).eq('player_id', playerId);
    }

    // 6. CLEANUP & MESSAGING
    await supabase.from('night_actions').delete().eq('game_id', game_id).eq('night_num', nightNum);

    const survivors = alivePlayers.filter((p: any) => !deaths.has(p.player_id));
    const mafiaCount = survivors.filter((p: any) => p.team === 'mafia').length;
    const townCount  = survivors.filter((p: any) => p.team === 'town').length;
    const skCount    = survivors.filter((p: any) => p.role === 'sk').length;
    const totalAlive = survivors.length;

    let winner: string | null = null;
    if (mafiaCount === 0 && skCount === 0 && townCount > 0) {
      winner = 'town';
    } else if (mafiaCount >= (totalAlive - mafiaCount) && mafiaCount > 0) {
      winner = 'mafia';
    } else if (skCount > 0 && totalAlive <= 1) {
      winner = 'sk';
    } else if (totalAlive === 0) {
      winner = 'draw';
    }

    const announcerId = alivePlayers[0]?.player_id;
    if (announcerId) {
      const content = uniqueDeaths.length === 0
        ? '🌅 أشرقت الشمس... لم يُقتل أحد الليلة.'
        : `🌅 أشرقت الشمس... سقط ${uniqueDeaths.length} لاعب في الليل.`;
      
      await supabase.from('messages').insert({
        game_id,
        sender_id: announcerId,
        content,
        channel: 'system',
      });
      
      // If people died, broadcast their names
      for (const pid of uniqueDeaths) {
          const victim = aliveMap.get(pid);
          if (victim) {
              await supabase.from('messages').insert({
                  game_id,
                  sender_id: announcerId,
                  content: `💀 وُجد [${(victim as any).profiles?.username || 'مجهول'}] مقتولاً في منزله.`,
                  channel: 'system',
              });
          }
      }
    }

    if (winner) {
      await supabase.from('games').update({
        phase: 'ended',
        winner_team: winner,
        ended_at: new Date().toISOString(),
        phase_ends_at: null,
      }).eq('id', game_id);
    } else {
      const dayDuration = Math.max(5, Number(roomData?.settings?.day_duration) || 15);
      await supabase.from('games').update({
        phase: 'day',
        day_number: nightNum + 1,
        phase_ends_at: new Date(Date.now() + dayDuration * 1000).toISOString(),
      }).eq('id', game_id);
    }

    return new Response(JSON.stringify({
      success: true,
      deaths: uniqueDeaths,
      saves: [...saves],
      results,
      winner,
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
