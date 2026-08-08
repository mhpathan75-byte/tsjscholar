import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildAttempt, generateExamQuestions, gradeAttempt } from "@/lib/exams.server";

export const listTests = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("tests").select("*, profiles!tests_created_by_fkey(full_name)").order("created_at", { ascending: false });
  if (error) throw error;
  const { data: attempts } = await context.supabase.from("test_attempts").select("id,test_id,status,score,max_score,percentage,submitted_at").eq("student_id", context.userId);
  const byTest = new Map((attempts ?? []).map((attempt) => [attempt.test_id, attempt]));
  return (data ?? []).map((test) => ({ ...test, my_attempt: byTest.get(test.id) ?? null }));
});

export const createTest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((value: unknown) => value as Record<string, unknown>).handler(async ({ data, context }) => {
  const { data: profile } = await context.supabase.from("profiles").select("role").eq("id", context.userId).single();
  if (!profile || !["teacher","principal"].includes(profile.role)) throw new Error("Only staff can create tests.");
  const payload = data as any;
  const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
  if (!payload.title || !subjects.length) throw new Error("Add a title and at least one subject.");
  const stream = subjects.includes("Biology") ? "PCB" : subjects.includes("Mathematics") ? "PCM" : "General";
  const { data: test, error } = await context.supabase.from("tests").insert({ ...payload, subjects, stream, created_by: context.userId, status: "generating", source_strategy: "ai" }).select("*").single();
  if (error) throw error;
  const { data: version, error: vErr } = await context.supabase.from("test_versions").insert({ test_id: test.id, version_number: 1, created_by: context.userId }).select("id").single();
  if (vErr) throw vErr;
  try {
    const generated = await generateExamQuestions(test as any);
    const perQuestion = Number(test.total_marks) / generated.length;
    const rows = generated.map((q: any, index) => ({ version_id: version.id, source_kind: "ai", subject: q.subject ?? subjects[0], chapter: q.chapter ?? "Mixed", difficulty: ["easy","medium","hard"].includes(q.difficulty) ? q.difficulty : "medium", question_type: q.question_type ?? "MCQ", stem: q.stem ?? "", passage: q.passage || null, options: q.options ?? [], correct_answer: q.correct_answer ?? null, solution: q.solution ?? "", diagrams: typeof q.diagram_svg === "string" && q.diagram_svg.includes("<svg") ? [{ type: "svg", content: q.diagram_svg }] : [], marks: perQuestion, negative_marks: Number(test.negative_marks), position: index + 1, created_by: context.userId }));
    const { error: qErr } = await context.supabase.from("questions").insert(rows); if (qErr) throw qErr;
    await context.supabase.from("tests").update({ active_version_id: version.id, status: "review" }).eq("id", test.id);
    return { id: test.id };
  } catch (generationError) {
    await context.supabase.from("tests").update({ status: "draft" }).eq("id", test.id);
    throw generationError;
  }
});

export const getTest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => ({ id: String((v as any)?.id ?? "") })).handler(async ({ data, context }) => {
  const { data: test, error } = await context.supabase.from("tests").select("*, profiles!tests_created_by_fkey(full_name)").eq("id", data.id).single(); if (error) throw error;
  const { data: questions } = test.active_version_id ? await context.supabase.from("questions").select("*").eq("version_id", test.active_version_id).order("position") : { data: [] };
  const { data: attempt } = await context.supabase.from("test_attempts").select("id,status,score,max_score,percentage,submitted_at").eq("test_id", data.id).eq("student_id", context.userId).maybeSingle();
  return { test, questions: questions ?? [], attempt };
});

export const publishTest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => ({ id: String((v as any)?.id ?? "") })).handler(async ({ data, context }) => {
  const { data: test } = await context.supabase.from("tests").select("active_version_id").eq("id", data.id).single(); if (!test?.active_version_id) throw new Error("Generate questions first.");
  await context.supabase.from("test_versions").update({ locked_at: new Date().toISOString() }).eq("id", test.active_version_id);
  const { error } = await context.supabase.from("tests").update({ status: "published" }).eq("id", data.id); if (error) throw error; return { ok: true };
});

export const startTestAttempt = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => ({ testId: String((v as any)?.testId ?? "") })).handler(async ({ data, context }) => buildAttempt(context.supabase, data.testId, context.userId));

export const loadAttempt = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => ({ attemptId: String((v as any)?.attemptId ?? "") })).handler(async ({ data, context }) => {
  const { data: attempt, error } = await context.supabase.from("test_attempts").select("*, tests(*)").eq("id", data.attemptId).eq("student_id", context.userId).single(); if (error) throw error;
  const { data: questions } = await context.supabase.from("questions").select("id,subject,chapter,difficulty,question_type,stem,passage,options,diagrams,marks,negative_marks").eq("version_id", attempt.version_id);
  const map = new Map((questions ?? []).map((q) => [q.id, q]));
  const { data: responses } = await context.supabase.from("attempt_responses").select("question_id,answer,state").eq("attempt_id", data.attemptId);
  return { attempt, questions: (attempt.question_order ?? []).map((id: string) => map.get(id)).filter(Boolean), responses: responses ?? [] };
});

export const getAttemptResult = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => ({ attemptId: String((v as any)?.attemptId ?? "") })).handler(async ({ data, context }) => {
  const { data: attempt, error } = await context.supabase.from("test_attempts").select("id,status,score,max_score,percentage,rank,correct_count,incorrect_count,unattempted_count,submitted_at,tests(title,exam_type,class_level,subjects,total_questions,total_marks)").eq("id", data.attemptId).eq("student_id", context.userId).single();
  if (error) throw error;
  if (!attempt.submitted_at) throw new Error("This examination has not been submitted yet.");

  const { data: full } = await context.supabase.from("test_attempts").select("version_id, question_order").eq("id", data.attemptId).single();
  const { data: questions } = await context.supabase
    .from("questions")
    .select("id,subject,chapter,difficulty,question_type,stem,passage,options,correct_answer,solution,diagrams,marks,negative_marks")
    .eq("version_id", full?.version_id ?? "");
  const { data: responses } = await context.supabase
    .from("attempt_responses").select("question_id,answer,state,is_correct,marks_awarded").eq("attempt_id", data.attemptId);

  const byResponse = new Map((responses ?? []).map((r) => [r.question_id, r]));
  const byQuestion = new Map((questions ?? []).map((q) => [q.id, q]));
  const order: string[] = Array.isArray(full?.question_order) && full.question_order.length ? full.question_order as string[] : (questions ?? []).map((q) => q.id);

  const review = order.map((id, i) => {
    const q = byQuestion.get(id);
    if (!q) return null;
    const response = byResponse.get(id) ?? null;
    const given = response?.answer ?? null;
    const attempted = given !== null && given !== undefined && String(given) !== "" && !(Array.isArray(given) && given.length === 0);
    return {
      number: i + 1,
      id: q.id, subject: q.subject, chapter: q.chapter, difficulty: q.difficulty,
      question_type: q.question_type, stem: q.stem, passage: q.passage, options: q.options,
      diagrams: q.diagrams, solution: q.solution, marks: Number(q.marks ?? 0), negative_marks: Number(q.negative_marks ?? 0),
      correct_answer: q.correct_answer,
      given_answer: given,
      attempted,
      is_correct: response?.is_correct ?? null,
      marks_awarded: Number(response?.marks_awarded ?? 0),
    };
  }).filter(Boolean) as Array<Record<string, any>>;

  // Subject-wise roll-up straight from the graded review.
  const subjects = new Map<string, { subject: string; correct: number; incorrect: number; unattempted: number; score: number; max: number }>();
  for (const r of review) {
    const row = subjects.get(r.subject) ?? { subject: r.subject, correct: 0, incorrect: 0, unattempted: 0, score: 0, max: 0 };
    if (!r.attempted) row.unattempted += 1; else if (r.is_correct) row.correct += 1; else row.incorrect += 1;
    row.score += r.marks_awarded; row.max += r.marks;
    subjects.set(r.subject, row);
  }
  return { ...attempt, review, subjects: [...subjects.values()] };
});

export const saveAnswer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => v as any).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from("attempt_responses").upsert({ attempt_id: data.attemptId, question_id: data.questionId, answer: data.answer, state: data.state, time_seconds: data.timeSeconds ?? 0, saved_at: new Date().toISOString() }, { onConflict: "attempt_id,question_id" }); if (error) throw error;
  await context.supabase.from("test_attempts").update({ status: "in_progress", started_at: data.startedAt ?? new Date().toISOString(), last_synced_at: new Date().toISOString() }).eq("id", data.attemptId).eq("student_id", context.userId); return { ok: true };
});

export const logViolation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => v as any).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from("test_violations").insert({ attempt_id: data.attemptId, student_id: context.userId, violation_type: data.type, question_id: data.questionId || null, reason: data.reason }); if (error) throw error;
  const { data: attempt } = await context.supabase.from("test_attempts").select("violation_count").eq("id", data.attemptId).single(); const count = Number(attempt?.violation_count ?? 0) + 1;
  await context.supabase.from("test_attempts").update({ violation_count: count }).eq("id", data.attemptId); return { count };
});

export const submitAttempt = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => ({ attemptId: String((v as any)?.attemptId ?? ""), reason: String((v as any)?.reason ?? "student_submit") })).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from("test_attempts").update({ status: data.reason === "student_submit" ? "submitted" : "auto_submitted", submitted_at: new Date().toISOString(), submit_reason: data.reason }).eq("id", data.attemptId).eq("student_id", context.userId); if (error) throw error;
  const result = await gradeAttempt(context.supabase, data.attemptId);
  return { ok: true, ...result };
});

/** Performance report. Students see only their own attempts; staff see everyone. */
export const performanceReport = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: profile } = await context.supabase.from("profiles").select("role, full_name").eq("id", context.userId).single();
  const staff = profile?.role === "teacher" || profile?.role === "principal";
  let query = context.supabase
    .from("test_attempts")
    .select("id, score, max_score, percentage, rank, correct_count, incorrect_count, unattempted_count, submitted_at, status, student_id, tests(id, title, exam_type, class_level, subjects, total_marks), profiles!test_attempts_student_id_fkey(full_name, class_level)")
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });
  if (!staff) query = query.eq("student_id", context.userId);
  const { data, error } = await query;
  if (error) throw error;
  return { staff, attempts: data ?? [] };
});