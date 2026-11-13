import { Layout, Header, Footer, BookBar } from '../components/Layout.jsx';
import { Faq, Location } from '../components/Sections.jsx';
import { IconWA } from '../components/icons.jsx';
import { BM_FAQ, TEL, PHONE, HOURS, waLink } from '../data.js';

const BOOK = '/?pick=barmitzvah#booking';

const MORE = [
  ['הקלטת ברכה / דרשה לאירוע', 'הקלטת ברכה של ההורים או דרשת בר מצווה, כולל מוזיקת רקע ועריכה.', '₪500', null, 'greeting'],
  ['הקלטת קאבר על פלייבק קיים', 'שיר אהוב שחתן או כלת השמחה רוצים לשיר — כולל תיקונים, מיקס ומאסטר.', '₪750', '₪950', 'cover-playback'],
  ['הקלטה וצילום רילס', 'צילום רילס מההקלטה באולפן — לטיקטוק ולאינסטגרם.', '₪650', null, 'reels'],
];

export default function BarMitzvah() {
  return (
    <Layout>
      <Header
        links={[['/', 'ראשי'], ['/#studio', 'האולפן'], ['/#pricing', 'מחירון'], ['#faq', 'שאלות נפוצות']]}
        cta={{ href: BOOK, label: 'שריינו תאריך' }}
      />
      <main>
        <section className="wrap hero" aria-labelledby="hero-title">
          <div className="hero-txt">
            <nav aria-label="פירורי לחם" style={{ fontSize: 14, color: 'var(--muted)' }}><a href="/">ראשי</a> / שיר בר מצווה ובת מצווה</nav>
            <h1 id="hero-title" className="d">שיר בר מצווה ובת מצווה — <span className="grad">נכתב, מוקלט ומופק במיוחד בשבילכם</span></h1>
            <p className="lead" style={{ fontSize: 20, maxWidth: 640 }}>מתנה שנשארת לכל החיים: שיר אישי לחתן או לכלת השמחה, שנכתב על פי הסיפור שלהם, מוקלט באולפן הקלטות מקצועי של SOL Production באור יהודה ומופק עם פלייבק אלקטרוני מלא — מוכן להשמעה באירוע.</p>
            <div className="prow"><span className="price">₪2,950</span><span className="unit">כתיבה, הלחנה, הקלטה באולפן והפקת פלייבק</span></div>
            <div className="row">
              <a className="btn btn-main" href={BOOK}>שריינו תאריך הקלטה</a>
              <a className="btn btn-wa" href={waLink('היי יניר, אשמח לשמוע פרטים על שיר בר / בת מצווה')} target="_blank" rel="noopener"><IconWA />שאלה ליניר בוואטסאפ</a>
            </div>
          </div>
          <div className="hero-viz">
            <div className="glass float" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <span className="chip">מה כלול בחבילה</span>
              <ul className="ticks">
                <li>שיחת היכרות ואיסוף סיפורים על חתן / כלת השמחה</li>
                <li>כתיבת מילים אישיות והלחנה מקורית</li>
                <li>הקלטה באולפן עם ליווי צמוד — גם בלי ניסיון בשירה</li>
                <li>הפקת פלייבק אלקטרוני מלא</li>
                <li>תיקונים, כיוון קולות, מיקס ומאסטר</li>
                <li>קובץ מוכן לאירוע, לסרטון ולרשתות</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="band sec" aria-labelledby="how-title">
          <div className="wrap">
            <div className="sec-head"><span className="chip">איך זה עובד</span><h2 id="how-title" className="d h2">מהרעיון ועד השיר באירוע — ב־4 שלבים</h2></div>
            <div className="grid">
              {[
                ['שיחת היכרות', 'מספרים ליניר על חתן או כלת השמחה — תחביבים, משפחה, חברים, בדיחות פנימיות ורגעים מיוחדים.'],
                ['כתיבה והלחנה', 'יניר כותב מילים ומלחין לחן מקורי בסגנון שמתאים לכם — פופ, מזרחית, היפ־הופ או בלדה — ושולח לאישור.'],
                ['הקלטה באולפן', 'חוויה כיפית באולפן ההקלטות באור יהודה. אפשר לצרף הורים, אחים וחברים להקלטה.'],
                ['הפקה ומסירה', 'פלייבק אלקטרוני מלא, מיקס ומאסטר — ומקבלים שיר מוכן להשמעה ברחבה. אפשר להוסיף קליפ אולפן.'],
              ].map(([t, d], i) => (
                <article key={t} className="glass card"><span className="chip">{'שלב ' + (i + 1)}</span><h3>{t}</h3><p>{d}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap sec" aria-labelledby="more-title">
          <div className="sec-head"><span className="chip">עוד הקלטות לאירוע</span><h2 id="more-title" className="d h2">משלימים את האירוע</h2></div>
          <div className="grid">
            {MORE.map(([t, d, p, old, id]) => (
              <article key={id} className="glass card lift">
                <h3>{t}</h3><p>{d}</p>
                <div className="prow"><span className="price">{p}</span>{old && <s className="old">{'במקום ' + old}</s>}</div>
                <a className="btn btn-glass btn-sm" href={`/?pick=${id}#booking`} style={{ alignSelf: 'flex-start' }}>להזמנה</a>
              </article>
            ))}
          </div>
        </section>

        <Faq title="שאלות נפוצות על שיר בר מצווה ובת מצווה" items={BM_FAQ} firstOpen />
        <Location
          chip="אולפן הקלטות באור יהודה"
          title="הראשונים 41, אור יהודה"
          text={<>דקות מתל אביב, רמת גן, קריית אונו, יהוד ופתח תקווה · <span dir="ltr">{HOURS}</span> · <a href={TEL} dir="ltr">{PHONE}</a></>}
          actions={<>
            <a className="btn btn-main btn-sm" href={BOOK}>הזמנת שיר בר / בת מצווה</a>
            <a className="btn btn-glass btn-sm" href={TEL}>חייגו עכשיו</a>
          </>}
        />
      </main>
      <Footer links={[['/', 'ראשי'], ['/#pricing', 'מחירון'], ['/accessibility', 'הצהרת נגישות']]} />
      <BookBar text="שיר בר / בת מצווה" sub="· ₪2,950" href={BOOK} label="שריינו תאריך" />
    </Layout>
  );
}
