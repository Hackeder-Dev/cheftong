(function () {
  'use strict';
  const S = window.SITE, EV = window.EVENTS, FM = window.FORMATS, PK = window.PACKAGES, GR = window.GROUPS,
        RV = window.REVIEWS, SG = window.SIGNATURE, HL = window.HIGHLIGHTS, FAQ = window.FAQ;
  const FOOD = new Set(['food', 'dessert', 'drink']);
  const DATA = (window.CATALOG || []).map((d, i) => ({ ...d, _i: i,
    _hay: [d.title, d.en, d.desc, (d.ing || []).join(' '), (d.tags || []).join(' '), d.group, d.cat].join(' ').toLowerCase() }));
  const BY_ID = new Map(DATA.map(d => [d.id, d]));
  const evOf = Object.fromEntries(EV.map(e => [e.key, e]));
  const fmOf = Object.fromEntries(FM.map(f => [f.key, f]));
  const pkOf = Object.fromEntries(PK.map(p => [p.key, p]));

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const thumb = id => `images/${id}.jpg`;
  const full = id => `images/${id}.jpg`;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  /* ---------- analytics (เปิดเมื่อใส่ SITE.ga4) ---------- */
  if (S.ga4) {
    const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(S.ga4); document.head.appendChild(s);
    window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', S.ga4, { anonymize_ip: true });
  }
  function track(name, params) { try { if (window.gtag && S.ga4) gtag('event', name, params || {}); } catch (e) { } }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a) return;
    const h = a.getAttribute('href') || '';
    if (h.startsWith('tel:')) track('click_call', { location: (a.closest('section,header,footer,dialog,.mbar') || {}).id || a.className });
    else if (h.includes('m.me/')) track('click_messenger');
    else if (h.includes('line.me')) track('click_line');
    else if (h.includes('/delivery/')) track('click_lineman');
    else if (h.includes('maps.google')) track('click_map');
  }, true);

  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
  function scrollToId(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }

  /* ---------- theme & header ---------- */
  const t0 = store.get('ct_theme', null); if (t0) document.documentElement.dataset.theme = t0;
  $('#themeBtn').onclick = () => {
    const r = document.documentElement;
    const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    r.dataset.theme = dark ? 'light' : 'dark'; store.set('ct_theme', r.dataset.theme);
  };
  const top = $('#top');
  addEventListener('scroll', () => top.classList.toggle('scrolled', scrollY > 8), { passive: true });

  /* ---------- shop info binding ---------- */
  $$('[data-site]').forEach(el => el.textContent = S[el.dataset.site] || '');
  $$('[data-tel]').forEach(a => a.href = 'tel:' + S.tel);
  $$('[data-phone]').forEach(s => s.textContent = 'โทร ' + S.phone);
  $$('[data-messenger]').forEach(a => a.href = S.messenger);
  const lineUrl = S.line ? `https://line.me/R/ti/p/${encodeURIComponent(S.line)}` : '';
  $$('[data-line]').forEach(a => { if (lineUrl) { a.href = lineUrl; a.hidden = false; } });

  /* ---------- image picker ---------- */
  const used = new Set();
  const FRX = { box: /กล่อง/, buffet: /บุฟเฟต์|ถาด|จัดเลี้ยง/, snack: /ถ้วย|ค็อกเทล|พอดีคำ/, table: /สำรับ|ชุด|โต๊ะ/, plated: /สปาเก|สเต็ก|ข้าว/ };
  function pick(fn, n, rx) {
    const seen = new Set(), out = [];
    const score = d => (rx && rx.test(d.title) ? 0 : 2) + (d.conf === 'high' ? 0 : 1);
    const pool = DATA.filter(d => FOOD.has(d.kind) && fn(d)).sort((a, b) => score(a) - score(b));
    for (const d of pool) { if (out.length >= n) break; if (used.has(d.id) || seen.has(d.desc)) continue; seen.add(d.desc); out.push(d); }
    out.forEach(d => used.add(d.id)); return out;
  }
  const matchPkg = p => d => (p.match.formats || []).some(f => d.formats.includes(f)) || (p.match.groups || []).includes(d.group);
  const img = (d, cls = '', eager = false) => `<img ${cls ? `class="${cls}"` : ''} src="${thumb(d.id)}" alt="${esc(d.title)}" ${eager ? '' : 'loading="lazy"'} decoding="async">`;

  /* ---------- hero ---------- */
  const g = RV.sources.find(s => s.rating && s.count);
  const hero = [
    ...pick(d => d.formats.includes('buffet'), 1, FRX.buffet), ...pick(d => d.group === 'สเต็กและเมนูฟิวชั่น', 1, /สเต็ก/),
    ...pick(d => d.formats.includes('box'), 1, FRX.box), ...pick(d => d.group === 'สปาเกตตีและเมนูเส้น', 1, /สปาเก/),
    ...pick(d => d.group === 'กับข้าวไทย', 1, /ต้มยำ|แกง/)];
  $('#collage').insertAdjacentHTML('afterbegin', hero.map((d, i) => `<figure class="c${i}">${img(d, '', i < 3)}</figure>`).join(''));
  $('#floatCard').innerHTML = g ? `<div class="big">${g.rating.toFixed(1)}</div><div><span class="stars">★★★★★</span><small>จาก ${g.count} รีวิวบน ${esc(g.name)}<br>ลูกค้าชมว่ารสชาติระดับโรงแรม</small></div>` : '';
  const foodCount = DATA.filter(d => FOOD.has(d.kind)).length;
  $('#trust').innerHTML = [
    g ? [`<span class="stars">★</span> ${g.rating.toFixed(1)}`, `รีวิว ${esc(g.name)}`] : null,
    [EV.length, 'ประเภทงานที่รับ'], [FM.length, 'รูปแบบการจัด'], [`${Math.floor(foodCount / 100) * 100}+`, 'ภาพอาหารจริง']
  ].filter(Boolean).map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');

  /* ---------- highlights ---------- */
  $('#highlights').innerHTML = HL.map(h => `<div class="panel"><div class="ic">${icon(h.icon)}</div><h3>${esc(h.title)}</h3><p>${esc(h.text)}</p></div>`).join('');

  /* ---------- event picker ---------- */
  const evShots = Object.fromEntries(EV.map(e => [e.key, pick(d => d.events.includes(e.key) && e.formats.some(f => d.formats.includes(f)), 4, FRX[e.formats[0]])]));
  $('#evTabs').innerHTML = EV.map((e, i) => `<button class="ev-tab" role="tab" id="tab-${e.key}" aria-controls="evPanel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-ev="${e.key}">${icon(e.icon)}${esc(e.short)}</button>`).join('');
  function showEvent(key, focus) {
    const e = evOf[key];
    $$('.ev-tab').forEach(b => { const on = b.dataset.ev === key; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    $('#evPanel').setAttribute('aria-labelledby', 'tab-' + key);
    const n = DATA.filter(d => d.events.includes(key)).length;
    $('#evPanel').innerHTML = `
      <div class="shots">${evShots[key].map(d => img(d)).join('')}</div>
      <div class="body">
        <h3>${esc(e.name)}</h3><p class="desc">${esc(e.blurb)}</p>
        <div><div class="lbl">รูปแบบที่เหมาะ</div><div class="pills">${e.formats.map(f => `<span class="pill leaf">${esc(fmOf[f].name)}</span>`).join('')}</div></div>
        <div><div class="lbl">แพ็กเกจแนะนำ</div><div class="rec">${e.packages.map(k => `<a href="#pkg-${k}">${esc(pkOf[k].name)}<span>${esc(pkOf[k].sub)} →</span></a>`).join('')}</div></div>
        <div class="cta-row" style="margin-top:auto">
          <button class="btn primary" data-quote-event="${key}">${icon('list')}ขอใบเสนอราคางานนี้</button>
          <button class="btn" data-filter-event="${key}">ดูภาพเมนู (${n})</button>
        </div>
      </div>`;
  }
  $('#evTabs').addEventListener('click', e => { const b = e.target.closest('.ev-tab'); if (b) showEvent(b.dataset.ev); });
  $('#evTabs').addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const keys = EV.map(x => x.key), cur = keys.indexOf($('.ev-tab[aria-selected="true"]').dataset.ev);
    const nx = e.key === 'Home' ? 0 : e.key === 'End' ? keys.length - 1 : (cur + (e.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length;
    e.preventDefault(); showEvent(keys[nx], true);
  });
  showEvent(EV[0].key);

  /* ---------- formats ---------- */
  $('#formatCards').innerHTML = FM.map(f => {
    const n = DATA.filter(d => d.formats.includes(f.key)).length, p = pick(d => d.formats.includes(f.key), 1, FRX[f.key])[0];
    return `<button class="format" data-filter-format="${f.key}">${p ? img(p) : ''}<div class="b"><h3>${esc(f.name)}</h3><p>${esc(f.blurb)}</p><div class="go">ดูภาพงานจริง ${n} ภาพ →</div></div></button>`;
  }).join('');

  /* ---------- packages ---------- */
  $('#pkgList').innerHTML = PK.map(p => {
    const fk = (p.match.formats || [])[0], shots = pick(matchPkg(p), 3, fk ? FRX[fk] : null);
    return `<article class="panel pkg" id="pkg-${p.key}">
      ${p.popular ? '<span class="tag">ยอดนิยม</span>' : ''}
      <div class="shots">${shots.map(d => img(d)).join('')}</div>
      <div class="b">
        <h3>${esc(p.name)}</h3><p class="sub">${esc(p.sub)}</p>
        <div><div class="lbl">ตัวอย่างโครงเมนู</div><ul>${p.menu.map(m => `<li>${esc(m)}</li>`).join('')}</ul></div>
        <div><div class="lbl">เหมาะกับงาน</div><div class="pills">${p.events.map(k => `<span class="pill">${esc(evOf[k].short)}</span>`).join('')}</div></div>
        <div class="foot">
          <button class="btn primary block" data-quote-pkg="${p.key}">เลือกแพ็กเกจนี้ ${icon('arrow')}</button>
          <button class="btn block" data-filter-pkg="${p.key}">ดูภาพเมนูในแพ็กเกจ</button>
          <div class="ask">ราคาตามจำนวนแขกและเมนูที่เลือก</div>
        </div>
      </div></article>`;
  }).join('');

  /* ---------- signature ---------- */
  const loved = RV.loved.map(x => x.replace(/\s/g, ''));
  const isLoved = item => { const k = item.replace(/\s|\(.*\)/g, ''); return loved.some(l => l === k || l.endsWith(k) || k.endsWith(l)); };
  $('#sigList').innerHTML = SG.map(s => `<div class="panel"><h3>${esc(s.group)}</h3><ul>${s.items.map(i => `<li><span>${esc(i)}</span>${isLoved(i) ? '<span class="loved">♥ ลูกค้าชม</span>' : ''}</li>`).join('')}</ul></div>`).join('');

  /* ---------- favourites ---------- */
  let favs = store.get('ct_favs', []).filter(id => BY_ID.has(id));
  const isFav = id => favs.includes(id);
  function toggleFav(id) {
    if (isFav(id)) { favs = favs.filter(x => x !== id); toast('นำออกจากเมนูที่เลือกแล้ว'); }
    else { favs.push(id); track('add_dish', { dish: BY_ID.get(id).title, group: BY_ID.get(id).group }); toast(`เพิ่ม "${BY_ID.get(id).title}" แล้ว · เลือกไว้ ${favs.length} เมนู`); }
    store.set('ct_favs', favs); syncFavs();
  }
  function syncFavs() {
    const n = favs.length;
    $$('[data-fav-count]').forEach(b => { b.textContent = n; b.hidden = !n; });
    $$('[data-fav-count-text]').forEach(b => b.textContent = n ? `(${n})` : '');
    $$('.fav').forEach(b => { const on = isFav(b.dataset.id); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', (on ? 'นำออก: ' : 'เก็บเมนู: ') + BY_ID.get(b.dataset.id).title); });
    const fab = $('#fabList'); fab.hidden = !n; fab.querySelector('span').textContent = `เมนูที่เลือก ${n} · ขอราคา`;
    $('#pList').innerHTML = favs.map(id => { const d = BY_ID.get(id); return `<li><img src="${thumb(id)}" alt=""><div class="t">${esc(d.title)}<small>${esc(d.group)}</small></div><button type="button" data-unfav="${id}" aria-label="นำ ${esc(d.title)} ออก">×</button></li>`; }).join('');
    $('#pEmpty').hidden = !!n; $('#pClear').hidden = !n;
    if (dlgItem) setDialogFav();
  }
  $('#pList').addEventListener('click', e => { const b = e.target.closest('[data-unfav]'); if (b) toggleFav(b.dataset.unfav); });
  $('#pClear').onclick = () => { favs = []; store.set('ct_favs', favs); syncFavs(); toast('ล้างรายการเมนูแล้ว'); };

  /* ---------- gallery ---------- */
  const state = { q: '', group: null, format: '', event: '', pkg: null, limit: 36 };
  $('#fFormat').innerHTML = `<option value="">ทุกรูปแบบการจัด</option>` + FM.map(f => `<option value="${f.key}">${esc(f.name)}</option>`).join('');
  $('#fEvent').innerHTML = `<option value="">ทุกประเภทงาน</option>` + EV.map(e => `<option value="${e.key}">${esc(e.short)}</option>`).join('');
  function base(ignoreGroup) {
    const terms = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const pf = state.pkg ? matchPkg(pkOf[state.pkg]) : null;
    return DATA.filter(d => (!state.format || d.formats.includes(state.format)) && (!state.event || d.events.includes(state.event))
      && (!pf || pf(d)) && (ignoreGroup || !state.group || d.group === state.group) && terms.every(t => d._hay.includes(t)));
  }
  let current = [];
  function card(d) {
    return `<article class="card">
      <button class="open" data-i="${d._i}" aria-label="ดูรายละเอียด ${esc(d.title)}"><div class="ph">${img(d)}</div>
        <div class="body"><div class="grp">${esc(d.group)}</div><h3>${esc(d.title)}</h3><p>${esc(d.desc)}</p></div></button>
      <button class="fav" data-id="${d.id}" aria-pressed="${isFav(d.id)}" aria-label="เก็บเมนู: ${esc(d.title)}">${icon('heart')}</button>
    </article>`;
  }
  function render() {
    const b = base(true), counts = {}; b.forEach(d => counts[d.group] = (counts[d.group] || 0) + 1);
    $('#chips').innerHTML = `<button class="chip" data-g="" aria-pressed="${!state.group}">ทั้งหมด<span class="n">${b.length}</span></button>` +
      GR.filter(x => counts[x.name]).map(x => `<button class="chip" data-g="${esc(x.name)}" aria-pressed="${state.group === x.name}">${esc(x.name)}<span class="n">${counts[x.name]}</span></button>`).join('');
    current = base(false);
    const parts = [];
    if (state.pkg) parts.push('แพ็กเกจ ' + pkOf[state.pkg].name); if (state.group) parts.push(state.group);
    if (state.format) parts.push(fmOf[state.format].name); if (state.event) parts.push(evOf[state.event].short); if (state.q) parts.push(`"${state.q}"`);
    $('#resultLine').textContent = `พบ ${current.length.toLocaleString('th-TH')} ภาพ` + (parts.length ? ` · ${parts.join(' · ')}` : '');
    $('#resetBtn').hidden = !parts.length;
    const shown = current.slice(0, state.limit);
    $('#grid').innerHTML = shown.length ? shown.map(card).join('') : '<div class="empty">ไม่พบเมนูที่ตรงกับเงื่อนไข ลองคำค้นอื่น หรือ<button class="linkish" data-reset>ล้างตัวกรอง</button></div>';
    const more = current.length - state.limit; $('#moreBtn').hidden = more <= 0; $('#moreBtn').textContent = `แสดงเพิ่ม (อีก ${more} ภาพ)`;
  }
  function filterTo(patch) {
    Object.assign(state, { q: '', group: null, format: '', event: '', pkg: null }, patch, { limit: 36 });
    $('#q').value = state.q; $('#fFormat').value = state.format; $('#fEvent').value = state.event; render(); scrollToId('gallery');
  }
  function resetFilters() { Object.assign(state, { q: '', group: null, format: '', event: '', pkg: null, limit: 36 }); $('#q').value = ''; $('#fFormat').value = ''; $('#fEvent').value = ''; render(); }
  let qt; $('#q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value; state.limit = 36; render(); }, 160); });
  $('#chips').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) { state.group = c.dataset.g || null; state.limit = 36; render(); } });
  $('#fFormat').onchange = e => { state.format = e.target.value; state.limit = 36; render(); };
  $('#fEvent').onchange = e => { state.event = e.target.value; state.limit = 36; render(); };
  $('#resetBtn').onclick = resetFilters;
  $('#moreBtn').onclick = () => { state.limit += 36; render(); };
  $('#grid').addEventListener('click', e => {
    const f = e.target.closest('.fav'); if (f) { toggleFav(f.dataset.id); return; }
    const o = e.target.closest('.open'); if (o) { const i = +o.dataset.i; openDish(current.findIndex(d => d._i === i)); return; }
    if (e.target.closest('[data-reset]')) resetFilters();
  });

  /* ---------- dish dialog ---------- */
  const dishDlg = $('#dishDlg'); let pos = -1, dlgItem = null;
  function setDialogFav() { const on = isFav(dlgItem.id); $('#dFav').innerHTML = `${icon('heart')}${on ? 'เลือกไว้แล้ว · กดเพื่อนำออก' : 'เก็บเมนูนี้ไว้ขอราคา'}`; $('#dFav').classList.toggle('primary', !on); }
  function openDish(p) {
    if (!current.length) return;
    pos = (p + current.length) % current.length; const d = dlgItem = current[pos];
    $('#dImg').src = full(d.id); $('#dImg').alt = d.title;
    $('#dTop').innerHTML = `<span class="pill accent">${esc(d.group)}</span>` + d.formats.map(f => `<span class="pill leaf">${esc(fmOf[f].name)}</span>`).join('');
    $('#dTitle').textContent = d.title; $('#dEn').textContent = d.en || ''; $('#dDesc').textContent = d.desc || '';
    $('#dEvWrap').hidden = !d.events.length; $('#dEv').innerHTML = d.events.map(k => `<span class="pill">${esc(evOf[k].short)}</span>`).join('');
    $('#dIngWrap').hidden = !(d.ing || []).length; $('#dIng').innerHTML = (d.ing || []).map(x => `<button class="pill" data-q="${esc(x)}">${esc(x)}</button>`).join('');
    $('#dMeta').innerHTML = `ภาพที่ ${pos + 1}/${current.length} · <a href="https://www.facebook.com/photo/?fbid=${d.id}" target="_blank" rel="noopener">ดูโพสต์ต้นฉบับ</a>`;
    setDialogFav();
    if (!dishDlg.open) dishDlg.showModal();
  }
  $('#dFav').onclick = () => toggleFav(dlgItem.id);
  $('#dPrev').onclick = () => openDish(pos - 1); $('#dNext').onclick = () => openDish(pos + 1);
  dishDlg.addEventListener('click', e => {
    if (e.target === dishDlg || e.target.closest('[data-close]')) { dishDlg.close(); return; }
    const p = e.target.closest('.pill[data-q]'); if (p) { dishDlg.close(); filterTo({ q: p.dataset.q }); }
  });
  dishDlg.addEventListener('close', () => { dlgItem = null; });
  document.addEventListener('keydown', e => { if (!dishDlg.open) return; if (e.key === 'ArrowLeft') openDish(pos - 1); if (e.key === 'ArrowRight') openDish(pos + 1); });

  /* ---------- reviews ---------- */
  $('#rvScore').innerHTML = `${g ? `<div class="big">${g.rating.toFixed(1)}</div><div class="stars">★★★★★</div><p>จาก ${g.count} รีวิวบน ${esc(g.name)}<br>${esc(g.note)}</p>` : ''}
    <a class="btn sm" href="${g ? g.url : '#'}" target="_blank" rel="noopener">อ่านรีวิวบน Google Maps</a>
    <div class="rv-src">${RV.sources.map(s => `<div><b>${esc(s.name)}</b><span>${s.rating ? `★ ${Number(s.rating).toFixed(1)}${s.count ? ` · ${s.count} รีวิว` : ''}` : 'ยังไม่มีรีวิว'}</span></div>`).join('')}</div>`;
  $('#rvQuotes').innerHTML = RV.quotes.map(q => `<blockquote>${esc(q.text)}<cite>ลูกค้าจาก ${esc(q.src)}</cite></blockquote>`).join('');
  $('#rvThemes').innerHTML = RV.themes.map(t => `<div class="panel theme"><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p></div>`).join('');
  $('#rvFine').textContent = `สรุปและย่อจากรีวิวสาธารณะ ไม่แสดงชื่อผู้รีวิว · ตรวจล่าสุด ${RV.checked}`;

  /* ---------- FAQ ---------- */
  $('#faqList').innerHTML = FAQ.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');

  /* ---------- quote form ---------- */
  $('#qEvents').innerHTML = EV.map(e => `<label><input type="radio" name="qEvent" value="${e.key}"><span>${esc(e.short)}</span></label>`).join('') +
    `<label><input type="radio" name="qEvent" value="other"><span>อื่น ๆ</span></label>`;
  $('#qFormat').innerHTML = `<option value="">ให้เชฟแนะนำ</option>` + FM.map(f => `<option value="${f.key}">${esc(f.name)}</option>`).join('');
  $('#qPkg').innerHTML = `<option value="">ยังไม่เลือก / ให้เชฟแนะนำ</option>` + PK.map(p => `<option value="${p.key}">${esc(p.name)}</option>`).join('');
  const minDate = new Date(); $('#qDate').min = minDate.toISOString().slice(0, 10);
  const F = { event: () => ($('input[name=qEvent]:checked') || {}).value || '', date: '#qDate', time: '#qTime', guests: '#qGuests', format: '#qFormat', pkg: '#qPkg', place: '#qPlace', note: '#qNote', name: '#qName', phone: '#qPhone' };
  function readForm() { const o = {}; for (const [k, v] of Object.entries(F)) o[k] = typeof v === 'function' ? v() : $(v).value.trim(); return o; }
  function fillForm(o) {
    for (const [k, v] of Object.entries(F)) {
      if (o[k] == null) continue;
      if (k === 'event') { const r = $(`input[name=qEvent][value="${o.event}"]`); if (r) r.checked = true; }
      else $(v).value = o[k];
    }
  }
  fillForm(store.get('ct_form', {}));
  $('#qForm').addEventListener('input', () => store.set('ct_form', readForm()));
  $('#qForm').addEventListener('change', () => store.set('ct_form', readForm()));
  function setErr(id, msg) { const m = $('#' + id); m.textContent = msg; m.closest('.field').classList.toggle('err', !!msg); }
  function validate(o) {
    let ok = true;
    setErr('mEvent', o.event ? '' : 'เลือกประเภทงาน'); ok = ok && !!o.event;
    const gOk = +o.guests > 0; setErr('mGuests', gOk ? '' : 'ใส่จำนวนแขกหรือจำนวนชุดโดยประมาณ'); ok = ok && gOk;
    setErr('mName', o.name ? '' : 'ใส่ชื่อผู้ติดต่อ'); ok = ok && !!o.name;
    const digits = o.phone.replace(/\D/g, ''); const pOk = digits.length >= 9 && digits.length <= 10;
    setErr('mPhone', pOk ? '' : 'ใส่เบอร์โทร 9–10 หลัก'); ok = ok && pOk;
    return ok;
  }
  function thaiDate(v) { if (!v) return ''; try { return new Date(v + 'T00:00').toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return v; } }
  function compose(o) {
    const lines = ['สวัสดีครับ/ค่ะ ขอใบเสนอราคาจัดเลี้ยงจากเว็บ เชฟโต้งจัดให้', ''];
    lines.push('• งาน: ' + (o.event === 'other' ? 'อื่น ๆ' : evOf[o.event].name));
    if (o.date || o.time) lines.push('• วัน/เวลา: ' + [thaiDate(o.date), o.time ? o.time + ' น.' : ''].filter(Boolean).join(' '));
    lines.push('• จำนวน: ' + o.guests + ' คน/ชุด');
    lines.push('• รูปแบบ: ' + (o.format ? fmOf[o.format].name : 'ให้เชฟแนะนำ'));
    if (o.pkg) lines.push('• แพ็กเกจ: ' + pkOf[o.pkg].name);
    if (o.place) lines.push('• สถานที่: ' + o.place);
    if (favs.length) { lines.push(`• เมนูที่สนใจ (${favs.length}):`); favs.forEach((id, i) => lines.push(`   ${i + 1}. ${BY_ID.get(id).title}`)); }
    else lines.push('• เมนู: ให้เชฟช่วยจัดชุด');
    if (o.note) lines.push('• หมายเหตุ: ' + o.note);
    lines.push('', `ผู้ติดต่อ: ${o.name} · โทร ${o.phone}`);
    return lines.join('\n');
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { } ta.remove(); return ok;
    }
  }
  const sendDlg = $('#sendDlg'); let msgText = '', lastSent = '';
  // ลิงก์แชตเพจร้านพร้อมข้อความกรอกไว้ให้ (Facebook เว็บใส่ข้อความในช่องแชตให้อัตโนมัติ · แอปมือถือบางรุ่นไม่รองรับ จึงคัดลอกไว้ให้วางด้วย)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
  const messengerUrl = text => `${(!isMobile && S.messengerWeb) ? S.messengerWeb : S.messenger}?text=${encodeURIComponent(text)}`;
  function openChat() {
    copy(msgText);
    const w = window.open(messengerUrl(msgText), '_blank', 'noopener');
    track('send_quote', { channel: 'messenger' });
    return w !== null;
  }
  // บันทึกสำเนาคำขอถึงร้าน (Google Sheets + อีเมล) เมื่อร้านตั้งค่า quoteEndpoint ไว้
  function saveCopy(o) {
    const st = $('#sSaved');
    if (!S.quoteEndpoint) { st.hidden = true; return; }
    if (lastSent === msgText) return; lastSent = msgText;
    st.hidden = false; st.textContent = 'กำลังส่งสำเนาคำขอถึงร้าน…';
    const payload = { ...o, event_name: o.event === 'other' ? 'อื่น ๆ' : evOf[o.event].name, format_name: o.format ? fmOf[o.format].name : '', package_name: o.pkg ? pkOf[o.pkg].name : '',
      dishes: favs.map(id => BY_ID.get(id).title), message: msgText, page: location.href, sent_at: new Date().toISOString() };
    fetch(S.quoteEndpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(() => { st.textContent = '✓ ร้านได้รับสำเนาคำขอของคุณแล้ว'; })
      .catch(() => { st.textContent = 'ส่งสำเนาไม่สำเร็จ กรุณาส่งทางแชตหรือโทรแทน'; lastSent = ''; });
  }
  $('#qForm').addEventListener('submit', e => {
    e.preventDefault(); const o = readForm();
    if (!validate(o)) { const f = $('.field.err input, .field.err select') || $('.field.err'); if (f) { f.scrollIntoView({ block: 'center' }); if (f.focus) f.focus(); } toast('กรอกข้อมูลที่จำเป็นให้ครบก่อนนะ'); return; }
    msgText = compose(o); $('#sText').textContent = msgText;
    $('#sSms').href = `sms:${S.tel}?&body=${encodeURIComponent(msgText)}`;
    $('#sLine').hidden = !S.line;
    track('generate_lead', { event_type: o.event, guests: +o.guests, format: o.format || 'any', package: o.pkg || 'none', dishes: favs.length });
    const opened = openChat();                       // เปิดแชตเพจร้านพร้อมข้อความทันที
    $('#sStatus').textContent = opened
      ? 'เปิดแชต Messenger ของเพจร้านพร้อมข้อความให้แล้ว กด "ส่ง" ในแชตเพื่อส่งถึงร้าน'
      : 'กดปุ่ม "ส่งเข้าแชตเพจร้าน" ด้านล่างเพื่อเปิดแชตพร้อมข้อความ';
    sendDlg.showModal();
    saveCopy(o);
  });
  $('#sSms').addEventListener('click', () => track('send_quote', { channel: 'sms' }));
  $('#sCopy').addEventListener('click', () => track('send_quote', { channel: 'copy' }));
  $('#sCopy').onclick = async () => toast(await copy(msgText) ? 'คัดลอกข้อความแล้ว' : 'คัดลอกไม่สำเร็จ ลองกดค้างที่ข้อความเพื่อคัดลอก');
  $('#sMessenger').onclick = () => { openChat(); toast('เปิดแชตเพจร้านแล้ว ถ้าข้อความไม่ขึ้น กด "วาง" ได้เลย'); };
  $('#sLine').onclick = () => window.open(`https://line.me/R/oaMessage/${encodeURIComponent(S.line)}/?${encodeURIComponent(msgText)}`, '_blank', 'noopener');
  sendDlg.addEventListener('click', e => { if (e.target === sendDlg || e.target.closest('[data-close]')) sendDlg.close(); });

  /* ---------- global actions ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-filter-event],[data-filter-format],[data-filter-group],[data-filter-pkg],[data-quote-event],[data-quote-pkg]'); if (!t) return;
    const ds = t.dataset;
    if (ds.filterEvent) filterTo({ event: ds.filterEvent });
    else if (ds.filterFormat) filterTo({ format: ds.filterFormat });
    else if (ds.filterGroup) filterTo({ group: ds.filterGroup });
    else if (ds.filterPkg) filterTo({ pkg: ds.filterPkg });
    else if (ds.quoteEvent) { fillForm({ event: ds.quoteEvent, format: evOf[ds.quoteEvent].formats[0], pkg: evOf[ds.quoteEvent].packages[0] }); store.set('ct_form', readForm()); scrollToId('quote'); toast('เลือกประเภทงานให้แล้ว กรอกต่อได้เลย'); }
    else if (ds.quotePkg) { const p = pkOf[ds.quotePkg]; const cur = readForm(); fillForm({ pkg: p.key, format: (p.match.formats || [])[0] || cur.format, event: cur.event || p.events[0] }); store.set('ct_form', readForm()); scrollToId('quote'); toast(`เลือกแพ็กเกจ "${p.name}" แล้ว`); }
  });

  /* ---------- contact ---------- */
  $('#contactList').innerHTML = [
    ['phone', 'โทร', `<a href="tel:${S.tel}"><b>${esc(S.phone)}</b></a>`],
    ['clock', 'เวลา', esc(S.hours)],
    ['pin', 'ที่อยู่', `${esc(S.address)}<br><a href="${S.mapUrl}" target="_blank" rel="noopener">นำทางด้วย Google Maps →</a>`],
    ['truck', 'บริการ', S.extras.map(esc).join('<br>')]
  ].map(([i, k, v]) => `<dt>${icon(i)}${k}</dt><dd>${v}</dd>`).join('');
  $('#channels').innerHTML = [
    `<a class="btn primary" href="tel:${S.tel}">${icon('phone')}โทรเลย</a>`,
    `<a class="btn" href="${S.messenger}" target="_blank" rel="noopener">${icon('msg')}Messenger</a>`,
    S.line ? `<a class="btn" href="${lineUrl}" target="_blank" rel="noopener">${icon('msg')}LINE</a>` : '',
    `<a class="btn" href="${S.lineman}" target="_blank" rel="noopener">${icon('truck')}สั่งผ่าน LINE MAN</a>`,
    `<a class="btn" href="${S.facebook}" target="_blank" rel="noopener">Facebook</a>`
  ].join('');
  $('#mapFrame').src = `https://maps.google.com/maps?q=${S.geo.lat},${S.geo.lng}&hl=th&z=16&output=embed`;
  $('#footL').textContent = `© ${new Date().getFullYear()} ${S.name} · ${S.tagline}`;
  $('#footR').innerHTML = `โทร <a href="tel:${S.tel}">${esc(S.phone)}</a> · ราคาสอบถามตามงาน`;

  syncFavs();
  render();
})();
