/* SOL Production — סקריפט משותף לכל הדפים */
(function () {
  'use strict';
  var WA = '972549030134';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  $$('.js-year').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  $$('.js-wa').forEach(function (a) {
    a.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent('היי יניר, אשמח לשמוע פרטים על סשן ב־SOL Production');
  });

  /* equalizer */
  var eq = $('#eq');
  if (eq) {
    var cols = ['#8b5cf6', '#3b82f6', '#a78bfa', '#60a5fa', '#ff7a1a', '#6366f1'];
    for (var i = 0; i < 28; i++) {
      var b = document.createElement('i');
      b.style.height = (30 + ((i * 37 + 11) % 70)) + '%';
      b.style.background = cols[i % 6];
      b.style.animationDelay = (-(i * 0.17) % 1.5).toFixed(2) + 's';
      eq.appendChild(b);
    }
  }

  /* pricing tabs */
  var tabs = $$('[role="tab"]');
  function showTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var p = document.getElementById(t.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { showTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; // RTL
      if (!d) return;
      e.preventDefault();
      var n = tabs[(i + d + tabs.length) % tabs.length];
      showTab(n); n.focus();
    });
  });
  if (tabs.length) showTab(tabs[0]);

  /* accessibility widget */
  var root = $('.root'), panel = $('#a11y-panel'), fs = 100;
  var store = { get: function () { try { return JSON.parse(localStorage.getItem('sol-a11y') || '{}'); } catch (e) { return {}; } },
                set: function (v) { try { localStorage.setItem('sol-a11y', JSON.stringify(v)); } catch (e) {} } };
  function applyA11y(s) {
    fs = s.fs || 100;
    root.style.zoom = String(fs / 100);
    ['hc', 'hl', 'still'].forEach(function (k) {
      root.classList.toggle(k, !!s[k]);
      var btn = $('[data-a11y="' + k + '"]');
      if (btn) btn.setAttribute('aria-pressed', s[k] ? 'true' : 'false');
    });
    var l = $('#a11y-fs'); if (l) l.textContent = fs + '%';
  }
  var a11y = store.get();
  if (root) applyA11y(a11y);
  $$('[data-a11y]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var k = btn.getAttribute('data-a11y');
      var tog = $('.a11y-toggle');
      if (k === 'toggle' || k === 'close') {
        panel.hidden = !panel.hidden;
        tog.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
        if (k === 'close') tog.focus();
        return;
      }
      if (k === 'up') a11y.fs = Math.min(150, (a11y.fs || 100) + 10);
      else if (k === 'down') a11y.fs = Math.max(90, (a11y.fs || 100) - 10);
      else if (k === 'reset') a11y = {};
      else a11y[k] = !a11y[k];
      applyA11y(a11y); store.set(a11y);
    });
  });

  /* booking */
  var form = $('#bk-form');
  if (!form) return;
  var st = { service: 'rehearsal', band: '2–4 נגנים', rec: true, dur: '3', time: '19:00', selected: null };
  var LABELS = { rehearsal: 'חדר חזרות להרכב', write: 'שיר בר / בת מצווה · כתיבה והלחנה', cover: 'הקלטת קאבר', greeting: 'הקלטת ברכה / אירוע', single: 'הפקת סינגל מאפס', mix: 'מיקס ומאסטרינג', clip: 'הפקת קליפ' };

  function pickGroup(id, key) {
    $$('#' + id + ' [data-val]').forEach(function (b) {
      b.addEventListener('click', function () { st[key] = b.getAttribute('data-val'); render(); });
    });
  }
  pickGroup('bk-services', 'service');
  pickGroup('bk-band', 'band');
  pickGroup('bk-dur', 'dur');
  $('#bk-rec').addEventListener('click', function () { st.rec = !st.rec; render(); });
  $('#bk-clear').addEventListener('click', function () { st.selected = null; render(); });
  ['#bk-date', '#bk-name', '#bk-notes'].forEach(function (s) { $(s).addEventListener('input', render); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  function choose(card) {
    st.selected = { id: card.dataset.id, name: card.dataset.name, price: card.dataset.price };
    if (card.dataset.service) st.service = card.dataset.service;
    if (card.dataset.rec) st.rec = true;
    render();
  }
  $$('.pcard').forEach(function (card) {
    var btn = $('.btn', card);
    if (btn) btn.addEventListener('click', function () { choose(card); });
  });
  function quick(el) {
    var pick = el.getAttribute('data-pick'), svc = el.getAttribute('data-service');
    if (pick) { var c = $('.pcard[data-id="' + pick + '"]'); if (c) return choose(c); }
    if (svc) { st.service = svc; st.selected = null; render(); }
  }
  $$('[data-pick],[data-service]').forEach(function (el) {
    if (el.classList.contains('pcard')) return;
    el.addEventListener('click', function () { quick(el); });
  });
  var qp = new URLSearchParams(location.search).get('pick');
  if (qp) { var qc = $('.pcard[data-id="' + qp + '"]'); if (qc) choose(qc); }

  function mark(id, val) {
    $$('#' + id + ' [data-val]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-val') === val ? 'true' : 'false');
    });
  }

  function render() {
    var isReh = st.service === 'rehearsal';
    var showHours = isReh || st.service === 'write';
    mark('bk-services', st.service); mark('bk-band', st.band); mark('bk-dur', st.dur);
    $('#bk-reh').hidden = !isReh;
    $('#bk-dur-wrap').hidden = !showHours;
    $('#bk-time-wrap').hidden = !showHours;
    $('#bk-rec').setAttribute('aria-checked', st.rec ? 'true' : 'false');

    var dur = parseInt(st.dur, 10) || 2, times = [];
    for (var h = 10; h + dur <= 23; h++) times.push((h < 10 ? '0' : '') + h + ':00');
    if (times.indexOf(st.time) < 0) st.time = times[times.length - 1];
    var tw = $('#bk-time'); tw.innerHTML = '';
    times.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'pill'; b.textContent = t;
      b.setAttribute('aria-pressed', t === st.time ? 'true' : 'false');
      b.addEventListener('click', function () { st.time = t; render(); });
      tw.appendChild(b);
    });

    $$('.pcard').forEach(function (c) { c.classList.toggle('sel', !!st.selected && c.dataset.id === st.selected.id); });
    $('#bk-selbox').hidden = !st.selected;
    if (st.selected) $('#bk-sel').textContent = st.selected.name + ' · ' + st.selected.price;

    var date = $('#bk-date').value, name = $('#bk-name').value.trim(), notes = $('#bk-notes').value.trim();
    var dl = 'גמיש – נתאם יחד';
    if (date) { var p = date.split('-'); dl = p[2] + '/' + p[1] + '/' + p[0]; }
    var lines = ['היי יניר, אשמח לשריין סשן ב־SOL Production:', '', '• שירות: ' + LABELS[st.service]];
    if (st.selected) lines.push('• חבילה מהמחירון: ' + st.selected.name + ' (' + st.selected.price + ')');
    if (isReh) { lines.push('• הרכב: ' + st.band); lines.push('• הקלטת ערוצים מלאה (Multi-Track): ' + (st.rec ? 'כן' : 'לא')); }
    lines.push('• תאריך: ' + dl);
    if (showHours) lines.push('• שעת התחלה: ' + st.time, '• משך: ' + (st.dur === '4' ? '4+ שעות' : st.dur + ' שעות'));
    lines.push('• שם: ' + (name || '—'));
    if (notes) lines.push('• הערות: ' + notes);
    lines.push('', 'תודה!');
    var msg = lines.join('\n');
    $('#bk-preview').textContent = msg;
    $('#bk-send').href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);
    $('#bk-hint').textContent = name ? 'הכול מוכן — לחיצה אחת ונפתח וואטסאפ עם כל הפרטים.' : 'טיפ: הוסיפו שם כדי שיניר ידע למי לחזור.';
  }
  render();
})();
