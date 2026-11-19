/* =====================================================================
   SOL Production — שרת ההזמנות (Cloudflare Worker)
   זרימה: הלקוח בוחר שעה פנויה → נוצר דף תשלום ב-Morning → אחרי תשלום
   Morning מודיעה לנו → האירוע נכנס ליומן של יניר בגוגל.
   כל השאר (דפי האתר) מוגש מהתיקייה dist כרגיל.

   סודות (מגדירים פעם אחת עם `npx wrangler secret put <NAME>`, לא בקוד):
     MORNING_CLIENT_ID, MORNING_CLIENT_SECRET   — מפתח API של Morning
     GOOGLE_SA_EMAIL, GOOGLE_SA_KEY             — חשבון שירות של גוגל (מפתח פרטי PEM)
     GOOGLE_CALENDAR_ID                         — היומן של יניר (בד"כ כתובת הג'ימייל שלו)
   משתנים רגילים: ב-wrangler.jsonc תחת "vars".
   ===================================================================== */

const OPEN = 10, CLOSE = 23;            // שעות פעילות (שעון ישראל)
const HOLD_MINUTES = 20;                // כמה זמן שעה "נעולה" בזמן שהלקוח משלם
const TZ = 'Asia/Jerusalem';

const MORNING = {
  production: { token: 'https://api.morning.co/idp/v1/oauth/token', api: 'https://api.greeninvoice.co.il/api/v1' },
  sandbox: { token: 'https://api.sandbox.morning.dev/idp/v1/oauth/token', api: 'https://sandbox.d.greeninvoice.co.il/api/v1' },
};

// קודי קופון (אותה רשימה כמו ב-src/data.js → COUPONS)
const COUPONS = { MAYAN: 10 };
const couponOf = (code) => {
  const k = String(code || '').trim().toUpperCase();
  return COUPONS[k] ? { code: k, percent: COUPONS[k] } : null;
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const configured = (env) =>
  !!(env.MORNING_CLIENT_ID && env.MORNING_CLIENT_SECRET && env.GOOGLE_SA_EMAIL && env.GOOGLE_SA_KEY && env.GOOGLE_CALENDAR_ID && env.BOOKINGS);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // כתובת ראשית אחת לגוגל: solproduction.co.il ו-workers.dev → https://www.solproduction.co.il (ה-API עובד בכל הכתובות)
    if (!url.pathname.startsWith('/api/') && (url.protocol === 'http:' || url.hostname === 'solproduction.co.il' || url.hostname.endsWith('.workers.dev'))) {
      return Response.redirect('https://www.solproduction.co.il' + url.pathname + url.search, 301);
    }
    try {
      if (url.pathname === '/api/availability' && request.method === 'GET') return await availability(url, env);
      if (url.pathname === '/api/book' && request.method === 'POST') return await book(request, url, env);
      if (url.pathname === '/api/morning-notify' && request.method === 'POST') return await notify(request, url, env);
      if (url.pathname === '/api/request' && request.method === 'POST') return await sendRequest(request, env);
      if (url.pathname === '/api/academy-slots' && request.method === 'GET') return await academySlots(url, env);
      if (url.pathname === '/api/academy-pay' && request.method === 'POST') return await academyPay(request, url, env);
      if (url.pathname === '/api/academy-notify' && request.method === 'POST') return await academyNotify(request, url, env);
      if (url.pathname === '/api/agreement' && request.method === 'POST') return await saveAgreement(request, env);
      if (url.pathname.startsWith('/api/agreement/') && request.method === 'GET') return await getAgreement(url, env);
      if (url.pathname === '/api/pay-claim' && request.method === 'POST') return await payClaim(request, url, env);
      if (url.pathname === '/api/pay-status' && request.method === 'GET') return await payStatus(url, env);
      if (url.pathname === '/api/pay-approve') return await payApprove(request, url, env);
      if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    } catch (e) {
      console.error('api error', url.pathname, e && e.stack || e);
      return json({ error: 'server_error' }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};

/* ---------- זמנים (שעון ישראל) ---------- */

// "2026-11-20", "19:00" → Date (UTC) של השעה הזו בישראל
function israelTime(date, time) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off = tzOffsetMinutes(new Date(guess));
  return new Date(guess - off * 60000);
}
function tzOffsetMinutes(at) {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' }).formatToParts(at)
    .find((p) => p.type === 'timeZoneName').value; // "GMT+02:00"
  const m = s.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0));
}
const pad = (n) => (n < 10 ? '0' : '') + n;
const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const validTime = (s) => /^\d{2}:00$/.test(s || '');

/* ---------- זמינות ---------- */

async function busyRanges(env, date) {
  const dayStart = israelTime(date, '00:00'), dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  const ranges = [];
  // 1) מה שכבר ביומן של יניר
  const token = await googleToken(env);
  const fb = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ timeMin: dayStart.toISOString(), timeMax: dayEnd.toISOString(), timeZone: TZ, items: [{ id: env.GOOGLE_CALENDAR_ID }] }),
  });
  if (!fb.ok) throw new Error('google freeBusy ' + fb.status + ' ' + (await fb.text()));
  const cal = (await fb.json()).calendars[env.GOOGLE_CALENDAR_ID] || {};
  if (cal.errors && cal.errors.length) throw new Error('google calendar access: ' + JSON.stringify(cal.errors));
  for (const b of cal.busy || []) ranges.push([new Date(b.start).getTime(), new Date(b.end).getTime()]);
  // 2) שעות שמישהו באמצע לשלם עליהן
  const list = await env.BOOKINGS.list({ prefix: 'hold:' + date + ':' });
  for (const k of list.keys) {
    const h = await env.BOOKINGS.get(k.name, 'json');
    if (h) ranges.push([h.start, h.end]);
  }
  return ranges;
}
const overlaps = (ranges, s, e) => ranges.some(([a, b]) => s < b && a < e);

async function availability(url, env) {
  const deposit = Number(env.DEPOSIT || 0);
  const base = { configured: configured(env) && deposit > 0, deposit, policy: env.CANCEL_POLICY || '', academy: academyCfg(env), notify: notifyOn(env) };
  if (!base.configured) return json(base);
  const date = url.searchParams.get('date');
  const dur = Math.min(8, Math.max(1, parseInt(url.searchParams.get('dur'), 10) || 2));
  if (!validDate(date)) return json(base);
  const ranges = await busyRanges(env, date);
  const now = Date.now();
  const slots = [];
  for (let h = OPEN; h + dur <= CLOSE; h++) {
    const t = pad(h) + ':00';
    const s = israelTime(date, t).getTime(), e = s + dur * 3600 * 1000;
    slots.push({ time: t, free: s > now + 3600 * 1000 && !overlaps(ranges, s, e) });
  }
  return json({ ...base, date, dur, slots });
}

/* ---------- יצירת הזמנה + דף תשלום ---------- */

async function book(request, url, env) {
  const deposit = Number(env.DEPOSIT || 0);
  if (!configured(env) || !(deposit > 0)) return json({ error: 'not_configured' }, 503);
  const b = await request.json().catch(() => ({}));
  const name = String(b.name || '').trim().slice(0, 80);
  const phone = String(b.phone || '').replace(/[^\d+\-\s]/g, '').trim().slice(0, 20);
  const email = String(b.email || '').trim().slice(0, 120);
  const dur = Math.min(8, Math.max(1, parseInt(b.dur, 10) || 2));
  if (!name || phone.replace(/\D/g, '').length < 9) return json({ error: 'missing_contact' }, 400);
  if (!validDate(b.date) || !validTime(b.time)) return json({ error: 'bad_slot' }, 400);
  const hour = parseInt(b.time, 10);
  if (hour < OPEN || hour + dur > CLOSE) return json({ error: 'bad_slot' }, 400);

  const start = israelTime(b.date, b.time).getTime(), end = start + dur * 3600 * 1000;
  if (start < Date.now() + 3600 * 1000) return json({ error: 'bad_slot' }, 400);
  if (overlaps(await busyRanges(env, b.date), start, end)) return json({ error: 'slot_taken' }, 409);

  // אמצעי תשלום בדף של Morning: 100 = אשראי, 120 = ביט (אחר — ברירת המחדל של העסק)
  const group = [100, 120, 150, 160].includes(Number(b.group)) ? Number(b.group) : undefined;
  // תשלום קבוצתי: המקדמה מתחלקת ל-n קישורים, אחד לכל משתתף
  const parts = Math.min(10, Math.max(1, parseInt(b.split, 10) || 1));
  const partAmount = Math.ceil(deposit / parts);

  const id = crypto.randomUUID();
  const secret = crypto.randomUUID().replace(/-/g, '');
  const booking = {
    id, secret, status: 'pending', created: Date.now(), start, end, date: b.date, time: b.time, dur, parts, paidParts: [],
    name, phone, email,
    service: String(b.serviceLabel || '').slice(0, 120),
    pkg: String(b.selected || '').slice(0, 160),
    band: String(b.band || '').slice(0, 40), rec: !!b.rec,
    notes: String(b.notes || '').slice(0, 500),
  };
  await env.BOOKINGS.put('booking:' + id, JSON.stringify(booking), { expirationTtl: 60 * 60 * 24 * 14 });
  // בתשלום קבוצתי נותנים לחברים יותר זמן לשלם (60 דק') לפני שהשעה משתחררת
  await env.BOOKINGS.put('hold:' + b.date + ':' + id, JSON.stringify({ start, end }), { expirationTtl: (parts > 1 ? 60 : HOLD_MINUTES) * 60 });

  const site = (env.SITE_URL || url.origin).replace(/\/$/, '');
  const [y, m, d] = b.date.split('-');
  const when = `${d}/${m}/${y} ${b.time}`;
  const makeForm = (part) => morning(env, '/payments/form', {
    description: `מקדמה לשריון סשן ב-SOL Production – ${when}` + (parts > 1 ? ` (חלק ${part}/${parts})` : ''),
    type: Number(env.MORNING_DOC_TYPE || 400),
    amount: parts > 1 ? partAmount : deposit,
    currency: 'ILS',
    vatType: 0,
    lang: 'he',
    maxPayments: 1,
    ...(group ? { group } : {}),
    client: { name: parts > 1 ? `${name} (קבוצה – חלק ${part}/${parts})` : name, phone, mobile: phone, emails: email && part === 1 ? [email] : undefined, add: part === 1 },
    remarks: [booking.service, booking.pkg, b.payMethod && `אמצעי תשלום: ${String(b.payMethod).slice(0, 30)}`].filter(Boolean).join(' · '),
    successUrl: `${site}/?booked=1#booking`,
    failureUrl: `${site}/?payfail=1#booking`,
    notifyUrl: `${url.origin}/api/morning-notify?id=${id}&k=${secret}&part=${part}`,
    custom: id + ':' + part,
  });
  const forms = await Promise.all(Array.from({ length: parts }, (_, i) => makeForm(i + 1)));
  if (forms.some((f) => !f || !f.url)) {
    console.error('morning form failed', JSON.stringify(forms));
    await env.BOOKINGS.delete('hold:' + b.date + ':' + id);
    return json({ error: 'payment_unavailable' }, 502);
  }
  if (parts > 1) return json({ urls: forms.map((f) => f.url), partAmount });
  return json({ url: forms[0].url });
}

/* ---------- Morning מודיעה שהתשלום עבר → נכנס ליומן ---------- */

async function notify(request, url, env) {
  const id = url.searchParams.get('id') || '';
  const key = url.searchParams.get('k') || '';
  const raw = await env.BOOKINGS.get('booking:' + id);
  if (!raw) return json({ ok: false }, 404);
  const bk = JSON.parse(raw);
  if (!key || key !== bk.secret) return json({ ok: false }, 403);

  // תשלום קבוצתי: כל חלק מעדכן; השריון ביומן נכנס בתשלום הראשון
  const part = parseInt(url.searchParams.get('part'), 10) || 1;
  bk.paidParts = bk.paidParts || [];
  if (bk.paidParts.includes(part)) return json({ ok: true }); // הודעה כפולה — כבר טופל
  if (bk.status === 'paid') {
    bk.paidParts.push(part);
    await env.BOOKINGS.put('booking:' + id, JSON.stringify(bk), { expirationTtl: 60 * 60 * 24 * 90 });
    await notifyOwner(env, [`💳 תשלום קבוצתי – שולם חלק ${part}/${bk.parts} (${bk.paidParts.length}/${bk.parts} שולמו)`, `לקוח: ${bk.name} · ${bk.phone}`, `מועד: ${ilDate(bk.start)}`].join('\n')).catch(() => {});
    return json({ ok: true });
  }

  let payload = '';
  try { payload = (await request.text()).slice(0, 4000); } catch { /* ignore */ }

  // בדיקה שלא נתפס בינתיים (למשל אם התשלום הגיע אחרי שהנעילה פגה)
  const others = (await busyRanges(env, bk.date)).filter(([a, b]) => !(a === bk.start && b === bk.end));
  const clash = overlaps(others, bk.start, bk.end);

  const lines = [
    'הזמנה מהאתר – שולמה מקדמה ✓',
    `לקוח: ${bk.name}`, `טלפון: ${bk.phone}`, bk.email && `מייל: ${bk.email}`,
    `שירות: ${bk.service}`, bk.pkg && `חבילה: ${bk.pkg}`,
    bk.band && `הרכב: ${bk.band}`, bk.band && `הקלטת ערוצים: ${bk.rec ? 'כן' : 'לא'}`,
    bk.notes && `הערות: ${bk.notes}`,
    clash && '⚠ שימו לב: יש חפיפה עם אירוע אחר ביומן',
    `מזהה הזמנה: ${bk.id}`,
  ].filter(Boolean);

  const token = await googleToken(env);
  const ev = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events`, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({
      summary: `${clash ? '⚠ ' : ''}${bk.service || 'סשן'} – ${bk.name} (שולם)`,
      description: lines.join('\n'),
      start: { dateTime: new Date(bk.start).toISOString(), timeZone: TZ },
      end: { dateTime: new Date(bk.end).toISOString(), timeZone: TZ },
      colorId: clash ? '11' : '10',
    }),
  });
  if (!ev.ok) {
    console.error('calendar insert failed', ev.status, await ev.text());
    return json({ ok: false }, 502); // Morning תנסה שוב
  }
  bk.status = 'paid';
  bk.paidAt = Date.now();
  bk.paidParts.push(part);
  bk.notifyPayload = payload;
  await env.BOOKINGS.put('booking:' + id, JSON.stringify(bk), { expirationTtl: 60 * 60 * 24 * 90 });
  await env.BOOKINGS.delete('hold:' + bk.date + ':' + id);
  await notifyOwner(env, [
    bk.parts > 1 ? `🎙️ הזמנה חדשה באולפן – תשלום קבוצתי: שולם חלק ${part}/${bk.parts} (השעה שוריינה)` : '🎙️ הזמנה חדשה באולפן – שולמה מקדמה',
    ' ',
    `מועד: ${ilDate(bk.start)} (${bk.dur} שעות)`,
    `שירות: ${bk.service}`, bk.pkg && `מהמחירון: ${bk.pkg}`,
    bk.band && `הרכב: ${bk.band} · הקלטת ערוצים: ${bk.rec ? 'כן' : 'לא'}`,
    `לקוח: ${bk.name}`, `טלפון: ${bk.phone}`, bk.email && `מייל: ${bk.email}`,
    bk.notes && `הערות: ${bk.notes}`,
    clash && '⚠ יש חפיפה עם אירוע אחר ביומן',
    ' ', `לכתוב ללקוח בוואטסאפ: ${telLink(bk.phone)}`,
  ].filter(Boolean).join('\n')).catch((e) => console.error('notify studio', e));
  return json({ ok: true });
}

/* ---------- SOL Academy: מקדמה לשריון מקום בשיעורי נגינה ---------- */
// לא צריך יומן — רק Morning. המקדמה = ACADEMY_DEPOSIT (או מחיר החבילה אם הוא נמוך יותר, למשל שיעור היכרות).
// השיעורים מתקיימים באולפן → הזמינות לפי אותו יומן של האולפן (יומן גוגל של יניר)
const LESSON_FROM = 14, LESSON_LAST = 22; // שעת התחלה ראשונה / אחרונה, שיעור של שעה
const calendarOn = (env) => !!(env.GOOGLE_SA_EMAIL && env.GOOGLE_SA_KEY && env.GOOGLE_CALENDAR_ID && env.BOOKINGS);

function academyCfg(env) {
  const deposit = Number(env.ACADEMY_DEPOSIT || 0);
  return { on: configured(env) && deposit > 0, deposit, calendar: calendarOn(env) };
}

async function academySlots(url, env) {
  if (!calendarOn(env)) return json({ calendar: false });
  const date = url.searchParams.get('date');
  if (!validDate(date)) return json({ calendar: true, slots: [] });
  const ranges = await busyRanges(env, date);
  const now = Date.now(), slots = [];
  for (let h = LESSON_FROM; h <= LESSON_LAST; h++) {
    const t = pad(h) + ':00';
    const s = israelTime(date, t).getTime(), e = s + 3600 * 1000;
    slots.push({ time: h + ':00', free: s > now + 3600 * 1000 && !overlaps(ranges, s, e) });
  }
  return json({ calendar: true, date, slots });
}

async function academyPay(request, url, env) {
  const cfg = academyCfg(env);
  if (!cfg.on) return json({ error: 'not_configured' }, 503);
  const b = await request.json().catch(() => ({}));
  const clip = (v, n) => String(v ?? '').trim().slice(0, n);
  const name = clip(b.name, 80), email = clip(b.email, 120);
  const phone = clip(b.phone, 20).replace(/[^\d+\-\s]/g, '');
  if (!name || phone.replace(/\D/g, '').length < 9) return json({ error: 'missing_contact' }, 400);
  const teacher = clip(b.teacher, 60), instrument = clip(b.instrument, 60), tier = clip(b.tier, 80);
  // מחיר החבילה — אחרי הנחת קופון אם הוזן קוד תקין (המחיר המקורי נשלח מהדף, ההנחה מחושבת כאן)
  const listPrice = Math.max(0, Number(b.price) || 0);
  const cpn = couponOf(b.coupon);
  const tierPrice = cpn ? Math.round(listPrice * (100 - cpn.percent) / 100) : listPrice;
  if (!teacher || !tier || !tierPrice) return json({ error: 'bad_request' }, 400);
  // מועד מבוקש: שיעורים מ-14:00 עד 22:00 (התחלה), לא בעבר
  const date = clip(b.date, 10), time = clip(b.time, 5);
  const hour = parseInt(time, 10);
  if (!validDate(date) || !/^\d{1,2}:00$/.test(time) || hour < LESSON_FROM || hour > LESSON_LAST) return json({ error: 'missing_slot' }, 400);
  const start = israelTime(date, pad(hour) + ':00').getTime(), end = start + 3600 * 1000;
  if (start < Date.now() + 3600 * 1000) return json({ error: 'missing_slot' }, 400);
  // לפי יומן האולפן: לא לאפשר שעה תפוסה
  if (overlaps(await busyRanges(env, date), start, end)) return json({ error: 'slot_taken' }, 409);
  const [yy, mm, dd] = date.split('-');
  const when = `${dd}/${mm}/${yy} ${time}`;
  const amount = Math.min(cfg.deposit, tierPrice);
  const id = crypto.randomUUID(), secret = crypto.randomUUID().replace(/-/g, '');
  const rec = { id, secret, status: 'pending', created: Date.now(), name, phone, email, teacher, instrument, tier, tierPrice, listPrice, coupon: cpn ? cpn.code : '', amount, date, time, start, end };
  await env.BOOKINGS.put('academy:' + id, JSON.stringify(rec), { expirationTtl: 60 * 60 * 24 * 90 });
  // נועלים את השעה ביומן בזמן שהלקוח משלם (אותו מנגנון כמו הזמנות האולפן)
  await env.BOOKINGS.put('hold:' + date + ':' + id, JSON.stringify({ start, end }), { expirationTtl: HOLD_MINUTES * 60 });
  const site = (env.SITE_URL || url.origin).replace(/\/$/, '');
  const balance = tierPrice - amount;
  const form = await morning(env, '/payments/form', {
    description: `מקדמה – SOL Academy: ${instrument} עם ${teacher} (${tier}) – ${when}`,
    type: Number(env.MORNING_DOC_TYPE || 400), amount, currency: 'ILS', vatType: 0, lang: 'he', maxPayments: 1,
    client: { name, phone, mobile: phone, emails: email ? [email] : undefined, add: true },
    remarks: `${tier} · מועד מבוקש ${when} (בכפוף לאישור המורה) · מחיר החבילה ₪${tierPrice}` + (cpn ? ` (אחרי קופון ${cpn.code} ${cpn.percent}%, במקום ₪${listPrice})` : '') + (balance > 0 ? ` · יתרה לתשלום ₪${balance}` : ''),
    successUrl: `${site}/academy?paid=1`,
    failureUrl: `${site}/academy?payfail=1`,
    notifyUrl: `${url.origin}/api/academy-notify?id=${id}&k=${secret}`,
    custom: 'academy:' + id,
  });
  if (!form || !form.url) {
    console.error('academy form failed', JSON.stringify(form));
    await env.BOOKINGS.delete('hold:' + date + ':' + id);
    return json({ error: 'payment_unavailable' }, 502);
  }
  return json({ url: form.url });
}

async function academyNotify(request, url, env) {
  const id = url.searchParams.get('id') || '', key = url.searchParams.get('k') || '';
  const raw = await env.BOOKINGS.get('academy:' + id);
  if (!raw) return json({ ok: false }, 404);
  const rec = JSON.parse(raw);
  if (!key || key !== rec.secret) return json({ ok: false }, 403);
  if (rec.status === 'paid') return json({ ok: true }); // הודעה כפולה — כבר טופל

  // השיעור נכנס ליומן של האולפן
  const others = (await busyRanges(env, rec.date)).filter(([a, b]) => !(a === rec.start && b === rec.end));
  const clash = overlaps(others, rec.start, rec.end);
  const token = await googleToken(env);
  const ev = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events`, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({
      summary: `${clash ? '⚠ ' : ''}שיעור ${rec.instrument} – ${rec.teacher} – ${rec.name} (שולמה מקדמה)`,
      description: [
        'SOL Academy – שיעור נגינה מהאתר',
        `תלמיד/ה: ${rec.name}`, `טלפון: ${rec.phone}`, rec.email && `מייל: ${rec.email}`,
        `מורה: ${rec.teacher} · כלי: ${rec.instrument}`, `חבילה: ${rec.tier} (₪${rec.tierPrice})`,
        `שולמה מקדמה: ₪${rec.amount}` + (rec.tierPrice > rec.amount ? ` · יתרה ₪${rec.tierPrice - rec.amount}` : ''),
        clash && '⚠ שימו לב: יש חפיפה עם אירוע אחר ביומן',
        `מזהה: ${rec.id}`,
      ].filter(Boolean).join('\n'),
      start: { dateTime: new Date(rec.start).toISOString(), timeZone: TZ },
      end: { dateTime: new Date(rec.end).toISOString(), timeZone: TZ },
      colorId: clash ? '11' : '5',
    }),
  });
  if (!ev.ok) { console.error('academy calendar insert failed', ev.status, await ev.text()); return json({ ok: false }, 502); }

  rec.status = 'paid'; rec.paidAt = Date.now();
  await env.BOOKINGS.put('academy:' + id, JSON.stringify(rec), { expirationTtl: 60 * 60 * 24 * 365 });
  await env.BOOKINGS.delete('hold:' + rec.date + ':' + id);
  await notifyOwner(env, [
    `🎸 SOL Academy – שיעור ${rec.instrument} חדש – שולמה מקדמה`,
    ' ',
    `מועד: ${ilDate(rec.start)}`,
    `מורה: ${rec.teacher}`,
    `חבילה: ${rec.tier} (₪${rec.tierPrice})` + (rec.coupon ? ` · קופון ${rec.coupon}` : ''),
    `שולם: ₪${rec.amount}` + (rec.tierPrice > rec.amount ? ` · יתרה ₪${rec.tierPrice - rec.amount}` : ''),
    `תלמיד/ה: ${rec.name}`, `טלפון: ${rec.phone}`, rec.email && `מייל: ${rec.email}`,
    clash && '⚠ יש חפיפה עם אירוע אחר ביומן',
    ' ', `לכתוב לתלמיד/ה בוואטסאפ: ${telLink(rec.phone)}`,
  ].filter(Boolean).join('\n')).catch((e) => console.error('notify academy', e));
  return json({ ok: true });
}

/* ---------- הצעת מחיר + תקנון חתום ---------- */
// נשמר עותק מלא של מה שהלקוח ראה וחתם עליו (כולל נוסח התקנון), עם חותמת זמן מהשרת.
// הקישור /quote?a=<id> מבוסס על מזהה אקראי שאי אפשר לנחש — אפשר לשלוח אותו ליניר.

async function saveAgreement(request, env) {
  if (!env.BOOKINGS) return json({ error: 'not_configured' }, 503);
  const raw = await request.text();
  if (raw.length > 400000) return json({ error: 'too_large' }, 413);
  let b;
  try { b = JSON.parse(raw); } catch { return json({ error: 'bad_request' }, 400); }
  const signer = String(b.signer || '').trim().slice(0, 100);
  const sig = String(b.signature || '');
  if (signer.length < 2 || !sig.startsWith('data:image/png;base64,') || sig.length > 300000) return json({ error: 'bad_signature' }, 400);
  if (!b.quote || typeof b.quote !== 'object' || !Array.isArray(b.terms)) return json({ error: 'bad_request' }, 400);
  const clip = (v, n) => String(v ?? '').slice(0, n);
  const q = b.quote;
  const quote = {
    svcLabel: clip(q.svcLabel, 300), date: clip(q.date, 10), time: clip(q.time, 5), dur: clip(q.dur, 3), durLabel: clip(q.durLabel, 20),
    band: clip(q.band, 40), rec: !!q.rec, isReh: !!q.isReh, name: clip(q.name, 100), phone: clip(q.phone, 30), email: clip(q.email, 120), notes: clip(q.notes, 500),
    selected: (Array.isArray(q.selected) ? q.selected : q.selected ? [q.selected] : []).slice(0, 20).map((x) => ({ id: clip(x && x.id, 40), name: clip(x && x.name, 120), price: clip(x && x.price, 60) })),
    coupon: couponOf(q.coupon) ? couponOf(q.coupon).code : '', // רק קוד תקין נשמר — אי אפשר לזייף הנחה
    payMethod: clip(q.payMethod, 30), payStatus: clip(q.payStatus, 60),
  };
  const terms = b.terms.slice(0, 20).map((s) => ({ title: clip(s.title, 120), items: (Array.isArray(s.items) ? s.items : []).slice(0, 20).map((t) => clip(t, 1000)) }));
  const id = crypto.randomUUID();
  const record = {
    id, number: clip(b.number, 40), quote, terms, termsVersion: clip(b.termsVersion, 60),
    signer, signature: sig, signedAt: Date.now(),
    ip: request.headers.get('cf-connecting-ip') || '', ua: clip(request.headers.get('user-agent'), 300),
  };
  await env.BOOKINGS.put('agreement:' + id, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 365 * 3 });
  const origin = new URL(request.url).origin;
  await notifyOwner(env, [
    '✍️ לקוח אישר הצעת מחיר ותקנון',
    ' ',
    `לקוח: ${signer}` + (quote.phone ? ` · ${quote.phone}` : ''),
    `שירות: ${quote.selected.length ? quote.selected.map((x) => x.name).join(' + ') : quote.svcLabel}`,
    quote.date && `תאריך מבוקש: ${quote.date.split('-').reverse().join('/')}${quote.time ? ' ' + quote.time : ''}`,
    ' ', `העותק החתום: ${origin}/quote?a=${id}`,
  ].filter(Boolean).join('\n')).catch((e) => console.error('notify agreement', e));
  return json({ id, signedAt: record.signedAt });
}

async function getAgreement(url, env) {
  if (!env.BOOKINGS) return json({ error: 'not_configured' }, 503);
  const id = url.pathname.split('/').pop();
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: 'not_found' }, 404);
  const r = await env.BOOKINGS.get('agreement:' + id, 'json');
  if (!r) return json({ error: 'not_found' }, 404);
  const { ip, ua, ...pub } = r; // פרטים טכניים נשארים בשרת בלבד
  return json(pub);
}

/* ---------- הודעה אוטומטית ליניר (לא הלקוח שולח — האתר שולח לבד) ---------- */
// ערוצים (כל אחד פועל רק אם הוגדרו לו סודות):
//   וואטסאפ דרך CallMeBot:  CALLMEBOT_PHONE (למשל 972549030134), CALLMEBOT_APIKEY
//   מייל דרך Resend:          RESEND_API_KEY, OWNER_EMAIL (המייל של יניר)
// שגיאה בשליחה לא מפילה את ההזמנה — היא כבר שמורה ביומן וב-Morning.
async function notifyOwner(env, text) {
  const jobs = [];
  if (env.CALLMEBOT_PHONE && env.CALLMEBOT_APIKEY) {
    const u = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(env.CALLMEBOT_PHONE)
      + '&text=' + encodeURIComponent(text) + '&apikey=' + encodeURIComponent(env.CALLMEBOT_APIKEY);
    jobs.push(fetch(u).then(async (r) => { if (!r.ok) throw new Error('callmebot ' + r.status + ' ' + (await r.text()).slice(0, 200)); }));
  }
  // וואטסאפ דרך Green-API (מחובר לוואטסאפ קיים דרך QR, כמו WhatsApp Web)
  // סודות: GREENAPI_URL (למשל https://7103.api.greenapi.com), GREENAPI_ID, GREENAPI_TOKEN, NOTIFY_PHONE (למשל 972549030134)
  if (env.GREENAPI_URL && env.GREENAPI_ID && env.GREENAPI_TOKEN && env.NOTIFY_PHONE) {
    const base = String(env.GREENAPI_URL).replace(/\/$/, '');
    const chatId = String(env.NOTIFY_PHONE).replace(/\D/g, '').replace(/^0/, '972') + '@c.us';
    jobs.push(fetch(`${base}/waInstance${env.GREENAPI_ID}/sendMessage/${env.GREENAPI_TOKEN}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chatId, message: text }),
    }).then(async (r) => { if (!r.ok) throw new Error('greenapi ' + r.status + ' ' + (await r.text()).slice(0, 200)); }));
  }
  if (env.RESEND_API_KEY && env.OWNER_EMAIL) {
    const subject = text.split('\n')[0].slice(0, 120);
    const html = '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7">'
      + text.split('\n').map((l) => l.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
        .replace(/(https?:\/\/[^\s<]+)/g, (u) => (u.includes('/api/pay-approve')
          ? `<a href="${u}" style="display:inline-block;background:#1f63e6;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">לבדיקה ואישור התשלום</a>`
          : `<a href="${u}">${u}</a>`))).join('<br>') + '</div>';
    jobs.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.NOTIFY_FROM || 'SOL Production <onboarding@resend.dev>', to: [env.OWNER_EMAIL], subject, html }),
    }).then(async (r) => { if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 200)); }));
  }
  const res = await Promise.allSettled(jobs);
  res.filter((x) => x.status === 'rejected').forEach((x) => console.error('notifyOwner failed:', x.reason && x.reason.message));
  return res.some((x) => x.status === 'fulfilled'); // הצליח בערוץ אחד לפחות
}
const notifyOn = (env) => !!((env.CALLMEBOT_PHONE && env.CALLMEBOT_APIKEY) || (env.GREENAPI_URL && env.GREENAPI_ID && env.GREENAPI_TOKEN && env.NOTIFY_PHONE) || (env.RESEND_API_KEY && env.OWNER_EMAIL));

/* בקשה בלי תשלום (טופס האולפן / כרטיס באקדמיה) → האתר שולח ליניר בוואטסאפ, הלקוח לא שולח כלום */
async function sendRequest(request, env) {
  if (!notifyOn(env)) return json({ error: 'not_configured' }, 503);
  const b = await request.json().catch(() => ({}));
  if (b.website) return json({ ok: true }); // מלכודת לבוטים (שדה נסתר שבני אדם לא ממלאים)
  const clip = (v, n) => String(v ?? '').trim().slice(0, n);
  const name = clip(b.name, 80), phone = clip(b.phone, 20).replace(/[^\d+\-\s]/g, '');
  if (!name || phone.replace(/\D/g, '').length < 9) return json({ error: 'missing_contact' }, 400);

  // הגנה מספאם: עד 5 בקשות בשעה מאותה כתובת
  if (env.BOOKINGS) {
    const ip = request.headers.get('cf-connecting-ip') || 'x';
    const k = 'rl:' + ip + ':' + Math.floor(Date.now() / 3600000);
    const n = Number((await env.BOOKINGS.get(k)) || 0);
    if (n >= 5) return json({ error: 'too_many' }, 429);
    await env.BOOKINGS.put(k, String(n + 1), { expirationTtl: 3700 });
  }

  const lines = Array.isArray(b.lines) ? b.lines.slice(0, 25).map((l) => clip(l, 300)).filter(Boolean) : [];
  const title = b.kind === 'academy' ? '🎸 SOL Academy – בקשה חדשה לשיעור (בלי תשלום)' : b.kind === 'group' ? '💸 SOL Production – משתתף בתשלום קבוצתי עדכן ששילם' : '🎙️ בקשה חדשה מהאתר – SOL Production (בלי תשלום)';
  const sent = await notifyOwner(env, [title, ' ', ...lines, `שם: ${name}`, `טלפון: ${phone}`, ' ', `לחזור ללקוח בוואטסאפ: ${telLink(phone)}`].join('\n'));
  return sent ? json({ ok: true }) : json({ error: 'send_failed' }, 502);
}

const ilDate = (ms) => new Date(ms).toLocaleString('he-IL', { timeZone: TZ, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const telLink = (phone) => 'https://wa.me/' + String(phone).replace(/\D/g, '').replace(/^0/, '972');

/* ---------- Morning API ---------- */

async function morning(env, path, body) {
  const m = MORNING[env.MORNING_ENV === 'sandbox' ? 'sandbox' : 'production'];
  const t = await fetch(m.token, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: env.MORNING_CLIENT_ID, client_secret: env.MORNING_CLIENT_SECRET }),
  });
  const tj = await t.json().catch(() => ({}));
  if (!t.ok || !tj.accessToken) throw new Error('morning token ' + t.status + ' ' + JSON.stringify(tj));
  const r = await fetch(m.api + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tj.accessToken },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => null);
}

/* ---------- Google (חשבון שירות, JWT חתום) ---------- */

let gCache = { token: '', exp: 0 };
async function googleToken(env) {
  if (gCache.token && gCache.exp > Date.now() + 60000) return gCache.token;
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const head = enc({ alg: 'RS256', typ: 'JWT' });
  const claim = enc({ iss: env.GOOGLE_SA_EMAIL, scope: 'https://www.googleapis.com/auth/calendar', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const pem = String(env.GOOGLE_SA_KEY).replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + claim));
  const jwt = head + '.' + claim + '.' + b64url(new Uint8Array(sig));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwt,
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('google token ' + JSON.stringify(j));
  gCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return gCache.token;
}
function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


/* ---------- אישור תשלום ידני (ביט / PayBox / העברה / אשראי בקישור / קבוצתי) ----------
   הלקוח לוחץ "שילמתי" → נשמרת בקשה (claim) ויניר מקבל מייל עם קישור לאישור.
   רק אחרי שיניר מאשר (בדף האישור, בלחיצה על כפתור) הלקוח ממשיך להסכם.
   הקישור במייל פותח דף עם כפתור — כדי שסורקי קישורים במייל לא "יאשרו" לבד. */
const rid = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
const esc = (v) => String(v ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const siteOf = (url, env) => String(env.SITE_URL || url.origin).replace(/\/$/, '');

async function payClaim(request, url, env) {
  if (!env.BOOKINGS || !notifyOn(env)) return json({ error: 'not_configured' }, 503);
  const b = await request.json().catch(() => ({}));
  if (b.website) return json({ ok: true, id: 'x' });
  const clip = (v, n) => String(v ?? '').trim().slice(0, n);
  const name = clip(b.name, 80), phone = clip(b.phone, 20).replace(/[^\d+\-\s]/g, '');
  if (!name || phone.replace(/\D/g, '').length < 9) return json({ error: 'missing_contact' }, 400);
  const ip = request.headers.get('cf-connecting-ip') || 'x';
  const rk = 'rl:' + ip + ':' + Math.floor(Date.now() / 3600000);
  const n = Number((await env.BOOKINGS.get(rk)) || 0);
  if (n >= 8) return json({ error: 'too_many' }, 429);
  await env.BOOKINGS.put(rk, String(n + 1), { expirationTtl: 3700 });

  const id = rid(), token = rid();
  const lines = Array.isArray(b.lines) ? b.lines.slice(0, 25).map((l) => clip(l, 300)).filter(Boolean) : [];
  const quote = b.quote && typeof b.quote === 'object' ? b.quote : null;
  const rec = { id, token, status: 'pending', created: Date.now(), name, phone, method: clip(b.method, 60), kind: clip(b.kind, 20), lines, quote };
  if (JSON.stringify(rec).length > 60000) return json({ error: 'too_big' }, 400);
  await env.BOOKINGS.put('claim:' + id, JSON.stringify(rec), { expirationTtl: 60 * 60 * 24 * 30 });
  const site = siteOf(url, env);
  const title = b.kind === 'academy' ? '🎸 SOL Academy – לקוח עדכן ששילם (לבדוק ולאשר)' : '💰 SOL Production – לקוח עדכן ששילם (לבדוק ולאשר)';
  const sent = await notifyOwner(env, [title, ' ', ...lines, `שם: ${name}`, `טלפון: ${phone}`, ' ',
    'אחרי שבדקת שהכסף נכנס — לאישור (הלקוח ימשיך להסכם):', `${site}/api/pay-approve?id=${id}&t=${token}`].join('\n'));
  return sent ? json({ ok: true, id }) : json({ error: 'send_failed' }, 502);
}

async function payStatus(url, env) {
  const id = String(url.searchParams.get('id') || '');
  if (!env.BOOKINGS || !/^[0-9a-f]{32}$/.test(id)) return json({ error: 'not_found' }, 404);
  const raw = await env.BOOKINGS.get('claim:' + id);
  if (!raw) return json({ error: 'not_found' }, 404);
  const rec = JSON.parse(raw);
  return json(rec.status === 'approved' ? { status: 'approved', quote: rec.quote } : { status: rec.status });
}

async function payApprove(request, url, env) {
  const page = (body) => new Response('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>אישור תשלום | SOL Production</title>'
    + '<style>body{margin:0;background:#0c1024;color:#f3f5ff;font:16px/1.7 Arial,sans-serif;display:flex;justify-content:center;padding:24px}main{max-width:520px;width:100%;background:#151b3a;border:1px solid #2b356b;border-radius:18px;padding:22px}h1{font-size:22px;margin:0 0 10px}ul{padding-inline-start:20px}button,a.b{display:block;width:100%;box-sizing:border-box;margin-top:14px;padding:14px;border:0;border-radius:12px;font:bold 17px Arial;color:#fff;background:linear-gradient(90deg,#1f63e6,#6a4dff,#9333ea);text-align:center;text-decoration:none;cursor:pointer}a.w{background:#25d366;color:#0b2a17}.m{color:#aab3d9;font-size:14px}</style></head><body><main>'
    + body + '</main></body></html>', { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  const id = String(url.searchParams.get('id') || ''), t = String(url.searchParams.get('t') || '');
  const raw = env.BOOKINGS && /^[0-9a-f]{32}$/.test(id) ? await env.BOOKINGS.get('claim:' + id) : null;
  const rec = raw ? JSON.parse(raw) : null;
  if (!rec || !t || t !== rec.token) return page('<h1>הקישור לא תקין</h1><p class="m">ייתכן שפג תוקפו (30 יום).</p>');
  const site = siteOf(url, env);
  const details = '<ul>' + rec.lines.map((l) => `<li>${esc(l)}</li>`).join('') + `<li>שם: ${esc(rec.name)}</li><li>טלפון: <span dir="ltr">${esc(rec.phone)}</span></li></ul>`;
  const agreementUrl = `${site}/quote?p=${rec.id}`;
  const wa = 'https://wa.me/' + String(rec.phone).replace(/\D/g, '').replace(/^0/, '972') + '?text=' + encodeURIComponent(`היי ${rec.name}, התשלום התקבל ✓ תודה! כאן חותמים על ההסכם ותנאי הביטול: ${agreementUrl}`);
  if (request.method === 'POST' && rec.status !== 'approved') {
    rec.status = 'approved'; rec.approvedAt = Date.now();
    if (rec.quote) rec.quote.payStatus = 'שולם ✓ – התשלום אושר';
    await env.BOOKINGS.put('claim:' + id, JSON.stringify(rec), { expirationTtl: 60 * 60 * 24 * 30 });
  }
  if (rec.status === 'approved') {
    return page('<h1>התשלום אושר ✓</h1>' + details + '<p class="m">אם הלקוח עדיין בדף — הוא ממשיך עכשיו להסכם לבד. אם סגר אותו, שלח לו את הקישור:</p>'
      + `<a class="b w" href="${esc(wa)}">שליחת קישור להסכם בוואטסאפ</a>`);
  }
  return page('<h1>אישור תשלום</h1>' + details + `<p class="m">אמצעי תשלום: ${esc(rec.method)}. מאשרים רק אחרי שבדקת שהכסף נכנס.</p>`
    + `<form method="post" action="/api/pay-approve?id=${esc(id)}&amp;t=${esc(t)}"><button type="submit">אישור – התשלום התקבל</button></form>`);
}
