import { createFileRoute, Link, useNavigate, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { useAuth, type AppRole } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { OnboardingTour } from "@/components/OnboardingTour";
import { AshraMark } from "@/components/AshraMark";

export const Route = createFileRoute("/dashboard")({
  component: DashboardShell,
  head: () => ({ meta: [{ title: "Dashboard — TSJ Scholar Palanpur" }] }),
});

type NavItem = { label: string; d: string; to: string; disabled?: boolean; mark?: "ashra" | "glimpect" };

const NAV_COMMON: NavItem[] = [
  { label: "Overview", d: "M3 12l9-9 9 9v9a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2v-9z", to: "/dashboard" },
  { label: "Ashra", d: "", to: "/dashboard/ashra", mark: "ashra" },
  { label: "Glimpect", d: "", to: "/dashboard/glimpect", mark: "glimpect" },
  { label: "Doubt Room", d: "M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2v10z", to: "/dashboard/doubts" },
  { label: "Materials", d: "M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4.5v15z", to: "/dashboard/materials" },
  { label: "Tests", d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", to: "/dashboard/tests" },
  { label: "Announcements", d: "M3 11l18-8v18l-18-8v-2zM7 13v6", to: "/dashboard/announcements" },
  { label: "Calendar", d: "M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z", to: "/dashboard/calendar" },
  { label: "Gallery", d: "M4 5h16v14H4z M4 15l4-4 4 4 4-4 4 4", to: "/dashboard/gallery" },
  { label: "Fees", d: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", to: "/dashboard/fees" },
  { label: "Reports", d: "M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m2 4H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586", to: "/dashboard/reports" },
];

const NAV: Record<AppRole, NavItem[]> = {
  principal: [...NAV_COMMON, { label: "Add Students", d: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6", to: "/dashboard/students" }],
  teacher: [...NAV_COMMON, { label: "Add Students", d: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6", to: "/dashboard/students" }],
  student: [...NAV_COMMON],
};

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function DashboardShell() {
  const { profile, loading, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse font-display text-2xl text-muted-foreground">Loading your dashboard…</div>
      </div>
    );
  }

  const nav = NAV[profile.role];
  const initials = profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const roleLabel = profile.role === "principal" ? "Principal" : profile.role === "teacher" ? "Teacher" : "Student";

  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-sidebar text-sidebar-foreground shadow-soft">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 hover:bg-sidebar-accent md:hidden"
            >
              <Icon d="M4 6h16M4 12h16M4 18h16" />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <Logo withText={false} className="h-9 w-9" />
              <span className="hidden font-display text-lg font-semibold sm:inline">TSJ Scholar Palanpur</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={() => window.dispatchEvent(new Event("tsj:open-tour"))}
              className="hidden rounded-lg border border-sidebar-border px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-sidebar-accent sm:block"
              title="Show me how to use this app"
            >
              How to use
            </button>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium">{profile.full_name}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-primary">
                {roleLabel}{profile.subject ? ` · ${profile.subject}` : ""}{profile.exam_track ? ` · ${profile.exam_track}` : ""}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold font-display text-sm font-bold text-ink">
              {initials}
            </div>
            <button onClick={signOut} className="rounded-lg border border-sidebar-border px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-sidebar-accent">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:block">
          <SidebarNav nav={nav} onNavigate={() => {}} />
        </aside>

        {/* Sidebar mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 bg-card shadow-elegant">
              <div className="flex items-center justify-between border-b border-border p-4">
                <Logo />
                <button aria-label="Close" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 hover:bg-muted">
                  <Icon d="M6 6l12 12M6 18L18 6" />
                </button>
              </div>
              <SidebarNav nav={nav} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <main className="flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>

      <Footer />
      <OnboardingTour role={profile.role} />
    </div>
  );
}

function SidebarNav({ nav, onNavigate }: { nav: NavItem[]; onNavigate: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-3 px-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Navigate</div>
      {nav.map((item) =>
        item.disabled ? (
          <button
            key={item.label}
            disabled
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground opacity-60 disabled:cursor-not-allowed"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft-primary text-primary">
              <NavGlyph item={item} />
            </span>
            <span className="flex-1">{item.label}</span>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] uppercase tracking-widest text-accent-foreground">Soon</span>
          </button>
        ) : (
          <Link
            key={item.label}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-muted text-primary" }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft-primary text-primary">
              <NavGlyph item={item} />
            </span>
            <span className="flex-1">{item.label}</span>
          </Link>
        ),
      )}
    </nav>
  );
}

function NavGlyph({ item }: { item: NavItem }) {
  if (item.mark === "ashra") return <AshraMark className="h-5 w-5" />;
  if (item.mark === "glimpect") return <img src="/brand/glimpect.png" alt="" className="h-5 w-5 object-contain" />;
  return <Icon d={item.d} className="h-4 w-4" />;
}
