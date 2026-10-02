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

  const requested = window.location.hash.replace('#', '');
  if (groups[requested]) setSection(requested);
  else if (panelGroup[requested]) setSection(panelGroup[requested], requested);
  else setSection('overview');

  renderDraft();
  window.addEventListener('storage', renderDraft);
})();
