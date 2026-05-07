import "server-only";
import { redirect } from "next/navigation";
import { getServerSupabase } from "./supabase/server";

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

// True if the current user has role='attorney' in public.profiles.
// Cheap to call — single equality lookup with index.
export async function isAttorney() {
  const supabase = await getServerSupabase();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
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
