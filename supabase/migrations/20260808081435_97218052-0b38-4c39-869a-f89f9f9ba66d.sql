
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "Eligible students view published tests" ON public.tests;
CREATE POLICY "Eligible students view published tests" ON public.tests FOR SELECT TO authenticated
USING (
  status = ANY (ARRAY['published'::text,'closed'::text])
  AND class_level = COALESCE((SELECT p.class_level FROM public.profiles p WHERE p.id = auth.uid()), 11)
);

DROP POLICY IF EXISTS "Students view eligible active versions" ON public.test_versions;
CREATE POLICY "Students view eligible active versions" ON public.test_versions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tests t JOIN public.profiles p ON p.id = auth.uid()
  WHERE t.id = test_versions.test_id
    AND t.status = ANY (ARRAY['published'::text,'closed'::text])
    AND t.class_level = COALESCE(p.class_level, 11)
));

DROP POLICY IF EXISTS "Students view assigned version questions" ON public.questions;
CREATE POLICY "Students view assigned version questions" ON public.questions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.test_attempts a
  WHERE a.version_id = questions.version_id AND a.student_id = auth.uid()
));

DROP POLICY IF EXISTS "Staff view all questions" ON public.questions;
CREATE POLICY "Staff view all questions" ON public.questions
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'teacher'::public.app_role) OR public.has_role(auth.uid(), 'principal'::public.app_role));

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, subject, exam_track, username, class_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'),
    NEW.raw_user_meta_data->>'subject',
    NULLIF(NEW.raw_user_meta_data->>'exam_track', '')::public.exam_track,
    NEW.raw_user_meta_data->>'username',
    CASE WHEN COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student') = 'student'
      THEN COALESCE(NULLIF(NEW.raw_user_meta_data->>'class_level','')::smallint, 11) END
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
