import { createFileRoute } from "@tanstack/react-router";

type SeedUser = {
  email: string;
  password: string;
  full_name: string;
  role: "principal" | "teacher" | "student";
  subject?: string;
  exam_track?: "JEE" | "NEET";
  username: string;
};

const USERS: SeedUser[] = [
  { email: "memanrahil2020@gmail.com", password: "Rahil7", full_name: "Rahil Meman", role: "principal", subject: "Chemistry", username: "rahil" },
  { email: "fatemasaiyed2604@gmail.com", password: "Fati26", full_name: "Fatima Saiyed", role: "teacher", subject: "English", username: "fatima" },
  { email: "akbar@ntsj.app", password: "Akbr01", full_name: "Akbar Sir", role: "teacher", subject: "Physics", username: "akbar" },
  { email: "saima@ntsj.app", password: "Saim02", full_name: "Saima Mam", role: "teacher", subject: "Chemistry", username: "saima" },
  { email: "salman@ntsj.app", password: "Salm03", full_name: "Salman Sir", role: "teacher", subject: "Biology", username: "salman" },
  { email: "shadab@ntsj.app", password: "Shad04", full_name: "Shadab Sir", role: "teacher", subject: "Mathematics", username: "shadab" },
  { email: "imad@ntsj.app", password: "Imad11", full_name: "Imad Saiyed", role: "student", exam_track: "JEE", username: "imad" },
  { email: "hamza@ntsj.app", password: "Hamz12", full_name: "Hamza", role: "student", exam_track: "JEE", username: "hamza" },
  { email: "sumaiya@ntsj.app", password: "Suma13", full_name: "Sumaiya Shekh", role: "student", exam_track: "JEE", username: "sumaiya" },
  { email: "fahaz@ntsj.app", password: "Faha14", full_name: "Fahaz Sindhi", role: "student", exam_track: "JEE", username: "fahaz" },
  { email: "sunina@ntsj.app", password: "Suni15", full_name: "Sunina Baloch", role: "student", exam_track: "JEE", username: "sunina" },
  { email: "aliza@ntsj.app", password: "Aliz21", full_name: "Aliza", role: "student", exam_track: "NEET", username: "aliza" },
  { email: "aleena@ntsj.app", password: "Alee22", full_name: "Aleena Mansuri", role: "student", exam_track: "NEET", username: "aleena" },
  { email: "suhani@ntsj.app", password: "Suha23", full_name: "Suhani", role: "student", exam_track: "NEET", username: "suhani" },
];

export const Route = createFileRoute("/api/public/seed")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const results: { email: string; status: string }[] = [];

        for (const u of USERS) {
          const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
          const found = existing?.users?.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
          if (found) {
            // ensure profile + role exist
            await supabaseAdmin.from("profiles").upsert({
              id: found.id,
              full_name: u.full_name,
              role: u.role,
              subject: u.subject ?? null,
              exam_track: u.exam_track ?? null,
              username: u.username,
            });
            await supabaseAdmin.from("user_roles").upsert({ user_id: found.id, role: u.role }, { onConflict: "user_id,role" });
            results.push({ email: u.email, status: "exists (synced)" });
            continue;
          }
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true,
            user_metadata: {
              full_name: u.full_name,
              role: u.role,
              subject: u.subject ?? null,
              exam_track: u.exam_track ?? "",
              username: u.username,
            },
          });
          if (error || !data.user) {
            results.push({ email: u.email, status: `error: ${error?.message ?? "unknown"}` });
            continue;
          }
          results.push({ email: u.email, status: "created" });
        }

        return Response.json({ ok: true, results });
      },
    },
  },
});