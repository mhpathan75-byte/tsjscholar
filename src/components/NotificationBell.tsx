import { useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listNotifications, markRead, markAllRead, deleteNotification } from "@/lib/notifications.functions";

type Notif = {
  id: string; category: string; title: string; message: string | null;
  link: string | null; icon: string | null; read_at: string | null;
  created_at: string; sender_name: string | null;
};

const CATEGORY_STYLE: Record<string, string> = {
  doubt: "bg-blue-100 text-blue-700",
  material: "bg-emerald-100 text-emerald-700",
  announcement: "bg-amber-100 text-amber-700",
  fees: "bg-rose-100 text-rose-700",
  gallery: "bg-purple-100 text-purple-700",
  general: "bg-muted text-foreground",
  test: "bg-indigo-100 text-indigo-700",
  live_class: "bg-teal-100 text-teal-700",
};

function relTime(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const list = useServerFn(listNotifications);
  const readOne = useServerFn(markRead);
  const readAll = useServerFn(markAllRead);
  const del = useServerFn(deleteNotification);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = () => list({}).then((r) => setRows(r as Notif[])).catch(() => {});

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  useEffect(() => {
    // realtime subscription for new notifications
    let channel: any;
    let cancelled = false;
    (async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid || cancelled) return;
      const ch = supabase.channel(`notif-${uid}-${Math.random().toString(36).slice(2)}`);
      channel = ch;
      ch
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          (payload: any) => {
            refresh();
            try {
              if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && localStorage.getItem("tsj:web-notifications") !== "disabled") {
                const n = payload.new;
                const notif = new Notification(n.title || "TSJ Scholar", {
                  body: n.message ?? "",
                  icon: "/favicon.png",
                  badge: "/favicon.png",
                  tag: n.id,
                });
                notif.onclick = () => { window.focus(); if (n.link) window.location.href = n.link; };
              }
            } catch {}
          })
        .subscribe();
    })();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, []); // eslint-disable-line

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = rows.filter((r) => !r.read_at).length;

  const click = async (n: Notif) => {
    if (!n.read_at) { await readOne({ data: { id: n.id } }); refresh(); }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 hover:bg-sidebar-accent"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed left-2 right-2 top-16 z-50 overflow-hidden rounded-2xl border border-border bg-card shadow-elegant animate-scale-in sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[360px] sm:max-w-[92vw]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="font-display text-base text-foreground">Notifications</div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={async () => { await readAll({}); refresh(); }}
                  className="text-[10px] uppercase tracking-widest text-primary hover:underline"
                >Mark all read</button>
              )}
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {rows.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">You're all caught up ✨</div>
            )}
            {rows.map((n) => {
              const body = (
                <div className={`group flex gap-3 p-3 transition hover:bg-muted/60 ${!n.read_at ? "bg-soft-primary" : ""}`}>
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${CATEGORY_STYLE[n.category] ?? CATEGORY_STYLE.general}`}>
                    {n.category[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium text-foreground">{n.title}</div>
                      {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    {n.message && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</div>}
                    <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                      <span>{relTime(n.created_at)}</span>
                      {n.sender_name && <span>· {n.sender_name}</span>}
                    </div>
                  </div>
                  <button
                    onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await del({ data: { id: n.id } }); refresh(); }}
                    className="self-start p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6"/></svg>
                  </button>
                </div>
              );
              return n.link ? (
                <Link key={n.id} to={n.link} onClick={() => click(n)} className="block border-b border-border last:border-0">{body}</Link>
              ) : (
                <button key={n.id} onClick={() => click(n)} className="block w-full border-b border-border text-left last:border-0">{body}</button>
              );
            })}
          </div>
          <div className="border-t border-border p-2 text-center">
            <Link to="/dashboard/notifications" onClick={() => setOpen(false)} className="text-xs uppercase tracking-widest text-primary hover:underline">
              See all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}