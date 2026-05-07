import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ForgotPasswordForm } from "@/components/auth-forms";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark, Icon } from "@/components/icons";

export default async function Page() {
  const t = await getTranslations("auth");
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="flow-shell-bar" style={{ marginBottom: 24 }}>
          <Link className="flow-back" href="/login" style={{ marginBottom: 0 }}>
            <Icon.ArrowLeft style={{ width: 14, height: 14 }} /> {t("backToSignIn")}
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="auth-head">
          <BrandMark size={32} />
          <h1 className="auth-title">{t("forgotH")}</h1>
          <p className="auth-sub">{t("forgotS")}</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
