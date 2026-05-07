// flows.jsx — 4-step flow content for J1→F1 (I-539) and Asylum (I-589)

const { useState: useStateF, useEffect: useEffectF, useMemo: useMemoF } = React;

// docs lists
const DOCS_J1F1 = [
  { name: "Current DS-2019",            hint: "From your J-1 program sponsor" },
  { name: "Form I-94",                  hint: "Most recent travel record · download from CBP" },
  { name: "Passport biographic page",   hint: "Page with your photo & details" },
  { name: "Form I-20 from new school",  hint: "Issued by your accepting U.S. school" },
  { name: "Proof of financial support", hint: "Bank letter or sponsor I-134" },
  { name: "SEVIS fee receipt (I-901)",  hint: "$350 fee paid to SEVIS" },
];
const DOCS_ASYLUM = [
  { name: "Passport / national ID",      hint: "Any country-issued identity document" },
  { name: "Form I-94 arrival record",    hint: "Most recent U.S. entry record" },
  { name: "Personal statement (draft)",  hint: "Why you fear returning · we'll polish this" },
  { name: "Country condition evidence",  hint: "News articles, reports, photos" },
  { name: "Identity & relationship docs",hint: "Birth certificate, marriage cert, etc" },
  { name: "Past persecution evidence",   hint: "Medical records, threats, police reports" },
];

// ─── Step 1 — Eligibility ────────────────────────────────────────────────
function StepEligibility({ kind, answers, setAnswers }) {
  const Q = kind === 'asylum' ? [
    { id: 'inUS', q: "Are you currently inside the United States?", opts:["Yes","No"] },
    { id: 'arrived', q: "When did you most recently enter the U.S.?", opts:["Less than 1 year ago","1–2 years ago","More than 2 years ago"] },
    { id: 'fear', q: "Do you fear harm if you return to your home country?", opts:["Yes","Unsure","No"] },
    { id: 'reason', q: "Reason for fear (select all that apply)", opts:["Race","Religion","Nationality","Political opinion","Particular social group"], multi:true },
  ] : [
    { id: 'currentJ1', q: "Are you currently in valid J-1 status?", opts:["Yes","Expired","Unsure"] },
    { id: 'waiver', q: "Are you subject to the 2-year home residency requirement?", opts:["Yes","No","Already waived"] },
    { id: 'i20', q: "Do you have an I-20 from a SEVP-approved school?", opts:["Yes","Not yet","In progress"] },
    { id: 'funds', q: "Can you show proof of funds for at least one year?", opts:["Yes","Partially","No"] },
  ];
  return (
    <div className="elig">
      {Q.map((q) => (
        <div className="elig-q" key={q.id}>
          <div className="elig-prompt">{q.q}</div>
          <div className="elig-opts">
            {q.opts.map((o) => {
              const sel = q.multi
                ? (answers[q.id] || []).includes(o)
                : answers[q.id] === o;
              return (
                <button
                  key={o}
                  className={`elig-opt ${sel ? 'sel' : ''}`}
                  onClick={() => {
                    if (q.multi) {
                      const cur = answers[q.id] || [];
                      const nx = cur.includes(o) ? cur.filter(x=>x!==o) : [...cur, o];
                      setAnswers({ ...answers, [q.id]: nx });
                    } else {
                      setAnswers({ ...answers, [q.id]: o });
                    }
                  }}
                >
                  <span className="elig-check">{sel && <Icon.Check style={{width:11,height:11}}/>}</span>
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="elig-verdict">
        <div className="elig-verdict-icon"><Icon.CheckCircle style={{width:22,height:22,color:'var(--good)'}}/></div>
        <div>
          <div className="elig-verdict-h">You look eligible.</div>
          <div className="elig-verdict-s">Based on your answers, we'll prepare a {kind === 'asylum' ? 'I-589 asylum application' : 'I-539 change of status petition'}. A licensed attorney will review before filing.</div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2 — Documents ──────────────────────────────────────────────────
function StepDocuments({ kind, uploaded, setUploaded }) {
  const docs = kind === 'asylum' ? DOCS_ASYLUM : DOCS_J1F1;
  const onOne = (name) => setUploaded({ ...uploaded, [name]: true });
  const count = docs.filter(d => uploaded[d.name]).length;
  return (
    <div className="docs">
      <div className="docs-banner">
        <Icon.Shield style={{width:16,height:16, color:'var(--accent)'}}/>
        <div>
          <div className="docs-banner-h">Encrypted & attorney-reviewed</div>
          <div className="docs-banner-s">Files are stored under attorney–client privilege. We'll request anything missing in your appointment.</div>
        </div>
      </div>
      <div className="docs-list">
        {docs.map((d) => (
          <DocRow key={d.name} name={d.name} hint={d.hint} status={uploaded[d.name] ? 'done':'idle'} onUpload={() => onOne(d.name)}/>
        ))}
      </div>
      <div className="docs-skip">
        Don't have everything? <a onClick={() => docs.forEach(d => onOne(d.name))}>Skip — we'll collect the rest in your appointment</a>
      </div>
      <div className="docs-progress">
        <div className="docs-progress-bar"><div className="docs-progress-fill" style={{width:`${(count/docs.length)*100}%`}}/></div>
        <div className="docs-progress-lbl">{count} of {docs.length} uploaded</div>
      </div>
    </div>
  );
}

// ─── Step 3 — Payment ────────────────────────────────────────────────────
function StepPayment({ kind, payment, setPayment }) {
  const price = kind === 'asylum' ? 4000 : 2000;
  const fee = kind === 'asylum' ? 0 : 370; // mock USCIS fee
  const total = price + fee;
  return (
    <div className="pay">
      <div className="pay-grid">
        <div className="pay-form">
          <Field label="Cardholder name">
            <input className="ipt" placeholder="Name on card" value={payment.name||''} onChange={(e)=>setPayment({...payment,name:e.target.value})}/>
          </Field>
          <Field label="Card number">
            <div className="ipt-card">
              <input className="ipt" placeholder="1234  5678  9012  3456" value={payment.card||''} onChange={(e)=>setPayment({...payment,card:e.target.value})}/>
              <div className="ipt-card-brand"><Icon.Card style={{width:18,height:18}}/></div>
            </div>
          </Field>
          <div className="pay-row">
            <Field label="Expiry"><input className="ipt" placeholder="MM / YY" value={payment.exp||''} onChange={(e)=>setPayment({...payment,exp:e.target.value})}/></Field>
            <Field label="CVC"><input className="ipt" placeholder="123" value={payment.cvc||''} onChange={(e)=>setPayment({...payment,cvc:e.target.value})}/></Field>
            <Field label="ZIP"><input className="ipt" placeholder="10001" value={payment.zip||''} onChange={(e)=>setPayment({...payment,zip:e.target.value})}/></Field>
          </div>
          <div className="pay-secured">
            <Icon.Lock style={{width:13,height:13}}/> 256-bit TLS · processed by Stripe · refunded if attorney declines case
          </div>
        </div>

        <div className="pay-summary">
          <div className="pay-sum-h">Order summary</div>
          <div className="pay-sum-row">
            <span>{kind === 'asylum' ? 'Asylum application (I-589)' : 'J-1 → F-1 change of status (I-539)'}</span>
            <span className="mono">${price.toLocaleString()}.00</span>
          </div>
          {fee > 0 && (
            <div className="pay-sum-row muted">
              <span>USCIS filing fee</span>
              <span className="mono">${fee}.00</span>
            </div>
          )}
          <div className="pay-sum-row muted">
            <span>Attorney review</span>
            <span>included</span>
          </div>
          <div className="pay-sum-row muted">
            <span>In-person appointment</span>
            <span>included</span>
          </div>
          <div className="pay-sum-divider"/>
          <div className="pay-sum-row total">
            <span>Total today</span>
            <span className="mono">${total.toLocaleString()}.00</span>
          </div>
          <div className="pay-sum-foot">Flat fee. No hidden costs. {kind==='asylum' ? 'Asylum filings have no USCIS fee.' : ''}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4 — Appointment ────────────────────────────────────────────────
function StepAppointment({ slot, setSlot }) {
  // generate next 5 weekdays
  const days = useMemoF(() => {
    const out = []; const d = new Date();
    while (out.length < 6) { d.setDate(d.getDate()+1); if (d.getDay()!==0 && d.getDay()!==6) out.push(new Date(d)); }
    return out;
  }, []);
  const TIMES = ["9:00", "10:30", "12:00", "1:30", "3:00", "4:30"];
  const fmtDay = (d) => d.toLocaleDateString(undefined,{weekday:'short'});
  const fmtNum = (d) => d.getDate();
  const fmtMon = (d) => d.toLocaleDateString(undefined,{month:'short'});
  const dayKey = (d) => d.toISOString().slice(0,10);

  const selDay = slot.day || dayKey(days[1]);
  return (
    <div className="appt">
      <div className="appt-modes">
        <button className={`appt-mode ${(slot.mode||'office')==='office'?'sel':''}`} onClick={()=>setSlot({...slot,mode:'office'})}>
          <div className="appt-mode-h">In-person · Manhattan office</div>
          <div className="appt-mode-s">350 5th Ave, Suite 4810 · 30 min</div>
        </button>
        <button className={`appt-mode ${slot.mode==='video'?'sel':''}`} onClick={()=>setSlot({...slot,mode:'video'})}>
          <div className="appt-mode-h">Video call</div>
          <div className="appt-mode-s">Zoom link · 30 min</div>
        </button>
      </div>

      <div className="appt-cal">
        <div className="appt-days">
          {days.map((d) => {
            const k = dayKey(d);
            return (
              <button key={k} className={`appt-day ${selDay===k?'sel':''}`} onClick={()=>setSlot({...slot,day:k,time:undefined})}>
                <div className="appt-day-w">{fmtDay(d)}</div>
                <div className="appt-day-n">{fmtNum(d)}</div>
                <div className="appt-day-m">{fmtMon(d)}</div>
              </button>
            );
          })}
        </div>
        <div className="appt-times">
          {TIMES.map((t,i) => (
            <button key={t} disabled={i===2} className={`appt-time ${slot.time===t?'sel':''} ${i===2?'taken':''}`} onClick={()=>setSlot({...slot,time:t})}>
              {t} {parseInt(t,10) < 12 ? 'am':'pm'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 5 (success) ────────────────────────────────────────────────────
function StepSuccess({ kind, slot }) {
  const ref = `CDN-${(Math.random()*1e6|0).toString().padStart(6,'0')}`;
  return (
    <div className="success">
      <div className="success-mark">
        <Icon.CheckCircle style={{width:56,height:56,color:'var(--good)'}}/>
      </div>
      <div className="success-h">Filed. We'll see you {slot?.day ? new Date(slot.day).toLocaleDateString(undefined,{weekday:'long'}) : 'soon'}.</div>
      <div className="success-s">Your {kind==='asylum'?'I-589 asylum application':'I-539 change of status petition'} is queued for attorney review. We've emailed your appointment confirmation and a checklist of anything we still need.</div>

      <div className="success-card">
        <div className="success-row">
          <span>Reference</span>
          <span className="mono">{ref}</span>
        </div>
        <div className="success-row">
          <span>Filing</span>
          <span>{kind==='asylum'?'I-589':'I-539'}</span>
        </div>
        <div className="success-row">
          <span>Appointment</span>
          <span>{slot?.day ? new Date(slot.day).toLocaleDateString(undefined,{weekday:'long', month:'short', day:'numeric'}) : '—'} · {slot?.time || '—'}</span>
        </div>
        <div className="success-row">
          <span>Mode</span>
          <span>{(slot?.mode||'office')==='office' ? '350 5th Ave, Suite 4810' : 'Video call'}</span>
        </div>
      </div>

      <div className="success-letters">
        <div className="success-letters-h">While you wait — recent approvals like yours</div>
        <div className="success-letters-row">
          <ApprovalLetter kind={kind==='asylum'?'i589':'i539'} caseNo="EAC2390156712" country="Iran" year="2025" dense/>
          <ApprovalLetter kind={kind==='asylum'?'i589':'i539'} caseNo="MSC2491307834" country="Brazil" year="2025" dense/>
          <ApprovalLetter kind={kind==='asylum'?'i589':'i539'} caseNo="LIN2487001923" country="China" year="2024" dense/>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  StepEligibility, StepDocuments, StepPayment, StepAppointment, StepSuccess,
  DOCS_J1F1, DOCS_ASYLUM,
});
