import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { notifyMany, usersByRole } from "@/lib/notify.server";

type Priority = "normal" | "important" | "urgent";
type Audience = "everyone" | "students" | "teachers" | "JEE" | "NEET";

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    if (!data?.length) return [];
    const authorIds = Array.from(new Set(data.map((a) => a.author_id)));
    const { data: profs } = await context.supabase
      .from("profiles").select("id, full_name, role").in("id", authorIds);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    return data.map((a) => ({
      ...a,
      author_name: map.get(a.author_id)?.full_name ?? "Staff",
      author_role: map.get(a.author_id)?.role ?? "teacher",
    }));
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as {
      title?: string; body?: string; audience?: Audience;
      priority?: Priority; pinned?: boolean;
      image_urls?: string[]; links?: string[];
      scheduled_for?: string | null;
    } | undefined;
    if (!i?.title || !i.body) throw new Error("Missing title or body");
    const audience = (i.audience ?? "everyone") as Audience;
    const priority = (i.priority ?? "normal") as Priority;
    return {
      title: i.title.slice(0, 200),
      body: i.body.slice(0, 8000),
      audience,
      priority,
      pinned: !!i.pinned,
      image_urls: Array.isArray(i.image_urls) ? i.image_urls.slice(0, 8) : [],
      links: Array.isArray(i.links) ? i.links.slice(0, 8) : [],
      scheduled_for: i.scheduled_for || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles").select("role, full_name").eq("id", context.userId).maybeSingle();
    if (!prof || (prof.role !== "teacher" && prof.role !== "principal"))
      throw new Error("Only teachers and the principal can post announcements.");
    const { data: row, error } = await context.supabase.from("announcements").insert({
      author_id: context.userId, ...data,
    }).select("id").single();
    if (error) throw error;

    // fan out notifications
    let recipients: string[] = [];
    if (data.audience === "teachers") recipients = await usersByRole(context.supabase, "staff");
    else if (data.audience === "students") recipients = await usersByRole(context.supabase, "student");
    else if (data.audience === "JEE" || data.audience === "NEET") {
      const { data: st } = await context.supabase.from("profiles")
        .select("id").eq("role", "student").eq("exam_track", data.audience);
      recipients = (st ?? []).map((r) => r.id);
    } else {
      const { data: all } = await context.supabase.from("profiles").select("id");
      recipients = (all ?? []).map((r) => r.id).filter((id) => id !== context.userId);
    }
    await notifyMany(context.supabase, recipients, {
      category: "announcement",
      title: `${data.priority === "urgent" ? "🚨 " : data.priority === "important" ? "⭐ " : "📣 "}${data.title}`,
      message: data.body.slice(0, 160),
      link: "/dashboard/announcements",
      icon: "megaphone",
      sender_id: context.userId,
      sender_name: prof.full_name,
    });
    return { id: row.id };
  });

export const updateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as {
      id?: string; title?: string; body?: string;
      priority?: Priority; pinned?: boolean; audience?: Audience;
    } | undefined;
    if (!i?.id) throw new Error("Missing id");
    return {
      id: i.id,
      title: i.title?.slice(0, 200),
      body: i.body?.slice(0, 8000),
      priority: i.priority,
      pinned: i.pinned,
      audience: i.audience,
    };
  })
  .handler(async ({ data, context }) => {
    const patch = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.body !== undefined && { body: data.body }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.pinned !== undefined && { pinned: data.pinned }),
      ...(data.audience !== undefined && { audience: data.audience }),
    };
    const { error } = await context.supabase.from("announcements").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { id?: string } | undefined;
    if (!i?.id) throw new Error("Missing id");
    return { id: i.id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("announcements").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });