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
let view = localStorage.getItem('apexwolt-catalog-view') || 'list';

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
  requestItems.innerHTML = cart.length
    ? cart.map((name, index) => `<div class="request-item"><span>${escapeHtml(name)}</span><button type="button" data-remove-item="${index}" aria-label="Удалить">×</button></div>`).join('')
    : '<p>Добавьте позиции из каталога.</p>';
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
};

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
    return `<article class="product-card" data-card-id="${escapeHtml(product.id)}">
      <div class="product-actions"><button class="product-action" type="button" data-favorite-product ${dataAttrs} aria-label="Сохранить позицию">${iconHeart}</button><button class="product-action" type="button" data-compare-product ${dataAttrs} aria-label="Добавить к сравнению">${iconCompare}</button></div>
      <div class="product-art">${product.brand ? `<span class="product-brand">${escapeHtml(product.brand)}</span>` : ''}<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" /></div>
      <div class="product-info"><p class="product-code">Артикул: <strong>${escapeHtml(product.code)}</strong></p><h2>${escapeHtml(product.name)}</h2><p class="product-description">${escapeHtml(product.description)}</p><ul class="product-specs">${product.specs.map(spec => `<li>${escapeHtml(spec)}</li>`).join('')}</ul></div>
      <div class="product-commerce"><div class="stock-line${statusClass}"><b><i></i>${status}</b><span>${statusDetail}</span></div><div class="commercial-grid">${renderCommercialCell('Цена партнёра', 'После авторизации')}${renderCommercialCell('МРЦ', formatMoney(product.price), false)}${renderCommercialCell('Маржинальность', 'После авторизации')}${renderCommercialCell('Средняя цена на МП', product.mp ? formatMoney(product.mp) : 'Нет данных', false)}</div><div class="product-cta"><small>Количество и условия уточнит закреплённый менеджер.</small><button type="button" data-add-product="${escapeHtml(product.name)}" data-add-code="${escapeHtml(product.code)}" data-add-brand="${escapeHtml(product.brand)}" data-add-mrc="${product.price ?? ''}" data-add-image="${escapeHtml(product.image)}">Добавить в заявку</button></div></div>
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

// Боковое меню каталога: все направления; у текущего раскрыты категории.
const buildSidebar = () => {
  const host = document.querySelector('[data-catalog-sidebar]');
  if (!host) return;
  const tree = Object.entries(sectionData).map(([skey, sec]) => {
    const isCur = skey === activeSection;
    const cats = sec.categories.filter(key => categoryData[key]);
    let sub = '';
    if (isCur && cats.length > 1) {
      sub = '<ul class="sidebar-cats">' + cats.map(key =>
        `<li><a href="catalog?category=${key}" class="${key === activeCategory ? 'is-active' : ''}"><span>${escapeHtml(categoryData[key].title)}</span><i>${categoryData[key].variants.length}</i></a></li>`
      ).join('') + '</ul>';
    }
    const dirActive = isCur && !activeCategory ? ' is-active' : '';
    return `<li class="${isCur ? 'is-current' : ''}"><a class="sidebar-dir${dirActive}" href="catalog?section=${skey}">${escapeHtml(sec.title)}</a>${sub}</li>`;
  }).join('');
  host.innerHTML = '<p class="sidebar-title">Каталог</p><ul class="sidebar-tree">' + tree + '</ul>';
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
