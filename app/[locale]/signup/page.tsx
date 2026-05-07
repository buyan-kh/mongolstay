import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SignupForm } from "@/components/auth-forms";
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
          <h1 className="auth-title">{t("signUpH")}</h1>
          <p className="auth-sub">{t("signUpS")}</p>
        </div>
        <SignupForm next={next} />
        <div className="auth-foot">
          {t("haveAccount")} <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{t("signIn")}</Link>
        </div>
      </div>
    </div>
  );
}
