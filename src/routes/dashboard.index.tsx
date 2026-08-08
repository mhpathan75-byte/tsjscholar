import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { listMaterials } from "@/lib/materials.functions";
import { listEvents } from "@/lib/calendar.functions";
import { listAnnouncements } from "@/lib/announcements.functions";
import { Inspiration } from "@/components/Inspiration";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

type Quick = { to: string; title: string; body: string; d: string; img?: string };

function DashboardHome() {
  const { profile } = useAuth();
  const [counts, setCounts] = useState({ doubts: 0, materials: 0, students: 0, teachers: 0, answered: 0 });
  const [recentMaterials, setRecentMaterials] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const getMaterials = useServerFn(listMaterials);
  const getEvents = useServerFn(listEvents);
  const getAnnouncements = useServerFn(listAnnouncements);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [d, m, s, t, ans] = await Promise.all([
        profile.role === "student"
          ? supabase.from("doubts").select("id", { count: "exact", head: true }).eq("student_id", profile.id)
          : supabase.from("doubts").select("id", { count: "exact", head: true }),
        supabase.from("materials").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["teacher","principal"]),
        profile.role === "student"
          ? supabase.from("doubts").select("id", { count: "exact", head: true }).eq("student_id", profile.id).not("answer","is",null)
          : supabase.from("doubts").select("id", { count: "exact", head: true }).eq("answered_by", profile.id),
      ]);
      setCounts({
        doubts: d.count ?? 0, materials: m.count ?? 0,
        students: s.count ?? 0, teachers: t.count ?? 0,
        answered: ans.count ?? 0,
      });
    })();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    getMaterials({}).then((r: any) => setRecentMaterials((r ?? []).slice(0, 5))).catch(() => {});
    getEvents({}).then((r: any) => {
      const today = new Date().toISOString().slice(0, 10);
      setUpcomingEvents((r ?? []).filter((e: any) => e.event_date >= today).slice(0, 5));
    }).catch(() => {});
    getAnnouncements({}).then((r: any) => setRecentAnnouncements((r ?? []).slice(0, 4))).catch(() => {});
  }, [profile]); // eslint-disable-line

  if (!profile) return null;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  const greetingName = profile.full_name.split(" ")[0];

  const commonLinks: Quick[] = [
    { to: "/dashboard/tests", title: profile.role === "student" ? "Upcoming Tests" : "Create Test", body: profile.role === "student" ? "Attempt scheduled papers in a secure national-level exam workspace." : "Generate, review, version, publish and analyse professional papers.", d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
    { to: "/dashboard/ashra", title: "Ashra", body: "Personal tutor with memory, formulas & photo support.", d: "", img: "/brand/ashra.png" },
    { to: "/dashboard/glimpect", title: "Glimpect", body: "Snap a problem, diagram or equation — get an instant walkthrough.", d: "", img: "/brand/glimpect.png" },
    { to: "/dashboard/doubts", title: "Doubt Room", body: profile.role === "student" ? "Post a doubt with photos. Pick who sees it." : "See and answer student doubts.", d: "M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" },
    { to: "/dashboard/materials", title: "Materials", body: profile.role === "student" ? "Notes and resources from teachers." : "Upload notes, PDFs, worksheets and slides.", d: "M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4.5v15z" },
    { to: "/dashboard/reports", title: "Reports", body: "Your activity at a glance — doubts, chats, materials.", d: "M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m2 4H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{dateStr}</div>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">
            Welcome, <span className="italic text-primary">{greetingName}</span>.
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {profile.role === "principal" && "Your school at a glance. Ashra AI, Glimpect AI and the Doubt Room are all live."}
            {profile.role === "teacher" && `Your ${profile.subject ?? "subject"} classroom. Prep lectures with Ashra, snap problems with Glimpect, resolve doubts.`}
            {profile.role === "student" && "A calmer place to study, ask, snap and rise."}
          </p>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-foreground">Announcements</h2>
          <Link to="/dashboard/announcements" className="text-[10px] uppercase tracking-widest text-primary hover:underline">See all</Link>
        </div>
        {recentAnnouncements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No announcements yet. School notices will appear here.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {recentAnnouncements.map((a) => (
              <Link
                key={a.id}
                to="/dashboard/announcements"
                className="rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elegant"
              >
                <div className="flex items-center gap-2">
                  {a.pinned && <span className="text-xs">📌</span>}
                  {a.priority === "urgent" && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-rose-700">Urgent</span>}
                  {a.priority === "important" && <span className="rounded-full bg-soft-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold">Important</span>}
                  <span className="truncate font-display text-lg text-foreground">{a.title}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{a.body}</p>
                <div className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">{a.author_name}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Inspiration />

      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-2xl text-foreground">Where do you want to go?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tap any card below — or use the menu on the left. New here? Press &ldquo;How to use&rdquo; at the top.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {commonLinks.map((q) => (
            <Link
              key={q.title}
              to={q.to}
              className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-soft-primary text-primary">
                {q.img ? <img src={q.img} alt="" className="h-6 w-6 object-contain" /> : <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={q.d}/></svg>}
              </div>
              <div className="font-display text-lg text-foreground">{q.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{q.body}</div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-primary">
                Open <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="font-display text-xl text-foreground">Latest materials</h3>
            <Link to="/dashboard/materials" className="text-[10px] uppercase tracking-widest text-primary hover:underline">See all</Link>
          </div>
          {recentMaterials.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No materials yet.</div>
          ) : (
            <ul className="space-y-3">
              {recentMaterials.map((m) => (
                <li key={m.id}>
                  <Link to="/dashboard/materials" className="group flex items-start gap-3 rounded-lg p-2 hover:bg-muted/60">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft-primary text-primary">📄</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground group-hover:text-primary">{m.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.subject || "General"}{m.chapter ? ` · ${m.chapter}` : ""} · {m.uploader_name}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="font-display text-xl text-foreground">Upcoming</h3>
            <Link to="/dashboard/calendar" className="text-[10px] uppercase tracking-widest text-primary hover:underline">Calendar</Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Nothing scheduled.</div>
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.map((e) => {
                const d = new Date(e.event_date);
                const day = d.toLocaleDateString("en-US", { day: "2-digit" });
                const mon = d.toLocaleDateString("en-US", { month: "short" });
                const tone = e.event_type === "holiday" ? "bg-soft-emerald text-emerald" : e.event_type === "test" ? "bg-rose-100 text-rose-700" : "bg-soft-primary text-primary";
                return (
                  <li key={e.id} className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg ${tone}`}>
                      <span className="text-[9px] uppercase tracking-widest">{mon}</span>
                      <span className="font-display text-base leading-none">{day}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{e.title}</div>
                      {e.description && <div className="truncate text-xs text-muted-foreground">{e.description}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}