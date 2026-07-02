-- ============================================================
-- KICK PLAYER RPC FUNCTION
-- Created: 2026-04-03
-- Purpose: Backend logic for player removal with moderation tracking
-- ============================================================

-- RPC: Kick a player from lobby (host-only)
create or replace function public.kick_player(
  p_room_id uuid,
  p_player_id uuid,
  p_reason text default null
)
returns json language plpgsql security definer as $$
declare
  v_host_id uuid;
  v_player_name text;
begin
  -- Verify host authority
  select host_id into v_host_id from public.rooms where id = p_room_id;
  if v_host_id is null then
    return json_build_object('success', false, 'error', 'الغرفة غير موجودة');
  end if;
  if v_host_id != auth.uid() then
    return json_build_object('success', false, 'error', 'أنت لست مضيف الغرفة');
  end if;
  
  -- Get player name for response
  select username into v_player_name from public.profiles where id = p_player_id;
  
  -- Record kick in auditing table
  insert into public.player_kicks (room_id, player_id, kicked_by, reason, is_banned)
  values (p_room_id, p_player_id, auth.uid(), p_reason, false)
  on conflict (room_id, player_id) do update
  set kicked_by = auth.uid(), reason = p_reason, is_banned = false, kicked_at = now();
  
  -- Remove from lobby
  delete from public.room_players where room_id = p_room_id and player_id = p_player_id;
  
  -- Return success with player info
  return json_build_object(
    'success', true, 
    'message', 'تم الطرد بنجاح',
    'player_id', p_player_id,
    'player_name', coalesce(v_player_name, 'لاعب')
  );
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.kick_player(uuid, uuid, text) to authenticated;

-- RPC: Check if player is banned from room
create or replace function public.is_player_banned(
  p_room_id uuid,
  p_player_id uuid
)
returns boolean language plpgsql security definer as $$
begin
  return exists (
    select 1 from public.player_kicks
    where room_id = p_room_id 
    and player_id = p_player_id 
    and is_banned = true
  );
end;
$$;

grant execute on function public.is_player_banned(uuid, uuid) to authenticated;
