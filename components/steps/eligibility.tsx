"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@/components/icons";
import { FlowFooter } from "@/components/flow-shell";
import { useFlow } from "@/components/flow-provider";
import { QUESTION_IDS } from "@/lib/flow-data";

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
  // Allow advancing when all but one question is answered.
  const canNext = answeredCount >= Math.max(3, questions.length - 1);

  return (
    <>
      <div className="elig">
        {questions.map((q) => {
          const qText = t(`questions.${kind}.${q.id}.q`);
          const opts = (t.raw(`questions.${kind}.${q.id}.opts`) as string[]) ?? [];
          return (
            <div className="elig-q" key={q.id}>
              <div className="elig-prompt">{qText}</div>
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

        {canNext && (
          <div className="elig-verdict">
            <div><Icon.CheckCircle style={{ width: 22, height: 22, color: "var(--good)" }} /></div>
            <div>
              <div className="elig-verdict-h">{t("verdictH")}</div>
              <div className="elig-verdict-s">
                {t(kind === "asylum" ? "verdictS_asylum" : "verdictS_j1f1")}
              </div>
            </div>
          </div>
        )}
      </div>

      <FlowFooter
        nextHref={`/file/${kind}/documents`}
        nextLabel={tBtn("continueDocs")}
        nextDisabled={!canNext}
      />
    </>
  );
}
