import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ServiceCard } from "@/components/landing";

export default async function FileChooserPage() {
  const t = await getTranslations("flow");
  const tChoose = await getTranslations("flow.choose");

  return (
    <div className="app">
      <div className="flow-shell">
        <div className="flow-shell-bar">
          <Link className="flow-back" href="/" style={{ marginBottom: 0 }}>
            <Icon.ArrowLeft style={{ width: 14, height: 14 }} /> {t("back")}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="flow-head">
          <h1 className="flow-title">{tChoose("h")}</h1>
          <p className="flow-sub">{tChoose("s")}</p>
        </div>

        <div className="services" style={{ marginTop: 28 }}>
          <ServiceCard kind="j1f1" />
          <ServiceCard kind="b1b2f1" />
          <ServiceCard kind="asylum" />
        </div>
      </div>
    </div>
  );
}
