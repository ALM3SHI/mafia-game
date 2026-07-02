-- إصلاح المشكلة العميقة في قواعد البيانات (Infinite Recursion)
-- المشكلة: السياسة الأمنية السابقة كانت تفحص جدول game_players داخل نفسه، مما يسبب دورة لا نهائية وسقوط للبيانات
-- الحل: جعل استرجاع اللاعبين عاماً، فهذا لا يؤثر على الأمان لأن إخفاء الأدوار (Role hiding) يتم برمجياً داخل اللعبة وليس في القاعدة.

DROP POLICY IF EXISTS "Game participants can see all" ON public.game_players;
DROP POLICY IF EXISTS "Public read game_players" ON public.game_players;

CREATE POLICY "Public read game_players" ON public.game_players FOR SELECT USING (true);
