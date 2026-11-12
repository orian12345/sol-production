import { SERVICES, BANDS, DURS, waLink } from '../data.js';
import { IconWA, IconClose } from './icons.jsx';

const OPEN = 10, CLOSE = 23;

/* טופס ההזמנה: בונה הודעת וואטסאפ מוכנה. ה-state מגיע מהדף (כדי שהמחירון יוכל לבחור חבילה) */
export function Booking({ st, setSt }) {
  const set = (patch) => setSt((s) => ({ ...s, ...patch }));
  const isReh = st.service === 'rehearsal';
  const showHours = isReh || st.service === 'write';

  const dur = parseInt(st.dur, 10) || 2;
  const times = [];
  for (let h = OPEN; h + dur <= CLOSE; h++) times.push((h < 10 ? '0' : '') + h + ':00');
  const time = times.includes(st.time) ? st.time : times[times.length - 1];

  let dateLabel = 'גמיש – נתאם יחד';
  if (st.date) { const p = st.date.split('-'); dateLabel = `${p[2]}/${p[1]}/${p[0]}`; }
  const name = st.name.trim(), notes = st.notes.trim();
  const lines = ['היי יניר, אשמח לשריין סשן ב־SOL Production:', '', '• שירות: ' + SERVICES.find((x) => x[0] === st.service)[1]];
  if (st.selected) lines.push(`• חבילה מהמחירון: ${st.selected.name} (${st.selected.price})`);
  if (isReh) {
    lines.push('• הרכב: ' + st.band);
    lines.push('• הקלטת ערוצים מלאה (Multi-Track): ' + (st.rec ? 'כן' : 'לא'));
  }
  lines.push('• תאריך: ' + dateLabel);
  if (showHours) lines.push('• שעת התחלה: ' + time, '• משך: ' + DURS.find((x) => x[0] === st.dur)[1]);
  lines.push('• שם: ' + (name || '—'));
  if (notes) lines.push('• הערות: ' + notes);
  lines.push('', 'תודה!');
  const msg = lines.join('\n');

  const pill = (on, onClick, label, key, extra) => (
    <button key={key ?? label} type="button" className="pill" aria-pressed={on} onClick={onClick} {...extra}>{label}</button>
  );

  return (
    <section id="booking" className="wrap sec" aria-labelledby="booking-title" style={{ paddingTop: 0 }}>
      <div className="sec-head">
        <span className="chip">הזמנה חכמה · וואטסאפ</span>
        <h2 id="booking-title" className="d h2">בונים את הסשן שלכם</h2>
        <p className="lead">בוחרים שירות, תאריך ומשך — ההודעה נכתבת לבד ונשלחת ישר ליניר בוואטסאפ.</p>
      </div>
      <div className="bk">
        <form className="glass" noValidate onSubmit={(e) => e.preventDefault()}>
          <fieldset>
            <legend className="lbl">1 · איזה שירות?</legend>
            <div className="opts">
              {SERVICES.map(([id, label]) => pill(st.service === id, () => set({ service: id }), label, id))}
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
              <legend className="lbl">3 · שעת התחלה</legend>
              <div className="opts" dir="ltr" style={{ justifyContent: 'flex-end' }}>
                {times.map((t) => pill(time === t, () => set({ time: t }), t))}
              </div>
            </fieldset>
          )}

          <div className="two">
            <div>
              <label className="lbl" htmlFor="bk-name">4 · שם מלא</label>
              <input id="bk-name" className="field" type="text" autoComplete="name" placeholder="איך קוראים לך?" value={st.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div>
              <label className="lbl" htmlFor="bk-notes">הערות (לא חובה)</label>
              <input id="bk-notes" className="field" type="text" placeholder="שם חתן/כלת השמחה, שם הלהקה, ז'אנר…" value={st.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
          </div>
        </form>

        <aside className="glass" aria-labelledby="pv-title">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 id="pv-title" className="d" style={{ margin: 0, fontSize: 22 }}>תצוגה מקדימה להודעה</h3>
            <span className="chip" style={{ background: '#0f2a1c', color: '#6ee7a8' }}>וואטסאפ</span>
          </div>
          {st.selected && (
            <div className="selbox">
              <span style={{ fontSize: 14 }}><span style={{ color: 'var(--muted)' }}>מהמחירון:</span> {st.selected.name + ' · ' + st.selected.price}</span>
              <button type="button" className="icon-btn" aria-label="ביטול החבילה שנבחרה" onClick={() => set({ selected: null })}><IconClose /></button>
            </div>
          )}
          <div className="bubble" aria-live="polite">{msg}</div>
          <a className="btn btn-wa" href={waLink(msg)} target="_blank" rel="noopener" style={{ width: '100%' }}>
            <IconWA />שליחת הזמנה ישירה לוואטסאפ
          </a>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
            {name ? 'הכול מוכן — לחיצה אחת ונפתח וואטסאפ עם כל הפרטים.' : 'טיפ: הוסיפו שם כדי שיניר ידע למי לחזור.'}
          </p>
        </aside>
      </div>
    </section>
  );
}
