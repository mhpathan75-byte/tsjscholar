import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RECORDING_BUCKET } from "@/lib/live";
import { useAuth } from "@/lib/auth";

/** Recorded lecture player that always resumes where the student stopped. */
export function RecordedPlayer({ classId, recordingPath }: { classId: string; recordingPath: string }) {
  const { profile } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState(0);
  const seeked = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: signed }, { data: progress }] = await Promise.all([
        supabase.storage.from(RECORDING_BUCKET).createSignedUrl(recordingPath, 60 * 60 * 6),
        profile
          ? supabase.from("live_watch_progress").select("position_seconds").eq("class_id", classId).eq("user_id", profile.id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (!alive) return;
      setResumeAt(Number((progress as any)?.position_seconds ?? 0));
      setUrl(signed?.signedUrl ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [classId, recordingPath, profile]);

  useEffect(() => {
    if (!profile) return;
    const save = () => {
      const v = videoRef.current;
      if (!v || !v.currentTime) return;
      supabase
        .from("live_watch_progress")
        .upsert({ user_id: profile.id, class_id: classId, position_seconds: v.currentTime, updated_at: new Date().toISOString() })
        .then(() => undefined);
    };
    const id = setInterval(save, 5000);
    window.addEventListener("pagehide", save);
    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [classId, profile]);

  if (!url) {
    return <div className="grid aspect-video w-full place-items-center rounded-2xl border border-border bg-muted text-sm text-muted-foreground">Loading recording…</div>;
  }

  return (
    <div className="space-y-2">
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        className="w-full rounded-2xl border border-border bg-black"
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v && resumeAt > 3 && !seeked.current) {
            seeked.current = true;
            v.currentTime = resumeAt;
          }
        }}
      />
      {resumeAt > 3 && <p className="text-xs text-muted-foreground">▶ Resuming from where you left off.</p>}
    </div>
  );
}
