const mainFilm = document.querySelector('[data-film-clip]');
const mainFilmEnd = 20.12;
const sectionFilmStops = [
  { selector: '.hero', time: .08 },
  { selector: '#catalog', time: 3.08 },
  { selector: '.service-intro', time: 6.16 },
  { selector: '.partner-support', time: 9.20 },
  { selector: '#platform', time: 12.15, arrive: .68, widen: .28 },
  { selector: '.video-reviews', time: 17.30 },
  { selector: '#contacts', time: 20.10, arrive: .8, widen: .1 }
];
const categoryFilmStops = { drills: 3.08, grinders: 6.16, jigsaws: 9.20 };
let activeCategoryFilmStop = null;
let categoryFilmOverride = false;
let filmTween = null;
let cinematicScrollReady = false;
const filmState = { time: .08 };
const scrollFilmState = { time: .08 };
const hero = document.querySelector('.hero');
const heroExitItems = [...document.querySelectorAll('.hero-copy > .eyebrow, .hero-copy > h1, .hero-copy > p:not(.eyebrow), .hero-copy > .hero-actions')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderHeroExit = () => {
  if (!hero || !heroExitItems.length || reduceMotion) return;
  const progress = Math.min(1, Math.max(0, (window.scrollY - 12) / Math.max(1, hero.offsetHeight * .62)));
  heroExitItems.forEach((item, index) => {
    const start = index * .14;
    const localProgress = Math.min(1, Math.max(0, (progress - start) / .34));
    const eased = localProgress * localProgress * (3 - 2 * localProgress);
    item.style.setProperty('--hero-exit', eased.toFixed(4));
  });
};

const getSectionStops = () => sectionFilmStops.map(stop => {
  const element = document.querySelector(stop.selector);
  if (!element) return null;
  return {
    time: stop.time,
    arrive: stop.arrive,
    widen: stop.widen,
    point: element.offsetTop + element.offsetHeight * .5,
    top: element.offsetTop,
    height: element.offsetHeight
  };
}).filter(Boolean);

const getScrollFilmTarget = () => {
  const catalog = document.querySelector('#catalog');
  const catalogBrowser = document.querySelector('[data-catalog-browser]');
  if (activeCategoryFilmStop !== null && catalog && catalogBrowser && !catalogBrowser.hidden) {
    const bounds = catalog.getBoundingClientRect();
    if (bounds.bottom > window.innerHeight * .15 && bounds.top < window.innerHeight * .85) return activeCategoryFilmStop;
  }

  const stops = getSectionStops();
  if (!stops.length) return 0;

  const ranges = stops.map((stop, index) => {
    const start = index === 0 ? 0 : Math.max(0, stop.top - window.innerHeight * .05);
    const end = Math.max(start, stop.top + stop.height - window.innerHeight * .45);
    return { ...stop, start, end };
  });
  const scrollPosition = Math.max(0, window.scrollY);

  for (let index = 0; index < ranges.length; index += 1) {
    const current = ranges[index];
    const next = ranges[index + 1];
    // `widen` на next (в долях высоты экрана): заканчиваем статичный кадр current раньше,
    // чтобы переход к next проигрывался на большей длине скролла и был плавнее.
    const effEnd = current.end - (next && next.widen ? next.widen * window.innerHeight : 0);
    if (scrollPosition <= effEnd && scrollPosition >= current.start) return current.time;

    if (next && scrollPosition > effEnd && scrollPosition < next.start) {
      let progress = Math.min(1, Math.max(0, (scrollPosition - effEnd) / Math.max(1, next.start - effEnd)));
      // `arrive` (0..1): завершить переход к next раньше конца промежутка и держать кадр остаток пути.
      if (next.arrive) progress = Math.min(1, progress / next.arrive);
      const eased = progress * progress * (3 - 2 * progress);
      return current.time + (next.time - current.time) * eased;
    }
  }

  return Math.min(mainFilmEnd - .04, scrollPosition < ranges[0].start ? ranges[0].time : ranges.at(-1).time);
};

const renderFilmTime = () => {
  if (!mainFilm || mainFilm.readyState < 1) return;
  mainFilm.classList.add('is-active');
  mainFilm.pause();
  if (Math.abs(mainFilm.currentTime - filmState.time) > .008) mainFilm.currentTime = filmState.time;
};

const moveFilmTo = (time, immediate = false) => {
  if (!mainFilm) return;
  const target = Math.min(mainFilmEnd - .04, Math.max(0, time));
  if (filmTween) filmTween.kill();

  if (!window.gsap || immediate) {
    filmState.time = target;
    renderFilmTime();
    return;
  }

  const distance = Math.abs(target - filmState.time);
  filmTween = window.gsap.to(filmState, {
    time: target,
    duration: Math.min(1.35, Math.max(.58, distance / 3.5)),
    ease: 'power2.inOut',
    overwrite: true,
    onUpdate: renderFilmTime,
    onComplete: renderFilmTime
  });
};

const requestFilmFrame = () => {
  scrollFilmState.time = getScrollFilmTarget();
  renderScrollFilmTime();
  renderHeroExit();
};

const renderScrollFilmTime = () => {
  if (categoryFilmOverride) return;
  if (filmTween) { filmTween.kill(); filmTween = null; }
  filmState.time = scrollFilmState.time;
  renderFilmTime();
};

const setupCinematicScroll = () => {
  if (!mainFilm || cinematicScrollReady) return;
  cinematicScrollReady = true;
  mainFilm.pause();
  filmState.time = Math.min(mainFilmEnd - .04, getScrollFilmTarget());
  renderFilmTime();

  if (window.gsap && window.Lenis) {
    const lenis = new window.Lenis({
      duration: 1.35,
      smoothWheel: true,
      wheelMultiplier: .32,
      touchMultiplier: .72,
      anchors: true,
      allowNestedScroll: true
    });
    lenis.on('scroll', requestFilmFrame);
    window.gsap.ticker.add(time => lenis.raf(time * 1000));
    window.gsap.ticker.lagSmoothing(0);
    window.addEventListener('resize', requestFilmFrame);
    requestFilmFrame();
  } else {
    window.addEventListener('scroll', requestFilmFrame, { passive: true });
    window.addEventListener('resize', requestFilmFrame);
  }
};

const waitForFilmMetadata = () => new Promise((resolve, reject) => {
  if (!mainFilm || mainFilm.readyState >= 1) { resolve(); return; }
  const onReady = () => { cleanup(); resolve(); };
  const onError = () => { cleanup(); reject(mainFilm.error || new Error('Не удалось загрузить видео')); };
  const cleanup = () => {
    mainFilm.removeEventListener('loadedmetadata', onReady);
    mainFilm.removeEventListener('error', onError);
  };
  mainFilm.addEventListener('loadedmetadata', onReady, { once: true });
  mainFilm.addEventListener('error', onError, { once: true });
});

const siteLoader = document.querySelector('[data-site-loader]');
const loaderBar = document.querySelector('[data-loader-bar]');
const loaderPct = document.querySelector('[data-loader-pct]');
let loaderHidden = false;
const setLoaderProgress = value => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  if (loaderBar) loaderBar.style.width = `${pct}%`;
  if (loaderPct) loaderPct.textContent = `${pct}%`;
};
// Сменяющиеся фразы на лоадере (плавное появление/исчезновение из блюра).
const loaderPhraseEl = document.querySelector('[data-loader-phrase]');
const loaderPhrases = ['Готовим каталог', 'Подбираем товары именно для вас', 'Настраиваем личный кабинет', 'Собираем лучшие предложения'];
let loaderPhraseIdx = 0, loaderPhraseTimer = null;
const cyclePhrase = () => {
  if (!loaderPhraseEl || loaderHidden) return;
  loaderPhraseEl.textContent = loaderPhrases[loaderPhraseIdx % loaderPhrases.length];
  loaderPhraseEl.classList.add('is-visible'); // блюр-появление
  loaderPhraseTimer = setTimeout(() => {
    loaderPhraseEl.classList.remove('is-visible'); // блюр-исчезновение
    loaderPhraseIdx++;
    loaderPhraseTimer = setTimeout(cyclePhrase, 650); // пауза, пока текст растворяется
  }, 2000);
};
if (loaderPhraseEl && !loaderHidden) cyclePhrase();

const hideLoader = () => {
  if (loaderHidden || !siteLoader) return;
  loaderHidden = true;
  if (loaderPhraseTimer) { clearTimeout(loaderPhraseTimer); loaderPhraseTimer = null; }
  if (loaderPhraseEl) loaderPhraseEl.classList.remove('is-visible');
  setLoaderProgress(100);
  siteLoader.classList.add('is-hidden');
  siteLoader.setAttribute('aria-hidden', 'true');
};

// Полностью скачиваем ролик в память (Blob): тогда скролл-скраб не перескакивает
// по незагруженным участкам и не упирается в сетевые seek-запросы. Ждём ПОЛНОЙ
// загрузки; прерываем только если соединение «умерло» — нет новых данных дольше
// stall-окна (не по общему таймеру, чтобы не оборвать медленную, но живую загрузку).
const preloadFilmBlob = async controller => {
  const sourceUrl = mainFilm.currentSrc;
  if (!sourceUrl) return false;
  const response = await fetch(sourceUrl, { cache: 'force-cache', signal: controller.signal });
  if (!response.ok || !response.body) throw new Error(`Видео недоступно: ${response.status}`);
  const total = Number(response.headers.get('Content-Length')) || 0;
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  const STALL_MS = 30000;
  let stall = window.setTimeout(() => controller.abort(), STALL_MS);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      window.clearTimeout(stall);
      stall = window.setTimeout(() => controller.abort(), STALL_MS);
      chunks.push(value);
      received += value.length;
      if (total) setLoaderProgress((received / total) * 100);
    }
  } finally {
    window.clearTimeout(stall);
  }
  const objectUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
  mainFilm.src = objectUrl;
  mainFilm.load();
  await waitForFilmMetadata();
  window.addEventListener('pagehide', () => URL.revokeObjectURL(objectUrl), { once: true });
  return true;
};

const prepareMainFilm = async () => {
  if (!mainFilm) { hideLoader(); return; }
  const controller = new AbortController();
  try {
    await waitForFilmMetadata();
    // Держим лоадер до ПОЛНОЙ загрузки ролика — без прерывания по времени.
    await preloadFilmBlob(controller);
    setupCinematicScroll();
  } catch (error) {
    // Только при реальном сбое (файл недоступен / соединение умерло) не висим вечно:
    // показываем сайт и стримим как запасной вариант.
    console.warn('APEXWOLT film preload failed, streaming fallback:', error);
    mainFilm.classList.add('is-active');
    try { setupCinematicScroll(); } catch (e) {}
  } finally {
    hideLoader();
  }
};

prepareMainFilm();

const releaseCategoryFilmOverride = () => {
  if (!categoryFilmOverride) return;
  categoryFilmOverride = false;
  if (filmTween) { filmTween.kill(); filmTween = null; }
};
window.addEventListener('wheel', releaseCategoryFilmOverride, { passive: true });
window.addEventListener('touchmove', releaseCategoryFilmOverride, { passive: true });
window.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) releaseCategoryFilmOverride();
});

const categoryLabels = { drills: 'Шуруповёрты', grinders: 'УШМ', jigsaws: 'Электролобзики' };
const categoryGrid = document.querySelector('[data-category-grid]');
const categorySearch = document.querySelector('[data-category-search]');
const catalogBrowser = document.querySelector('[data-catalog-browser]');
const categoryTitle = document.querySelector('[data-category-title]');
const products = [...document.querySelectorAll('.product-card')];
const productsGrid = document.querySelector('[data-products]');
const searchInput = document.querySelector('[data-product-search]');
const sortSelect = document.querySelector('[data-product-sort]');
const emptyState = document.querySelector('[data-empty-state]');
let activeCategory = null;
let availability = 'all';

const filterCategories = () => {
  if (!categoryGrid || !categorySearch) return;
  const query = categorySearch.value.trim().toLowerCase();
  const aliases = query === 'ушм' || query === 'болгарка' ? ['углошлифоваль'] : [];
  categoryGrid.querySelectorAll('.category-card').forEach(card => {
    const content = card.textContent.toLowerCase();
    card.hidden = Boolean(query) && !content.includes(query) && !aliases.some(alias => content.includes(alias));
  });
};

categorySearch?.addEventListener('input', filterCategories);
window.addEventListener('keydown', event => {
  if (event.key !== '/' || !categorySearch || /input|textarea|select/i.test(document.activeElement?.tagName || '')) return;
  event.preventDefault();
  categorySearch.focus();
});

const applyCatalog = () => {
  const query = (searchInput?.value || '').trim().toLowerCase();
  const matches = products.filter(product => {
    const categoryMatch = product.dataset.category === activeCategory;
    const textMatch = product.dataset.search.includes(query);
    const stock = Number(product.dataset.stock);
    const lead = Number(product.dataset.lead);
    const availabilityMatch = availability === 'all' || (availability === 'stock' && stock > 0) || (availability === 'fast' && lead <= 3);
    return categoryMatch && textMatch && availabilityMatch;
  });
  const sorted = [...matches].sort((a, b) => {
    if (sortSelect?.value === 'price-low') return Number(a.dataset.price) - Number(b.dataset.price);
    if (sortSelect?.value === 'price-high') return Number(b.dataset.price) - Number(a.dataset.price);
    if (sortSelect?.value === 'lead') return Number(a.dataset.lead) - Number(b.dataset.lead);
    return Number(b.dataset.stock) - Number(a.dataset.stock);
  });
  products.forEach(product => product.hidden = true);
  sorted.forEach(product => { product.hidden = false; productsGrid.append(product); });
  if (emptyState) emptyState.hidden = matches.length > 0;
};

const openCategory = category => {
  activeCategory = category;
  activeCategoryFilmStop = categoryFilmStops[category] ?? 3.08;
  categoryFilmOverride = true;
  const count = products.filter(product => product.dataset.category === category).length;
  categoryGrid.hidden = true;
  catalogBrowser.hidden = false;
  categoryTitle.innerHTML = `${categoryLabels[category]} <span>· ${count} ${count === 1 ? 'позиция' : 'позиции'}</span>`;
  applyCatalog();
  requestFilmFrame();
  catalogBrowser.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => openCategory(button.dataset.category)));
document.querySelector('[data-catalog-back]')?.addEventListener('click', () => { activeCategoryFilmStop = null; categoryFilmOverride = false; catalogBrowser.hidden = true; categoryGrid.hidden = false; requestFilmFrame(); categoryGrid.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
searchInput?.addEventListener('input', applyCatalog);
sortSelect?.addEventListener('change', applyCatalog);
document.querySelectorAll('[data-availability]').forEach(button => button.addEventListener('click', () => { availability = button.dataset.availability; document.querySelectorAll('[data-availability]').forEach(item => item.classList.toggle('is-active', item === button)); applyCatalog(); }));

const drawer = document.querySelector('[data-cart-drawer]');
const backdrop = document.querySelector('.drawer-backdrop');
const requestItems = document.querySelector('[data-request-items]');
const cartCount = document.querySelector('[data-cart-count]');
const toast = document.querySelector('[data-toast]');
const checkoutSuccess = document.querySelector('[data-checkout-success]');
const checkoutFilm = document.querySelector('[data-checkout-film]');
const checkoutStart = 12.16;
const checkoutEnd = 20.08;
let cart = (() => { try { return JSON.parse(localStorage.getItem('apexwolt-cart') || '[]'); } catch { return []; } })();
const renderCart = () => {
  localStorage.setItem('apexwolt-cart', JSON.stringify(cart));
  cartCount.textContent = cart.length;
  requestItems.innerHTML = cart.length ? cart.map((name, index) => `<div class="request-item"><span>${name}</span><button type="button" data-remove-item="${index}" aria-label="Удалить">×</button></div>`).join('') : '<p>Добавьте позиции из каталога.</p>';
  requestItems.querySelectorAll('[data-remove-item]').forEach(button => button.addEventListener('click', () => { cart.splice(Number(button.dataset.removeItem), 1); renderCart(); }));
};
const resetCheckout = () => {
  drawer.classList.remove('is-checkout');
  if (checkoutSuccess) checkoutSuccess.hidden = true;
  if (checkoutFilm) { checkoutFilm.pause(); checkoutFilm.currentTime = 0; }
};
const setDrawer = open => {
  drawer.classList.toggle('is-open', open);
  backdrop.classList.toggle('is-open', open);
  drawer.setAttribute('aria-hidden', String(!open));
  if (!open) resetCheckout();
};
const playCheckoutFilm = () => {
  if (!checkoutFilm) return;
  const playSegment = () => {
    checkoutFilm.currentTime = checkoutStart;
    checkoutFilm.play().catch(() => {});
  };
  if (checkoutFilm.readyState >= 1) playSegment();
  else checkoutFilm.addEventListener('loadedmetadata', playSegment, { once: true });
};
const startCheckout = () => {
  if (!checkoutSuccess) return;
  drawer.classList.add('is-checkout');
  checkoutSuccess.hidden = false;
  playCheckoutFilm();
};
checkoutFilm?.addEventListener('timeupdate', () => { if (checkoutFilm.currentTime >= checkoutEnd) checkoutFilm.pause(); });
document.querySelectorAll('[data-cart-open]').forEach(button => button.addEventListener('click', () => setDrawer(true)));
document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', () => setDrawer(false)));
document.querySelectorAll('[data-add-product]').forEach(button => button.addEventListener('click', () => { cart.push(button.dataset.addProduct); renderCart(); toast.textContent = 'Позиция добавлена в заявку'; toast.classList.add('is-visible'); window.setTimeout(() => toast.classList.remove('is-visible'), 1800); }));
document.querySelector('[data-send-request]')?.addEventListener('click', () => {
  if (!cart.length) {
    toast.textContent = 'Заявка пуста — добавьте позиции из каталога.';
    toast.classList.add('is-visible');
    window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
    return;
  }
  startCheckout();
});
document.querySelector('[data-checkout-reset]')?.addEventListener('click', resetCheckout);
renderCart(); // синхронизируем ящик заявки с сохранённой корзиной при загрузке
document.querySelectorAll('[data-demo-action]').forEach(button => button.addEventListener('click', () => { toast.textContent = `${button.dataset.demoAction}: подключим в личном кабинете`; toast.classList.add('is-visible'); window.setTimeout(() => toast.classList.remove('is-visible'), 2200); }));

const workflow = document.querySelector('[data-workflow]');
const workflowSteps = workflow ? [...workflow.querySelectorAll('[data-workflow-step]')] : [];

const setWorkflowStep = index => {
  if (!workflow || !workflowSteps.length) return;
  const safeIndex = Math.max(0, Math.min(index, workflowSteps.length - 1));
  workflow.style.setProperty('--workflow-progress', `${safeIndex * 50}%`);
  workflowSteps.forEach((step, stepIndex) => {
    const active = stepIndex === safeIndex;
    step.classList.toggle('is-active', active);
    step.querySelector('.workflow-step')?.setAttribute('aria-pressed', String(active));
  });
};

workflowSteps.forEach((step, index) => {
  const button = step.querySelector('.workflow-step');
  button?.addEventListener('click', () => setWorkflowStep(index));
  button?.addEventListener('pointerenter', () => setWorkflowStep(index));
  button?.addEventListener('focus', () => setWorkflowStep(index));
});

if (workflow && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let workflowAnimated = false;
  const workflowObserver = new IntersectionObserver(entries => {
    if (workflowAnimated || !entries.some(entry => entry.isIntersecting)) return;
    workflowAnimated = true;
    workflowSteps.forEach((_, index) => window.setTimeout(() => setWorkflowStep(index), index * 430));
    workflowObserver.disconnect();
  }, { threshold: .55 });
  workflowObserver.observe(workflow);
}

const tiltCards = [...document.querySelectorAll('#new-arrivals .catalog-new-card, #platform .procurement-card, .partner-benefit')];
const tiltAllowed = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (tiltAllowed) {
  tiltCards.forEach(card => {
    card.classList.add('is-tiltable');
    card.addEventListener('pointermove', event => {
      const bounds = card.getBoundingClientRect();
      const horizontal = (event.clientX - bounds.left) / bounds.width;
      const vertical = (event.clientY - bounds.top) / bounds.height;
      card.style.setProperty('--tilt-x', `${(0.5 - vertical) * 8}deg`);
      card.style.setProperty('--tilt-y', `${(horizontal - 0.5) * 8}deg`);
      card.style.setProperty('--shine-x', `${horizontal * 100}%`);
      card.style.setProperty('--shine-y', `${vertical * 100}%`);
      card.classList.add('is-tilting');
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--shine-x', '50%');
      card.style.setProperty('--shine-y', '50%');
    });
  });
}

const titleLockups = [...document.querySelectorAll('.section-title-lockup')];

if ('IntersectionObserver' in window && titleLockups.length) {
  const titleObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-title-live', entry.isIntersecting));
  }, { threshold: .35 });
  titleLockups.forEach(lockup => titleObserver.observe(lockup));
} else {
  titleLockups.forEach(lockup => lockup.classList.add('is-title-live'));
}

if (tiltAllowed) {
  titleLockups.forEach(lockup => {
    lockup.classList.add('is-title-tiltable');
    lockup.addEventListener('pointermove', event => {
      const bounds = lockup.getBoundingClientRect();
      const horizontal = (event.clientX - bounds.left) / bounds.width;
      const vertical = (event.clientY - bounds.top) / bounds.height;
      lockup.style.setProperty('--title-tilt-x', `${(0.5 - vertical) * 3.2}deg`);
      lockup.style.setProperty('--title-tilt-y', `${(horizontal - 0.5) * 3.2}deg`);
      lockup.style.setProperty('--title-shine-x', `${horizontal * 100}%`);
      lockup.style.setProperty('--title-shine-y', `${vertical * 100}%`);
      lockup.classList.add('is-title-tilting');
    });
    lockup.addEventListener('pointerleave', () => {
      lockup.classList.remove('is-title-tilting');
      lockup.style.setProperty('--title-tilt-x', '0deg');
      lockup.style.setProperty('--title-tilt-y', '0deg');
      lockup.style.setProperty('--title-shine-x', '72%');
      lockup.style.setProperty('--title-shine-y', '28%');
    });
  });
}

const factoryAccordionItems = [...document.querySelectorAll('.factory-placeholder')];

factoryAccordionItems.forEach(item => {
  item.addEventListener('click', () => {
    factoryAccordionItems.forEach(candidate => {
      const isActive = candidate === item;
      candidate.classList.toggle('active', isActive);
      candidate.setAttribute('aria-pressed', String(isActive));
    });
  });
});

document.querySelectorAll('[data-video-placeholder]').forEach(button => {
  button.addEventListener('click', () => {
    toast.textContent = `${button.dataset.videoPlaceholder}: добавим ссылку на полный обзор`;
    toast.classList.add('is-visible');
    window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
  });
});

document.querySelectorAll('[data-video-platform]').forEach(button => {
  button.addEventListener('click', () => {
    toast.textContent = `${button.dataset.videoPlatform}: добавим канал после получения ссылки`;
    toast.classList.add('is-visible');
    window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
  });
});
