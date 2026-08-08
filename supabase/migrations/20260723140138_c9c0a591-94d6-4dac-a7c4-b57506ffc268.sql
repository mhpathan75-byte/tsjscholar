
ALTER TABLE public.doubts
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'all_teachers'
    CHECK (visibility IN ('all_teachers','specific_teacher','all_students','everyone')),
  ADD COLUMN IF NOT EXISTS specific_teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

DROP POLICY IF EXISTS "doubts_select" ON public.doubts;
DROP POLICY IF EXISTS "Doubts are viewable by everyone" ON public.doubts;
DROP POLICY IF EXISTS "Students can view their own doubts" ON public.doubts;
DROP POLICY IF EXISTS "Staff can view all doubts" ON public.doubts;
DROP POLICY IF EXISTS "doubts_select_scoped" ON public.doubts;

CREATE POLICY "doubts_select_scoped" ON public.doubts FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR public.has_role(auth.uid(),'principal')
  OR (public.has_role(auth.uid(),'teacher') AND (
        visibility IN ('all_teachers','all_students','everyone')
        OR (visibility = 'specific_teacher' AND specific_teacher_id = auth.uid())
      ))
  OR (public.has_role(auth.uid(),'student') AND visibility IN ('all_students','everyone'))
);

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "materials_read_all_auth" ON public.materials;
CREATE POLICY "materials_read_all_auth" ON public.materials FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "materials_insert_staff" ON public.materials;
CREATE POLICY "materials_insert_staff" ON public.materials FOR INSERT TO authenticated
  WITH CHECK (uploader_id = auth.uid() AND (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal')));
DROP POLICY IF EXISTS "materials_update_own_or_principal" ON public.materials;
CREATE POLICY "materials_update_own_or_principal" ON public.materials FOR UPDATE TO authenticated
  USING (uploader_id = auth.uid() OR public.has_role(auth.uid(),'principal'));
DROP POLICY IF EXISTS "materials_delete_own_or_principal" ON public.materials;
CREATE POLICY "materials_delete_own_or_principal" ON public.materials FOR DELETE TO authenticated
  USING (uploader_id = auth.uid() OR public.has_role(auth.uid(),'principal'));

-- Storage RLS
DROP POLICY IF EXISTS "doubts_upload_own" ON storage.objects;
CREATE POLICY "doubts_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'doubts' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "doubts_read_auth" ON storage.objects;
CREATE POLICY "doubts_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'doubts');

DROP POLICY IF EXISTS "materials_upload_staff" ON storage.objects;
CREATE POLICY "materials_upload_staff" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materials' AND (storage.foldername(name))[1] = auth.uid()::text
              AND (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal')));
DROP POLICY IF EXISTS "materials_read_auth" ON storage.objects;
CREATE POLICY "materials_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'materials');
DROP POLICY IF EXISTS "materials_delete_own_or_principal" ON storage.objects;
CREATE POLICY "materials_delete_own_or_principal" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'materials' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'principal')));

UPDATE public.profiles SET full_name = REPLACE(full_name, 'Suhani', 'Suhana') WHERE full_name ILIKE '%Suhani%';
