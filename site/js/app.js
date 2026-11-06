/* MEGASTORE – machetă demo. Catalog generat (2.000 de produse inventate), filtre, căutare, mega-meniu, coș salvat local, checkout demo. */
(() => {
  'use strict';

  /* ---------- Generator produse (identic cu modelul original: aceeași sămânță, aceleași rezultate) ---------- */
  /* Poza se alege după TIPUL produsului. Doar 8 tipuri au fotografie potrivită;
     celelalte primesc un placeholder SVG cu iconița și numele tipului (niciodată poza altui produs). */
  const PHOTO = { 'Căști': 1, 'Smartwatch': 2, 'Espressor': 3, 'Sneakers': 4, 'Rucsac': 5, 'Lampă de birou': 6, 'Blender': 7, 'Scaun ergonomic': 8 };
  const IMG = p => PHOTO[p.type] ? '/img/i' + PHOTO[p.type] + '-400.webp' : '/img/tip/' + slug(p.type) + '.svg';
  const IMG_BIG = p => PHOTO[p.type] ? '/img/i' + PHOTO[p.type] + '.webp' : IMG(p);
  const CAT = [
    ['Electronice', [0, 1], ['Căști', 'Smartwatch', 'Boxă', 'Tabletă', 'Încărcător']],
    ['Electrocasnice', [2, 6], ['Espressor', 'Blender', 'Mixer', 'Fierbător', 'Prăjitor']],
    ['Sport', [3, 4], ['Sneakers', 'Rucsac', 'Tricou tehnic', 'Sticlă termos', 'Saltea yoga']],
    ['Casă & birou', [5, 7], ['Lampă de birou', 'Scaun ergonomic', 'Organizator', 'Raft', 'Suport laptop']],
    ['Fashion', [3, 4], ['Pantofi', 'Geantă', 'Hanorac', 'Jachetă', 'Șapcă']],
    ['Accesorii', [0, 1], ['Husă', 'Cablu USB-C', 'Powerbank', 'Suport telefon', 'Mouse']]
  ];
  const BR = ['Novio', 'Aurelis', 'Kordo', 'Brixa', 'Lumea', 'Velta', 'Orion', 'Tesso'];
  const ADJ = ['Pro', 'Air', 'Max', 'Lite', 'Plus', 'Neo', 'One', 'X'];
  const COL = ['negru', 'alb', 'gri', 'albastru', 'verde', 'roșu'];
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const slug = s => norm(s).replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const CAT_SLUG = Object.fromEntries(CAT.map(c => [slug(c[0]), c[0]]));
  const TYPE_SLUG = {};
  CAT.forEach(c => c[2].forEach(t => { TYPE_SLUG[slug(t)] = t; }));

  let seed = 7;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const P = [];
  for (let i = 0; i < 2000; i++) {
    const c = CAT[Math.floor(r() * CAT.length)], t = c[2][Math.floor(r() * c[2].length)], b = BR[Math.floor(r() * BR.length)],
      base = Math.round((40 + r() * r() * 3500) / 10) * 10 - 1, sale = r() < .28, old = sale ? Math.round(base * (1.15 + r() * .4) / 10) * 10 - 1 : 0;
    const name = t + ' ' + b + ' ' + ADJ[Math.floor(r() * ADJ.length)] + ' ' + COL[Math.floor(r() * COL.length)];
    r(); // apelul păstrat din generatorul original (alegea poza după categorie) – menține identice ratingurile, stocurile etc.
    P.push({ id: i, cat: c[0], type: t, name, brand: b, price: base, old, rate: Math.round((3 + r() * 2) * 10) / 10, rev: Math.floor(r() * 900), stock: Math.floor(r() * 40), pop: r(), nw: r() });
  }
  P.forEach(p => { p.s = norm(p.name + ' ' + p.brand + ' ' + p.cat); });

  /* ---------- Utilitare ---------- */
  const $ = s => document.querySelector(s);
  const nf0 = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0, useGrouping: true });
  const nf2 = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const grp = s => s.replace(/^(\d)(\d{3})(?=\D|$)/, '$1.$2'); // forțează separatorul de mii și la numere de 4 cifre
  const lei = n => grp(Number.isInteger(n) ? nf0.format(n) : nf2.format(n)) + ' lei';
  const num = n => grp(nf0.format(n));
  const produse = n => n === 1 ? '1 produs' : num(n) + ((n % 100 === 0 && n > 0) || n % 100 >= 20 ? ' de produse' : ' produse');
  const stars = n => '<i class="stars" style="--r:' + n + '"></i>';
  const round2 = n => Math.round(n * 100) / 100;
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const disc = p => p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
  const stockTxt = p => p.stock ? (p.stock < 5 ? 'Ultimele ' + p.stock + ' bucăți' : 'În stoc') : 'Stoc epuizat';
  const stockCls = p => p.stock ? (p.stock < 5 ? 'low' : '') : 'out';
  const FREE = 250, SHIP = 19.99, PER = 24;

  /* ---------- Coș salvat în localStorage ---------- */
  const KEY = 'megastore-cos-v1';
  const cart = new Map();
  function loadCart() {
    cart.clear();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(raw)) raw.forEach(([id, q]) => {
        const p = P[id];
        if (p && p.stock > 0 && Number.isInteger(q) && q > 0) cart.set(id, Math.min(q, p.stock));
      });
    } catch (e) { /* stocare indisponibilă – coșul rămâne doar în memorie */ }
  }
  function saveCart() {
    try { localStorage.setItem(KEY, JSON.stringify([...cart])); } catch (e) { /* ignorăm */ }
  }
  const cartQty = () => { let n = 0; cart.forEach(q => { n += q; }); return n; };
  const cartSub = () => { let s = 0; cart.forEach((q, id) => { s += P[id].price * q; }); return round2(s); };
  function setQty(id, q) {
    const p = P[id];
    q = Math.max(0, Math.min(p.stock, Math.floor(q) || 0));
    if (q) cart.set(id, q); else cart.delete(id);
    saveCart(); updateBadge();
    if (route === 'cart') renderCart();
  }
  function addToCart(id, q = 1) {
    const p = P[id], have = cart.get(id) || 0;
    if (!p.stock) return;
    const next = Math.min(p.stock, have + q);
    if (next === have) { toast('Ai deja în coș tot stocul disponibil (' + p.stock + ' buc.).'); return; }
    setQty(id, next);
    const b = $('#cartb'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    toast('Adăugat în coș: ' + (next - have > 1 ? (next - have) + ' × ' : '') + p.name, true);
  }
  function updateBadge() { $('#cc').textContent = cartQty(); }

  /* ---------- Stare filtre + URL ---------- */
  const st = { q: '', cats: new Set(), type: '', brands: new Set(), rate: 0, min: 0, max: 0, sale: false, stock: false, sort: 'pop' };
  let shown = PER, L = [];

  function readURL() {
    const u = new URLSearchParams(location.search);
    const list = k => (u.get(k) || '').split(',').map(s => s.trim()).filter(Boolean);
    st.q = (u.get('q') || '').trim();
    st.cats = new Set(list('cat').map(s => CAT_SLUG[s]).filter(Boolean));
    st.type = TYPE_SLUG[u.get('tip') || ''] || '';
    st.brands = new Set(list('brand').map(s => BR.find(b => b.toLowerCase() === s.toLowerCase())).filter(Boolean));
    st.rate = [3.5, 4, 4.5].includes(+u.get('rating')) ? +u.get('rating') : 0;
    st.min = Math.max(0, +u.get('min') || 0);
    st.max = Math.max(0, +u.get('max') || 0);
    st.sale = u.get('reduceri') === '1';
    st.stock = u.get('stoc') === '1';
    st.sort = ['pop', 'asc', 'desc', 'rate', 'new'].includes(u.get('sort')) ? u.get('sort') : 'pop';
    return u.get('p');
  }
  function queryString() {
    const u = new URLSearchParams();
    if (st.q) u.set('q', st.q);
    if (st.cats.size) u.set('cat', [...st.cats].map(slug).join(','));
    if (st.type) u.set('tip', slug(st.type));
    if (st.brands.size) u.set('brand', [...st.brands].map(b => b.toLowerCase()).join(','));
    if (st.min) u.set('min', st.min);
    if (st.max) u.set('max', st.max);
    if (st.rate) u.set('rating', st.rate);
    if (st.sale) u.set('reduceri', '1');
    if (st.stock) u.set('stoc', '1');
    if (st.sort !== 'pop') u.set('sort', st.sort);
    const s = u.toString().replace(/%2C/g, ',');
    return s ? '?' + s : '';
  }
  const writeURL = () => { if (route === 'shop') history.replaceState(null, '', '/' + queryString()); };

  function filter() {
    const q = norm(st.q), words = q.split(/\s+/).filter(Boolean);
    const max = st.max || Infinity;
    const out = P.filter(p =>
      (!words.length || words.every(w => p.s.includes(w))) &&
      (!st.cats.size || st.cats.has(p.cat)) &&
      (!st.type || p.type === st.type) &&
      (!st.brands.size || st.brands.has(p.brand)) &&
      p.rate >= st.rate && p.price >= st.min && p.price <= max &&
      (!st.sale || p.old) && (!st.stock || p.stock > 0));
    const S = { pop: (a, b) => b.pop - a.pop, asc: (a, b) => a.price - b.price, desc: (a, b) => b.price - a.price, rate: (a, b) => b.rate - a.rate || b.rev - a.rev, new: (a, b) => b.nw - a.nw };
    return out.sort(S[st.sort]);
  }

  /* ---------- Randare catalog ---------- */
  const card = (p, i) => {
    const eager = i < 4;
    return `<article class="p">${p.old ? `<span class="badge">-${disc(p)}%</span>` : ''}<button type="button" class="im" data-q="${p.id}" aria-label="Detalii ${p.name}"><img src="${IMG(p)}" alt="${p.name}" width="400" height="400" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></button><div class="br">${p.brand} · ${p.cat}</div><h4><a href="/?p=${p.id}" data-q="${p.id}">${p.name}</a></h4><div class="st" aria-label="Rating ${p.rate} din 5">${stars(p.rate)} <span>${p.rate} (${p.rev})</span></div><div class="price"><b>${lei(p.price)}</b>${p.old ? `<s>${lei(p.old)}</s>` : ''}</div><div class="stock ${stockCls(p)}">${stockTxt(p)}</div><button type="button" class="add" data-a="${p.id}" ${p.stock ? '' : 'disabled'}>${p.stock ? 'Adaugă în coș' : 'Indisponibil'}</button></article>`;
  };

  function renderMore() {
    const m = $('#more');
    if (shown >= L.length) { m.innerHTML = L.length > PER ? `<span class="muted">Ai văzut toate cele ${produse(L.length)}.</span>` : ''; return; }
    const pct = Math.round(shown / L.length * 100);
    m.innerHTML = `<span class="muted">Afișezi ${num(shown)} din ${produse(L.length)}</span><div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div><button type="button" class="btn-ghost" id="loadMore">Încarcă mai multe (${Math.min(PER, L.length - shown)})</button>`;
  }

  function render(resetScroll) {
    L = filter();
    shown = PER;
    $('#cnt').textContent = produse(L.length);
    $('#fapply').textContent = L.length ? 'Vezi ' + produse(L.length) : 'Niciun produs';
    $('#grid').innerHTML = L.slice(0, shown).map(card).join('') ||
      '<div class="empty"><b>Niciun produs pentru filtrele alese.</b><br><button type="button" class="btn-ghost" data-reset style="margin-top:12px">Șterge filtrele</button></div>';
    renderMore(); renderChips(); syncUI(); writeURL();
    if (resetScroll && scrollY > 200) scrollTo({ top: 0 });
  }
  function loadMore() {
    const next = L.slice(shown, shown + PER);
    $('#grid').insertAdjacentHTML('beforeend', next.map((p, i) => card(p, shown + i)).join(''));
    shown += next.length; renderMore();
  }

  function renderChips() {
    const c = [];
    if (st.q) c.push(['q', '', `„${st.q}”`]);
    st.cats.forEach(v => c.push(['cat', v, v]));
    if (st.type) c.push(['type', '', st.type]);
    st.brands.forEach(v => c.push(['brand', v, v]));
    if (st.min || st.max) c.push(['price', '', (st.min ? 'de la ' + lei(st.min) : '') + (st.min && st.max ? ' ' : '') + (st.max ? 'până la ' + lei(st.max) : '')]);
    if (st.rate) c.push(['rate', '', 'Rating ' + String(st.rate).replace('.', ',') + '+']);
    if (st.sale) c.push(['sale', '', 'Doar reduceri']);
    if (st.stock) c.push(['stock', '', 'Doar în stoc']);
    const n = c.filter(x => x[0] !== 'q').length;
    $('#fnum').textContent = n || '';
    $('#chips').innerHTML = c.map(([k, v, t]) => `<button type="button" class="chip" data-chip="${k}" data-v="${v}" aria-label="Elimină filtrul ${t}">${t} <i aria-hidden="true">×</i></button>`).join('') +
      (c.length > 1 ? '<button type="button" class="chip clear" data-reset>Șterge tot</button>' : '');
  }

  function syncUI() {
    if (document.activeElement !== $('#q')) $('#q').value = st.q;
    document.querySelectorAll('#fc input').forEach(i => { i.checked = st.cats.has(i.value); });
    document.querySelectorAll('#fb input').forEach(i => { i.checked = st.brands.has(i.value); });
    document.querySelectorAll('#fr input').forEach(i => { i.checked = +i.value === st.rate; });
    if (document.activeElement !== $('#pmin')) $('#pmin').value = st.min || '';
    if (document.activeElement !== $('#pmax')) $('#pmax').value = st.max || '';
    $('#fsale').checked = st.sale; $('#fstock').checked = st.stock; $('#sort').value = st.sort;
    const one = st.cats.size === 1 ? [...st.cats][0] : (st.cats.size ? null : '');
    document.querySelectorAll('#mega button').forEach(b => b.classList.toggle('on', b.dataset.c === one));
  }

  function resetFilters() {
    st.q = ''; st.cats.clear(); st.type = ''; st.brands.clear(); st.rate = 0; st.min = 0; st.max = 0; st.sale = false; st.stock = false;
    $('#q').value = '';
    render(true);
  }

  /* ---------- Construire filtre + mega-meniu ---------- */
  const count = (k, v) => P.reduce((n, p) => n + (p[k] === v), 0);
  $('#mega').innerHTML = '<button type="button" class="on" data-c="">Toate</button>' + CAT.map(c => `<button type="button" data-c="${c[0]}" aria-haspopup="true">${c[0]}</button>`).join('');
  $('#fc').innerHTML = CAT.map(c => `<label><span class="lbl"><input type="checkbox" value="${c[0]}"> ${c[0]}</span><span>${count('cat', c[0])}</span></label>`).join('');
  $('#fb').innerHTML = BR.map(b => `<label><span class="lbl"><input type="checkbox" value="${b}"> ${b}</span><span>${count('brand', b)}</span></label>`).join('');
  $('#fr').innerHTML = [4.5, 4, 3.5].map(v => `<label><span class="lbl"><input type="radio" name="rt" value="${v}"> <i class="stars" style="--r:${v}"></i> ${String(v).replace('.', ',')}+</span></label>`).join('') +
    '<label><span class="lbl"><input type="radio" name="rt" value="0" checked> Oricare</span></label>';

  const panel = $('#megaPanel');
  const canHover = matchMedia('(hover:hover) and (min-width:901px)');
  let panelCat = '';
  function showPanel(cat) {
    if (!canHover.matches || !cat) { panel.hidden = true; panelCat = ''; return; }
    if (panelCat === cat && !panel.hidden) return;
    panelCat = cat;
    const c = CAT.find(x => x[0] === cat), inCat = P.filter(p => p.cat === cat);
    const best = inCat.filter(p => p.old && p.stock).sort((a, b) => disc(b) - disc(a))[0];
    panel.innerHTML = `<div><h4>${cat}</h4><div class="muted">${produse(inCat.length)}</div><a class="all" href="/?cat=${slug(cat)}" data-pc="${cat}">Vezi toate ›</a></div>` +
      `<div class="types">${c[2].map(t => `<a href="/?cat=${slug(cat)}&tip=${slug(t)}" data-pc="${cat}" data-pt="${t}">${t} <span>${inCat.filter(p => p.type === t).length}</span></a>`).join('')}</div>` +
      (best ? `<a class="promo" href="/?p=${best.id}" data-q="${best.id}"><img src="${IMG(best)}" alt="" width="72" height="72" loading="lazy"><span><span class="badge" style="position:static">-${disc(best)}%</span><b>${best.name}</b>${lei(best.price)} <s class="muted">${lei(best.old)}</s></span></a>` : '');
    panel.hidden = false;
  }
  $('#mega').addEventListener('mouseover', e => { const b = e.target.closest('button'); if (b) showPanel(b.dataset.c); });
  $('#mega').addEventListener('focusin', e => { const b = e.target.closest('button'); if (b) showPanel(b.dataset.c); });
  document.querySelector('.site-header').addEventListener('mouseleave', () => showPanel(''));
  panel.addEventListener('click', e => {
    const a = e.target.closest('[data-pc]');
    if (!a) return;
    e.preventDefault();
    st.cats = new Set([a.dataset.pc]); st.type = a.dataset.pt || '';
    showPanel('');
    go(true);
  });
  panel.addEventListener('focusout', e => { if (!e.currentTarget.parentNode.contains(e.relatedTarget)) showPanel(''); });

  /* ---------- Evenimente filtre ---------- */
  const go = (scroll) => { if (route !== 'shop') navigate('/' + queryString()); else render(scroll); };
  const goSoon = debounce(() => go(), 350);

  $('#mega').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    st.cats = new Set(b.dataset.c ? [b.dataset.c] : []); st.type = '';
    showPanel(''); go(true);
  });
  $('#fc').addEventListener('change', e => { const v = e.target.value; e.target.checked ? st.cats.add(v) : st.cats.delete(v); st.type = ''; go(); });
  $('#fb').addEventListener('change', e => { const v = e.target.value; e.target.checked ? st.brands.add(v) : st.brands.delete(v); go(); });
  $('#fr').addEventListener('change', e => { st.rate = +e.target.value; go(); });
  $('#pmin').addEventListener('input', e => { st.min = Math.max(0, +e.target.value || 0); goSoon(); });
  $('#pmax').addEventListener('input', e => { st.max = Math.max(0, +e.target.value || 0); goSoon(); });
  $('#fsale').addEventListener('change', e => { st.sale = e.target.checked; go(); });
  $('#fstock').addEventListener('change', e => { st.stock = e.target.checked; go(); });
  $('#sort').addEventListener('change', e => { st.sort = e.target.value; go(); });
  $('#freset').addEventListener('click', resetFilters);
  $('#chips').addEventListener('click', e => {
    const c = e.target.closest('[data-chip]'); if (!c) return;
    const k = c.dataset.chip, v = c.dataset.v;
    if (k === 'q') { st.q = ''; $('#q').value = ''; }
    else if (k === 'cat') { st.cats.delete(v); st.type = ''; }
    else if (k === 'type') st.type = '';
    else if (k === 'brand') st.brands.delete(v);
    else if (k === 'price') { st.min = 0; st.max = 0; }
    else if (k === 'rate') st.rate = 0;
    else if (k === 'sale') st.sale = false;
    else if (k === 'stock') st.stock = false;
    go();
  });
  $('#more').addEventListener('click', e => { if (e.target.id === 'loadMore') loadMore(); });

  /* Panou lateral de filtre pe mobil */
  const aside = $('#filters'), ov = $('#foverlay');
  function drawer(open) {
    aside.classList.toggle('open', open); ov.hidden = !open; document.body.classList.toggle('lock', open);
    $('#fopen').setAttribute('aria-expanded', open);
    if (open) $('#fclose').focus(); else if (document.activeElement && aside.contains(document.activeElement)) $('#fopen').focus();
  }
  $('#fopen').addEventListener('click', () => drawer(true));
  $('#fclose').addEventListener('click', () => drawer(false));
  $('#fapply').addEventListener('click', () => { drawer(false); scrollTo({ top: 0 }); });
  ov.addEventListener('click', () => drawer(false));
  matchMedia('(min-width:901px)').addEventListener('change', e => { if (e.matches) drawer(false); });

  /* ---------- Căutare cu debounce + sugestii ---------- */
  const qIn = $('#q'), sg = $('#sugg');
  function suggest() {
    const q = norm(qIn.value.trim()), words = q.split(/\s+/).filter(Boolean);
    if (!words.length) { sg.classList.remove('on'); return; }
    const hits = P.filter(p => words.every(w => p.s.includes(w)));
    const top = hits.slice().sort((a, b) => b.pop - a.pop).slice(0, 6);
    sg.innerHTML = top.map(p => `<a href="/?p=${p.id}" data-q="${p.id}" role="option"><img src="${IMG(p)}" alt="" width="36" height="36"><span>${p.name}<br><b>${lei(p.price)}</b></span></a>`).join('') +
      (hits.length ? `<a href="#" class="all" data-all>Vezi toate rezultatele (${num(hits.length)})</a>` : '<a href="#" class="all" data-all>Niciun rezultat</a>');
    sg.classList.toggle('on', document.activeElement === qIn);
  }
  const searchSoon = debounce(() => { st.q = qIn.value.trim(); st.type = ''; go(); suggest(); }, 220);
  qIn.addEventListener('input', searchSoon);
  qIn.addEventListener('focus', () => { if (qIn.value.trim()) suggest(); });
  qIn.addEventListener('keydown', e => {
    if (e.key === 'Escape') sg.classList.remove('on');
    if (e.key === 'ArrowDown' && sg.classList.contains('on')) { e.preventDefault(); const a = sg.querySelector('a'); if (a) a.focus(); }
  });
  sg.addEventListener('keydown', e => {
    const a = document.activeElement; if (!sg.contains(a)) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); (a.nextElementSibling || a).focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (a.previousElementSibling || qIn).focus(); }
    if (e.key === 'Escape') { sg.classList.remove('on'); qIn.focus(); }
  });
  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault(); st.q = qIn.value.trim(); st.type = ''; sg.classList.remove('on'); qIn.blur(); go(true);
  });
  sg.addEventListener('click', e => { if (e.target.closest('[data-all]')) { e.preventDefault(); $('#searchForm').requestSubmit(); } });
  document.addEventListener('focusin', e => { if (!e.target.closest('.search')) sg.classList.remove('on'); });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.search')) sg.classList.remove('on'); });

  /* ---------- Fereastra de produs ---------- */
  const qv = $('#qv'), qqty = $('#qqty');
  let qId = -1, lastFocus = null;
  function maxAdd(p) { return Math.max(0, p.stock - (cart.get(p.id) || 0)); }
  function syncQty() {
    const p = P[qId], m = maxAdd(p);
    let v = Math.floor(+qqty.value) || 1;
    v = Math.max(1, Math.min(v, Math.max(1, m)));
    qqty.value = v; qqty.max = Math.max(1, m);
    qv.querySelector('[data-step="-1"]').disabled = v <= 1 || !m;
    qv.querySelector('[data-step="1"]').disabled = v >= m;
    qqty.disabled = !m;
    $('#qa').disabled = !m;
    $('#qa').textContent = !p.stock ? 'Stoc epuizat' : (!m ? 'Tot stocul e în coș' : 'Adaugă în coș · ' + lei(round2(p.price * v)));
    const inC = cart.get(p.id);
    $('#qincart').textContent = inC ? 'În coș: ' + inC + ' buc.' : '';
  }
  function similar(p) {
    return P.filter(x => x.cat === p.cat && x.id !== p.id && x.stock)
      .sort((a, b) => (b.type === p.type) - (a.type === p.type) || Math.abs(a.price - p.price) - Math.abs(b.price - p.price))
      .slice(0, 4);
  }
  function openQV(id) {
    const p = P[id]; if (!p) return;
    if (qv.hidden) lastFocus = document.activeElement;
    qId = id;
    const im = $('#qi');
    im.src = IMG(p);
    if (PHOTO[p.type]) { im.srcset = IMG(p) + ' 400w, ' + IMG_BIG(p) + ' 1024w'; im.sizes = '(max-width:640px) 260px, 400px'; } else { im.removeAttribute('srcset'); im.removeAttribute('sizes'); } im.alt = p.name;
    const bd = $('#qbadge'); bd.hidden = !p.old; bd.textContent = p.old ? '-' + disc(p) + '%' : '';
    $('#qb').textContent = p.brand + ' · ' + p.cat;
    $('#qn').textContent = p.name;
    $('#qs').innerHTML = stars(p.rate) + ' <span>' + String(p.rate).replace('.', ',') + ' · ' + p.rev + ' recenzii</span>';
    $('#qp').textContent = lei(p.price);
    $('#qo').textContent = p.old ? lei(p.old) : '';
    $('#qsave').textContent = p.old ? 'Economisești ' + lei(p.old - p.price) : '';
    const s = $('#qstock'); s.className = 'stock ' + stockCls(p);
    s.textContent = p.stock ? (p.stock < 5 ? 'Ultimele ' + p.stock + ' bucăți în stoc' : 'În stoc · ' + p.stock + ' buc. disponibile') : 'Stoc epuizat';
    $('#qd').textContent = 'Produs demonstrativ (inventat). Într-un magazin real, aici apar descrierea, specificațiile, variantele și termenul de livrare.';
    qqty.value = 1; syncQty();
    $('#qsim').innerHTML = similar(p).map(x => `<button type="button" class="sim" data-q="${x.id}"><img src="${IMG(x)}" alt="" width="400" height="400" loading="lazy"><span>${x.name}</span><b>${lei(x.price)}</b></button>`).join('');
    qv.hidden = false; document.body.classList.add('lock');
    qv.querySelector('.box').scrollTop = 0;
    $('#qx').focus();
  }
  function closeQV() {
    if (qv.hidden) return;
    qv.hidden = true; qId = -1;
    if (!aside.classList.contains('open')) document.body.classList.remove('lock');
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  qv.addEventListener('click', e => {
    if (e.target === qv) return closeQV();
    const s = e.target.closest('[data-step]');
    if (s) { qqty.value = (+qqty.value || 1) + +s.dataset.step; syncQty(); }
  });
  qqty.addEventListener('change', syncQty);
  $('#qx').addEventListener('click', closeQV);
  $('#qa').addEventListener('click', () => { const id = qId, n = +qqty.value || 1; addToCart(id, n); closeQV(); });

  /* ---------- Pagina de coș / checkout demo ---------- */
  function renderCart() {
    const items = [...cart];
    const list = $('#cartList'), sum = $('#summary');
    if (!items.length) {
      list.innerHTML = '<div class="cart-empty"><h2 style="margin:0 0 6px">Coșul este gol</h2><p class="muted">Adaugă produse din catalog și revino aici pentru total.</p><a class="back" href="/" data-link>‹ Înapoi la produse</a></div>';
      sum.hidden = true;
      return;
    }
    sum.hidden = false;
    list.innerHTML = items.map(([id, q]) => {
      const p = P[id];
      return `<div class="ci"><img src="${IMG(p)}" alt="${p.name}" width="84" height="84" data-q="${p.id}" loading="lazy">` +
        `<div><div class="br">${p.brand} · ${p.cat}</div><h3>${p.name}</h3><div class="unit">${lei(p.price)} / buc.${p.old ? ` · <s>${lei(p.old)}</s>` : ''}</div><div class="stock ${stockCls(p)}">${p.stock < 5 ? 'Ultimele ' + p.stock + ' bucăți' : 'În stoc'}</div></div>` +
        `<div class="ci-r"><div class="qty" role="group" aria-label="Cantitate ${p.name}"><button type="button" data-cq="${id}" data-d="-1" aria-label="Scade cantitatea" ${q <= 1 ? 'disabled' : ''}>−</button><input type="number" min="1" max="${p.stock}" value="${q}" data-ci="${id}" inputmode="numeric" aria-label="Cantitate"><button type="button" data-cq="${id}" data-d="1" aria-label="Crește cantitatea" ${q >= p.stock ? 'disabled' : ''}>+</button></div>` +
        `<b>${lei(round2(p.price * q))}</b><button type="button" class="rm" data-rm="${id}">Elimină</button></div></div>`;
    }).join('') + '<div style="padding:14px 16px"><a class="back" href="/" data-link style="margin:0">‹ Continuă cumpărăturile</a></div>';
    const sub = cartSub(), ship = sub >= FREE ? 0 : SHIP, total = round2(sub + ship), n = cartQty();
    const left = round2(FREE - sub);
    sum.innerHTML = `<h2>Sumar comandă</h2>` +
      `<div class="row"><span>Subtotal (${produse(n)})</span><span>${lei(sub)}</span></div>` +
      `<div class="row"><span>Transport</span><span>${ship ? lei(ship) : '<b style="color:var(--ok)">Gratuit</b>'}</span></div>` +
      (ship ? `<div class="free">Mai adaugă <b>${lei(left)}</b> pentru transport gratuit.<div class="bar"><i style="width:${Math.min(100, sub / FREE * 100)}%"></i></div></div>` : `<div class="free">Ai transport gratuit (comenzi peste ${FREE} lei).</div>`) +
      `<div class="row total"><span>Total</span><span id="total">${lei(total)}</span></div>` +
      `<div class="muted small">TVA inclus. Transport: gratuit peste ${FREE} lei, altfel ${lei(SHIP)} (exemplu).</div>` +
      `<button type="button" class="btn" id="place">Plasează comanda</button>` +
      `<p class="pay muted">Plata: ramburs la livrare (exemplu). Macheta nu cere și nu colectează date de card.</p>`;
  }
  const vc = $('#viewCart');
  vc.addEventListener('click', e => {
    const b = e.target.closest('[data-cq]');
    if (b) { const id = +b.dataset.cq; setQty(id, (cart.get(id) || 0) + +b.dataset.d); focusQty(id, b.dataset.d); return; }
    const rm = e.target.closest('[data-rm]');
    if (rm) { const p = P[+rm.dataset.rm]; setQty(p.id, 0); toast('Eliminat din coș: ' + p.name); return; }
    if (e.target.id === 'place') openDone();
  });
  vc.addEventListener('change', e => { const i = e.target.closest('[data-ci]'); if (i) setQty(+i.dataset.ci, Math.max(1, +i.value || 1)); });
  function focusQty(id, d) { const b = vc.querySelector(`[data-cq="${id}"][data-d="${d}"]`); if (b && !b.disabled) b.focus(); else { const i = vc.querySelector(`[data-ci="${id}"]`); if (i) i.focus(); } }

  const done = $('#done');
  function openDone() { lastFocus = document.activeElement; done.hidden = false; document.body.classList.add('lock'); $('#doneClose').focus(); }
  function closeDone() { done.hidden = true; document.body.classList.remove('lock'); if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); }
  $('#doneClose').addEventListener('click', closeDone);
  $('#doneClear').addEventListener('click', () => { cart.clear(); saveCart(); updateBadge(); closeDone(); navigate('/'); });
  done.addEventListener('click', e => { if (e.target === done) closeDone(); });

  /* ---------- Rutare (catalog „/” și coș „/cos”) ---------- */
  let route = '';
  let lastShopURL = '/';
  function applyRoute() {
    const isCart = /^\/cos\/?$/.test(location.pathname);
    route = isCart ? 'cart' : 'shop';
    $('#viewShop').hidden = isCart; $('#viewCart').hidden = !isCart;
    drawer(false); closeQV(); showPanel('');
    if (isCart) {
      document.title = 'Coșul tău — MEGASTORE (machetă demo)';
      renderCart();
    } else {
      document.title = 'MEGASTORE — Magazin online (machetă demo)';
      const p = readURL();
      render();
      lastShopURL = '/' + queryString();
      if (p != null && P[+p]) { history.replaceState(null, '', lastShopURL); openQV(+p); }
    }
  }
  function navigate(url) {
    if (route === 'shop') lastShopURL = '/' + queryString();
    history.pushState(null, '', url); // parametrii din URL sunt citiți de applyRoute
    applyRoute();
    scrollTo({ top: 0 });
  }
  addEventListener('popstate', applyRoute);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-link]');
    if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      const href = a.getAttribute('href');
      navigate(href === '/' && route === 'cart' ? lastShopURL : href);
      return;
    }
    const add = e.target.closest('[data-a]');
    if (add) { addToCart(+add.dataset.a); return; }
    const q = e.target.closest('[data-q]');
    if (q && !e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); sg.classList.remove('on'); showPanel(''); openQV(+q.dataset.q); return; }
    if (e.target.closest('[data-reset]')) resetFilters();
    const t = e.target.closest('#toast a');
    if (t) { e.preventDefault(); navigate('/cos'); }
  });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!done.hidden) closeDone(); else if (!qv.hidden) closeQV(); else if (aside.classList.contains('open')) drawer(false); else showPanel('');
  });
  /* focus în ferestre modale */
  addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const m = !done.hidden ? done : !qv.hidden ? qv : (aside.classList.contains('open') ? aside : null);
    if (!m) return;
    const f = [...m.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],select')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* Toast */
  function toast(t, withLink) {
    const o = $('#toast');
    o.textContent = t;
    if (withLink && route !== 'cart') o.insertAdjacentHTML('beforeend', '<a href="/cos">Vezi coșul</a>');
    o.classList.add('on'); clearTimeout(o._t); o._t = setTimeout(() => o.classList.remove('on'), 2600);
  }

  /* Sincronizare coș între tab-uri */
  addEventListener('storage', e => { if (e.key === KEY) { loadCart(); updateBadge(); if (route === 'cart') renderCart(); } });

  loadCart(); updateBadge(); applyRoute();
})();
