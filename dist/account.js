(() => {
  const sectionTitles = {
    overview: 'Обзор',
    organization: 'Моя организация',
    requests: 'Заявки',
    orders: 'Заказы',
    finance: 'Финансы и документы',
    service: 'Сервис',
    materials: 'Материалы',
    integrations: 'Интеграции'
  };

  const navButtons = [...document.querySelectorAll('[data-account-section]')];
  const panels = [...document.querySelectorAll('[data-account-panel]')];
  const sectionTitle = document.querySelector('[data-section-title]');
  const toast = document.querySelector('[data-account-toast]');

  const showToast = message => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
  };

  const setSection = name => {
    if (!sectionTitles[name]) return;
    panels.forEach(panel => panel.classList.toggle('is-active', panel.dataset.accountPanel === name));
    document.querySelectorAll('.account-nav [data-account-section]').forEach(button => button.classList.toggle('is-active', button.dataset.accountSection === name));
    if (sectionTitle) sectionTitle.textContent = sectionTitles[name];
    if (history.replaceState) history.replaceState(null, '', `#${name}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  navButtons.forEach(button => button.addEventListener('click', () => setSection(button.dataset.accountSection)));

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

  const requestedSection = window.location.hash.replace('#', '');
  setSection(sectionTitles[requestedSection] ? requestedSection : 'overview');
  renderDraft();
  window.addEventListener('storage', renderDraft);
})();
