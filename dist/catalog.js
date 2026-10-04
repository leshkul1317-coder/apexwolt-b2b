/* Данные каталога вынесены в catalog.data.js (categoryData, sectionData) — подключается ПЕРЕД этим файлом. Генерация: catalog-tools/build_catalog.py --write, затем cp catalog-tools/catalog.data.js dist/catalog.data.js */

const sectionByCategory = {};
Object.entries(sectionData).forEach(([sectionKey, section]) => {
  section.categories.forEach(categoryKey => { sectionByCategory[categoryKey] = sectionKey; });
});

const products = Object.entries(categoryData).flatMap(([category, data]) => data.variants.map(variant => ({
  id: variant[0],
  category,
  code: variant[1],
  name: variant[2],
  stock: variant[3],
  lead: variant[4],
  price: variant[5],
  specs: variant[6],
  brand: variant[7] || '',
  partner: variant[8] ?? null,
  mp: variant[9] ?? null,
  description: variant[10] || '',
  image: variant[11] || data.image,
  eta: variant[12] || ''
})));

const params = new URLSearchParams(window.location.search);
const requestedCategory = params.get('category');
const requestedSection = params.get('section');

// Область видимости: либо одна детальная категория (прямая ссылка ?category=),
// либо целое направление (?section=), либо первое направление по умолчанию.
let activeSection = null;
let activeCategory = null;
let scopeCategories = [];
let pageTitle = '';
let pageDescription = '';

if (requestedCategory && categoryData[requestedCategory]) {
  activeCategory = requestedCategory;
  activeSection = sectionByCategory[requestedCategory] || null;
  scopeCategories = [requestedCategory];
  pageTitle = categoryData[requestedCategory].title;
  pageDescription = categoryData[requestedCategory].description || (sectionByCategory[requestedCategory] && sectionData[sectionByCategory[requestedCategory]] ? sectionData[sectionByCategory[requestedCategory]].description : '');
} else if (requestedSection && sectionData[requestedSection]) {
  activeSection = requestedSection;
  scopeCategories = sectionData[requestedSection].categories.filter(key => categoryData[key]);
  pageTitle = sectionData[requestedSection].title;
  pageDescription = sectionData[requestedSection].description;
} else {
  activeSection = Object.keys(sectionData)[0];
  scopeCategories = sectionData[activeSection].categories.filter(key => categoryData[key]);
  pageTitle = sectionData[activeSection].title;
  pageDescription = sectionData[activeSection].description;
}
const scopeSet = new Set(scopeCategories);

const grid = document.querySelector('[data-products]');
const search = document.querySelector('[data-product-search]');
const sort = document.querySelector('[data-product-sort]');
const empty = document.querySelector('[data-empty-state]');
const count = document.querySelector('[data-results-count]');
const toast = document.querySelector('[data-toast]');
const switcherEl = document.querySelector('[data-category-switcher]');
let availability = 'all';
let activeBrand = 'all';
// На мобильном по умолчанию — плитка (привычно по маркетплейсам), на десктопе — список.
// Явный выбор пользователя (localStorage) имеет приоритет.
let view = localStorage.getItem('apexwolt-catalog-view') || (window.matchMedia('(max-width: 768px)').matches ? 'grid' : 'list');

document.title = `${pageTitle} — APEXWOLT`;
document.querySelector('[data-page-title]').textContent = pageTitle;
document.querySelector('[data-page-description]').textContent = pageDescription;

const iconHeart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>';
const iconCompare = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v16h4M16 4h4v16h-4M12 7v10M9.5 9.5 12 7l2.5 2.5M9.5 14.5 12 17l2.5-2.5"/></svg>';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const formatMoney = value => Number(value) > 0 ? `${new Intl.NumberFormat('ru-RU').format(value)} ₽` : 'Цена по запросу';

const showToast = message => {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
};

const renderCommercialCell = (label, value, isPrivate = true) => isPrivate
  ? `<div class="commercial-cell is-private" tabindex="0" role="button" data-auth-gate aria-label="${escapeHtml(label)}. Откроется после авторизации"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`
  : `<div class="commercial-cell is-public"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`;

const readCart = () => {
  try { return JSON.parse(localStorage.getItem('apexwolt-cart') || '[]'); }
  catch { return []; }
};

let cart = readCart();
const cartDrawer = document.querySelector('[data-cart-drawer]');
const cartBackdrop = document.querySelector('.drawer-backdrop');
const requestItems = document.querySelector('[data-request-items]');

const renderCart = () => {
  localStorage.setItem('apexwolt-cart', JSON.stringify(cart));
  document.querySelector('[data-cart-count]').textContent = cart.length;
  if (cart.length) {
    requestItems.innerHTML = cart.map((name, index) => `<div class="request-item"><span>${escapeHtml(name)}</span><button type="button" data-remove-item="${index}" aria-label="Удалить">×</button></div>`).join('');
  } else {
    let last = null; try { last = JSON.parse(localStorage.getItem('apexwolt-last-order') || 'null'); } catch { last = null; }
    const n = (last && Array.isArray(last.cart)) ? new Set(last.cart).size : 0;
    requestItems.innerHTML = '<p>Добавьте позиции из каталога.</p>' + (n ? `<button type="button" class="cart-repeat" data-cart-repeat>↺ Повторить последнюю заявку (${n})</button>` : '');
    requestItems.querySelector('[data-cart-repeat]')?.addEventListener('click', () => {
      cart = [...last.cart];
      if (last.meta) { let m; try { m = JSON.parse(localStorage.getItem('apexwolt-cart-meta') || '{}'); } catch { m = {}; } Object.assign(m, last.meta); localStorage.setItem('apexwolt-cart-meta', JSON.stringify(m)); }
      renderCart();
      showToast('Последняя заявка восстановлена');
    });
  }
  requestItems.querySelectorAll('[data-remove-item]').forEach(button => button.addEventListener('click', () => {
    cart.splice(Number(button.dataset.removeItem), 1);
    renderCart();
  }));
};

// Мета-карта корзины (имя → {артикул, бренд, МРЦ}): даёт кабинету цены для подробной заявки,
// не меняя общий формат корзины (массив имён), который использует и главная страница.
// function-декларация (не const): collections.js тоже объявляет writeCartMeta,
// а классические скрипты делят лексическую область — два top-level const = SyntaxError.
function writeCartMeta(name, meta) {
  if (!name || !meta) return;
  let m; try { m = JSON.parse(localStorage.getItem('apexwolt-cart-meta') || '{}'); } catch { m = {}; }
  m[name] = { code: meta.code || '', brand: meta.brand || '', mrc: meta.mrc || '', image: meta.image || '' };
  localStorage.setItem('apexwolt-cart-meta', JSON.stringify(m));
}

const bindCardActions = () => {
  document.querySelectorAll('[data-add-product]').forEach(button => button.addEventListener('click', () => {
    cart.push(button.dataset.addProduct);
    writeCartMeta(button.dataset.addProduct, { code: button.dataset.addCode, brand: button.dataset.addBrand, mrc: button.dataset.addMrc, image: button.dataset.addImage });
    renderCart();
    showToast('Позиция добавлена в заявку');
  }));
  document.querySelectorAll('[data-auth-gate]').forEach(item => item.addEventListener('click', () => {
    showToast('Коммерческие условия откроются после авторизации компании');
  }));
  document.querySelectorAll('[data-product-open]').forEach(card => {
    if (card.dataset.pvBound) return;
    card.dataset.pvBound = 'true';
    card.addEventListener('click', e => {
      if (e.target.closest('button, a, .product-action, [data-auth-gate]')) return;
      openQuickView(card.dataset.productOpen);
    });
  });
};

// ---- Быстрый просмотр товара (модалка): компактная карточка + детали по клику ----
const pvOverlay = document.querySelector('[data-pv-overlay]');
const pvBody = pvOverlay ? pvOverlay.querySelector('[data-pv-body]') : null;
const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
const NOTIFY_ENDPOINT = window.APEXWOLT_NOTIFY_ENDPOINT || (isLocalHost ? 'http://localhost:8787/notify' : '/api/notify');

const openQuickView = id => {
  const p = products.find(x => String(x.id) === String(id));
  if (!p || !pvBody) return;
  const status = p.stock ? 'В наличии' : 'В пути';
  const shipTerm = p.lead ? `отгрузка от ${p.lead} дн.` : '';
  const statusDetail = p.stock
    ? (shipTerm ? shipTerm.charAt(0).toUpperCase() + shipTerm.slice(1) : 'Доступно к заявке')
    : (p.eta ? `Ожидается ${p.eta}${shipTerm ? ' · ' + shipTerm : ''}` : 'Срок уточнит менеджер');
  const statusClass = p.stock ? '' : ' is-order';
  const focusUrl = `${window.location.pathname}${window.location.search}${window.location.search ? '&' : '?'}focus=${encodeURIComponent(p.id)}`;
  const dataAttrs = `data-product-id="${escapeHtml(p.id)}" data-product-name="${escapeHtml(p.name)}" data-product-meta="${escapeHtml(p.code)}" data-product-url="${escapeHtml(focusUrl)}" data-product-price="${p.price}" data-product-stock="${p.stock}" data-product-lead="${p.lead}" data-product-brand="${escapeHtml(p.brand)}" data-product-image="${escapeHtml(p.image)}" data-product-mp="${p.mp ?? ''}" data-product-desc="${escapeHtml(p.description)}" data-product-specs="${escapeHtml(JSON.stringify(p.specs || []))}"`;
  pvBody.innerHTML = `
    <div class="pv-media">${p.brand ? `<span class="product-brand">${escapeHtml(p.brand)}</span>` : ''}<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" /></div>
    <div class="pv-main">
      <div class="pv-actions-top"><button class="product-action" type="button" data-favorite-product ${dataAttrs} aria-label="Сохранить позицию">${iconHeart}</button><button class="product-action" type="button" data-compare-product ${dataAttrs} aria-label="Добавить к сравнению">${iconCompare}</button></div>
      <p class="product-code">Артикул: <strong>${escapeHtml(p.code)}</strong></p>
      <h2>${escapeHtml(p.name)}</h2>
      <div class="stock-line${statusClass}"><b><i></i>${status}</b><span>${statusDetail}</span></div>
      <div class="commercial-grid">${renderCommercialCell('Цена партнёра', 'После авторизации')}${renderCommercialCell('МРЦ', formatMoney(p.price), false)}${renderCommercialCell('Маржинальность', 'После авторизации')}${renderCommercialCell('Средняя цена на МП', p.mp ? formatMoney(p.mp) : 'Нет данных', false)}</div>
      ${p.description ? `<p class="pv-desc">${escapeHtml(p.description)}</p>` : ''}
      ${(p.specs && p.specs.length) ? `<div class="pv-specs-wrap"><p class="pv-specs-title">Характеристики</p><ul class="pv-specs">${p.specs.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>` : ''}
      <div class="product-cta"><button type="button" data-add-product="${escapeHtml(p.name)}" data-add-code="${escapeHtml(p.code)}" data-add-brand="${escapeHtml(p.brand)}" data-add-mrc="${p.price ?? ''}" data-add-image="${escapeHtml(p.image)}">Добавить в заявку</button></div>
      ${!p.stock ? `<div class="pv-notify" data-pv-notify>
        <button type="button" class="pv-notify-trigger" data-pv-notify-trigger><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>Сообщить о поступлении</button>
        <form class="pv-notify-form" data-pv-notify-form hidden><input type="email" name="email" inputmode="email" placeholder="Корпоративная почта" required aria-label="Email для уведомления" /><button type="submit">Подписаться</button></form>
        <p class="pv-notify-msg" data-pv-notify-msg hidden></p>
      </div>` : ''}
    </div>`;
  pvBody.querySelector('[data-add-product]')?.addEventListener('click', e => {
    const b = e.currentTarget;
    cart.push(b.dataset.addProduct);
    writeCartMeta(b.dataset.addProduct, { code: b.dataset.addCode, brand: b.dataset.addBrand, mrc: b.dataset.addMrc, image: b.dataset.addImage });
    renderCart();
    showToast('Позиция добавлена в заявку');
  });
  pvBody.querySelectorAll('[data-auth-gate]').forEach(el => el.addEventListener('click', () => showToast('Коммерческие условия откроются после авторизации компании')));
  // подписка «сообщить о поступлении» (для товаров «в пути»)
  const notifyTrigger = pvBody.querySelector('[data-pv-notify-trigger]');
  const notifyForm = pvBody.querySelector('[data-pv-notify-form]');
  const notifyMsg = pvBody.querySelector('[data-pv-notify-msg]');
  if (notifyTrigger && notifyForm) {
    notifyTrigger.addEventListener('click', () => { notifyForm.hidden = false; notifyTrigger.hidden = true; notifyForm.querySelector('input')?.focus(); });
    notifyForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = notifyForm.querySelector('input').value.trim();
      const btn = notifyForm.querySelector('button');
      const prev = btn.textContent; btn.disabled = true; btn.textContent = '…';
      try {
        const res = await fetch(NOTIFY_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, product: { name: p.name, code: p.code }, meta: { source: 'catalog' } }) });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          notifyForm.hidden = true;
          notifyMsg.hidden = false; notifyMsg.className = 'pv-notify-msg is-ok';
          notifyMsg.textContent = 'Готово — сообщим на почту, когда товар поступит.';
        } else { btn.disabled = false; btn.textContent = prev; notifyMsg.hidden = false; notifyMsg.className = 'pv-notify-msg is-err'; notifyMsg.textContent = data.error || 'Не удалось подписаться. Попробуйте позже.'; }
      } catch { btn.disabled = false; btn.textContent = prev; notifyMsg.hidden = false; notifyMsg.className = 'pv-notify-msg is-err'; notifyMsg.textContent = 'Сервер недоступен. Попробуйте позже.'; }
    });
  }
  window.dispatchEvent(new CustomEvent('catalog:rendered')); // привязать избранное/сравнение в модалке (collections.js, идемпотентно)
  pvBody.scrollTop = 0;
  pvOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => pvOverlay.classList.add('is-open'));
};

const closeQuickView = () => {
  if (!pvOverlay) return;
  pvOverlay.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => { pvOverlay.hidden = true; }, 220);
};

if (pvOverlay) {
  pvOverlay.querySelectorAll('[data-pv-close]').forEach(b => b.addEventListener('click', closeQuickView));
  pvOverlay.addEventListener('click', e => { if (e.target === pvOverlay) closeQuickView(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pvOverlay.hidden) closeQuickView(); });
}

const renderProducts = () => {
  const query = (search.value || '').trim().toLowerCase();
  let matches = products.filter(product => scopeSet.has(product.category) && (activeBrand === 'all' || product.brand === activeBrand) && `${product.name} ${product.code} ${product.specs.join(' ')}`.toLowerCase().includes(query));
  matches = matches.filter(product => availability === 'all' || (availability === 'stock' && product.stock > 0) || (availability === 'fast' && (product.stock > 0 || (product.lead > 0 && product.lead <= 3))));
  matches.sort((a, b) => sort.value === 'price-low' ? a.price - b.price : sort.value === 'price-high' ? b.price - a.price : sort.value === 'lead' ? a.lead - b.lead : b.stock - a.stock);
  count.textContent = matches.length;
  empty.hidden = matches.length > 0;
  grid.className = `products view-${view}`;
  grid.innerHTML = matches.map(product => {
    const status = product.stock ? 'В наличии' : 'В пути';
    const shipTerm = product.lead ? `отгрузка от ${product.lead} дн.` : '';
    const statusDetail = product.stock
      ? (shipTerm ? shipTerm.charAt(0).toUpperCase() + shipTerm.slice(1) : 'Доступно к заявке')
      : (product.eta ? `Ожидается ${product.eta}${shipTerm ? ' · ' + shipTerm : ''}` : 'Срок уточнит менеджер');
    const statusClass = product.stock ? '' : ' is-order';
    const focusUrl = `${window.location.pathname}${window.location.search}${window.location.search ? '&' : '?'}focus=${encodeURIComponent(product.id)}`;
    const dataAttrs = `data-product-id="${escapeHtml(product.id)}" data-product-name="${escapeHtml(product.name)}" data-product-meta="${escapeHtml(product.code)}" data-product-url="${escapeHtml(focusUrl)}" data-product-price="${product.price}" data-product-stock="${product.stock}" data-product-lead="${product.lead}" data-product-brand="${escapeHtml(product.brand)}" data-product-image="${escapeHtml(product.image)}" data-product-mp="${product.mp ?? ''}" data-product-desc="${escapeHtml(product.description)}" data-product-specs="${escapeHtml(JSON.stringify(product.specs || []))}"`;
    const chipVal = s => { const i = String(s).indexOf(':'); const v = (i >= 0 ? String(s).slice(i + 1) : String(s)).trim(); return v.length > 24 ? v.slice(0, 23) + '…' : v; };
    const chips = (product.specs || []).slice(0, 3).map(s => `<li>${escapeHtml(chipVal(s))}</li>`).join('');
    return `<article class="product-card" data-card-id="${escapeHtml(product.id)}" data-product-open="${escapeHtml(product.id)}">
      <div class="product-actions"><button class="product-action" type="button" data-favorite-product ${dataAttrs} aria-label="Сохранить позицию">${iconHeart}</button><button class="product-action" type="button" data-compare-product ${dataAttrs} aria-label="Добавить к сравнению">${iconCompare}</button></div>
      <div class="product-art">${product.brand ? `<span class="product-brand">${escapeHtml(product.brand)}</span>` : ''}<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" /></div>
      <div class="product-info"><p class="product-code">Артикул: <strong>${escapeHtml(product.code)}</strong></p><h2>${escapeHtml(product.name)}</h2>${chips ? `<ul class="product-chips">${chips}</ul>` : ''}<span class="product-more">Подробнее о товаре →</span></div>
      <div class="product-commerce"><div class="stock-line${statusClass}"><b><i></i>${status}</b><span>${statusDetail}</span></div><div class="product-price"><small>МРЦ</small><strong>${formatMoney(product.price)}</strong><em>Цена партнёра — после авторизации</em></div><div class="product-cta"><button type="button" data-add-product="${escapeHtml(product.name)}" data-add-code="${escapeHtml(product.code)}" data-add-brand="${escapeHtml(product.brand)}" data-add-mrc="${product.price ?? ''}" data-add-image="${escapeHtml(product.image)}">Добавить в заявку</button></div></div>
    </article>`;
  }).join('');
  window.dispatchEvent(new CustomEvent('catalog:rendered'));
  bindCardActions();
};

// Переключатель каталога: «Все позиции» направления + его детальные категории.
const buildSwitcher = () => {
  if (!switcherEl) return;
  if (!activeSection || !sectionData[activeSection]) { switcherEl.innerHTML = ''; return; }
  const section = sectionData[activeSection];
  const children = section.categories.filter(key => categoryData[key]);
  const parts = [];
  if (children.length > 1) {
    parts.push(`<a href="catalog?section=${activeSection}" class="${!activeCategory ? 'is-active' : ''}">Все позиции</a>`);
    children.forEach(key => {
      parts.push(`<a href="catalog?category=${key}" data-category-tab="${key}" class="${activeCategory === key ? 'is-active' : ''}">${escapeHtml(categoryData[key].title)}</a>`);
    });
  } else {
    parts.push(`<a href="catalog?section=${activeSection}" class="is-active">${escapeHtml(section.title)}</a>`);
  }
  switcherEl.innerHTML = parts.join('');
};

const updateViewControls = () => {
  document.querySelectorAll('[data-catalog-view]').forEach(button => button.classList.toggle('is-active', button.dataset.catalogView === view));
};

search.addEventListener('input', renderProducts);
sort.addEventListener('change', renderProducts);
document.querySelectorAll('[data-availability]').forEach(button => button.addEventListener('click', () => {
  availability = button.dataset.availability;
  document.querySelectorAll('[data-availability]').forEach(item => item.classList.toggle('is-active', item === button));
  renderProducts();
}));
document.querySelectorAll('[data-catalog-view]').forEach(button => button.addEventListener('click', () => {
  view = button.dataset.catalogView;
  localStorage.setItem('apexwolt-catalog-view', view);
  updateViewControls();
  renderProducts();
}));

const setCart = open => {
  cartDrawer.classList.toggle('is-open', open);
  cartBackdrop.classList.toggle('is-open', open);
  cartDrawer.setAttribute('aria-hidden', String(!open));
};

document.querySelector('[data-cart-open]').addEventListener('click', () => setCart(true));
document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', () => setCart(false)));
document.querySelector('.price-access-note')?.addEventListener('click', () => showToast('Авторизация компании будет подключена на следующем этапе'));

// Фильтр по бренду: показываем чипы только если в текущем разделе больше одного бренда.
const buildBrandFilter = () => {
  const host = document.querySelector('[data-brand-filter]');
  if (!host) return;
  const brands = [...new Set(products.filter(p => scopeSet.has(p.category)).map(p => p.brand).filter(Boolean))].sort();
  if (brands.length < 2) { host.hidden = true; host.innerHTML = ''; return; }
  host.hidden = false;
  host.innerHTML = [`<button class="tool-chip is-active" type="button" data-brand="all">Все бренды</button>`]
    .concat(brands.map(b => `<button class="tool-chip" type="button" data-brand="${escapeHtml(b)}">${escapeHtml(b)}</button>`))
    .join('');
  host.querySelectorAll('[data-brand]').forEach(button => button.addEventListener('click', () => {
    activeBrand = button.dataset.brand;
    host.querySelectorAll('[data-brand]').forEach(item => item.classList.toggle('is-active', item === button));
    renderProducts();
  }));
};

// Хлебные крошки: Главная › Направление › Категория
const buildBreadcrumbs = () => {
  const host = document.querySelector('[data-breadcrumbs]');
  if (!host) return;
  const parts = ['<a href="index.html">Главная</a>'];
  if (activeSection && sectionData[activeSection]) {
    const label = escapeHtml(sectionData[activeSection].title);
    parts.push(activeCategory ? `<a href="catalog?section=${activeSection}">${label}</a>` : `<span aria-current="page">${label}</span>`);
  }
  if (activeCategory && categoryData[activeCategory]) {
    parts.push(`<span aria-current="page">${escapeHtml(categoryData[activeCategory].title)}</span>`);
  }
  host.innerHTML = parts.join('<i aria-hidden="true">›</i>');
};

// Боковое меню каталога — живой аккордеон: клик по направлению раскрывает его
// категории на месте (без перезагрузки), открыто одно направление за раз,
// текущее раскрыто. Выбор категории/«Все товары» — обычная навигация.
const chevronSvg = '<svg class="sidebar-chevron" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
const buildSidebar = () => {
  const host = document.querySelector('[data-catalog-sidebar]');
  if (!host) return;
  const tree = Object.entries(sectionData).map(([skey, sec]) => {
    const isCur = skey === activeSection;
    const cats = sec.categories.filter(key => categoryData[key]);
    // направление без подкатегорий (или с одной) — просто ссылка
    if (cats.length <= 1) {
      const href = cats.length === 1 ? `catalog?category=${cats[0]}` : `catalog?section=${skey}`;
      const act = isCur ? ' is-active' : '';
      return `<li class="sidebar-node is-leaf"><a class="sidebar-dir${act}" href="${href}"><span>${escapeHtml(sec.title)}</span></a></li>`;
    }
    const subItems = `<li><a class="sidebar-all${isCur && !activeCategory ? ' is-active' : ''}" href="catalog?section=${skey}"><span>Все товары направления</span></a></li>` +
      cats.map(key => `<li><a href="catalog?category=${key}" class="${key === activeCategory ? 'is-active' : ''}"><span>${escapeHtml(categoryData[key].title)}</span><i>${categoryData[key].variants.length}</i></a></li>`).join('');
    return `<li class="sidebar-node${isCur ? ' is-open' : ''}">
      <button type="button" class="sidebar-dir${isCur ? ' is-current' : ''}" data-sidebar-toggle aria-expanded="${isCur ? 'true' : 'false'}"><span>${escapeHtml(sec.title)}</span>${chevronSvg}</button>
      <div class="sidebar-sub"><div class="sidebar-sub-inner"><ul class="sidebar-cats">${subItems}</ul></div></div>
    </li>`;
  }).join('');
  host.innerHTML = '<p class="sidebar-title">Каталог</p><ul class="sidebar-tree">' + tree + '</ul>';
  host.querySelectorAll('[data-sidebar-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const li = btn.closest('.sidebar-node');
    const willOpen = !li.classList.contains('is-open');
    host.querySelectorAll('.sidebar-node.is-open').forEach(open => {
      if (open !== li) { open.classList.remove('is-open'); open.querySelector('[data-sidebar-toggle]')?.setAttribute('aria-expanded', 'false'); }
    });
    li.classList.toggle('is-open', willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));
  }));
};

buildSwitcher();
buildSidebar();
buildBreadcrumbs();
buildBrandFilter();
updateViewControls();
renderProducts();
renderCart();

// Хуки для collections.js (списки закупки и сравнение)
window.apexToast = showToast;
window.apexAddToCart = (name, meta) => { cart.push(name); if (meta) writeCartMeta(name, meta); renderCart(); showToast('Позиция добавлена в заявку'); };

// Подсветка конкретного товара при переходе из списка закупки (?focus=ID)
const focusProductFromUrl = () => {
  const id = params.get('focus');
  if (!id) return;
  const card = grid.querySelector(`[data-card-id="${(window.CSS && CSS.escape) ? CSS.escape(id) : id}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('is-focused');
  window.setTimeout(() => card.classList.remove('is-focused'), 2600);
};
focusProductFromUrl();

// Восстановление состава заявки из КП по QR-коду (?order=артикул*кол-во;артикул*кол-во)
const restoreOrderFromUrl = () => {
  const raw = params.get('order');
  if (!raw) return;
  const byCode = new Map(products.map(p => [p.code, p]));
  let added = 0;
  raw.split(';').forEach(part => {
    const [code, qtyRaw] = part.split('*');
    const p = byCode.get((code || '').trim());
    if (!p) return;
    const qty = Math.max(1, Math.min(999, parseInt(qtyRaw, 10) || 1));
    for (let i = 0; i < qty; i++) cart.push(p.name);
    writeCartMeta(p.name, { code: p.code, brand: p.brand, mrc: p.price, image: p.image });
    added += qty;
  });
  if (added) { renderCart(); showToast(`Восстановлено из КП позиций: ${added}`); setCart(true); }
};
restoreOrderFromUrl();
