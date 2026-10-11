function initializeMenu() {
  const menu = document.querySelector('.menu');
  const toggle = menu?.querySelector('.menu-toggle');
  const nav = menu?.querySelector('nav');
  if (!menu || !toggle || !nav || menu.dataset.ready) return;
  menu.dataset.ready = 'true';
  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    nav.inert = !open;
  };
  menu.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') setOpen(true);
  });
  menu.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && !menu.contains(document.activeElement)) setOpen(false);
  });
  let openBeforePress = false;
  toggle.addEventListener('pointerdown', () => { openBeforePress = menu.classList.contains('is-open'); });
  toggle.addEventListener('click', (event) => setOpen(event.detail === 0 ? !menu.classList.contains('is-open') : !openBeforePress));
  toggle.addEventListener('focus', () => setOpen(true));
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
