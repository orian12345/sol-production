import { useEffect, useRef, useState } from 'react';
import { Layout, Brand } from '../components/Layout.jsx';
import { IconWA } from '../components/icons.jsx';
import { ALL_ITEMS, WA, waLink } from '../data.js';
import { TERMS } from '../terms.js';

/* =====================================================================
   הצעת מחיר + אישור תקנון בחתימה דיגיטלית
   מגיעים לכאן מטופס ההזמנה: /quote#q=<פרטי ההזמנה>
   אחרי חתימה: /quote?a=<מזהה> — עותק חתום שנשמר בשרת (אפשר לשלוח ליניר)
   ===================================================================== */

const num = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;
const ils = (n) => '₪' + n.toLocaleString('en-US');
const fmtDate = (d) => { if (!d) return 'גמיש – נתאם יחד'; const p = d.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };
const fmtStamp = (ms) => new Date(ms).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' });

function quoteLines(q) {
  const it = q.selected && ALL_ITEMS.find((x) => x.id === q.selected.id);
  if (!it) return { lines: [{ desc: q.svcLabel, qty: '', unit: '', total: 'ייקבע מול יניר' }], total: null };
  if (it.quote) return { lines: [{ desc: it.name, qty: '', unit: '', total: 'לפי הצעת מחיר אישית' }], total: null };
  if (/–/.test(it.price)) return { lines: [{ desc: it.name, qty: '', unit: it.price, total: it.price }], total: null };
  const unitPrice = num(it.price);
  const hourly = it.unit === 'לשעה';
  const qty = hourly ? (parseInt(q.dur, 10) || 1) : 1;
  return {
    lines: [{ desc: it.name + (it.desc ? ' – ' + it.desc : ''), qty: hourly ? `${qty} שעות` : '1', unit: ils(unitPrice) + (it.unit ? ' ' + it.unit : ''), total: ils(unitPrice * qty) }],
    total: unitPrice * qty,
  };
}

function SignaturePad({ onChange }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const c = ref.current;
    const ratio = window.devicePixelRatio || 1;
    const w = c.offsetWidth, h = c.offsetHeight;
    c.width = w * ratio; c.height = h * ratio;
    const ctx = c.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0c1024';
    // בטלפון: לא לגלול את הדף בזמן שחותמים עם האצבע (חייב מאזין לא-פסיבי — touch-action לבד לא מספיק בכל המכשירים)
    const stop = (e) => { if (e.cancelable) e.preventDefault(); };
    c.addEventListener('touchstart', stop, { passive: false });
    c.addEventListener('touchmove', stop, { passive: false });
    return () => { c.removeEventListener('touchstart', stop); c.removeEventListener('touchmove', stop); };
  }, []);

  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e) => { e.preventDefault(); ref.current.setPointerCapture(e.pointerId); drawing.current = true; const ctx = ref.current.getContext('2d'); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e) => { if (!drawing.current) return; const ctx = ref.current.getContext('2d'); const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); dirty.current = true; };
  const up = () => { if (!drawing.current) return; drawing.current = false; if (dirty.current) onChange(ref.current.toDataURL('image/png')); };
  const clear = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); dirty.current = false; onChange(''); };

  return (
    <div className="sig">
      <canvas ref={ref} className="sig-pad" aria-label="משטח חתימה – חתמו עם האצבע או העכבר" role="img"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} />
      <button type="button" className="pill no-print" onClick={clear}>ניקוי חתימה</button>
    </div>
  );
}

export default function Quote() {
  const [q, setQ] = useState(null);          // פרטי ההזמנה
  const [signed, setSigned] = useState(null); // עותק חתום {id?, signer, signature, signedAt, termsVersion}
  const [state, setState] = useState('loading');
  const [agree, setAgree] = useState(false);
  const [signer, setSigner] = useState('');
  const [sig, setSig] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [meta, setMeta] = useState({ number: '', issued: 0 });

  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get('a');
    if (a) {
      fetch('/api/agreement/' + encodeURIComponent(a)).then((r) => (r.ok ? r.json() : null)).then((j) => {
        if (!j) { setState('missing'); return; }
        setQ(j.quote); setMeta({ number: j.number, issued: j.signedAt }); setSigned(j); setState('ready');
      }).catch(() => setState('missing'));
      return;
    }
    const m = window.location.hash.match(/q=([^&]+)/);
    if (!m) { setState('missing'); return; }
    try {
      const data = JSON.parse(decodeURIComponent(m[1]));
      setQ(data); setSigner(data.name || '');
      const now = Date.now();
      const d = new Date(now);
      setMeta({ number: `SOL-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`, issued: now });
      setState('ready');
    } catch { setState('missing'); }
  }, []);

  if (state !== 'ready' || !q) {
    return (
      <Layout>
        <main className="wrap quote-page">
          <div className="quote-top no-print"><Brand href="/" /></div>
          <div className="glass quote">
            <p style={{ margin: 0 }}>{state === 'loading' ? 'טוען…' : 'לא נמצאה הצעת מחיר. חזרו לטופס ההזמנה באתר ובחרו "הצעת מחיר ואישור תנאים".'}</p>
            {state === 'missing' && <a className="btn btn-main btn-sm" href="/#booking">לטופס ההזמנה</a>}
          </div>
        </main>
      </Layout>
    );
  }

  const { lines, total } = quoteLines(q);
  const validUntil = new Date(meta.issued + TERMS.quote.validDays * 86400000).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const termsVersion = signed ? signed.termsVersion : TERMS.version;
  const canSign = agree && signer.trim().length >= 2 && sig;

  const submit = async () => {
    setErr('');
    if (!canSign) { setErr('כדי לחתום: סמנו שקראתם ומסכימים, כתבו שם מלא וחתמו במסגרת.'); return; }
    setBusy(true);
    const record = { number: meta.number, quote: q, signer: signer.trim(), signature: sig, termsVersion: TERMS.version, terms: TERMS.sections, signedAt: Date.now() };
    if (q.demo) { setSigned(record); setBusy(false); return; }
    try {
      const r = await fetch('/api/agreement', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(record) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.id) {
        const done = { ...record, id: j.id, signedAt: j.signedAt || record.signedAt };
        setSigned(done);
        window.history.replaceState(null, '', '/quote?a=' + j.id);
      } else {
        setSigned(record); // נשמר מקומית בלבד — עדיין אפשר להוריד PDF ולשלוח ליניר
      }
    } catch { setSigned(record); }
    setBusy(false);
  };

  const link = signed && signed.id ? `${window.location.origin}/quote?a=${signed.id}` : '';
  const waMsg = [
    `היי יניר, אישרתי את הצעת המחיר ותקנון האולפן (${meta.number}).`,
    `שירות: ${q.selected ? q.selected.name : q.svcLabel}`,
    `תאריך: ${fmtDate(q.date)}${q.time ? ' ' + q.time : ''}`,
    `שם: ${signed ? signed.signer : signer}`,
    link ? `העותק החתום: ${link}` : 'שמרתי עותק חתום כ-PDF.',
  ].join('\n');

  return (
    <Layout>
      <main className="wrap quote-page">
        <div className="quote-top no-print">
          <Brand href="/" />
          <a className="btn btn-glass btn-sm" href="/#booking">חזרה לאתר</a>
        </div>

        {q.demo && <div className="notice demo no-print"><strong>מצב הדגמה</strong><span>כך תיראה הצעת המחיר והחתימה. בהדגמה שום דבר לא נשמר בשרת.</span></div>}

        <article className="glass quote">
          <header className="q-head">
            <div>
              <h1 className="d">הצעת מחיר</h1>
              <div className="q-meta">מס׳ {meta.number} · הונפקה {new Date(meta.issued).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })} · בתוקף עד {validUntil}</div>
            </div>
            <div className="q-biz">
              <strong>{TERMS.business.name}</strong>
              <span>{TERMS.business.address}</span>
              <span dir="ltr">{TERMS.business.phone}</span>
              {TERMS.business.taxId && <span>ע.מ {TERMS.business.taxId}</span>}
            </div>
          </header>

          <section className="q-block">
            <h2>פרטי הלקוח וההזמנה</h2>
            <dl className="q-dl">
              <div><dt>שם</dt><dd>{q.name || '—'}</dd></div>
              {q.phone && <div><dt>טלפון</dt><dd dir="ltr">{q.phone}</dd></div>}
              {q.email && <div><dt>מייל</dt><dd dir="ltr">{q.email}</dd></div>}
              <div><dt>שירות</dt><dd>{q.svcLabel}</dd></div>
              <div><dt>מועד</dt><dd>{fmtDate(q.date)}{q.time ? ` · ${q.time}` : ''}{q.durLabel ? ` · ${q.durLabel}` : ''}</dd></div>
              {q.isReh && <div><dt>הרכב</dt><dd>{q.band} · הקלטת ערוצים מלאה: {q.rec ? 'כן' : 'לא'}</dd></div>}
              {q.notes && <div><dt>הערות</dt><dd>{q.notes}</dd></div>}
            </dl>
          </section>

          <section className="q-block">
            <h2>פירוט</h2>
            <table className="q-table">
              <thead><tr><th>תיאור</th><th>כמות</th><th>מחיר</th><th>סה״כ</th></tr></thead>
              <tbody>
                {lines.map((l, i) => <tr key={i}><td>{l.desc}</td><td>{l.qty}</td><td>{l.unit}</td><td>{l.total}</td></tr>)}
              </tbody>
              {total != null && <tfoot><tr><td colSpan="3">סה״כ לתשלום</td><td>{ils(total)}</td></tr></tfoot>}
            </table>
            {TERMS.quote.vatNote && <p className="q-note">{TERMS.quote.vatNote}</p>}
            {!q.selected && <p className="q-note">לא נבחרה חבילה מהמחירון – המחיר הסופי ייקבע מול יניר סול.</p>}
          </section>

          <section className="q-block">
            <h2>תקנון האולפן וזכויות יוצרים <span className="q-ver">גרסה {termsVersion}</span></h2>
            {(signed && signed.terms ? signed.terms : TERMS.sections).map((s) => (
              <div key={s.title} className="q-terms">
                <h3>{s.title}</h3>
                <ul>{s.items.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            ))}
          </section>

          <section className="q-block">
            <h2>אישור וחתימה</h2>
            {signed ? (
              <div className="q-signed">
                <p>אני, <strong>{signed.signer}</strong>, קראתי את הצעת המחיר ואת תקנון האולפן (גרסה {signed.termsVersion}) ואני מאשר/ת אותם.</p>
                <img src={signed.signature} alt={'החתימה של ' + signed.signer} className="sig-img" />
                <p className="q-meta">נחתם דיגיטלית ב-{fmtStamp(signed.signedAt)}{signed.id ? ` · מזהה ${signed.id}` : ''}</p>
              </div>
            ) : (
              <div className="q-sign no-print">
                <label className="q-check">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  <span>קראתי את הצעת המחיר ואת תקנון האולפן, ואני מאשר/ת אותם.</span>
                </label>
                <div>
                  <label className="lbl" htmlFor="q-signer">שם מלא</label>
                  <input id="q-signer" className="field" type="text" autoComplete="name" value={signer} onChange={(e) => setSigner(e.target.value)} />
                </div>
                <div>
                  <span className="lbl">חתימה (עם האצבע או העכבר)</span>
                  <SignaturePad onChange={setSig} />
                </div>
                {err && <p role="alert" className="q-err">{err}</p>}
                <button type="button" className="btn btn-main" onClick={submit} disabled={busy}>{busy ? 'שומרים…' : 'חתימה ואישור'}</button>
              </div>
            )}
          </section>
        </article>

        <div className="q-actions no-print">
          <button type="button" className="btn btn-main" onClick={() => window.print()}>הורדת PDF / הדפסה</button>
          {signed && <a className="btn btn-wa" href={`https://wa.me/${WA}?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener"><IconWA />שליחה ליניר בוואטסאפ</a>}
          {!signed && <a className="btn btn-glass" href={waLink(`היי יניר, יש לי שאלה על הצעת המחיר ${meta.number}`)} target="_blank" rel="noopener"><IconWA size={18} />שאלה ליניר</a>}
        </div>
        <p className="q-hint no-print">טיפ: בחלון ההדפסה בחרו "שמירה כ-PDF" (בטלפון: הדפסה ← שיתוף ← שמירה לקבצים).</p>
      </main>
    </Layout>
  );
}
