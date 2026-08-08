import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { loadAttempt, logViolation, saveAnswer, submitAttempt } from "@/lib/tests.functions";

export const Route = createFileRoute("/exam/$attemptId")({
  component: ExamPage,
  head: () => ({
    meta: [
      { title: "Secure examination — TSJ Scholar Palanpur" },
      { name: "description", content: "Secure TSJ computer-based examination workspace." },
      { property: "og:title", content: "Secure examination — TSJ Scholar Palanpur" },
      { property: "og:description", content: "TSJ Scholar secure computer-based examination." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ExamPage() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const load = useServerFn(loadAttempt),
    save = useServerFn(saveAnswer),
    violate = useServerFn(logViolation),
    submit = useServerFn(submitAttempt);
  const [data, setData] = useState<any>(null),
    [stage, setStage] = useState<"check" | "declaration" | "exam">("check"),
    [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({}),
    [states, setStates] = useState<Record<string, string>>({}),
    [sync, setSync] = useState("Answers synced");
  const [online, setOnline] = useState(true),
    [full, setFull] = useState(false),
    [warnings, setWarnings] = useState(0),
    [ticks, setTicks] = useState(0),
    [agreed, setAgreed] = useState([false, false, false]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [fsSupported, setFsSupported] = useState(true);
  const started = useRef(new Date().toISOString()),
    finishing = useRef(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    setFsSupported(typeof document.documentElement.requestFullscreen === "function");
  }, []);
  useEffect(() => {
    load({ data: { attemptId } }).then((result: any) => {
      setData(result);
      setAnswers(Object.fromEntries((result.responses ?? []).map((r: any) => [r.question_id, r.answer])));
      setStates(Object.fromEntries((result.responses ?? []).map((r: any) => [r.question_id, r.state])));
    });
  }, [attemptId]); // eslint-disable-line
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => {
    if (stage !== "exam") return;
    const timer = setInterval(() => setTicks((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [stage]);

  const questions = data?.questions ?? [],
    q = questions[index],
    test = data?.attempt?.tests;
  const sections = useMemo(() => {
    const map = new Map<string, Array<{ question: any; index: number }>>();
    questions.forEach((question: any, questionIndex: number) =>
      map.set(question.subject, [...(map.get(question.subject) ?? []), { question, index: questionIndex }]),
    );
    return [...map.entries()];
  }, [questions]);
  const remaining = Math.max(0, (test?.duration_minutes ?? 60) * 60 - ticks);

  const answeredOf = (id: string) => {
    const value = answers[id];
    return value !== null && value !== undefined && String(value) !== "";
  };
  const answeredCount = questions.filter((question: any) => answeredOf(question.id)).length;

  const finish = async (reason = "student_submit", confirmFirst = true) => {
    if (finishing.current) return;
    if (confirmFirst && !confirm(`Submit now? ${answeredCount} answered, ${questions.length - answeredCount} remaining.`)) return;
    finishing.current = true;
    await submit({ data: { attemptId, reason } });
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    navigate({ to: "/exam-results/$attemptId", params: { attemptId } });
  };
  useEffect(() => {
    if (stage === "exam" && remaining === 0) finish("timer_ended", false);
  }, [remaining, stage]); // eslint-disable-line

  const record = async (type: string, reason: string) => {
    if (stage !== "exam" || finishing.current) return;
    const result = (await violate({ data: { attemptId, type, reason, questionId: q?.id } })) as any;
    setWarnings(result.count);
    if (result.count >= 2) await finish("security_violations", false);
  };
  useEffect(() => {
    if (stage !== "exam") return;
    const blur = () => record("window_blur", "Student left the examination window"),
      visibility = () => {
        if (document.hidden) record("tab_change", "Student changed tabs");
      },
      fullscreen = () => {
        const ok = Boolean(document.fullscreenElement);
        setFull(ok);
        if (!ok && fsSupported && !finishing.current) record("fullscreen_exit", "Student exited fullscreen");
      },
      context = (e: Event) => e.preventDefault(),
      key = (e: KeyboardEvent) => {
        if (
          e.key === "F12" ||
          (e.ctrlKey && ["c", "v", "x", "a", "u", "p"].includes(e.key.toLowerCase())) ||
          (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase()))
        ) {
          e.preventDefault();
          record("blocked_shortcut", `Blocked shortcut: ${e.key}`);
        }
      };
    addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("contextmenu", context);
    document.addEventListener("keydown", key);
    return () => {
      removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("contextmenu", context);
      document.removeEventListener("keydown", key);
    };
  }, [stage, index, data, fsSupported]); // eslint-disable-line

  const persist = async (answer: any, state: string) => {
    if (!q) return;
    setAnswers((current) => ({ ...current, [q.id]: answer }));
    setStates((current) => ({ ...current, [q.id]: state }));
    setSync("Saving…");
    try {
      await save({ data: { attemptId, questionId: q.id, answer, state, startedAt: started.current, timeSeconds: ticks } });
      setSync("Answers synced");
    } catch {
      setSync("Sync pending");
    }
  };
  const isReview = (id: string) => String(states[id] ?? "").includes("review");
  const toggleReview = async () => {
    if (!q) return;
    const answer = answers[q.id] ?? null;
    const nowReview = !isReview(q.id);
    const state = nowReview ? (answeredOf(q.id) ? "answered_review" : "review") : answeredOf(q.id) ? "answered" : "visited";
    await persist(answer, state);
  };
  const skipQuestion = async () => {
    if (!q) return;
    await persist(null, "skipped");
    if (index < questions.length - 1) setIndex((i) => i + 1);
  };

  if (!data)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-muted-foreground">
        Preparing secure examination…
      </div>
    );

  if (stage === "check")
    return (
      <Gate title="System check" text="We check your setup before the examination begins.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Check ok={online} label="Internet connection" />
          <Check ok={fsSupported} label={fsSupported ? "Fullscreen support" : "Fullscreen not available (allowed)"} />
          <Check ok label="Screen ready" />
          <Check ok label="Keyboard available" />
          <Check ok label="Supported browser" />
          <Check ok label="Autosave ready" />
        </div>
        <button
          disabled={!online}
          onClick={() => setStage("declaration")}
          className="mt-6 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-40 sm:w-auto"
        >
          Continue
        </button>
      </Gate>
    );

  if (stage === "declaration")
    return (
      <Gate title="Security declaration" text="A fair test protects every student.">
        <div className="space-y-3">
          {[
            "I will not cheat or use outside help.",
            "I will stay on this screen throughout the test.",
            "I understand repeated violations may auto-submit my paper.",
          ].map((text, i) => (
            <label key={text} className="flex cursor-pointer gap-3 rounded-xl border border-border p-4">
              <input
                type="checkbox"
                className="mt-1 shrink-0"
                checked={agreed[i]}
                onChange={(e) => setAgreed((items) => items.map((value, j) => (j === i ? e.target.checked : value)))}
              />
              <span className="text-sm sm:text-base">{text}</span>
            </label>
          ))}
        </div>
        <button
          disabled={!agreed.every(Boolean)}
          onClick={async () => {
            if (fsSupported) {
              try {
                await document.documentElement.requestFullscreen();
                setFull(true);
              } catch {
                setFull(false);
              }
            }
            setStage("exam");
          }}
          className="mt-6 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-40 sm:w-auto"
        >
          {fsSupported ? "Enter fullscreen & start" : "Start examination"}
        </button>
      </Gate>
    );

  const optionOrder = data.attempt.option_orders?.[q.id] ?? [],
    opts = Array.isArray(q.options) ? q.options : [],
    ordered = [...opts].sort((a: any, b: any) => optionOrder.indexOf(a.id) - optionOrder.indexOf(b.id));

  const palette = (
    <div className="space-y-5">
      {sections.map(([subject, items]) => (
        <section key={subject}>
          <h3 className="mb-2 border-b border-border pb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            {subject} · {items.length} questions
          </h3>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
            {items.map(({ question, index: questionIndex }) => (
              <button
                key={question.id}
                onClick={() => {
                  setIndex(questionIndex);
                  setPaletteOpen(false);
                }}
                className={`aspect-square min-h-9 rounded-full text-xs font-semibold ${
                  questionIndex === index
                    ? "ring-2 ring-primary"
                    : String(states[question.id] ?? "").includes("review")
                      ? "bg-gold text-gold-foreground ring-1 ring-gold"
                      : states[question.id] === "answered"
                        ? "bg-emerald text-emerald-foreground"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {questionIndex + 1}
              </button>
            ))}
          </div>
        </section>
      ))}
      <div className="space-y-2 text-xs">
        <Legend color="bg-emerald" label="Answered" count={answeredCount} />
        <Legend color="bg-gold" label="Review" count={Object.values(states).filter((x) => String(x).includes("review")).length} />
        <Legend color="bg-muted" label="Remaining" count={questions.length - answeredCount} />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground select-none">
      {fsSupported && !full && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6">
          <div className="max-w-md rounded-xl border border-destructive bg-card p-7 text-center">
            <h2 className="font-display text-2xl">Fullscreen is required</h2>
            <p className="mt-2 text-sm text-muted-foreground">Return immediately. The next exit will submit your paper.</p>
            <button
              onClick={async () => {
                await document.documentElement.requestFullscreen().catch(() => {});
                setFull(Boolean(document.fullscreenElement));
              }}
              className="mt-5 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
            >
              Return to fullscreen
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 border-b border-border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <div className="truncate font-display text-base sm:text-xl">{test.title}</div>
            <div className="truncate text-xs text-muted-foreground">
              Question {index + 1} of {questions.length} · {q.subject}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">
              <Health online={online} sync={sync} full={full || !fsSupported} />
            </div>
            <div
              className={`rounded-xl px-3 py-2 font-mono text-base font-bold sm:text-xl ${
                remaining < 300 ? "bg-soft-rose text-destructive" : remaining < 900 ? "bg-soft-gold text-gold" : "bg-soft-emerald text-emerald"
              }`}
            >
              {Math.floor(remaining / 60).toString().padStart(2, "0")}:{(remaining % 60).toString().padStart(2, "0")}
            </div>
            <button
              onClick={() => setPaletteOpen(true)}
              className="rounded-xl border border-border px-3 py-2 text-xs font-semibold lg:hidden"
            >
              Palette
            </button>
          </div>
        </div>
        {warnings > 0 && (
          <div className="bg-destructive px-4 py-2 text-center text-xs font-semibold text-destructive-foreground sm:text-sm">
            Security warning {warnings}/2 — one more violation will auto-submit immediately.
          </div>
        )}
      </header>

      <main className="grid flex-1 lg:grid-cols-[1fr_340px]">
        <section className="p-3 sm:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap gap-2">
              <Tag>{q.subject}</Tag>
              <Tag>{q.chapter}</Tag>
              <Tag>{q.difficulty}</Tag>
            </div>
            {q.passage && (
              <div className="mt-5 overflow-x-auto rounded-xl border-l-4 border-primary bg-muted p-4 sm:p-5">
                <Markdown>{q.passage}</Markdown>
              </div>
            )}
            <div className="mt-6 break-words text-base font-medium leading-8 sm:text-xl">
              <Markdown>{q.stem}</Markdown>
            </div>
            {q.diagrams?.map((d: any, i: number) =>
              d.type === "svg" ? (
                <div
                  key={i}
                  className="mt-5 w-full overflow-x-auto rounded-xl border border-border bg-card p-3 sm:p-4 [&_svg]:h-auto [&_svg]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: d.content }}
                />
              ) : null,
            )}
            <div className="mt-7 space-y-3">
              {q.question_type === "Numerical" || q.question_type === "Integer" ? (
                <input
                  type="number"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => persist(e.target.value, "answered")}
                  className="exam-input w-full max-w-sm text-lg"
                  placeholder="Enter numerical answer"
                />
              ) : (
                ordered.map((option: any) => (
                  <button
                    key={option.id}
                    onClick={() => persist(option.id, "answered")}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left sm:gap-4 sm:p-4 ${
                      answers[q.id] === option.id ? "border-primary bg-soft-primary" : "border-border bg-card"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border font-semibold">
                      {option.id}
                    </span>
                    <span className="min-w-0 break-words pt-1">
                      <Markdown>{option.text}</Markdown>
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="mt-9 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  disabled={index === 0}
                  onClick={() => setIndex((i) => i - 1)}
                  className="rounded-xl border border-border px-4 py-2 text-sm disabled:opacity-30"
                >
                  Previous
                </button>
                <button onClick={() => persist(null, "cleared")} className="rounded-xl border border-border px-4 py-2 text-sm">
                  Clear
                </button>
                <button onClick={skipQuestion} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
                  Skip question
                </button>
                <button
                  onClick={toggleReview}
                  aria-pressed={isReview(q.id)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                    isReview(q.id) ? "border-gold bg-gold text-gold-foreground" : "border-primary text-primary"
                  }`}
                >
                  {isReview(q.id) ? "★ Marked — unmark" : "Mark for review"}
                </button>
                <button
                  onClick={async () => {
                    await toggleReview();
                    if (index < questions.length - 1) setIndex((i) => i + 1);
                  }}
                  className="col-span-2 rounded-xl border border-gold px-4 py-2 text-sm font-semibold text-gold sm:col-span-1"
                >
                  Mark &amp; Next
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                {index < questions.length - 1 && (
                  <button
                    onClick={() => setIndex((i) => i + 1)}
                    className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    Save &amp; Next
                  </button>
                )}
                <button
                  onClick={() => finish()}
                  className="rounded-xl bg-destructive px-5 py-2 text-sm font-semibold text-destructive-foreground"
                >
                  Submit test
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden border-l border-border bg-card p-5 lg:block">
          <h2 className="font-display text-xl">Question palette</h2>
          <div className="mt-4">{palette}</div>
        </aside>
      </main>

      {paletteOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-label="Question palette">
          <button className="flex-1 bg-background/70" onClick={() => setPaletteOpen(false)} aria-label="Close palette" />
          <div className="w-[85%] max-w-sm overflow-y-auto border-l border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">Question palette</h2>
              <button onClick={() => setPaletteOpen(false)} className="rounded-lg border border-border px-3 py-1 text-sm">
                Close
              </button>
            </div>
            <div className="mt-4">{palette}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Gate({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment p-4 sm:p-5">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-elegant sm:p-7">
        <div className="text-xs uppercase tracking-widest text-gold">Secure examination</div>
        <h1 className="mt-2 font-display text-2xl sm:text-4xl">{title}</h1>
        <p className="mb-6 mt-2 text-sm text-muted-foreground sm:text-base">{text}</p>
        {children}
      </div>
    </div>
  );
}
function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-4">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ok ? "bg-soft-emerald text-emerald" : "bg-soft-rose text-destructive"}`}>
        {ok ? "✓" : "!"}
      </span>
      <span className="min-w-0 text-sm font-medium">{label}</span>
    </div>
  );
}
function Health({ online, sync, full }: { online: boolean; sync: string; full: boolean }) {
  const problem = !online || sync !== "Answers synced" || !full;
  return (
    <div role="status" className={`rounded-xl border px-3 py-2 text-xs ${problem ? "border-gold bg-soft-gold text-gold" : "border-emerald bg-soft-emerald text-emerald"}`}>
      <b>Exam Health {problem ? "⚠" : "✓"}</b>
      <div className="mt-1">
        {online ? "Online" : "Offline"} · {sync}
      </div>
    </div>
  );
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-soft-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary">{children}</span>;
}
function Legend({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center">
      <span className={`mr-2 h-3 w-3 shrink-0 rounded-full ${color}`} />
      <span className="flex-1">{label}</span>
      <b>{count}</b>
    </div>
  );
}
