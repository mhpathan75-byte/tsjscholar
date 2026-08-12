import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "ask_doubt",
  title: "Ask a doubt",
  description: "Post a new text doubt to the TSJ Scholar doubt room as the signed-in student.",
  inputSchema: {
    subject: z.string().trim().min(1).describe("Subject of the doubt, e.g. Physics."),
    question: z.string().trim().min(1).describe("The doubt/question text."),
    visibility: z.enum(["public", "private"]).optional().describe("Who can see the doubt (default public)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ subject, question, visibility }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("doubts")
      .insert({ student_id: ctx.getUserId()!, subject, question, visibility: visibility ?? "public" })
      .select("id, subject, question, visibility, created_at")
      .maybeSingle();
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});
