import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/dashboard/live/")({
  component: LiveIndex,
  head: () => ({
    meta: [
      { title: "Live Classes — TSJ Scholar Palanpur" },
      { name: "description", content: "Join live online classes, ask doubts with photos and rewatch saved lectures." },
      { property: "og:title", content: "Live Classes — TSJ Scholar Palanpur" },
      { property: "og:description", content: "Live lectures, chat, photo doubts and recorded classes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function LiveIndex() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "", scheduled_at: "" });

  const load = async () => {
    const { data } = await supabase.from("live_classes").select("*").order("created_at", { ascending: false }).limit(100);
    setRows((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const isTeacher = profile?.role === "teacher" || profile?.role === "principal";

  const create = async () => {
    if (!profile || !form.title.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("live_classes").insert({
      teacher_id: profile.id,
      teacher_name: profile.full_name,
      title: form.title.trim(),
      subject: form.subject.trim() || profile.subject || null,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      status: "scheduled",
    });
    setCreating(false);
    if (error) return alert(error.message);
    setForm({ title: "", subject: "", scheduled_at: "" });
    load();
  };

  const live = rows.filter((r) => r.status === "live");
  const upcoming = rows.filter((r) => r.status === "scheduled");
  const recorded = rows.filter((r) => r.status === "ended");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl sm:text-4xl">Live Classes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Join a class, ask doubts with photos, and rewatch anytime.</p>
      </header>

      {isTeacher && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <h2 className="font-display text-lg">Schedule a class</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input className="exam-input" placeholder="Class title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="exam-input" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <input type="datetime-local" className="exam-input" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
          </div>
          <button onClick={create} disabled={creating} className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {creating ? "Creating…" : "Create class"}
          </button>
        </section>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon="📡" title="No classes yet" message={isTeacher ? "Schedule your first live class above." : "Your teachers will start classes here."} />
      ) : (
        <>
          <Group title="Live now" rows={live} badge="LIVE" />
          <Group title="Upcoming" rows={upcoming} />
          <Group title="Recorded classes" rows={recorded} />
        </>
      )}
    </div>
  );
}

function Group({ title, rows, badge }: { title: string; rows: any[]; badge?: string }) {
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="mb-3 font-display text-xl">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((c) => (
          <Link
            key={c.id}
            to="/dashboard/live/$classId"
            params={{ classId: c.id }}
            className="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elegant"
          >
            <div className="flex items-center gap-2">
              {badge && <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">{badge}</span>}
              <span className="truncate font-display text-lg">{c.title}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {c.subject ? `${c.subject} · ` : ""}{c.teacher_name}
              {c.scheduled_at ? ` · ${new Date(c.scheduled_at).toLocaleString()}` : ""}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
