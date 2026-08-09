import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listEvents, createEvent, deleteEvent } from "@/lib/calendar.functions";
import { holidaysForYear, type Holiday } from "@/lib/holidays";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/dashboard/calendar")({
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Calendar — TSJ Scholar Palanpur" },
      { name: "description", content: "Tests, live classes, school events and Indian festivals & holidays in one calendar." },
      { property: "og:title", content: "Calendar — TSJ Scholar Palanpur" },
      { property: "og:description", content: "Tests, live classes, school events and Indian festivals & holidays in one calendar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Ev = { id: string; title: string; description: string | null; event_type: string; event_date: string; end_date: string | null };

const TYPE_STYLE: Record<string, string> = {
  test: "bg-rose-500 text-white",
  holiday: "bg-emerald-500 text-white",
  live_class: "bg-teal-500 text-white",
  announcement: "bg-amber-500 text-white",
  general: "bg-primary text-primary-foreground",
};

const DOT: Record<string, string> = {
  test: "bg-rose-500",
  holiday: "bg-emerald-500",
  live_class: "bg-teal-500",
  announcement: "bg-amber-500",
  general: "bg-primary",
};

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function CalendarPage() {
  const { profile } = useAuth();
  const isStaff = profile?.role === "teacher" || profile?.role === "principal";
  const list = useServerFn(listEvents);
  const add = useServerFn(createEvent);
  const del = useServerFn(deleteEvent);
  const [events, setEvents] = useState<Ev[]>([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState<string>(() => toIso(new Date()));
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", event_type: "general" });

  const refresh = () => list({}).then((r) => setEvents(r as Ev[])).catch(() => {});
  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const grid = useMemo(() => {
    const year = cursor.getFullYear(); const month = cursor.getMonth();
    const startDow = new Date(year, month, 1).getDay();
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

  const holidayMap = useMemo(() => holidaysForYear(cursor.getFullYear()), [cursor]);
  const holidaysOnDate = (iso: string): Holiday[] => holidayMap.get(iso) ?? [];

  const todayStr = toIso(new Date());
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const monthHolidays = useMemo(() => {
    const prefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    return [...holidayMap.entries()]
      .filter(([d]) => d.startsWith(prefix))
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([date, hs]) => hs.map((h) => ({ ...h, date })));
  }, [holidayMap, cursor]);

  const submit = async () => {
    if (!form.title.trim()) return;
    await add({ data: { ...form, event_date: selected } });
    setForm({ title: "", description: "", event_type: "general" });
    setCreating(false); refresh();
  };

  const selectedEvents = evByDate.get(selected) ?? [];
  const selectedHolidays = holidaysOnDate(selected);
  const selectedLabel = new Date(`${selected}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Schedule</div>
          <h1 className="mt-2 font-display text-3xl text-foreground sm:text-4xl">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tests, holidays, live classes & Indian festivals.</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted" aria-label="Previous month">‹</button>
          <div className="min-w-0 flex-1 text-center font-display text-lg text-foreground sm:min-w-[10rem] sm:flex-none">{monthLabel}</div>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted" aria-label="Next month">›</button>
          <button onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); setSelected(todayStr); }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs uppercase tracking-widest hover:bg-muted">Today</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="grid grid-cols-7 border-b border-border bg-muted/50 text-center text-[9px] uppercase tracking-widest text-muted-foreground sm:text-[10px]">
          {["S","M","T","W","T","F","S"].map((d, i) => (
            <div key={i} className="py-2">
              <span className="sm:hidden">{d}</span>
              <span className="hidden sm:inline">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i]}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d, i) => {
            if (!d) return <div key={i} className="min-h-[58px] border-b border-r border-border bg-muted/20 sm:min-h-[110px]" />;
            const iso = toIso(d);
            const dayEvents = evByDate.get(iso) ?? [];
            const dayHolidays = holidaysOnDate(iso);
            const isToday = iso === todayStr;
            const isSelected = iso === selected;
            const isSunday = d.getDay() === 0;
            return (
              <button
                key={i}
                type="button"
                onClick={() => { setSelected(iso); setCreating(false); }}
                className={`group relative flex min-h-[58px] flex-col items-stretch border-b border-r border-border p-1 text-left transition sm:min-h-[110px] sm:p-2 ${
                  isSelected ? "bg-soft-primary ring-2 ring-inset ring-primary" : isToday ? "bg-soft-primary" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] sm:text-xs ${
                    isToday ? "bg-primary font-bold text-primary-foreground"
                      : dayHolidays.length ? "font-semibold text-rose-600"
                      : isSunday ? "text-rose-500" : "text-foreground"
                  }`}>{d.getDate()}</span>
                  {isStaff && (
                    <span className="hidden rounded p-0.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 sm:inline">+</span>
                  )}
                </div>

                {/* Mobile: compact dots */}
                <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                  {dayHolidays.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                  {dayEvents.slice(0, 3).map((e) => (
                    <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${DOT[e.event_type] ?? DOT.general}`} />
                  ))}
                  {dayEvents.length > 3 && <span className="text-[8px] leading-none text-muted-foreground">+{dayEvents.length - 3}</span>}
                </div>

                {/* Desktop: labels */}
                <div className="mt-1 hidden space-y-1 sm:block">
                  {dayHolidays.map((h) => (
                    <div key={h.name} title={h.name}
                      className="truncate rounded bg-soft-gold px-1.5 py-0.5 text-[10px] font-medium text-gold-foreground">
                      🎉 {h.name}
                    </div>
                  ))}
                  {dayEvents.map((e) => (
                    <div key={e.id} title={e.description ?? e.title}
                      className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_STYLE[e.event_type] ?? TYPE_STYLE.general}`}>
                      {e.title}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-foreground sm:text-xl">{selectedLabel}</h2>
          {isStaff && (
            <button onClick={() => setCreating((c) => !c)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
              {creating ? "Cancel" : "+ Add event"}
            </button>
          )}
        </div>

        {creating && isStaff && (
          <div className="mt-3 grid gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-2">
            <input autoFocus placeholder="Title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2" />
            <input placeholder="Details (optional)" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="general">General</option>
              <option value="test">Test</option>
              <option value="holiday">Holiday</option>
              <option value="live_class">Live Class</option>
              <option value="announcement">Announcement</option>
            </select>
            <button onClick={submit} disabled={!form.title.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-2">
              Save event
            </button>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {selectedHolidays.map((h) => (
            <div key={h.name} className="flex items-center gap-3 rounded-xl border border-border bg-soft-gold px-4 py-3">
              <span className="text-lg">🎉</span>
              <div>
                <div className="text-sm font-semibold text-foreground">{h.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {h.kind === "national" ? "National holiday" : "Festival"}
                </div>
              </div>
            </div>
          ))}
          {selectedEvents.map((e) => (
            <div key={e.id} className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[e.event_type] ?? DOT.general}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{e.title}</div>
                {e.description && <div className="mt-0.5 text-sm text-muted-foreground">{e.description}</div>}
                <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{e.event_type.replace("_", " ")}</div>
              </div>
              {isStaff && (
                <button onClick={async () => { await del({ data: { id: e.id } }); refresh(); }}
                  className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted">Delete</button>
              )}
            </div>
          ))}
          {selectedEvents.length === 0 && selectedHolidays.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing on this day.</p>
          )}
        </div>
      </div>

      {monthHolidays.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-xl text-foreground">Festivals & holidays in {monthLabel}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {monthHolidays.map((h) => (
              <button key={`${h.date}-${h.name}`} onClick={() => setSelected(h.date)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-soft hover:bg-muted/40">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-soft-gold">
                  <span className="text-[8px] uppercase tracking-widest text-muted-foreground">
                    {new Date(`${h.date}T00:00:00`).toLocaleDateString("en-US", { month: "short" })}
                  </span>
                  <span className="font-display text-base leading-none text-foreground">{Number(h.date.slice(8))}</span>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{h.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {h.kind === "national" ? "National holiday" : "Festival"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 font-display text-xl text-foreground">Upcoming</h2>
        {events.filter((e) => e.event_date >= todayStr).length === 0 ? (
          <EmptyState icon="📅" title="Nothing scheduled" message={isStaff ? "Pick a date above and tap “Add event”." : "Your teachers haven't scheduled anything yet."} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.filter((e) => e.event_date >= todayStr).slice(0, 9).map((e) => {
              const d = new Date(`${e.event_date}T00:00:00`);
              return (
                <div key={e.id} className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-soft">
                  <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${TYPE_STYLE[e.event_type] ?? TYPE_STYLE.general}`}>
                    <span className="text-[9px] uppercase tracking-widest opacity-80">{d.toLocaleDateString("en-US", { month: "short" })}</span>
                    <span className="font-display text-xl leading-none">{d.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground">{e.title}</div>
                    {e.description && <div className="mt-0.5 text-sm text-muted-foreground">{e.description}</div>}
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{e.event_type.replace("_", " ")}</div>
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
