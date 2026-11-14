import { Layout, Header, Footer } from '../components/Layout.jsx';
import { TEL, PHONE, WA_HELLO } from '../data.js';

const EXAMPLES = [
  ['חדר חזרות ל-2 שעות', 240],
  ['הקלטת קאבר על פלייבק', 650],
  ['שיר בר / בת מצווה', 2950],
];
const fee = (n) => Math.max(Math.round(n * 0.1), 50);
const ils = (n) => '₪' + n.toLocaleString('en-US');

export default function Cancellation() {
  return (
    <Layout>
      <Header cta={{ href: '/', label: 'חזרה לדף הבית', glass: true }} />
      <main className="wrap legal">
        <h1 className="d">מדיניות ביטולים</h1>
        <p>שריון מועד באולפן שומר עבורכם את השעה ומונע מלקוחות אחרים להזמין אותה, לכן ביטול ברגע האחרון כרוך בדמי ביטול.</p>

        <h2>ביטול או שינוי מועד</h2>
        <ul>
          <li><strong>עד 24 שעות לפני המועד</strong> – ללא חיוב.</li>
          <li><strong>פחות מ-24 שעות לפני המועד</strong> – דמי ביטול של <strong>10% מסכום ההזמנה או 50 ₪, הגבוה מביניהם</strong>.</li>
          <li>ביטול או שינוי מועד מתאמים מול יניר סול בטלפון <a href={TEL} dir="ltr">{PHONE}</a> או <a href={WA_HELLO} target="_blank" rel="noopener">בוואטסאפ</a>. מועד הביטול נקבע לפי שעת ההודעה.</li>
        </ul>

        <h2>דוגמאות לביטול פחות מ-24 שעות לפני</h2>
        <table className="q-table" style={{ maxWidth: 560 }}>
          <thead><tr><th>הזמנה</th><th>סכום</th><th>דמי ביטול</th></tr></thead>
          <tbody>
            {EXAMPLES.map(([name, amount]) => (
              <tr key={name}><td>{name}</td><td>{ils(amount)}</td><td>{ils(fee(amount))}</td></tr>
            ))}
          </tbody>
        </table>

        <p style={{ marginTop: 32 }}>המדיניות חלה על כל השירותים באולפן ובחדר החזרות, ומופיעה גם בתקנון האולפן.</p>
      </main>
      <Footer links={[['/', 'ראשי'], ['/#pricing', 'מחירון']]} />
    </Layout>
  );
}
