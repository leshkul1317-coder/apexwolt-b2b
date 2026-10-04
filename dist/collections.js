const collectionKeys = { favorites: 'apexwolt-favorites', compare: 'apexwolt-compare' };
const collectionCopy = {
  favorites: { eyebrow: 'СОХРАНЁННЫЕ ПОЗИЦИИ', title: 'Списки закупки', empty: 'Сохраняйте позиции, чтобы вернуться к ним или перенести в будущую заявку.' },
  compare: { eyebrow: 'СРАВНЕНИЕ ТОВАРОВ', title: 'Сравнение', empty: 'Добавьте товары и сопоставьте характеристики, наличие и сроки поставки.' }
};
let activeCollection = 'favorites';

// Богатые карточки — только на странице каталога (там есть catalog-page.css и полные данные товара).
const richUI = document.body.classList.contains('catalog-page');
const esc = value => String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = value => Number(value) > 0 ? `${Number(value).toLocaleString('ru-RU')} ₽` : null;
const writeCartMeta = (name, meta) => {
  if (!name || !meta) return;
  let m; try { m = JSON.parse(localStorage.getItem('apexwolt-cart-meta') || '{}'); } catch { m = {}; }
  m[name] = { code: meta.code || '', brand: meta.brand || '', mrc: meta.mrc || '', image: meta.image || '' };
  localStorage.setItem('apexwolt-cart-meta', JSON.stringify(m));
};
const addToRequest = (name, meta) => {
  if (window.apexAddToCart) { window.apexAddToCart(name, meta); return; }
  let c; try { c = JSON.parse(localStorage.getItem('apexwolt-cart') || '[]'); } catch { c = []; }
  c.push(name);
  localStorage.setItem('apexwolt-cart', JSON.stringify(c));
  writeCartMeta(name, meta);
  document.querySelectorAll('[data-cart-count]').forEach(n => n.textContent = c.length);
  if (window.apexToast) window.apexToast('Позиция добавлена в заявку');
};

const readCollection = type => { try { return JSON.parse(localStorage.getItem(collectionKeys[type]) || '[]'); } catch { return []; } };
const writeCollection = (type, items) => localStorage.setItem(collectionKeys[type], JSON.stringify(items));
const collectionDrawer = document.querySelector('[data-collection-drawer]');
const collectionBackdrop = document.querySelector('.collection-backdrop');
const collectionItems = document.querySelector('[data-collection-items]');

const updateCollectionCounts = () => {
  ['favorites', 'compare'].forEach(type => {
    const value = readCollection(type).length;
    document.querySelectorAll(`[data-${type}-count]`).forEach(node => { node.textContent = value; node.hidden = value === 0; });
  });
};

const updateProductActions = () => {
  const favoriteIds = new Set(readCollection('favorites').map(item => item.id));
  const compareIds = new Set(readCollection('compare').map(item => item.id));
  document.querySelectorAll('[data-favorite-product]').forEach(button => button.classList.toggle('is-active', favoriteIds.has(button.dataset.productId)));
  document.querySelectorAll('[data-compare-product]').forEach(button => button.classList.toggle('is-active', compareIds.has(button.dataset.productId)));
};

const renderCollection = () => {
  if (!collectionItems) return;
  const copy = collectionCopy[activeCollection];
  const items = readCollection(activeCollection);
  document.querySelector('[data-collection-eyebrow]').textContent = copy.eyebrow;
  document.querySelector('[data-collection-title]').textContent = copy.title;
  collectionDrawer.classList.toggle('is-compare', activeCollection === 'compare');
  if (!items.length) collectionItems.innerHTML = `<p class="collection-empty">${copy.empty}</p>`;
  else if (activeCollection === 'compare') {
    const cells = field => items.map(item => `<span>${field(item)}</span>`).join('');
    const stockLabel = item => Number(item.stock) > 0 ? 'В наличии' : 'В пути';
    const leadLabel = item => Number(item.stock) > 0 ? 'Доступно к заявке' : 'Уточнит менеджер';
    const rows = [];
    if (richUI) rows.push(`<div class="compare-row compare-row-photo"><span></span>${items.map(item => `<span class="compare-photo">${item.image ? `<img src="${esc(item.image)}" alt="" loading="lazy">` : ''}</span>`).join('')}</div>`);
    rows.push(`<div class="compare-row"><span>Позиция</span>${items.map(item => `<strong>${esc(item.name)}</strong>`).join('')}</div>`);
    if (richUI) rows.push(`<div class="compare-row"><span>Бренд</span>${cells(item => esc(item.brand) || '—')}</div>`);
    rows.push(`<div class="compare-row"><span>Артикул</span>${cells(item => esc(item.meta))}</div>`);
    rows.push(`<div class="compare-row"><span>МРЦ</span>${cells(item => money(item.price) || 'По запросу')}</div>`);
    if (richUI) rows.push(`<div class="compare-row"><span>Средняя цена на МП</span>${cells(item => money(item.mp) || 'Нет данных')}</div>`);
    rows.push(`<div class="compare-row"><span>Наличие</span>${cells(stockLabel)}</div>`);
    rows.push(`<div class="compare-row"><span>Срок</span>${cells(leadLabel)}</div>`);
    if (richUI) {
      rows.push(`<div class="compare-row compare-row-desc"><span>Описание</span>${cells(item => esc(item.desc) || '—')}</div>`);
      rows.push(`<div class="compare-row compare-row-specs"><span>Характеристики</span>${items.map(item => `<span>${(item.specs && item.specs.length) ? '<ul>' + item.specs.map(s => `<li>${esc(s)}</li>`).join('') + '</ul>' : '—'}</span>`).join('')}</div>`);
    }
    rows.push(`<div class="compare-row"><span></span>${items.map(item => `<button class="compare-remove" type="button" data-collection-remove="${item.id}">Убрать ×</button>`).join('')}</div>`);
    collectionItems.innerHTML = `<div class="compare-table" style="--compare-count:${items.length}">${rows.join('')}</div>`;
  } else if (richUI) {
    collectionItems.innerHTML = items.map(item => {
      const inStock = Number(item.stock) > 0;
      const price = money(item.price) || 'Цена по запросу';
      return `<article class="collection-item"><div class="collection-item-row"><span class="collection-thumb">${item.image ? `<img src="${esc(item.image)}" alt="" loading="lazy">` : ''}</span><div class="collection-item-body"><div class="collection-item-head"><b>${esc(item.name)}</b><button class="collection-remove" type="button" data-collection-remove="${item.id}" aria-label="Удалить">×</button></div><p class="collection-meta">${item.brand ? `<span class="collection-badge">${esc(item.brand)}</span>` : ''}Артикул: ${esc(item.meta)}</p><p class="collection-sub"><span>МРЦ ${price}</span><i class="collection-dot ${inStock ? 'is-in' : 'is-out'}">${inStock ? 'В наличии' : 'В пути'}</i></p><div class="collection-item-actions"><button type="button" data-collection-tocart="${item.id}">В заявку</button><a href="${esc(item.url)}">Показать в каталоге</a></div></div></div></article>`;
    }).join('');
  } else collectionItems.innerHTML = items.map(item => `<article class="collection-item"><a href="${esc(item.url)}">${esc(item.name)}</a><small>${esc(item.meta)}</small><button type="button" data-collection-remove="${item.id}" aria-label="Удалить">×</button></article>`).join('');
  collectionItems.querySelectorAll('[data-collection-remove]').forEach(button => button.addEventListener('click', () => { writeCollection(activeCollection, readCollection(activeCollection).filter(item => item.id !== button.dataset.collectionRemove)); renderCollection(); updateCollectionCounts(); updateProductActions(); }));
  collectionItems.querySelectorAll('[data-collection-tocart]').forEach(button => button.addEventListener('click', () => {
    const item = readCollection(activeCollection).find(i => i.id === button.dataset.collectionTocart);
    if (item) addToRequest(item.name, { code: item.meta, brand: item.brand, mrc: item.price, image: item.image });
  }));
};

const toggleCollectionItem = (type, button) => {
  const items = readCollection(type);
  const index = items.findIndex(item => item.id === button.dataset.productId);
  let msg;
  if (index >= 0) {
    items.splice(index, 1);
    msg = type === 'compare' ? 'Убрано из сравнения' : 'Убрано из списков закупки';
  } else if (type === 'compare' && items.length >= 3) {
    msg = 'В сравнении можно держать максимум 3 товара';
  } else {
    let specs = [];
    try { specs = JSON.parse(button.dataset.productSpecs || '[]'); } catch { specs = []; }
    items.push({
      id: button.dataset.productId,
      name: button.dataset.productName,
      meta: button.dataset.productMeta,
      url: button.dataset.productUrl,
      price: button.dataset.productPrice,
      stock: button.dataset.productStock,
      lead: button.dataset.productLead,
      brand: button.dataset.productBrand || '',
      image: button.dataset.productImage || '',
      mp: button.dataset.productMp || '',
      desc: button.dataset.productDesc || '',
      specs
    });
    msg = type === 'compare' ? 'Добавлено к сравнению' : 'Сохранено в списки закупки';
  }
  writeCollection(type, items);
  updateCollectionCounts();
  updateProductActions();
  if (msg && window.apexToast) window.apexToast(msg);
};

const bindCollectionActions = () => {
  document.querySelectorAll('[data-favorite-product]').forEach(button => { if (!button.dataset.collectionBound) { button.dataset.collectionBound = 'true'; button.addEventListener('click', () => toggleCollectionItem('favorites', button)); } });
  document.querySelectorAll('[data-compare-product]').forEach(button => { if (!button.dataset.collectionBound) { button.dataset.collectionBound = 'true'; button.addEventListener('click', () => toggleCollectionItem('compare', button)); } });
  updateProductActions();
};

document.querySelectorAll('[data-collection-open]').forEach(button => button.addEventListener('click', () => { activeCollection = button.dataset.collectionOpen; renderCollection(); collectionDrawer.classList.add('is-open'); collectionBackdrop.classList.add('is-open'); collectionDrawer.setAttribute('aria-hidden', 'false'); }));
document.querySelectorAll('[data-collection-close]').forEach(button => button.addEventListener('click', () => { collectionDrawer.classList.remove('is-open'); collectionBackdrop.classList.remove('is-open'); collectionDrawer.setAttribute('aria-hidden', 'true'); }));
window.addEventListener('catalog:rendered', bindCollectionActions);
bindCollectionActions();
updateCollectionCounts();
