import { callLovableChat } from "@/lib/ai-gateway.server";

const cache = new Map<string, string>();

export async function explainQuote(name: string, quote: string, dayKey: string) {
  const key = `${dayKey}:${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const text = await callLovableChat({
    messages: [
      {
        role: "system",
        content:
          "You write short daily motivation for Class 11-12 Science students in India. " +
          "Given a quote and its author, write 2 short paragraphs (max 70 words total): " +
          "what the quote really means, and one concrete way a student can use it in study today. " +
          "Warm, plain English. No headings, no bullet points, no emojis, no mention of AI.",
      },
      { role: "user", content: `Author: ${name}\nQuote: "${quote}"` },
    ],
  });
  const out = text.trim();
  if (out) cache.set(key, out);
  return out;
}
