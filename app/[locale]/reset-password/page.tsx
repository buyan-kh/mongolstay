import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ResetPasswordForm } from "@/components/auth-forms";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark, Icon } from "@/components/icons";
import { requireUser } from "@/lib/auth";

export default async function Page() {
  // The user landed here from the magic link in their reset email — they
  // already have a session by the time this renders (Supabase exchanges the
  // code in /auth/callback). If for some reason they don't, send them home.
  await requireUser("/login");
  const t = await getTranslations("auth");
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="flow-shell-bar" style={{ marginBottom: 24 }}>
          <Link className="flow-back" href="/dashboard" style={{ marginBottom: 0 }}>
            <Icon.ArrowLeft style={{ width: 14, height: 14 }} /> Dashboard
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="auth-head">
          <BrandMark size={32} />
          <h1 className="auth-title">{t("resetH")}</h1>
          <p className="auth-sub">{t("resetS")}</p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
