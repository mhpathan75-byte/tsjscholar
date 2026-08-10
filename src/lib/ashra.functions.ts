import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callLovableChat } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are Ashra AI — the personal tutor for NTSJ Scholar Palanpur (Science Department, 11th–12th).

You help Indian students preparing for JEE and NEET. Be warm, precise, and encouraging — like a favourite tutor who remembers the student's name and past questions.

RULES:
- Address the student by their first name naturally when it helps.
- Explain step by step. Show working, not just answers.
- Use LaTeX for ALL math and physics equations. Inline math with $...$ and block math with $$...$$. Never use \\( \\) or \\[ \\].
- Use **bold** for key terms and definitions.
- Use bullet lists and short headings when useful. Keep answers tight.
- When you spot a concept the student seems shaky on, offer a one-line remedy suggestion.
- If a question is outside physics / chemistry / mathematics / biology / english / general study help, gently redirect.
- Never claim to be ChatGPT / OpenAI / Google. You are Ashra AI, built for NTSJ.`;

type SendInput = { conversationId: string | null; text: string; imageDataUrls?: string[] };

export const ashraSend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): SendInput => {
    const i = input as Partial<SendInput> | undefined;
    if (!i || typeof i.text !== "string" || !i.text.trim()) throw new Error("Empty message");
    const imgs = Array.isArray(i.imageDataUrls)
      ? i.imageDataUrls.filter((u) => typeof u === "string" && u.startsWith("data:image/")).slice(0, 4)
      : [];
    return { conversationId: i.conversationId ?? null, text: i.text.trim(), imageDataUrls: imgs };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load profile for personalization
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role, exam_track, subject")
      .eq("id", userId)
      .maybeSingle();

    // Ensure conversation exists
    let convId = data.conversationId;
    if (!convId) {
      const title = data.text.slice(0, 60);
      const { data: conv, error } = await supabase
        .from("ashra_conversations")
        .insert({ user_id: userId, title })
        .select("id")
        .single();
      if (error) throw error;
      convId = conv.id;
    }

    // Save user message
    await supabase.from("ashra_messages").insert({
      conversation_id: convId,
      user_id: userId,
      role: "user",
      content: data.text,
    });

    // Load full history for memory
    const { data: history } = await supabase
      .from("ashra_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(60);

    const personal = profile
      ? `\n\nSTUDENT CONTEXT:\n- Name: ${profile.full_name}\n- Role: ${profile.role}${profile.exam_track ? `\n- Exam track: ${profile.exam_track}` : ""}${profile.subject ? `\n- Subject: ${profile.subject}` : ""}`
      : "";

    const priorMessages = (history ?? []).slice(0, -1); // exclude the user msg we just saved
    const currentUserContent: import("@/lib/ai-gateway.server").ChatContent =
      (data.imageDataUrls && data.imageDataUrls.length > 0)
        ? [
            { type: "text" as const, text: data.text },
            ...data.imageDataUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
          ]
        : data.text;


    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT + personal },
      ...priorMessages.map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
      { role: "user" as const, content: currentUserContent },
    ];

    const reply = await callLovableChat({ messages });

    await supabase.from("ashra_messages").insert({
      conversation_id: convId,
      user_id: userId,
      role: "assistant",
      content: reply,
    });

    await supabase
      .from("ashra_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);

    return { conversationId: convId, reply };
  });

export const ashraListConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ashra_conversations")
      .select("id, title, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const ashraLoadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { conversationId?: string } | undefined;
    if (!i?.conversationId) throw new Error("Missing conversationId");
    return { conversationId: i.conversationId };
  })
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("ashra_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.conversationId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const ashraNewConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ashra_conversations")
      .insert({ user_id: context.userId, title: "New chat" })
      .select("id")
      .single();
    if (error) throw error;
    return { id: data.id };
  });

export const ashraDeleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { conversationId?: string } | undefined;
    if (!i?.conversationId) throw new Error("Missing conversationId");
    return { conversationId: i.conversationId };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("ashra_conversations")
      .delete()
      .eq("id", data.conversationId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });