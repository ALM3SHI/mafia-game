-- السماح للمضيف بإنشاء وتحديث الألعاب واللاعبين من المتصفح مباشرة لتجاوز مشاكل Edge Functions

-- INSERT policies
DROP POLICY IF EXISTS "Host insert games" ON public.games;
CREATE POLICY "Host insert games" ON public.games FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Host insert game_players" ON public.game_players;
CREATE POLICY "Host insert game_players" ON public.game_players FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Host insert messages" ON public.messages;
CREATE POLICY "Host insert messages" ON public.messages FOR INSERT WITH CHECK (true);

-- UPDATE policies (needed for phase transitions, vote resolution, night resolution)
DROP POLICY IF EXISTS "Game update allowed" ON public.games;
CREATE POLICY "Game update allowed" ON public.games FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Game players update allowed" ON public.game_players;
CREATE POLICY "Game players update allowed" ON public.game_players FOR UPDATE USING (true) WITH CHECK (true);

-- DELETE policy for night_actions cleanup
DROP POLICY IF EXISTS "Delete night actions" ON public.night_actions;
CREATE POLICY "Delete night actions" ON public.night_actions FOR DELETE USING (true);

-- SELECT policy for night_actions (host needs to read all actions for resolution)
DROP POLICY IF EXISTS "Read all night actions" ON public.night_actions;
CREATE POLICY "Read all night actions" ON public.night_actions FOR SELECT USING (true);

-- UPSERT for votes (insert + update)
DROP POLICY IF EXISTS "Upsert votes" ON public.votes;
CREATE POLICY "Upsert votes" ON public.votes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update votes" ON public.votes;
CREATE POLICY "Update votes" ON public.votes FOR UPDATE USING (true) WITH CHECK (true);

-- UPSERT for night_actions
DROP POLICY IF EXISTS "Insert night actions" ON public.night_actions;
CREATE POLICY "Insert night actions" ON public.night_actions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update night actions" ON public.night_actions;
CREATE POLICY "Update night actions" ON public.night_actions FOR UPDATE USING (true) WITH CHECK (true);
