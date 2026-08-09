import type { SupabaseClient } from "@supabase/supabase-js";
import { callLovableChat } from "@/lib/ai-gateway.server";

type TestSpec = {
  title: string; exam_type: string; class_level: number; subjects: string[];
  chapters: Record<string, string[]>; total_questions: number; total_marks: number;
  positive_marks: number; negative_marks: number; difficulty: Record<string, number>;
  question_types: string[]; language: string;
};

export async function generateExamQuestions(spec: TestSpec) {
  const minimumDiagrams = Math.max(1, Math.ceil(spec.total_questions * 0.3));
  const prompt = `Create a professional ${spec.exam_type} Class ${spec.class_level} examination in ${spec.language}.
Return ONLY valid JSON as {"questions":[...]}. Generate exactly ${spec.total_questions} questions.
Subjects: ${spec.subjects.join(", ")}. Chapters: ${JSON.stringify(spec.chapters)}.
Distribute the questions evenly across the selected subjects and keep each question's subject exact.
Difficulty distribution: ${JSON.stringify(spec.difficulty)}. Allowed types: ${spec.question_types.join(", ")}.
Each question: {subject,chapter,difficulty,question_type,stem,passage,options,correct_answer,solution,diagram_svg}.
For options use [{"id":"A","text":"..."}]. correct_answer is an array of option ids for choice questions or a string for numerical answers.
Write every equation, symbol, fraction, matrix, chemical expression, vector and unit using valid KaTeX-compatible delimiters: inline $...$ and display $$...$$. Never use raw Unicode approximations when proper notation is possible. Questions must be original, non-repetitive, solvable, curriculum-aligned, and resemble the selected national exam. Never use external or copyrighted images.

DIAGRAMS — this is mandatory and heavily weighted:
- Exactly ${minimumDiagrams} or more questions MUST carry a real, self-drawn diagram in "diagram_svg". Prefer chapters that naturally support figures (projectile/vectors/circular motion, ray optics, circuits, EMI, graphs, free-body diagrams, organic structures, orbital shapes, titration/lab setups, electrochemical cells, cell structure, mitosis/meiosis, pedigree charts, food chains, coordinate geometry, circles, triangles, trigonometric circle, 3D geometry).
- Include hard, multi-element diagrams too (composite circuits, ray diagrams through multiple lenses, resolved-vector figures, pedigree crosses, labelled apparatus) — not only trivial sketches.
- SVG rules: output a complete standalone <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%"> element. Black strokes 1.5-2px on a white background, no gradients, no colour fills, no shadows, no 3D effects.
- Use <marker> arrowheads for vectors, axes, rays and forces; dashed lines for projections and auxiliary lines; arc paths for marked angles.
- Label everything with <text> (font-size 14-16, font-family serif): variables in italic (u, v, t, θ, g), units upright, subscripts as smaller offset text. Labels must never overlap lines or each other, and every element must sit inside the viewBox with generous margins.
- The diagram must be scientifically accurate, exam-grade, minimal and print friendly (NCERT/JEE style). If a question genuinely needs no figure, set diagram_svg to null — never emit an empty or placeholder svg.`;
  const raw = await callLovableChat({ messages: [{ role: "system", content: "You are a senior Indian examination paper setter, an expert technical-diagram illustrator producing exam-quality black-and-white SVG figures, and a strict JSON generator." }, { role: "user", content: prompt }] });
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(cleaned) as { questions?: Array<Record<string, unknown>> };
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error("Question generation returned no usable questions.");
  const questions = parsed.questions.slice(0, spec.total_questions);
  const diagramCount = questions.filter((question) => typeof question.diagram_svg === "string" && question.diagram_svg.includes("<svg")).length;
  if (diagramCount < minimumDiagrams) throw new Error(`Question generation produced only ${diagramCount} diagrams; at least ${minimumDiagrams} are required. Please generate the paper again.`);
  return questions;
}

function hashSeed(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shuffled<T>(items: T[], seedText: string) {
  const out = [...items];
  let seed = hashSeed(seedText);
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function buildAttempt(supabase: SupabaseClient, testId: string, userId: string) {
  const { data: test, error } = await supabase.from("tests").select("*, test_versions!tests_active_version_fkey(id)").eq("id", testId).single();
  if (error || !test.active_version_id) throw error ?? new Error("This test is not ready.");
  const { data: existing } = await supabase.from("test_attempts").select("*").eq("test_id", testId).eq("student_id", userId).maybeSingle();
  if (existing) return existing;
  const { data: questions, error: qErr } = await supabase.from("questions").select("id, options").eq("version_id", test.active_version_id).order("position");
  if (qErr || !questions?.length) throw qErr ?? new Error("No questions found.");
  const { data: subjectRows } = await supabase.from("questions").select("id, subject, position").eq("version_id", test.active_version_id).order("position");
  const subjectOrder = Array.isArray(test.subjects) ? test.subjects : [];
  const grouped = new Map<string, string[]>();
  for (const question of subjectRows ?? []) grouped.set(question.subject, [...(grouped.get(question.subject) ?? []), question.id]);
  const order = subjectOrder.flatMap((subject: string) => shuffled(grouped.get(subject) ?? [], `${testId}:${userId}:${subject}`));
  for (const [subject, ids] of grouped) if (!subjectOrder.includes(subject)) order.push(...shuffled(ids, `${testId}:${userId}:${subject}`));
  const optionOrders = Object.fromEntries(questions.map((q) => {
    const opts = Array.isArray(q.options) ? q.options as Array<{ id?: string }> : [];
    // Options keep their authored order so every student sees A, B, C, D in line.
    return [q.id, opts.map((o) => o.id).filter((id): id is string => typeof id === "string")];
  }));
  const { data: attempt, error: aErr } = await supabase.from("test_attempts").insert({ test_id: testId, version_id: test.active_version_id, student_id: userId, question_order: order, option_orders: optionOrders, max_score: test.total_marks }).select("*").single();
  if (aErr) throw aErr;
  return attempt;
}
function normalise(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map((v) => String(v).trim().toLowerCase()).sort().join("|");
  return String(value).trim().toLowerCase();
}

/** Grades every response of an attempt and writes the score + rank on the attempt. */
export async function gradeAttempt(supabase: SupabaseClient, attemptId: string) {
  const { data: attempt } = await supabase.from("test_attempts").select("id, test_id, version_id, max_score").eq("id", attemptId).single();
  if (!attempt) throw new Error("Attempt not found.");
  const { data: questions } = await supabase.from("questions").select("id, correct_answer, marks, negative_marks").eq("version_id", attempt.version_id);
  const { data: responses } = await supabase.from("attempt_responses").select("id, question_id, answer").eq("attempt_id", attemptId);

  const byId = new Map((questions ?? []).map((q) => [q.id, q]));
  let score = 0, correct = 0, incorrect = 0;
  for (const r of responses ?? []) {
    const q = byId.get(r.question_id);
    if (!q) continue;
    const given = normalise(r.answer);
    const expected = normalise(q.correct_answer);
    const answered = given !== "";
    const isCorrect = answered && given === expected;
    const marks = isCorrect ? Number(q.marks ?? 0) : answered ? -Number(q.negative_marks ?? 0) : 0;
    if (answered) { if (isCorrect) correct += 1; else incorrect += 1; }
    score += marks;
    await supabase.from("attempt_responses").update({ is_correct: answered ? isCorrect : null, marks_awarded: marks }).eq("id", r.id);
  }
  const total = (questions ?? []).length;
  const maxScore = Number(attempt.max_score ?? 0) || (questions ?? []).reduce((a, q) => a + Number(q.marks ?? 0), 0);
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
  await supabase.from("test_attempts").update({
    score, max_score: maxScore, percentage, correct_count: correct, incorrect_count: incorrect,
    unattempted_count: Math.max(0, total - correct - incorrect),
  }).eq("id", attemptId);

  // Re-rank everyone on this test.
  const { data: siblings } = await supabase.from("test_attempts").select("id, score").eq("test_id", attempt.test_id).not("submitted_at", "is", null).order("score", { ascending: false });
  let rank = 0, lastScore: number | null = null, seen = 0;
  for (const s of siblings ?? []) {
    seen += 1;
    if (lastScore === null || Number(s.score) < lastScore) { rank = seen; lastScore = Number(s.score); }
    await supabase.from("test_attempts").update({ rank }).eq("id", s.id);
  }
  return { score, maxScore, percentage, correct, incorrect };
}
