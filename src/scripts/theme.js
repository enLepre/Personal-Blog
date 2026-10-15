// Runs in the head before paint, then keeps Astro's client navigation in sync.
(() => {
  if (window.__blogTheme) {
    window.__blogTheme();
    return;
  }
  const key = 'personal-blog-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => value === 'light' || value === 'dark';
  let preference;
  try { preference = localStorage.getItem(key); } catch { /* Storage can be unavailable. */ }
  if (!valid(preference)) preference = 'system';

  function apply(target = document) {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    target.documentElement.dataset.theme = theme;
    target.documentElement.style.colorScheme = theme;
    const select = target.querySelector('#theme-select');
    if (select) select.value = preference;
  }
  window.__blogTheme = apply;
  apply();
  document.addEventListener('change', event => {
    if (event.target.id !== 'theme-select') return;
    preference = valid(event.target.value) ? event.target.value : 'system';
    try {
      if (preference === 'system') localStorage.removeItem(key);
      else localStorage.setItem(key, preference);
    } catch { /* Keep the selection for this visit even without storage. */ }
    apply();
  });
  system.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : 'system';
    apply();
  });
  document.addEventListener('astro:before-swap', event => apply(event.newDocument));
  document.addEventListener('astro:page-load', () => apply());
})();
