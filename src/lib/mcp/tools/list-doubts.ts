import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_doubts",
  title: "List doubts",
  description: "List doubt-room questions visible to the signed-in member, optionally only unanswered ones.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("How many doubts to return (default 10)."),
    only_unanswered: z.boolean().optional().describe("When true, return only doubts that have no answer yet."),
    subject: z.string().optional().describe("Filter by subject name."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, only_unanswered, subject }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("doubts")
      .select("id, subject, question, answer, answered_at, visibility, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (only_unanswered) query = query.is("answer", null);
    if (subject) query = query.eq("subject", subject);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
