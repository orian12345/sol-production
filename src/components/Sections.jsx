import { MAP_EMBED, WAZE, GMAPS, TEL } from '../data.js';

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
