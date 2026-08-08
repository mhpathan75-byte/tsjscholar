import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { notifyMany, usersByRole } from "@/lib/notify.server";

async function signPaths(supabase: any, paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data } = await supabase.storage.from("gallery").createSignedUrls(paths, 60 * 60 * 6);
  return (data ?? []).map((s: any) => s.signedUrl as string);
}

export const listAlbums = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("gallery_albums").select("*")
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    if (!data?.length) return [];
    // sign covers if they are storage paths (no http)
    const covers = data.map((a) => a.cover_url).filter(Boolean) as string[];
    const paths = covers.filter((c) => !c.startsWith("http"));
    const signed = await signPaths(context.supabase, paths);
    const map = new Map(paths.map((p, i) => [p, signed[i]]));
    // count images per album
    const ids = data.map((a) => a.id);
    const { data: imgs } = await context.supabase
      .from("gallery_images").select("album_id").in("album_id", ids);
    const counts = new Map<string, number>();
    (imgs ?? []).forEach((r) => counts.set(r.album_id, (counts.get(r.album_id) ?? 0) + 1));
    return data.map((a) => ({
      ...a,
      cover_url: a.cover_url && !a.cover_url.startsWith("http") ? (map.get(a.cover_url) ?? null) : a.cover_url,
      image_count: counts.get(a.id) ?? 0,
    }));
  });

export const getAlbum = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { id?: string } | undefined;
    if (!i?.id) throw new Error("Missing id");
    return { id: i.id };
  })
  .handler(async ({ data, context }) => {
    const { data: album, error } = await context.supabase
      .from("gallery_albums").select("*").eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!album) throw new Error("Album not found");
    const { data: imgs } = await context.supabase
      .from("gallery_images").select("*").eq("album_id", data.id).order("created_at");
    const paths = (imgs ?? []).map((r) => r.storage_path);
    const signed = await signPaths(context.supabase, paths);
    return {
      album,
      images: (imgs ?? []).map((r, i) => ({ ...r, url: signed[i] })),
    };
  });

export const createAlbum = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { title?: string; description?: string; event_date?: string | null } | undefined;
    if (!i?.title) throw new Error("Missing title");
    return {
      title: i.title.slice(0, 200),
      description: (i.description ?? "").slice(0, 800),
      event_date: i.event_date || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("gallery_albums")
      .insert({ ...data, created_by: context.userId }).select("id").single();
    if (error) throw error;
    return { id: row.id };
  });

export const addGalleryImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { album_id?: string; storage_path?: string; caption?: string } | undefined;
    if (!i?.album_id || !i.storage_path) throw new Error("Missing fields");
    return { album_id: i.album_id, storage_path: i.storage_path, caption: (i.caption ?? "").slice(0, 200) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("gallery_images").insert({
      ...data, uploaded_by: context.userId,
    });
    if (error) throw error;
    // set as cover if album has no cover
    const { data: a } = await context.supabase.from("gallery_albums")
      .select("cover_url,title").eq("id", data.album_id).maybeSingle();
    if (a && !a.cover_url) {
      await context.supabase.from("gallery_albums").update({ cover_url: data.storage_path }).eq("id", data.album_id);
    }
    return { ok: true };
  });

export const deleteAlbum = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { id?: string } | undefined;
    if (!i?.id) throw new Error("Missing id");
    return { id: i.id };
  })
  .handler(async ({ data, context }) => {
    const { data: imgs } = await context.supabase
      .from("gallery_images").select("storage_path").eq("album_id", data.id);
    if (imgs?.length) {
      await context.supabase.storage.from("gallery").remove(imgs.map((i) => i.storage_path));
    }
    await context.supabase.from("gallery_albums").delete().eq("id", data.id);
    return { ok: true };
  });

export const publishAlbumNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { album_id?: string; title?: string } | undefined;
    if (!i?.album_id || !i.title) throw new Error("Missing fields");
    return { album_id: i.album_id, title: i.title };
  })
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
    const recipients = [
      ...(await usersByRole(context.supabase, "student")),
      ...(await usersByRole(context.supabase, "staff")),
    ];
    await notifyMany(context.supabase, recipients.filter((id) => id !== context.userId), {
      category: "gallery",
      title: `📸 New album: ${data.title}`,
      message: "Fresh photos from the school.",
      link: `/dashboard/gallery`,
      icon: "gallery",
      sender_id: context.userId,
      sender_name: prof?.full_name ?? "Staff",
    });
    return { ok: true };
  });