/**
 * Live Online Class — cloud-first browser broadcasting.
 *
 * Teacher's browser: camera/screen + mic -> MediaRecorder -> ~2s chunks ->
 * Storage (`live-segments`) + a row in `live_segments`. Every student receives
 * the row over Realtime, downloads the chunk and appends it to a MediaSource
 * buffer. No OBS, no RTMP, no paid SDK.
 */

export const LIVE_BUCKET = "live-segments";
export const RECORDING_BUCKET = "live-recordings";
export const DOUBT_BUCKET = "live-doubts";

/** Chunk length in ms — small enough for a few seconds of latency. */
export const CHUNK_MS = 2000;
/** How many recent chunks a late joiner pulls before going live-edge. */
export const CATCHUP_SEGMENTS = 3;

export interface LiveSegmentRow {
  id: string;
  class_id: string;
  seq: number;
  path: string;
  is_init: boolean;
  mime: string;
  created_at: string;
}

const MIME_CANDIDATES = [
  'video/webm;codecs="vp8,opus"',
  'video/webm;codecs="vp9,opus"',
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

/** Picks a mime type that both MediaRecorder and MediaSource understand. */
export function pickBroadcastMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const mseOk = (m: string) => typeof MediaSource === "undefined" || MediaSource.isTypeSupported(m);
  for (const m of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(m) && mseOk(m)) return m;
  }
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

export const LOW_BANDWIDTH_PRESET = { videoBitsPerSecond: 800_000, audioBitsPerSecond: 64_000 };
export const HIGH_QUALITY_PRESET = { videoBitsPerSecond: 2_000_000, audioBitsPerSecond: 96_000 };

export function segmentPath(classId: string, sessionId: string, seq: number) {
  return `${classId}/${sessionId}/${String(seq).padStart(6, "0")}.webm`;
}

export function fmtClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export const LIVE_REACTIONS = ["👍", "❤️", "🔥", "👏", "😮", "🤔"];
