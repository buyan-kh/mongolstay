import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandMark, Icon } from "@/components/icons";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="auth-head" style={{ alignItems: "center" }}>
          <BrandMark size={32} />
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>404</div>
          <h1 className="auth-title">{t("title")}</h1>
          <p className="auth-sub" style={{ maxWidth: "32ch", marginInline: "auto" }}>{t("body")}</p>
        </div>
        <Link className="btn btn-accent btn-lg" href="/" style={{ alignSelf: "stretch" }}>
          {t("home")} <Icon.ArrowRight style={{ width: 14, height: 14 }} />
        </Link>
      </div>
    </div>
  );
}
