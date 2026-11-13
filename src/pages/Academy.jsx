import { useEffect, useState } from 'react';
import { Layout, Header, Footer, BookBar } from '../components/Layout.jsx';
import { IconWA, IconClose } from '../components/icons.jsx';
import { waLink, ADDRESS, CANCEL_POLICY } from '../data.js';
import { academyData, academyText } from '../academy.js';

const ils = (n) => '₪' + n.toLocaleString('en-US');
const ERRORS = {
  missing_contact: 'צריך למלא שם מלא ומספר טלפון תקין.',
  payment_unavailable: 'לא הצלחנו לפתוח את דף התשלום. נסו שוב או שלחו הודעה בוואטסאפ.',
};

/* pay = { on, deposit, demo } — מקדמה דרך Morning (כבוי עד שמגדירים ACADEMY_DEPOSIT ומחברים את Morning) */
function TeacherCard({ t, pay, onDemoPaid }) {
  const recommended = t.tiers.find((x) => x.recommended) || t.tiers[0];
  const [tierId, setTierId] = useState(recommended.id);
  const tier = t.tiers.find((x) => x.id === tierId);
  const single = t.tiers.find((x) => x.id === 'single') || t.tiers.find((x) => x.lessons === 1 && !x.intro) || t.tiers[0];
  const perLesson = Math.round(tier.price / tier.lessons);
  const saving = single.price * tier.lessons - tier.price;
  const groupId = 'tier-' + t.id;

  const [form, setForm] = useState(false);
  const [c, setC] = useState({ name: '', phone: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const deposit = Math.min(pay.deposit, tier.price);
  const tierName = `${tier.label}${tier.note ? ` (${tier.note})` : ''}`;

  const msg = [
    'היי, אשמח לתאם שיעורי נגינה ב-SOL Academy:',
    '',
    `• כלי: ${t.instrument}`,
    `• מורה: ${t.teacher}`,
    `• חבילה: ${tierName}`,
    `• מחיר: ${ils(tier.price)}${tier.lessons > 1 ? ` (${ils(perLesson)} לשיעור)` : ''}`,
    '',
    'תודה!',
  ].join('\n');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!c.name.trim() || c.phone.replace(/\D/g, '').length < 9) { setErr(ERRORS.missing_contact); return; }
    setBusy(true);
    if (pay.demo) { setTimeout(() => { setBusy(false); setForm(false); onDemoPaid(); }, 900); return; }
    try {
      const r = await fetch('/api/academy-pay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ teacher: t.teacher, instrument: t.instrument, tier: tierName, price: tier.price, ...c }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) { window.location.href = j.url; return; }
      setErr(ERRORS[j.error] || ERRORS.payment_unavailable);
    } catch { setErr(ERRORS.payment_unavailable); }
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
              <span className="ac-tier-price">{ils(x.price)}</span>
            </label>
          );
        })}
      </fieldset>

      <div className="ac-total" aria-live="polite">
        <span className="ac-total-price">{ils(tier.price)}</span>
        <span className="ac-total-sub">
          {tier.intro ? 'שיעור היכרות חד פעמי – פעם אחת לכל תלמיד' : tier.lessons > 1 ? `${tier.lessons} שיעורים · ${ils(perLesson)} לשיעור · חוסכים ${ils(saving)}` : 'שיעור אחד · 60 דקות'}
        </span>
      </div>

      {pay.on && !form && (
        <button type="button" className="ac-cta" onClick={() => setForm(true)}>
          {deposit < tier.price ? `תשלום מקדמה (${ils(deposit)}) ושריון מקום` : `תשלום (${ils(deposit)}) ושריון מקום`}
        </button>
      )}
      {pay.on && form && (
        <form className="ac-pay" onSubmit={submit} noValidate>
          <div className="ac-pay-head">
            <strong>{deposit < tier.price ? `מקדמה ${ils(deposit)}` : `תשלום ${ils(deposit)}`}</strong>
            <span>{tierName}{deposit < tier.price ? ` · יתרה ${ils(tier.price - deposit)} בתיאום` : ''}</span>
            <button type="button" className="ac-x" aria-label="סגירה" onClick={() => setForm(false)}><IconClose /></button>
          </div>
          <label className="ac-lbl" htmlFor={'acn-' + t.id}>שם מלא</label>
          <input id={'acn-' + t.id} className="ac-field" autoComplete="name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
          <label className="ac-lbl" htmlFor={'acp-' + t.id}>טלפון</label>
          <input id={'acp-' + t.id} className="ac-field" type="tel" dir="ltr" autoComplete="tel" placeholder="050-0000000" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
          <label className="ac-lbl" htmlFor={'ace-' + t.id}>מייל לקבלה (לא חובה)</label>
          <input id={'ace-' + t.id} className="ac-field" type="email" dir="ltr" autoComplete="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
          {err && <p role="alert" className="ac-err">{err}</p>}
          <button type="submit" className="ac-cta" disabled={busy}>{busy ? 'פותחים את דף התשלום…' : 'למעבר לתשלום מאובטח'}</button>
          <p className="ac-fine">התשלום מאובטח דרך Morning והקבלה נשלחת אוטומטית. {CANCEL_POLICY.short} <a href="/cancellation">מדיניות ביטולים</a></p>
        </form>
      )}

      <a className={pay.on ? 'ac-cta ac-cta-2' : 'ac-cta'} href={waLink(msg)} target="_blank" rel="noopener">
        <IconWA size={20} />{academyText.cta}
      </a>
    </article>
  );
}

export default function Academy() {
  const [pay, setPay] = useState({ on: false, deposit: 0, demo: false });
  const [result, setResult] = useState('');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('demo')) { setPay({ on: true, deposit: 100, demo: true }); return; }
    if (q.get('paid')) setResult('paid');
    else if (q.get('payfail')) setResult('failed');
    if (q.get('paid') || q.get('payfail')) window.history.replaceState(null, '', '/academy');
    fetch('/api/availability').then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (j && j.academy && j.academy.on) setPay({ on: true, deposit: j.academy.deposit, demo: false });
    }).catch(() => {});
  }, []);

  const demoPaid = () => { setResult('paid'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

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
            <div className="ac-note demo" role="note"><strong>מצב הדגמה</strong><span>כך ייראה תשלום המקדמה (₪100 לדוגמה). אין כאן תשלום אמיתי.</span></div>
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

          <div className="ac-grid swipe">
            {academyData.map((t) => <TeacherCard key={t.id} t={t} pay={pay} onDemoPaid={demoPaid} />)}
          </div>
        </section>
      </main>
      <Footer links={[['/', 'ראשי'], ['/#pricing', 'מחירון אולפן']]} />
      <BookBar text="SOL Academy" sub="שיעורי תופים, בס וגיטרה" href="#ac-title" label="למורים ולמחירים" />
    </Layout>
  );
}
