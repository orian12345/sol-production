import { useEffect, useRef, useState } from 'react';
import { PAYMENT } from '../data.js';
import { IconClose, IconWA } from './icons.jsx';

/* =====================================================================
   חלון "בחירת אמצעי תשלום" — נפתח אחרי מילוי פרטי ההזמנה.
   אשראי / ביט / קבוצתי → דף תשלום מאובטח של Morning (כשמחובר)
   העברה בנקאית / PayBox → פרטים לתשלום, ואז "שילמתי"
   מזומן → התחייבות לתשלום לפני תחילת הסשן
   אחרי כל אחד מהם → הסכם ותקנון לחתימה.
   ===================================================================== */
const ils = (n) => '₪' + Number(n).toLocaleString('en-US');
const ico = (d) => <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;

export function PaymentModal({ open, onClose, deposit, online, demo, onOnline, onGroup, onOffline }) {
  const [method, setMethod] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [people, setPeople] = useState(3);
  const [links, setLinks] = useState(null); // { urls, partAmount }
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) { setMethod(''); setErr(''); setLinks(null); setBusy(false); return; }
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => boxRef.current?.focus(), 30);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;

  const bank = PAYMENT.bank || {};
  const hasBank = !!(bank.account || demo);
  const hasPaybox = !!(PAYMENT.payboxUrl || demo);
  const run = async (fn) => {
    setErr(''); setBusy(true);
    try { const r = await fn(); if (typeof r === 'string') setErr(r); else if (r && r.urls) setLinks(r); }
    catch { setErr('משהו השתבש. נסו שוב או שלחו הודעה ליניר בוואטסאפ.'); }
    setBusy(false);
  };

  const METHODS = [
    { id: 'card', label: 'כרטיס אשראי', sub: online ? 'תשלום מאובטח' : 'יופעל בקרוב', on: online, icon: ico(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>) },
    { id: 'bit', label: 'ביט', sub: online ? 'תשלום מאובטח' : 'יופעל בקרוב', on: online, icon: ico(<><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10 18h4" /></>) },
    { id: 'paybox', label: 'PayBox', sub: hasPaybox ? 'דרך האפליקציה' : 'יופעל בקרוב', on: hasPaybox, icon: ico(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M8 3h8" /></>) },
    { id: 'bank', label: 'העברה בנקאית', sub: hasBank ? 'לחשבון העסק' : 'יופעל בקרוב', on: hasBank, icon: ico(<><path d="M3 10l9-6 9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18" /></>) },
    { id: 'group', label: 'תשלום קבוצתי', sub: online ? 'כל משתתף משלם חלק' : 'יופעל בקרוב', on: online, icon: ico(<><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c2.8 0 5 2 5 5" /></>) },
    { id: 'cash', label: 'מזומן', sub: 'משלמים באולפן לפני הסשן', on: true, icon: ico(<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></>) },
  ];

  return (
    <div className="pm-back" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pm glass" role="dialog" aria-modal="true" aria-labelledby="pm-title" tabIndex={-1} ref={boxRef}>
        <div className="pm-head">
          <h3 id="pm-title" className="d">איך תרצו לשלם?</h3>
          <button type="button" className="icon-btn" aria-label="סגירה" onClick={onClose}><IconClose /></button>
        </div>
        {demo && <p className="pm-demo">מצב הדגמה — אין תשלום אמיתי.</p>}
        {deposit > 0 && online && <p className="pm-sub">לשריון התאריך באשראי / ביט משלמים מקדמה של <b>{ils(deposit)}</b>. אחרי התשלום חותמים על ההסכם ותנאי הביטול.</p>}
        {!(deposit > 0 && online) && <p className="pm-sub">בוחרים אמצעי תשלום, ואחר כך חותמים על ההסכם ותנאי הביטול.</p>}

        {!method && (
          <div className="pm-grid">
            {METHODS.map((m) => (
              <button key={m.id} type="button" className="pm-opt" disabled={!m.on} onClick={() => { setErr(''); setMethod(m.id); }}>
                <span className="pm-ico">{m.icon}</span>
                <span className="pm-txt"><b>{m.label}</b><small>{m.sub}</small></span>
              </button>
            ))}
          </div>
        )}

        {method && (
          <div className="pm-step">
            <button type="button" className="pm-backlink" onClick={() => { setMethod(''); setErr(''); setLinks(null); }}>→ חזרה לאמצעי התשלום</button>

            {(method === 'card' || method === 'bit') && (
              <>
                <h4>{method === 'card' ? 'תשלום בכרטיס אשראי' : 'תשלום בביט'}</h4>
                <p>נעבור לדף תשלום מאובטח של Morning{deposit > 0 ? <> לתשלום מקדמה של <b>{ils(deposit)}</b></> : null}. הקבלה תישלח אליך אוטומטית, ואחרי התשלום נחזור לכאן לחתימה על ההסכם.</p>
                <button type="button" className="btn btn-main" disabled={busy} onClick={() => run(() => onOnline(method === 'card' ? 100 : 120, method === 'card' ? 'כרטיס אשראי' : 'ביט'))}>
                  {busy ? 'פותחים את דף התשלום…' : 'למעבר לתשלום מאובטח'}
                </button>
              </>
            )}

            {method === 'group' && !links && (
              <>
                <h4>תשלום קבוצתי</h4>
                <p>המקדמה מתחלקת שווה בין המשתתפים. כל אחד מקבל קישור תשלום משלו — אפשר לשלוח לו בוואטסאפ. השעה נשמרת ל-60 דקות עד שמשולם החלק הראשון.</p>
                <label className="lbl" htmlFor="pm-people">כמה משתתפים?</label>
                <div className="pm-people">
                  <button type="button" className="icon-btn" aria-label="פחות משתתפים" onClick={() => setPeople((p) => Math.max(2, p - 1))}>−</button>
                  <output id="pm-people" aria-live="polite">{people}</output>
                  <button type="button" className="icon-btn" aria-label="יותר משתתפים" onClick={() => setPeople((p) => Math.min(10, p + 1))}>+</button>
                  {deposit > 0 && <span className="pm-each">{ils(Math.ceil(deposit / people))} לכל משתתף</span>}
                </div>
                <button type="button" className="btn btn-main" disabled={busy} onClick={() => run(() => onGroup(people))}>{busy ? 'יוצרים קישורים…' : 'יצירת קישורי תשלום'}</button>
              </>
            )}
            {method === 'group' && links && (
              <>
                <h4>קישורי תשלום – {links.urls.length} משתתפים</h4>
                <p>שלחו לכל משתתף את הקישור שלו{links.partAmount ? <> ({ils(links.partAmount)} לכל אחד)</> : null}. השעה משוריינת ברגע שהתשלום הראשון עובר.</p>
                <ol className="pm-links">
                  {links.urls.map((u, i) => (
                    <li key={u}>
                      <span>משתתף {i + 1}</span>
                      <a className="pill" href={u} target="_blank" rel="noopener">פתיחה</a>
                      <a className="pill" href={'https://wa.me/?text=' + encodeURIComponent(`קישור לתשלום החלק שלך בסשן ב-SOL Production: ${u}`)} target="_blank" rel="noopener"><IconWA size={16} />שליחה</a>
                    </li>
                  ))}
                </ol>
                <button type="button" className="btn btn-main" onClick={() => onOffline('group', `תשלום קבוצתי (${links.urls.length} משתתפים)`, 'ממתין לתשלומי המשתתפים')}>המשך לחתימה על ההסכם</button>
              </>
            )}

            {method === 'paybox' && (
              <>
                <h4>תשלום ב-PayBox</h4>
                <p>פותחים את דף התשלום של SOL Production ב-PayBox, משלמים, וחוזרים לכאן ללחוץ "שילמתי". השריון סופי אחרי שיניר מאשר שהתשלום התקבל.</p>
                <a className="btn btn-glass" href={PAYMENT.payboxUrl || '#'} target="_blank" rel="noopener" onClick={(e) => { if (!PAYMENT.payboxUrl) e.preventDefault(); }}>פתיחת PayBox</a>
                <button type="button" className="btn btn-main" disabled={busy} onClick={() => run(() => onOffline('paybox', 'PayBox', 'שולם ב-PayBox – ממתין לאישור יניר'))}>שילמתי – להמשך</button>
              </>
            )}

            {method === 'bank' && (
              <>
                <h4>העברה בנקאית</h4>
                <dl className="pm-bank">
                  <div><dt>בנק</dt><dd>{bank.bankName || (demo ? 'לדוגמה' : '')}</dd></div>
                  <div><dt>סניף</dt><dd dir="ltr">{bank.branch || (demo ? '000' : '')}</dd></div>
                  <div><dt>חשבון</dt><dd dir="ltr">{bank.account || (demo ? '000000' : '')}</dd></div>
                  <div><dt>על שם</dt><dd>{bank.holder || (demo ? 'יניר סול' : '')}</dd></div>
                </dl>
                <p>אחרי ההעברה לוחצים "ביצעתי העברה". השריון סופי אחרי שיניר מאשר שהתשלום התקבל.</p>
                <button type="button" className="btn btn-main" disabled={busy} onClick={() => run(() => onOffline('bank', 'העברה בנקאית', 'הועבר בהעברה בנקאית – ממתין לאישור יניר'))}>ביצעתי העברה – להמשך</button>
              </>
            )}

            {method === 'cash' && (
              <>
                <h4>תשלום במזומן</h4>
                <p>משלמים את מלוא הסכום במזומן באולפן <b>לפני תחילת הסשן</b>. בשלב הבא חותמים על ההסכם, כולל התחייבות לתשלום לפני תחילת הסשן ותנאי הביטול.</p>
                <button type="button" className="btn btn-main" disabled={busy} onClick={() => run(() => onOffline('cash', 'מזומן', 'מזומן – ישולם באולפן לפני תחילת הסשן'))}>{busy ? 'רגע…' : 'להמשך לחתימה על ההסכם'}</button>
              </>
            )}

            {err && <p role="alert" className="pm-err">{err}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
