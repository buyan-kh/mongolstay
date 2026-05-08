export type FlowKind = "j1f1" | "b1b2f1" | "asylum";

export const PRICES = {
  j1f1: { fee: 1000, uscisFee: 370 },
  b1b2f1: { fee: 1000, uscisFee: 370 },   // same I-539 fee structure as J-1 → F-1
  asylum: { fee: 3000, uscisFee: 100 },   // I-589 has a $100 USCIS biometrics fee
} as const;

export const STEPS = ["eligibility", "documents", "schedule", "payment"] as const;
export type Step = (typeof STEPS)[number];

export type ScheduleMode = "appointment" | "callback";
export type AppointmentChannel = "office" | "video";
export type PaymentMethod = "card" | "zelle" | "cash";

export const FORM_LABEL = { j1f1: "I-539", b1b2f1: "I-539", asylum: "I-589" } as const;

// IDs only — display text comes from messages/{locale}.json under
// flow.elig.questions.{kind}.{id} and flow.docs.{kind}.{id}.
export const QUESTION_IDS: Record<FlowKind, { id: string; multi?: boolean }[]> = {
  asylum: [
    { id: "inUS" },
    { id: "currentStatus" },
    { id: "inStatus" },
    { id: "arrived" },
    { id: "fear" },
    { id: "reason", multi: true },
  ],
  j1f1: [
    { id: "inUS" },
    { id: "currentJ1" },
    { id: "dsExpiry" },
    { id: "waiver" },
    { id: "i20" },
    { id: "sevisPaid" },
    { id: "funds" },
  ],
  // B-1 / B-2 → F-1 questions. The "intent" question matters: USCIS denies
  // change-of-status when the visitor entered with preconceived intent to study.
  b1b2f1: [
    { id: "inUS" },
    { id: "currentBStatus" },
    { id: "bExpiry" },
    { id: "intent" },
    { id: "i20" },
    { id: "sevisPaid" },
    { id: "funds" },
  ],
};

// Documents we ask the user to upload that depend on their eligibility answers.
// Map: docId → { question id, indexes of answers that mean "I don't have it,
// you handle it". When the user picks one of those indexes, we don't show that
// document in the upload list — we'll prepare/pay for it on their behalf.
export const CONDITIONAL_DOCS: Record<string, { qid: string; skipIfIdx: number[] }> = {
  i20:   { qid: "i20",        skipIfIdx: [1, 2] }, // "Not yet" or "In progress"
  sevis: { qid: "sevisPaid",  skipIfIdx: [1] },    // "Not yet"
};

// Hard disqualifiers: a single answer that USCIS will deny on no matter what
// the rest of the file looks like. Stored as the index of the offending option
// in messages/{locale}.json so it works across both locales.
export type Disqualifier = { qid: string; optionIdx: number; reasonKey: string };

export const DISQUALIFIERS: Record<FlowKind, Disqualifier[]> = {
  j1f1: [
    { qid: "inUS",      optionIdx: 1, reasonKey: "notInUS" },           // "No"
    { qid: "currentJ1", optionIdx: 1, reasonKey: "j1Expired" },         // "Expired"
    { qid: "dsExpiry",  optionIdx: 0, reasonKey: "dsExpired" },         // "Already expired"
    { qid: "waiver",    optionIdx: 0, reasonKey: "waiverNeeded" },      // "Yes" (subject, not waived)
  ],
  b1b2f1: [
    { qid: "inUS",     optionIdx: 1, reasonKey: "notInUS" },            // "No"
    { qid: "bExpiry",  optionIdx: 0, reasonKey: "i94Expired" },         // "Already expired"
    { qid: "intent",   optionIdx: 2, reasonKey: "preconceivedIntent" }, // "Yes, I intended to study"
  ],
  asylum: [
    { qid: "inUS", optionIdx: 1, reasonKey: "notInUS" },                // "No"
  ],
};

export const DOC_IDS: Record<FlowKind, string[]> = {
  j1f1: ["ds2019", "i94", "passport", "i20", "funds", "sevis"],
  b1b2f1: ["i94", "passport", "visa", "i20", "funds", "sevis"],
  asylum: ["id", "i94", "statement", "country", "relations", "evidence"],
};

export const LETTERS = [
  { kind: "i539", caseNo: "WAC2691104872", country: "Mongolia", year: "2026", size: "l" },
  { kind: "i539", caseNo: "EAC2587823910", country: "Mongolia", year: "2025", size: "m" },
  { kind: "i589", caseNo: "MSC2691307502", country: "Mongolia", year: "2026", size: "m" },
  { kind: "i539", caseNo: "LIN2587451623", country: "Mongolia", year: "2025", size: "s" },
  { kind: "i539", caseNo: "WAC2691226118", country: "Mongolia", year: "2026", size: "s" },
  { kind: "i589", caseNo: "NBC2587012948", country: "Mongolia", year: "2025", size: "l" },
  { kind: "i539", caseNo: "EAC2691150217", country: "Mongolia", year: "2026", size: "m" },
  { kind: "i589", caseNo: "EAC2587223380", country: "Mongolia", year: "2025", size: "s" },
  { kind: "i539", caseNo: "LIN2691102744", country: "Mongolia", year: "2026", size: "s" },
  { kind: "i539", caseNo: "MSC2587556205", country: "Mongolia", year: "2025", size: "m" },
] as const;

export const ATTORNEYS = [
  { initials: "AC", name: "Anika Chadna", role: "Founding Partner",  bar: "NY · CA · D.C.", years: "14 yrs", focus: "Asylum & Removal" },
  { initials: "MR", name: "Marcus Reyes", role: "Senior Associate",  bar: "NY · NJ",         years: "9 yrs",  focus: "Student & Exchange" },
  { initials: "PT", name: "Priya Tandon", role: "Of Counsel",         bar: "CA · IL",         years: "18 yrs", focus: "Federal Litigation" },
] as const;

// Country labels for the landing strip live in messages/{locale}.json now
// (see strip.countries) so they can be localized.

export function isFlowKind(s: string): s is FlowKind {
  return s === "j1f1" || s === "asylum" || s === "b1b2f1";
}
export function isStep(s: string): s is Step {
  return (STEPS as readonly string[]).includes(s);
}
