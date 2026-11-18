import { useState } from 'react';
import { PAYMENT } from '../data.js';

/* =====================================================================
   חלקי תשלום משותפים — לחלון התשלום (PaymentModal) ולדף המשתתף בתשלום קבוצתי (/pay)
   ביט: QR + מספר + העתקת הסכום. PayBox: פתיחת הקבוצה של יניר + העתקת הסכום.
   ===================================================================== */
export const ils = (n) => '₪' + Number(n).toLocaleString('en-US');
const digits = (t) => String(t || '').replace(/\D/g, '');

export const copyText = async (t) => {
  try { await navigator.clipboard.writeText(t); return true; } catch { /* fallback */ }
  try { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch { return false; }
};

export function useCopy() {
  const [copied, setCopied] = useState('');
  const copy = async (key, text) => { if (await copyText(text)) { setCopied(key); setTimeout(() => setCopied((c) => (c === key ? '' : c)), 2500); } };
  return [copied, copy];
}

export function AmountBox({ amt, note, label = 'סכום להעברה', copied, copy }) {
  if (!amt) return null;
  return (
    <div className="pm-num pm-amt">
      <span><small>{label}{note ? <> · {note}</> : null}</small><b dir="ltr">{ils(amt)}</b></span>
      <button type="button" className="pill" onClick={() => copy('amt', String(amt))}>{copied === 'amt' ? 'הועתק ✓' : 'העתקה'}</button>
    </div>
  );
}

export function BitPanel({ amt, note, amountLabel }) {
  const [copied, copy] = useCopy();
  const name = PAYMENT.bitName || PAYMENT.payee || 'יניר סול';
  const onMain = async () => {
    await copy('main', amt ? String(amt) : digits(PAYMENT.bitPhone));
    if (PAYMENT.bitUrl) setTimeout(() => { window.location.href = PAYMENT.bitUrl; }, 350);
  };
  return (
    <>
      {PAYMENT.bitQr && (
        <figure className="pm-qr">
          <span className="pm-qr-img"><img src={PAYMENT.bitQr} alt={'קוד QR לתשלום בביט ל' + name} /></span>
          <figcaption>סורקים עם המצלמה של הטלפון — ביט נפתח ישר על העברה ל<b>{name}</b>.<br />כבר בטלפון? לחיצה ארוכה על הקוד ← "פתיחה בביט", או העברה למספר:</figcaption>
        </figure>
      )}
      {!PAYMENT.bitQr && <p>מעבירים ל<b>{name}</b> למספר:</p>}
      <div className="pm-num"><b dir="ltr">{PAYMENT.bitPhone}</b><button type="button" className="pill" onClick={() => copy('num', digits(PAYMENT.bitPhone))}>{copied === 'num' ? 'הועתק ✓' : 'העתקה'}</button></div>
      <AmountBox amt={amt} note={note} label={amountLabel} copied={copied} copy={copy} />
      <button type="button" className="btn btn-glass pm-app" onClick={onMain}>
        {PAYMENT.bitUrl ? (amt ? 'פתיחת ביט (הסכום יועתק)' : 'פתיחת ביט') : (amt ? 'העתקת הסכום' : 'העתקת המספר')}
      </button>
      <p className="pm-hint">
        {copied === 'main'
          ? (amt ? `הסכום הועתק ✓ — בביט בוחרים "העברה" למספר ${PAYMENT.bitPhone} ומדביקים את הסכום.` : 'המספר הועתק ✓ — בביט בוחרים "העברה" ומדביקים אותו.')
          : (amt ? `בביט בוחרים "העברה" למספר ${PAYMENT.bitPhone} ומדביקים את הסכום.` : 'בביט בוחרים "העברה" ומדביקים את המספר.')}
        {' '}אחר כך חוזרים לכאן ולוחצים "שילמתי".
      </p>
    </>
  );
}

export function CardPanel({ amt, note, amountLabel }) {
  const [copied, copy] = useCopy();
  return (
    <>
      <p>הכפתור פותח את דף התשלום המאובטח של SOL Production באשראי (Hyp). מזינים את הסכום ופרטי הכרטיס, משלמים, וחוזרים לכאן ללחוץ "שילמתי". פרטי הכרטיס לא עוברים דרך האתר.</p>
      <AmountBox amt={amt} note={note} label={amountLabel || 'סכום לתשלום'} copied={copied} copy={copy} />
      <a className="btn btn-glass pm-app" href={PAYMENT.cardUrl} target="_blank" rel="noopener" onClick={() => { if (amt) copy('main', String(amt)); }}>
        {amt ? 'לתשלום באשראי (הסכום יועתק)' : 'לדף התשלום באשראי'}
      </a>
      {amt > 0 && <p className="pm-hint">{copied === 'main' ? 'הסכום הועתק ✓ — בדף התשלום מדביקים אותו בשדה הסכום.' : 'הסכום מועתק אוטומטית — בדף התשלום מדביקים אותו בשדה הסכום.'}</p>}
    </>
  );
}

export function PayboxPanel({ amt, note, amountLabel }) {
  const [copied, copy] = useCopy();
  const payee = PAYMENT.payee || 'יניר סול';
  if (!PAYMENT.payboxUrl) {
    return (
      <>
        <p>מעבירים ל<b>{payee}</b> למספר:</p>
        <div className="pm-num"><b dir="ltr">{PAYMENT.payboxPhone}</b><button type="button" className="pill" onClick={() => copy('num', digits(PAYMENT.payboxPhone))}>{copied === 'num' ? 'הועתק ✓' : 'העתקה'}</button></div>
        <AmountBox amt={amt} note={note} label={amountLabel} copied={copied} copy={copy} />
        <p className="pm-hint">ב-PayBox בוחרים "העברה" למספר ומדביקים את הסכום. אחר כך חוזרים לכאן ולוחצים "שילמתי".</p>
      </>
    );
  }
  return (
    <>
      <p>הכפתור פותח את PayBox ישר על קבוצת התשלום של <b>{payee}</b>. מצטרפים לקבוצה, משלמים את הסכום, וחוזרים לכאן ללחוץ "שילמתי".</p>
      <AmountBox amt={amt} note={note} label={amountLabel} copied={copied} copy={copy} />
      <a className="btn btn-glass pm-app" href={PAYMENT.payboxUrl} target="_blank" rel="noopener" onClick={() => { if (amt) copy('main', String(amt)); }}>
        {amt ? 'פתיחת PayBox (הסכום יועתק)' : 'פתיחת PayBox'}
      </a>
      {amt > 0 && <p className="pm-hint">{copied === 'main' ? 'הסכום הועתק ✓ — ב-PayBox מדביקים אותו בתשלום לקבוצה.' : 'הסכום מועתק אוטומטית — ב-PayBox מדביקים אותו בתשלום לקבוצה.'}</p>}
    </>
  );
}
