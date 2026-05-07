import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "@/components/auth-forms";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark, Icon } from "@/components/icons";
import { getUser } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;

  // Already signed in? Skip the form.
  const user = await getUser();
  if (user) redirect({ href: next || "/dashboard", locale });

  const t = await getTranslations("auth");
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="flow-shell-bar" style={{ marginBottom: 24 }}>
          <Link className="flow-back" href="/" style={{ marginBottom: 0 }}>
            <Icon.ArrowLeft style={{ width: 14, height: 14 }} /> mongolstay.com
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="auth-head">
          <BrandMark size={32} />
          <h1 className="auth-title">{t("signInH")}</h1>
          <p className="auth-sub">{t("signInS")}</p>
        </div>
        <LoginForm next={next} />
        <div className="auth-foot">
          <div style={{ marginBottom: 8 }}>
            <Link href="/forgot-password">{t("forgotLink")}</Link>
          </div>
          {t("noAccount")} <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{t("signUp")}</Link>
        </div>
      </div>
    </div>
  );
}
