// אחרי הבנייה: ממלא כל דף HTML בתוכן המלא של React, כדי שגוגל יקרא את הכול בלי להריץ JavaScript
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ssrDir = path.resolve('dist-ssr');
// מוצאים את קובץ ה-SSR גם אם כלי הבנייה (למשל Cloudflare) שם אותו בתת-תיקייה או הוסיף לשם שלו hash
const entry = fs.readdirSync(ssrDir, { recursive: true })
  .map(String)
  .find((f) => /(^|[\\/])entry-server[^\\/]*\.m?js$/.test(f));
if (!entry) throw new Error('entry-server bundle not found in dist-ssr');
const { render } = await import(pathToFileURL(path.join(ssrDir, entry)).href);

const pages = { 'index.html': 'home', 'bar-mitzvah.html': 'barmitzvah', 'accessibility.html': 'accessibility' };
for (const [file, page] of Object.entries(pages)) {
  const p = path.resolve('dist', file);
  const html = fs.readFileSync(p, 'utf8');
  if (!html.includes('<!--app-->')) throw new Error('missing <!--app--> in ' + file);
  fs.writeFileSync(p, html.replace('<!--app-->', render(page)));
  console.log('prerendered', file);
}
fs.rmSync(ssrDir, { recursive: true, force: true });
