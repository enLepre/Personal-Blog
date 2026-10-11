function initializeMenu() {
  const menu = document.querySelector('.menu');
  const toggle = menu?.querySelector('.menu-toggle');
  const nav = menu?.querySelector('nav');
  if (!menu || !toggle || !nav || menu.dataset.ready) return;
  menu.dataset.ready = 'true';
  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.inert = !open;
  };
  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
  menu.addEventListener('focusout', (event) => {
    if (!menu.contains(event.relatedTarget)) setOpen(false);
  });
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      toggle.focus();
      setOpen(false);
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!menu.contains(event.target)) setOpen(false);
  }, { signal: controller.signal });
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
}
let controller = new AbortController();
document.addEventListener('astro:before-swap', () => {
  controller.abort();
  controller = new AbortController();
});
document.addEventListener('astro:page-load', initializeMenu);
initializeMenu();

// Compare hierarchy rather than whether navigation adds a browser history entry.
// Normalize index.html so both home URLs occupy the same level.
function pageDepth(url) {
  return url.pathname.replace(/\/index\.html$/, '/').split('/').filter(Boolean).length;
}
document.addEventListener('astro:before-preparation', (event) => {
  const difference = pageDepth(event.to) - pageDepth(event.from);
  if (difference < 0) event.direction = 'back';
  else if (difference > 0) event.direction = 'forward';
  // At the same level, retain the router's direction (including Back/Forward).
});
