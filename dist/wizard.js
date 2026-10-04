/* APEXWOLT B2B — визард «Подбор инструмента под задачу».
 * Модальное окно на странице каталога: 2–3 вопроса -> подборка моделей из каталога.
 * Данные из catalog.data.js (categoryData). Добавление в заявку через window.apexAddToCart
 * (экспортирует catalog.js). Всё в IIFE, чтобы не конфликтовать с top-level const. */
(() => {
  const overlay = document.querySelector('[data-wiz-overlay]');
  if (!overlay) return;
  const body = overlay.querySelector('[data-wiz-body]');
  const progress = overlay.querySelector('[data-wiz-progress]');
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = v => Number(v) > 0 ? `${Number(v).toLocaleString('ru-RU')} ₽` : 'Цена по запросу';

  // товары по категориям
  const byCat = {};
  try {
    for (const k in categoryData) {
      byCat[k] = (categoryData[k].variants || []).map(v => ({
        id: v[0], code: v[1], name: v[2], stock: v[3], price: v[5], brand: v[7] || '',
        image: v[11] || categoryData[k].image || '', cat: k
      }));
    }
  } catch (e) { /* нет данных */ }

  // иконки задач (единый stroke-стиль)
  const ic = {
    drill: '<path d="M3 8h9v5H6l-1 3H3zM12 9h4l3-2v6l-3-2h-4"/>',
    wrench: '<path d="M14 7a3.5 3.5 0 1 0 3.3 4.6L21 15l-2 2-3.4-3.4A3.5 3.5 0 0 1 10.5 10l2.5.6L14 7z"/>',
    concrete: '<path d="M4 20h10M5 16l6-9M8 18l6-9M12 4l2.5 1.5M11 7l5 3 2-3-5-3z"/>',
    cut: '<circle cx="7" cy="12" r="3.2"/><path d="M9.5 10.5 20 5M9.8 13.2 20 18"/>',
    sand: '<rect x="4" y="5" width="16" height="9" rx="1.5"/><path d="M7 18h10M8 21h8"/>',
    measure: '<path d="M3 7h18v10H3zM7 7v3M11 7v4M15 7v3M19 7v4"/>',
    garden: '<path d="M12 21c0-6 3-10 8-11-1 6-4 9-8 11zM12 21c0-5-2.5-8-7-9 1 5 3 7.5 7 9z"/>',
    energy: '<path d="M13 3 4 14h6l-1 7 9-11h-6z"/>'
  };

  const tasks = [
    { id: 'drill', label: 'Сверление и крепёж', hint: 'Дрели, шуруповёрты, винтовёрты', icon: ic.drill,
      cats: { akk: ['dreli-shurupoverty-akkumulyatornye', 'vintoverty-akkumulyatornye', 'shurupoverty-mnogofunkcionalnye-akkumulyatornye'], set: ['dreli-elektricheskie'] } },
    { id: 'wrench', label: 'Гайки и болты', hint: 'Ударные гайковёрты', icon: ic.wrench,
      cats: { akk: ['gaykoverty-akkumulyatornye'], set: [] } },
    { id: 'concrete', label: 'Бетон и демонтаж', hint: 'Перфораторы, отбойные молотки', icon: ic.concrete,
      cats: { akk: ['perforatory-akkumulyatornye'], set: ['perforatory-setevye', 'otboynye-molotki'] } },
    { id: 'cut', label: 'Резка', hint: 'УШМ, сабельные, дисковые, лобзики', icon: ic.cut,
      cats: { akk: ['ugloshlifovalnye-mashiny-akkumulyatornye', 'pily-sabelnye-akkumulyatornye', 'lobziki-akkumulyatornye'], set: ['ugloshlifovalnye-mashiny-setevye', 'pily-diskovye-setevye', 'lobziki-setevye'] } },
    { id: 'sand', label: 'Шлифовка', hint: 'Эксцентриковые, ленточные, для стен', icon: ic.sand,
      cats: { akk: [], set: ['shlifovalnye-mashiny-ekscentrikovye', 'shlifovalnye-mashiny-lentochnye', 'shlifovalnye-mashiny-dlya-sten'] } },
    { id: 'measure', label: 'Измерения и разметка', hint: 'Лазерные уровни, рулетки', icon: ic.measure,
      cats: { any: ['lazernye-urovni', 'urovni-stroitelnye', 'ruletki-izmeritelnye'] } },
    { id: 'garden', label: 'Сад и территория', hint: 'Снегоуборщики, воздуходувки, пилы', icon: ic.garden,
      cats: { any: ['snegouborschiki-akkumulyatornye', 'vozduhoduvki-akkumulyatornye', 'vozduhoduvki-pylesosy-akkumulyatornye', 'sekatory-akkumulyatornye', 'pily-cepnye-akkumulyatornye'] } },
    { id: 'energy', label: 'Энергия и сварка', hint: 'Генераторы, сварочные аппараты', icon: ic.energy,
      cats: { any: ['generatory-benzinovye', 'svarochnye-apparaty'] } }
  ];

  const powers = [
    { id: 'akk', label: 'Аккумулятор', hint: 'Мобильность, без провода' },
    { id: 'set', label: 'Сеть 220В', hint: 'Максимальная мощность' },
    { id: 'any', label: 'Не важно', hint: 'Покажите оба варианта' }
  ];
  const scales = [
    { id: 'home', label: 'Дом и мелкий ремонт', hint: 'Периодические задачи' },
    { id: 'regular', label: 'Регулярная работа', hint: 'Стройка, бригада, сервис' },
    { id: 'pro', label: 'Производство', hint: 'Ежедневная максимальная нагрузка' }
  ];

  const state = { task: null, power: null, scale: null };
  const needsPower = t => t && t.cats.akk && t.cats.akk.length && t.cats.set && t.cats.set.length;

  const catsForPick = () => {
    const c = state.task.cats;
    if (c.any) return c.any;
    if (state.power === 'akk') return (c.akk && c.akk.length) ? c.akk : (c.set || []);
    if (state.power === 'set') return (c.set && c.set.length) ? c.set : (c.akk || []);
    return [...(c.akk || []), ...(c.set || [])];
  };

  const pickProducts = () => {
    const cats = catsForPick();
    const pool = cats.flatMap(k => byCat[k] || []);
    const dir = state.scale === 'pro' ? -1 : 1; // производство — сначала более мощные (дороже)
    pool.sort((a, b) => (Number(b.stock) - Number(a.stock)) || (Number(a.price) - Number(b.price)) * dir);
    return { cats, picks: pool.slice(0, 4) };
  };

  // --- шаги ---
  const flow = () => {
    const steps = ['task'];
    if (state.task && needsPower(state.task)) steps.push('power');
    if (state.task) steps.push('scale');
    steps.push('result');
    return steps;
  };
  let stepIdx = 0;

  const renderProgress = () => {
    const steps = flow();
    const shown = steps.filter(s => s !== 'result');
    progress.innerHTML = shown.map((s, i) => `<span class="${i < stepIdx ? 'is-done' : ''}${i === stepIdx ? ' is-current' : ''}"></span>`).join('');
  };

  const tile = (o, cls) => `<button class="wiz-tile ${cls}" type="button" data-wiz-pick="${o.id}">
    ${o.icon ? `<span class="wiz-tile-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${o.icon}</svg></span>` : ''}
    <span class="wiz-tile-label">${esc(o.label)}</span>
    <span class="wiz-tile-hint">${esc(o.hint)}</span>
  </button>`;

  const renderStep = () => {
    const steps = flow();
    const step = steps[stepIdx];
    renderProgress();
    if (step === 'task') {
      body.innerHTML = `<div class="wiz-step"><p class="wiz-eyebrow">Шаг 1</p><h2 class="wiz-q">Какую задачу решаете?</h2>
        <div class="wiz-grid wiz-grid-tasks">${tasks.map(t => tile(t, 'is-task')).join('')}</div></div>`;
      bindPicks(id => { state.task = tasks.find(t => t.id === id); state.power = null; state.scale = null; stepIdx++; renderStep(); });
    } else if (step === 'power') {
      body.innerHTML = `<div class="wiz-step">${backBtn()}<p class="wiz-eyebrow">Шаг 2</p><h2 class="wiz-q">Питание инструмента?</h2>
        <div class="wiz-grid wiz-grid-3">${powers.map(p => tile(p, 'is-opt')).join('')}</div></div>`;
      bindPicks(id => { state.power = id; stepIdx++; renderStep(); });
    } else if (step === 'scale') {
      body.innerHTML = `<div class="wiz-step">${backBtn()}<p class="wiz-eyebrow">Шаг ${needsPower(state.task) ? 3 : 2}</p><h2 class="wiz-q">Интенсивность работы?</h2>
        <div class="wiz-grid wiz-grid-3">${scales.map(s => tile(s, 'is-opt')).join('')}</div></div>`;
      bindPicks(id => { state.scale = id; stepIdx++; renderStep(); });
    } else {
      renderResult();
    }
  };

  const backBtn = () => `<button class="wiz-back" type="button" data-wiz-back>← Назад</button>`;
  const bindPicks = cb => {
    body.querySelectorAll('[data-wiz-pick]').forEach(b => b.addEventListener('click', () => cb(b.dataset.wizPick)));
    const bk = body.querySelector('[data-wiz-back]');
    if (bk) bk.addEventListener('click', () => { stepIdx = Math.max(0, stepIdx - 1); renderStep(); });
  };

  const renderResult = () => {
    const { cats, picks } = pickProducts();
    const taskLabel = state.task.label;
    const cond = [state.power && state.power !== 'any' ? (state.power === 'akk' ? 'аккумулятор' : 'сеть 220В') : '', state.scale ? scales.find(s => s.id === state.scale).label.toLowerCase() : ''].filter(Boolean).join(' · ');
    const catLink = cats[0] ? `catalog.html?category=${encodeURIComponent(cats[0])}` : 'catalog.html';
    body.innerHTML = `<div class="wiz-step wiz-result">
      <button class="wiz-back" type="button" data-wiz-back>← Изменить ответы</button>
      <p class="wiz-eyebrow">Готово</p>
      <h2 class="wiz-q">Рекомендуем для задачи «${esc(taskLabel)}»</h2>
      ${cond ? `<p class="wiz-cond">${esc(cond)}</p>` : ''}
      ${picks.length ? `<div class="wiz-cards">${picks.map(p => {
        const inStock = Number(p.stock) > 0;
        return `<article class="wiz-card-item">
          <span class="wiz-card-thumb">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ''}</span>
          <div class="wiz-card-info"><p class="wiz-card-name">${esc(p.name)}</p><p class="wiz-card-sub">${p.brand ? `<span>${esc(p.brand)}</span>` : ''}<i class="wiz-dot ${inStock ? 'is-in' : 'is-out'}">${inStock ? 'В наличии' : 'В пути'}</i></p></div>
          <div class="wiz-card-act"><b>${money(p.price)}</b><button class="wiz-add" type="button" data-wiz-add="${esc(p.id)}">В заявку</button></div>
        </article>`;
      }).join('')}</div>` : `<p class="wiz-empty">По этим условиям подходящих позиций не нашлось. Посмотрите каталог целиком или уточните у менеджера.</p>`}
      <div class="wiz-result-foot">
        <a class="wiz-btn-dark" href="${catLink}">Смотреть все в каталоге →</a>
        <button class="wiz-btn-light" type="button" data-wiz-restart>Подобрать заново</button>
      </div>
    </div>`;
    body.querySelector('[data-wiz-back]')?.addEventListener('click', () => { stepIdx = Math.max(0, stepIdx - 1); renderStep(); });
    body.querySelector('[data-wiz-restart]')?.addEventListener('click', () => { state.task = state.power = state.scale = null; stepIdx = 0; renderStep(); });
    body.querySelectorAll('[data-wiz-add]').forEach(btn => btn.addEventListener('click', () => {
      const p = picks.find(x => String(x.id) === btn.dataset.wizAdd);
      if (!p) return;
      if (window.apexAddToCart) window.apexAddToCart(p.name, { code: p.code, brand: p.brand, mrc: p.price, image: p.image });
      btn.textContent = 'Добавлено ✓'; btn.classList.add('is-added'); btn.disabled = true;
    }));
  };

  // --- открытие/закрытие ---
  const open = () => { state.task = state.power = state.scale = null; stepIdx = 0; renderStep(); overlay.hidden = false; document.body.style.overflow = 'hidden'; overlay.classList.add('is-open'); };
  const close = () => { overlay.classList.remove('is-open'); document.body.style.overflow = ''; setTimeout(() => { overlay.hidden = true; }, 200); };

  document.querySelectorAll('[data-wiz-open]').forEach(b => b.addEventListener('click', open));
  overlay.querySelectorAll('[data-wiz-close]').forEach(b => b.addEventListener('click', close));
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) close(); });
})();
