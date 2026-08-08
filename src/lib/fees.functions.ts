import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pushNotifications } from "@/lib/notify.server";

export const listFeesAll = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("profiles").select("role").eq("id", context.userId).maybeSingle();
    if (!prof || (prof.role !== "teacher" && prof.role !== "principal"))
      throw new Error("Forbidden");
    const { data: students } = await context.supabase
      .from("profiles").select("id, full_name, exam_track").eq("role", "student").order("full_name");
    const ids = (students ?? []).map((s) => s.id);
    const [{ data: fees }, { data: payments }] = await Promise.all([
      context.supabase.from("fees").select("*").in("student_id", ids),
      context.supabase.from("fee_payments").select("student_id, amount").in("student_id", ids),
    ]);
    const feeMap = new Map((fees ?? []).map((f) => [f.student_id, f]));
    const paidMap = new Map<string, number>();
    (payments ?? []).forEach((p) => paidMap.set(p.student_id, (paidMap.get(p.student_id) ?? 0) + Number(p.amount)));
    return (students ?? []).map((s) => {
      const f = feeMap.get(s.id);
      const total = Number(f?.total_amount ?? 0);
      const paid = paidMap.get(s.id) ?? 0;
      return {
        student_id: s.id, name: s.full_name, track: s.exam_track,
        total, paid, remaining: Math.max(0, total - paid),
        due_date: f?.due_date ?? null, remarks: f?.remarks ?? null,
      };
    });
  });

export const getMyFees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: fee }, { data: payments }] = await Promise.all([
      context.supabase.from("fees").select("*").eq("student_id", context.userId).maybeSingle(),
      context.supabase.from("fee_payments").select("*").eq("student_id", context.userId).order("paid_on", { ascending: false }),
    ]);
    const total = Number(fee?.total_amount ?? 0);
    const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
    return {
      total, paid, remaining: Math.max(0, total - paid),
      due_date: fee?.due_date ?? null, remarks: fee?.remarks ?? null,
      payments: payments ?? [],
    };
  });

export const upsertFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { student_id?: string; total_amount?: number; due_date?: string | null; remarks?: string } | undefined;
    if (!i?.student_id) throw new Error("Missing student");
    return {
      student_id: i.student_id,
      total_amount: Number(i.total_amount ?? 0),
      due_date: i.due_date || null,
      remarks: (i.remarks ?? "").slice(0, 500),
    };
  })
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles").select("role, full_name").eq("id", context.userId).maybeSingle();
    if (!prof || (prof.role !== "teacher" && prof.role !== "principal")) throw new Error("Forbidden");
    const { error } = await context.supabase.from("fees").upsert({
      ...data, updated_by: context.userId,
    }, { onConflict: "student_id" });
    if (error) throw error;
    await pushNotifications(context.supabase, [{
      user_id: data.student_id, category: "fees",
      title: "💰 Fee details updated",
      message: `Total ₹${data.total_amount.toLocaleString()}${data.due_date ? ` · due ${data.due_date}` : ""}.`,
      link: "/dashboard/fees", icon: "wallet",
      sender_id: context.userId, sender_name: prof.full_name,
    }]);
    return { ok: true };
  });

export const addPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { student_id?: string; amount?: number; paid_on?: string; method?: string; remarks?: string } | undefined;
    if (!i?.student_id || !i.amount) throw new Error("Missing fields");
    return {
      student_id: i.student_id, amount: Number(i.amount),
      paid_on: i.paid_on || new Date().toISOString().slice(0, 10),
      method: (i.method ?? "cash").slice(0, 30),
      remarks: (i.remarks ?? "").slice(0, 300),
    };
  })
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles").select("role, full_name").eq("id", context.userId).maybeSingle();
    if (!prof || (prof.role !== "teacher" && prof.role !== "principal")) throw new Error("Forbidden");
    const { error } = await context.supabase.from("fee_payments").insert({
      ...data, recorded_by: context.userId,
    });
    if (error) throw error;
    await pushNotifications(context.supabase, [{
      user_id: data.student_id, category: "fees",
      title: "✅ Payment recorded",
      message: `₹${data.amount.toLocaleString()} received via ${data.method}.`,
      link: "/dashboard/fees", icon: "wallet",
      sender_id: context.userId, sender_name: prof.full_name,
    }]);
    return { ok: true };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const i = input as { id?: string } | undefined;
    if (!i?.id) throw new Error("Missing id");
    return { id: i.id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("fee_payments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });