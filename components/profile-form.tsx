"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Props = {
  initialName: string;
  email: string;
};

export function ProfileForm({ initialName, email }: Props) {
  const t = useTranslations("profilePage");
  const tAuth = useTranslations("auth");
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [busyName, setBusyName] = useState(false);
  const [nameNotice, setNameNotice] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [busyPw, setBusyPw] = useState(false);
  const [pwNotice, setPwNotice] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyName(true);
    setNameError(null);
    setNameNotice(null);
    const sb = getBrowserSupabase();
    const trimmed = name.trim();
    const { error } = await sb.from("profiles").update({ full_name: trimmed }).eq("id", (await sb.auth.getUser()).data.user!.id);
    setBusyName(false);
    if (error) {
      setNameError(error.message);
      return;
    }
    setNameNotice(t("savedName"));
    router.refresh();
  };

  const savePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 10) return setPwError(tAuth("pwTooShort"));
    if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) {
      return setPwError(tAuth("pwTooSimple"));
    }
    if (pw !== pwConfirm) return setPwError(tAuth("pwMismatch"));

    setBusyPw(true);
    setPwError(null);
    setPwNotice(null);
    const sb = getBrowserSupabase();
    const { error } = await sb.auth.updateUser({ password: pw });
    setBusyPw(false);
    if (error) {
      setPwError(error.message);
      return;
    }
    setPw("");
    setPwConfirm("");
    setPwNotice(t("savedPw"));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <section className="dash-section">
        <div className="dash-section-h">{t("identityH")}</div>
        <form className="auth-form" onSubmit={saveName}>
          <label className="field">
            <span className="field-lbl">{tAuth("email")}</span>
            <input className="ipt" type="email" value={email} disabled style={{ opacity: 0.7 }} />
            <span className="field-hint">{t("emailHint")}</span>
          </label>
          <label className="field">
            <span className="field-lbl">{tAuth("name")}</span>
            <input
              className="ipt"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </label>
          {nameError && <div className="field-err" role="alert">{nameError}</div>}
          {nameNotice && <div className="field-hint" style={{ color: "var(--good)" }}>{nameNotice}</div>}
          <button type="submit" className="btn btn-accent" disabled={busyName || name.trim() === initialName}>
            {busyName ? t("saving") : t("saveName")}
          </button>
        </form>
      </section>

      <section className="dash-section">
        <div className="dash-section-h">{t("passwordH")}</div>
        <form className="auth-form" onSubmit={savePw}>
          <label className="field">
            <span className="field-lbl">{tAuth("newPassword")}</span>
            <input
              className="ipt"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              minLength={10}
              autoComplete="new-password"
              required
            />
            <span className="field-hint">{tAuth("pwHint")}</span>
          </label>
          <label className="field">
            <span className="field-lbl">{tAuth("confirmPassword")}</span>
            <input
              className="ipt"
              type="password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              minLength={10}
              autoComplete="new-password"
              required
            />
          </label>
          {pwError && <div className="field-err" role="alert">{pwError}</div>}
          {pwNotice && <div className="field-hint" style={{ color: "var(--good)" }}>{pwNotice}</div>}
          <button type="submit" className="btn btn-accent" disabled={busyPw || pw.length === 0}>
            {busyPw ? t("saving") : t("savePw")}
          </button>
        </form>
      </section>
    </div>
  );
}
