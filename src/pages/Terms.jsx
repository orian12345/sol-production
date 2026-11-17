import { Layout, Header, Footer } from '../components/Layout.jsx';
import { TEL, PHONE, WA_HELLO } from '../data.js';
import { TERMS } from '../terms.js';

/* =====================================================================
   תקנון — /terms
   תקנון האולפן מוצג מאותו מקור כמו ההסכם שהלקוח חותם עליו (src/terms.js),
   כך שכל שינוי שם מתעדכן גם כאן. בנוסף — כללי שימוש באתר והזמנה דרכו.
   ===================================================================== */
export default function Terms() {
  const b = TERMS.business;
  return (
    <Layout>
      <Header cta={{ href: '/#booking', label: 'הזמנת סשן', glass: true }} />
      <main className="wrap legal">
        <h1 className="d">תקנון</h1>
        <p>{b.name} · {b.address}{b.taxId ? ` · עוסק פטור ${b.taxId}` : ''} · טלפון: <a href={TEL} dir="ltr">{PHONE}</a></p>
        <p>הזמנת שירות באתר או באולפן מהווה הסכמה לתנאים שלהלן. אותו נוסח מופיע בהסכם שנחתם בעת ההזמנה.</p>

        {TERMS.sections.map((sec) => (
          <section key={sec.title}>
            <h2>{sec.title}</h2>
            <ul>
              {sec.items.filter((i) => !i.trim().startsWith('[להשלים')).map((i) => <li key={i}>{i}</li>)}
            </ul>
          </section>
        ))}

        <h2>תשלום במזומן</h2>
        <ul><li>{TERMS.cashClause}</li></ul>

        <h2>מחירים</h2>
        <ul>
          <li>המחירים באתר סופיים. {TERMS.quote.vatNote}</li>
          <li>שירותים שמחירם "לפי הצעת מחיר אישית" או טווח מחירים — המחיר הסופי נקבע מול יניר סול לפני תחילת העבודה.</li>
          <li>קוד קופון חל על החבילות שנבחרו מהמחירון, אחד לכל הזמנה, ואינו חל על שיעור היכרות באקדמיה.</li>
        </ul>

        <h2>שימוש באתר</h2>
        <ul>
          <li>התכנים באתר — טקסטים, תמונות, סרטונים ומוזיקה — שייכים ל-SOL Production או לבעלי הזכויות בהם, ואין להעתיק או לפרסם אותם בלי אישור.</li>
          <li>אנחנו משתדלים שהמידע באתר יהיה מדויק ומעודכן. במקרה של טעות במחיר או בפרט אחר, יניר סול יעדכן את הלקוח לפני ביצוע ההזמנה.</li>
          <li>הפרטים שנמסרים באתר נשמרים ומשמשים לפי <a href="/privacy">מדיניות הפרטיות</a>. ביטולים — לפי <a href="/cancellation">מדיניות הביטולים</a>.</li>
        </ul>

        <h2>שאלות</h2>
        <p>בכל שאלה על התקנון אפשר לפנות ליניר סול בטלפון <a href={TEL} dir="ltr">{PHONE}</a> או <a href={WA_HELLO} target="_blank" rel="noopener">בוואטסאפ</a>.</p>

        <p style={{ marginTop: 32 }}>גרסת תקנון: {TERMS.version}.</p>
      </main>
      <Footer links={[['/', 'ראשי'], ['/#pricing', 'מחירון']]} />
    </Layout>
  );
}
