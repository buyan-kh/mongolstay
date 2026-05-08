"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icons";
import { FlowFooter } from "@/components/flow-shell";
import { useFlow } from "@/components/flow-provider";
import { DISQUALIFIERS, QUESTION_IDS } from "@/lib/flow-data";

export function EligibilityStep() {
  const { kind, state, setState } = useFlow();
  const t = useTranslations("flow.elig");
  const tBtn = useTranslations("flow.buttons");
  const questions = QUESTION_IDS[kind];

  const choose = (qid: string, value: string, multi?: boolean) => {
    setState((s) => {
      const cur = s.answers[qid];
      let next: string | string[];
      if (multi) {
        const arr = Array.isArray(cur) ? cur : [];
        next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
      } else {
        next = value;
      }
      return { ...s, answers: { ...s.answers, [qid]: next } };
    });
  };

  const answeredCount = questions.reduce((n, q) => {
    const a = state.answers[q.id];
    if (q.multi) return n + (Array.isArray(a) && a.length > 0 ? 1 : 0);
    return n + (a ? 1 : 0);
  }, 0);

  // Walk every disqualifier — if the user picked the offending option index
  // for a question, surface that reason. We compare by index (resolved against
  // the localized opts array) so this works in both EN and MN.
  const triggered = DISQUALIFIERS[kind].filter((d) => {
    const opts = (t.raw(`questions.${kind}.${d.qid}.opts`) as string[]) ?? [];
    const offending = opts[d.optionIdx];
    return offending && state.answers[d.qid] === offending;
  });
  const ineligible = triggered.length > 0;

  // Continue is allowed only when no disqualifier is hit AND we have enough
  // answers to be confident.
  const canNext = !ineligible && answeredCount >= Math.max(3, questions.length - 1);

  return (
    <>
      <div className="elig">
        {questions.map((q) => {
          // Read the whole question record once so we can pluck optional copy
          // (hint/note) without next-intl throwing on missing keys.
          const raw = t.raw(`questions.${kind}.${q.id}`) as {
            q: string;
            opts: string[];
            hint?: string;
            note?: string;
          };
          const qText = raw.q;
          const opts = raw.opts ?? [];
          const hint = raw.hint;
          const note = raw.note;
          return (
            <div className="elig-q" key={q.id}>
              <div className="elig-prompt">{qText}</div>
              {hint && <div className="elig-hint">{hint}</div>}
              {note && <div className="elig-note">{note}</div>}
              <div className="elig-opts">
                {opts.map((o) => {
                  const cur = state.answers[q.id];
                  const sel = q.multi ? (Array.isArray(cur) && cur.includes(o)) : cur === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      className={`elig-opt ${sel ? "sel" : ""}`}
                      onClick={() => choose(q.id, o, q.multi)}
                    >
                      <span className="elig-check">{sel && <Icon.Check style={{ width: 11, height: 11 }} />}</span>
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {ineligible ? (
          <div className="elig-block" role="alert">
            <div><Icon.Lock style={{ width: 22, height: 22, color: "var(--warn)" }} /></div>
            <div>
              <div className="elig-block-h">{t("ineligibleH")}</div>
              <div className="elig-block-s">{t("ineligibleS")}</div>
              <ul className="elig-block-list">
                {triggered.map((d) => (
                  <li key={d.qid}>{t(`reasons.${d.reasonKey}`)}</li>
                ))}
              </ul>
              <div className="elig-block-foot">
                {t("ineligibleNote")}{" "}
                <Link href={`/file/${kind}/schedule`} className="elig-block-link">
                  {t("ineligibleCta")} →
                </Link>
              </div>
            </div>
          </div>
        ) : canNext ? (
          <div className="elig-verdict">
            <div><Icon.CheckCircle style={{ width: 22, height: 22, color: "var(--good)" }} /></div>
            <div>
              <div className="elig-verdict-h">{t("verdictH")}</div>
              <div className="elig-verdict-s">
                {t(`verdictS_${kind}`)}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <FlowFooter
        nextHref={`/file/${kind}/documents`}
        nextLabel={tBtn("continueDocs")}
        nextDisabled={!canNext}
      />
    </>
  );
}
