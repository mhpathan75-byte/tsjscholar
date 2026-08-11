import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LiveBroadcaster } from "@/components/live/LiveBroadcaster";
import { LiveStudentPlayer } from "@/components/live/LiveStudentPlayer";
import { LiveChatPanel } from "@/components/live/LiveChatPanel";
import { RecordedPlayer } from "@/components/live/RecordedPlayer";

export const Route = createFileRoute("/dashboard/live/$classId")({
  component: LiveRoom,
  head: () => ({
    meta: [
      { title: "Live Class Room — TSJ Scholar Palanpur" },
      { name: "description", content: "Watch the live lecture, chat with your teacher and send photo doubts in real time." },
      { property: "og:title", content: "Live Class Room — TSJ Scholar Palanpur" },
      { property: "og:description", content: "Live lecture with chat, reactions and photo doubts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function LiveRoom() {
  const { classId } = Route.useParams();
  const { profile } = useAuth();
  const [cls, setCls] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.from("live_classes").select("*").eq("id", classId).maybeSingle().then(({ data }) => {
      if (alive) setCls(data);
    });
    const ch = supabase
      .channel(`live-class:${classId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_classes", filter: `id=eq.${classId}` }, (p) => setCls(p.new))
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [classId]);

  if (!cls) return <p className="text-sm text-muted-foreground">Loading class…</p>;
  const isHost = profile?.id === cls.teacher_id;
  const controlLink = typeof window !== "undefined" ? `${window.location.origin}/live-control/${cls.moderator_token}` : "";

  const toggle = async (field: string, value: boolean) => {
    await supabase.from("live_classes").update({ [field]: value } as never).eq("id", classId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/dashboard/live" className="text-xs uppercase tracking-widest text-primary">← All classes</Link>
      </div>
      <header>
        <h1 className="font-display text-2xl sm:text-3xl">{cls.title}</h1>
        <p className="text-sm text-muted-foreground">{cls.subject ? `${cls.subject} · ` : ""}{cls.teacher_name}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-3">
          {isHost ? (
            <LiveBroadcaster classId={classId} />
          ) : cls.status === "ended" && cls.recording_path ? (
            <RecordedPlayer classId={classId} recordingPath={cls.recording_path} />
          ) : (
            <LiveStudentPlayer classId={classId} />
          )}

          {isHost && (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap gap-4 text-sm">
                {(["chat_enabled", "reactions_enabled", "doubts_enabled"] as const).map((f) => (
                  <label key={f} className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={!!cls[f]} onChange={(e) => toggle(f, e.target.checked)} />
                    {f === "chat_enabled" ? "Chat" : f === "reactions_enabled" ? "Reactions" : "Doubts"}
                  </label>
                ))}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Control link — open this on another device (laptop/tablet) to read chat &amp; doubts while your phone is the camera.</p>
                <div className="mt-2 flex gap-2">
                  <input readOnly value={controlLink} className="exam-input text-xs" />
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(controlLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {cls.status === "ended" && isHost && cls.recording_path && <RecordedPlayer classId={classId} recordingPath={cls.recording_path} />}
        </div>

        <LiveChatPanel
          classId={classId}
          isHost={isHost}
          chatEnabled={!!cls.chat_enabled}
          doubtsEnabled={!!cls.doubts_enabled}
          reactionsEnabled={!!cls.reactions_enabled}
        />
      </div>
    </div>
  );
}
