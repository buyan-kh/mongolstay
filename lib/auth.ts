import "server-only";
import { redirect } from "next/navigation";
import { getServerSupabase } from "./supabase/server";
import { getAdminSupabase } from "./supabase/admin";

// Returns the current user or null. Use this on pages that render differently
// for logged-in vs logged-out without forcing a redirect.
export async function getUser() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

// Use this at the top of protected server components / route handlers.
// Redirects to /login (preserving the original path as ?next=) if no user.
export async function requireUser(redirectPath: string = "/login") {
  const user = await getUser();
  if (!user) redirect(redirectPath);
  return user!;
}

// True if the current user is an attorney. Two signals, either is enough:
//   1. profiles.role === 'attorney' (the DB-driven path)
//   2. user.email is in ADMIN_EMAILS env (comma-separated allowlist)
// The env var is for first-attorney bootstrap and ops without DB editing.
// When the env var grants access, we also promote the row in `profiles` so
// RLS policies (which key off `is_attorney()` SQL function = profiles.role)
// let them actually read intakes — otherwise the page loads but the list is
// empty.
export async function isAttorney() {
  const supabase = await getServerSupabase();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const email = u.user.email?.toLowerCase();

  if (email && allowlist.includes(email)) {
    try {
      const admin = getAdminSupabase();
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", u.user.id)
        .maybeSingle();
      if (!profile) {
        await admin.from("profiles").insert({ id: u.user.id, role: "attorney" });
      } else if (profile.role !== "attorney") {
        await admin.from("profiles").update({ role: "attorney" }).eq("id", u.user.id);
      }
    } catch (e) {
      console.error("env-promote profile failed", e);
    }
    return true;
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", u.user.id)
    .maybeSingle();
  return data?.role === "attorney";
}

// Gate for /admin routes. Sends non-attorneys back to /dashboard so a
// snooping client can't even see that an admin URL exists.
export async function requireAttorney() {
  const user = await requireUser("/login");
  const ok = await isAttorney();
  if (!ok) redirect("/dashboard");
  return user;
}
