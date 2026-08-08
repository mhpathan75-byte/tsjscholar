import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) throw error;
    return data ?? [];
  });

export const unreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    return { count: count ?? 0 };
  });

export const markRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { id?: string } | undefined;
    if (!i?.id) throw new Error("Missing id");
    return { id: i.id };
  })
  .handler(async ({ data, context }) => {
    await context.supabase.from("notifications")
      .update({ read_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });

export const markAllRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    return { ok: true };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { id?: string } | undefined;
    if (!i?.id) throw new Error("Missing id");
    return { id: i.id };
  })
  .handler(async ({ data, context }) => {
    await context.supabase.from("notifications").delete().eq("id", data.id);
    return { ok: true };
  });