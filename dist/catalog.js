const categoryData = {
  drills: {
    title: 'Шуруповёрты',
    description: 'Профессиональный аккумуляторный инструмент для регулярных корпоративных закупок.',
    image: 'assets/catalog-drill-cutout.png',
    variants: [
      ['drill-21-60', 'ДА-21-60 / 21V', 'Дрель-шуруповёрт аккумуляторная', 62, 1, 6490, ['21V', '60 Н·м', '2×2.0 А·ч']],
      ['drill-21-80', 'ДАБ-21-80 / 21V', 'Дрель-шуруповёрт бесщёточная', 34, 2, 8490, ['21V', '80 Н·м', 'Brushless']],
      ['drill-12-35', 'ДА-12-35 / 12V', 'Шуруповёрт компактный', 48, 1, 4590, ['12V', '35 Н·м', '1.2 кг']],
      ['drill-21-impact', 'ДУА-21-70 / 21V', 'Дрель-шуруповёрт ударная', 18, 3, 7990, ['21V', '70 Н·м', 'Ударный режим']]
    ]
  },
  grinders: {
    title: 'УШМ',
    description: 'Аккумуляторные угловые шлифмашины для монтажа, производства и сервисных работ.',
    image: 'assets/catalog-grinder-cutout.png',
    variants: [
      ['grinder-21-125', 'УШМ-21-125 / 21V', 'УШМ аккумуляторная 125 мм', 41, 3, 8490, ['21V', 'Ø125 мм', '8500 об/мин']],
      ['grinder-18-115', 'УШМ-18-115 / 18V', 'УШМ компактная 115 мм', 22, 2, 7290, ['18V', 'Ø115 мм', 'Компактная']],
      ['grinder-125-pro', 'УШМ-125 PRO / 21V', 'УШМ бесщёточная PRO', 16, 3, 10490, ['21V', 'Brushless', 'Плавный пуск']],
      ['grinder-150', 'УШМ-150 / 220V', 'УШМ сетевая 150 мм', 0, 7, 6890, ['220V', 'Ø150 мм', '1400 Вт']]
    ]
  },
  jigsaws: {
    title: 'Электролобзики',
    description: 'Инструмент для точного прямого и фигурного реза на объекте и в мастерской.',
    image: 'assets/catalog-jigsaw-cutout.png',
    variants: [
      ['jigsaw-600', 'Л-600 / 220V', 'Лобзик электрический', 28, 3, 3290, ['600 Вт', '65 мм', 'Маятниковый ход']],
      ['jigsaw-21', 'ЛА-21 / 21V', 'Лобзик аккумуляторный', 17, 3, 6290, ['21V', '80 мм', 'Подсветка']],
      ['jigsaw-750', 'Л-750 PRO / 220V', 'Лобзик профессиональный', 12, 2, 4890, ['750 Вт', '100 мм', '4 режима']],
      ['jigsaw-compact', 'Л-500 C / 220V', 'Лобзик компактный', 0, 8, 2890, ['500 Вт', '55 мм', '1.7 кг']]
    ]
  },
  'impact-wrenches': {
    title: 'Гайковёрты',
    description: 'Аккумуляторный инструмент для быстрого монтажа и обслуживания резьбовых соединений.',
    image: 'assets/category-impact-wrench-cutout-v2.png',
    variants: [
      ['impact-350', 'ГА-21-350 / 21V', 'Гайковёрт аккумуляторный', 31, 2, 7890, ['21V', '350 Н·м', '1/2″']],
      ['impact-550', 'ГАБ-21-550 / 21V', 'Гайковёрт бесщёточный', 20, 3, 9990, ['21V', '550 Н·м', 'Brushless']],
      ['impact-800', 'ГАБ-21-800 / 21V', 'Гайковёрт усиленный', 9, 3, 12990, ['21V', '800 Н·м', '3 режима']],
      ['impact-compact', 'ГА-12-180 / 12V', 'Гайковёрт компактный', 0, 9, 5890, ['12V', '180 Н·м', '1.1 кг']]
    ]
  },
  'rotary-hammers': {
    title: 'Перфораторы',
    description: 'Инструмент для бурения и демонтажных работ на строительных и производственных объектах.',
    image: 'assets/category-rotary-hammer-cutout-v2.png',
    variants: [
      ['hammer-21', 'ПА-21-24 / 21V', 'Перфоратор аккумуляторный', 26, 2, 9490, ['21V', '2.4 Дж', 'SDS-Plus']],
      ['hammer-26', 'П-900-26 / 220V', 'Перфоратор сетевой', 43, 1, 7490, ['900 Вт', '3.0 Дж', 'SDS-Plus']],
      ['hammer-pro', 'ПАБ-21-28 PRO', 'Перфоратор бесщёточный', 14, 3, 13490, ['21V', '3.2 Дж', 'Brushless']],
      ['hammer-max', 'П-1500 MAX / 220V', 'Перфоратор тяжёлый', 0, 10, 15990, ['1500 Вт', '8 Дж', 'SDS-Max']]
    ]
  },
  'heat-guns': {
    title: 'Технические фены',
    description: 'Оборудование для нагрева, формования, удаления покрытий и сервисных работ.',
    image: 'assets/category-heat-gun-cutout-v2.png',
    variants: [
      ['heat-2000', 'ФТ-2000 / 220V', 'Фен технический', 54, 1, 2990, ['2000 Вт', '600 °C', '2 режима']],
      ['heat-display', 'ФТ-2200 LCD / 220V', 'Фен с цифровым дисплеем', 19, 2, 4590, ['2200 Вт', 'LCD', 'Термостат']],
      ['heat-21', 'ФТА-21 / 21V', 'Фен аккумуляторный', 11, 3, 6990, ['21V', '550 °C', 'Мобильный']],
      ['heat-compact', 'ФТ-1600 C / 220V', 'Фен компактный', 0, 7, 2390, ['1600 Вт', '500 °C', '0.7 кг']]
    ]
  },
  batteries: {
    title: 'Аккумуляторы',
    description: 'Единая аккумуляторная платформа 21V для совместимого инструмента APEXWOLT.',
    image: 'assets/category-battery-cutout-v2.png',
    variants: [
      ['battery-20', 'АКБ-21 / 2.0Ah', 'Аккумуляторная батарея 2.0 А·ч', 86, 1, 2990, ['21V', '2.0 А·ч', 'Li-Ion']],
      ['battery-40', 'АКБ-21 / 4.0Ah', 'Аккумуляторная батарея 4.0 А·ч', 67, 1, 4290, ['21V', '4.0 А·ч', 'Li-Ion']],
      ['battery-60', 'АКБ-21 / 6.0Ah', 'Аккумуляторная батарея 6.0 А·ч', 25, 2, 5790, ['21V', '6.0 А·ч', 'Индикатор']],
      ['battery-kit', 'ЗУ-21 FAST', 'Быстрое зарядное устройство', 38, 1, 2490, ['21V', '4 А', 'Активное охлаждение']]
    ]
  }
};

const products = Object.entries(categoryData).flatMap(([category, data]) => data.variants.map((variant, index) => ({
  id: variant[0],
  category,
  code: variant[1],
  name: variant[2],
  stock: variant[3],
  lead: variant[4],
  price: variant[5],
  specs: variant[6],
  image: data.image,
  description: index % 2 ? 'Комплектация для регулярных поставок, сервисных работ и оснащения бригад.' : 'Профессиональная модель для интенсивной эксплуатации и корпоративных закупок.'
})));

const params = new URLSearchParams(window.location.search);
const category = categoryData[params.get('category')] ? params.get('category') : 'drills';
const config = categoryData[category];
const grid = document.querySelector('[data-products]');
const search = document.querySelector('[data-product-search]');
const sort = document.querySelector('[data-product-sort]');
const empty = document.querySelector('[data-empty-state]');
const count = document.querySelector('[data-results-count]');
const toast = document.querySelector('[data-toast]');
let availability = 'all';
let view = localStorage.getItem('apexwolt-catalog-view') || 'list';

document.title = `${config.title} — APEXWOLT`;
document.querySelector('[data-page-title]').textContent = config.title;
document.querySelector('[data-page-description]').textContent = config.description;
document.querySelector(`[data-category-tab="${category}"]`)?.classList.add('is-active');

const iconHeart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>';
const iconCompare = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v16h4M16 4h4v16h-4M12 7v10M9.5 9.5 12 7l2.5 2.5M9.5 14.5 12 17l2.5-2.5"/></svg>';
const formatMoney = value => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;

const showToast = message => {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
};

const renderCommercialCell = (label, value, isPrivate = true) => isPrivate
  ? `<div class="commercial-cell is-private" tabindex="0" role="button" data-auth-gate aria-label="${label}. Откроется после авторизации"><small>${label}</small><strong>${value}</strong></div>`
  : `<div class="commercial-cell is-public"><small>${label}</small><strong>${value}</strong></div>`;

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
    ? cart.map((name, index) => `<div class="request-item"><span>${name}</span><button type="button" data-remove-item="${index}" aria-label="Удалить">×</button></div>`).join('')
    : '<p>Добавьте позиции из каталога.</p>';
  requestItems.querySelectorAll('[data-remove-item]').forEach(button => button.addEventListener('click', () => {
    cart.splice(Number(button.dataset.removeItem), 1);
    renderCart();
  }));
};

const bindCardActions = () => {
  document.querySelectorAll('[data-add-product]').forEach(button => button.addEventListener('click', () => {
    cart.push(button.dataset.addProduct);
    renderCart();
    showToast('Позиция добавлена в заявку');
  }));
  document.querySelectorAll('[data-auth-gate]').forEach(item => item.addEventListener('click', () => {
    showToast('Коммерческие условия откроются после авторизации компании');
  }));
};

const renderProducts = () => {
  const query = (search.value || '').trim().toLowerCase();
  let matches = products.filter(product => product.category === category && `${product.name} ${product.code} ${product.specs.join(' ')}`.toLowerCase().includes(query));
  matches = matches.filter(product => availability === 'all' || (availability === 'stock' && product.stock > 0) || (availability === 'fast' && product.lead <= 3));
  matches.sort((a, b) => sort.value === 'price-low' ? a.price - b.price : sort.value === 'price-high' ? b.price - a.price : sort.value === 'lead' ? a.lead - b.lead : b.stock - a.stock);
  count.textContent = matches.length;
  empty.hidden = matches.length > 0;
  grid.className = `products view-${view}`;
  grid.innerHTML = matches.map(product => {
    const status = product.stock ? `В наличии: ${product.stock} шт.` : `Поставка: ${product.lead} дней`;
    const statusClass = product.stock ? '' : ' is-order';
    return `<article class="product-card">
      <div class="product-actions"><button class="product-action" type="button" data-favorite-product data-product-id="${product.id}" data-product-name="${product.name}" data-product-meta="${product.code}" data-product-url="${window.location.href}" data-product-price="${product.price}" data-product-stock="${product.stock}" data-product-lead="${product.lead}" aria-label="Сохранить позицию">${iconHeart}</button><button class="product-action" type="button" data-compare-product data-product-id="${product.id}" data-product-name="${product.name}" data-product-meta="${product.code}" data-product-url="${window.location.href}" data-product-price="${product.price}" data-product-stock="${product.stock}" data-product-lead="${product.lead}" aria-label="Добавить к сравнению">${iconCompare}</button></div>
      <div class="product-art"><img src="${product.image}" alt="${product.name} APEXWOLT" loading="lazy" /></div>
      <div class="product-info"><p class="product-code">Артикул: <strong>${product.code.split(' / ')[0]}</strong>${product.code.includes(' / ') ? `<span>${product.code.split(' / ').slice(1).join(' / ')}</span>` : ''}</p><h2>${product.name}</h2><p class="product-description">${product.description}</p><ul class="product-specs">${product.specs.map(spec => `<li>${spec}</li>`).join('')}</ul></div>
      <div class="product-commerce"><div class="stock-line${statusClass}"><b><i></i>${status}</b><span>${product.lead <= 3 ? 'Отгрузка 1–3 дня' : 'Под заказ'}</span></div><div class="commercial-grid">${renderCommercialCell('Цена партнёра', formatMoney(product.price))}${renderCommercialCell('РРЦ', formatMoney(Math.round(product.price * 1.36 / 10) * 10), false)}${renderCommercialCell('Маржинальность', 'до 31%')}${renderCommercialCell('Средняя цена на МП', formatMoney(Math.round(product.price * 1.42 / 10) * 10), false)}</div><div class="product-cta"><small>Количество и условия уточнит закреплённый менеджер.</small><button type="button" data-add-product="${product.name}">Добавить в заявку</button></div></div>
    </article>`;
  }).join('');
  window.dispatchEvent(new CustomEvent('catalog:rendered'));
  bindCardActions();
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

updateViewControls();
renderProducts();
renderCart();
