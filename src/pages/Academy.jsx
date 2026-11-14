import { useEffect, useState } from 'react';
import { Layout, Header, Footer, BookBar } from '../components/Layout.jsx';
import { IconWA, IconClose } from '../components/icons.jsx';
import { waLink, ADDRESS, CANCEL_POLICY, findCoupon } from '../data.js';
import { academyData, academyText } from '../academy.js';

const ils = (n) => '₪' + n.toLocaleString('en-US');

// שעות לשיעורי נגינה: מ-14:00, שיעור של שעה, האחרון מתחיל ב-22:00 (האולפן נסגר ב-23:00)
const LESSON_TIMES = Array.from({ length: 9 }, (_, i) => (14 + i) + ':00');
const fmtDate = (d) => { const p = d.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
const todayIL = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

const ERRORS = {
  missing_slot: 'בחרו תאריך ושעה לשיעור.',
  slot_taken: 'השעה הזו נתפסה ביומן האולפן — בחרו שעה אחרת.',
  missing_contact: 'צריך למלא שם מלא ומספר טלפון תקין.',
  payment_unavailable: 'לא הצלחנו לפתוח את דף התשלום. נסו שוב או שלחו הודעה בוואטסאפ.',
};

/* pay = { on, deposit, demo } — מקדמה דרך Morning (כבוי עד שמגדירים ACADEMY_DEPOSIT ומחברים את Morning) */
function TeacherCard({ t, pay, onDemoPaid, onSent, coupon }) {
  // מחיר אחרי קופון (שיעור היכרות כבר במחיר מיוחד — הקופון לא חל עליו)
  const off = (n, x) => (coupon && !(x && x.intro) ? Math.round(n * (100 - coupon.percent) / 100) : n);
  const recommended = t.tiers.find((x) => x.recommended) || t.tiers[0];
  const [tierId, setTierId] = useState(recommended.id);
  const tier = t.tiers.find((x) => x.id === tierId);
  const single = t.tiers.find((x) => x.id === 'single') || t.tiers.find((x) => x.lessons === 1 && !x.intro) || t.tiers[0];
  const perLesson = Math.round(tier.price / tier.lessons);
  const saving = single.price * tier.lessons - tier.price;
  const groupId = 'tier-' + t.id;

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [minDate, setMinDate] = useState('');
  // זמינות לפי יומן האולפן (כשהיומן מחובר): { '17:00': false, ... }
  const [takenMap, setTakenMap] = useState(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!pay.calendar || !date) { setTakenMap(null); return; }
    let live = true;
    setChecking(true);
    const done = (slots) => {
      if (!live) return;
      const m = {}; (slots || []).forEach((s) => { m[s.time] = !s.free; });
      setTakenMap(m); setChecking(false);
      setTime((cur) => (cur && m[cur] ? '' : cur));
    };
    if (pay.demo) { const tm = setTimeout(() => done(LESSON_TIMES.map((h) => ({ time: h, free: h !== '17:00' && h !== '18:00' }))), 300); return () => { live = false; clearTimeout(tm); }; }
    fetch('/api/academy-slots?date=' + date).then((r) => (r.ok ? r.json() : null)).then((j) => done(j && j.slots)).catch(() => done([]));
    return () => { live = false; };
  }, [pay.calendar, pay.demo, date]);
  useEffect(() => setMinDate(todayIL()), []);
  const when = date ? fmtDate(date) + (time ? ' בשעה ' + time : '') : '';
  const [form, setForm] = useState(false);
  const [c, setC] = useState({ name: '', phone: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const finalPrice = off(tier.price, tier);
  const couponOn = !!coupon && !tier.intro;
  const deposit = Math.min(pay.deposit, finalPrice);
  const tierName = `${tier.label}${tier.note ? ` (${tier.note})` : ''}`;
  const priceStr = couponOn ? `${ils(finalPrice)} (במקום ${ils(tier.price)} – קופון ${coupon.label} ${coupon.percent}%)` : ils(tier.price);

  const msg = [
    'היי, אשמח לתאם שיעורי נגינה ב-SOL Academy:',
    '',
    `• כלי: ${t.instrument}`,
    `• מורה: ${t.teacher}`,
    `• חבילה: ${tierName}`,
    `• מחיר: ${priceStr}${!couponOn && tier.lessons > 1 ? ` (${ils(perLesson)} לשיעור)` : ''}`,
    `• מועד מבוקש: ${when || 'גמיש – נתאם יחד'}`,
    '',
    'תודה!',
  ].join('\n');

  // form: false | 'pay' (מקדמה) | 'req' (בקשה בלי תשלום — האתר שולח ליניר בוואטסאפ)
  const [hp, setHp] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (form === 'req') return sendReq();
    if (!date || !time) { setErr(ERRORS.missing_slot); return; }
    if (!c.name.trim() || c.phone.replace(/\D/g, '').length < 9) { setErr(ERRORS.missing_contact); return; }
    setBusy(true);
    if (pay.demo) { setTimeout(() => { setBusy(false); setForm(false); onDemoPaid(); }, 900); return; }
    try {
      const r = await fetch('/api/academy-pay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ teacher: t.teacher, instrument: t.instrument, tier: tierName, price: tier.price, coupon: couponOn ? coupon.code : '', date, time, ...c }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) { window.location.href = j.url; return; }
      setErr(ERRORS[j.error] || ERRORS.payment_unavailable);
      if (j.error === 'slot_taken') { setTakenMap((m) => ({ ...(m || {}), [time]: true })); setTime(''); }
    } catch { setErr(ERRORS.payment_unavailable); }
    setBusy(false);
  };

  const sendReq = async () => {
    if (!c.name.trim() || c.phone.replace(/\D/g, '').length < 9) { setErr(ERRORS.missing_contact); return; }
    setBusy(true);
    if (pay.demo) { setTimeout(() => { setBusy(false); setForm(false); onSent(); }, 700); return; }
    const lines = [
      `כלי: ${t.instrument}`, `מורה: ${t.teacher}`,
      `חבילה: ${tierName} – ${priceStr}`,
      `מועד מבוקש: ${when || 'גמיש – נתאם יחד'}`,
      c.email.trim() && `מייל: ${c.email.trim()}`,
    ].filter(Boolean);
    try {
      const r = await fetch('/api/request', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'academy', name: c.name.trim(), phone: c.phone, lines, website: hp }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { setForm(false); onSent(); }
      else setErr(j.error === 'too_many' ? 'נשלחו יותר מדי בקשות. נסו שוב בעוד שעה או התקשרו.' : 'השליחה לא הצליחה — אפשר לשלוח ישירות בוואטסאפ למטה.');
    } catch { setErr('השליחה לא הצליחה — אפשר לשלוח ישירות בוואטסאפ למטה.'); }
    setBusy(false);
  };

  return (
    <article className="ac-card" aria-labelledby={'ac-h-' + t.id}>
      <header className="ac-head">
        {t.photo
          ? <img className="ac-photo" src={t.photo} alt={t.teacher + ' – ' + t.instrument} width="76" height="76" loading="lazy" style={t.photoPos ? { objectPosition: t.photoPos } : undefined} />
          : <span className="ac-photo ac-photo-empty" aria-hidden="true">{t.teacher.charAt(0)}</span>}
        <div>
          <span className="ac-instr">{t.instrument}</span>
          <h2 id={'ac-h-' + t.id} className="ac-name">{t.teacher}</h2>
        </div>
      </header>

      <dl className="ac-info">
        <div><dt>על הבמות</dt><dd>{t.stage}</dd></div>
        <div><dt>ציוד בשיעור</dt><dd>{t.gear}</dd></div>
      </dl>

      <fieldset className="ac-tiers">
        <legend className="ac-legend">אפשרויות ומחירים</legend>
        {t.tiers.map((x) => {
          const per = Math.round(x.price / x.lessons);
          const save = single.price * x.lessons - x.price;
          return (
            <label key={x.id} className={'ac-tier' + (x.id === tierId ? ' on' : '') + (x.recommended ? ' rec' : '') + (x.intro ? ' intro' : '')}>
              <input type="radio" name={groupId} value={x.id} checked={x.id === tierId} onChange={() => setTierId(x.id)} />
              <span className="ac-tier-main">
                <span className="ac-tier-label">{x.label}{x.note ? ` (${x.note})` : ''}{x.recommended ? ' 🔥' : ''}</span>
                {x.intro && <span className="ac-tier-sub">שיעור ראשון להיכרות – פעם אחת לכל תלמיד</span>}
                {x.lessons > 1 && <span className="ac-tier-sub">{ils(per)} לשיעור · חיסכון של {ils(save)}</span>}
              </span>
              <span className="ac-tier-price">
                {coupon && !x.intro ? <>{ils(off(x.price, x))}<s className="ac-was">{ils(x.price)}</s></> : ils(x.price)}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="ac-total" aria-live="polite">
        <span className="ac-total-price">{ils(finalPrice)}</span>
        {couponOn && <span className="ac-coupon-tag">קופון {coupon.label} · {coupon.percent}% הנחה (במקום {ils(tier.price)})</span>}
        <span className="ac-total-sub">
          {tier.intro ? 'שיעור היכרות חד פעמי – פעם אחת לכל תלמיד' : tier.lessons > 1 ? `${tier.lessons} שיעורים · ${ils(perLesson)} לשיעור · חוסכים ${ils(saving)}` : 'שיעור אחד · 60 דקות'}
        </span>
      </div>

      <fieldset className="ac-when">
        <legend className="ac-legend">מועד מבוקש לשיעור</legend>
        <div className="ac-when-row">
          <input className="ac-field" type="date" aria-label={'תאריך לשיעור עם ' + t.teacher} min={minDate || undefined} value={date} onChange={(e) => { setDate(e.target.value); setErr(''); }} />
          <select className="ac-field" aria-label={'שעה לשיעור עם ' + t.teacher} value={time} onChange={(e) => { setTime(e.target.value); setErr(''); }}>
            <option value="">שעה</option>
            {LESSON_TIMES.map((h) => {
              const taken = !!(takenMap && takenMap[h]);
              return <option key={h} value={h} disabled={taken}>{taken ? h + ' · תפוס' : h}</option>;
            })}
          </select>
        </div>
        <span className="ac-when-note">
          {checking ? 'בודקים ביומן האולפן…'
              : takenMap ? 'מוצגות השעות הפנויות ביומן האולפן · שיעורים החל מ-14:00'
            : 'שיעורים החל מ-14:00 · המועד סופי לאחר אישור המורה'}
        </span>
      </fieldset>

      {pay.on && !form && (
        <button type="button" className="ac-cta" onClick={() => { setErr(''); setForm('pay'); }}>
          {deposit < finalPrice ? `תשלום מקדמה (${ils(deposit)}) ושריון מקום` : `תשלום (${ils(deposit)}) ושריון מקום`}
        </button>
      )}
      {form && (
        <form className="ac-pay" onSubmit={submit} noValidate>
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp" value={hp} onChange={(e) => setHp(e.target.value)} />
          <div className="ac-pay-head">
            {form === 'pay'
              ? <strong>{deposit < finalPrice ? `מקדמה ${ils(deposit)}` : `תשלום ${ils(deposit)}`}</strong>
              : <strong>שליחת בקשה ליניר</strong>}
            <span>{tierName}{form === 'pay' && deposit < finalPrice ? ` · יתרה ${ils(finalPrice - deposit)} בתיאום` : ` · ${ils(finalPrice)}`}{couponOn ? ` · קופון ${coupon.label}` : ''}</span>
            <span>{when ? 'מועד: ' + when : form === 'pay' ? 'בחרו תאריך ושעה למעלה' : 'מועד: גמיש – נתאם יחד'}</span>
            <button type="button" className="ac-x" aria-label="סגירה" onClick={() => setForm(false)}><IconClose /></button>
          </div>
          <label className="ac-lbl" htmlFor={'acn-' + t.id}>שם מלא</label>
          <input id={'acn-' + t.id} className="ac-field" autoComplete="name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
          <label className="ac-lbl" htmlFor={'acp-' + t.id}>טלפון</label>
          <input id={'acp-' + t.id} className="ac-field" type="tel" dir="ltr" autoComplete="tel" placeholder="050-0000000" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
          <label className="ac-lbl" htmlFor={'ace-' + t.id}>{form === 'pay' ? 'מייל לקבלה (לא חובה)' : 'מייל (לא חובה)'}</label>
          <input id={'ace-' + t.id} className="ac-field" type="email" dir="ltr" autoComplete="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
          {err && <p role="alert" className="ac-err">{err}</p>}
          {form === 'pay' ? (
            <>
              <button type="submit" className="ac-cta" disabled={busy}>{busy ? 'פותחים את דף התשלום…' : 'למעבר לתשלום מאובטח'}</button>
              <p className="ac-fine">התשלום מאובטח דרך Morning והקבלה נשלחת אוטומטית. {CANCEL_POLICY.short} <a href="/cancellation">מדיניות ביטולים</a></p>
            </>
          ) : (
            <>
              <button type="submit" className="ac-cta" disabled={busy}><IconWA size={20} />{busy ? 'שולחים…' : 'שליחת הבקשה'}</button>
              <p className="ac-fine">הבקשה נשלחת ישירות ליניר בוואטסאפ — הוא יחזור אליכם בהקדם.</p>
            </>
          )}
        </form>
      )}

      {pay.notify ? (
        form !== 'req' && (
          <button type="button" className={pay.on ? 'ac-cta ac-cta-2' : 'ac-cta'} onClick={() => { setErr(''); setForm('req'); }}>
            <IconWA size={20} />{academyText.cta}
          </button>
        )
      ) : (
        <a className={pay.on ? 'ac-cta ac-cta-2' : 'ac-cta'} href={waLink(msg)} target="_blank" rel="noopener">
          <IconWA size={20} />{academyText.cta}
        </a>
      )}
      {pay.notify && err && form === 'req' && err.includes('בוואטסאפ למטה') && (
        <a className="ac-cta ac-cta-2" href={waLink(msg)} target="_blank" rel="noopener"><IconWA size={20} />שליחה ישירה בוואטסאפ</a>
      )}
    </article>
  );
}

export default function Academy() {
  const [pay, setPay] = useState({ on: false, deposit: 0, demo: false, calendar: false, notify: false });
  const [result, setResult] = useState('');
  // קופון לכל הדף (למשל Mayan = 10% על החבילה שבוחרים)
  const [couponCode, setCouponCode] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const coupon = couponCode ? findCoupon(couponCode) : null;
  const applyCoupon = () => { const c = findCoupon(couponInput); if (c) { setCouponCode(c.code); setCouponMsg(''); } else setCouponMsg(couponInput.trim() ? 'הקוד לא תקין' : 'הקלידו קוד קופון'); };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('demo')) { setPay({ on: true, deposit: 100, demo: true, calendar: true, notify: true }); return; }
    if (q.get('paid')) setResult('paid');
    else if (q.get('payfail')) setResult('failed');
    if (q.get('paid') || q.get('payfail')) window.history.replaceState(null, '', '/academy');
    fetch('/api/availability').then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (j && j.academy) setPay({ on: !!j.academy.on, deposit: j.academy.deposit || 0, demo: false, calendar: !!j.academy.calendar, notify: !!j.notify });
    }).catch(() => {});
  }, []);

  const demoPaid = () => { setResult('paid'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const requestSent = () => { setResult('sent'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <Layout>
      <Header
        links={[['/', 'ראשי'], ['/#studio', 'האולפן'], ['/#pricing', 'מחירון']]}
        cta={{ href: '/#booking', label: 'הזמנת חדר / אולפן' }}
      />
      <main className="academy">
        <section className="wrap ac-wrap" aria-labelledby="ac-title">
          <nav aria-label="פירורי לחם" className="ac-crumbs"><a href="/">ראשי</a> / שיעורי נגינה</nav>
          <h1 id="ac-title" className="ac-title">{academyText.title}</h1>
          <p className="ac-sub">{academyText.subtitle}</p>
          <p className="ac-where">{ADDRESS} · שיעורים אחד-על-אחד · 60 דקות</p>

          {pay.demo && (
            <div className="ac-note demo" role="note"><strong>מצב הדגמה</strong><span>כך ייראה תשלום המקדמה (₪100 לדוגמה) והשעות לפי יומן האולפן (17:00–18:00 תפוסות לדוגמה). אין כאן תשלום אמיתי ושום דבר לא נכנס ליומן.</span></div>
          )}
          {result === 'sent' && (
            <div className="ac-note ok" role="status">
              <strong>הבקשה נשלחה ✓</strong><span>יניר קיבל את הפרטים בוואטסאפ ויחזור אליך בהקדם לתיאום השיעור.</span>
              <button type="button" className="ac-x" aria-label="סגירת ההודעה" onClick={() => setResult('')}><IconClose /></button>
            </div>
          )}
          {result === 'paid' && (
            <div className="ac-note ok" role="status">
              <strong>המקום שוריין ✓</strong><span>יניר יצור איתך קשר בהקדם לתיאום מועד השיעור.</span>
              <button type="button" className="ac-x" aria-label="סגירת ההודעה" onClick={() => setResult('')}><IconClose /></button>
            </div>
          )}
          {result === 'failed' && (
            <div className="ac-note bad" role="alert">
              <strong>התשלום לא הושלם</strong><span>המקום לא שוריין. אפשר לנסות שוב או לשלוח הודעה בוואטסאפ.</span>
              <button type="button" className="ac-x" aria-label="סגירת ההודעה" onClick={() => setResult('')}><IconClose /></button>
            </div>
          )}

          <div className="ac-coupon">
            {coupon ? (
              <div className="ac-coupon-on" role="status">
                <span>✓ קופון <b dir="ltr">{coupon.label}</b> הופעל – {coupon.percent}% הנחה על החבילה שתבחרו (לא כולל שיעור היכרות)</span>
                <button type="button" className="ac-x" aria-label="הסרת הקופון" onClick={() => { setCouponCode(''); setCouponInput(''); }}><IconClose /></button>
              </div>
            ) : (
              <>
                <label className="ac-lbl" htmlFor="ac-coupon">יש לך קוד קופון?</label>
                <div className="ac-coupon-row">
                  <input id="ac-coupon" className="ac-field" dir="ltr" autoComplete="off" placeholder="קוד" value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value); setCouponMsg(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }} />
                  <button type="button" className="ac-coupon-btn" onClick={applyCoupon}>הפעלה</button>
                </div>
                {couponMsg && <p role="alert" className="ac-err">{couponMsg}</p>}
              </>
            )}
          </div>

          <div className="ac-grid swipe">
            {academyData.map((t) => <TeacherCard key={t.id} t={t} pay={pay} onDemoPaid={demoPaid} onSent={requestSent} coupon={coupon} />)}
          </div>
        </section>
      </main>
      <Footer links={[['/', 'ראשי'], ['/#pricing', 'מחירון אולפן']]} />
      <BookBar text="SOL Academy" sub="שיעורי תופים, בס וגיטרה" href="#ac-title" label="למורים ולמחירים" />
    </Layout>
  );
}
