import { useEffect, useState } from 'react';
import { IconA11y, IconClose } from './icons.jsx';
import { PHONE, TEL, WA_HELLO, ADDRESS, HOURS } from '../data.js';

const KEY = 'sol-a11y';

/* עוטף כל דף: הגדרות נגישות + כפתור הנגישות */
export function Layout({ children }) {
  const [a, setA] = useState({});
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { setA(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* ignore */ }
  }, []);
  const update = (next) => {
    setA(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const fs = a.fs || 100;
  const cls = ['root', a.hc && 'hc', a.hl && 'hl', a.still && 'still'].filter(Boolean).join(' ');
  const toggle = (k) => update({ ...a, [k]: !a[k] });

  return (
    <div className={cls} id="top" style={fs !== 100 ? { zoom: fs / 100 } : undefined}>
      {children}
      <div className="a11y">
        {open && (
          <div className="glass a11y-panel" id="a11y-panel" role="dialog" aria-label="תפריט נגישות">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 17 }}>נגישות</strong>
              <button type="button" className="icon-btn" aria-label="סגירת תפריט הנגישות" onClick={() => setOpen(false)}><IconClose size={18} /></button>
            </div>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <button type="button" className="pill" aria-label="הגדלת טקסט" onClick={() => update({ ...a, fs: Math.min(150, fs + 10) })}>A+</button>
              <button type="button" className="pill" aria-label="הקטנת טקסט" onClick={() => update({ ...a, fs: Math.max(90, fs - 10) })}>A−</button>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>{fs}%</span>
            </div>
            <button type="button" className="pill" aria-pressed={!!a.hc} onClick={() => toggle('hc')}>ניגודיות גבוהה</button>
            <button type="button" className="pill" aria-pressed={!!a.hl} onClick={() => toggle('hl')}>הדגשת קישורים</button>
            <button type="button" className="pill" aria-pressed={!!a.still} onClick={() => toggle('still')}>עצירת אנימציות</button>
            <button type="button" className="pill" style={{ background: 'transparent' }} onClick={() => update({})}>איפוס הגדרות</button>
            <a href="/accessibility" style={{ fontSize: 14 }}>הצהרת נגישות</a>
          </div>
        )}
        <button type="button" className="a11y-toggle" aria-label="פתיחת תפריט נגישות" aria-expanded={open} aria-controls="a11y-panel" onClick={() => setOpen(!open)}>
          <IconA11y />
        </button>
      </div>
    </div>
  );
}

export function Brand({ href }) {
  return (
    <a className="brand" href={href} aria-label="SOL Production – יניר סול הפקות, לדף הבית">
      <span className="mono" aria-hidden="true">SOL</span>
      <span><span className="he">יניר סול הפקות</span><span className="en">SOL PRODUCTION</span></span>
    </a>
  );
}

/* links: [[href, label]] | cta: {href, label, onClick} | quick: [{label, pick}] */
export function Header({ brandHref = '/', links = [], cta, quick, onPick, topbar }) {
  return (
    <header className="hdr">
      {topbar && (
        <div className="topbar hide-m"><div className="topbar-in">
          <span>{ADDRESS} · {HOURS}</span>
          <div className="row" style={{ gap: 18 }}>
            <a href={TEL}>{PHONE}</a>
            <a href={WA_HELLO} target="_blank" rel="noopener">וואטסאפ</a>
          </div>
        </div></div>
      )}
      <div className="navwrap">
        <nav className="nav" aria-label="ניווט ראשי">
          <Brand href={brandHref} />
          {links.length > 0 && (
            <div className="navlinks">
              {links.map(([href, label]) => <a key={href} className="navlink" href={href}>{label}</a>)}
            </div>
          )}
          {cta && <a className={'btn btn-sm ' + (cta.glass ? 'btn-glass' : 'btn-main')} href={cta.href} onClick={cta.onClick}>{cta.label}</a>}
        </nav>
      </div>
      {quick && (
        <nav className="quick" aria-label="הזמנה מהירה"><div className="quick-in scroll-x">
          <span className="quick-lbl">הזמנה מהירה:</span>
          {quick.map((q) => (
            <a key={q.label} className="qbtn" href="#booking" onClick={() => onPick(q.pick)}>{q.label}</a>
          ))}
          <a className="qbtn qbtn-alt" href="#pricing">למחירון</a>
        </div></nav>
      )}
    </header>
  );
}

export function Footer({ links = [], text }) {
  const [year, setYear] = useState(2026);
  useEffect(() => setYear(new Date().getFullYear()), []);
  return (
    <footer>
      <div className="foot">
        <div><b style={{ color: 'var(--violet-l)' }}>SOL</b> · {text || <>יניר סול הפקות · אולפן הקלטות וחדר חזרות · {ADDRESS} · <a href={TEL} dir="ltr">{PHONE}</a></>}</div>
        {links.length > 0 && (
          <nav aria-label="קישורים בתחתית">
            {links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
          </nav>
        )}
        <div>© {year} SOL Production · כל הזכויות שמורות</div>
      </div>
    </footer>
  );
}

export function BookBar({ text, sub, href, label, onClick }) {
  return (
    <div className="bookbar" role="region" aria-label="פס הזמנה"><div className="bookbar-in">
      <span className="bookbar-txt">{text} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{sub}</span></span>
      <div className="bookbar-btns">
        <a className="btn btn-main btn-sm" href={href} onClick={onClick}>{label}</a>
        <a className="btn btn-wa btn-sm" href={WA_HELLO} target="_blank" rel="noopener">וואטסאפ</a>
      </div>
    </div></div>
  );
}
