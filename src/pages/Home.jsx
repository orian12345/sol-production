import { useCallback, useEffect, useState } from 'react';
import { Layout, Header, Footer, BookBar } from '../components/Layout.jsx';
import { StudioViz, StudioVideo, Faq, Location } from '../components/Sections.jsx';
import { Pricing } from '../components/Pricing.jsx';
import { Booking } from '../components/Booking.jsx';
import { IconWA, IconMixer, IconSpeaker, IconNote, IconMic, IconPlay, IconInstagram, IconTikTok, IconYouTube, IconFacebook } from '../components/icons.jsx';
import { ALL_ITEMS, HOME_FAQ, SOCIAL, WA_HELLO, PHONE, TEL, HOURS, priceText } from '../data.js';

const QUICK = [
  { label: 'חדר חזרות', pick: { id: 'reh-base' } },
  { label: 'הקלטת קאבר', pick: { id: 'cover-playback' } },
  { label: 'ברכה לאירוע', pick: { id: 'greeting' } },
  { label: 'הפקת סינגל', pick: { service: 'single' } },
  { label: 'מיקס ומאסטרינג', pick: { service: 'mix' } },
  { label: 'קליפים', pick: { service: 'clip' } },
];

const INITIAL = { service: 'rehearsal', band: '2–4 נגנים', rec: true, dur: '3', time: '19:00', selected: null, date: '', name: '', phone: '', email: '', notes: '' };

const WAVE = Array.from({ length: 48 }, (_, i) => 25 + ((i * 13 + 7) % 75));

const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

export default function Home() {
  const [bk, setBk] = useState(INITIAL);
  const [mode, setMode] = useState('studio');

  /* בחירה מהמחירון / מכפתורי הזמנה מהירה → ממלא את טופס ההזמנה */
  const pick = useCallback(({ id, service }) => {
    setBk((s) => {
      const it = id && ALL_ITEMS.find((x) => x.id === id);
      if (it) return { ...s, selected: { id: it.id, name: it.name, price: priceText(it) }, service: it.service || s.service, rec: it.rec ? true : s.rec };
      return service ? { ...s, service, selected: null } : s;
    });
  }, []);

  /* הגעה מדף אחר עם ?pick=barmitzvah */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('pick');
    if (id) pick({ id });
  }, [pick]);

  return (
    <Layout>
      <a className="skip" href="#booking">דילוג להזמנת סשן</a>
      <Header
        topbar
        brandHref="#top"
        links={[['#about', 'אודות'], ['#music', 'המוזיקה שלי'], ['/bar-mitzvah', 'שיר בר / בת מצווה'], ['#studio', 'האולפן וחדר החזרות'], ['#gear', 'ציוד'], ['#pricing', 'מחירון'], ['#faq', 'שאלות נפוצות']]}
        cta={{ href: '#booking', label: 'הזמנת חדר / אולפן' }}
        quick={QUICK}
        onPick={pick}
      />

      <main>
        <StudioVideo />

        <section className="social" aria-labelledby="social-title">
          <div className="wrap social-in">
            <div>
              <h2 id="social-title" className="d" style={{ margin: 0, fontSize: 28, fontWeight: 500 }}>עקבו אחרי יניר</h2>
              <p style={{ margin: '4px 0 0', fontSize: 16, color: 'var(--muted)' }}>קליפים, מאחורי הקלעים וסשנים חדשים — תהיו הראשונים לראות.</p>
            </div>
            <div className="social-btns">
              <a className="sbtn s-ig" href={SOCIAL.instagram} target="_blank" rel="noopener"><IconInstagram />Instagram</a>
              <a className="sbtn s-tt" href={SOCIAL.tiktok} target="_blank" rel="noopener"><IconTikTok />TikTok</a>
              <a className="sbtn s-yt" href={SOCIAL.youtube} target="_blank" rel="noopener"><IconYouTube />YouTube</a>
              <a className="sbtn s-fb" href={SOCIAL.facebook} target="_blank" rel="noopener"><IconFacebook />Facebook</a>
            </div>
          </div>
        </section>

        <section id="home" className="wrap hero" aria-labelledby="hero-title">
          <div className="hero-txt">
            <div role="group" aria-label="בחירת מיקוד" className="modes">
              <button type="button" className="pill" aria-pressed={mode === 'artist'} onClick={() => setMode('artist')}>האמן והיוצר</button>
              <button type="button" className="pill" aria-pressed={mode === 'studio'} onClick={() => setMode('studio')}>אולפן ההקלטות וחדר החזרות</button>
            </div>
            <h1 id="hero-title" className="d">יניר סול <span style={{ color: 'var(--violet-l)' }}>|</span> SOL Production — <span className="grad">אולפן הקלטות באור יהודה</span></h1>
            <p className="lead" style={{ fontSize: 20, maxWidth: 620 }}>אולפן הקלטות מתקדם, חדר חזרות אקוסטי עם הקלטת ערוצים מלאה, והפקה מוזיקלית מקצה לקצה — כולל הקלטת קאברים, ברכות ושירי בר ובת מצווה.</p>
            <div className="glass hide-m" style={{ padding: '18px 22px', display: 'flex', gap: 14, alignItems: 'center', maxWidth: 600 }}>
              {mode === 'artist'
                ? <><IconNote /><p style={{ margin: 0, fontSize: 16, lineHeight: 1.55 }}>זמר, כותב, מלחין ומפיק. שירים מקוריים והפקות שנולדות מהדף הריק.</p></>
                : <><IconMic /><p style={{ margin: 0, fontSize: 16, lineHeight: 1.55 }}>חדר חזרות מטופל אקוסטית עם בקליין מלא, אולפן הקלטות עם תא שירה, וכל הערוצים מנותבים ישירות לחדר הבקרה.</p></>}
            </div>
            <div className="row">
              <a className="btn btn-main" href={WA_HELLO} target="_blank" rel="noopener"><IconWA />שריינו סשן בוואטסאפ</a>
              <a className="btn btn-glass" href="#music"><IconPlay />האזינו ליצירות שלי</a>
            </div>
          </div>
        </section>

        <section id="music" className="music-compact" aria-labelledby="music-title" style={{ scrollMarginTop: 110 }}>
          <div className="wrap" style={{ paddingBottom: 48 }}>
            <div className="sec-head">
              <span className="chip">המוזיקה של יניר · קאברים וסינגלים</span>
              <h2 id="music-title" className="d h2">אמן על הבמה, מפיק מאחורי הקונסולה</h2>
            </div>
            <div className="music-grid swipe">
              <article id="about" className="glass card lift about-card" style={{ scrollMarginTop: 110 }}>
                <span className="chip">אודות</span>
                <h3 className="d">יניר סול</h3>
                <p>זמר, כותב, מלחין ומפיק מוזיקלי. ב<span style={{ whiteSpace: 'nowrap' }}>־SOL Production</span> באור יהודה הוא מלווה אמנים, להקות ומשפחות מהרעיון הראשון ועד המאסטר.</p>
              </article>

              <article className="glass lift media">
                <div className="media-thumb">
                  <span className="media-tag">סינגל מקורי</span>
                  <div className="wave" aria-hidden="true">{WAVE.map((h, i) => <i key={i} style={{ height: h + '%' }} />)}</div>
                </div>
                <div className="media-body">
                  <h3 className="d">סביב</h3>
                  <span className="media-sub">יניר סול</span>
                  <div className="media-actions">
                    <a className="pill" href={'https://open.spotify.com/search/' + encodeURIComponent('יניר סול סביב')} target="_blank" rel="noopener">Spotify</a>
                    <a className="pill" href={'https://music.apple.com/il/search?term=' + encodeURIComponent('יניר סול סביב')} target="_blank" rel="noopener">Apple Music</a>
                    <a className="pill" href={yt('יניר סול סביב')} target="_blank" rel="noopener">YouTube</a>
                  </div>
                </div>
              </article>

              <article className="glass lift media">
                <a className="media-thumb" href={yt('ליאן שמחון קמה מהפחד')} target="_blank" rel="noopener" aria-label="צפייה ביוטיוב: קמה מהפחד – ליאן שמחון">
                  <span className="media-tag yt">YouTube</span>
                  <span className="rel-play" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><polygon points="7 4 20 12 7 20 7 4" /></svg></span>
                </a>
                <div className="media-body">
                  <h3 className="d">קמה מהפחד</h3>
                  <span className="media-sub">ליאן שמחון · קאבר בהפקת SOL Production</span>
                  <div className="media-actions">
                    <a className="btn btn-main btn-sm" href={yt('ליאן שמחון קמה מהפחד')} target="_blank" rel="noopener">צפייה ביוטיוב</a>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section aria-label="האולפן בפעולה" className="wrap hide-m" style={{ paddingBottom: 96 }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}><StudioViz /></div>
        </section>

        <section id="studio" className="wrap sec studio-compact" aria-labelledby="studio-title">
          <div className="sec-head">
            <span className="chip">הראשונים 41, אור יהודה · ציוד מקצועי</span>
            <h2 id="studio-title" className="d h2">האולפן וחדר החזרות</h2>
          </div>
          <div className="room-grid swipe">
            <article className="glass lift room">
              <div className="room-head"><div className="ico"><IconSpeaker /></div><h3>חדר חזרות אקוסטי</h3></div>
              <ul className="ticks">
                <li>טיפול אקוסטי מלא</li>
                <li>בקליין מלא – תופים, מגברים, קלידים</li>
                <li>עד 7 משדרי אוזניות (In-Ear) – מוניטור אישי לכל נגן</li>
                <li>כל ערוץ מנותב לחדר הבקרה להקלטה</li>
              </ul>
              <a className="btn btn-glass btn-sm" href="#booking" onClick={() => pick({ id: 'reh-base' })}>הזמנת חדר חזרות</a>
            </article>
            <article className="glass lift room">
              <div className="room-head"><div className="ico"><IconMixer /></div><h3>אולפן הקלטות והפקה</h3></div>
              <ul className="ticks">
                <li>חדר בקרה ותא שירה (Vocal Booth)</li>
                <li>כתיבה, הלחנה ועיבוד מלא</li>
                <li>כיוון קולות, מיקס ומאסטרינג</li>
                <li>שירי בר / בת מצווה, ברכות ושירים לאירועים</li>
              </ul>
              <a className="btn btn-glass btn-sm" href="#booking" onClick={() => pick({ service: 'single' })}>הזמנת סשן באולפן</a>
            </article>
            <article id="gear" className="glass lift room" style={{ scrollMarginTop: 110 }}>
              <div className="room-head"><span className="chip">Tech Specs</span><h3>המפרט הטכני</h3></div>
              <dl className="specs">
                {[
                  ['קונסולה', 'Allen & Heath Qu-7'],
                  ['כרטיס קול', 'RME + TotalMix FX'],
                  ['מיקרופון שירה', 'MXL Genesis'],
                  ['תוכנה', 'Cubase Pro'],
                  ['בקליין', 'תופים, מגברים, קלידים'],
                  ['מוניטור אישי', 'עד 7 משדרי In-Ear'],
                ].map(([k, v]) => (
                  <div key={k}><dt>{k}</dt><dd dir={/^[A-Za-z]/.test(v) ? 'ltr' : undefined}>{v}</dd></div>
                ))}
              </dl>
            </article>
          </div>
        </section>

        <Pricing selectedId={bk.selected?.id} onPick={pick} />
        <Booking st={bk} setSt={setBk} />
        <section id="bar-mitzvah" className="wrap" aria-labelledby="bm-title" style={{ paddingBottom: 96, scrollMarginTop: 110 }}>
          <div className="glass bm">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 id="bm-title" className="d">שיר בר מצווה ובת מצווה — נכתב, מוקלט ומופק במיוחד בשבילכם</h2>
              <p className="lead">שיר אישי לבר מצווה או לבת מצווה שמספר את הסיפור של חתן או כלת השמחה. יניר כותב את המילים, מלחין, מקליט אתכם באולפן ומפיק פלייבק אלקטרוני מלא — מוכן להשמעה באירוע, לסרטון ולשיתוף ברשתות.</p>
              <div className="prow"><span className="price">₪2,950</span><span className="unit">כתיבה, הקלטה והפקת פלייבק</span></div>
              <div className="row">
                <a className="btn btn-main" href="#booking" onClick={() => pick({ id: 'barmitzvah' })}>שריינו תאריך הקלטה</a>
                <a className="btn btn-glass" href="/bar-mitzvah">כל הפרטים על שיר בר / בת מצווה</a>
              </div>
            </div>
            <ol className="steps hide-m">
              <li><div><b>שיחת היכרות</b><span>מספרים על חתן / כלת השמחה, תחביבים, משפחה ורגעים מיוחדים.</span></div></li>
              <li><div><b>כתיבה והלחנה</b><span>יניר כותב מילים ולחן אישיים, ושולח לאישור.</span></div></li>
              <li><div><b>הקלטה באולפן</b><span>חוויה כיפית באולפן — גם בלי ניסיון בשירה, עם ליווי צמוד.</span></div></li>
              <li><div><b>הפקה, מיקס ומאסטר</b><span>פלייבק אלקטרוני מלא, תיקונים וקובץ מוכן לאירוע.</span></div></li>
            </ol>
          </div>
        </section>

        <Faq title="שאלות נפוצות על הקלטה באולפן" items={HOME_FAQ} />
        <Location
          chip="איך מגיעים"
          title="אולפן הקלטות בהראשונים 41, אור יהודה"
          text={<>שעות פעילות: <span dir="ltr">{HOURS}</span> · טלפון: <a href={TEL} dir="ltr">{PHONE}</a></>}
        />
      </main>

      <Footer links={[['/bar-mitzvah', 'שיר בר מצווה / בת מצווה'], ['#pricing', 'מחירון'], ['/accessibility', 'הצהרת נגישות']]} />
      <BookBar text="מוכנים להקליט?" sub="שריינו סשן באולפן" href="#booking" label="הזמינו סשן" />
    </Layout>
  );
}
