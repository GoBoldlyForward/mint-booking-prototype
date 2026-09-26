/* Mint booking prototype. Single-file step machine, no framework, state in localStorage. */
(() => {
  const M = window.MINT;
  const KEY = 'mint-proto-v1';
  const STEPS = ['where', 'when', 'vehicles', 'membership', 'who', 'services', 'addons', 'another', 'address', 'pay', 'done'];

  const fresh = () => ({
    zip: '', zipSource: '', zipTried: false, notifyEmail: '',
    date: '', windows: [], weekOffset: 0,
    vehicles: [], activeVehicle: 0, pendingYear: '',
    member: { status: '', tier: '', email: '', stage: '' }, prepay: null,
    contact: { name: '', email: '', phone: '' },
    pkg: {}, addons: {}, applyAll: true,
    anotherDeclined: false,
    address: { line1: '', line2: '', city: '', state: '', zip: '', source: '', notes: '', type: 'home' },
    payment: { method: '', consentReminders: false, consentOffers: false },
    bookingId: '',
    demoBeforeNoon: false,
  });

  let state = load();
  function load() { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return fresh(); } }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => (n < 0 ? '−$' : '$') + (Math.abs(Math.round(n * 100) / 100)).toFixed(2);
  const uid = () => Math.random().toString(36).slice(2, 8);
  const vehicleName = v => [v.year, v.make, v.model].filter(Boolean).join(' ');
  const digits = s => (s || '').replace(/\D/g, '');
  const emailOk = s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s || '');

  function nowHour() { if (state.demoBeforeNoon) return 10; const d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  function beforeNoon() { return nowHour() < 12; }
  function isoDay(offset) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); }
  function fmtDay(iso) { const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); }

  function zipStatus(zip) {
    if (!/^\d{5}$/.test(zip)) return 'incomplete';
    if (M.SERVED.has(zip)) return 'served';
    if (M.EDGE.has(zip)) return 'edge';
    return 'none';
  }
  function neighborhood(zip) { return M.NEIGHBORHOODS[zip] || (M.SERVED.has(zip) ? 'your neighborhood' : zip); }

  const pkgOf = key => M.PACKAGES.find(p => p.key === key);
  function pkgFor(v) { return state.pkg[v.id]; }
  function addonsFor(v) { return state.addons[v.id] || []; }

  // ---------- pricing ----------
  function quote() {
    const lines = [];
    let services = 0;
    state.vehicles.forEach((v, i) => {
      const pk = pkgOf(pkgFor(v));
      if (!pk) return;
      let vTotal = pk.price[v.size];
      lines.push({ label: `${pk.name} · ${vehicleName(v)}`, sub: M.SIZES[v.size].label, amount: pk.price[v.size] });
      addonsFor(v).forEach(k => {
        const a = M.ADDONS[k];
        lines.push({ label: `${a.name}`, sub: vehicleName(v), amount: a.price || 0, quote: a.price == null });
        vTotal += a.price || 0;
      });
      if (i > 0) {
        const d = vTotal * M.MULTI_VEHICLE_DISCOUNT;
        lines.push({ label: 'Second car saves 10%', sub: vehicleName(v), amount: -d, discount: true });
        vTotal -= d;
      }
      services += vTotal;
    });
    let total = services;
    if (state.prepay && state.vehicles[0] && pkgFor(state.vehicles[0])) {
      const base = pkgOf(pkgFor(state.vehicles[0])).price[state.vehicles[0].size];
      lines.push({ label: 'Prepaid: 2 more cleans', sub: 'Same package, use within 12 months', amount: base * 2 });
      const d = base * 3 * M.PREPAY_DISCOUNT;
      lines.push({ label: 'Prepay 3, save 10%', amount: -d, discount: true });
      total += base * 2 - d;
    }
    if (state.member.status === 'new') { lines.push({ label: 'New member: $20 off your first clean', amount: -M.NEW_MEMBER_CREDIT, discount: true }); total -= M.NEW_MEMBER_CREDIT; }
    if (state.member.status === 'member' && state.vehicles[0] && pkgFor(state.vehicles[0])) {
      const rate = M.MEMBER_DISCOUNT[state.member.tier || 'maintenance'];
      const d = pkgOf(pkgFor(state.vehicles[0])).price[state.vehicles[0].size] * rate;
      lines.push({ label: `${state.member.tier === 'elite' ? 'Elite' : 'Maintenance'} member: ${Math.round(rate * 100)}% off one full detail`, amount: -d, discount: true });
      total -= d;
    }
    if (state.member.status === 'new') { lines.push({ label: `${state.member.tier === 'elite' ? 'Elite' : 'Maintenance'} membership, first month`, sub: 'Cancel any time', amount: M.MEMBERSHIP_PRICE }); total += M.MEMBERSHIP_PRICE; }
    if (state.date === isoDay(0)) { lines.push({ label: 'Same-day priority', amount: M.SAME_DAY_FEE }); total += M.SAME_DAY_FEE; }
    if (zipStatus(state.zip) === 'edge') { lines.push({ label: 'Travel fee', sub: 'Outside our core area', amount: M.TRAVEL_FEE }); total += M.TRAVEL_FEE; }
    total = Math.max(0, total);
    return { lines, services, total, deposit: total * M.DEPOSIT_RATE };
  }

  // ---------- navigation ----------
  function visible(step) {
    if (step === 'another') return state.vehicles.length === 1 && !state.anotherDeclined;
    return true;
  }
  function current() { const s = location.hash.replace('#', ''); return STEPS.includes(s) ? s : 'where'; }
  function go(step) { if (location.hash === '#' + step) render(); else location.hash = step; window.scrollTo({ top: 0 }); }
  function next() { let i = STEPS.indexOf(current()) + 1; while (i < STEPS.length && !visible(STEPS[i])) i++; go(STEPS[Math.min(i, STEPS.length - 1)]); }
  function back() { let i = STEPS.indexOf(current()) - 1; while (i > 0 && !visible(STEPS[i])) i--; go(STEPS[Math.max(i, 0)]); }

  // ---------- typeahead ----------
  function typeaheadHtml(id, placeholder) {
    return `<div class="typeahead" id="${id}"><input class="input" autocomplete="off" placeholder="${h(placeholder)}" inputmode="search"><div class="suggest" hidden></div></div>`;
  }
  function bindVehicleTypeahead(id, onPick) {
    const root = $('#' + id); const input = $('input', root); const list = $('.suggest', root);
    let items = [], active = -1;
    const draw = () => {
      list.innerHTML = items.map((it, i) => `<button type="button" data-i="${i}" class="${i === active ? 'active' : ''}"><span>${it.year ? it.year + ' ' : ''}<b>${h(it.make)}</b> ${h(it.model)}</span><span class="size">${h(M.SIZES[it.size].short)}</span></button>`).join('');
      list.hidden = items.length === 0;
    };
    input.addEventListener('input', () => {
      const raw = input.value.trim().toLowerCase();
      const year = (raw.match(/\b(19|20)\d{2}\b/) || [])[0];
      const q = raw.replace(/\b(19|20)\d{2}\b/, '').trim().split(/\s+/).filter(Boolean);
      if (!q.length) { items = []; draw(); return; }
      items = M.VEHICLE_INDEX.filter(v => q.every(t => v.key.includes(t))).slice(0, 8).map(v => ({ ...v, year }));
      active = -1; draw();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { active = Math.min(active + 1, items.length - 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); draw(); e.preventDefault(); }
      else if (e.key === 'Enter' && items[active >= 0 ? active : 0]) { onPick(items[active >= 0 ? active : 0]); e.preventDefault(); }
    });
    list.addEventListener('click', e => { const b = e.target.closest('button'); if (b) onPick(items[+b.dataset.i]); });
    input.focus();
  }
  function addVehicle(it) {
    state.vehicles.push({ id: uid(), make: it.make, model: it.model, size: it.size, year: it.year || '' });
    save();
  }

  // ---------- screens ----------
  const screens = {};

  screens.where = () => {
    if (!state.zip && !state.zipTried) {
      state.zipTried = true; save();
      fetch('https://ipapi.co/json/').then(r => r.json()).then(j => {
        if (j && j.postal && !state.zip && current() === 'where') { state.zip = String(j.postal); state.zipSource = 'ip'; save(); render(); }
      }).catch(() => {});
    }
    const st = zipStatus(state.zip);
    let status = '';
    if (st === 'served') status = `<div class="note">We detail in <b>${h(neighborhood(state.zip))}</b> every week. You are in.</div>`;
    if (st === 'edge') status = `<div class="note warn"><b>${h(state.zip)}</b> is just outside our core area. We will still come, with a ${money(M.TRAVEL_FEE)} travel fee.</div>`;
    if (st === 'none') status = `<div class="note danger">We do not reach <b>${h(state.zip)}</b> yet. Leave an email and we will tell you when we do.</div>
      <label class="field"><span>Email</span><input class="input" id="notify" type="email" value="${h(state.notifyEmail)}" placeholder="you@example.com"></label>
      <button class="btn secondary" id="notify-btn" type="button">Notify me</button>`;
    return {
      html: `<div class="eyebrow">Step 1</div><h1>Where is the car?</h1><p class="lede">Just the zip for now. It tells us if we serve you and which crew is nearby.</p>
        <label class="field"><span>Enter your zip code ${state.zipSource === 'ip' ? '<span class="badge gray">detected from your connection</span>' : ''}</span>
        <input class="input big" id="zip" inputmode="numeric" pattern="[0-9]*" maxlength="5" value="${h(state.zip)}" placeholder="30030"></label>
        ${status}
        <p class="muted" style="text-align:center;margin:6px 0 4px">or pick one of our top neighborhoods</p>
        <div class="chips center">${M.TOP_NEIGHBORHOODS.map(([name, zip]) => `<button type="button" class="chip ${state.zip === zip ? 'selected' : ''}" data-zip="${zip}">${h(name)}</button>`).join('')}</div>`,
      after() {
        const z = $('#zip');
        z.addEventListener('input', () => { state.zip = digits(z.value).slice(0, 5); state.zipSource = 'typed'; save(); if (state.zip.length === 5 || state.zip.length === 0) render(); else footer(); });
        if (!state.zip) z.focus();
        $$('[data-zip]').forEach(c => c.addEventListener('click', () => { state.zip = c.dataset.zip; state.zipSource = 'pill'; save(); render(); }));
        const nb = $('#notify-btn'); if (nb) nb.addEventListener('click', () => { state.notifyEmail = $('#notify').value; save(); nb.textContent = 'We will be in touch'; nb.disabled = true; });
      },
      valid: () => st === 'served' || st === 'edge',
    };
  };

  screens.when = () => {
    const today = isoDay(0);
    const todayOpen = beforeNoon();
    state.weekOffset = Math.max(0, Math.min(8, state.weekOffset || 0));
    const base = new Date(); base.setHours(12, 0, 0, 0); base.setDate(base.getDate() - base.getDay() + state.weekOffset * 7);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(base.getDate() + i); return d.toISOString().slice(0, 10); });
    const dayState = d => d < today ? 'past' : (d === today && !todayOpen) ? 'full' : 'open';
    if (state.date && dayState(state.date) !== 'open') { state.date = ''; state.windows = []; }
    const wins = M.WINDOWS.filter(w => state.date !== today || w.start >= nowHour() + 2);
    state.windows = (state.windows || []).filter(k => wins.some(w => w.key === k));
    save();
    const first = new Date(days[0] + 'T12:00:00'), last = new Date(days[6] + 'T12:00:00');
    const range = `${first.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} to ${last.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    return {
      html: `<div class="eyebrow">Step 2</div><h1>When works?</h1><p class="lede">Pick a day, then every arrival window that could work. More windows means an earlier slot.</p>
        <div class="week-nav"><button type="button" class="nav" id="wk-prev" ${state.weekOffset === 0 ? 'disabled' : ''} aria-label="Previous week">‹</button><span>${h(range)}</span><button type="button" class="nav" id="wk-next" ${state.weekOffset >= 8 ? 'disabled' : ''} aria-label="Next week">›</button></div>
        <div class="days">${days.map(d => { const dt = new Date(d + 'T12:00:00'); const ds = dayState(d); return `<button type="button" class="day ${state.date === d ? 'selected' : ''} ${ds !== 'open' ? 'off' : ''}" data-d="${d}" ${ds !== 'open' ? 'disabled' : ''}><div class="d">${dt.toLocaleDateString(undefined, { weekday: 'short' })}</div><div class="n ${ds === 'full' ? 'full' : ''}">${ds === 'full' ? 'Full' : dt.getDate()}</div></button>`; }).join('')}</div>
        ${state.date ? `<h2>${h(fmtDay(state.date))}</h2>
          ${state.date === today ? `<div class="note warn"><b>Same-day priority: +${money(M.SAME_DAY_FEE)}.</b> Booked before noon, so we reshuffle a route to get to you today.</div>` : ''}
          <div class="choices">${wins.map(w => `<button type="button" class="choice ${state.windows.includes(w.key) ? 'selected' : ''}" data-w="${w.key}"><span class="t">${h(w.label)}</span><span class="s">${state.windows.includes(w.key) ? 'Works for me' : 'Tap if this works'}</span></button>`).join('')}</div>
          <p class="muted">Pick every window that works. We confirm one two-hour window right after you book.</p>` :
          `<p class="muted">Pick a day above. Weekends fill first, and most customers book three to seven days out.</p>`}`,
      after() {
        $('#wk-prev').addEventListener('click', () => { state.weekOffset--; save(); render(); });
        $('#wk-next').addEventListener('click', () => { state.weekOffset++; save(); render(); });
        $$('.day').forEach(b => b.addEventListener('click', () => { state.date = b.dataset.d; state.windows = []; save(); render(); }));
        $$('[data-w]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.w; state.windows = state.windows.includes(k) ? state.windows.filter(x => x !== k) : [...state.windows, k]; save(); render(); }));
      },
      valid: () => !!state.date && state.windows.length > 0,
    };
  };

  screens.vehicles = () => {
    const showInput = state.vehicles.length === 0 || state.addingVehicle;
    return {
      html: `<div class="eyebrow">Step 3</div><h1>${state.vehicles.length ? 'Your vehicles' : 'What are we detailing?'}</h1><p class="lede">Start typing the make or model. The price class comes from the car, not from you guessing a size.</p>
        ${state.vehicles.map((v, i) => `<div class="vehicle"><div class="ico">${i + 1}</div><div><div class="name">${h(vehicleName(v))}</div><div class="sub">Priced as ${h(M.SIZES[v.size].label)}</div></div><button class="x" type="button" data-rm="${v.id}" aria-label="Remove">×</button></div>`).join('')}
        ${showInput ? `${typeaheadHtml('veh', state.vehicles.length ? 'Add another: 2021 Honda Odyssey' : 'e.g. 2019 Toyota Highlander')}
          <div class="chips">${M.POPULAR.map(p => `<button type="button" class="chip" data-pop="${h(p)}">${h(p)}</button>`).join('')}</div>` :
          `<button class="btn secondary" id="add-vehicle" type="button">+ Add another vehicle</button><p class="muted" style="margin-top:8px">A spouse's car, the kids' car, the work truck. Same visit, one crew, and the second car is 10% off.</p>`}`,
      after() {
        $$('[data-rm]').forEach(b => b.addEventListener('click', () => { state.vehicles = state.vehicles.filter(v => v.id !== b.dataset.rm); delete state.pkg[b.dataset.rm]; delete state.addons[b.dataset.rm]; save(); render(); }));
        const add = $('#add-vehicle'); if (add) add.addEventListener('click', () => { state.addingVehicle = true; render(); });
        if (showInput) {
          const pick = it => { addVehicle(it); state.addingVehicle = false; render(); };
          bindVehicleTypeahead('veh', pick);
          $$('[data-pop]').forEach(c => c.addEventListener('click', () => { const v = M.VEHICLE_INDEX.find(x => `${x.make} ${x.model}` === c.dataset.pop); pick(v); }));
        }
      },
      valid: () => state.vehicles.length > 0,
    };
  };

  screens.membership = () => {
    const m = state.member;
    const pick = (k, sel) => `class="choice ${sel ? 'selected' : ''}" data-m="${k}"`;
    let detail = '';
    if (m.status === 'member') {
      if (m.stage === 'code') detail = `<div class="note plain">We texted a code to the number on file for <b>${h(m.email)}</b>. Any four digits work in this prototype.</div>
        <label class="field"><span>Sign-in code</span><input class="input big" id="code" inputmode="numeric" maxlength="4" placeholder="••••"></label>`;
      else if (m.stage === 'in') detail = `<div class="note">Welcome back. Your <b>${m.tier === 'elite' ? 'Elite' : 'Maintenance'}</b> discount is applied and your monthly credit is waiting.</div>`;
      else detail = `<label class="field"><span>Member email or mobile</span><input class="input" id="m-email" value="${h(m.email)}" placeholder="you@example.com"></label><button class="btn secondary" id="m-send" type="button">Send sign-in code</button>`;
    }
    if (m.status === 'new') detail = `
      <div class="choices" style="margin:10px 0">
        <button type="button" class="choice ${m.tier === 'maintenance' ? 'selected' : ''}" data-tier="maintenance"><span class="t">Maintenance</span><span class="s">15% off one full detail, $20 monthly credit, quarterly sealant, priority booking</span><span class="p">${money(M.MEMBERSHIP_PRICE)}<small>a month</small></span></button>
        <button type="button" class="choice ${m.tier === 'elite' ? 'selected' : ''}" data-tier="elite"><span class="t">Elite</span><span class="s">20% off one full detail, $35 monthly credit, $250 off ceramic coating, birthday detail</span><span class="p">${money(M.MEMBERSHIP_PRICE)}<small>a month</small></span></button>
      </div>
      <label class="field"><span>Email for your membership</span><input class="input" id="n-email" type="email" value="${h(m.email)}" placeholder="you@example.com"></label>
      <div class="note">Your $20 comes off today's clean. Cancel any time.</div>`;
    if (m.status === 'declined') detail = `
      <div class="note plain" style="margin-top:14px"><b>One more way to save.</b> Buy your next three cleans now and take 10% off all of them. Use them any time in the next year, on this car.</div>
      <div class="btn-row"><button class="btn ${state.prepay === true ? '' : 'secondary'}" id="prepay-yes" type="button">Prepay 3, save 10%</button><button class="btn ${state.prepay === false ? '' : 'ghost'}" id="prepay-no" type="button">Just this one</button></div>`;
    if (!m.status) detail = `
      <h2>What joining gets you</h2>
      <ul class="perks">
        <li><b>$20 off</b> this clean, today</li>
        <li><b>15% to 20% off</b> a full detail every membership year</li>
        <li><b>$20 to $35 credit</b> every month toward washes or a second car</li>
        <li><b>Priority booking</b> when the schedule is tight</li>
        <li>From ${money(M.MEMBERSHIP_PRICE)} a month, cancel any time</li>
      </ul>`;
    return {
      html: `<div class="eyebrow">Step 4</div><h1>Members save money.</h1><p class="lede">Sign in if you have a membership. If not, joining now takes $20 off this clean.</p>
        <div class="choices">
          <button type="button" ${pick('declined', m.status === 'declined')}><span class="t">Not now</span><span class="s">Continue as a guest</span></button>
          <button type="button" ${pick('member', m.status === 'member')}><span class="t">I'm already a member</span><span class="s">Sign in to apply your discount and credits</span></button>
          <button type="button" ${pick('new', m.status === 'new')}><span class="badge pop float">Save $20 today</span><span class="t">Join now</span><span class="s">From ${money(M.MEMBERSHIP_PRICE)} a month, cancel any time</span></button>
        </div>${detail}`,
      after() {
        $$('[data-m]').forEach(b => b.addEventListener('click', () => { state.member = { status: b.dataset.m, tier: state.member.tier, email: state.member.email, stage: '' }; if (b.dataset.m !== 'declined') state.prepay = null; save(); render(); }));
        $$('[data-tier]').forEach(b => b.addEventListener('click', () => { state.member.tier = b.dataset.tier; save(); render(); }));
        const ne = $('#n-email'); if (ne) ne.addEventListener('input', () => { state.member.email = ne.value; save(); footer(); });
        const me = $('#m-email'); if (me) me.addEventListener('input', () => { state.member.email = me.value; save(); });
        const ms = $('#m-send'); if (ms) ms.addEventListener('click', () => { if (!state.member.email) { $('#m-email').focus(); return; } state.member.stage = 'code'; save(); render(); $('#code').focus(); });
        const code = $('#code'); if (code) code.addEventListener('input', () => { if (digits(code.value).length === 4) { state.member.stage = 'in'; state.member.tier = /elite/i.test(state.member.email) ? 'elite' : 'maintenance'; save(); render(); } });
        const py = $('#prepay-yes'); if (py) py.addEventListener('click', () => { state.prepay = true; save(); render(); });
        const pn = $('#prepay-no'); if (pn) pn.addEventListener('click', () => { state.prepay = false; save(); render(); });
      },
      valid: () => (m.status === 'member' && m.stage === 'in') || (m.status === 'new' && !!m.tier && emailOk(m.email)) || (m.status === 'declined' && state.prepay !== null),
    };
  };

  screens.who = () => {
    const c = state.contact;
    if (!c.email && state.member.email) c.email = state.member.email;
    return {
      html: `<div class="eyebrow">Step 5</div><h1>Who should we text?</h1><p class="lede">Your crew texts when they are on the way. Your email gets the receipt and a reminder.</p>
        <label class="field"><span>Name</span><input class="input" id="c-name" autocomplete="name" value="${h(c.name)}" placeholder="Jordan Lee"></label>
        <label class="field"><span>Email</span><input class="input" id="c-email" type="email" autocomplete="email" value="${h(c.email)}" placeholder="you@example.com"></label>
        <label class="field"><span>Mobile</span><input class="input" id="c-phone" type="tel" autocomplete="tel" inputmode="tel" value="${h(c.phone)}" placeholder="(404) 555-0134"></label>
        <p class="muted">If you step away now we will save your spot and email you a link back to it.</p>`,
      after() {
        ['name', 'email', 'phone'].forEach(k => { const el = $('#c-' + k); el.addEventListener('input', () => { state.contact[k] = el.value; save(); footer(); }); });
        if (!c.name) $('#c-name').focus();
      },
      valid: () => c.name.trim().length > 1 && emailOk(c.email) && digits(c.phone).length >= 10,
    };
  };

  function vehicleTabs(step) {
    if (state.vehicles.length < 2) return '';
    return `<label class="check" style="margin-top:0"><input type="checkbox" id="apply-all" ${state.applyAll ? 'checked' : ''}> Same ${step} for every car</label>
      ${state.applyAll ? '' : `<div class="tabs">${state.vehicles.map((v, i) => `<button type="button" class="tab ${state.activeVehicle === i ? 'selected' : ''}" data-tab="${i}">${h(vehicleName(v))}</button>`).join('')}</div>`}`;
  }
  function bindTabs() {
    const aa = $('#apply-all'); if (aa) aa.addEventListener('change', () => { state.applyAll = aa.checked; state.activeVehicle = 0; save(); render(); });
    $$('[data-tab]').forEach(b => b.addEventListener('click', () => { state.activeVehicle = +b.dataset.tab; save(); render(); }));
  }
  function targets() { return state.applyAll ? state.vehicles : [state.vehicles[state.activeVehicle] || state.vehicles[0]]; }

  screens.services = () => {
    const v = state.applyAll ? state.vehicles[0] : (state.vehicles[state.activeVehicle] || state.vehicles[0]);
    const sel = pkgFor(v);
    const card = p => `<button type="button" class="choice ${sel === p.key ? 'selected' : ''}" data-pkg="${p.key}">
        ${p.popular ? '<span class="badge pop">Most popular</span>' : ''}<span class="t">${h(p.name)}</span><span class="s">${h(p.tagline)}</span>
        <span class="p">${money(p.price[v.size])}<small>${h(M.SIZES[v.size].short)}</small></span>
        <details><summary>What is included</summary><ul>${p.includes.map(i => `<li>${h(i)}</li>`).join('')}</ul></details></button>`;
    return {
      html: `<div class="eyebrow">Step 6</div><h1>Pick your detail.</h1><p class="lede">Prices below are for ${state.applyAll && state.vehicles.length > 1 ? 'each car, by its size' : 'your ' + h(M.SIZES[v.size].label.toLowerCase())}. No surprises at the driveway.</p>
        ${vehicleTabs('package')}
        <div class="choices">${M.PACKAGES.filter(p => p.scope === 'full').map(card).join('')}</div>
        <h2>Only need part of it?</h2>
        <div class="choices">${M.PACKAGES.filter(p => p.scope === 'part').map(card).join('')}</div>`,
      after() {
        bindTabs();
        $$('[data-pkg]').forEach(b => b.addEventListener('click', e => { if (e.target.closest('details')) return; targets().forEach(t => { state.pkg[t.id] = b.dataset.pkg; }); save(); render(); }));
      },
      valid: () => state.vehicles.every(x => !!pkgFor(x)),
    };
  };

  screens.addons = () => {
    const v = state.applyAll ? state.vehicles[0] : (state.vehicles[state.activeVehicle] || state.vehicles[0]);
    const chosen = new Set(addonsFor(v));
    return {
      html: `<div class="eyebrow">Step 7</div><h1>Anything extra?</h1><p class="lede">Optional. Tell us now and the crew brings the right gear.</p>
        ${vehicleTabs('add-ons')}
        ${M.ADDON_GROUPS.map(g => `<div class="group"><h3>${h(g.name)}</h3><div class="gb">${h(g.blurb)}</div>
          ${g.items.map(a => `<label class="addon"><input type="checkbox" data-addon="${a.key}" ${chosen.has(a.key) ? 'checked' : ''}><span><span class="n">${h(a.name)}</span><br><span class="b">${h(a.blurb)}</span></span><span class="p">${a.price == null ? '<span class="badge gray">Quoted</span>' : (a.from ? 'from ' : '') + money(a.price)}</span></label>`).join('')}</div>`).join('')}`,
      after() {
        bindTabs();
        $$('[data-addon]').forEach(cb => cb.addEventListener('change', () => {
          targets().forEach(t => { const set = new Set(state.addons[t.id] || []); cb.checked ? set.add(cb.dataset.addon) : set.delete(cb.dataset.addon); state.addons[t.id] = [...set]; });
          save(); footer();
        }));
      },
      valid: () => true,
    };
  };

  screens.another = () => {
    const v0 = state.vehicles[0];
    return {
      html: `<div class="eyebrow">Step 8</div><h1>Add a second car?</h1><p class="lede">It gets 10% off. The crew is already in your driveway, so A second vehicle in the same visit is ${money(pkgOf(pkgFor(v0)).price[v0.size] * 0.9)} for the same ${h(pkgOf(pkgFor(v0)).name)} package on a ${h(M.SIZES[v0.size].label.toLowerCase())}, less on a smaller car.</p>
        ${typeaheadHtml('veh2', 'Spouse, kids, work truck: 2020 Honda CR-V')}
        <div class="chips">${M.POPULAR.map(p => `<button type="button" class="chip" data-pop="${h(p)}">${h(p)}</button>`).join('')}</div>
        <button class="btn ghost" id="no-thanks" type="button">No thanks, just the one</button>`,
      after() {
        const pick = it => { addVehicle(it); const nv = state.vehicles[state.vehicles.length - 1]; state.pkg[nv.id] = pkgFor(v0); state.addons[nv.id] = []; save(); go('address'); };
        bindVehicleTypeahead('veh2', pick);
        $$('[data-pop]').forEach(c => c.addEventListener('click', () => pick(M.VEHICLE_INDEX.find(x => `${x.make} ${x.model}` === c.dataset.pop))));
        $('#no-thanks').addEventListener('click', () => { state.anotherDeclined = true; save(); go('address'); });
      },
      valid: () => false, hideFooter: true,
    };
  };

  screens.address = () => {
    const a = state.address;
    const confirmed = !!a.line1;
    return {
      html: `<div class="eyebrow">Step 9</div><h1>Where exactly?</h1><p class="lede">We need the driveway, not the mailbox. Share your location or start typing and pick the match.</p>
        ${confirmed ? `<div class="map"><div class="pin">📍</div><div class="lbl">${a.source === 'geo' ? 'Located from your phone (demo address)' : 'Confirmed address'}</div></div>
          <div class="vehicle"><div class="ico">✓</div><div><div class="name">${h(a.line1)}</div><div class="sub">${h(a.city)}, ${h(a.state)} ${h(a.zip)}</div></div><button class="x" type="button" id="addr-change" aria-label="Change">×</button></div>
          <label class="field"><span>Apartment, suite or building</span><input class="input" id="line2" value="${h(a.line2)}" placeholder="Optional"></label>
          <div class="chips">${['home', 'office', 'apartment'].map(t => `<button type="button" class="chip ${a.type === t ? 'selected' : ''}" data-type="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
          <label class="field"><span>Gate code, parking, where the keys will be</span><input class="input" id="notes" value="${h(a.notes)}" placeholder="Gate 4471, car is in the second deck"></label>` :
        `<button class="btn secondary" id="geo" type="button">Use my location</button>
          <p class="muted" style="text-align:center;margin:10px 0">or</p>
          ${typeaheadHtml('addr', 'Start typing your address')}
          <p class="muted">In the real thing this is Google Places, so the address is confirmed before you ever type a city or zip.</p>
          ${a.geoError ? `<div class="note warn">${h(a.geoError)}</div>` : ''}`}`,
      after() {
        const geo = $('#geo');
        if (geo) geo.addEventListener('click', () => {
          geo.textContent = 'Locating…'; geo.disabled = true;
          const done = () => { const m = M.MOCK_ADDRESSES.find(x => x.zip === state.zip) || M.MOCK_ADDRESSES[0]; state.address = { ...state.address, ...m, source: 'geo', geoError: '' }; save(); render(); };
          if (!navigator.geolocation) { done(); return; }
          navigator.geolocation.getCurrentPosition(() => done(), () => { state.address.geoError = 'Location was blocked. Type it below instead.'; save(); render(); }, { timeout: 8000 });
        });
        const root = $('#addr');
        if (root) {
          const input = $('input', root), list = $('.suggest', root); let items = [];
          input.addEventListener('input', () => {
            const q = input.value.trim().toLowerCase();
            items = q.length < 2 ? [] : M.MOCK_ADDRESSES.filter(x => `${x.line1} ${x.city} ${x.zip}`.toLowerCase().includes(q)).sort((x, y) => (y.zip === state.zip) - (x.zip === state.zip)).slice(0, 6);
            if (q.length >= 4 && !items.length) items = [{ line1: input.value.trim(), city: neighborhood(state.zip), state: 'GA', zip: state.zip, custom: true }];
            list.innerHTML = items.map((x, i) => `<button type="button" data-i="${i}"><span><b>${h(x.line1)}</b> ${h(x.city)}, ${h(x.state)} ${h(x.zip)}</span>${x.custom ? '<span class="size">use as typed</span>' : ''}</button>`).join('');
            list.hidden = !items.length;
          });
          list.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; state.address = { ...state.address, ...items[+b.dataset.i], source: 'typed', geoError: '' }; save(); render(); });
          input.focus();
        }
        const ch = $('#addr-change'); if (ch) ch.addEventListener('click', () => { state.address.line1 = ''; save(); render(); });
        const l2 = $('#line2'); if (l2) l2.addEventListener('input', () => { state.address.line2 = l2.value; save(); });
        const nt = $('#notes'); if (nt) nt.addEventListener('input', () => { state.address.notes = nt.value; save(); });
        $$('[data-type]').forEach(c => c.addEventListener('click', () => { state.address.type = c.dataset.type; save(); render(); }));
      },
      valid: () => confirmed,
    };
  };

  function windowsLabel() { const ls = M.WINDOWS.filter(x => (state.windows || []).includes(x.key)).map(x => x.label); return ls.length > 1 ? 'one of: ' + ls.join(', ') : (ls[0] || ''); }
  function summaryHtml(q) {
    return `<div class="summary">
      ${q.lines.map(l => `<div class="line ${l.discount ? 'discount' : ''}"><span>${h(l.label)}${l.sub ? `<span class="sub">${h(l.sub)}</span>` : ''}</span><span>${l.quote ? 'quoted' : money(l.amount)}</span></div>`).join('')}
      <div class="line total"><span>Total</span><span>${money(q.total)}</span></div>
      <div class="line"><span>Due today (25% deposit)<span class="sub">The rest is charged when the crew finishes</span></span><span><b>${money(q.deposit)}</b></span></div>
    </div>`;
  }

  screens.pay = () => {
    const q = quote(); const w = windowsLabel();
    return {
      html: `<div class="eyebrow">Step 10</div><h1>Confirm and pay.</h1>
        <div class="kv" style="margin-bottom:14px"><dt>When</dt><dd>${h(fmtDay(state.date))}, ${h(w)}</dd><dt>Where</dt><dd>${h(state.address.line1)}${state.address.line2 ? ', ' + h(state.address.line2) : ''}, ${h(state.address.city)}</dd><dt>Cars</dt><dd>${state.vehicles.map(vehicleName).map(h).join(' · ')}</dd></div>
        ${summaryHtml(q)}
        <div class="choices">
          <button type="button" class="btn dark wallet" id="apple">Apple Pay</button>
          <button type="button" class="btn secondary wallet" id="gpay">Google Pay</button>
        </div>
        <p class="muted" style="text-align:center;margin:12px 0">or pay with a card</p>
        <label class="field"><span>Card number</span><input class="input" id="cc" inputmode="numeric" placeholder="4242 4242 4242 4242"></label>
        <div class="row"><label class="field"><span>Expires</span><input class="input" id="exp" placeholder="MM / YY"></label><label class="field"><span>CVC</span><input class="input" id="cvc" inputmode="numeric" placeholder="123"></label></div>
        <label class="check"><input type="checkbox" id="c1" ${state.payment.consentReminders ? 'checked' : ''}> Text and email me appointment reminders</label>
        <label class="check"><input type="checkbox" id="c2" ${state.payment.consentOffers ? 'checked' : ''}> Send me member offers now and then</label>
        <p class="muted">Cancel or move your appointment up to 72 hours ahead for a full refund of the deposit. Inside 72 hours the deposit goes to the crew who held the time.</p>`,
      after() {
        const finish = m => { state.payment.method = m; state.bookingId = 'MINT-' + Math.random().toString(36).slice(2, 7).toUpperCase(); save(); go('done'); };
        $('#apple').addEventListener('click', () => finish('apple'));
        $('#gpay').addEventListener('click', () => finish('google'));
        $('#c1').addEventListener('change', e => { state.payment.consentReminders = e.target.checked; save(); });
        $('#c2').addEventListener('change', e => { state.payment.consentOffers = e.target.checked; save(); });
        ['cc', 'exp', 'cvc'].forEach(id => $('#' + id).addEventListener('input', footer));
      },
      valid: () => true, payLabel: `Pay ${money(q.deposit)} deposit`,
      pay() { const ok = digits($('#cc').value).length >= 12; if (!ok) { $('#cc').focus(); return; } state.payment.method = 'card'; state.bookingId = 'MINT-' + Math.random().toString(36).slice(2, 7).toUpperCase(); save(); go('done'); },
    };
  };

  screens.done = () => {
    const q = quote(); const w = windowsLabel();
    return {
      html: `<div class="done-hero"><div class="mark">✓</div><h1>You're booked, ${h((state.contact.name || 'friend').split(' ')[0])}.</h1><p class="lede">Confirmation ${h(state.bookingId)} is on its way to ${h(state.contact.email)}. We text when the crew is heading over.</p></div>
        <dl class="kv"><dt>When</dt><dd>${h(fmtDay(state.date))}, ${h(w)}</dd><dt>Where</dt><dd>${h(state.address.line1)}, ${h(state.address.city)}</dd><dt>Cars</dt><dd>${state.vehicles.map(vehicleName).map(h).join('<br>')}</dd><dt>Paid today</dt><dd>${money(q.deposit)}</dd><dt>Due after</dt><dd>${money(q.total - q.deposit)}</dd></dl>
        <h2>Give $20, get $20</h2><p class="small" style="color:var(--ink-2)">Share your code. Friends get $20 off their first clean and you get $20 credit when they book.</p>
        <span class="code">MINT-${h((state.contact.name || 'YOU').split(' ')[0].toUpperCase().slice(0, 6))}20</span>
        <div class="btn-row" style="margin-top:22px"><button class="btn secondary" type="button" id="cal">Add to calendar</button><button class="btn ghost" type="button" id="again">Start over</button></div>`,
      after() {
        $('#cal').addEventListener('click', e => { e.target.textContent = 'Added'; });
        $('#again').addEventListener('click', reset);
      },
      valid: () => false, hideFooter: true,
    };
  };

  // ---------- render ----------
  let view = null;
  function footer() {
    const el = $('#sticky');
    if (!view || view.hideFooter) { el.innerHTML = ''; return; }
    const q = quote();
    const step = current();
    const showTotal = ['services', 'addons', 'address', 'pay', 'membership', 'who'].includes(step) && q.total > 0;
    const label = view.payLabel || 'Continue';
    el.innerHTML = `<div class="tot">${showTotal ? `Total<b>${money(q.total)}</b>` : `<span class="muted">Step ${STEPS.indexOf(step) + 1} of ${STEPS.length - 1}</span>`}</div><button class="btn" id="next" type="button" ${view.valid() ? '' : 'disabled'}>${h(label)}</button>`;
    $('#next').addEventListener('click', () => { if (view.pay) view.pay(); else next(); });
  }
  function render() {
    const step = current();
    // Guard: cannot land on later steps without the basics.
    if (step !== 'where' && !['served', 'edge'].includes(zipStatus(state.zip))) { location.hash = 'where'; return; }
    if (['services', 'addons', 'another', 'address', 'pay'].includes(step) && !state.vehicles.length) { location.hash = 'vehicles'; return; }
    view = screens[step]();
    const app = $('#app'); app.innerHTML = `<div class="fade">${view.html}</div>`;
    view.after && view.after();
    $('#progress').style.width = `${(STEPS.indexOf(step) / (STEPS.length - 1)) * 100}%`;
    $('#back').hidden = step === 'where' || step === 'done';
    $('#demo-before-noon').checked = !!state.demoBeforeNoon;
    footer();
  }
  function reset() { state = fresh(); save(); location.hash = 'where'; render(); }

  $('#back').addEventListener('click', back);
  $('#demo-reset').addEventListener('click', reset);
  $('#demo-before-noon').addEventListener('change', e => { state.demoBeforeNoon = e.target.checked; save(); render(); });
  window.addEventListener('hashchange', render);
  render();
})();
