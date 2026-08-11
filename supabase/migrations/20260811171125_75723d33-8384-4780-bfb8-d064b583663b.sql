CREATE POLICY "live_media_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('live-segments','live-recordings','live-doubts'));
CREATE POLICY "live_media_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'live-doubts'
    OR (bucket_id IN ('live-segments','live-recordings')
        AND (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal')))
  );
CREATE POLICY "live_media_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('live-segments','live-recordings') AND (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal')))
  WITH CHECK (bucket_id IN ('live-segments','live-recordings') AND (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal')));
CREATE POLICY "live_media_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('live-segments','live-recordings','live-doubts') AND (public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'principal')));