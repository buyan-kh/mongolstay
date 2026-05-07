"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase env vars missing");
  return createBrowserClient<Database>(url, anon);
}
