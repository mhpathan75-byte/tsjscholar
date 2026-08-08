import { useEffect, useState } from "react";

const KEY = "tsj-tour-v1";

type Step = { title: string; body: string; emoji: string };

const STEPS: Record<"student" | "teacher" | "principal", Step[]> = {
  student: [
    { emoji: "👋", title: "Welcome to TSJ Scholar", body: "This is your whole school on one screen — tutor, doubts, notes, calendar and fees. Let me show you around in 6 quick steps." },
    { emoji: "🧭", title: "The menu on the left", body: "Every page lives in the sidebar. On a phone, tap the ☰ button at the top-left to open it." },
    { emoji: "🌙", title: "Ashra — your tutor", body: "Ask any Physics, Chemistry, Maths or Biology question. You can also attach a photo of a sum. It remembers your past chats." },
    { emoji: "🔷", title: "Glimpect", body: "A powerful assistant for documents, sheets, code, QR codes, images and deep reasoning. It opens right inside the app." },
    { emoji: "💬", title: "Doubt Room & Materials", body: "Post a doubt with photos and choose who can see it. Teachers reply there. Notes your teachers upload appear in Materials." },
    { emoji: "🔔", title: "Stay updated", body: "The bell at the top shows new replies, notes, announcements, tests and fee updates. Allow notifications to get them instantly." },
  ],
  teacher: [
    { emoji: "👋", title: "Welcome, teacher", body: "Everything you need to run your classroom is here. 6 quick steps and you're set." },
    { emoji: "🧭", title: "The menu on the left", body: "All pages live in the sidebar. On a phone, tap ☰ at the top-left." },
    { emoji: "📚", title: "Materials", body: "Upload notes, PDFs, worksheets and slides. Students get a notification the moment you upload." },
    { emoji: "💬", title: "Doubt Room", body: "Student doubts land here with their photos. Answer them and the student is notified straight away." },
    { emoji: "📅", title: "Calendar & Announcements", body: "Mark tests, holidays and deadlines on the calendar — students see them instantly. Post notices in Announcements." },
    { emoji: "💰", title: "Fees & Reports", body: "Track billing, record payments and check activity reports for your class." },
  ],
  principal: [
    { emoji: "👋", title: "Welcome, principal", body: "The whole school at a glance. 6 quick steps to get oriented." },
    { emoji: "🧭", title: "The menu on the left", body: "All pages live in the sidebar. On a phone, tap ☰ at the top-left." },
    { emoji: "📊", title: "Reports", body: "See activity across students, faculty, doubts and materials." },
    { emoji: "💰", title: "Fees", body: "Total billed, collected and pending — set fees and record payments per student." },
    { emoji: "📅", title: "Calendar & Announcements", body: "Publish holidays, tests and school-wide notices that reach everyone instantly." },
    { emoji: "🖼️", title: "Gallery & Materials", body: "Curate school event albums and oversee the digital library." },
  ],
};

export function OnboardingTour({ role }: { role: "student" | "teacher" | "principal" }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch { /* ignore */ }
    const handler = () => { setI(0); setOpen(true); };
    window.addEventListener("tsj:open-tour", handler);
    return () => window.removeEventListener("tsj:open-tour", handler);
  }, []);

  const steps = STEPS[role];
  const close = () => {
    try { localStorage.setItem(KEY, "done"); } catch { /* ignore */ }
    setOpen(false);
  };

  if (!open) return null;
  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
        <div className="bg-soft-primary px-6 py-5">
          <div className="text-4xl">{step.emoji}</div>
          <div className="mt-3 font-display text-2xl text-foreground">{step.title}</div>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-foreground/80">{step.body}</p>

          <div className="mt-5 flex items-center gap-1.5">
            {steps.map((_, n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
              />
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button onClick={close} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
              Skip
            </button>
            <div className="flex gap-2">
              {i > 0 && (
                <button
                  onClick={() => setI((n) => n - 1)}
                  className="rounded-xl border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
                >Back</button>
              )}
              <button
                onClick={() => (last ? close() : setI((n) => n + 1))}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
              >{last ? "Start using the app" : "Next"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
