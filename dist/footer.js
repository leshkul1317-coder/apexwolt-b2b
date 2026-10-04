(() => {
  const footerRoot = document.querySelector('[data-site-footer]');
  if (footerRoot) {
    footerRoot.innerHTML = `
      <footer class="site-footer">
        <div class="footer-shell">
          <section class="footer-newsletter" aria-labelledby="newsletter-title">
            <div><p class="eyebrow">APEXWOLT / ДЕЛОВАЯ РАССЫЛКА</p><h2 id="newsletter-title">Важное для закупки — без лишнего.</h2></div>
            <form class="newsletter-form" data-newsletter-form novalidate>
              <label class="newsletter-field"><input type="email" name="email" autocomplete="email" required placeholder="Корпоративная почта" aria-label="Корпоративная почта" /><button type="submit">Подписаться&nbsp; →</button></label>
              <div class="newsletter-consents">
                <label class="newsletter-check"><input type="checkbox" name="personal-data" required /><span>Я даю <a href="consent-personal-data.html">согласие на обработку персональных данных</a>.</span></label>
                <label class="newsletter-check"><input type="checkbox" name="marketing" required /><span>Я отдельно соглашаюсь получать информационные и рекламные сообщения на условиях <a href="marketing-consent.html">согласия на рассылку</a>.</span></label>
              </div>
              <p class="newsletter-status" data-newsletter-status aria-live="polite"></p>
            </form>
          </section>
          <div class="footer-grid">
            <div class="footer-brand"><img src="assets/apexwolt-logo-solid.svg" alt="APEXWOLT" /><p>B2B-платформа для корпоративного выбора инструмента, подготовки заявки и сопровождения поставки менеджером.</p><a class="footer-b2c-link" href="https://apexwolt.ru/" target="_blank" rel="noopener">Сайт для частных покупателей <span>↗</span></a></div>
            <nav class="footer-column" aria-label="Закупщикам"><b>ЗАКУПЩИКАМ</b><a href="index.html#catalog">Каталог</a><a href="faq.html">Частые вопросы</a><a href="index.html#partner-support">Поддержка партнёров</a><a href="index.html#platform">Инструменты закупщика</a><a href="index.html#video-reviews">Видеообзоры</a><a href="https://apexwolt.ru/certificates" target="_blank" rel="noopener">Сертификаты ↗</a><a href="index.html#contacts">Связаться с менеджером</a></nav>
            <nav class="footer-column" aria-label="Платформа"><b>ПЛАТФОРМА</b><a href="account.html">Личный кабинет</a><a href="request-terms.html">Условия оформления заявки</a><a href="platform-rules.html">Правила платформы</a><a href="legal.html">Правовая информация</a></nav>
            <nav class="footer-column" aria-label="Документы"><b>ДОКУМЕНТЫ</b><a href="privacy.html">Политика обработки данных</a><a href="consent-personal-data.html">Согласие на обработку данных</a><a href="cookie-policy.html">Политика cookie</a><a href="marketing-consent.html">Согласие на рассылку</a></nav>
          </div>
          <div class="footer-bottom">
            <div class="footer-company"><strong>ООО «АПЕКС»</strong><span>ИНН 3804120303</span><span>КПП 380401001</span><span>ОГРН 1243800003259</span><span>666682, Иркутская область, г. Усть-Илимск, пр-кт Мира, 41В</span><a href="mailto:idea.apexwolt@mail.ru">idea.apexwolt@mail.ru</a><a href="tel:+79330238843">+7 (933) 023-88-43</a><span>09:00–20:00 ежедневно</span></div>
            <div class="footer-signature"><span>© 2026 APEXWOLT</span><a href="https://t.me/aleks1y_m" target="_blank" rel="noopener" aria-label="LMH Studio в Telegram">Designed &amp; developed by <strong>LMH Studio</strong> <i>↗</i></a></div>
          </div>
        </div>
      </footer>`;

    const newsletterForm = footerRoot.querySelector('[data-newsletter-form]');
    const newsletterStatus = footerRoot.querySelector('[data-newsletter-status]');
    newsletterForm?.addEventListener('submit', event => {
      event.preventDefault();
      if (!newsletterForm.checkValidity()) {
        newsletterForm.reportValidity();
        if (newsletterStatus) newsletterStatus.textContent = 'Укажите почту и подтвердите оба отдельных согласия.';
        return;
      }
      if (newsletterStatus) newsletterStatus.textContent = 'Форма подготовлена. Подключение сервиса рассылки выполним на этапе интеграции.';
      newsletterForm.reset();
    });
  }

  const cookieChoice = localStorage.getItem('apexwolt-cookie-choice');
  const cookieBanner = document.createElement('aside');
  cookieBanner.className = 'cookie-banner';
  cookieBanner.hidden = Boolean(cookieChoice);
  cookieBanner.setAttribute('aria-label', 'Настройки cookie');
  cookieBanner.innerHTML = `<p><b>Настройки cookie</b>Необходимые cookie обеспечивают работу сайта. Аналитические будут использоваться только после вашего согласия. Подробнее — в <a href="cookie-policy.html">политике cookie</a>.</p><div class="cookie-actions"><button type="button" data-cookie-choice="necessary">Только необходимые</button><button class="cookie-accept" type="button" data-cookie-choice="accepted">Принять</button></div>`;
  document.body.append(cookieBanner);
  cookieBanner.querySelectorAll('[data-cookie-choice]').forEach(button => button.addEventListener('click', () => {
    localStorage.setItem('apexwolt-cookie-choice', button.dataset.cookieChoice);
    cookieBanner.hidden = true;
  }));
})();
