import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATCHUP_SEGMENTS, LIVE_BUCKET, type LiveSegmentRow } from "@/lib/live";

/**
 * Student side of the live class: listens for new chunks over Realtime,
 * downloads them and appends them to a MediaSource buffer, always snapping
 * back to the live edge after a network hiccup.
 */
export function LiveStudentPlayer({
  classId,
  emptyLabel = "Waiting for your teacher to start the class…",
}: {
  classId: string;
  emptyLabel?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const seenRef = useRef<Set<number>>(new Set());
  const lastSeqRef = useRef(-1);
  const objectUrlRef = useRef<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [generation, setGeneration] = useState(0);

  const pump = useCallback(() => {
    const sb = sourceBufferRef.current;
    if (!sb || sb.updating) return;
    const next = queueRef.current.shift();
    if (!next) return;
    try {
      sb.appendBuffer(next);
    } catch {
      try {
        const v = videoRef.current;
        if (sb.buffered.length && v) sb.remove(sb.buffered.start(0), Math.max(0, v.currentTime - 6));
      } catch {
        /* noop */
      }
      queueRef.current.unshift(next);
    }
  }, []);

  /* presence — so the teacher sees a live viewer count */
  useEffect(() => {
    const channel = supabase.channel(`live-presence:${classId}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        setViewers(Math.max(0, Object.keys(channel.presenceState()).length - 1));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ role: "viewer" });
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !classId || typeof MediaSource === "undefined") return;

    let cancelled = false;
    queueRef.current = [];
    seenRef.current = new Set();
    lastSeqRef.current = -1;
    setStarted(false);

    const mediaSource = new MediaSource();
    const url = URL.createObjectURL(mediaSource);
    objectUrlRef.current = url;
    video.src = url;

    const ensureBuffer = (mime: string) => {
      if (sourceBufferRef.current || mediaSource.readyState !== "open") return;
      const type = MediaSource.isTypeSupported(mime) ? mime : "video/webm";
      try {
        const sb = mediaSource.addSourceBuffer(type);
        sb.mode = "sequence";
        sb.addEventListener("updateend", () => {
          pump();
          const v = videoRef.current;
          if (!v || !sb.buffered.length) return;
          const start = sb.buffered.start(0);
          const end = sb.buffered.end(sb.buffered.length - 1);
          if (v.currentTime < start) v.currentTime = start;
          const drift = end - v.currentTime;
          if (drift > 12) v.currentTime = end - 2;
          else if (drift > 4) v.playbackRate = 1.08;
          else if (v.playbackRate !== 1) v.playbackRate = 1;
          if (v.paused) v.play().catch(() => undefined);
        });
        sourceBufferRef.current = sb;
      } catch {
        /* unsupported */
      }
    };

    const ingest = async (row: LiveSegmentRow) => {
      if (cancelled || seenRef.current.has(row.seq)) return;
      seenRef.current.add(row.seq);
      const { data, error } = await supabase.storage.from(LIVE_BUCKET).download(row.path);
      if (cancelled || error || !data) return;
      ensureBuffer(row.mime);
      queueRef.current.push(await data.arrayBuffer());
      lastSeqRef.current = Math.max(lastSeqRef.current, row.seq);
      setStarted(true);
      pump();
    };

    const bootstrap = async () => {
      const { data: init } = await supabase
        .from("live_segments")
        .select("*")
        .eq("class_id", classId)
        .eq("is_init", true)
        .order("seq", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !init) return;
      const { data: recent } = await supabase
        .from("live_segments")
        .select("*")
        .eq("class_id", classId)
        .gt("seq", (init as any).seq)
        .order("seq", { ascending: false })
        .limit(CATCHUP_SEGMENTS);
      const ordered = [init as any, ...(((recent as any[]) ?? []).slice().reverse())] as LiveSegmentRow[];
      for (const row of ordered) await ingest(row);
    };

    mediaSource.addEventListener("sourceopen", () => {
      bootstrap();
    });

    const channel = supabase
      .channel(`live-segments:${classId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_segments", filter: `class_id=eq.${classId}` },
        (payload) => {
          const row = payload.new as LiveSegmentRow;
          if (row.is_init && lastSeqRef.current >= 0) {
            setGeneration((g) => g + 1);
            return;
          }
          if (lastSeqRef.current < 0 && !row.is_init) return;
          ingest(row);
        },
      )
      .subscribe();

    // If nothing has arrived yet, keep re-checking so students who open the
    // page before the teacher starts still get picked up automatically.
    const retry = setInterval(() => {
      if (lastSeqRef.current < 0) bootstrap();
      const v = videoRef.current;
      if (v && v.paused && v.readyState >= 2) v.play().catch(() => undefined);
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(retry);
      supabase.removeChannel(channel);
      try {
        if (mediaSource.readyState === "open") mediaSource.endOfStream();
      } catch {
        /* noop */
      }
      sourceBufferRef.current = null;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [classId, generation, pump]);

  const goFullscreen = () => {
    const target = wrapRef.current;
    if (!target) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else (target as any).requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden rounded-2xl border border-border bg-black" style={{ aspectRatio: "16 / 9" }}>
      <video ref={videoRef} className="h-full w-full bg-black object-contain" playsInline autoPlay muted={muted} />

      {!started && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="text-sm">{emptyLabel}</p>
        </div>
      )}

      <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5">
        <span className="rounded-lg bg-black/50 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">👥 {viewers}</span>
        <button
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = !v.muted;
            setMuted(v.muted);
            if (!v.muted) v.play().catch(() => undefined);
          }}
          className="rounded-lg bg-black/50 px-2 py-1 text-sm text-white backdrop-blur"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button onClick={goFullscreen} className="rounded-lg bg-black/50 px-2 py-1 text-sm text-white backdrop-blur" aria-label="Fullscreen">
          ⛶
        </button>
      </div>

      {started && (
        <div className="absolute left-2 top-2 z-20 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
        </div>
      )}

      {muted && started && (
        <button
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = false;
            setMuted(false);
            v.play().catch(() => undefined);
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-black"
        >
          🔊 Tap for sound
        </button>
      )}
    </div>
  );
}
