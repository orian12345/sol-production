import { Layout, Header, Footer } from '../components/Layout.jsx';
import { SITE_TERMS } from '../siteTerms.js';

/* =====================================================================
   תקנון האתר — /terms   (הנוסח עצמו: src/siteTerms.js)
   ===================================================================== */
const Item = ({ it }) => {
  if (typeof it === 'string') return <li>{it}</li>;
  return (
    <li>
      {it.t}{it.link && <a href={it.link[0]}>{it.link[1]}</a>}{it.after || ''}
      {it.sub && <ul className="terms-sub">{it.sub.map((s) => <li key={s}>{s}</li>)}</ul>}
    </li>
  );
};

export default function Terms() {
  return (
    <Layout>
      <Header cta={{ href: '/#booking', label: 'הזמנת סשן', glass: true }} />
      <main className="wrap legal terms-page">
        <h1 className="d">תקנון האתר – SOL Production</h1>
        <p className="terms-updated">עודכן לאחרונה: {SITE_TERMS.updated}</p>

        {SITE_TERMS.sections.map((sec, n) => (
          <section key={sec.title}>
            <h2>{n + 1}. {sec.title}</h2>
            {sec.table ? (
              <table className="q-table terms-table">
                <tbody>{sec.table.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td dir={/^[\d\-–:]+$/.test(v) ? 'ltr' : undefined}>{v}</td></tr>)}</tbody>
              </table>
            ) : (
              <ol className="terms-list">
                {sec.items.map((it, i) => <Item key={i} it={it} />)}
              </ol>
            )}
          </section>
        ))}
      </main>
      <Footer links={[['/', 'ראשי'], ['/#pricing', 'מחירון']]} />
    </Layout>
  );
}
