import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_announcements",
  title: "List announcements",
  description: "List the most recent school announcements visible to the signed-in member.",
  inputSchema: { limit: z.number().int().min(1).max(50).optional().describe("How many announcements to return (default 10).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, body, audience, priority, pinned, scheduled_for, created_at")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
