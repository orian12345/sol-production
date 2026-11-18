import { ALL_ITEMS, findCoupon } from './data.js';

/* חישוב הצעת המחיר — משותף לדף ההסכם (/quote) ולחלון התשלום (סכום להעברה) */
export const num = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;
export const ils = (n) => '₪' + n.toLocaleString('en-US');
export const asList = (sel) => (Array.isArray(sel) ? sel : sel ? [sel] : []);

// שורה לכל פריט שנבחר מהמחירון; סה"כ רק לפריטים במחיר קבוע
export function quoteLines(q) {
  const picked = asList(q.selected);
  if (!picked.length) return { lines: [{ desc: q.svcLabel, qty: '', unit: '', total: 'ייקבע מול יניר' }], total: null, open: true };
  let total = 0, open = false;
  const lines = picked.map((sel) => {
    // פריט עם סכום קבוע שלא מהמחירון (למשל חבילת שיעורים ב-SOL Academy)
    if (typeof sel.amount === 'number' && sel.amount > 0) { total += sel.amount; return { desc: sel.name, qty: '1', unit: ils(sel.amount), total: ils(sel.amount) }; }
    const it = ALL_ITEMS.find((x) => x.id === sel.id);
    if (!it) { open = true; return { desc: sel.name, qty: '', unit: sel.price || '', total: 'ייקבע מול יניר' }; }
    if (it.quote) { open = true; return { desc: it.name, qty: '', unit: '', total: 'לפי הצעת מחיר אישית' }; }
    if (/–/.test(it.price)) { open = true; return { desc: it.name, qty: '', unit: it.price, total: it.price }; }
    const unitPrice = num(it.price);
    const hourly = it.unit === 'לשעה';
    // משך נבחר רק בחדר חזרות. שירות לפי שעה אחר (למשל השכרת אולפן) — יניר מתאים את משך הסשן
    if (hourly && !(q.isReh && it.service === 'rehearsal')) {
      open = true;
      return { desc: it.name + (it.desc ? ' – ' + it.desc : ''), qty: 'לפי משך הסשן', unit: ils(unitPrice) + ' ' + it.unit, total: 'ייקבע מול יניר' };
    }
    const qty = hourly ? (parseInt(q.dur, 10) || 1) : 1;
    total += unitPrice * qty;
    return { desc: it.name + (it.desc ? ' – ' + it.desc : ''), qty: hourly ? qty + ' שעות' : '1', unit: ils(unitPrice) + (it.unit ? ' ' + it.unit : ''), total: ils(unitPrice * qty) };
  });
  return { lines, total: total > 0 ? total : null, open };
}

// הסכום לתשלום (אחרי קופון). fixed=false כשיש פריטים שהמחיר שלהם ייקבע מול יניר
export function payAmount(q) {
  const { total, open } = quoteLines(q);
  if (!total) return null;
  const c = findCoupon(q.coupon);
  return { amount: total - (c ? Math.round(total * c.percent / 100) : 0), fixed: !open };
}
