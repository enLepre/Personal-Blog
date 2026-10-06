(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  window.addEventListener("pageshow", () => {
    document.body.classList.remove("is-leaving-title", "is-leaving-content");
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    const next = new URL(link.href, window.location.href);
    const current = new URL(window.location.href);

    if (next.origin !== current.origin) return;
    if (next.pathname === current.pathname && next.search === current.search && next.hash === current.hash) return;
    if (reduceMotion.matches) return;

    event.preventDefault();
    document.body.classList.add("is-leaving-title");

    window.setTimeout(() => {
      document.body.classList.add("is-leaving-content");
    }, 340);

    window.setTimeout(() => {
      window.location.href = next.href;
    }, 610);
  });
})();