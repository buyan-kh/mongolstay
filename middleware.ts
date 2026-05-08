import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// next-intl middleware handles locale detection (Accept-Language → cookie →
// pathname) and writes a NEXT_LOCALE cookie when the user switches languages,
// so the language picker persists across visits "for free".
export default createMiddleware(routing);

export const config = {
  // Match everything except api routes, Next internals, and static assets.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
