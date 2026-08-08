import { createServerFn } from "@tanstack/react-start";
import { explainQuote } from "@/lib/inspiration.server";

export const getQuoteExplanation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = input as { name?: string; quote?: string } | undefined;
    if (!i?.name || !i.quote) throw new Error("Missing quote");
    return { name: i.name.slice(0, 120), quote: i.quote.slice(0, 400) };
  })
  .handler(async ({ data }) => {
    const dayKey = new Date().toISOString().slice(0, 10);
    try {
      return { explanation: await explainQuote(data.name, data.quote, dayKey) };
    } catch {
      return { explanation: "" };
    }
  });
