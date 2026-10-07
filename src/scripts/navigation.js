
(() => {
  if (document.body.dataset.page !== 'home') return;
  const links = [...document.querySelectorAll('.site-header [data-nav]')];
  const sections = [
    { id: 'home', el: document.querySelector('.hero') },
    { id: 'research', el: document.getElementById('research') },
    { id: 'notes', el: document.getElementById('notes') },
    { id: 'essays', el: document.getElementById('essays') },
    { id: 'about', el: document.getElementById('about') }
  ].filter(item => item.el);

  const setActive = (id) => {
    links.forEach(link => {
      const active = link.dataset.nav === id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const update = () => {
    // Change the active menu item exactly when the next section title
    // reaches two thirds of the viewport height.
    const marker = window.innerHeight * (2 / 3);
    let active = 'home';

    for (const section of sections.slice(1)) {
      const title = section.el.querySelector('.page-title');
      if (!title) continue;
      if (title.getBoundingClientRect().top <= marker) {
        active = section.id;
      } else {
        break;
      }
    }

    setActive(active);
  };

  let ticking = false;
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
  if (document.body.dataset.page !== 'home') return;
      update();
      ticking = false;
    });
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('load', update);
  update();
})();
