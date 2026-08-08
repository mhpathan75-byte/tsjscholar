import { callLovableChat } from "@/lib/ai-gateway.server";

export type DraftStudent = {
  full_name: string;
  class_level: number;
  exam_track: "JEE" | "NEET";
  note?: string;
};

/** Turns pasted CSV/plain text into a clean list of students using Lovable AI. */
export async function extractStudentsFromText(text: string) {
  const raw = await callLovableChat({
    messages: [
      { role: "system", content: "You convert messy student lists into strict JSON. Never invent students that are not present." },
      { role: "user", content: `From the data below extract every student.
Return ONLY JSON: {"students":[{"full_name":"","class_level":11,"exam_track":"JEE","note":""}],"questions":["..."]}
Rules:
- class_level must be 11 or 12 (numbers only).
- exam_track must be exactly "JEE" or "NEET".
- If a row's class or track is missing/ambiguous, still include the student with your best guess AND add a short plain-English question to "questions" naming that student so a teacher can confirm. Put the reason in "note".
- "questions" is [] when everything is unambiguous.

DATA:
${text.slice(0, 20000)}` },
    ],
  });
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(cleaned) as { students?: DraftStudent[]; questions?: string[] };
  const students = (parsed.students ?? [])
    .filter((s) => s && typeof s.full_name === "string" && s.full_name.trim())
    .slice(0, 200)
    .map((s) => ({
      full_name: String(s.full_name).trim().slice(0, 80),
      class_level: Number(s.class_level) === 12 ? 12 : 11,
      exam_track: s.exam_track === "NEET" ? ("NEET" as const) : ("JEE" as const),
      note: typeof s.note === "string" ? s.note.slice(0, 160) : "",
    }));
  return { students, questions: (parsed.questions ?? []).slice(0, 20).map((q) => String(q).slice(0, 200)) };
}

const WORDS = "abcdefghjkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";

export function makeUsername(fullName: string, taken: Set<string>) {
  const base = fullName.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12) || "student";
  let candidate = base;
  let n = 1;
  while (taken.has(candidate)) { n += 1; candidate = `${base}${n}`; }
  taken.add(candidate);
  return candidate;
}

export function makePassword(fullName: string) {
  const stem = fullName.replace(/[^A-Za-z]/g, "").slice(0, 4) || "Star";
  const pretty = stem.charAt(0).toUpperCase() + stem.slice(1).toLowerCase();
  let tail = "";
  for (let i = 0; i < 3; i += 1) tail += DIGITS[Math.floor(Math.random() * DIGITS.length)];
  const sym = UPPER[Math.floor(Math.random() * UPPER.length)] + WORDS[Math.floor(Math.random() * WORDS.length)];
  return `${pretty}${tail}${sym}`;
}
