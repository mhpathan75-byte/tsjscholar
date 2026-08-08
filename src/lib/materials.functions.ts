import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { notifyMany, usersByRole } from "@/lib/notify.server";

export const listMaterials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("materials")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    if (!data || data.length === 0) return [];
    const uploaderIds = Array.from(new Set(data.map((m) => m.uploader_id)));
    const [{ data: profs }, { data: favs }] = await Promise.all([
      context.supabase.from("profiles").select("id, full_name, role").in("id", uploaderIds),
      context.supabase.from("material_favorites").select("material_id").eq("user_id", context.userId),
    ]);
    const map = new Map((profs ?? []).map((p) => [p.id, p]));
    const favSet = new Set((favs ?? []).map((f) => f.material_id));
    return data.map((m) => ({
      ...m,
      uploader_name: map.get(m.uploader_id)?.full_name ?? "Staff",
      uploader_role: map.get(m.uploader_id)?.role ?? "teacher",
      is_favorite: favSet.has(m.id),
    }));
  });

export const createMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as {
      title?: string; description?: string; subject?: string;
      file_path?: string; file_name?: string; mime_type?: string; size_bytes?: number;
      chapter?: string; topic?: string; stream?: string; tags?: string[];
      pinned?: boolean; category?: string;
    } | undefined;
    if (!i?.title || !i.file_path || !i.file_name) throw new Error("Missing fields");
    return {
      title: i.title.slice(0, 200),
      description: (i.description ?? "").slice(0, 1000),
      subject: (i.subject ?? "").slice(0, 60),
      file_path: i.file_path,
      file_name: i.file_name.slice(0, 200),
      mime_type: (i.mime_type ?? "").slice(0, 120),
      size_bytes: typeof i.size_bytes === "number" ? i.size_bytes : 0,
      chapter: (i.chapter ?? "").slice(0, 100) || null,
      topic: (i.topic ?? "").slice(0, 100) || null,
      stream: (i.stream ?? "").slice(0, 20) || null,
      tags: Array.isArray(i.tags) ? i.tags.slice(0, 8) : [],
      pinned: !!i.pinned,
      category: (i.category ?? "notes").slice(0, 30),
    };
  })
  .handler(async ({ data, context }) => {
    // Verify uploader is staff (RLS also enforces this)
    const { data: prof } = await context.supabase
      .from("profiles").select("role, full_name").eq("id", context.userId).maybeSingle();
    if (!prof || (prof.role !== "teacher" && prof.role !== "principal")) {
      throw new Error("Only teachers and the principal can upload materials.");
    }
    const { error } = await context.supabase.from("materials").insert({
      uploader_id: context.userId, ...data,
    });
    if (error) throw error;
    const students = await usersByRole(context.supabase, "student");
    await notifyMany(context.supabase, students, {
      category: "material",
      title: `📚 New material: ${data.title}`,
      message: `${data.subject || "General"}${data.chapter ? ` · ${data.chapter}` : ""}`,
      link: "/dashboard/materials",
      icon: "book",
      sender_id: context.userId,
      sender_name: prof.full_name ?? "Teacher",
    });
    return { ok: true };
  });

export const toggleFavoriteMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { material_id?: string } | undefined;
    if (!i?.material_id) throw new Error("Missing material_id");
    return { material_id: i.material_id };
  })
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase.from("material_favorites")
      .select("user_id").eq("user_id", context.userId).eq("material_id", data.material_id).maybeSingle();
    if (existing) {
      await context.supabase.from("material_favorites").delete()
        .eq("user_id", context.userId).eq("material_id", data.material_id);
      return { favorited: false };
    }
    await context.supabase.from("material_favorites").insert({
      user_id: context.userId, material_id: data.material_id,
    });
    return { favorited: true };
  });

export const recordMaterialView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { material_id?: string } | undefined;
    if (!i?.material_id) throw new Error("Missing material_id");
    return { material_id: i.material_id };
  })
  .handler(async ({ data, context }) => {
    await context.supabase.from("material_views").upsert({
      user_id: context.userId, material_id: data.material_id,
      viewed_at: new Date().toISOString(),
    }, { onConflict: "user_id,material_id" });
    return { ok: true };
  });

export const listRecentMaterials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("material_views")
      .select("material_id, viewed_at, materials(id, title, subject, chapter, file_path, mime_type)")
      .eq("user_id", context.userId)
      .order("viewed_at", { ascending: false })
      .limit(8);
    return (data ?? []).map((r) => ({ ...r.materials, viewed_at: r.viewed_at })).filter((r: any) => r?.id);
  });

export const deleteMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { id?: string; file_path?: string } | undefined;
    if (!i?.id || !i.file_path) throw new Error("Missing fields");
    return { id: i.id, file_path: i.file_path };
  })
  .handler(async ({ data, context }) => {
    await context.supabase.storage.from("materials").remove([data.file_path]);
    const { error } = await context.supabase.from("materials").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const signMaterialUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { file_path?: string } | undefined;
    if (!i?.file_path) throw new Error("Missing file_path");
    return { file_path: i.file_path };
  })
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("materials")
      .createSignedUrl(data.file_path, 60 * 60);
    if (error) throw error;
    return { url: signed.signedUrl };
  });

export const signDoubtUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { paths?: string[] } | undefined;
    if (!Array.isArray(i?.paths)) throw new Error("Missing paths");
    return { paths: i.paths.slice(0, 20) };
  })
  .handler(async ({ data, context }) => {
    if (data.paths.length === 0) return { urls: [] as string[] };
    const { data: signed, error } = await context.supabase.storage
      .from("doubts")
      .createSignedUrls(data.paths, 60 * 60);
    if (error) throw error;
    return { urls: (signed ?? []).map((s) => s.signedUrl) };
  });