/* Видеообзоры — ленивый лайтбокс (facade).
   На странице грузятся только превью; плеер YouTube (iframe) подгружается ТОЛЬКО по клику,
   поэтому вес страницы почти не растёт — важно для мобильных. script.js не затрагивается. */
(function () {
  const triggers = document.querySelectorAll('[data-video-id]');
  if (!triggers.length) return;

  let box, frame;

  const close = () => {
    if (!box) return;
    box.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    if (window.lenis && typeof window.lenis.start === 'function') window.lenis.start();
    // убрать iframe → видео останавливается
    window.setTimeout(() => { const f = frame.querySelector('iframe'); if (f) f.remove(); }, 260);
  };

  const build = () => {
    box = document.createElement('div');
    box.className = 'video-lightbox';
    box.innerHTML = '<div class="video-lightbox-frame"><button class="video-lightbox-close" type="button" aria-label="Закрыть видео">✕</button></div>';
    frame = box.querySelector('.video-lightbox-frame');
    document.body.appendChild(box);
    box.addEventListener('click', e => {
      if (e.target === box || e.target.closest('.video-lightbox-close')) close();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  };

  const open = id => {
    if (!box) build();
    const old = frame.querySelector('iframe');
    if (old) old.remove();
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    iframe.title = 'Видео APEXWOLT';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    frame.appendChild(iframe);
    window.requestAnimationFrame(() => box.classList.add('is-open'));
    document.documentElement.style.overflow = 'hidden';
    if (window.lenis && typeof window.lenis.stop === 'function') window.lenis.stop();
  };

  triggers.forEach(trigger => trigger.addEventListener('click', () => open(trigger.getAttribute('data-video-id'))));
})();
