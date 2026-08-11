-- LIVE CLASSES ------------------------------------------------------------
CREATE TABLE public.live_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_name text NOT NULL DEFAULT '',
  title text NOT NULL,
  subject text,
  description text,
  class_level smallint,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  broadcast_active boolean NOT NULL DEFAULT false,
  chat_enabled boolean NOT NULL DEFAULT true,
  reactions_enabled boolean NOT NULL DEFAULT true,
  doubts_enabled boolean NOT NULL DEFAULT true,
  moderator_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  recording_path text,
  recording_mime text,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_classes TO authenticated;
GRANT ALL ON public.live_classes TO service_role;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_classes_read" ON public.live_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_classes_insert" ON public.live_classes FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() AND (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal')));
CREATE POLICY "live_classes_update" ON public.live_classes FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (teacher_id = auth.uid() OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "live_classes_delete" ON public.live_classes FOR DELETE TO authenticated
  USING (teacher_id = auth.uid() OR public.has_role(auth.uid(),'principal'));
CREATE TRIGGER live_classes_updated_at BEFORE UPDATE ON public.live_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEGMENTS ------------------------------------------------------------------
CREATE TABLE public.live_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  seq integer NOT NULL,
  path text NOT NULL,
  is_init boolean NOT NULL DEFAULT false,
  mime text NOT NULL DEFAULT 'video/webm',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_segments_class_seq_idx ON public.live_segments(class_id, seq);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_segments TO authenticated;
GRANT ALL ON public.live_segments TO service_role;
ALTER TABLE public.live_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_segments_read" ON public.live_segments FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_segments_write" ON public.live_segments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));
CREATE POLICY "live_segments_delete" ON public.live_segments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

-- MESSAGES (chat + doubts) --------------------------------------------------
CREATE TABLE public.live_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  author_role text NOT NULL DEFAULT 'student',
  kind text NOT NULL DEFAULT 'chat',
  body text NOT NULL DEFAULT '',
  image_path text,
  hidden boolean NOT NULL DEFAULT false,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_messages_class_idx ON public.live_messages(class_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_messages TO authenticated;
GRANT ALL ON public.live_messages TO service_role;
ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_messages_read" ON public.live_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_messages_insert" ON public.live_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "live_messages_update" ON public.live_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));
CREATE POLICY "live_messages_delete" ON public.live_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = class_id AND c.teacher_id = auth.uid()));

-- REACTIONS -----------------------------------------------------------------
CREATE TABLE public.live_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_reactions_class_idx ON public.live_reactions(class_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.live_reactions TO authenticated;
GRANT ALL ON public.live_reactions TO service_role;
ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_reactions_read" ON public.live_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "live_reactions_insert" ON public.live_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- WATCH PROGRESS ------------------------------------------------------------
CREATE TABLE public.live_watch_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  position_seconds numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, class_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_watch_progress TO authenticated;
GRANT ALL ON public.live_watch_progress TO service_role;
ALTER TABLE public.live_watch_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_progress_own" ON public.live_watch_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- REALTIME ------------------------------------------------------------------
ALTER TABLE public.live_segments REPLICA IDENTITY FULL;
ALTER TABLE public.live_messages REPLICA IDENTITY FULL;
ALTER TABLE public.live_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.live_classes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_segments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_classes;