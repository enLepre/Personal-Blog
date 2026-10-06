(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const supportsSharedTransition =
    typeof CSS !== "undefined" &&
    CSS.supports &&
    CSS.supports("view-transition-name: section-in");

  if (!supportsSharedTransition) {
    document.documentElement.classList.add("no-cross-vt");
  }

  const currentSection = () => document.body?.dataset.page || "home";

  const clearIncomingState = () => {
    delete document.documentElement.dataset.vtFrom;
    delete document.documentElement.dataset.vtTo;
    try { sessionStorage.removeItem("sectionTransition"); } catch (_) {}
  };

  window.addEventListener("pagereveal", (event) => {
    if (event.viewTransition) {
      event.viewTransition.finished.finally(clearIncomingState);
    } else {
      window.setTimeout(clearIncomingState, 0);
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (!("onpagereveal" in window) || event.persisted) {
      window.setTimeout(clearIncomingState, 0);
    }
    document.body?.classList.remove("fallback-leaving");
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;
    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    const next = new URL(link.href, window.location.href);
    const here = new URL(window.location.href);

    if (next.origin !== here.origin) return;
    if (next.pathname === here.pathname && next.search === here.search && next.hash === here.hash) return;

    const targetSection = link.dataset.section;
    if (!targetSection || reduceMotion.matches) return;

    if (!supportsSharedTransition) {
      event.preventDefault();
      document.body.classList.add("fallback-leaving");
      window.setTimeout(() => { window.location.href = next.href; }, 180);
      return;
    }

    const from = currentSection();
    const title = document.querySelector(".page-title");

    /* Outgoing shared elements:
       1. current title -> its menu label
       2. clicked menu label -> destination title */
    if (title && from !== "home") {
      title.style.viewTransitionName = "section-out";
    } else if (title && targetSection === "home") {
      title.style.viewTransitionName = "section-out";
    }

    link.style.viewTransitionName = "section-in";

    try {
      sessionStorage.setItem("sectionTransition", JSON.stringify({
        from,
        to: targetSection
      }));
    } catch (_) {}
  });
})();