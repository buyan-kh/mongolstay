"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

type FormState = { busy: boolean; error: string | null; notice: string | null };

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [s, setS] = useState<FormState>({ busy: false, error: null, notice: null });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setS({ busy: true, error: null, notice: null });
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setS({ busy: false, error: error.message, notice: null });
      return;
    }
    router.push(next || "/dashboard");
    router.refresh();
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="field">
        <span className="field-lbl">{t("email")}</span>
        <input
          className="ipt"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="field">
        <span className="field-lbl">{t("password")}</span>
        <input
          className="ipt"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {s.error && <div className="field-err" role="alert">{s.error}</div>}
      {s.notice && <div className="field-hint" style={{ color: "var(--good)" }}>{s.notice}</div>}
      <button type="submit" className="btn btn-accent btn-lg" disabled={s.busy}>
        {s.busy ? t("workingSignIn") : t("signIn")}
      </button>
    </form>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "valid"; attorneyName: string }
    | { state: "invalid" }
  >({ state: "idle" });
  const [s, setS] = useState<FormState>({ busy: false, error: null, notice: null });

  const validateCode = async (raw: string) => {
    const v = raw.trim();
    if (!v) {
      setCodeStatus({ state: "idle" });
      return null;
    }
    setCodeStatus({ state: "checking" });
    try {
      const res = await fetch("/api/referral/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: v }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.valid && data?.attorneyName) {
        setCodeStatus({ state: "valid", attorneyName: data.attorneyName });
        return v.toUpperCase();
      }
      setCodeStatus({ state: "invalid" });
      return null;
    } catch {
      setCodeStatus({ state: "invalid" });
      return null;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate the referral code fresh at submit (covers paste-into-field
    // without onBlur). If invalid we never call signUp.
    const validatedCode = await validateCode(code);
    if (!validatedCode) {
      setS({ busy: false, error: t("codeRequired"), notice: null });
      return;
    }

    // Client-side password policy. Server-side enforcement also lives in
    // supabase/config.toml (minimum_password_length + password_requirements).
    if (password.length < 10) {
      setS({ busy: false, error: t("pwTooShort"), notice: null });
      return;
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setS({ busy: false, error: t("pwTooSimple"), notice: null });
      return;
    }

    setS({ busy: true, error: null, notice: null });
    const supabase = getBrowserSupabase();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // referral_code rides along in raw_user_meta_data — the
        // create_profile_on_signup trigger reads it and sets profiles.referred_by_code.
        data: { full_name: name, referral_code: validatedCode },
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next || "/dashboard")}`,
      },
    });
    if (error) {
      setS({ busy: false, error: error.message, notice: null });
      return;
    }

    // If a session was returned (email confirmation disabled), straight to dashboard.
    if (data.session) {
      router.push(next || "/dashboard");
      router.refresh();
      return;
    }

    // Otherwise email confirmation is required — tell the user to check inbox.
    setS({ busy: false, error: null, notice: t("checkEmail") });
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="field">
        <span className="field-lbl">{t("referralCode")}</span>
        <input
          className="ipt"
          type="text"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setCode(v);
            if (codeStatus.state !== "idle") setCodeStatus({ state: "idle" });
          }}
          onBlur={(e) => void validateCode(e.target.value)}
          placeholder={t("referralCodePh")}
        />
        {codeStatus.state === "checking" && (
          <span className="field-hint">{t("codeChecking")}</span>
        )}
        {codeStatus.state === "valid" && (
          <span className="field-hint" style={{ color: "var(--good)" }}>
            {t("codeValid", { name: codeStatus.attorneyName })}
          </span>
        )}
        {codeStatus.state === "invalid" && (
          <span className="field-err">{t("codeInvalid")}</span>
        )}
        {codeStatus.state === "idle" && (
          <span className="field-hint">{t("referralCodeHint")}</span>
        )}
      </label>
      <label className="field">
        <span className="field-lbl">{t("name")}</span>
        <input
          className="ipt"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="field">
        <span className="field-lbl">{t("email")}</span>
        <input
          className="ipt"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <span className="field-hint">{t("signupEmailHint")}</span>
      </label>
      <label className="field">
        <span className="field-lbl">{t("password")}</span>
        <input
          className="ipt"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className="field-hint">{t("pwHint")}</span>
      </label>
      {s.error && <div className="field-err" role="alert">{s.error}</div>}
      {s.notice && <div className="field-hint" style={{ color: "var(--good)" }}>{s.notice}</div>}
      <button
        type="submit"
        className="btn btn-accent btn-lg"
        disabled={s.busy || codeStatus.state === "invalid" || codeStatus.state === "checking"}
      >
        {s.busy ? t("workingSignUp") : t("signUp")}
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [s, setS] = useState<FormState>({ busy: false, error: null, notice: null });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setS({ busy: true, error: null, notice: null });
    const supabase = getBrowserSupabase();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
    });
    if (error) {
      setS({ busy: false, error: error.message, notice: null });
      return;
    }
    // Don't reveal whether the email exists — just say "sent" either way.
    setS({ busy: false, error: null, notice: t("resetSent") });
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="field">
        <span className="field-lbl">{t("email")}</span>
        <input
          className="ipt"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {s.error && <div className="field-err" role="alert">{s.error}</div>}
      {s.notice && <div className="field-hint" style={{ color: "var(--good)" }}>{s.notice}</div>}
      <button type="submit" className="btn btn-accent btn-lg" disabled={s.busy}>
        {s.busy ? t("workingReset") : t("sendResetLink")}
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [s, setS] = useState<FormState>({ busy: false, error: null, notice: null });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 10) return setS({ busy: false, error: t("pwTooShort"), notice: null });
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return setS({ busy: false, error: t("pwTooSimple"), notice: null });
    }
    if (password !== confirm) {
      return setS({ busy: false, error: t("pwMismatch"), notice: null });
    }

    setS({ busy: true, error: null, notice: null });
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setS({ busy: false, error: error.message, notice: null });

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <label className="field">
        <span className="field-lbl">{t("newPassword")}</span>
        <input
          className="ipt"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className="field-hint">{t("pwHint")}</span>
      </label>
      <label className="field">
        <span className="field-lbl">{t("confirmPassword")}</span>
        <input
          className="ipt"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>
      {s.error && <div className="field-err" role="alert">{s.error}</div>}
      <button type="submit" className="btn btn-accent btn-lg" disabled={s.busy}>
        {s.busy ? t("workingReset") : t("setNewPassword")}
      </button>
    </form>
  );
}

export function SignOutButton() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    await getBrowserSupabase().auth.signOut();
    router.push("/");
    router.refresh();
  };
  return (
    <button type="button" className="btn btn-sm btn-ghost" onClick={onClick} disabled={busy}>
      {busy ? "…" : t("signOut")}
    </button>
  );
}
