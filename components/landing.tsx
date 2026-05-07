import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandMark, Icon } from "./icons";
import { LanguageSwitcher } from "./language-switcher";
import { SignOutButton } from "./auth-forms";
import { ApprovalLetter } from "./uscis-letter";
import { ATTORNEYS, COUNTRIES, LETTERS } from "@/lib/flow-data";
import { getUser } from "@/lib/auth";

export async function Nav() {
  const [t, user] = await Promise.all([getTranslations("nav"), getUser()]);
  return (
    <nav className="nav">
      <div className="nav-row">
        <Link className="brand" href="/">
          <BrandMark />
          <span>mongolstay<span style={{ color: "var(--muted)", fontWeight: 400 }}>.com</span></span>
        </Link>
        <div className="nav-links">
          <a href="#flows">{t("services")}</a>
          <a href="#wins">{t("approvals")}</a>
          <a href="#team">{t("attorneys")}</a>
          <a href="#how">{t("how")}</a>
        </div>
        <div className="nav-spacer" />
        <LanguageSwitcher />
        <div className="nav-cta"><span className="dot" /> {t("openStatus")}</div>
        {user ? (
          <>
            <Link className="btn btn-sm btn-ghost" href="/dashboard">{t("dashboard")}</Link>
            <SignOutButton />
          </>
        ) : (
          <Link className="btn btn-sm btn-ghost" href="/login">{t("signIn")}</Link>
        )}
        <Link className="btn btn-sm btn-primary" href="/file/j1f1/eligibility">{t("startFiling")}</Link>
      </div>
    </nav>
  );
}

export async function Hero() {
  const t = await getTranslations("hero");
  const stats = ["approvals", "success", "countries", "median"] as const;
  return (
    <header className="hero">
      <div className="hero-grid">
        <div>
          <div className="eyebrow"><span className="pulse" /> {t("eyebrow")}</div>
          <h1 className="hero-h">
            {t("h1Line1")}<br />
            {t("h1Line2Pre")} <em>{t("h1Line2Em")}</em>
          </h1>
          <div className="hero-sub">{t("sub")}</div>
          <div className="hero-stats">
            {stats.map((s) => (
              <Stat
                key={s}
                num={t(`stats.${s}.num`)}
                label={t(`stats.${s}.lbl`)}
                sub={t(`stats.${s}.sub`)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="services" id="flows">
        <ServiceCard kind="j1f1" />
        <ServiceCard kind="asylum" />
      </div>
    </header>
  );
}

function Stat({ num, label, sub }: { num: string; label: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-num">{num}</div>
      <div className="stat-lbl">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

async function ServiceCard({ kind }: { kind: "j1f1" | "asylum" }) {
  const t = await getTranslations(`services.${kind}`);
  const isAsylum = kind === "asylum";
  // next-intl arrays come back via t.raw().
  const points = (t.raw("points") as string[]) ?? [];
  return (
    <Link className="svc" href={`/file/${kind}/eligibility`}>
      <div className="svc-tag">
        <span className="sq" style={{ background: isAsylum ? "var(--accent)" : "var(--ink)" }} />
        {t("tag")}
      </div>
      <h2>
        {t("h2Pre")} <em>{t("h2Em")}</em>
      </h2>
      <div className="svc-body">{t("body")}</div>
      <div className="svc-points">
        {points.map((p) => <span key={p}>{p}</span>)}
      </div>
      <div className="svc-foot">
        <div className="svc-price">
          <b><span className="dollar">$</span>{t("price")}</b>
          <span>{t("priceFootnote")}</span>
        </div>
        <div className="svc-cta">
          {t("cta")}
          <span className="arrow"><Icon.ArrowRight style={{ width: 16, height: 16 }} /></span>
        </div>
      </div>
    </Link>
  );
}

export async function Strip() {
  const t = await getTranslations("strip");
  return (
    <div className="strip">
      <div className="strip-row">
        <div className="strip-lbl">{t("lbl")}</div>
        <div className="strip-flags">
          {COUNTRIES.map((c, i) => (
            <span key={c}>{c}{i < COUNTRIES.length - 1 ? " · " : ""}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function HowItWorks() {
  const t = await getTranslations("how");
  const keys = ["01", "02", "03", "04"] as const;
  return (
    <section className="section" id="how">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">{t("eyebrow")}</div>
          <h2 className="section-h">{t("hPre")} <em>{t("hEm")}</em></h2>
        </div>
        <div className="section-sub">{t("sub")}</div>
      </div>
      <div className="steps">
        {keys.map((n) => (
          <div className="step" key={n}>
            <div className="step-n">{n}</div>
            <h3>{t(`steps.${n}.h`)}</h3>
            <p>{t(`steps.${n}.p`)}</p>
            <div className="step-time">{t(`steps.${n}.t`)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export async function LetterWall() {
  const t = await getTranslations("wins");
  return (
    <section className="section" id="wins">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">{t("eyebrow")}</div>
          <h2 className="section-h">{t("hPre")} <em>{t("hEm")}</em></h2>
        </div>
        <div className="section-sub">{t("sub")}</div>
      </div>
      <div className="wall">
        {LETTERS.map((L) => (
          <div key={L.caseNo} className={`letter letter-${L.size}`}>
            <ApprovalLetter kind={L.kind} caseNo={L.caseNo} country={L.country} year={L.year} dense />
            <div className="letter-overlay">
              <span>{L.country} · {L.year}</span>
              <span>{L.kind === "i589" ? "I-589" : "I-539"} · APPROVED</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export async function Attorneys() {
  const t = await getTranslations("team");
  return (
    <section className="section" id="team">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">{t("eyebrow")}</div>
          <h2 className="section-h">{t("hPre")} <em>{t("hEm")}</em></h2>
        </div>
        <div className="section-sub">{t("sub")}</div>
      </div>
      <div className="att-grid">
        {ATTORNEYS.map((a) => (
          <div className="att" key={a.name}>
            <div className="att-photo"><span>{a.initials}</span></div>
            <div>
              <h4>{a.name}</h4>
              <div className="att-role">{a.role}</div>
            </div>
            <div className="att-creds">
              <span><span>{t("creds.bar")}</span><b>{a.bar}</b></span>
              <span><span>{t("creds.practice")}</span><b>{a.years}</b></span>
              <span><span>{t("creds.focus")}</span><b>{a.focus}</b></span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export async function CTABand() {
  const t = await getTranslations("ctaBand");
  return (
    <section className="cta">
      <div className="cta-row">
        <h2>{t("hPre")} <em>{t("hEm")}</em></h2>
        <div className="cta-actions">
          <Link className="btn btn-lg btn-primary" href="/file/j1f1/eligibility">
            {t("j1f1")} <Icon.ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
          <Link className="btn btn-lg btn-accent" href="/file/asylum/eligibility">
            {t("asylum")} <Icon.ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export async function Footer() {
  const [t, tNav] = await Promise.all([getTranslations("footer"), getTranslations("nav")]);
  return (
    <footer className="footer">
      <div className="footer-row">
        <div className="footer-col">
          <Link className="brand" href="/">
            <BrandMark /> mongolstay<span style={{ color: "var(--muted)", fontWeight: 400 }}>.com</span>
          </Link>
          <div className="footer-fine">{t("address")}</div>
          <div className="footer-fine">{t("fine")}</div>
        </div>
        <div className="footer-cols">
          <div>
            <b>{t("filings")}</b>
            <Link href="/file/j1f1/eligibility">{t("j1f1")}</Link>
            <Link href="/file/asylum/eligibility">{t("asylum")}</Link>
            <a href="#">{t("other")}</a>
          </div>
          <div>
            <b>{t("firm")}</b>
            <a href="#team">{tNav("attorneys")}</a>
            <a href="#wins">{tNav("approvals")}</a>
            <a href="#">{t("press")}</a>
          </div>
          <div>
            <b>{t("office")}</b>
            <a href="#">{t("manhattan")}</a>
            <a href="#">{t("hours")}</a>
            <a href="#">{t("languages")}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
