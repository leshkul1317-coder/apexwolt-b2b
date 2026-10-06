(() => {
  const root = document.querySelector('[data-home-search]');
  const input = root?.querySelector('[data-category-search]');
  const results = root?.querySelector('[data-home-search-results]');
  if (!root || !input || !results || typeof categoryData === 'undefined') return;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  const normalize = value => String(value ?? '')
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/(\d+)\s*(вт|в|нм|мм|ач|дж)\b/g, '$1$2')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const products = Object.entries(categoryData).flatMap(([categoryKey, category]) =>
    category.variants.map(variant => ({
      id: variant[0],
      code: variant[1],
      name: variant[2],
      stock: Boolean(variant[3]),
      categoryKey,
      categoryTitle: category.title,
      specs: variant[6] || [],
      brand: variant[7] || '',
      description: variant[10] || '',
      image: variant[11] || category.image || 'assets/apexwolt-logo-black.png'
    }))
  );

  const tokenAliases = token => {
    const aliases = {
      ушм: ['ушм', 'углошлифоваль'],
      болгарка: ['болгарк', 'углошлифоваль'],
      болгарки: ['болгарк', 'углошлифоваль'],
      шурик: ['шурик', 'шуруповерт'],
      перф: ['перфоратор'],
      акб: ['акб', 'аккумулятор'],
      сварка: ['свароч'],
      сварочник: ['свароч'],
      пылесос: ['пылесос'],
      лобзик: ['лобзик']
    };
    return aliases[token] || [token];
  };

  const searchable = products.map(product => ({
    ...product,
    normalizedCode: normalize(product.code),
    normalizedName: normalize(product.name),
    normalizedCategory: normalize(product.categoryTitle),
    haystack: normalize([
      product.code,
      product.name,
      product.categoryTitle,
      product.brand,
      product.description,
      ...product.specs
    ].join(' '))
  }));

  const declension = count => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'совпадение';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'совпадения';
    return 'совпадений';
  };

  const findProducts = rawQuery => {
    const query = normalize(rawQuery);
    if (!query) return [];
    const exactCodeMatches = searchable.filter(product => product.normalizedCode === query);
    if (exactCodeMatches.length) return exactCodeMatches.map(product => ({ product, score: 999 }));
    const groups = query.split(' ').filter(Boolean).map(tokenAliases);

    return searchable
      .map(product => {
        if (!groups.every(group => group.some(term => product.haystack.includes(term)))) return null;
        let score = groups.length * 20;
        if (product.normalizedCode === query) score += 240;
        else if (product.normalizedCode.startsWith(query)) score += 170;
        else if (product.normalizedCode.includes(query)) score += 120;
        if (product.normalizedName.startsWith(query)) score += 150;
        else if (product.normalizedName.includes(query)) score += 110;
        if (product.normalizedCategory.includes(query)) score += 45;
        if (product.stock) score += 4;
        return { product, score };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score || left.product.name.localeCompare(right.product.name, 'ru'));
  };

  const closeResults = () => {
    results.hidden = true;
    results.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
  };

  const renderResults = () => {
    const query = input.value.trim();
    if (query.length < 2) {
      closeResults();
      return;
    }

    const matches = findProducts(query);
    const visible = matches.slice(0, 6);
    if (!visible.length) {
      results.innerHTML = `<div class="catalog-search-empty"><b>Товар не найден</b><span>Попробуйте название модели, тип инструмента или артикул.</span><a href="catalog.html">Открыть весь каталог →</a></div>`;
    } else {
      results.innerHTML = `<div class="catalog-search-caption"><span>Найденные товары</span><b>${matches.length} ${declension(matches.length)}</b></div>${visible.map(({ product }) => `
        <a class="catalog-search-result" role="option" href="catalog.html?category=${encodeURIComponent(product.categoryKey)}&focus=${encodeURIComponent(product.id)}">
          <span class="catalog-search-result-art"><img src="${escapeHtml(product.image)}" alt="" loading="lazy" /></span>
          <span class="catalog-search-result-copy">
            <small>${escapeHtml(product.brand)} · ${escapeHtml(product.categoryTitle)}</small>
            <strong>${escapeHtml(product.name)}</strong>
            <em>Артикул ${escapeHtml(product.code)}</em>
          </span>
          <span class="catalog-search-result-status${product.stock ? '' : ' is-transit'}"><i></i>${product.stock ? 'В наличии' : 'В пути'}</span>
          <b class="catalog-search-result-arrow" aria-hidden="true">→</b>
        </a>`).join('')}`;
    }

    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', renderResults);
  input.addEventListener('focus', renderResults);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeResults();
      input.blur();
      return;
    }
    if (event.key === 'ArrowDown') {
      const firstResult = results.querySelector('.catalog-search-result');
      if (!results.hidden && firstResult) {
        event.preventDefault();
        firstResult.focus();
      }
      return;
    }
    if (event.key === 'Enter') {
      const firstResult = results.querySelector('.catalog-search-result');
      if (!results.hidden && firstResult) {
        event.preventDefault();
        firstResult.click();
      }
    }
  });

  results.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeResults();
    input.focus();
  });

  document.addEventListener('pointerdown', event => {
    if (!root.contains(event.target)) closeResults();
  });
})();
