// Server-only helper for creating notifications. Uses the caller's supabase
// client (RLS-scoped) — the "Staff send notifications" policy allows any
// teacher/principal to insert notifications for any user. Never throws:
// notifications are a nice-to-have side effect, not core work.
import type { SupabaseClient } from "@supabase/supabase-js";

export type NotifyCategory =
  | "test" | "announcement" | "fees" | "material"
  | "doubt" | "live_class" | "general" | "gallery";

export interface NotifyPayload {
  user_id: string;
  category: NotifyCategory;
  title: string;
  message?: string;
  link?: string;
  icon?: string;
  sender_id?: string;
  sender_name?: string;
}

export async function pushNotifications(
  supabase: SupabaseClient,
  rows: NotifyPayload[],
): Promise<void> {
  if (!rows.length) return;
  try {
    await supabase.from("notifications").insert(rows);
  } catch {
    // swallow — never block the primary action
  }
}

/** Fan out one notification to many recipients. */
export async function notifyMany(
  supabase: SupabaseClient,
  userIds: string[],
  base: Omit<NotifyPayload, "user_id">,
): Promise<void> {
  const uniq = Array.from(new Set(userIds.filter(Boolean)));
  await pushNotifications(supabase, uniq.map((user_id) => ({ ...base, user_id })));
}

/** Fetch all user IDs matching a role. Uses caller's RLS-safe client. */
export async function usersByRole(
  supabase: SupabaseClient,
  role: "student" | "teacher" | "principal" | "staff",
): Promise<string[]> {
  const query =
    role === "staff"
      ? supabase.from("profiles").select("id").in("role", ["teacher", "principal"])
      : supabase.from("profiles").select("id").eq("role", role);
  const { data } = await query;
  return (data ?? []).map((r) => r.id as string);
}