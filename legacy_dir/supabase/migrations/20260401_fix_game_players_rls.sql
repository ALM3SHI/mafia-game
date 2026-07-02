-- إصلاح RLS على game_players
-- المشكلة: اللاعب يرى سطره فقط → لا تظهر بطاقات الخصوم
-- الحل: كل لاعب في نفس اللعبة يرى جميع الصفوف (الأدوار تُخفى في الـ client)

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "Own role" ON public.game_players;

-- إضافة السياسة الجديدة
CREATE POLICY "Game participants can see all" ON public.game_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.game_players gp2
      WHERE gp2.game_id = game_id AND gp2.player_id = auth.uid()
    )
  );
