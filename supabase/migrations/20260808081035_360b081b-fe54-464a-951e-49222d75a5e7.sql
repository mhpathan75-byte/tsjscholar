
CREATE TABLE public.ashra_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ashra_conversations TO authenticated;
GRANT ALL ON public.ashra_conversations TO service_role;
ALTER TABLE public.ashra_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conv" ON public.ashra_conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ashra_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ashra_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ashra_messages_conv_idx ON public.ashra_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ashra_messages TO authenticated;
GRANT ALL ON public.ashra_messages TO service_role;
ALTER TABLE public.ashra_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own msg" ON public.ashra_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.doubts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES auth.users(id),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doubts TO authenticated;
GRANT ALL ON public.doubts TO service_role;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student see own" ON public.doubts FOR SELECT TO authenticated USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'principal'));
CREATE POLICY "student insert own" ON public.doubts FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "teachers answer" ON public.doubts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'principal')) WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'principal'));
