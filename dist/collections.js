const collectionKeys = { favorites: 'apexwolt-favorites', compare: 'apexwolt-compare' };
const collectionCopy = {
  favorites: { eyebrow: 'СОХРАНЁННЫЕ ПОЗИЦИИ', title: 'Списки закупки', empty: 'Сохраняйте позиции, чтобы вернуться к ним или перенести в будущую заявку.' },
  compare: { eyebrow: 'СРАВНЕНИЕ ТОВАРОВ', title: 'Сравнение', empty: 'Добавьте товары и сопоставьте характеристики, наличие и сроки поставки.' }
};
let activeCollection = 'favorites';

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
    collectionItems.innerHTML = `<div class="compare-table" style="--compare-count:${items.length}"><div class="compare-row"><span>Позиция</span>${items.map(item => `<strong>${item.name}</strong>`).join('')}</div><div class="compare-row"><span>Артикул</span>${cells(item => item.meta)}</div><div class="compare-row"><span>Цена</span>${cells(item => item.price ? `${Number(item.price).toLocaleString('ru-RU')} ₽` : 'По запросу')}</div><div class="compare-row"><span>Наличие</span>${cells(item => Number(item.stock) > 0 ? `${item.stock} шт.` : 'Под заказ')}</div><div class="compare-row"><span>Срок</span>${cells(item => `${item.lead || '—'} дн.`)}</div><div class="compare-row"><span></span>${items.map(item => `<button class="compare-remove" type="button" data-collection-remove="${item.id}">Убрать ×</button>`).join('')}</div></div>`;
  } else collectionItems.innerHTML = items.map(item => `<article class="collection-item"><a href="${item.url}">${item.name}</a><small>${item.meta}</small><button type="button" data-collection-remove="${item.id}" aria-label="Удалить">×</button></article>`).join('');
  collectionItems.querySelectorAll('[data-collection-remove]').forEach(button => button.addEventListener('click', () => { writeCollection(activeCollection, readCollection(activeCollection).filter(item => item.id !== button.dataset.collectionRemove)); renderCollection(); updateCollectionCounts(); updateProductActions(); }));
};

const toggleCollectionItem = (type, button) => {
  const items = readCollection(type);
  const index = items.findIndex(item => item.id === button.dataset.productId);
  if (index >= 0) items.splice(index, 1);
  else if (type !== 'compare' || items.length < 3) items.push({ id: button.dataset.productId, name: button.dataset.productName, meta: button.dataset.productMeta, url: button.dataset.productUrl, price: button.dataset.productPrice, stock: button.dataset.productStock, lead: button.dataset.productLead });
  writeCollection(type, items);
  updateCollectionCounts();
  updateProductActions();
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
