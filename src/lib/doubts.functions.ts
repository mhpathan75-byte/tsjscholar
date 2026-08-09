import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { notifyMany, usersByRole, pushNotifications } from "@/lib/notify.server";

type Visibility = "all_teachers" | "specific_teacher" | "all_students" | "everyone";

export const listDoubts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS scopes visibility per role. Also enrich with student name.
    const { data, error } = await context.supabase
      .from("doubts")
      .select("id, student_id, subject, question, answer, answer_files, answered_by, answered_at, created_at, visibility, specific_teacher_id, image_urls")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    if (!data || data.length === 0) return [];
    const userIds = Array.from(new Set([
      ...data.map((d) => d.student_id),
      ...data.map((d) => d.answered_by).filter(Boolean) as string[],
    ]));
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", userIds);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    return data.map((d) => ({
      ...d,
      student_name: map.get(d.student_id)?.full_name ?? "Student",
      answered_by_name: d.answered_by ? map.get(d.answered_by)?.full_name ?? null : null,
    }));
  });

export const listTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, subject, role")
      .in("role", ["teacher", "principal"])
      .order("full_name");
    if (error) throw error;
    return data ?? [];
  });

export const createDoubt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as {
      subject?: string; question?: string;
      visibility?: Visibility; specific_teacher_id?: string | null;
      image_urls?: string[];
    } | undefined;
    if (!i?.subject || !i.question) throw new Error("Missing fields");
    const vis = (i.visibility ?? "all_teachers") as Visibility;
    if (!["all_teachers","specific_teacher","all_students","everyone"].includes(vis))
      throw new Error("Invalid visibility");
    return {
      subject: i.subject.slice(0, 60),
      question: i.question.slice(0, 2000),
      visibility: vis,
      specific_teacher_id: vis === "specific_teacher" ? (i.specific_teacher_id ?? null) : null,
      image_urls: Array.isArray(i.image_urls) ? i.image_urls.slice(0, 6) : [],
    };
  })
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
    const { data: row, error } = await context.supabase.from("doubts").insert({
      student_id: context.userId,
      subject: data.subject,
      question: data.question,
      visibility: data.visibility,
      specific_teacher_id: data.specific_teacher_id,
      image_urls: data.image_urls,
    }).select("id").single();
    if (error) throw error;

    // notify the right audience
    let recipients: string[] = [];
    if (data.visibility === "specific_teacher" && data.specific_teacher_id) {
      recipients = [data.specific_teacher_id];
    } else if (data.visibility === "all_teachers") {
      recipients = await usersByRole(context.supabase, "staff");
    } else {
      const staff = await usersByRole(context.supabase, "staff");
      const students = data.visibility === "everyone" || data.visibility === "all_students"
        ? await usersByRole(context.supabase, "student") : [];
      recipients = [...staff, ...students].filter((id) => id !== context.userId);
    }
    await notifyMany(context.supabase, recipients, {
      category: "doubt",
      title: `❓ New ${data.subject} doubt`,
      message: data.question.slice(0, 140),
      link: "/dashboard/doubts",
      icon: "help",
      sender_id: context.userId,
      sender_name: prof?.full_name ?? "Student",
    });
    return { ok: true, id: row.id };
  });

export const answerDoubt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { id?: string; answer?: string; answer_files?: Array<{ path?: string; name?: string; type?: string }> } | undefined;
    const answer = (i?.answer ?? "").slice(0, 4000);
    const files = (Array.isArray(i?.answer_files) ? i!.answer_files! : [])
      .slice(0, 6)
      .filter((f) => typeof f?.path === "string" && f.path.length > 0)
      .map((f) => ({
        path: String(f.path).slice(0, 400),
        name: String(f.name ?? "attachment").slice(0, 160),
        type: String(f.type ?? "").slice(0, 100),
      }));
    if (!i?.id) throw new Error("Missing fields");
    if (!answer.trim() && files.length === 0) throw new Error("Write an answer or attach a file.");
    return { id: i.id, answer, answer_files: files };
  })
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
    const { data: doubt, error } = await context.supabase
      .from("doubts")
      .update({
        answer: data.answer,
        answer_files: data.answer_files,
        answered_by: context.userId,
        answered_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("student_id, subject")
      .maybeSingle();
    if (error) throw error;
    if (doubt?.student_id) {
      await pushNotifications(context.supabase, [{
        user_id: doubt.student_id,
        category: "doubt",
        title: `✅ Your ${doubt.subject} doubt was answered`,
        message: (data.answer.trim() || `${data.answer_files.length} attachment(s)`).slice(0, 140),
        link: "/dashboard/doubts",
        icon: "check",
        sender_id: context.userId,
        sender_name: prof?.full_name ?? "Teacher",
      }]);
    }
    return { ok: true };
  });