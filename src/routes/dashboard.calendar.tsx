import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listEvents, createEvent, deleteEvent } from "@/lib/calendar.functions";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/dashboard/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendar — TSJ Scholar Palanpur" }] }),
});

type Ev = { id: string; title: string; description: string | null; event_type: string; event_date: string; end_date: string | null };

const TYPE_STYLE: Record<string, string> = {
  test: "bg-rose-500 text-white",
  holiday: "bg-emerald-500 text-white",
  live_class: "bg-teal-500 text-white",
  announcement: "bg-amber-500 text-white",
  general: "bg-primary text-primary-foreground",
};

function CalendarPage() {
  const { profile } = useAuth();
  const isStaff = profile?.role === "teacher" || profile?.role === "principal";
  const list = useServerFn(listEvents);
  const add = useServerFn(createEvent);
  const del = useServerFn(deleteEvent);
  const [events, setEvents] = useState<Ev[]>([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [creating, setCreating] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", event_type: "general" });

  const refresh = () => list({}).then((r) => setEvents(r as Ev[])).catch(() => {});
  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const grid = useMemo(() => {
    const year = cursor.getFullYear(); const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startDow = first.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const evByDate = useMemo(() => {
    const m = new Map<string, Ev[]>();
    events.forEach((e) => {
      const arr = m.get(e.event_date) ?? [];
      arr.push(e); m.set(e.event_date, arr);
    });
    return m;
  }, [events]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const submit = async (date: string) => {
    if (!form.title.trim()) return;
    await add({ data: { ...form, event_date: date } });
    setForm({ title: "", description: "", event_type: "general" });
    setCreating(null); refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Schedule</div>
          <h1 className="mt-2 font-display text-4xl text-foreground">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tests, holidays, live classes & school events.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted">‹</button>
          <div className="min-w-[10rem] text-center font-display text-lg text-foreground">{monthLabel}</div>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted">›</button>
          <button onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs uppercase tracking-widest hover:bg-muted">Today</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="grid grid-cols-7 border-b border-border bg-muted/50 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d, i) => {
            if (!d) return <div key={i} className="min-h-[110px] border-b border-r border-border bg-muted/20" />;
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const dayEvents = evByDate.get(iso) ?? [];
            const isToday = iso === todayStr;
            return (
              <div key={i} className={`group relative min-h-[110px] border-b border-r border-border p-2 ${isToday ? "bg-soft-primary" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground"}`}>{d.getDate()}</span>
                  {isStaff && (
                    <button onClick={() => setCreating(iso)}
                      className="rounded p-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-muted hover:text-primary"
                      aria-label="Add event">+</button>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {dayEvents.map((e) => (
                    <div key={e.id} title={e.description ?? e.title}
                      className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_STYLE[e.event_type] ?? TYPE_STYLE.general}`}>
                      {e.title}
                      {isStaff && (
                        <button onClick={async () => { await del({ data: { id: e.id } }); refresh(); }}
                          className="ml-1 opacity-70 hover:opacity-100">×</button>
                      )}
                    </div>
                  ))}
                </div>
                {creating === iso && (
                  <div className="absolute inset-x-1 top-full z-20 mt-1 rounded-lg border border-border bg-card p-2 shadow-elegant">
                    <input autoFocus placeholder="Title" value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="mb-1 w-full rounded border border-border px-2 py-1 text-xs" />
                    <input placeholder="Details (optional)" value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="mb-1 w-full rounded border border-border px-2 py-1 text-xs" />
                    <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                      className="mb-1 w-full rounded border border-border px-2 py-1 text-xs">
                      <option value="general">General</option>
                      <option value="test">Test</option>
                      <option value="holiday">Holiday</option>
                      <option value="live_class">Live Class</option>
                      <option value="announcement">Announcement</option>
                    </select>
                    <div className="flex gap-1">
                      <button onClick={() => submit(iso)} className="flex-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground">Save</button>
                      <button onClick={() => setCreating(null)} className="rounded border border-border px-2 py-1 text-xs">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl text-foreground">Upcoming</h2>
        {events.filter((e) => e.event_date >= todayStr).length === 0 ? (
          <EmptyState icon="📅" title="Nothing scheduled" message={isStaff ? "Click + on any date to add." : "Your teachers haven't scheduled anything yet."} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.filter((e) => e.event_date >= todayStr).slice(0, 9).map((e) => {
              const d = new Date(e.event_date);
              return (
                <div key={e.id} className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-soft">
                  <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${TYPE_STYLE[e.event_type] ?? TYPE_STYLE.general}`}>
                    <span className="text-[9px] uppercase tracking-widest opacity-80">{d.toLocaleDateString("en-US", { month: "short" })}</span>
                    <span className="font-display text-xl leading-none">{d.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground">{e.title}</div>
                    {e.description && <div className="mt-0.5 text-sm text-muted-foreground">{e.description}</div>}
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{e.event_type}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}