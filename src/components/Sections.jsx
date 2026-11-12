import { useEffect, useRef, useState } from 'react';
import { MAP_EMBED, WAZE, GMAPS, TEL } from '../data.js';

/* סרטון האולפן בראש הדף: מתנגן אוטומטית בלי קול, עם כפתור עצירה.
   לא מתנגן אוטומטית למי שביקש "הפחתת תנועה", ונעצר כשבוחרים "עצירת אנימציות" בתפריט הנגישות. */
export function StudioVideo() {
  const ref = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // דפדפנים מאפשרים ניגון אוטומטי רק לסרטון מושתק
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = v.closest('.root');
    const stillNow = () => root && root.classList.contains('still');
    if (reduce || stillNow()) { v.pause(); setPaused(true); }
    else { const p = v.play(); if (p && p.catch) p.catch(() => setPaused(true)); }
    if (!root) return;
    const mo = new MutationObserver(() => { if (stillNow() && !v.paused) { v.pause(); setPaused(true); } });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); }
  };

  return (
    <section aria-label="סרטון האולפן" className="vidsec">
      <div className="vidwrap">
        <video ref={ref} src="/studio.mp4" autoPlay muted loop playsInline preload="metadata"
          aria-label="סרטון היכרות עם אולפן ההקלטות של SOL Production – יניר סול הפקות" />
        <button type="button" className="vidbtn" onClick={toggle} aria-label={paused ? 'הפעלת הסרטון' : 'עצירת הסרטון'}>
          {paused
            ? <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="7 4 20 12 7 20 7 4" /></svg>
            : <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>}
        </button>
      </div>
    </section>
  );
}

const EQ_COLORS = ['#8b5cf6', '#3b82f6', '#a78bfa', '#60a5fa', '#ff7a1a', '#6366f1'];
const BARS = Array.from({ length: 28 }, (_, i) => ({
  height: 30 + ((i * 37 + 11) % 70) + '%',
  background: EQ_COLORS[i % 6],
  animationDelay: (-(i * 0.17) % 1.5).toFixed(2) + 's',
}));

export function StudioViz() {
  return (
    <div className="glass float" role="img" aria-label="אקולייזר – האולפן בפעולה" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <span className="chip"><span className="pulse" />LIVE · REC</span>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <div className="vinyl" aria-hidden="true"><span>SOL</span></div>
        <div className="eq" aria-hidden="true" style={{ flex: 1 }}>
          {BARS.map((s, i) => <i key={i} style={s} />)}
        </div>
      </div>
      <div className="mini3">
        <div><small>קונסולה</small><b>Qu-7</b></div>
        <div><small>כרטיס קול</small><b>RME</b></div>
        <div><small>תוכנה</small><b>Cubase Pro</b></div>
      </div>
    </div>
  );
}

export function Faq({ id = 'faq', title, items, firstOpen }) {
  return (
    <section id={id} className="band sec" aria-labelledby={id + '-title'}>
      <div className="wrap">
        <div className="sec-head"><span className="chip">שאלות נפוצות</span><h2 id={id + '-title'} className="d h2">{title}</h2></div>
        <div className="faq">
          {items.map(([q, a], i) => (
            <details key={q} className="glass" open={firstOpen && i === 0}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Location({ chip, title, text, actions }) {
  return (
    <section id="location" className="wrap sec" aria-labelledby="loc-title">
      <div className="glass loc">
        <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="chip">{chip}</span>
          <h2 id="loc-title" className="d h2" style={{ fontSize: 40 }}>{title}</h2>
          <p style={{ margin: 0, fontSize: 17, color: 'var(--muted)' }}>{text}</p>
          <div className="row" style={{ gap: 12, marginTop: 8 }}>
            {actions || (
              <>
                <a className="btn btn-main btn-sm" href={WAZE} target="_blank" rel="noopener">ניווט ב־Waze</a>
                <a className="btn btn-glass btn-sm" href={GMAPS} target="_blank" rel="noopener">Google Maps</a>
                <a className="btn btn-glass btn-sm" href={TEL}>חייגו עכשיו</a>
              </>
            )}
          </div>
        </div>
        <div className="map">
          <iframe title="מפה – הראשונים 41, אור יהודה" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={MAP_EMBED} />
        </div>
      </div>
    </section>
  );
}
