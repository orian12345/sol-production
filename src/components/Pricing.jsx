import { useRef, useState } from 'react';
import { PRICING } from '../data.js';

/* כל הקטגוריות נמצאות ב-HTML (גם המוסתרות) — כך גוגל רואה את כל המחירון */
export function Pricing({ selectedIds = [], onPick }) {
  const [cat, setCat] = useState(PRICING[0].id);
  const tabRefs = useRef([]);

  const onKey = (e, i) => {
    const d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; // RTL
    if (!d) return;
    e.preventDefault();
    const n = (i + d + PRICING.length) % PRICING.length;
    setCat(PRICING[n].id);
    tabRefs.current[n]?.focus();
  };

  return (
    <section id="pricing" className="wrap sec" aria-labelledby="pricing-title">
      <div className="sec-head">
        <span className="chip">מחירון</span>
        <h2 id="pricing-title" className="d h2">מחירון אולפן ההקלטות SOL Production</h2>
        <p className="lead">אפשר להוסיף כמה שירותים לאותה הזמנה — למשל חדר חזרות + הקלטה. הכול מופיע בטופס ההזמנה למטה.</p>
      </div>
      <div className="tabs scroll-x" role="tablist" aria-label="קטגוריות מחירון">
        {PRICING.map((c, i) => (
          <button key={c.id} ref={(el) => (tabRefs.current[i] = el)} type="button" className="pill" role="tab"
            id={'tab-' + c.id} aria-controls={'p-' + c.id} aria-selected={cat === c.id} tabIndex={cat === c.id ? 0 : -1}
            onClick={() => setCat(c.id)} onKeyDown={(e) => onKey(e, i)}>
            {c.label}
          </button>
        ))}
      </div>
      {PRICING.map((c) => (
        <div key={c.id} className="panel pgrid swipe" id={'p-' + c.id} role="tabpanel" aria-labelledby={'tab-' + c.id} hidden={cat !== c.id}>
          {c.items.map((it) => (
            <article key={it.id} className={'glass lift pcard' + (selectedIds.includes(it.id) ? ' sel' : '')}>
              {it.badge && <span className="chip badge">{it.badge}</span>}
              <h3>{it.name}</h3>
              <p>{it.desc}</p>
              <div className="prow">
                <span className={'price' + (it.quote ? ' q' : '')}>{it.price}</span>
                {it.unit && <span className="unit">{it.unit}</span>}
                {it.old && <s className="old">{'במקום ' + it.old}</s>}
              </div>
              {it.note && <div className="note">{it.note}</div>}
              {c.perk && <div className="perk"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14v-2a9 9 0 0 1 18 0v2" /><rect x="2" y="14" width="5" height="7" rx="2" /><rect x="17" y="14" width="5" height="7" rx="2" /></svg>{c.perk}</div>}
              {selectedIds.includes(it.id)
                ? <button type="button" className="btn btn-glass btn-sm in-order" aria-pressed="true" aria-label={'הסרת ' + it.name + ' מההזמנה'} onClick={() => onPick({ id: it.id, toggle: true })}>✓ נוסף להזמנה · הסרה</button>
                : <button type="button" className="btn btn-main btn-sm" aria-pressed="false" aria-label={'הוספת ' + it.name + ' להזמנה'} onClick={() => onPick({ id: it.id, toggle: true })}>הוספה להזמנה</button>}
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}
