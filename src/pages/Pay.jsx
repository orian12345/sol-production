import { useEffect, useState } from 'react';
import { Layout, Header, Footer } from '../components/Layout.jsx';
import { BitPanel, PayboxPanel, ils } from '../components/PayPanels.jsx';
import { waLink } from '../data.js';

/* =====================================================================
   דף תשלום למשתתף בתשלום קבוצתי — /pay#d=<פרטים>
   כל משתתף רואה את החלק שלו ובוחר: ביט / PayBox / אשראי.
   "שילמתי" → הודעה ליניר (מי שילם, כמה ובמה).
   ===================================================================== */
const ico = (d) => <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const METHODS = [
  { id: 'bit', label: 'ביט', icon: ico(<><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10 18h4" /></>) },
  { id: 'paybox', label: 'PayBox', icon: ico(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M8 3h8" /></>) },
  { id: 'card', label: 'אשראי', icon: ico(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>) },
];
const LABEL = { bit: 'ביט', paybox: 'PayBox', card: 'אשראי' };

export default function Pay() {
  const [d, setD] = useState(null);
  const [bad, setBad] = useState(false);
  const [method, setMethod] = useState('');
  const [card, setCard] = useState(false); // סליקה (Morning) מחוברת?
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hp, setHp] = useState('');
  const [state, setState] = useState(''); // '' | sending | done | error
  const [err, setErr] = useState('');

  useEffect(() => {
    try {
      const m = window.location.hash.match(/d=([^&]+)/);
      const x = m ? JSON.parse(decodeURIComponent(m[1])) : null;
      if (x && x.n) setD(x); else setBad(true);
    } catch { setBad(true); }
    fetch('/api/availability').then((r) => r.json()).then((j) => setCard(!!j.configured)).catch(() => {});
  }, []);

  const amt = d && Number(d.a) > 0 ? Number(d.a) : 0;
  const when = d ? [d.d, d.t].filter(Boolean).join(' · ') : '';

  const paid = async () => {
    setErr('');
    if (!name.trim() || phone.replace(/\D/g, '').length < 9) { setErr('נא למלא שם וטלפון, כדי שיניר ידע מי שילם.'); return; }
    setState('sending');
    const lines = [
      `💸 תשלום קבוצתי – משתתף ${d.i} מתוך ${d.n} שילם`,
      `סכום: ${amt ? ils(amt) : 'לא צוין'} · אמצעי תשלום: ${LABEL[method]}`,
      d.s ? 'שירות: ' + d.s : '',
      when ? 'מועד: ' + when : '',
      d.b ? 'ההזמנה של: ' + d.b : '',
      'סטטוס: לבדוק שהתשלום התקבל',
    ].filter(Boolean);
    try {
      const r = await fetch('/api/request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'group', name, phone, lines, website: hp }) });
      if (r.ok) { setState('done'); return; }
    } catch { /* ignore */ }
    setState('error');
  };

  const waText = d ? `היי יניר, שילמתי את החלק שלי (${amt ? ils(amt) : ''}) בתשלום הקבוצתי ב${LABEL[method] || ''}${d.s ? ' – ' + d.s : ''}${when ? ' · ' + when : ''}${d.b ? ' (הזמנה של ' + d.b + ')' : ''}. שם: ${name}` : '';

  return (
    <Layout>
      <Header cta={{ href: '/', label: 'לאתר', glass: true }} />
      <main className="wrap pay-page">
        {bad && (
          <div className="glass pay-card">
            <h1 className="d">הקישור לא תקין</h1>
            <p>נראה שהקישור לתשלום נקטע. בקשו ממי שהזמין לשלוח אותו שוב, או <a href={waLink('היי יניר, אני משתתף/ת בתשלום קבוצתי ואשמח לפרטי תשלום')} target="_blank" rel="noopener">כתבו ליניר בוואטסאפ</a>.</p>
          </div>
        )}
        {!bad && !d && <div className="glass pay-card" aria-busy="true"><p>טוען…</p></div>}
        {d && state === 'done' && (
          <div className="glass pay-card" role="status">
            <h1 className="d">תודה! ✓</h1>
            <p>יניר קיבל הודעה שהחלק שלך שולם ב{LABEL[method]}. הוא יאשר כשהתשלום יתקבל.</p>
            <a className="btn btn-glass" href="/">לאתר SOL Production</a>
          </div>
        )}
        {d && state !== 'done' && (
          <div className="glass pay-card">
            <p className="pay-kicker">SOL Production · תשלום קבוצתי</p>
            <h1 className="d">משתתף {d.i} מתוך {d.n}</h1>
            {(d.s || when) && <p className="pay-what">{d.s}{d.s && when ? ' · ' : ''}{when}{d.b ? <><br /><small>ההזמנה של {d.b}</small></> : null}</p>}
            {amt > 0 && <div className="pay-amt"><small>החלק שלך</small><b dir="ltr">{ils(amt)}</b></div>}

            <h2 className="pay-h">איך תרצו לשלם?</h2>
            <div className="pay-methods" role="radiogroup" aria-label="אמצעי תשלום">
              {METHODS.map((m) => {
                const off = m.id === 'card' && !card;
                return (
                  <button key={m.id} type="button" role="radio" aria-checked={method === m.id} className="pay-m" disabled={off} onClick={() => { setMethod(m.id); setErr(''); }}>
                    <span className="pm-ico">{m.icon}</span>
                    <b>{m.label}</b>
                    {off && <small>יופעל בקרוב</small>}
                  </button>
                );
              })}
            </div>

            {method && (
              <div className="pay-panel pm-step">
                {method === 'bit' && <BitPanel amt={amt} amountLabel="החלק שלך" />}
                {method === 'paybox' && <PayboxPanel amt={amt} amountLabel="החלק שלך" />}
                {method === 'card' && <p>תשלום מאובטח באשראי — יופעל בקרוב. בינתיים אפשר לשלם בביט או ב-PayBox.</p>}

                {method !== 'card' && (
                  <>
                    <h3 className="pay-h">שילמת? עדכנו את יניר</h3>
                    <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hp" value={hp} onChange={(e) => setHp(e.target.value)} />
                    <label className="lbl" htmlFor="pay-name">השם שלך</label>
                    <input id="pay-name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="איך קוראים לך?" />
                    <label className="lbl" htmlFor="pay-phone">טלפון</label>
                    <input id="pay-phone" className="field" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-0000000" />
                    <button type="button" className="btn btn-main" style={{ width: '100%', marginTop: 12 }} onClick={paid} disabled={state === 'sending'} aria-busy={state === 'sending'}>
                      {state === 'sending' ? 'שולחים…' : `שילמתי ב${LABEL[method]} ✓`}
                    </button>
                    {err && <p role="alert" className="pm-err">{err}</p>}
                    {state === 'error' && <p role="alert" className="pm-err">לא הצלחנו לשלוח. <a href={waLink(waText)} target="_blank" rel="noopener">עדכנו את יניר בוואטסאפ</a></p>}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer links={[['/', 'ראשי']]} />
    </Layout>
  );
}
