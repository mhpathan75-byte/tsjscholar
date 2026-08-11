import { createServerFn } from "@tanstack/react-start";

/**
 * Moderator console endpoints. The teacher's phone is busy being the camera,
 * so scheduling a class produces a secret link (`/live-control/<token>`) that
 * can be opened on any other device — laptop, tablet, a colleague's phone —
 * to read chat + doubts and control the room. The token IS the credential, so
 * every handler verifies it before touching data.
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function classByToken(token: string) {
  const db = await admin();
  const { data, error } = await db
    .from("live_classes")
    .select("*")
    .eq("moderator_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("This control link is not valid.");
  return { db, cls: data as any };
}

const tokenOnly = (input: unknown) => {
  const i = input as { token?: string } | undefined;
  if (!i?.token) throw new Error("Missing token");
  return { token: i.token };
};

export const moderatorState = createServerFn({ method: "POST" })
  .inputValidator(tokenOnly)
  .handler(async ({ data }) => {
    const { db, cls } = await classByToken(data.token);
    const { data: msgs } = await db
      .from("live_messages")
      .select("*")
      .eq("class_id", cls.id)
      .order("created_at", { ascending: true })
      .limit(500);

    const paths = (msgs ?? []).map((m: any) => m.image_path).filter(Boolean) as string[];
    let signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await db.storage.from("live-doubts").createSignedUrls(paths, 60 * 60 * 4);
      signed = new Map(paths.map((p, i) => [p, (urls ?? [])[i]?.signedUrl ?? ""]));
    }

    return {
      cls: {
        id: cls.id,
        title: cls.title,
        subject: cls.subject,
        status: cls.status,
        broadcast_active: cls.broadcast_active,
        chat_enabled: cls.chat_enabled,
        reactions_enabled: cls.reactions_enabled,
        doubts_enabled: cls.doubts_enabled,
        started_at: cls.started_at,
        teacher_name: cls.teacher_name,
      },
      messages: (msgs ?? []).map((m: any) => ({
        ...m,
        image_url: m.image_path ? (signed.get(m.image_path) ?? null) : null,
      })),
    };
  });

export const moderatorToggle = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = input as { token?: string; field?: string; value?: boolean };
    if (!i?.token) throw new Error("Missing token");
    if (!i.field || !["chat_enabled", "reactions_enabled", "doubts_enabled"].includes(i.field))
      throw new Error("Invalid setting");
    return { token: i.token, field: i.field, value: !!i.value };
  })
  .handler(async ({ data }) => {
    const { db, cls } = await classByToken(data.token);
    const { error } = await db.from("live_classes").update({ [data.field]: data.value }).eq("id", cls.id);
    if (error) throw error;
    return { ok: true };
  });

export const moderatorMessageAction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = input as { token?: string; messageId?: string; action?: string };
    if (!i?.token || !i.messageId) throw new Error("Missing data");
    if (!i.action || !["hide", "show", "delete", "resolve"].includes(i.action)) throw new Error("Invalid action");
    return { token: i.token, messageId: i.messageId, action: i.action };
  })
  .handler(async ({ data }) => {
    const { db, cls } = await classByToken(data.token);
    if (data.action === "delete") {
      await db.from("live_messages").delete().eq("id", data.messageId).eq("class_id", cls.id);
    } else {
      const patch =
        data.action === "resolve" ? { resolved: true } : { hidden: data.action === "hide" };
      await db.from("live_messages").update(patch).eq("id", data.messageId).eq("class_id", cls.id);
    }
    return { ok: true };
  });

export const moderatorReply = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = input as { token?: string; body?: string };
    if (!i?.token) throw new Error("Missing token");
    const body = (i.body ?? "").trim();
    if (!body) throw new Error("Message is empty");
    if (body.length > 1000) throw new Error("Message too long");
    return { token: i.token, body };
  })
  .handler(async ({ data }) => {
    const { db, cls } = await classByToken(data.token);
    const { error } = await db.from("live_messages").insert({
      class_id: cls.id,
      user_id: cls.teacher_id,
      author_name: cls.teacher_name || "Teacher",
      author_role: "teacher",
      kind: "chat",
      body: data.body,
    });
    if (error) throw error;
    return { ok: true };
  });
