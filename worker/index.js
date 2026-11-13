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

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const configured = (env) =>
  !!(env.MORNING_CLIENT_ID && env.MORNING_CLIENT_SECRET && env.GOOGLE_SA_EMAIL && env.GOOGLE_SA_KEY && env.GOOGLE_CALENDAR_ID && env.BOOKINGS);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/availability' && request.method === 'GET') return await availability(url, env);
      if (url.pathname === '/api/book' && request.method === 'POST') return await book(request, url, env);
      if (url.pathname === '/api/morning-notify' && request.method === 'POST') return await notify(request, url, env);
      if (url.pathname === '/api/academy-slots' && request.method === 'GET') return await academySlots(url, env);
      if (url.pathname === '/api/academy-pay' && request.method === 'POST') return await academyPay(request, url, env);
      if (url.pathname === '/api/academy-notify' && request.method === 'POST') return await academyNotify(request, url, env);
      if (url.pathname === '/api/agreement' && request.method === 'POST') return await saveAgreement(request, env);
      if (url.pathname.startsWith('/api/agreement/') && request.method === 'GET') return await getAgreement(url, env);
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
  const base = { configured: configured(env) && deposit > 0, deposit, policy: env.CANCEL_POLICY || '', academy: academyCfg(env) };
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

  const id = crypto.randomUUID();
  const secret = crypto.randomUUID().replace(/-/g, '');
  const booking = {
    id, secret, status: 'pending', created: Date.now(), start, end, date: b.date, time: b.time, dur,
    name, phone, email,
    service: String(b.serviceLabel || '').slice(0, 120),
    pkg: String(b.selected || '').slice(0, 160),
    band: String(b.band || '').slice(0, 40), rec: !!b.rec,
    notes: String(b.notes || '').slice(0, 500),
  };
  await env.BOOKINGS.put('booking:' + id, JSON.stringify(booking), { expirationTtl: 60 * 60 * 24 * 14 });
  await env.BOOKINGS.put('hold:' + b.date + ':' + id, JSON.stringify({ start, end }), { expirationTtl: HOLD_MINUTES * 60 });

  const site = (env.SITE_URL || url.origin).replace(/\/$/, '');
  const [y, m, d] = b.date.split('-');
  const when = `${d}/${m}/${y} ${b.time}`;
  const form = await morning(env, '/payments/form', {
    description: `מקדמה לשריון סשן ב-SOL Production – ${when}`,
    type: Number(env.MORNING_DOC_TYPE || 400),
    amount: deposit,
    currency: 'ILS',
    vatType: 0,
    lang: 'he',
    maxPayments: 1,
    client: { name, phone, mobile: phone, emails: email ? [email] : undefined, add: true },
    remarks: [booking.service, booking.pkg, `משך: ${dur} שעות`].filter(Boolean).join(' · '),
    successUrl: `${site}/?booked=1#booking`,
    failureUrl: `${site}/?payfail=1#booking`,
    notifyUrl: `${url.origin}/api/morning-notify?id=${id}&k=${secret}`,
    custom: id,
  });
  if (!form || !form.url) {
    console.error('morning form failed', JSON.stringify(form));
    await env.BOOKINGS.delete('hold:' + b.date + ':' + id);
    return json({ error: 'payment_unavailable' }, 502);
  }
  return json({ url: form.url });
}

/* ---------- Morning מודיעה שהתשלום עבר → נכנס ליומן ---------- */

async function notify(request, url, env) {
  const id = url.searchParams.get('id') || '';
  const key = url.searchParams.get('k') || '';
  const raw = await env.BOOKINGS.get('booking:' + id);
  if (!raw) return json({ ok: false }, 404);
  const bk = JSON.parse(raw);
  if (!key || key !== bk.secret) return json({ ok: false }, 403);
  if (bk.status === 'paid') return json({ ok: true }); // הודעה כפולה — כבר טופל

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
  bk.notifyPayload = payload;
  await env.BOOKINGS.put('booking:' + id, JSON.stringify(bk), { expirationTtl: 60 * 60 * 24 * 90 });
  await env.BOOKINGS.delete('hold:' + bk.date + ':' + id);
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
  const tierPrice = Math.max(0, Number(b.price) || 0);
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
  const rec = { id, secret, status: 'pending', created: Date.now(), name, phone, email, teacher, instrument, tier, tierPrice, amount, date, time, start, end };
  await env.BOOKINGS.put('academy:' + id, JSON.stringify(rec), { expirationTtl: 60 * 60 * 24 * 90 });
  // נועלים את השעה ביומן בזמן שהלקוח משלם (אותו מנגנון כמו הזמנות האולפן)
  await env.BOOKINGS.put('hold:' + date + ':' + id, JSON.stringify({ start, end }), { expirationTtl: HOLD_MINUTES * 60 });
  const site = (env.SITE_URL || url.origin).replace(/\/$/, '');
  const balance = tierPrice - amount;
  const form = await morning(env, '/payments/form', {
    description: `מקדמה – SOL Academy: ${instrument} עם ${teacher} (${tier}) – ${when}`,
    type: Number(env.MORNING_DOC_TYPE || 400), amount, currency: 'ILS', vatType: 0, lang: 'he', maxPayments: 1,
    client: { name, phone, mobile: phone, emails: email ? [email] : undefined, add: true },
    remarks: `${tier} · מועד מבוקש ${when} (בכפוף לאישור המורה) · מחיר החבילה ₪${tierPrice}` + (balance > 0 ? ` · יתרה לתשלום ₪${balance}` : ''),
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
  };
  const terms = b.terms.slice(0, 20).map((s) => ({ title: clip(s.title, 120), items: (Array.isArray(s.items) ? s.items : []).slice(0, 20).map((t) => clip(t, 1000)) }));
  const id = crypto.randomUUID();
  const record = {
    id, number: clip(b.number, 40), quote, terms, termsVersion: clip(b.termsVersion, 60),
    signer, signature: sig, signedAt: Date.now(),
    ip: request.headers.get('cf-connecting-ip') || '', ua: clip(request.headers.get('user-agent'), 300),
  };
  await env.BOOKINGS.put('agreement:' + id, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 365 * 3 });
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
