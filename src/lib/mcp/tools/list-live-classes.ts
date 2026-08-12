import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_live_classes",
  title: "List live classes",
  description: "List scheduled, live and recorded online classes visible to the signed-in member.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("How many classes to return (default 10)."),
    status: z.enum(["scheduled", "live", "ended"]).optional().describe("Filter by class status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("live_classes")
      .select("id, title, subject, status, class_level, scheduled_for, started_at, ended_at")
      .order("scheduled_for", { ascending: false })
      .limit(limit ?? 10);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
