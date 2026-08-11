import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { moderatorState, moderatorToggle, moderatorMessageAction, moderatorReply } from "@/lib/live.functions";

export const Route = createFileRoute("/live-control/$token")({
  component: ModeratorConsole,
  head: () => ({
    meta: [
      { title: "Class Control — TSJ Scholar Palanpur" },
      { name: "description", content: "Private teacher console to moderate live class chat, doubts and reactions." },
      { property: "og:title", content: "Class Control — TSJ Scholar Palanpur" },
      { property: "og:description", content: "Moderate live class chat and doubts from any device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ModeratorConsole() {
  const { token } = Route.useParams();
  const getState = useServerFn(moderatorState);
  const doToggle = useServerFn(moderatorToggle);
  const doAction = useServerFn(moderatorMessageAction);
  const doReply = useServerFn(moderatorReply);

  const [state, setState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const refresh = useCallback(async () => {
    try {
      setState(await getState({ data: { token } }));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load this class.");
    }
  }, [getState, token]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  if (error) return <div className="p-8 text-center text-sm text-destructive">{error}</div>;
  if (!state) return <div className="p-8 text-center text-sm text-muted-foreground">Loading control panel…</div>;

  const { cls, messages } = state;
  const chats = messages.filter((m: any) => m.kind === "chat");
  const doubts = messages.filter((m: any) => m.kind === "doubt");

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-3 sm:p-6">
      <header className="rounded-2xl border border-border bg-card p-4">
        <h1 className="font-display text-2xl">{cls.title}</h1>
        <p className="text-sm text-muted-foreground">{cls.subject ? `${cls.subject} · ` : ""}{cls.teacher_name} · {cls.status}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {(["chat_enabled", "reactions_enabled", "doubts_enabled"] as const).map((f) => (
            <label key={f} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!cls[f]}
                onChange={async (e) => {
                  await doToggle({ data: { token, field: f, value: e.target.checked } });
                  refresh();
                }}
              />
              {f === "chat_enabled" ? "Chat" : f === "reactions_enabled" ? "Reactions" : "Doubts"}
            </label>
          ))}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Column title="💬 Chat" rows={chats} token={token} doAction={doAction} refresh={refresh} />
        <Column title="❓ Doubts" rows={doubts} token={token} doAction={doAction} refresh={refresh} />
      </div>

      <div className="flex gap-2">
        <input className="exam-input" placeholder="Reply to the class…" value={reply} onChange={(e) => setReply(e.target.value)} />
        <button
          onClick={async () => {
            if (!reply.trim()) return;
            await doReply({ data: { token, body: reply } });
            setReply("");
            refresh();
          }}
          className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function Column({ title, rows, token, doAction, refresh }: { title: string; rows: any[]; token: string; doAction: any; refresh: () => void }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-3">
      <h2 className="mb-2 font-display text-lg">{title}</h2>
      <div className="max-h-[26rem] space-y-2 overflow-y-auto">
        {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>}
        {rows.map((m) => (
          <div key={m.id} className={`rounded-xl bg-muted px-3 py-2 text-sm ${m.hidden ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{m.author_name}</span>
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {m.body && <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>}
            {m.image_url && <img src={m.image_url} alt="Doubt attachment" className="mt-2 max-h-52 w-full rounded-lg object-contain" />}
            <div className="mt-1.5 flex gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              <button onClick={async () => { await doAction({ data: { token, messageId: m.id, action: m.hidden ? "show" : "hide" } }); refresh(); }}>
                {m.hidden ? "Unhide" : "Hide"}
              </button>
              {m.kind === "doubt" && !m.resolved && (
                <button onClick={async () => { await doAction({ data: { token, messageId: m.id, action: "resolve" } }); refresh(); }}>Solved</button>
              )}
              <button className="text-destructive" onClick={async () => { await doAction({ data: { token, messageId: m.id, action: "delete" } }); refresh(); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
