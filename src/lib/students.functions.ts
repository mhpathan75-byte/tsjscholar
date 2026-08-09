import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type NewStudent = { full_name: string; class_level: number; exam_track: "JEE" | "NEET" };

function cleanStudent(value: any): NewStudent {
  const full_name = String(value?.full_name ?? "").trim().slice(0, 80);
  if (!full_name) throw new Error("Student name is required.");
  return {
    full_name,
    class_level: Number(value?.class_level) === 12 ? 12 : 11,
    exam_track: value?.exam_track === "NEET" ? "NEET" : "JEE",
  };
}

async function assertStaff(context: any) {
  const { data: profile } = await context.supabase.from("profiles").select("role, full_name").eq("id", context.userId).maybeSingle();
  if (!profile || (profile.role !== "teacher" && profile.role !== "principal")) {
    throw new Error("Only teachers and the principal can manage student accounts.");
  }
  return profile;
}

export const listStudentAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, username, class_level, exam_track, created_at")
      .eq("role", "student")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

/** Parses pasted CSV / list text into draft students, and asks back when unsure. */
export const parseStudentList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ({ text: String((v as any)?.text ?? "").slice(0, 20000) }))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    if (!data.text.trim()) throw new Error("Paste or upload a list first.");
    const { extractStudentsFromText } = await import("@/lib/students.server");
    return extractStudentsFromText(data.text);
  });

/**
 * Creates login accounts. AI-style auto-generated id + password per student.
 *
 * Deployment note: this deliberately avoids the Supabase service-role key so the
 * app can run on Vercel while the backend stays on Lovable Cloud. Authorisation
 * is enforced server-side (the caller must be a teacher/principal) and the
 * accounts are created through the ordinary publishable-key sign-up endpoint on
 * an isolated, session-less server client, so no caller session is touched.
 */
export const createStudentAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ({ students: (Array.isArray((v as any)?.students) ? (v as any).students : []).slice(0, 100).map(cleanStudent) }))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    if (!data.students.length) throw new Error("Add at least one student.");

    const { createClient } = await import("@supabase/supabase-js");
    const { makePassword, makeUsername } = await import("@/lib/students.server");

    const url = process.env["SUPABASE_URL"];
    const publishable = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !publishable) throw new Error("Backend is not configured.");

    // Session-less client: signing up here never affects the teacher's session.
    const signupClient = createClient(url, publishable, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storage: undefined },
    });

    const { data: existing } = await context.supabase.from("profiles").select("username");
    const taken = new Set((existing ?? []).map((p) => String(p.username ?? "").toLowerCase()).filter(Boolean));

    const created: Array<{ full_name: string; email: string; username: string; password: string; class_level: number; exam_track: string; status: string }> = [];
    for (const student of data.students) {
      const username = makeUsername(student.full_name, taken);
      const password = makePassword(student.full_name);
      const email = `${username}@ntsj.app`;
      const { error } = await signupClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: student.full_name,
            role: "student",
            username,
            exam_track: student.exam_track,
            class_level: String(student.class_level),
          },
        },
      });
      created.push({
        full_name: student.full_name, email, username, password,
        class_level: student.class_level, exam_track: student.exam_track,
        status: error ? `Failed: ${error.message}` : "Created",
      });
    }
    return { created };
  });

