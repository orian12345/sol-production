import { useRef, useState } from 'react';
import { PRICING } from '../data.js';

/* כל הקטגוריות נמצאות ב-HTML (גם המוסתרות) — כך גוגל רואה את כל המחירון */
export function Pricing({ selectedId, onPick }) {
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
        <p className="lead">בוחרים שירות, לוחצים "בחרו להזמנה" — והפרטים עוברים ישר להזמנה בוואטסאפ.</p>
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
            <article key={it.id} className={'glass lift pcard' + (selectedId === it.id ? ' sel' : '')}>
              {it.badge && <span className="chip badge">{it.badge}</span>}
              <h3>{it.name}</h3>
              <p>{it.desc}</p>
              <div className="prow">
                <span className={'price' + (it.quote ? ' q' : '')}>{it.price}</span>
                {it.unit && <span className="unit">{it.unit}</span>}
                {it.old && <s className="old">{'במקום ' + it.old}</s>}
              </div>
              {it.note && <div className="note">{it.note}</div>}
              <a className="btn btn-main btn-sm" href="#booking" aria-label={'בחירת ' + it.name + ' להזמנה'} onClick={() => onPick({ id: it.id })}>בחרו להזמנה</a>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}
