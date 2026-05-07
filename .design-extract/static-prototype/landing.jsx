// landing.jsx — chadna.com landing + flow controller

const { useState: useStateL, useEffect: useEffectL, useMemo: useMemoL } = React;

// ── Approval letter dataset (synthetic, redacted) ─────────────────────────
const LETTERS = [
  { kind:'i539', caseNo:'EAC2487012845', country:'India',   year:'2025', size:'l' },
  { kind:'i539', caseNo:'LIN2487102391', country:'China',   year:'2025', size:'m' },
  { kind:'i589', caseNo:'MSC2491307821', country:'Russia',  year:'2024', size:'m' },
  { kind:'i539', caseNo:'WAC2491150923', country:'Brazil',  year:'2025', size:'s' },
  { kind:'i539', caseNo:'EAC2487223410', country:'Iran',    year:'2025', size:'s' },
  { kind:'i589', caseNo:'NBC2490912334', country:'Venezuela',year:'2024',size:'l' },
  { kind:'i539', caseNo:'LIN2487451123', country:'Nigeria', year:'2025', size:'m' },
  { kind:'i589', caseNo:'EAC2491100712', country:'Turkey',  year:'2024', size:'s' },
  { kind:'i539', caseNo:'WAC2487556614', country:'Korea',   year:'2024', size:'s' },
  { kind:'i539', caseNo:'MSC2491228856', country:'Vietnam', year:'2025', size:'m' },
];

const ATTORNEYS = [
  { initials:'AC', name:'Anika Chadna',   role:'Founding Partner', bar:'NY · CA · D.C.',     years:'14 yrs',   focus:'Asylum & Removal' },
  { initials:'MR', name:'Marcus Reyes',   role:'Senior Associate',  bar:'NY · NJ',            years:'9 yrs',    focus:'Student & Exchange' },
  { initials:'PT', name:'Priya Tandon',   role:'Of Counsel',        bar:'CA · IL',            years:'18 yrs',   focus:'Federal Litigation' },
];

const COUNTRIES = ["India","China","Brazil","Iran","Nigeria","Venezuela","Russia","Turkey","Korea","Vietnam","Egypt","Mexico","Colombia","Pakistan","Ukraine"];

// ──────────────────────────────────────────────────────────────────────────
function Nav({ onCTA }) {
  return (
    <nav className="nav">
      <div className="nav-row">
        <a className="brand" href="#">
          <BrandMark/>
          <span>chadna<span style={{color:'var(--muted)',fontWeight:400}}>.com</span></span>
        </a>
        <div className="nav-links">
          <a href="#flows">Services</a>
          <a href="#wins">Approvals</a>
          <a href="#team">Attorneys</a>
          <a href="#how">How it works</a>
        </div>
        <div className="nav-spacer"/>
        <div className="nav-cta"><span className="dot"/> Open · attorneys responding</div>
        <button className="btn btn-sm btn-ghost">Sign in</button>
        <button className="btn btn-sm btn-primary" onClick={onCTA}>Start filing</button>
      </div>
    </nav>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function Hero({ layout, onStart }) {
  return (
    <header className="hero">
      <div className="hero-grid">
        <div>
          <div className="eyebrow"><span className="pulse"/> 125 J-1 → F-1 approvals · 96% success rate</div>
          <h1 className="hero-h">
            Submit in 4 minutes.<br/>
            Pay. <em>Done.</em>
          </h1>
          <div className="hero-sub">
            Two visa filings, one click each. Upload documents, pay a flat fee, book your in-person appointment. A licensed immigration attorney reviews everything before it touches USCIS.
          </div>
          <div className="hero-stats">
            <Stat num="125" label="J-1 → F-1 approvals" sub="last 24 months"/>
            <Stat num="96%" label="success rate" sub="across all filings"/>
            <Stat num="42" label="countries served" sub="and counting"/>
            <Stat num="4 min" label="median submission" sub="from start to confirmation"/>
          </div>
        </div>
      </div>
      <div className="services" id="flows">
        <ServiceCard kind="j1f1" onStart={() => onStart('j1f1')}/>
        <ServiceCard kind="asylum" onStart={() => onStart('asylum')}/>
      </div>
    </header>
  );
}

function ServiceCard({ kind, onStart }) {
  const isAsylum = kind === 'asylum';
  const points = isAsylum
    ? ["Any current status","I-589 prepared & filed","Work permit guidance","6 docs · 4 minutes"]
    : ["Currently in J-1 status","I-539 + supporting brief","Waiver strategy reviewed","6 docs · 4 minutes"];
  return (
    <button className="svc" onClick={onStart}>
      <div className="svc-tag"><span className="sq" style={{background: isAsylum ? 'var(--accent)' : 'var(--ink)'}}/>{isAsylum ? 'Form I-589' : 'Form I-539'}</div>
      <h2>
        {isAsylum
          ? <>Apply for <em>asylum.</em></>
          : <>Change <em>J-1 to F-1.</em></>}
      </h2>
      <div className="svc-body">
        {isAsylum
          ? "If you fear returning to your country, we'll prepare your asylum application and stand with you through the interview. One year filing deadline applies."
          : "Stay in the U.S. as a student without leaving. We handle the I-539, the home-residency analysis, and the supporting legal brief."}
      </div>
      <div className="svc-points">
        {points.map(p => <span key={p}>{p}</span>)}
      </div>
      <div className="svc-foot">
        <div className="svc-price">
          <b><span className="dollar">$</span>{isAsylum ? '4,000' : '2,000'}</b>
          <span>flat · attorney included</span>
        </div>
        <div className="svc-cta">
          {isAsylum ? 'Apply for asylum' : 'Change my status'}
          <span className="arrow"><Icon.ArrowRight style={{width:16,height:16}}/></span>
        </div>
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function Strip() {
  return (
    <div className="strip">
      <div className="strip-row">
        <div className="strip-lbl">Clients from</div>
        <div className="strip-flags">
          {COUNTRIES.map((c, i) => (
            <span key={c}>{c}{i < COUNTRIES.length-1 ? ' · ' : ''}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n:'01', h:'Eligibility', p:'Four quick questions. We tell you instantly whether to file and which form.', t:'~ 30 sec' },
    { n:'02', h:'Documents', p:'Drag & drop your passport, I-94, I-20, financials. Missing one? We collect it later.', t:'~ 2 min' },
    { n:'03', h:'Payment',  p:'Flat fee, attorney review included. Refunded if our attorneys decline your case.', t:'~ 30 sec' },
    { n:'04', h:'Appointment',  p:'Pick a 30-minute slot — Manhattan office or Zoom. Walk out with your filing.', t:'~ 1 min' },
  ];
  return (
    <section className="section" id="how">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-h">Four steps. <em>One click each.</em></h2>
        </div>
        <div className="section-sub">
          You spend four minutes online. We spend two weeks on the legal work. Then you walk out of our office with a filing — not homework.
        </div>
      </div>
      <div className="steps">
        {steps.map(s => (
          <div className="step" key={s.n}>
            <div className="step-n">{s.n}</div>
            <h3>{s.h}</h3>
            <p>{s.p}</p>
            <div className="step-time">{s.t}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function LetterWall() {
  return (
    <section className="section" id="wins">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">Approvals</div>
          <h2 className="section-h">125 wins. <em>Names redacted.</em></h2>
        </div>
        <div className="section-sub">
          Real USCIS approval notices from Chadna clients. We blur the personal details — the seal, the receipt number, and the word that matters all stay legible.
        </div>
      </div>
      <div className="wall">
        {LETTERS.map((L, i) => (
          <div key={L.caseNo} className={`letter letter-${L.size}`}>
            <ApprovalLetter kind={L.kind} caseNo={L.caseNo} country={L.country} year={L.year} dense/>
            <div className="letter-overlay">
              <span>{L.country} · {L.year}</span>
              <span>{L.kind === 'i589' ? 'I-589' : 'I-539'} · APPROVED</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function Attorneys() {
  return (
    <section className="section" id="team">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">Counsel</div>
          <h2 className="section-h">Real attorneys. <em>On the file.</em></h2>
        </div>
        <div className="section-sub">
          Every Chadna filing is reviewed and signed by a licensed immigration attorney. The software handles the typing. We handle the law.
        </div>
      </div>
      <div className="att-grid">
        {ATTORNEYS.map(a => (
          <div className="att" key={a.name}>
            <div className="att-photo"><span>{a.initials}</span></div>
            <div>
              <h4>{a.name}</h4>
              <div className="att-role">{a.role}</div>
            </div>
            <div className="att-creds">
              <span><span>Bar admissions</span><b>{a.bar}</b></span>
              <span><span>Practice</span><b>{a.years}</b></span>
              <span><span>Focus</span><b>{a.focus}</b></span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function CTA({ onStart }) {
  return (
    <section className="cta">
      <div className="cta-row">
        <h2>Two filings. <em>One click each.</em></h2>
        <div className="cta-actions">
          <button className="btn btn-lg btn-primary" onClick={()=>onStart('j1f1')}>
            Change J-1 → F-1 · $2,000 <Icon.ArrowRight style={{width:14,height:14}}/>
          </button>
          <button className="btn btn-lg btn-accent" onClick={()=>onStart('asylum')}>
            Apply for asylum · $4,000 <Icon.ArrowRight style={{width:14,height:14}}/>
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-row">
        <div className="footer-col">
          <a className="brand" href="#"><BrandMark/> chadna<span style={{color:'var(--muted)',fontWeight:400}}>.com</span></a>
          <div className="footer-fine">350 5th Avenue, Suite 4810 · New York, NY 10118</div>
          <div className="footer-fine">© Chadna PLLC. Attorney advertising. Prior results do not guarantee similar outcomes.</div>
        </div>
        <div className="footer-cols">
          <div><b>Filings</b><a href="#">J-1 → F-1</a><a href="#">Asylum</a><a href="#">Other</a></div>
          <div><b>Firm</b><a href="#team">Attorneys</a><a href="#wins">Approvals</a><a href="#">Press</a></div>
          <div><b>Office</b><a href="#">Manhattan</a><a href="#">Hours</a><a href="#">Languages</a></div>
        </div>
      </div>
    </footer>
  );
}

// ─── Flow controller ─────────────────────────────────────────────────────
function FlowController({ kind, open, onClose }) {
  const [step, setStep] = useStateL(0);
  const [answers, setAnswers] = useStateL({});
  const [uploaded, setUploaded] = useStateL({});
  const [payment, setPayment] = useStateL({});
  const [slot, setSlot] = useStateL({ mode:'office' });

  useEffectL(() => {
    if (open) { setStep(0); setAnswers({}); setUploaded({}); setPayment({}); setSlot({mode:'office'}); }
  }, [open, kind]);

  if (!open) return null;
  const STEPS = ['Eligibility','Documents','Payment','Appointment'];
  const total = STEPS.length + 1; // + success
  const isLast = step >= STEPS.length;

  // gating
  const docs = kind === 'asylum' ? DOCS_ASYLUM : DOCS_J1F1;
  const docCount = docs.filter(d => uploaded[d.name]).length;
  const canNext =
    step === 0 ? Object.keys(answers).length >= 3 :
    step === 1 ? docCount >= Math.ceil(docs.length/2) :
    step === 2 ? (payment.name && payment.card && payment.exp && payment.cvc) :
    step === 3 ? (slot.day && slot.time) :
    true;

  const titles = {
    0: { h: kind==='asylum' ? 'A few questions about your situation.' : 'Quick eligibility check.', s: kind==='asylum' ? 'These determine your filing strategy. Nothing you say here is filed with USCIS.' : "Four questions. We'll know if J-1 → F-1 is the right path." },
    1: { h: 'Upload what you have.',  s: 'PDF, JPG, or PNG. Drop in whatever you can find — we collect the rest in your appointment.' },
    2: { h: kind==='asylum' ? 'Pay $4,000 — flat.' : 'Pay $2,000 — flat.', s: 'Refunded if our attorneys decline your case after review.' },
    3: { h: 'Pick your appointment.', s: 'Walk in, or hop on Zoom. 30 minutes. We file together.' },
    4: { h: 'Filed.', s: '' },
  };

  return (
    <FlowModal
      open={open}
      onClose={onClose}
      kind={kind}
      step={Math.min(step, STEPS.length-1)}
      totalSteps={STEPS.length}
      title={titles[step]?.h}
      subtitle={titles[step]?.s}
      footer={isLast ? (
        <>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-accent btn-lg" onClick={onClose}>Back to chadna.com <Icon.ArrowRight style={{width:14,height:14}}/></button>
        </>
      ) : (
        <>
          <button className="btn btn-ghost" disabled={step===0} onClick={() => setStep(s => Math.max(0, s-1))}>
            <Icon.ArrowLeft style={{width:14,height:14}}/> Back
          </button>
          <div style={{flex:1}}/>
          <button
            className={`btn btn-lg ${canNext ? 'btn-accent' : 'btn-ghost'}`}
            disabled={!canNext}
            onClick={() => setStep(s => s+1)}
          >
            {step === 0 && 'Continue to documents'}
            {step === 1 && 'Continue to payment'}
            {step === 2 && `Pay $${kind==='asylum' ? '4,000' : '2,370'}`}
            {step === 3 && 'Confirm & file'}
            <Icon.ArrowRight style={{width:14,height:14}}/>
          </button>
        </>
      )}
    >
      {step === 0 && <StepEligibility kind={kind} answers={answers} setAnswers={setAnswers}/>}
      {step === 1 && <StepDocuments kind={kind} uploaded={uploaded} setUploaded={setUploaded}/>}
      {step === 2 && <StepPayment kind={kind} payment={payment} setPayment={setPayment}/>}
      {step === 3 && <StepAppointment slot={slot} setSlot={setSlot}/>}
      {step === 4 && <StepSuccess kind={kind} slot={slot}/>}
    </FlowModal>
  );
}

Object.assign(window, {
  Nav, Hero, Strip, HowItWorks, LetterWall, Attorneys, CTA, Footer, FlowController, LETTERS, ATTORNEYS,
});
