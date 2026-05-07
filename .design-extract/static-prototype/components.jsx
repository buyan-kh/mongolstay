// components.jsx — shared UI primitives for chadna.com prototype

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ───────── Icons ─────────────────────────────────────────────────────────
const Icon = {
  ArrowRight: (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8h10M9 4l4 4-4 4"/></svg>),
  ArrowLeft:  (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 8H3m4-4L3 8l4 4"/></svg>),
  Check:      (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8.5l3.5 3.5L13 5"/></svg>),
  CheckCircle:(p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>),
  Upload:     (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 11V3m-3 3l3-3 3 3M3 13h10"/></svg>),
  File:       (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3.5 1.5h6L13 5v9.5H3.5z"/><path d="M9 1.5V5h4"/></svg>),
  Lock:       (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>),
  Calendar:   (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/></svg>),
  Clock:      (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="6"/><path d="M8 5v3.2L10 10"/></svg>),
  Globe:      (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12"/></svg>),
  Shield:     (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 1.5L13.5 4v4.5c0 3-2.5 5.5-5.5 6-3-.5-5.5-3-5.5-6V4z"/></svg>),
  Sparkle:    (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 2v4M8 10v4M2 8h4M10 8h4"/></svg>),
  Card:       (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="4" width="12" height="9" rx="1.5"/><path d="M2 7h12M5 11h2"/></svg>),
  X:          (p) => (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4l8 8M12 4l-8 8"/></svg>),
};

// ───────── Brand mark ────────────────────────────────────────────────────
function BrandMark({size=22}) {
  return (
    <span className="brand-mark" style={{width:size,height:size,fontSize:size*0.5}}>C</span>
  );
}

// ───────── Stat ──────────────────────────────────────────────────────────
function Stat({ num, label, sub }) {
  return (
    <div className="stat">
      <div className="stat-num">{num}</div>
      <div className="stat-lbl">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ───────── Stepper bar (top of flow modal) ───────────────────────────────
function Stepper({ steps, current }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <React.Fragment key={s}>
            <div className={`stepper-step ${state}`}>
              <div className="stepper-dot">
                {state === "done" ? <Icon.Check style={{width:12,height:12}}/> : i+1}
              </div>
              <div className="stepper-lbl">{s}</div>
            </div>
            {i < steps.length-1 && <div className={`stepper-line ${i < current ? 'done' : ''}`}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ───────── Approval Letter (synthetic USCIS notice, redacted) ────────────
function ApprovalLetter({ kind="i539", caseNo, country, year, decision="APPROVED", redacted=true, dense=false }) {
  // kind: i539 (J1->F1 status change), i589 (asylum)
  const typeline = kind === "i589"
    ? "I-589, APPLICATION FOR ASYLUM AND FOR WITHHOLDING OF REMOVAL"
    : "I-539, APPLICATION TO EXTEND/CHANGE NONIMMIGRANT STATUS";
  const validFor = kind === "i589" ? "Asylum granted" : "F-1 student status";
  const _name = redacted ? "███████ ██████████" : "JANE DOE";
  const _addr1 = redacted ? "████ ██████████ ████" : "1234 EXAMPLE ST";
  const _addr2 = redacted ? "███████████, ██ █████" : "ANYTOWN, NY 10001";
  const _ab = redacted ? "███-███-█████" : "A123-456-789";

  return (
    <div className={`uscis ${dense ? 'uscis-dense' : ''}`}>
      <div className="uscis-head">
        <div className="uscis-seal" aria-hidden="true">
          {/* DHS-style seal placeholder */}
          <svg viewBox="0 0 64 64" width="100%" height="100%">
            <circle cx="32" cy="32" r="30" fill="none" stroke="#1B3A6E" strokeWidth="1.2"/>
            <circle cx="32" cy="32" r="24" fill="none" stroke="#1B3A6E" strokeWidth=".6"/>
            <path d="M32 12 L46 32 L32 52 L18 32 Z" fill="#1B3A6E" opacity=".15"/>
            <path d="M32 16 L42 32 L32 48 L22 32 Z" fill="none" stroke="#1B3A6E" strokeWidth=".8"/>
            <text x="32" y="34" textAnchor="middle" fontSize="6" fontFamily="Times" fill="#1B3A6E">U.S.</text>
            <text x="32" y="40" textAnchor="middle" fontSize="4" fontFamily="Times" fill="#1B3A6E">CITIZENSHIP</text>
          </svg>
        </div>
        <div className="uscis-org">
          <div className="uscis-dept">DEPARTMENT OF HOMELAND SECURITY</div>
          <div className="uscis-svc">U.S. Citizenship and Immigration Services</div>
        </div>
        <div className="uscis-form">{kind === "i589" ? "I-589" : "I-539"}</div>
      </div>

      <div className="uscis-stamp">
        <div className="stamp-box">
          <div className="stamp-word">{decision}</div>
          <div className="stamp-date">{`MAR ${10 + (parseInt(caseNo?.slice(-2)||'00',10)%18)}, ${year}`}</div>
        </div>
      </div>

      <div className="uscis-titleline">NOTICE OF ACTION</div>

      <div className="uscis-meta">
        <div><b>RECEIPT NUMBER</b><div className="mono">{caseNo}</div></div>
        <div><b>NOTICE DATE</b><div>March {10 + (parseInt(caseNo?.slice(-2)||'00',10)%18)}, {year}</div></div>
        <div><b>CASE TYPE</b><div className="tiny">{typeline}</div></div>
        <div><b>BENEFICIARY</b><div className="mono">{_ab}</div></div>
      </div>

      <div className="uscis-addr">
        <div className="mono">{_name}</div>
        <div className="mono">{_addr1}</div>
        <div className="mono">{_addr2}</div>
      </div>

      <div className="uscis-body">
        <p>The above application has been <b>approved</b>. We have updated our records to reflect this decision. The terms and conditions of {validFor} apply.</p>
        {kind === "i539" ? (
          <p>You have been granted F-1 student status from the date of this notice until the program end date listed on your Form I-20. Please carry this notice with you when traveling outside the United States.</p>
        ) : (
          <p>You are eligible to apply for employment authorization. You may also petition for derivative asylum status for your spouse and unmarried children under 21.</p>
        )}
        <p className="tiny" style={{marginTop:14,opacity:.7}}>Country of origin: {country} · Filed via Chadna · Counsel of record on file</p>
      </div>

      {/* redaction bars over personal areas */}
      {redacted && (
        <>
          <div className="redact" style={{top:'42%',left:'8%',width:'42%',height:'1.8%'}}/>
          <div className="redact" style={{top:'45%',left:'8%',width:'48%',height:'1.8%'}}/>
          <div className="redact" style={{top:'48%',left:'8%',width:'36%',height:'1.8%'}}/>
        </>
      )}
    </div>
  );
}

// ───────── Document upload row ───────────────────────────────────────────
function DocRow({ name, status, hint, onUpload }) {
  // status: 'idle' | 'uploading' | 'done'
  const [s, setS] = useState(status || 'idle');
  const [pct, setPct] = useState(0);
  const fileName = useRef("");

  const start = () => {
    if (s !== 'idle') return;
    setS('uploading'); setPct(0);
    fileName.current = name.replace(/\s+/g,'_').toLowerCase()+".pdf";
    let p = 0;
    const id = setInterval(() => {
      p += Math.random()*22 + 8;
      if (p >= 100) { p = 100; clearInterval(id); setS('done'); onUpload?.(); }
      setPct(p);
    }, 120);
  };

  return (
    <div className={`doc doc-${s}`} onClick={start}>
      <div className="doc-icon">
        {s === 'done' ? <Icon.Check style={{width:18,height:18}}/> : <Icon.File style={{width:18,height:18}}/>}
      </div>
      <div className="doc-meta">
        <div className="doc-name">{name}</div>
        <div className="doc-hint">
          {s === 'idle' && (hint || "Click to upload — PDF, JPG, PNG · max 10MB")}
          {s === 'uploading' && `Uploading… ${Math.round(pct)}%`}
          {s === 'done' && <span style={{color:'var(--good)'}}>{fileName.current} · uploaded</span>}
        </div>
        {s === 'uploading' && (
          <div className="doc-bar"><div className="doc-bar-fill" style={{width:`${pct}%`}}/></div>
        )}
      </div>
      <div className="doc-action">
        {s === 'idle' && <Icon.Upload style={{width:16,height:16}}/>}
        {s === 'done'  && <Icon.Check style={{width:16,height:16}}/>}
      </div>
    </div>
  );
}

// ───────── Field ────────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-lbl">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

// ───────── Modal frame ──────────────────────────────────────────────────
function FlowModal({ open, onClose, kind, children, footer, step, totalSteps, title, subtitle }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow=''; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-scrim" onClick={onClose}/>
      <div className="modal-panel">
        <button className="modal-x" onClick={onClose} aria-label="Close"><Icon.X style={{width:14,height:14}}/></button>
        <div className="modal-head">
          <div className="modal-tag">
            <span className="sq" style={{background: kind === 'asylum' ? 'var(--accent)' : 'var(--ink)'}}/>
            {kind === 'asylum' ? 'Asylum · I-589' : 'J-1 → F-1 · I-539'}
          </div>
          <div className="modal-title">{title}</div>
          {subtitle && <div className="modal-sub">{subtitle}</div>}
        </div>
        <div className="modal-progress">
          <div className="modal-progress-bar" style={{width:`${((step+1)/totalSteps)*100}%`}}/>
          <div className="modal-progress-lbl">Step {step+1} of {totalSteps}</div>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// expose to other scripts
Object.assign(window, {
  Icon, BrandMark, Stat, Stepper, ApprovalLetter, DocRow, Field, FlowModal,
});
