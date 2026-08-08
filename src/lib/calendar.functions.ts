import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("calendar_events").select("*")
      .order("event_date", { ascending: true }).limit(300);
    if (error) throw error;
    return data ?? [];
  });

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { title?: string; description?: string; event_type?: string; event_date?: string; end_date?: string | null } | undefined;
    if (!i?.title || !i.event_date) throw new Error("Missing fields");
    return {
      title: i.title.slice(0, 200),
      description: (i.description ?? "").slice(0, 600),
      event_type: (i.event_type ?? "general").slice(0, 30),
      event_date: i.event_date,
      end_date: i.end_date || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("calendar_events").insert({
      ...data, created_by: context.userId,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { id?: string } | undefined;
    if (!i?.id) throw new Error("Missing id");
    return { id: i.id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("calendar_events").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });