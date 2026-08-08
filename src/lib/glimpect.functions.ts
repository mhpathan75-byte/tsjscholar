import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callLovableChat } from "@/lib/ai-gateway.server";

// Glimpect AI — snap a photo of a problem/diagram/equation and get an
// instant walkthrough. Powered by Gemini vision through the Lovable AI Gateway.

type GlimpectInput = { imageDataUrl: string; prompt?: string };

export const glimpectAnalyze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown): GlimpectInput => {
    const i = input as Partial<GlimpectInput> | undefined;
    if (!i?.imageDataUrl || !i.imageDataUrl.startsWith("data:image/")) {
      throw new Error("Please upload a valid image.");
    }
    return { imageDataUrl: i.imageDataUrl, prompt: i.prompt?.slice(0, 500) };
  })
  .handler(async ({ data }) => {
    const reply = await callLovableChat({
      model: "google/gemini-3.6-flash",
      messages: [
        {
          role: "system",
          content:
            "You are Glimpect AI — the vision tutor for NTSJ Scholar Palanpur. " +
            "Look at the image (a problem, diagram, notes, or equation) and: " +
            "1) State exactly what the image shows. " +
            "2) Solve or explain it step-by-step. " +
            "3) Use LaTeX for math — inline $...$ and block $$...$$. Use **bold** for key ideas. " +
            "Keep the tone warm and precise. Never claim to be ChatGPT or Gemini — you are Glimpect AI.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: data.prompt || "Please analyze and explain this." },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
    });
    return { reply };
  });