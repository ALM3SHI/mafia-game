-- ==========================================
-- 1. فك ارتباط Profiles بالـ Auth (للبوتات)
-- ==========================================
-- لتسهيل إنشاء روبوتات دون الحاجة لإيميلات أو حسابات حقيقية، نقوم بإزالة شرط المفتاح الأجنبي.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- نضيف عمود is_bot لمعرفة ما إذا كان الحساب روبوت
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_bot boolean default false;

-- ==========================================
-- 2. إدخال أو تحديث حسابات البوتات الرسمية (8 روبوتات)
-- ==========================================
INSERT INTO public.profiles (id, username, avatar, is_bot)
VALUES
('b0700000-0000-0000-0000-000000000001', 'بوت 1 (ألفا)', '🤖', true),
('b0700000-0000-0000-0000-000000000002', 'بوت 2 (بيتا)', '🤖', true),
('b0700000-0000-0000-0000-000000000003', 'بوت 3 (جاما)', '🤖', true),
('b0700000-0000-0000-0000-000000000004', 'بوت 4 (دلتا)', '🤖', true),
('b0700000-0000-0000-0000-000000000005', 'بوت 5 (إكو)', '🤖', true),
('b0700000-0000-0000-0000-000000000006', 'بوت 6 (زيتا)', '🤖', true),
('b0700000-0000-0000-0000-000000000007', 'بوت 7 (أوميجا)', '🤖', true),
('b0700000-0000-0000-0000-000000000008', 'بوت 8 (سيجما)', '🤖', true)
ON CONFLICT (id) DO UPDATE 
SET username = EXCLUDED.username, avatar = EXCLUDED.avatar, is_bot = true;


-- ==========================================
-- 3. إصلاح سياسات الطرد (RLS) على room_players
-- ==========================================
-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Join room" ON public.room_players;
DROP POLICY IF EXISTS "Leave room" ON public.room_players;
DROP POLICY IF EXISTS "Ready toggle" ON public.room_players;

-- السماح للمستخدم بإدخال نفسه، والسماح للمضيف بإدخال أي لاعب (حتى البوتات)
CREATE POLICY "Join room or Host add" ON public.room_players
FOR INSERT WITH CHECK (
  auth.uid() = player_id OR 
  EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND host_id = auth.uid())
);

-- السماح للمستخدم بمغادرة غرفته، والسماح للمضيف بطرد أي لاعب في اللوبي
CREATE POLICY "Leave room or Host kick" ON public.room_players
FOR DELETE USING (
  auth.uid() = player_id OR 
  EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND host_id = auth.uid())
);

-- السماح للمستخدم بتغيير جاهزيته، والسماح للمضيف بتغيير جاهزية أي لاعب (كالبوتات)
CREATE POLICY "Ready toggle or Host update" ON public.room_players
FOR UPDATE USING (
  auth.uid() = player_id OR 
  EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND host_id = auth.uid())
);


-- ==========================================
-- 4. إصلاح المشكلة الغامضة في game_players
-- ==========================================
-- منع اختلاط أسماء الأعمدة (game_id) لتتأكد القاعدة من اللعبة المحددة
DROP POLICY IF EXISTS "Game participants can see all" ON public.game_players;

CREATE POLICY "Game participants can see all" ON public.game_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_players gp2
      WHERE gp2.game_id = public.game_players.game_id AND gp2.player_id = auth.uid()
    )
  );
