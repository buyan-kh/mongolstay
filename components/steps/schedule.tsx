"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/icons";
import { FlowFooter } from "@/components/flow-shell";
import { useFlow } from "@/components/flow-provider";
import type { AppointmentChannel } from "@/lib/flow-data";

// Office hours by day-of-week (0=Sun ... 6=Sat). The number is the latest hour
// (24h) at which an appointment can START — slots are 30 min apart starting at
// 9:00. Days not listed are unavailable.
const HOURS: Record<number, { startHour: number; endHour: number }> = {
  0: { startHour: 9, endHour: 17 }, // Sunday — all day (9–5)
  1: { startHour: 9, endHour: 17 }, // Monday — all day
  3: { startHour: 9, endHour: 17 }, // Wednesday — all day
  5: { startHour: 9, endHour: 17 }, // Friday — before 5pm
  6: { startHour: 9, endHour: 15 }, // Saturday — before 3pm
};

function buildSlots(dow: number): string[] {
  const cfg = HOURS[dow];
  if (!cfg) return [];
  const slots: string[] = [];
  for (let h = cfg.startHour; h < cfg.endHour; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

const CALLBACK_WINDOWS = [
  "today",
  "tomorrowMorning",
  "tomorrowAfternoon",
  "thisWeek",
  "anytime",
] as const;

export function ScheduleStep() {
  const { kind, state, setState } = useFlow();
  const t = useTranslations("flow.schedule");
  const tBtn = useTranslations("flow.buttons");
  const locale = useLocale();

  const mode = state.schedule.mode ?? "appointment";
  const setMode = (m: typeof mode) =>
    setState((s) => ({ ...s, schedule: { ...s.schedule, mode: m } }));

  // Show the next 6 calendar days that the office is actually open. Office is
  // closed Tue + Thu, so we scan further forward until we have 6 slots.
  const days = useMemo(() => {
    const out: Date[] = [];
    const d = new Date();
    let safety = 30;
    while (out.length < 6 && safety-- > 0) {
      d.setDate(d.getDate() + 1);
      if (HOURS[d.getDay()]) out.push(new Date(d));
    }
    return out;
  }, []);

  const setContact = (k: "name" | "email" | "phone", v: string) =>
    setState((s) => ({ ...s, contact: { ...s.contact, [k]: v } }));

  const setAppt = (iso: string, channel: AppointmentChannel) =>
    setState((s) => ({
      ...s,
      schedule: { ...s.schedule, mode: "appointment", appointment: { iso, channel } },
    }));

  const setCallback = (window: string, note?: string) =>
    setState((s) => ({
      ...s,
      schedule: { ...s.schedule, mode: "callback", callback: { window, note } },
    }));

  const apptIso = state.schedule.appointment?.iso;
  // In-person is paused — every new appointment is a video call.
  const apptChannel: AppointmentChannel = "video";

  const selectedDate = apptIso ? new Date(apptIso) : null;
  const selectedDayKey = selectedDate ? selectedDate.toISOString().slice(0, 10) : null;
  const selectedTime = selectedDate
    ? `${String(selectedDate.getHours()).padStart(2, "0")}:${String(selectedDate.getMinutes()).padStart(2, "0")}`
    : null;

  const pickDay = (d: Date) => {
    // If the previously chosen time is past this day's cutoff, fall back to
    // the first slot of the new day.
    const slots = buildSlots(d.getDay());
    const time = selectedTime && slots.includes(selectedTime) ? selectedTime : slots[0] ?? "09:00";
    const [hh, mm] = time.split(":").map(Number);
    const next = new Date(d);
    next.setHours(hh, mm, 0, 0);
    setAppt(next.toISOString(), apptChannel);
  };

  const pickTime = (time: string) => {
    if (!selectedDate) return;
    const [hh, mm] = time.split(":").map(Number);
    const next = new Date(selectedDate);
    next.setHours(hh, mm, 0, 0);
    setAppt(next.toISOString(), apptChannel);
  };

  // Validation
  const nameValid = state.contact.name.trim().length > 1;
  const emailValid = /\S+@\S+\.\S+/.test(state.contact.email);
  const phoneValid = state.contact.phone.replace(/\D/g, "").length >= 7;
  const contactValid = nameValid && emailValid && phoneValid;

  const apptValid = !!apptIso;
  const callbackValid = !!state.schedule.callback?.window;

  const canNext =
    contactValid && (mode === "appointment" ? apptValid : callbackValid);

  // Build a list of what's missing so we can show it next to the disabled button.
  const missing: string[] = [];
  if (!nameValid) missing.push(t("missing.name"));
  if (!emailValid) missing.push(t("missing.email"));
  if (!phoneValid) missing.push(t("missing.phone"));
  if (mode === "appointment" && !apptValid) missing.push(t("missing.time"));
  if (mode === "callback" && !callbackValid) missing.push(t("missing.callbackWindow"));

  return (
    <>
      <div className="sched">
        <div className="sched-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "appointment"}
            className={`sched-tab ${mode === "appointment" ? "sel" : ""}`}
            onClick={() => setMode("appointment")}
          >
            <Icon.Calendar style={{ width: 14, height: 14 }} />
            {t("tabs.appointment")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "callback"}
            className={`sched-tab ${mode === "callback" ? "sel" : ""}`}
            onClick={() => setMode("callback")}
          >
            <Icon.Clock style={{ width: 14, height: 14 }} />
            {t("tabs.callback")}
          </button>
        </div>

        {/* Contact info — required for either path */}
        <div className="sched-contact">
          <div className="sched-section-h">{t("contact.heading")}</div>
          <div className="pay-row">
            <label className="field">
              <span className="field-lbl">{t("contact.name")}</span>
              <input
                className="ipt"
                placeholder={t("contact.namePh")}
                value={state.contact.name}
                onChange={(e) => setContact("name", e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-lbl">{t("contact.email")}</span>
              <input
                className="ipt"
                type="email"
                placeholder="you@example.com"
                value={state.contact.email}
                onChange={(e) => setContact("email", e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-lbl">{t("contact.phone")}</span>
              <input
                className="ipt"
                type="tel"
                placeholder="+1 555 555 5555"
                value={state.contact.phone}
                onChange={(e) => setContact("phone", e.target.value)}
              />
            </label>
          </div>
        </div>

        {mode === "appointment" ? (
          <div className="appt">
            <div className="appt-modes">
              <div className="appt-mode sel">
                <div className="appt-mode-h">{t("channel.videoH")}</div>
                <div className="appt-mode-s">{t("channel.videoS")}</div>
              </div>
            </div>

            <div className="appt-cal">
              <div className="appt-days">
                {days.map((d) => {
                  const k = d.toISOString().slice(0, 10);
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`appt-day ${selectedDayKey === k ? "sel" : ""}`}
                      onClick={() => pickDay(d)}
                    >
                      <div className="appt-day-w">
                        {d.toLocaleDateString(locale, { weekday: "short" })}
                      </div>
                      <div className="appt-day-n">{d.getDate()}</div>
                      <div className="appt-day-m">
                        {d.toLocaleDateString(locale, { month: "short" })}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="appt-times">
                {(selectedDate ? buildSlots(selectedDate.getDay()) : buildSlots(days[0]?.getDay() ?? 1)).map((time) => (
                  <button
                    key={time}
                    type="button"
                    disabled={!selectedDayKey}
                    className={`appt-time ${selectedTime === time ? "sel" : ""}`}
                    onClick={() => pickTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="callback">
            <div className="sched-section-h">{t("callback.heading")}</div>
            <div className="callback-windows">
              {CALLBACK_WINDOWS.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`appt-mode ${state.schedule.callback?.window === w ? "sel" : ""}`}
                  onClick={() => setCallback(w, state.schedule.callback?.note)}
                >
                  <div className="appt-mode-h">{t(`callback.windows.${w}`)}</div>
                </button>
              ))}
            </div>
            <label className="field">
              <span className="field-lbl">{t("callback.note")}</span>
              <textarea
                className="ipt"
                style={{ height: "auto", minHeight: 84, padding: "10px 14px", resize: "vertical" }}
                placeholder={t("callback.notePh")}
                value={state.schedule.callback?.note ?? ""}
                onChange={(e) =>
                  setCallback(state.schedule.callback?.window ?? "", e.target.value)
                }
              />
            </label>
          </div>
        )}
      </div>

      {!canNext && missing.length > 0 && (
        <div className="flow-hint" role="status">
          {t("missing.lead")} <strong>{missing.join(" · ")}</strong>
        </div>
      )}

      <FlowFooter
        prevHref={`/file/${kind}/documents`}
        nextHref={`/file/${kind}/payment`}
        nextLabel={tBtn("continuePayment")}
        nextDisabled={!canNext}
      />
    </>
  );
}
