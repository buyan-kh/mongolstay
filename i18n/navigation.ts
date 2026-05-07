import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware <Link>, useRouter, usePathname, redirect.
// Use these instead of next/link / next/navigation throughout the app.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
