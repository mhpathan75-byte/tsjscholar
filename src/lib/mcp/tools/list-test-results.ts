import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_test_results",
  title: "List test results",
  description: "List test attempts and scores the signed-in member is allowed to see (own results for students).",
  inputSchema: { limit: z.number().int().min(1).max(50).optional().describe("How many attempts to return (default 10).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("test_attempts")
      .select(
        "id, test_id, status, score, max_score, percentage, rank, correct_count, incorrect_count, unattempted_count, submitted_at, tests(title, exam_type, class_level)",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
