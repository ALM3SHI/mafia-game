import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PHASE_DURATION_KEY: Record<string, 'day_duration' | 'vote_duration' | 'night_duration'> = {
  day: 'day_duration',
  voting: 'vote_duration',
  night: 'night_duration',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { game_id, phase, day_number } = await req.json();
    if (!game_id) throw new Error('game_id required');
    if (!['day', 'voting', 'night', 'ended'].includes(phase)) throw new Error('invalid phase');

    const { data: game } = await supabase
      .from('games')
      .select('id, room_id, day_number')
      .eq('id', game_id)
      .single();
    if (!game) throw new Error('Game not found');

    const { data: room } = await supabase
      .from('rooms')
      .select('settings')
      .eq('id', game.room_id)
      .single();

    const settings = room?.settings || {};
    const update: Record<string, unknown> = {
      phase,
      day_number: Math.max(1, Number(day_number) || Number(game.day_number) || 1),
    };

    if (phase === 'ended') {
      update.ended_at = new Date().toISOString();
      update.phase_ends_at = null;
    } else {
      const durationKey = PHASE_DURATION_KEY[phase];
      const duration = Math.max(5, Number(settings?.[durationKey]) || 15);
      update.phase_ends_at = new Date(Date.now() + duration * 1000).toISOString();
    }

    const { data: updated, error } = await supabase
      .from('games')
      .update(update)
      .eq('id', game_id)
      .select('phase, day_number, phase_ends_at')
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, ...updated }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
