"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Icon } from "./icons";
import { LanguageSwitcher } from "./language-switcher";
import { STEPS, type FlowKind, type Step } from "@/lib/flow-data";

export function FlowShell({ kind, children }: { kind: FlowKind; children: React.ReactNode }) {
  const t = useTranslations("flow");
  const pathname = usePathname() ?? "";
  const segs = pathname.split("/").filter(Boolean); // ['file', kind, step]
  const stepFromPath = segs[2] as Step | "filed" | undefined;
  const isFiled = stepFromPath === "filed";

  if (isFiled) {
    return (
      <div className="app">
        <div className="flow-shell">
          <div className="flow-shell-bar no-print">
            <Link className="flow-back" href="/" style={{ marginBottom: 0 }}>
              <Icon.ArrowLeft style={{ width: 14, height: 14 }} /> {t("back")}
            </Link>
            <LanguageSwitcher />
          </div>
          <div className="flow-body">{children}</div>
        </div>
      </div>
    );
  }

  const stepIdx = (STEPS as readonly string[]).indexOf(stepFromPath ?? "");
  const safeIdx = stepIdx < 0 ? 0 : stepIdx;
  const totalSteps = STEPS.length;
  const progress = ((safeIdx + 1) / totalSteps) * 100;
  const stepKey: Step = STEPS[safeIdx] ?? "eligibility";

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
          <div className="flow-tag">
            <span
              className="sq"
              style={{
                background:
                  kind === "asylum" ? "var(--accent)" :
                  kind === "b1b2f1" ? "var(--ink-2)" :
                  "var(--ink)",
              }}
            />
            {t(`tag.${kind}`)}
          </div>
          <h1 className="flow-title">{t(`titles.${kind}.${stepKey}.h`)}</h1>
          <p className="flow-sub">{t(`titles.${kind}.${stepKey}.s`)}</p>
        </div>

        <div className="flow-progress">
          <div className="flow-progress-bar" style={{ width: `${progress}%` }} />
          <div className="flow-progress-lbl">
            {t("stepN", { current: safeIdx + 1, total: totalSteps, label: t(`steps.${stepKey}`) })}
          </div>
        </div>

        <div className="flow-body">{children}</div>
      </div>
    </div>
  );
}

export function FlowFooter({
  prevHref,
  nextHref,
  nextLabel,
  nextDisabled,
  onNext,
}: {
  prevHref?: string;
  nextHref?: string;
  nextLabel: string;
  nextDisabled?: boolean;
  onNext?: () => void | Promise<void>;
}) {
  const t = useTranslations("flow.buttons");
  return (
    <div className="flow-foot">
      {prevHref ? (
        <Link className="btn btn-ghost" href={prevHref}>
          <Icon.ArrowLeft style={{ width: 14, height: 14 }} /> {t("back")}
        </Link>
      ) : (
        <span />
      )}
      <div className="flow-foot-spacer" />
      {nextHref ? (
        <Link
          className={`btn btn-lg ${nextDisabled ? "btn-ghost" : "btn-accent"}`}
          href={nextDisabled ? "#" : nextHref}
          aria-disabled={nextDisabled}
          onClick={async (e) => {
            if (nextDisabled) { e.preventDefault(); return; }
            if (onNext) await onNext();
          }}
        >
          {nextLabel} <Icon.ArrowRight style={{ width: 14, height: 14 }} />
        </Link>
      ) : (
        <button
          className={`btn btn-lg ${nextDisabled ? "btn-ghost" : "btn-accent"}`}
          disabled={nextDisabled}
          onClick={() => onNext?.()}
        >
          {nextLabel} <Icon.ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      )}
    </div>
  );
}
