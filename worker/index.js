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
  const base = { configured: configured(env) && deposit > 0, deposit, policy: env.CANCEL_POLICY || '' };
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
