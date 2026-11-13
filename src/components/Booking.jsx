import { useEffect, useState } from 'react';
import { SERVICES, BANDS, DURS, waLink } from '../data.js';
import { IconWA, IconClose } from './icons.jsx';
import { TERMS } from '../terms.js';

const OPEN = 10, CLOSE = 23;
const ERRORS = {
  missing_contact: 'צריך למלא שם מלא ומספר טלפון תקין.',
  bad_slot: 'בחרו תאריך ושעת התחלה (לפחות שעה מעכשיו).',
  slot_taken: 'השעה הזו נתפסה הרגע — בחרו שעה אחרת.',
  payment_unavailable: 'לא הצלחנו לפתוח את דף התשלום. נסו שוב או שלחו הודעה בוואטסאפ.',
};

/* טופס ההזמנה.
   כשהשרת מחובר ל-Morning וליומן של יניר: מציג רק שעות פנויות, ומשריין רק אחרי תשלום מקדמה.
   כשלא מחובר (או באתר בלי שרת): עובד כמו קודם — הודעה מוכנה לוואטסאפ (ההודעה עצמה לא מוצגת ללקוח, רק סיכום). */
export function Booking({ st, setSt }) {
  const set = (patch) => setSt((s) => ({ ...s, ...patch }));
  const [cfg, setCfg] = useState({ configured: false, deposit: 0, policy: '' });
  const [slots, setSlots] = useState(null);       // null = עוד לא נטען / לא רלוונטי
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState('');       // 'booked' | 'failed'

  const paid = cfg.configured;
  const services = st.services && st.services.length ? st.services : ['rehearsal'];
  const selected = st.selected || [];
  const isReh = services.includes('rehearsal');
  const showHours = paid || isReh || services.includes('write');
  // לחיצה על שירות מוסיפה/מורידה אותו (תמיד נשאר לפחות אחד)
  const toggleSvc = (id) => set({ services: services.includes(id) ? (services.length > 1 ? services.filter((x) => x !== id) : services) : [...services, id] });
  const removeSel = (id) => set({ selected: selected.filter((x) => x.id !== id) });
  const dur = parseInt(st.dur, 10) || 2;

  // מצב הדגמה (?demo=1): מראה את תהליך השריון בלי תשלום אמיתי ובלי לגעת ביומן
  const [demo, setDemo] = useState(false);

  // האם יש שרת הזמנות + חזרה מדף התשלום
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('demo')) {
      setDemo(true);
      setCfg({ configured: true, deposit: 200, policy: '' });
      setTimeout(() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' }), 100);
      return;
    }
    if (q.get('booked')) setResult('booked');
    else if (q.get('payfail')) setResult('failed');
    if (q.get('booked') || q.get('payfail')) {
      const u = new URL(window.location.href);
      u.searchParams.delete('booked'); u.searchParams.delete('payfail');
      window.history.replaceState(null, '', u.pathname + u.search + u.hash);
      setTimeout(() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    fetch('/api/availability').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) setCfg(j); }).catch(() => {});
  }, []);

  // שעות פנויות מהיומן של יניר
  useEffect(() => {
    if (!paid || !st.date) { setSlots(null); return; }
    let live = true;
    setLoadingSlots(true);
    if (demo) {
      // הדגמה: 14:00–17:00 "תפוסות"
      const t = setTimeout(() => {
        if (!live) return;
        const s = [];
        for (let h = OPEN; h + dur <= CLOSE; h++) s.push({ time: (h < 10 ? '0' : '') + h + ':00', free: !(h + dur > 14 && h < 18) });
        setSlots(s); setLoadingSlots(false);
      }, 400);
      return () => { live = false; clearTimeout(t); };
    }
    fetch(`/api/availability?date=${st.date}&dur=${dur}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live) setSlots(j && j.slots ? j.slots : []); })
      .catch(() => { if (live) setSlots([]); })
      .finally(() => { if (live) setLoadingSlots(false); });
    return () => { live = false; };
  }, [paid, demo, st.date, dur]);

  const allTimes = [];
  for (let h = OPEN; h + dur <= CLOSE; h++) allTimes.push((h < 10 ? '0' : '') + h + ':00');
  const freeOf = (t) => !slots || !!(slots.find((s) => s.time === t) || {}).free;
  const time = paid
    ? (slots && freeOf(st.time) && allTimes.includes(st.time) ? st.time : '')
    : (allTimes.includes(st.time) ? st.time : allTimes[allTimes.length - 1]);

  let dateLabel = 'גמיש – נתאם יחד';
  if (st.date) { const p = st.date.split('-'); dateLabel = `${p[2]}/${p[1]}/${p[0]}`; }
  const name = st.name.trim(), notes = st.notes.trim();
  const svcLabel = SERVICES.filter(([id]) => services.includes(id)).map(([, l]) => l).join(' + ');
  const durLabel = DURS.find((x) => x[0] === st.dur)[1];

  const lines = ['היי יניר, אשמח לשריין סשן ב־SOL Production:', '', (services.length > 1 ? '• שירותים: ' : '• שירות: ') + svcLabel];
  if (selected.length) { lines.push('• מהמחירון:'); selected.forEach((x) => lines.push(`   – ${x.name} (${x.price})`)); }
  if (isReh) {
    lines.push('• הרכב: ' + st.band);
    lines.push('• הקלטת ערוצים מלאה (Multi-Track): ' + (st.rec ? 'כן' : 'לא'));
  }
  lines.push('• תאריך: ' + dateLabel);
  if (showHours) lines.push('• שעת התחלה: ' + (time || '—'), '• משך: ' + durLabel);
  lines.push('• שם: ' + (name || '—'));
  if (st.phone && st.phone.trim()) lines.push('• טלפון: ' + st.phone.trim());
  if (notes) lines.push('• הערות: ' + notes);
  lines.push('', 'תודה!');
  const msg = lines.join('\n');

  // הצעת מחיר + אישור תקנון (מוצג ללקוחות רק אחרי שהתקנון אושר — אחרת רק בהדגמה)
  const showQuote = TERMS.approved || demo;
  const openQuote = () => {
    const data = {
      svcLabel, selected, date: st.date, time: showHours ? time : '', dur: String(dur), durLabel: showHours ? durLabel : '',
      band: isReh ? st.band : '', rec: isReh && st.rec, isReh, name, phone: (st.phone || '').trim(), email: (st.email || '').trim(), notes, demo,
    };
    window.location.href = '/quote#q=' + encodeURIComponent(JSON.stringify(data));
  };

  const canPay = paid && st.date && time && name && (st.phone || '').replace(/\D/g, '').length >= 9;

  const pay = async () => {
    setErr('');
    if (!canPay) { setErr(!st.date || !time ? ERRORS.bad_slot : ERRORS.missing_contact); return; }
    setPaying(true);
    if (demo) {
      // הדגמה: במקום דף התשלום — מדלגים ישר להודעת ההצלחה
      setTimeout(() => {
        setPaying(false); setResult('booked');
        document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
      }, 1200);
      return;
    }
    try {
      const r = await fetch('/api/book', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          serviceLabel: svcLabel, selected: selected.map((x) => `${x.name} (${x.price})`).join(' · '),
          date: st.date, time, dur, name, phone: st.phone, email: st.email, notes,
          band: isReh ? st.band : '', rec: isReh && st.rec,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) { window.location.href = j.url; return; }
      setErr(ERRORS[j.error] || ERRORS.payment_unavailable);
      if (j.error === 'slot_taken') setSlots((s) => (s ? s.map((x) => (x.time === time ? { ...x, free: false } : x)) : s));
    } catch {
      setErr(ERRORS.payment_unavailable);
    }
    setPaying(false);
  };

  const pill = (on, onClick, label, key, disabled) => (
    <button key={key ?? label} type="button" className="pill" aria-pressed={on} onClick={onClick} disabled={disabled}>{label}</button>
  );

  return (
    <section id="booking" className="wrap sec" aria-labelledby="booking-title" style={{ paddingTop: 0 }}>
      <div className="sec-head">
        <span className="chip">{paid ? 'הזמנה ותשלום מקדמה' : 'הזמנה חכמה · וואטסאפ'}</span>
        <h2 id="booking-title" className="d h2">בונים את הסשן שלכם</h2>
        <p className="lead">
          {paid
            ? 'בוחרים שירות, תאריך ושעה פנויה — משלמים מקדמה, והתאריך משוריין.'
            : 'בוחרים שירות, תאריך ומשך — ההודעה נכתבת לבד ונשלחת ישר ליניר בוואטסאפ.'}
        </p>
      </div>

      {demo && (
        <div className="notice demo" role="note">
          <strong>מצב הדגמה</strong>
          <span>כך ייראה השריון ללקוחות. אין כאן תשלום אמיתי ושום דבר לא נכנס ליומן — במקום דף התשלום של Morning קופצים ישר להודעת האישור.</span>
        </div>
      )}
      {result === 'booked' && (
        <div className="notice ok" role="status">
          <strong>התאריך שוריין ✓</strong>
          <span>יניר יצור איתך קשר בהקדם.</span>
          <button type="button" className="icon-btn" aria-label="סגירת ההודעה" onClick={() => setResult('')}><IconClose /></button>
        </div>
      )}
      {result === 'failed' && (
        <div className="notice bad" role="alert">
          <strong>התשלום לא הושלם</strong>
          <span>התאריך לא שוריין. אפשר לנסות שוב, או לשלוח הודעה ליניר בוואטסאפ.</span>
          <button type="button" className="icon-btn" aria-label="סגירת ההודעה" onClick={() => setResult('')}><IconClose /></button>
        </div>
      )}

      <div className="bk">
        <form className="glass" noValidate onSubmit={(e) => { e.preventDefault(); if (paid) pay(); }}>
          <fieldset>
            <legend className="lbl">1 · מה תרצו? (אפשר לבחור כמה)</legend>
            <div className="opts scroll-x">
              {SERVICES.map(([id, label]) => pill(services.includes(id), () => toggleSvc(id), label, id))}
            </div>
          </fieldset>

          {isReh && (
            <div className="subbox">
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div id="rec-lbl" style={{ font: '700 16px Heebo' }}>הוספת הקלטת ערוצים מלאה</div>
                  <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>Multi-Track Live Recording באיכות אולפן</div>
                </div>
                <button type="button" className="sw" role="switch" aria-checked={st.rec} aria-labelledby="rec-lbl" onClick={() => set({ rec: !st.rec })}><span /></button>
              </div>
              <fieldset>
                <legend className="lbl">גודל ההרכב</legend>
                <div className="opts">{BANDS.map((b) => pill(st.band === b, () => set({ band: b }), b))}</div>
              </fieldset>
            </div>
          )}

          <div className="two">
            <div>
              <label className="lbl" htmlFor="bk-date">2 · תאריך</label>
              <input id="bk-date" className="field" type="date" value={st.date} onChange={(e) => set({ date: e.target.value })} />
            </div>
            {showHours && (
              <fieldset>
                <legend className="lbl">משך הסשן</legend>
                <div className="opts">{DURS.map(([id, label]) => pill(st.dur === id, () => set({ dur: id }), label, id))}</div>
              </fieldset>
            )}
          </div>

          {showHours && (
            <fieldset>
              <legend className="lbl">3 · שעת התחלה{paid ? ' (רק שעות פנויות)' : ''}</legend>
              {paid && !st.date && <p className="note" style={{ margin: 0 }}>בחרו קודם תאריך כדי לראות שעות פנויות.</p>}
              {paid && st.date && loadingSlots && <p className="note" style={{ margin: 0 }}>בודקים ביומן…</p>}
              {paid && st.date && !loadingSlots && slots && !slots.some((s) => s.free) && (
                <p className="note" style={{ margin: 0 }}>אין שעות פנויות ביום הזה במשך שנבחר. נסו יום אחר או משך קצר יותר.</p>
              )}
              {(!paid || (st.date && !loadingSlots && slots)) && (
                <div className="opts scroll-x" dir="ltr" style={{ justifyContent: 'flex-end' }}>
                  {allTimes.map((t) => {
                    const free = !paid || freeOf(t);
                    return pill(time === t, () => set({ time: t }), free ? t : t + ' · תפוס', t, !free);
                  })}
                </div>
              )}
            </fieldset>
          )}

          <div className="two">
            <div>
              <label className="lbl" htmlFor="bk-name">4 · שם מלא</label>
              <input id="bk-name" className="field" type="text" autoComplete="name" placeholder="איך קוראים לך?" value={st.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div>
              <label className="lbl" htmlFor="bk-phone">טלפון{paid ? '' : ' (לא חובה)'}</label>
              <input id="bk-phone" className="field" type="tel" dir="ltr" autoComplete="tel" placeholder="050-0000000" value={st.phone} onChange={(e) => set({ phone: e.target.value })} />
            </div>
            {paid && (
              <div>
                <label className="lbl" htmlFor="bk-email">מייל לקבלה (לא חובה)</label>
                <input id="bk-email" className="field" type="email" dir="ltr" autoComplete="email" placeholder="name@example.com" value={st.email} onChange={(e) => set({ email: e.target.value })} />
              </div>
            )}
            <div>
              <label className="lbl" htmlFor="bk-notes">הערות (לא חובה)</label>
              <input id="bk-notes" className="field" type="text" placeholder="שם חתן/כלת השמחה, שם הלהקה, ז'אנר…" value={st.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
          </div>
        </form>

        <aside className="glass" aria-labelledby="pv-title">
          {selected.length > 0 && (
            <div className="sel-list">
              <span className="lbl" style={{ margin: 0 }}>מהמחירון ({selected.length})</span>
              {selected.map((x) => (
                <div key={x.id} className="selbox">
                  <span style={{ fontSize: 14 }}>{x.name + ' · ' + x.price}</span>
                  <button type="button" className="icon-btn" aria-label={'הסרת ' + x.name} onClick={() => removeSel(x.id)}><IconClose /></button>
                </div>
              ))}
            </div>
          )}

          {paid ? (
            <>
              <h3 id="pv-title" className="d" style={{ margin: 0, fontSize: 22 }}>סיכום ושריון</h3>
              <ul className="ticks" style={{ fontSize: 15 }}>
                {SERVICES.filter(([id]) => services.includes(id)).map(([id, l]) => <li key={id}>{l}</li>)}
                <li>{st.date ? `${dateLabel}${time ? ' · ' + time : ''} · ${durLabel}` : 'תאריך — עוד לא נבחר'}</li>
                <li>{name || 'שם — עוד לא הוזן'}</li>
              </ul>
              <div className="prow"><span className="price">₪{cfg.deposit.toLocaleString('en-US')}</span><span className="unit">מקדמה לשריון התאריך</span></div>
              <button type="button" className="btn btn-main" style={{ width: '100%' }} onClick={pay} disabled={paying} aria-busy={paying}>
                {paying ? 'פותחים את דף התשלום…' : 'לתשלום מקדמה ושריון התאריך'}
              </button>
              {err && <p role="alert" style={{ margin: 0, fontSize: 14, color: '#fca5a5', textAlign: 'center' }}>{err}</p>}
              <p className="note" style={{ margin: 0, textAlign: 'center' }}>
                התאריך משוריין רק אחרי שהתשלום עובר. התשלום מאובטח דרך Morning, והקבלה נשלחת אליך אוטומטית.
                {cfg.policy ? ' ' + cfg.policy : ''}
              </p>
              <a className="btn btn-glass btn-sm" href={waLink(msg)} target="_blank" rel="noopener" style={{ width: '100%' }}><IconWA size={18} />שאלה ליניר בוואטסאפ</a>
            </>
          ) : (
            <>
              <h3 id="pv-title" className="d" style={{ margin: 0, fontSize: 22 }}>סיכום ההזמנה</h3>
              <ul className="ticks" style={{ fontSize: 15 }} aria-live="polite">
                {SERVICES.filter(([id]) => services.includes(id)).map(([id, l]) => <li key={id}>{l}</li>)}
                <li>{dateLabel}{showHours ? ` · ${time} · ${durLabel}` : ''}</li>
                {isReh && <li>{st.band} · הקלטת ערוצים: {st.rec ? 'כן' : 'לא'}</li>}
                <li>{name || 'שם — עוד לא הוזן'}</li>
              </ul>
              <a className="btn btn-wa" href={waLink(msg)} target="_blank" rel="noopener" style={{ width: '100%' }}>
                <IconWA />שליחת ההזמנה ליניר
              </a>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
                {name ? 'הכול מוכן — לחיצה אחת ונפתח וואטסאפ עם כל הפרטים.' : 'טיפ: הוסיפו שם כדי שיניר ידע למי לחזור.'}
              </p>
            </>
          )}
          {showQuote && (
            <button type="button" className="btn btn-glass btn-sm" style={{ width: '100%' }} onClick={openQuote}>
              הצעת מחיר ואישור תנאים (PDF)
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}
