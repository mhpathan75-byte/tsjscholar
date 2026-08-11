import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CHUNK_MS,
  HIGH_QUALITY_PRESET,
  LIVE_BUCKET,
  LOW_BANDWIDTH_PRESET,
  RECORDING_BUCKET,
  fmtClock,
  pickBroadcastMime,
  segmentPath,
} from "@/lib/live";

type Phase = "idle" | "preview" | "live" | "ending";

/**
 * Teacher side of a live class: camera (or screen) + mic -> MediaRecorder ->
 * 2s chunks -> Storage + Realtime. The same chunks are kept in memory so the
 * whole lecture can be saved as one recording when the class ends.
 */
export function LiveBroadcaster({
  classId,
  onStatus,
}: {
  classId: string;
  onStatus?: (s: { live: boolean; viewers: number }) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [screenShare, setScreenShare] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [uplink, setUplink] = useState<"ok" | "retrying">("ok");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const sessionRef = useRef("");
  const seqRef = useRef(0);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tapeRef = useRef<Blob[]>([]);
  const mimeRef = useRef("video/webm");

  useEffect(() => {
    onStatus?.({ live: phase === "live", viewers });
  }, [phase, viewers, onStatus]);

  /* viewer presence */
  useEffect(() => {
    if (phase !== "live") return;
    const channel = supabase.channel(`live-presence:${classId}`, { config: { presence: { key: "host" } } });
    channel
      .on("presence", { event: "sync" }, () => {
        setViewers(Math.max(0, Object.keys(channel.presenceState()).length - 1));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ role: "host" });
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [phase, classId]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const attach = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    if (previewRef.current) {
      previewRef.current.srcObject = stream;
      previewRef.current.play().catch(() => undefined);
    }
  }, []);

  const startPreview = useCallback(
    async (opts?: { mode?: "user" | "environment"; screen?: boolean }) => {
      const mode = opts?.mode ?? facing;
      const screen = opts?.screen ?? screenShare;
      setBusy(true);
      setError(null);
      try {
        let stream: MediaStream;
        if (screen) {
          const display = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
          let mic: MediaStream | null = null;
          try {
            mic = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true },
            });
          } catch {
            mic = null;
          }
          stream = new MediaStream([...display.getVideoTracks(), ...(mic?.getAudioTracks() ?? display.getAudioTracks())]);
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: lowBandwidth ? 640 : 1280 },
              height: { ideal: lowBandwidth ? 360 : 720 },
              frameRate: { ideal: lowBandwidth ? 20 : 30 },
            },
            audio: { echoCancellation: true, noiseSuppression: true },
          });
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        attach(stream);
        stream.getVideoTracks().forEach((t) => (t.enabled = camOn));
        stream.getAudioTracks().forEach((t) => (t.enabled = micOn));
        setPhase((p) => (p === "live" ? "live" : "preview"));
        return stream;
      } catch (e: any) {
        setError(
          e?.name === "NotAllowedError"
            ? "Camera / microphone permission was denied. Allow access and try again."
            : "Could not start your camera. Try another browser (Chrome works best).",
        );
        return null;
      } finally {
        setBusy(false);
      }
    },
    [attach, camOn, micOn, facing, lowBandwidth, screenShare],
  );

  const publishChunk = useCallback(
    (blob: Blob, mime: string) => {
      const seq = seqRef.current++;
      const path = segmentPath(classId, sessionRef.current, seq);
      chainRef.current = chainRef.current.then(async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          const { error: upErr } = await supabase.storage
            .from(LIVE_BUCKET)
            .upload(path, blob, { contentType: mime, upsert: true, cacheControl: "1" });
          if (!upErr) {
            const { error: dbErr } = await supabase
              .from("live_segments")
              .insert({ class_id: classId, seq, path, is_init: seq === 0, mime });
            if (!dbErr) {
              setUplink("ok");
              return;
            }
          }
          setUplink("retrying");
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
      });
    },
    [classId],
  );

  const startRecorder = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return false;
    const mime = pickBroadcastMime();
    if (!mime) {
      setError("This browser cannot broadcast video. Please use Chrome, Edge or Firefox.");
      return false;
    }
    mimeRef.current = mime;
    const preset = lowBandwidth ? LOW_BANDWIDTH_PRESET : HIGH_QUALITY_PRESET;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: mime, ...preset });
    } catch {
      recorder = new MediaRecorder(stream);
    }
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        tapeRef.current.push(e.data);
        publishChunk(e.data, mime);
      }
    };
    recorder.onerror = () => setUplink("retrying");
    recorder.start(CHUNK_MS);
    recorderRef.current = recorder;
    return true;
  }, [lowBandwidth, publishChunk]);

  const goLive = useCallback(async () => {
    if (!streamRef.current) return;
    setBusy(true);
    sessionRef.current = crypto.randomUUID();
    seqRef.current = 0;
    tapeRef.current = [];
    chainRef.current = Promise.resolve();

    await supabase.from("live_segments").delete().eq("class_id", classId);
    const { error: updErr } = await supabase
      .from("live_classes")
      .update({ status: "live", broadcast_active: true, started_at: new Date().toISOString() })
      .eq("id", classId);
    if (updErr) {
      setError(updErr.message);
      setBusy(false);
      return;
    }
    if (!startRecorder()) {
      setBusy(false);
      return;
    }
    setPhase("live");
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    setBusy(false);
  }, [classId, startRecorder]);

  const endClass = useCallback(async () => {
    setPhase("ending");
    setBusy(true);
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    recorderRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;

    await chainRef.current.catch(() => undefined);

    // Save the whole lecture as one file so students can rewatch it later.
    let recordingPath: string | null = null;
    try {
      if (tapeRef.current.length) {
        const full = new Blob(tapeRef.current, { type: mimeRef.current });
        const path = `${classId}/${sessionRef.current || crypto.randomUUID()}.webm`;
        const { error: upErr } = await supabase.storage
          .from(RECORDING_BUCKET)
          .upload(path, full, { contentType: mimeRef.current, upsert: true });
        if (!upErr) recordingPath = path;
      }
    } catch {
      /* recording is best-effort — the class still ends cleanly */
    }

    await supabase
      .from("live_classes")
      .update({
        status: "ended",
        broadcast_active: false,
        ended_at: new Date().toISOString(),
        duration_seconds: elapsed,
        ...(recordingPath ? { recording_path: recordingPath, recording_mime: mimeRef.current } : {}),
      })
      .eq("id", classId);

    await supabase.from("live_segments").delete().eq("class_id", classId);
    tapeRef.current = [];
    setPhase("idle");
    setBusy(false);
  }, [classId, elapsed]);

  const switchCamera = useCallback(async () => {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    const wasLive = phase === "live";
    if (wasLive && recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    await startPreview({ mode: next, screen: false });
    setScreenShare(false);
    if (wasLive) {
      sessionRef.current = crypto.randomUUID();
      seqRef.current = 0;
      await supabase.from("live_segments").delete().eq("class_id", classId);
      startRecorder();
    }
  }, [facing, phase, startPreview, startRecorder, classId]);

  const toggleScreen = useCallback(async () => {
    const next = !screenShare;
    const wasLive = phase === "live";
    if (wasLive && recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    const s = await startPreview({ screen: next });
    if (!s) return;
    setScreenShare(next);
    if (wasLive) {
      sessionRef.current = crypto.randomUUID();
      seqRef.current = 0;
      await supabase.from("live_segments").delete().eq("class_id", classId);
      startRecorder();
    }
  }, [screenShare, phase, startPreview, startRecorder, classId]);

  const toggleCam = () => {
    const on = !camOn;
    setCamOn(on);
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = on));
  };
  const toggleMic = () => {
    const on = !micOn;
    setMicOn(on);
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = on));
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-black" style={{ aspectRatio: "16 / 9" }}>
        <video ref={previewRef} className="h-full w-full object-cover" playsInline autoPlay muted />
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/80">
            <div className="text-3xl">🎥</div>
            <p className="text-sm">Tap <b>Start class</b> and allow camera &amp; mic. Students see you in a few seconds.</p>
          </div>
        )}
        {phase === "live" && (
          <div className="absolute left-2 top-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE {fmtClock(elapsed)}
            </span>
            <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">👥 {viewers}</span>
            <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">
              {uplink === "ok" ? "🟢 Stable" : "🟠 Reconnecting"}
            </span>
          </div>
        )}
        {phase !== "idle" && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2">
            <IconBtn onClick={toggleCam} label={camOn ? "Camera on" : "Camera off"}>{camOn ? "🎥" : "🚫"}</IconBtn>
            <IconBtn onClick={toggleMic} label={micOn ? "Mic on" : "Mic off"}>{micOn ? "🎙️" : "🔇"}</IconBtn>
            <IconBtn onClick={switchCamera} label="Flip camera">🔄</IconBtn>
            <IconBtn onClick={toggleScreen} label="Share screen">🖥️</IconBtn>
          </div>
        )}
      </div>

      {error && <div className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        {phase === "idle" && (
          <button
            onClick={async () => {
              const s = await startPreview();
              if (s) await goLive();
            }}
            disabled={busy}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Starting…" : "● Start class"}
          </button>
        )}
        {phase === "preview" && (
          <>
            <button onClick={goLive} disabled={busy} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {busy ? "Going live…" : "● Go live"}
            </button>
            <button
              onClick={() => {
                streamRef.current?.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                setPhase("idle");
              }}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
          </>
        )}
        {(phase === "live" || phase === "ending") && (
          <button onClick={endClass} disabled={busy} className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-bold text-destructive disabled:opacity-50">
            {phase === "ending" ? "Saving recording…" : "■ End class & save recording"}
          </button>
        )}
        <label className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={lowBandwidth} onChange={(e) => setLowBandwidth(e.target.checked)} />
          Low data mode
        </label>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="rounded-full bg-black/60 px-3 py-2 text-base backdrop-blur">
      {children}
    </button>
  );
}
