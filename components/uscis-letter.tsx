type Kind = "i539" | "i589";

export function ApprovalLetter({
  kind = "i539",
  caseNo,
  country,
  year,
  decision = "APPROVED",
  redacted = true,
  dense = false,
}: {
  kind?: Kind;
  caseNo: string;
  country: string;
  year: string;
  decision?: string;
  redacted?: boolean;
  dense?: boolean;
}) {
  const typeline =
    kind === "i589"
      ? "I-589, APPLICATION FOR ASYLUM AND FOR WITHHOLDING OF REMOVAL"
      : "I-539, APPLICATION TO EXTEND/CHANGE NONIMMIGRANT STATUS";
  const validFor = kind === "i589" ? "Asylum granted" : "F-1 student status";
  const _name = redacted ? "███████ ██████████" : "JANE DOE";
  const _addr1 = redacted ? "████ ██████████ ████" : "1234 EXAMPLE ST";
  const _addr2 = redacted ? "███████████, ██ █████" : "ANYTOWN, NY 10001";
  const _ab = redacted ? "███-███-█████" : "A123-456-789";
  const dateDay = 10 + (parseInt(caseNo?.slice(-2) || "00", 10) % 18);

  return (
    <div className={`uscis ${dense ? "uscis-dense" : ""}`}>
      <div className="uscis-head">
        <div className="uscis-seal" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="100%" height="100%">
            <circle cx="32" cy="32" r="30" fill="none" stroke="#1B3A6E" strokeWidth="1.2" />
            <circle cx="32" cy="32" r="24" fill="none" stroke="#1B3A6E" strokeWidth=".6" />
            <path d="M32 12 L46 32 L32 52 L18 32 Z" fill="#1B3A6E" opacity=".15" />
            <path d="M32 16 L42 32 L32 48 L22 32 Z" fill="none" stroke="#1B3A6E" strokeWidth=".8" />
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
          <div className="stamp-date">{`MAR ${dateDay}, ${year}`}</div>
        </div>
      </div>

      <div className="uscis-titleline">NOTICE OF ACTION</div>

      <div className="uscis-meta">
        <div><b>RECEIPT NUMBER</b><div className="mono">{caseNo}</div></div>
        <div><b>NOTICE DATE</b><div>March {dateDay}, {year}</div></div>
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
        <p className="tiny" style={{ marginTop: 14, opacity: 0.7 }}>
          Country of origin: {country} · Filed via Mongolstay · Counsel of record on file
        </p>
      </div>

      {redacted && (
        <>
          <div className="redact" style={{ top: "42%", left: "8%", width: "42%", height: "1.8%" }} />
          <div className="redact" style={{ top: "45%", left: "8%", width: "48%", height: "1.8%" }} />
          <div className="redact" style={{ top: "48%", left: "8%", width: "36%", height: "1.8%" }} />
        </>
      )}
    </div>
  );
}
