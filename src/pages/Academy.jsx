import { useState } from 'react';
import { Layout, Header, Footer, BookBar } from '../components/Layout.jsx';
import { IconWA } from '../components/icons.jsx';
import { waLink, ADDRESS } from '../data.js';
import { academyData, academyText } from '../academy.js';

const ils = (n) => '₪' + n.toLocaleString('en-US');

function TeacherCard({ t }) {
  const recommended = t.tiers.find((x) => x.recommended) || t.tiers[0];
  const [tierId, setTierId] = useState(recommended.id);
  const tier = t.tiers.find((x) => x.id === tierId);
  const single = t.tiers.find((x) => x.lessons === 1) || t.tiers[0];
  const perLesson = Math.round(tier.price / tier.lessons);
  const saving = single.price * tier.lessons - tier.price;
  const groupId = 'tier-' + t.id;

  const msg = [
    'היי, אשמח לתאם שיעורי נגינה ב-SOL Academy:',
    '',
    `• כלי: ${t.instrument}`,
    `• מורה: ${t.teacher}`,
    `• חבילה: ${tier.label}${tier.note ? ` (${tier.note})` : ''}`,
    `• מחיר: ${ils(tier.price)}${tier.lessons > 1 ? ` (${ils(perLesson)} לשיעור)` : ''}`,
    '',
    'תודה!',
  ].join('\n');

  return (
    <article className="ac-card" aria-labelledby={'ac-h-' + t.id}>
      <header className="ac-head">
        {t.photo
          ? <img className="ac-photo" src={t.photo} alt={t.teacher + ' – ' + t.instrument} width="76" height="76" loading="lazy" />
          : <span className="ac-photo ac-photo-empty" aria-hidden="true">{t.teacher.charAt(0)}</span>}
        <div>
          <span className="ac-instr">{t.instrument}</span>
          <h2 id={'ac-h-' + t.id} className="ac-name">{t.teacher}</h2>
        </div>
      </header>

      <dl className="ac-info">
        <div><dt>על הבמות</dt><dd>{t.stage}</dd></div>
        <div><dt>ציוד בשיעור</dt><dd>{t.gear}</dd></div>
      </dl>

      <fieldset className="ac-tiers">
        <legend className="ac-legend">אפשרויות ומחירים</legend>
        {t.tiers.map((x) => {
          const per = Math.round(x.price / x.lessons);
          const save = single.price * x.lessons - x.price;
          return (
            <label key={x.id} className={'ac-tier' + (x.id === tierId ? ' on' : '') + (x.recommended ? ' rec' : '')}>
              <input type="radio" name={groupId} value={x.id} checked={x.id === tierId} onChange={() => setTierId(x.id)} />
              <span className="ac-tier-main">
                <span className="ac-tier-label">{x.label}{x.note ? ` (${x.note})` : ''}{x.recommended ? ' 🔥' : ''}</span>
                {x.lessons > 1 && <span className="ac-tier-sub">{ils(per)} לשיעור · חיסכון של {ils(save)}</span>}
              </span>
              <span className="ac-tier-price">{ils(x.price)}</span>
            </label>
          );
        })}
      </fieldset>

      <div className="ac-total" aria-live="polite">
        <span className="ac-total-price">{ils(tier.price)}</span>
        <span className="ac-total-sub">
          {tier.lessons > 1 ? `${tier.lessons} שיעורים · ${ils(perLesson)} לשיעור · חוסכים ${ils(saving)}` : 'שיעור אחד · 60 דקות'}
        </span>
      </div>

      <a className="ac-cta" href={waLink(msg)} target="_blank" rel="noopener">
        <IconWA size={20} />{academyText.cta}
      </a>
    </article>
  );
}

export default function Academy() {
  return (
    <Layout>
      <Header
        links={[['/', 'ראשי'], ['/#studio', 'האולפן'], ['/#pricing', 'מחירון']]}
        cta={{ href: '/#booking', label: 'הזמנת חדר / אולפן' }}
      />
      <main className="academy">
        <section className="wrap ac-wrap" aria-labelledby="ac-title">
          <nav aria-label="פירורי לחם" className="ac-crumbs"><a href="/">ראשי</a> / שיעורי נגינה</nav>
          <h1 id="ac-title" className="ac-title">{academyText.title}</h1>
          <p className="ac-sub">{academyText.subtitle}</p>
          <p className="ac-where">{ADDRESS} · שיעורים אחד-על-אחד · 60 דקות</p>

          <div className="ac-grid swipe">
            {academyData.map((t) => <TeacherCard key={t.id} t={t} />)}
          </div>
        </section>
      </main>
      <Footer links={[['/', 'ראשי'], ['/#pricing', 'מחירון אולפן']]} />
      <BookBar text="SOL Academy" sub="שיעורי תופים, בס וגיטרה" href="#ac-title" label="למורים ולמחירים" />
    </Layout>
  );
}
