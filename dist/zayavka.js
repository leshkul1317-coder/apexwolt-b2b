/* APEXWOLT B2B — страница заявки (корзина): состав, количество, сводка (НДС 22%),
 * «Рекомендуем с этим товаром» (аксессуары/оснастка), контактная форма → бэкенд.
 * Данные каталога берутся из catalog.data.js (categoryData, sectionData). */
(() => {
  'use strict';
  if (typeof categoryData === 'undefined') return;

  const VAT_RATE = 22;
  const CART = 'apexwolt-cart', METAK = 'apexwolt-cart-meta';

  // ---- данные ----
  const sectionByCategory = {};
  Object.entries(sectionData).forEach(([sk, s]) => s.categories.forEach(ck => { sectionByCategory[ck] = sk; }));
  const products = Object.entries(categoryData).flatMap(([category, data]) => data.variants.map(v => ({
    id: v[0], category, code: v[1], name: v[2], stock: v[3], lead: v[4], price: v[5],
    brand: v[7] || '', mp: v[9] ?? null, image: v[11] || data.image, eta: v[12] || ''
  })));
  const byName = new Map(products.map(p => [p.name, p]));

  // ---- утилиты ----
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = v => (v == null) ? '—' : new Intl.NumberFormat('ru-RU').format(Math.round(v)) + ' ₽';
  const money2 = v => (v == null) ? '—' : new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' ₽';
  const plural = (n, f) => { const d = n % 10, dd = n % 100; return (d === 1 && dd !== 11) ? f[0] : (d >= 2 && d <= 4 && (dd < 10 || dd >= 20)) ? f[1] : f[2]; };
  const read = (k, def) => { try { return JSON.parse(localStorage.getItem(k) || def); } catch { return JSON.parse(def); } };
  const toast = document.querySelector('[data-toast]');
  const showToast = m => { if (!toast) return; toast.textContent = m; toast.classList.add('is-visible'); clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove('is-visible'), 2400); };
  window.apexToast = showToast; // для kp.js (кнопки КП)

  let cart = read(CART, '[]');
  const readMeta = () => read(METAK, '{}');
  const writeMeta = m => localStorage.setItem(METAK, JSON.stringify(m));
  const saveCart = () => localStorage.setItem(CART, JSON.stringify(cart));

  // позиции: группировка по имени в порядке первого появления (хронология)
  const lineItems = () => {
    const m = readMeta(), map = new Map();
    cart.forEach(n => {
      if (map.has(n)) { map.get(n).qty++; return; }
      const md = m[n] || {}, p = byName.get(n) || {};
      map.set(n, {
        name: n, qty: 1, code: md.code || p.code || '', brand: md.brand || p.brand || '',
        image: md.image || p.image || '', mrc: (md.mrc ? Number(md.mrc) : p.price) ?? null,
        stock: p.stock, eta: p.eta, category: p.category
      });
    });
    return [...map.values()];
  };

  const setQty = (name, qty) => {
    qty = Math.max(1, Math.min(9999, qty | 0));
    // пересобираем корзину, СОХРАНЯЯ порядок позиций (иначе строка «прыгает» вниз)
    const next = [];
    lineItems().forEach(it => { const q = it.name === name ? qty : it.qty; for (let i = 0; i < q; i++) next.push(it.name); });
    cart = next; saveCart(); renderAll();
  };
  const removeLine = name => {
    cart = cart.filter(n => n !== name);
    const m = readMeta(); delete m[name]; writeMeta(m);
    saveCart(); renderAll();
  };
  const addToCart = (name, md) => {
    cart.push(name);
    if (md) { const m = readMeta(); m[name] = { code: md.code || '', brand: md.brand || '', mrc: md.mrc || '', image: md.image || '' }; writeMeta(m); }
    saveCart(); renderAll(); showToast('Добавлено в заявку');
  };

  // ---- рекомендации: аксессуары/оснастка к инструменту ----
  const ACCESSORY = {
    'dreli-shurupoverty-akkumulyatornye': ['bity-dlya-shurupovertov', 'sverla-po-metallu', 'sverla-po-derevu', 'akkumulyatory', 'zaryadnye-ustroystva'],
    'shurupoverty-mnogofunkcionalnye-akkumulyatornye': ['bity-dlya-shurupovertov', 'sverla-po-metallu', 'akkumulyatory'],
    'vintoverty-akkumulyatornye': ['bity-dlya-shurupovertov', 'nasadki-torcevye-dlya-shurupovertov', 'akkumulyatory'],
    'dreli-elektricheskie': ['sverla-po-metallu', 'sverla-po-derevu', 'sverla-po-betonu-i-kamnyu'],
    'gaykoverty-akkumulyatornye': ['nasadki-torcevye-dlya-shurupovertov', 'akkumulyatory', 'zaryadnye-ustroystva'],
    'perforatory-akkumulyatornye': ['bury-sds-plus', 'zubila-sds-plus', 'akkumulyatory'],
    'perforatory-setevye': ['bury-sds-plus', 'zubila-sds-plus'],
    'otboynye-molotki': ['zubila-sds-plus'],
    'ugloshlifovalnye-mashiny-akkumulyatornye': ['krugi-otreznye-po-metallu', 'diski-almaznye-otreznye', 'schetki-dlya-ushm', 'akkumulyatory'],
    'ugloshlifovalnye-mashiny-setevye': ['krugi-otreznye-po-metallu', 'diski-almaznye-otreznye', 'schetki-dlya-ushm'],
    'pily-diskovye-setevye': ['diski-pilnye-po-derevu'],
    'shlifovalnye-mashiny-ekscentrikovye': ['shlifovalnaya-bumaga'],
    'shlifovalnye-mashiny-lentochnye': ['shlifovalnaya-bumaga'],
    'shlifovalnye-mashiny-dlya-sten': ['shlifovalnaya-bumaga']
  };

  const recommendations = () => {
    const inCart = new Set(cart);
    const wanted = new Map();
    lineItems().forEach(it => {
      (ACCESSORY[it.category] || []).forEach(ck => wanted.set(ck, (wanted.get(ck) || 0) + 1));
      if (sectionByCategory[it.category] === 'akkumulyatornyy-instrument') ['akkumulyatory', 'zaryadnye-ustroystva'].forEach(ck => wanted.set(ck, (wanted.get(ck) || 0) + 0.5));
    });
    let pool = [];
    wanted.forEach((score, ck) => (categoryData[ck]?.variants || []).forEach(v => {
      if (inCart.has(v[2])) return;
      pool.push({ name: v[2], code: v[1], brand: v[7] || '', image: v[11] || categoryData[ck].image, price: v[5], stock: v[3], score });
    }));
    pool.sort((a, b) => (b.stock - a.stock) || (b.score - a.score) || ((b.price ? 1 : 0) - (a.price ? 1 : 0)));
    const seen = new Set(), out = [];
    for (const p of pool) { if (seen.has(p.name)) continue; seen.add(p.name); out.push(p); if (out.length >= 4) break; }
    return out;
  };

  // ---- рендер ----
  const el = s => document.querySelector(s);
  const itemsHost = el('[data-zv-items]'), sumHost = el('[data-zv-sum]'), recoHost = el('[data-zv-reco]'),
    recoWrap = el('[data-zv-reco-wrap]'), countEl = el('[data-zv-count]'), emptyEl = el('[data-zv-empty]'),
    summaryWrap = el('[data-zv-summary-wrap]');

  const renderItems = its => {
    itemsHost.innerHTML = its.map((it, i) => {
      const avail = it.stock ? 'В наличии' : (it.eta ? `В пути · ожидается ${esc(it.eta)}` : 'В пути');
      const availCls = it.stock ? 'is-in' : 'is-out';
      const sum = it.mrc != null ? it.mrc * it.qty : null;
      return `<div class="zv-item">
        <span class="zv-num">${i + 1}</span>
        <span class="zv-thumb">${it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy">` : ''}</span>
        <div class="zv-item-info">
          ${it.brand ? `<span class="zv-brand">${esc(it.brand)}</span>` : ''}
          <b class="zv-name">${esc(it.name)}</b>
          <span class="zv-meta">Артикул: ${esc(it.code) || '—'}</span>
          <span class="zv-avail ${availCls}">${avail}</span>
        </div>
        <div class="zv-qty">
          <button type="button" class="zv-step" data-dec="${esc(it.name)}" aria-label="Уменьшить">−</button>
          <input type="number" min="1" value="${it.qty}" data-qty="${esc(it.name)}" aria-label="Количество" />
          <button type="button" class="zv-step" data-inc="${esc(it.name)}" aria-label="Увеличить">+</button>
        </div>
        <div class="zv-price"><b>${it.mrc != null ? money(it.mrc) : 'по запросу'}</b>${it.qty > 1 && sum != null ? `<small>${money(sum)} за ${it.qty} шт</small>` : '<small>за шт</small>'}</div>
        <button type="button" class="zv-remove" data-remove="${esc(it.name)}" aria-label="Удалить позицию">×</button>
      </div>`;
    }).join('');
  };

  const renderSummary = its => {
    const total = its.reduce((s, it) => s + (it.mrc != null ? it.mrc * it.qty : 0), 0);
    const vat = total - total / (1 + VAT_RATE / 100);
    const qty = its.reduce((s, it) => s + it.qty, 0);
    sumHost.innerHTML =
      `<div class="zv-sum-row"><span>Позиций</span><b>${its.length} · ${qty} шт</b></div>
       <div class="zv-sum-row zv-sum-total"><span>Итого</span><b>${money2(total)}</b></div>
       <div class="zv-sum-vat">в т.ч. НДС ${VAT_RATE}% — ${money2(vat)}</div>`;
  };

  const renderReco = () => {
    const recos = recommendations();
    if (!recos.length) { recoWrap.hidden = true; return; }
    recoWrap.hidden = false;
    recoHost.innerHTML = recos.map(r => `<article class="zv-reco-card">
      <span class="zv-reco-thumb">${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy">` : ''}</span>
      ${r.brand ? `<span class="zv-brand">${esc(r.brand)}</span>` : ''}
      <b>${esc(r.name)}</b>
      <span class="zv-reco-foot"><span class="zv-reco-price">${r.price != null ? money(r.price) : 'по запросу'}</span>
      <button type="button" class="zv-reco-add" data-add="${esc(r.name)}">+ В заявку</button></span>
    </article>`).join('');
  };

  const renderAll = () => {
    const its = lineItems();
    countEl.textContent = `${its.length} ${plural(its.length, ['позиция', 'позиции', 'позиций'])}`;
    const empty = its.length === 0;
    emptyEl.hidden = !empty;
    itemsHost.hidden = empty;
    if (summaryWrap) summaryWrap.style.display = empty ? 'none' : '';
    if (empty) { recoWrap.hidden = true; itemsHost.innerHTML = ''; return; }
    renderItems(its); renderSummary(its); renderReco();
  };

  // ---- события состава ----
  document.addEventListener('click', e => {
    const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]'),
      rm = e.target.closest('[data-remove]'), add = e.target.closest('[data-add]');
    if (inc) { const n = inc.dataset.inc; const c = cart.filter(x => x === n).length; setQty(n, c + 1); }
    else if (dec) { const n = dec.dataset.dec; const c = cart.filter(x => x === n).length; setQty(n, c - 1); }
    else if (rm) { removeLine(rm.dataset.remove); }
    else if (add) {
      const p = byName.get(add.dataset.add);
      if (p) addToCart(p.name, { code: p.code, brand: p.brand, mrc: p.price, image: p.image });
    }
  });
  document.addEventListener('change', e => {
    const q = e.target.closest('[data-qty]');
    if (q) setQty(q.dataset.qty, parseInt(q.value, 10) || 1);
  });

  // ---- шаги + контактная форма ----
  const steps = el('[data-zv-steps]');
  const setStep = n => { if (!steps) return; steps.querySelectorAll('li').forEach(li => { const s = +li.dataset.step; li.classList.toggle('is-current', s === n); li.classList.toggle('is-done', s < n); }); };
  const contact = el('[data-zv-contact]'), grid = el('[data-zv-grid]'), successEl = el('[data-zv-success]');
  const form = el('[data-request-form]'), feedback = el('[data-request-feedback]'), submitBtn = el('[data-request-submit]');

  const gotoContact = () => {
    if (!cart.length) { showToast('Заявка пуста — добавьте позиции из каталога.'); return; }
    contact.hidden = false; setStep(2);
    contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  el('[data-zv-checkout]')?.addEventListener('click', gotoContact);
  el('[data-zv-contact-back]')?.addEventListener('click', () => { contact.hidden = true; setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); });

  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const ENDPOINT = window.APEXWOLT_REQUEST_ENDPOINT || (isLocal ? 'http://localhost:8787/request' : '/api/request');
  const setFeedback = (m, t = 'error') => { if (!feedback) return; feedback.textContent = m || ''; feedback.className = `request-feedback is-${t}`; feedback.hidden = !m; };

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    setFeedback('');
    const fd = new FormData(form);
    const contactData = {
      name: String(fd.get('name') || '').trim(), company: String(fd.get('company') || '').trim(),
      inn: String(fd.get('inn') || '').trim(), email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      comment: [String(fd.get('comment') || '').trim(),
        fd.get('wanted_date') ? 'Желаемая дата: ' + fd.get('wanted_date') : '',
        fd.get('address') ? 'Адрес/отгрузка: ' + String(fd.get('address')).trim() : ''].filter(Boolean).join('. '),
      consent: fd.get('consent') === 'on',
      marketing: fd.get('marketing') === 'on'
    };
    const errs = [];
    if (contactData.name.length < 2) errs.push('контактное лицо');
    if (!contactData.company && !contactData.inn) errs.push('компанию или ИНН');
    if (contactData.inn && !/^\d{10}(\d{2})?$/.test(contactData.inn)) errs.push('корректный ИНН');
    if (!contactData.email && !contactData.phone) errs.push('email или телефон');
    if (!contactData.consent) errs.push('согласие на обработку данных');
    const its = lineItems();
    if (!its.length) errs.push('позиции в заявке');
    if (errs.length) { setFeedback('Укажите: ' + errs.join(', ') + '.'); return; }

    const payload = {
      contact: contactData,
      items: its.map(it => ({ name: it.name, code: it.code, qty: it.qty, mrc: it.mrc, brand: it.brand })),
      meta: { source: 'zayavka' }
    };
    const prev = submitBtn.textContent; submitBtn.disabled = true; submitBtn.textContent = 'Отправляем…';
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        localStorage.removeItem(CART); localStorage.removeItem(METAK); cart = [];
        grid.style.display = 'none'; contact.hidden = true; setStep(3);
        successEl.hidden = false;
        successEl.innerHTML = `<div class="zv-success-inner"><img class="zv-success-logo" src="assets/apexwolt-logo-solid.svg" alt="APEXWOLT" /><span class="zv-success-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><h2>Заявка отправлена</h2><p class="zv-success-id">Номер заявки: <b>${esc(data.id)}</b></p><p>Менеджер проверит цены, наличие и сроки и свяжется с вами по указанным контактам. Подтверждение придёт на вашу почту.</p><a class="zv-success-btn" href="catalog.html">Вернуться в каталог</a></div>`;
        successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('Заявка отправлена менеджеру');
      } else setFeedback(data.error || 'Не удалось отправить заявку. Попробуйте ещё раз.');
    } catch { setFeedback('Сервер недоступен. Проверьте соединение и попробуйте позже.'); }
    finally { submitBtn.disabled = false; submitBtn.textContent = prev; }
  });

  renderAll();
})();
