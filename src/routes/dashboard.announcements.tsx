import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from "@/lib/announcements.functions";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/dashboard/announcements")({
  component: Page,
  head: () => ({ meta: [{ title: "Announcements — TSJ Scholar Palanpur" }] }),
});

type A = { id: string; title: string; body: string; audience: string; priority: string; pinned: boolean; created_at: string; author_name: string };

const PRIO: Record<string, string> = {
  urgent: "border-rose-400 bg-rose-50",
  important: "border-amber-400 bg-amber-50",
  normal: "border-border bg-card",
};

function Page() {
  const { profile } = useAuth();
  const isStaff = profile?.role === "teacher" || profile?.role === "principal";
  const list = useServerFn(listAnnouncements);
  const create = useServerFn(createAnnouncement);
  const del = useServerFn(deleteAnnouncement);
  const [rows, setRows] = useState<A[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", audience: "everyone", priority: "normal", pinned: false });

  const refresh = () => list({}).then((r) => setRows(r as A[])).catch(() => {});
  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    await create({ data: form });
    setForm({ title: "", body: "", audience: "everyone", priority: "normal", pinned: false });
    setOpen(false); refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Feed</div>
          <h1 className="mt-2 font-display text-4xl text-foreground">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everything the school wants you to know.</p>
        </div>
        {isStaff && (
          <button onClick={() => setOpen(true)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90">
            + New announcement
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <textarea placeholder="Write the announcement…" rows={5} value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <div className="mb-3 flex flex-wrap gap-2">
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}
              className="rounded-lg border border-border px-3 py-2 text-sm">
              <option value="everyone">Everyone</option>
              <option value="students">All students</option>
              <option value="teachers">Teachers only</option>
              <option value="JEE">JEE students</option>
              <option value="NEET">NEET students</option>
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="rounded-lg border border-border px-3 py-2 text-sm">
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
              Pin to top
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Publish</button>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState icon="📣" title="Nothing announced yet" message={isStaff ? "Post the first update." : "Check back soon."} />
      ) : (
        <div className="space-y-4">
          {rows.map((a) => (
            <article key={a.id} className={`rounded-2xl border p-5 shadow-soft ${PRIO[a.priority] ?? PRIO.normal}`}>
              <div className="flex flex-wrap items-center gap-2">
                {a.pinned && <span className="rounded-full bg-soft-primary px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">📌 Pinned</span>}
                {a.priority !== "normal" && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${a.priority === "urgent" ? "bg-rose-500 text-white" : "bg-amber-500 text-white"}`}>{a.priority}</span>
                )}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{a.audience}</span>
              </div>
              <h3 className="mt-2 font-display text-2xl text-foreground">{a.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{a.body}</p>
              <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>{a.author_name} · {new Date(a.created_at).toLocaleDateString()}</span>
                {isStaff && (
                  <button onClick={async () => { if (confirm("Delete this announcement?")) { await del({ data: { id: a.id } }); refresh(); } }}
                    className="text-destructive hover:underline">Delete</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}