/* Hover мега-меню направлений (главная).
   Десктоп: раскрытие по наведению (CSS) + превью товара у курсора (здесь).
   Тач: аккордеон по тапу. script.js не затрагивается. */
(function () {
  const grid = document.querySelector('[data-category-grid]');
  if (!grid) return;
  const isTouch = window.matchMedia('(hover: none)').matches;

  // ---------- Мобильный аккордеон ----------
  const cards = [...grid.querySelectorAll('.category-card.has-flyout')];

  const closeAll = (except) => {
    cards.forEach(c => {
      if (c === except) return;
      c.classList.remove('is-open');
      const t = c.querySelector('.cc-toggle');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  };

  cards.forEach(card => {
    const toggle = card.querySelector('.cc-toggle');
    const cover = card.querySelector('.cc-coverlink');
    const setOpen = (open) => {
      card.classList.toggle('is-open', open);
      if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    const onToggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const willOpen = !card.classList.contains('is-open');
      if (willOpen) closeAll(card);
      setOpen(willOpen);
    };
    if (toggle) toggle.addEventListener('click', onToggle);
    // На тач-устройствах тап по плитке раскрывает категории, а не уводит сразу в раздел
    // (ссылка «Все позиции направления» внутри панели ведёт в раздел целиком).
    if (isTouch && cover) cover.addEventListener('click', onToggle);
  });

  if (isTouch) {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.category-card.has-flyout')) closeAll(null);
    });
  }

  // ---------- Превью товара (только десктоп) ----------
  // Фото уходит на ЗАДНИЙ слой панели (под текст): превью кладём внутрь .cc-flyout,
  // по центру колонки, вертикаль следует за курсором. Читаемость не страдает.
  if (isTouch) return;
  let preview;
  const ensurePreview = () => {
    if (!preview) {
      preview = document.createElement('div');
      preview.className = 'cc-preview';
      preview.innerHTML = '<img alt="" />';
    }
    return preview;
  };
  // Координаты относительно .cc-flyout (превью позиционируется absolute внутри неё).
  const place = (e, flyout) => {
    if (!preview) return;
    const r = flyout.getBoundingClientRect();
    const x = r.width / 2;
    let y = e.clientY - r.top + flyout.scrollTop;
    y = Math.max(flyout.scrollTop + 58, Math.min(y, flyout.scrollTop + r.height - 58));
    preview.style.left = x + 'px';
    preview.style.top = y + 'px';
  };
  grid.querySelectorAll('.cc-sub[data-img]').forEach(sub => {
    const src = sub.getAttribute('data-img');
    const flyout = sub.closest('.cc-flyout');
    if (!flyout) return;
    sub.addEventListener('mouseenter', (e) => {
      const p = ensurePreview();
      if (p.parentElement !== flyout) flyout.appendChild(p);
      p.querySelector('img').src = src;
      place(e, flyout);
      p.classList.add('is-visible');
    });
    sub.addEventListener('mousemove', (e) => place(e, flyout));
    sub.addEventListener('mouseleave', () => {
      if (preview) preview.classList.remove('is-visible');
    });
  });
})();
