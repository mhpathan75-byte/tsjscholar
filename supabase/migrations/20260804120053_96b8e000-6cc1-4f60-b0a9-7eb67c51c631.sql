DROP POLICY IF EXISTS "Staff view all questions" ON public.questions;
CREATE POLICY "Staff view all questions" ON public.questions
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'principal'::app_role));

DROP POLICY IF EXISTS "Students view published questions" ON public.questions;
CREATE POLICY "Students view published questions" ON public.questions
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tests t
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE t.active_version_id = questions.version_id
    AND t.status = ANY (ARRAY['published','closed'])
    AND t.class_level = COALESCE(p.class_level::integer, 11)
));