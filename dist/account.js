(() => {
  // Пять крупных разделов. Объединённые разделы показывают под-вкладки,
  // которые переключают исходные панели (контент панелей не меняется).
  const groups = {
    overview:     { title: 'Обзор',           panels: [{ id: 'overview' }] },
    organization: { title: 'Моя организация', panels: [{ id: 'organization', label: 'Реквизиты и команда' }, { id: 'integrations', label: 'Интеграции' }] },
    requests:     { title: 'Заявки и заказы', panels: [{ id: 'requests', label: 'Заявки' }, { id: 'orders', label: 'Заказы' }, { id: 'service', label: 'Сервис' }] },
    finance:      { title: 'Документы',        panels: [{ id: 'finance', label: 'Финансы' }, { id: 'materials', label: 'Материалы' }] },
    manager:      { title: 'Менеджер',         panels: [{ id: 'manager' }] }
  };

  const panelGroup = {};
  Object.entries(groups).forEach(([group, cfg]) => cfg.panels.forEach(p => { panelGroup[p.id] = group; }));

  const panels = [...document.querySelectorAll('[data-account-panel]')];
  const sectionTitle = document.querySelector('[data-section-title]');
  const subtabsEl = document.querySelector('[data-account-subtabs]');
  const toast = document.querySelector('[data-account-toast]');

  const showToast = message => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
  };
  window.showAccountToast = showToast;

  const showPanel = panelId => {
    panels.forEach(panel => panel.classList.toggle('is-active', panel.dataset.accountPanel === panelId));
    if (subtabsEl) subtabsEl.querySelectorAll('button').forEach(btn => btn.classList.toggle('is-active', btn.dataset.subtab === panelId));
  };

  const renderSubtabs = group => {
    if (!subtabsEl) return;
    const cfg = groups[group];
    const tabbable = cfg && cfg.panels.length > 1 && cfg.panels.every(p => p.label);
    if (!tabbable) { subtabsEl.hidden = true; subtabsEl.innerHTML = ''; return; }
    subtabsEl.hidden = false;
    subtabsEl.innerHTML = cfg.panels
      .map((p, i) => `<button type="button" role="tab" data-subtab="${p.id}" class="${i === 0 ? 'is-active' : ''}">${p.label}</button>`)
      .join('');
    subtabsEl.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => showPanel(btn.dataset.subtab)));
  };

  const setSection = (group, panelId) => {
    if (!groups[group]) return;
    document.querySelectorAll('.account-nav [data-account-section]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.accountSection === group));
    if (sectionTitle) sectionTitle.textContent = groups[group].title;
    renderSubtabs(group);
    showPanel(panelId && panelGroup[panelId] === group ? panelId : groups[group].panels[0].id);
    if (history.replaceState) history.replaceState(null, '', `#${panelId || group}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Любой элемент с data-account-section: имя группы → раздел; имя панели → раздел + нужная под-вкладка.
  const go = target => {
    if (groups[target]) setSection(target);
    else if (panelGroup[target]) setSection(panelGroup[target], target);
  };
  document.querySelectorAll('[data-account-section]').forEach(btn => btn.addEventListener('click', () => go(btn.dataset.accountSection)));

  const readDraft = () => {
    try {
      const value = JSON.parse(localStorage.getItem('apexwolt-cart') || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const renderDraft = () => {
    const draft = readDraft();
    document.querySelectorAll('[data-overview-draft-count], [data-sidebar-draft-count]').forEach(node => { node.textContent = draft.length; });
    document.querySelectorAll('[data-request-draft-count]').forEach(node => { node.textContent = `${draft.length} ${draft.length === 1 ? 'позиция' : draft.length > 1 && draft.length < 5 ? 'позиции' : 'позиций'}`; });
    const markup = draft.length
      ? draft.slice(0, 6).map((name, index) => `<div class="draft-row"><span>${String(index + 1).padStart(2, '0')}</span><b>${name}</b><small>Количество уточняется</small></div>`).join('')
      : '<p>Пока пусто. Добавьте позиции из каталога.</p>';
    document.querySelectorAll('[data-draft-items], [data-request-items]').forEach(container => { container.innerHTML = markup; });
  };

  document.querySelectorAll('[data-demo-action]').forEach(button => button.addEventListener('click', () => {
    showToast(`${button.dataset.demoAction}: интерфейс подготовлен, подключение серверной логики будет следующим этапом.`);
  }));

  // ---------- Заявка на закупку: форма + отправка на бэкенд ----------
  // Эндпоинт настраиваемый: для dev — локальный сервер, в проде — реальный URL
  // (window.APEXWOLT_REQUEST_ENDPOINT или /api/request за API Gateway Yandex Cloud).
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const REQUEST_ENDPOINT = window.APEXWOLT_REQUEST_ENDPOINT || (isLocal ? 'http://localhost:8787/request' : '/api/request');

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = v => Number(v) > 0 ? `${Number(v).toLocaleString('ru-RU')} ₽` : null;
  const readCartMeta = () => { try { return JSON.parse(localStorage.getItem('apexwolt-cart-meta') || '{}'); } catch { return {}; } };

  const requestForm = document.querySelector('[data-request-form]');
  const requestSummary = document.querySelector('[data-request-summary]');
  const requestFeedback = document.querySelector('[data-request-feedback]');
  const requestSuccess = document.querySelector('[data-request-success]');
  const requestSubmitBtn = document.querySelector('[data-request-submit]');

  let currentItems = [];

  // Одинаковые имена схлопываем в количество, подтягиваем мету (артикул/бренд/МРЦ).
  const buildRequestItems = () => {
    const meta = readCartMeta();
    const map = new Map();
    readDraft().forEach(name => {
      if (map.has(name)) map.get(name).qty += 1;
      else { const m = meta[name] || {}; map.set(name, { name, qty: 1, code: m.code || '', brand: m.brand || '', image: m.image || '', mrc: m.mrc ? Number(m.mrc) : null }); }
    });
    return [...map.values()];
  };

  const recalcTotal = () => {
    const el = requestSummary && requestSummary.querySelector('[data-rq-total-value]');
    if (!el) return;
    const total = currentItems.reduce((s, it) => s + (it.mrc ? it.mrc * it.qty : 0), 0);
    el.textContent = money(total) || '—';
  };

  const renderRequestSummary = () => {
    if (!requestSummary) return;
    currentItems = buildRequestItems();
    if (!currentItems.length) { requestSummary.innerHTML = '<p class="rq-empty">Заявка пуста. Добавьте позиции из каталога.</p>'; return; }
    const rows = currentItems.map((it, i) =>
      `<div class="rq-item"><span class="rq-num">${i + 1}</span><span class="rq-thumb">${it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy">` : ''}</span><div class="rq-item-main">${it.brand ? `<span class="rq-brand">${esc(it.brand)}</span>` : ''}<b>${esc(it.name)}</b>${it.code ? `<small>Артикул: ${esc(it.code)}</small>` : ''}</div><div class="rq-qty"><button type="button" class="rq-step" data-rq-dec="${i}" aria-label="Уменьшить количество">−</button><input type="number" min="1" value="${it.qty}" data-rq-qty="${i}" aria-label="Количество" /><button type="button" class="rq-step" data-rq-inc="${i}" aria-label="Увеличить количество">+</button></div><span class="rq-price">${it.mrc ? money(it.mrc) + ' / шт' : 'Цена по запросу'}</span></div>`
    ).join('');
    const hasPrice = currentItems.some(it => it.mrc);
    requestSummary.innerHTML = rows + (hasPrice ? '<div class="rq-total"><span>Итого по МРЦ (справочно)</span><b data-rq-total-value></b></div>' : '');
    const syncQty = (idx, val) => {
      currentItems[idx].qty = Math.max(1, Math.min(9999, val));
      const input = requestSummary.querySelector(`[data-rq-qty="${idx}"]`);
      if (input) input.value = currentItems[idx].qty;
      recalcTotal();
    };
    requestSummary.querySelectorAll('[data-rq-qty]').forEach(input => {
      input.addEventListener('input', () => { currentItems[Number(input.dataset.rqQty)].qty = Math.max(1, parseInt(input.value, 10) || 1); recalcTotal(); });
      input.addEventListener('blur', () => syncQty(Number(input.dataset.rqQty), parseInt(input.value, 10) || 1));
    });
    requestSummary.querySelectorAll('[data-rq-inc]').forEach(btn => btn.addEventListener('click', () => { const i = Number(btn.dataset.rqInc); syncQty(i, currentItems[i].qty + 1); }));
    requestSummary.querySelectorAll('[data-rq-dec]').forEach(btn => btn.addEventListener('click', () => { const i = Number(btn.dataset.rqDec); syncQty(i, currentItems[i].qty - 1); }));
    recalcTotal();
  };

  const setFeedback = (msg, type = 'error') => {
    if (!requestFeedback) return;
    requestFeedback.textContent = msg || '';
    requestFeedback.className = `request-feedback is-${type}`;
    requestFeedback.hidden = !msg;
  };

  document.querySelector('[data-request-open]')?.addEventListener('click', () => {
    if (!requestForm) return;
    if (!readDraft().length) { showToast('Заявка пуста — добавьте позиции из каталога.'); return; }
    setFeedback('');
    if (requestSuccess) requestSuccess.hidden = true;
    renderRequestSummary();
    requestForm.hidden = false;
    requestForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  document.querySelector('[data-request-cancel]')?.addEventListener('click', () => { if (requestForm) requestForm.hidden = true; });

  requestForm?.addEventListener('submit', async e => {
    e.preventDefault();
    setFeedback('');
    const fd = new FormData(requestForm);
    const contact = {
      name: String(fd.get('name') || '').trim(),
      company: String(fd.get('company') || '').trim(),
      inn: String(fd.get('inn') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      comment: String(fd.get('comment') || '').trim(),
      consent: fd.get('consent') === 'on'
    };
    const errs = [];
    if (contact.name.length < 2) errs.push('контактное лицо');
    if (!contact.company && !contact.inn) errs.push('компанию или ИНН');
    if (contact.inn && !/^\d{10}(\d{2})?$/.test(contact.inn)) errs.push('корректный ИНН (10 или 12 цифр)');
    if (!contact.email && !contact.phone) errs.push('email или телефон');
    if (!contact.consent) errs.push('согласие на обработку данных');
    if (!currentItems.length) errs.push('позиции в заявке');
    if (errs.length) { setFeedback('Укажите: ' + errs.join(', ') + '.'); return; }

    const payload = {
      contact,
      items: currentItems.map(it => ({ name: it.name, code: it.code, qty: it.qty, mrc: it.mrc, brand: it.brand })),
      meta: { source: 'account' }
    };

    const prev = requestSubmitBtn.textContent;
    requestSubmitBtn.disabled = true;
    requestSubmitBtn.textContent = 'Отправляем…';
    try {
      const res = await fetch(REQUEST_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        localStorage.removeItem('apexwolt-cart');
        localStorage.removeItem('apexwolt-cart-meta');
        requestForm.reset();
        requestForm.hidden = true;
        if (requestSuccess) {
          requestSuccess.hidden = false;
          requestSuccess.innerHTML = `<span class="rq-success-mark" aria-hidden="true">✓</span><div><h3>Заявка отправлена</h3><p>Номер заявки: <b>${esc(data.id)}</b>. Менеджер проверит цены, наличие и сроки и свяжется с вами.</p></div>`;
        }
        renderDraft();
        showToast('Заявка отправлена менеджеру');
      } else {
        setFeedback(data.error || 'Не удалось отправить заявку. Попробуйте ещё раз.');
      }
    } catch {
      setFeedback('Сервер недоступен. Проверьте соединение и попробуйте позже.');
    } finally {
      requestSubmitBtn.disabled = false;
      requestSubmitBtn.textContent = prev;
    }
  });

  const requested = window.location.hash.replace('#', '');
  if (groups[requested]) setSection(requested);
  else if (panelGroup[requested]) setSection(panelGroup[requested], requested);
  else setSection('overview');

  renderDraft();
  window.addEventListener('storage', renderDraft);
})();
