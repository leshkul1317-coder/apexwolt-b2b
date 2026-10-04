/* APEXWOLT B2B — быстрый заказ по списку артикулов.
 * Вставка списка (или загрузка .csv/.xlsx) -> сопоставление с каталогом по артикулу
 * -> сборка заявки (apexwolt-cart / apexwolt-cart-meta, тот же формат, что в каталоге).
 * Данные берутся из catalog.data.js (categoryData). Всё в IIFE, чтобы не конфликтовать
 * с top-level const из catalog.data.js и collections.js (общая лексическая область). */
(() => {
  const CART = 'apexwolt-cart', META = 'apexwolt-cart-meta';
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = v => Number(v) > 0 ? `${Number(v).toLocaleString('ru-RU')} ₽` : 'По запросу';

  // ---- каталог: индекс по артикулу ----
  const byCode = new Map(), byLoose = new Map();
  const norm = c => String(c).trim().toLowerCase();
  const loose = c => norm(c).replace(/[^a-z0-9а-я]/gi, '');
  try {
    for (const k in categoryData) {
      (categoryData[k].variants || []).forEach(v => {
        const p = { id: v[0], code: v[1], name: v[2], stock: v[3], price: v[5], brand: v[7], image: v[11] };
        if (!p.code) return;
        if (!byCode.has(norm(p.code))) byCode.set(norm(p.code), p);
        if (!byLoose.has(loose(p.code))) byLoose.set(loose(p.code), p);
      });
    }
  } catch (e) { /* каталог недоступен */ }
  const findByCode = code => byCode.get(norm(code)) || byLoose.get(loose(code)) || null;

  // ---- парсинг строки: артикул + количество ----
  const parseLine = raw => {
    let s = String(raw).trim().replace(/^артикул[:\s]*/i, '');
    if (!s) return null;
    let code = s, qty = 1;
    const parts = s.split(/[;,\t]+/).map(x => x.trim()).filter(Boolean);
    if (parts.length >= 2) {
      code = parts[0];
      const q = parseInt(String(parts[1]).replace(/\D/g, ''), 10);
      if (q > 0) qty = q;
    } else {
      const m = s.match(/^(.+?)\s+(?:[x×х*]\s*)?(\d{1,5})\s*(?:шт\.?)?$/i);
      if (m) { code = m[1].trim(); qty = parseInt(m[2], 10) || 1; }
    }
    return { code, qty: Math.max(1, Math.min(9999, qty)) };
  };

  // ---- корзина ----
  const readCart = () => { try { return JSON.parse(localStorage.getItem(CART) || '[]'); } catch { return []; } };
  const writeCart = a => localStorage.setItem(CART, JSON.stringify(a));
  const writeMeta = (name, meta) => {
    let m; try { m = JSON.parse(localStorage.getItem(META) || '{}'); } catch { m = {}; }
    m[name] = { code: meta.code || '', brand: meta.brand || '', mrc: meta.mrc || '', image: meta.image || '' };
    localStorage.setItem(META, JSON.stringify(m));
  };

  // ---- состояние разбора ----
  let matched = [];   // [{ p, qty }]
  let unknown = [];   // [{ code, qty }]

  const el = s => document.querySelector(s);
  const input = el('[data-zk-input]'), resultWrap = el('[data-zk-result]'),
    matchedHost = el('[data-zk-matched]'), unknownHost = el('[data-zk-unknown]'),
    summaryHost = el('[data-zk-summary]'), addBtn = el('[data-zk-add]'),
    toastEl = el('[data-toast]'), successEl = el('[data-zk-success]');

  const toast = msg => {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('is-visible');
    clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
  };

  const analyze = text => {
    const lines = String(text).split(/\r?\n/);
    const agg = new Map();        // code(norm) -> qty (суммируем дубли)
    const order = [];
    lines.forEach(line => {
      const parsed = parseLine(line);
      if (!parsed) return;
      const key = norm(parsed.code);
      if (!agg.has(key)) { agg.set(key, { code: parsed.code, qty: 0 }); order.push(key); }
      agg.get(key).qty += parsed.qty;
    });
    matched = []; unknown = [];
    order.forEach(key => {
      const { code, qty } = agg.get(key);
      const p = findByCode(code);
      if (p) matched.push({ p, qty });
      else unknown.push({ code, qty });
    });
    renderResult();
  };

  const renderResult = () => {
    if (!matched.length && !unknown.length) { resultWrap.hidden = true; return; }
    resultWrap.hidden = false;
    if (successEl) successEl.hidden = true;

    matchedHost.innerHTML = matched.length ? matched.map((it, i) => {
      const sum = Number(it.p.price) > 0 ? it.p.price * it.qty : 0;
      return `<div class="zk-row" data-i="${i}">
        <span class="zk-thumb">${it.p.image ? `<img src="${esc(it.p.image)}" alt="" loading="lazy">` : ''}</span>
        <div class="zk-info"><p class="zk-code">Артикул: <b>${esc(it.p.code)}</b></p><p class="zk-name">${esc(it.p.name)}</p>${it.p.brand ? `<span class="zk-brand">${esc(it.p.brand)}</span>` : ''}</div>
        <div class="zk-price"><span>${money(it.p.price)}</span>${sum ? `<b>${money(sum)}</b>` : ''}</div>
        <div class="zk-qty"><button type="button" data-zk-dec="${i}" aria-label="Меньше">−</button><input type="text" inputmode="numeric" data-zk-qty="${i}" value="${it.qty}" aria-label="Количество" /><button type="button" data-zk-inc="${i}" aria-label="Больше">+</button></div>
        <button class="zk-remove" type="button" data-zk-del="${i}" aria-label="Убрать">×</button>
      </div>`;
    }).join('') : '<p class="zk-none">Совпадений по артикулам не найдено.</p>';

    unknownHost.innerHTML = unknown.length
      ? `<p class="zk-unknown-title">Не найдены в каталоге (${unknown.length}):</p><div class="zk-unknown-chips">${unknown.map(u => `<span>${esc(u.code)}</span>`).join('')}</div><p class="zk-unknown-hint">Проверьте артикул или уточните эти позиции у менеджера.</p>`
      : '';
    unknownHost.hidden = !unknown.length;

    const totalQty = matched.reduce((s, it) => s + it.qty, 0);
    const totalSum = matched.reduce((s, it) => s + (Number(it.p.price) > 0 ? it.p.price * it.qty : 0), 0);
    summaryHost.innerHTML = matched.length
      ? `Найдено: <b>${matched.length}</b> поз. · <b>${totalQty}</b> шт${totalSum ? ` · ориентировочно <b>${money(totalSum)}</b>` : ''}`
      : '';
    addBtn.disabled = !matched.length;
    addBtn.textContent = matched.length ? `Добавить в заявку (${matched.length})` : 'Нет позиций для добавления';

    // события количества/удаления
    matchedHost.querySelectorAll('[data-zk-inc]').forEach(b => b.addEventListener('click', () => setQty(+b.dataset.zkInc, matched[+b.dataset.zkInc].qty + 1)));
    matchedHost.querySelectorAll('[data-zk-dec]').forEach(b => b.addEventListener('click', () => setQty(+b.dataset.zkDec, matched[+b.dataset.zkDec].qty - 1)));
    matchedHost.querySelectorAll('[data-zk-qty]').forEach(inp => inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 4); }));
    matchedHost.querySelectorAll('[data-zk-qty]').forEach(inp => inp.addEventListener('change', () => setQty(+inp.dataset.zkQty, parseInt(inp.value, 10) || 1)));
    matchedHost.querySelectorAll('[data-zk-del]').forEach(b => b.addEventListener('click', () => { matched.splice(+b.dataset.zkDel, 1); renderResult(); }));
  };

  const setQty = (i, q) => { if (!matched[i]) return; matched[i].qty = Math.max(1, Math.min(9999, q | 0)); renderResult(); };

  const addToRequest = () => {
    if (!matched.length) return;
    const cart = readCart();
    matched.forEach(it => { for (let n = 0; n < it.qty; n++) cart.push(it.p.name); writeMeta(it.p.name, { code: it.p.code, brand: it.p.brand, mrc: it.p.price, image: it.p.image }); });
    writeCart(cart);
    refreshCount();
    const poz = matched.length, sht = matched.reduce((s, it) => s + it.qty, 0);
    toast(`Добавлено в заявку: ${poz} поз. · ${sht} шт`);
    if (successEl) {
      successEl.hidden = false;
      successEl.innerHTML = `<span class="zk-ok" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span>
        <p>Добавлено <b>${poz}</b> позиций (${sht} шт) в заявку.</p>
        <div class="zk-success-btns"><a class="zk-btn-dark" href="zayavka.html">Перейти к оформлению →</a><button type="button" class="zk-btn-light" data-zk-more>Добавить ещё список</button></div>`;
      successEl.querySelector('[data-zk-more]')?.addEventListener('click', () => { successEl.hidden = true; input.value = ''; matched = []; unknown = []; resultWrap.hidden = true; input.focus(); });
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // ---- загрузка файла (.csv / .xlsx) ----
  let exceljsPromise = null;
  const loadExcelJS = () => {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    if (!exceljsPromise) exceljsPromise = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'assets/vendor/exceljs.min.js';
      s.onload = () => res(window.ExcelJS); s.onerror = () => rej(new Error('exceljs load failed'));
      document.head.appendChild(s);
    });
    return exceljsPromise;
  };

  const linesFromRows = rows => rows.map(r => {
    const code = (r[0] ?? '').toString().trim();
    const qty = (r[1] ?? '').toString().trim();
    if (!code) return '';
    return qty ? `${code};${qty}` : code;
  }).filter(Boolean).join('\n');

  const handleFile = async file => {
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith('.csv') || file.type === 'text/csv' || name.endsWith('.txt')) {
        const text = await file.text();
        const rows = text.split(/\r?\n/).map(l => l.split(/[;,\t]/));
        const merged = linesFromRows(rows);
        input.value = (input.value.trim() ? input.value.trim() + '\n' : '') + merged;
        analyze(input.value);
      } else if (name.endsWith('.xlsx')) {
        const ExcelJS = await loadExcelJS();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());
        const ws = wb.worksheets[0];
        const rows = [];
        ws.eachRow(row => {
          const c1 = row.getCell(1).value, c2 = row.getCell(2).value;
          const val = x => (x && typeof x === 'object' && 'text' in x) ? x.text : x;
          rows.push([val(c1) ?? '', val(c2) ?? '']);
        });
        // пропускаем строку-заголовок, если в первой ячейке не найден артикул и текст похож на заголовок
        if (rows.length && !findByCode(String(rows[0][0])) && /артикул|код|наимен|кол/i.test(String(rows[0][0]) + String(rows[0][1]))) rows.shift();
        const merged = linesFromRows(rows);
        input.value = (input.value.trim() ? input.value.trim() + '\n' : '') + merged;
        analyze(input.value);
      } else {
        toast('Поддерживаются файлы .csv и .xlsx');
      }
    } catch (e) {
      toast('Не удалось прочитать файл. Проверьте формат.');
    }
  };

  // ---- события ----
  el('[data-zk-parse]')?.addEventListener('click', () => analyze(input.value));
  el('[data-zk-clear]')?.addEventListener('click', () => { input.value = ''; matched = []; unknown = []; resultWrap.hidden = true; if (successEl) successEl.hidden = true; input.focus(); });
  addBtn?.addEventListener('click', addToRequest);
  const fileInput = el('[data-zk-file]');
  fileInput?.addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) handleFile(f); e.target.value = ''; });

  // счётчик заявки в шапке
  const cartCount = el('[data-cart-count]');
  const refreshCount = () => { if (cartCount) cartCount.textContent = readCart().length; };
  refreshCount();
  window.addEventListener('storage', refreshCount);

  window.apexToast = toast; // для collections.js
})();
