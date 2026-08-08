// Server-only helper for calling the Lovable AI Gateway (OpenAI-compatible).
// Do not import from browser code — this uses LOVABLE_API_KEY.

export type ChatContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
export type ChatMessage = { role: "system" | "user" | "assistant"; content: ChatContent };

export async function callLovableChat(opts: {
  model?: string;
  messages: ChatMessage[];
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3.6-flash",
      messages: opts.messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Ashra is a little busy right now — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted for this workspace. Please top up in Lovable.");
    throw new Error(`AI gateway error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}