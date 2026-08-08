ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_level smallint;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_class_level_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_class_level_check CHECK (class_level IS NULL OR class_level IN (11, 12));

CREATE TABLE public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  exam_type text NOT NULL CHECK (exam_type IN ('JEE','NEET','School Test','Practice Test')),
  class_level smallint NOT NULL CHECK (class_level IN (11,12)),
  subjects text[] NOT NULL DEFAULT '{}',
  chapters jsonb NOT NULL DEFAULT '{}'::jsonb,
  stream text NOT NULL CHECK (stream IN ('PCM','PCB','General')),
  total_questions integer NOT NULL CHECK (total_questions BETWEEN 1 AND 200),
  total_marks numeric(8,2) NOT NULL CHECK (total_marks > 0),
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 5 AND 360),
  positive_marks numeric(6,2) NOT NULL DEFAULT 4,
  negative_marks numeric(6,2) NOT NULL DEFAULT 1,
  partial_marking boolean NOT NULL DEFAULT false,
  language text NOT NULL DEFAULT 'English',
  difficulty jsonb NOT NULL DEFAULT '{"easy":30,"medium":40,"hard":30}'::jsonb,
  question_types text[] NOT NULL DEFAULT ARRAY['MCQ']::text[],
  instructions text NOT NULL DEFAULT '',
  scheduled_at timestamptz,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generating','review','published','closed','archived')),
  source_strategy text NOT NULL DEFAULT 'ai' CHECK (source_strategy IN ('ai','verified_bank','licensed','previous_year','school_bank','mixed')),
  active_version_id uuid,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage tests" ON public.tests FOR ALL TO authenticated USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "Eligible students view published tests" ON public.tests FOR SELECT TO authenticated USING (status IN ('published','closed') AND class_level = (SELECT p.class_level FROM public.profiles p WHERE p.id = auth.uid()));

CREATE TABLE public.test_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  change_reason text NOT NULL DEFAULT 'Initial version',
  locked_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(test_id, version_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_versions TO authenticated;
GRANT ALL ON public.test_versions TO service_role;
ALTER TABLE public.test_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage test versions" ON public.test_versions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "Students view eligible active versions" ON public.test_versions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tests t JOIN public.profiles p ON p.id=auth.uid() WHERE t.id=test_id AND t.status IN ('published','closed') AND t.class_level=p.class_level));
ALTER TABLE public.tests ADD CONSTRAINT tests_active_version_fkey FOREIGN KEY (active_version_id) REFERENCES public.test_versions(id) ON DELETE SET NULL;

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.test_versions(id) ON DELETE CASCADE,
  source_kind text NOT NULL DEFAULT 'ai' CHECK (source_kind IN ('ai','manual','ocr','verified_bank','licensed','previous_year','school_bank')),
  source_ref text,
  subject text NOT NULL,
  chapter text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  question_type text NOT NULL CHECK (question_type IN ('MCQ','Multiple Correct','Integer','Numerical','Assertion & Reason','Paragraph','Diagram Based','Case Study')),
  stem text NOT NULL,
  passage text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer jsonb NOT NULL DEFAULT 'null'::jsonb,
  solution text NOT NULL DEFAULT '',
  diagrams jsonb NOT NULL DEFAULT '[]'::jsonb,
  marks numeric(6,2) NOT NULL DEFAULT 4,
  negative_marks numeric(6,2) NOT NULL DEFAULT 1,
  position integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(version_id, position)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage unlocked questions" ON public.questions FOR ALL TO authenticated USING ((public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal')) AND NOT EXISTS (SELECT 1 FROM public.test_versions v WHERE v.id=version_id AND v.locked_at IS NOT NULL)) WITH CHECK ((public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal')) AND NOT EXISTS (SELECT 1 FROM public.test_versions v WHERE v.id=version_id AND v.locked_at IS NOT NULL));

CREATE TABLE public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.test_versions(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_order uuid[] NOT NULL DEFAULT '{}',
  option_orders jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','in_progress','submitted','auto_submitted','evaluated')),
  started_at timestamptz,
  submitted_at timestamptz,
  submit_reason text,
  score numeric(8,2),
  max_score numeric(8,2),
  percentage numeric(6,2),
  rank integer,
  correct_count integer NOT NULL DEFAULT 0,
  incorrect_count integer NOT NULL DEFAULT 0,
  unattempted_count integer NOT NULL DEFAULT 0,
  violation_count integer NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(test_id, student_id)
);
GRANT SELECT, INSERT, UPDATE ON public.test_attempts TO authenticated;
GRANT ALL ON public.test_attempts TO service_role;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own attempts" ON public.test_attempts FOR ALL TO authenticated USING (student_id=auth.uid()) WITH CHECK (student_id=auth.uid() AND EXISTS (SELECT 1 FROM public.tests t JOIN public.profiles p ON p.id=auth.uid() WHERE t.id=test_id AND t.status='published' AND t.class_level=p.class_level));
CREATE POLICY "Staff view all attempts" ON public.test_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "Students view assigned version questions" ON public.questions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.version_id=version_id AND a.student_id=auth.uid()));

CREATE TABLE public.attempt_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  answer jsonb NOT NULL DEFAULT 'null'::jsonb,
  state text NOT NULL DEFAULT 'visited' CHECK (state IN ('not_visited','visited','answered','review','answered_review','cleared')),
  time_seconds integer NOT NULL DEFAULT 0,
  is_correct boolean,
  marks_awarded numeric(6,2),
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);
GRANT SELECT, INSERT, UPDATE ON public.attempt_responses TO authenticated;
GRANT ALL ON public.attempt_responses TO service_role;
ALTER TABLE public.attempt_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own responses" ON public.attempt_responses FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.id=attempt_id AND a.student_id=auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.id=attempt_id AND a.student_id=auth.uid() AND a.status='in_progress'));
CREATE POLICY "Staff view responses" ON public.attempt_responses FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal'));

CREATE TABLE public.test_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  violation_type text NOT NULL,
  question_id uuid REFERENCES public.questions(id) ON DELETE SET NULL,
  reason text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT ON public.test_violations TO authenticated;
GRANT ALL ON public.test_violations TO service_role;
ALTER TABLE public.test_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students log own violations" ON public.test_violations FOR INSERT TO authenticated WITH CHECK (student_id=auth.uid() AND EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.id=attempt_id AND a.student_id=auth.uid()));
CREATE POLICY "Students view own violations" ON public.test_violations FOR SELECT TO authenticated USING (student_id=auth.uid());
CREATE POLICY "Staff view all violations" ON public.test_violations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal'));

CREATE TABLE public.question_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('Wrong Option','Missing Diagram','Typo','Wrong Formula','Image Not Visible','Other')),
  details text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.question_reports TO authenticated;
GRANT ALL ON public.question_reports TO service_role;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students report own attempt questions" ON public.question_reports FOR INSERT TO authenticated WITH CHECK (student_id=auth.uid() AND EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.id=attempt_id AND a.student_id=auth.uid()));
CREATE POLICY "Students view own reports" ON public.question_reports FOR SELECT TO authenticated USING (student_id=auth.uid());
CREATE POLICY "Staff manage question reports" ON public.question_reports FOR ALL TO authenticated USING (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal')) WITH CHECK (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal'));

CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX tests_audience_schedule_idx ON public.tests(class_level,status,scheduled_at);
CREATE INDEX questions_version_position_idx ON public.questions(version_id,position);
CREATE INDEX attempts_student_status_idx ON public.test_attempts(student_id,status);
CREATE INDEX attempts_test_status_idx ON public.test_attempts(test_id,status);
CREATE INDEX responses_attempt_idx ON public.attempt_responses(attempt_id);
CREATE INDEX violations_attempt_time_idx ON public.test_violations(attempt_id,occurred_at);