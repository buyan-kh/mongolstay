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
