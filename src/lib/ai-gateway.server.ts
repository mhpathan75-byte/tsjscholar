// Server-only AI provider abstraction.
// PRIMARY: Google Gemini API (gemini-2.5-flash) via GEMINI_API_KEY.
// FALLBACK (optional): Lovable AI Gateway via LOVABLE_API_KEY, used only for
// genuine provider failures (429 / 5xx / timeouts / model unavailable).
// Never import this from browser code.

export type ChatPart =
  | { type: "text"; text?: string }
  | { type: "image_url"; image_url?: { url: string } }
  | { type: "file"; file?: { filename?: string; file_data?: string } };

export type ChatContent = string | Array<ChatPart>;
export type ChatMessage = { role: "system" | "user" | "assistant"; content: ChatContent };

export const GEMINI_MODEL = "gemini-2.5-flash";

class ProviderError extends Error {
  retryable: boolean;
  status: number;
  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

/** data:<mime>;base64,<data>  ->  { mimeType, data } */
function parseDataUrl(url: string): { mimeType: string; data: string } | null {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(url);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

async function fetchAsInlineData(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
    const buf = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i += 1) binary += String.fromCharCode(buf[i]);
    return { mimeType, data: btoa(binary) };
  } catch {
    return null;
  }
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

async function toGeminiParts(content: ChatContent): Promise<GeminiPart[]> {
  if (typeof content === "string") return content.trim() ? [{ text: content }] : [];
  const parts: GeminiPart[] = [];
  for (const p of content) {
    if (p.type === "text") {
      if (p.text?.trim()) parts.push({ text: p.text });
    } else if (p.type === "image_url") {
      const url = p.image_url?.url;
      if (!url) continue;
      const inline = url.startsWith("data:") ? parseDataUrl(url) : await fetchAsInlineData(url);
      if (inline) parts.push({ inlineData: inline });
    } else if (p.type === "file") {
      const fd = p.file?.file_data;
      if (!fd) continue;
      const inline = fd.startsWith("data:") ? parseDataUrl(fd) : await fetchAsInlineData(fd);
      if (inline) parts.push({ inlineData: inline });
    }
  }
  return parts;
}

/** Translate OpenAI-style messages into a Gemini generateContent body. */
async function toGeminiBody(messages: ChatMessage[], temperature?: number) {
  const systemTexts: string[] = [];
  const contents: Array<{ role: "user" | "model"; parts: GeminiPart[] }> = [];

  for (const m of messages) {
    if (m.role === "system") {
      const parts = await toGeminiParts(m.content);
      for (const p of parts) if ("text" in p) systemTexts.push(p.text);
      continue;
    }
    const parts = await toGeminiParts(m.content);
    if (parts.length === 0) continue;
    const role = m.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push(...parts);
    else contents.push({ role, parts });
  }

  return {
    contents,
    ...(systemTexts.length
      ? { systemInstruction: { role: "user", parts: [{ text: systemTexts.join("\n\n") }] } }
      : {}),
    ...(temperature !== undefined ? { generationConfig: { temperature } } : {}),
  };
}

async function callGemini(messages: ChatMessage[], temperature?: number): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ProviderError("Missing GEMINI_API_KEY", 0, true);

  const body = await toGeminiBody(messages, temperature);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // 429 / 5xx / 503 model unavailable => retryable (fallback allowed)
    const retryable = res.status === 429 || res.status >= 500 || res.status === 408;
    throw new ProviderError(`Gemini error ${res.status}: ${text.slice(0, 300)}`, res.status, retryable);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const out = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!out) throw new ProviderError("Gemini returned an empty response", 502, true);
  return out;
}

async function callLovableGateway(messages: ChatMessage[], model?: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new ProviderError("Lovable AI fallback unavailable", 0, false);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({ model: model ?? "google/gemini-3.6-flash", messages }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("The tutor is a little busy right now — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
    throw new Error(`AI gateway error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

/**
 * Application-level AI call. Signature preserved for existing callers.
 * `model` is only used for the optional Lovable fallback; Gemini always uses gemini-2.5-flash.
 */
export async function callLovableChat(opts: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
}): Promise<string> {
  try {
    return await callGemini(opts.messages, opts.temperature);
  } catch (error) {
    const err = error as ProviderError;
    const retryable = err instanceof ProviderError ? err.retryable : false;
    if (!retryable) throw error instanceof Error ? error : new Error(String(error));

    if (!process.env.LOVABLE_API_KEY) {
      if (err.status === 429) throw new Error("The tutor is a little busy right now — please try again in a moment.");
      throw new Error(err.message || "AI service is temporarily unavailable. Please try again.");
    }
    console.error("Gemini failed, falling back to Lovable AI Gateway:", err.message);
    return await callLovableGateway(opts.messages, opts.model);
  }
}

/** Explicit alias for new code. */
export const callAI = callLovableChat;
