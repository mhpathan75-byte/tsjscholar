import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_calendar_events",
  title: "List calendar events",
  description: "List upcoming school calendar events (classes, tests, holidays) from today onwards.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("How many events to return (default 20)."),
    from_date: z.string().optional().describe("ISO date (YYYY-MM-DD) to start from. Defaults to today."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, from_date }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const start = from_date ?? new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, description, event_type, event_date, end_date")
      .gte("event_date", start)
      .order("event_date", { ascending: true })
      .limit(limit ?? 20);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
