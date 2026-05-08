import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/auth-forms";
import { DashboardNav } from "@/components/dashboard-nav";
import { requireUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/login");
  const supabase = await getServerSupabase();

  // Sum of unread messages across the user's intakes — drives the sidebar badge.
  const { count: unread } = await supabase
    .from("intake_messages")
    .select("id", { count: "exact", head: true })
    .eq("direction", "in")
    .is("read_at", null);

  return (
    <div className="dlayout">
      <header className="dash-bar">
        <Link className="brand" href="/">
          <BrandMark />
          <span>mongolstay<span style={{ color: "var(--muted)", fontWeight: 400 }}>.com</span></span>
        </Link>
        <div style={{ flex: 1 }} />
        <LanguageSwitcher />
        <span className="dlayout-email">{user.email}</span>
        <SignOutButton />
      </header>

      <div className="dlayout-body">
        <aside className="dlayout-side">
          <DashboardNav unreadCount={unread ?? 0} />
        </aside>
        <main className="dlayout-main">{children}</main>
      </div>
    </div>
  );
}
